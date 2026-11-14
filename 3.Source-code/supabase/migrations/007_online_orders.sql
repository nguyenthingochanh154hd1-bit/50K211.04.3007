-- =====================================================================
-- CHERRY LAUNDRY – 007: ĐẶT ĐƠN ONLINE (trang công khai /online dành cho khách lẻ)
--   Khách KHÔNG đăng nhập. Trang /online gọi api/online.ts; hàm này (chạy bằng service_role) gọi các hàm dưới đây.
--   • online_catalog()             – dịch vụ, bảng giá, giỏ còn trống (dữ liệu công khai)
--   • online_create_order(p)       – tạo đơn "Chờ xác nhận" + khách mới (nếu chưa có) + giữ giỏ, tăng rev
--                                    -> app nhân viên thấy đơn ở tab "Đơn online" trong vòng vài giây
--   • online_lookup(p_phone)       – tra cứu đơn của một số điện thoại (chỉ khách lẻ)
--   • order_photos(p_user, p_order)– đường dẫn ảnh giỏ của một đơn online (nhân viên đã đăng nhập)
--   Chống lạm dụng (không có đăng nhập nên phải chặn ở đây): mỗi số điện thoại tối đa 3 đơn đang chờ xác nhận,
--   toàn tiệm tối đa 30 đơn online đang chờ xác nhận. Quá giới hạn -> lỗi 429.
--   Ảnh giỏ lưu ở Supabase Storage (bucket riêng tư "basket-photos"); database chỉ giữ đường dẫn.
-- =====================================================================

-- Bucket ảnh (riêng tư). Nếu bước này báo lỗi, tạo thủ công: Storage -> New bucket -> tên basket-photos, Private.
do $$
begin
    if to_regclass('storage.buckets') is not null then
        insert into storage.buckets (id, name, public) values ('basket-photos', 'basket-photos', false)
        on conflict (id) do nothing;
    end if;
exception when others then
    raise notice 'Chưa tạo được bucket basket-photos (%). Hãy tạo thủ công trong Storage, chế độ Private.', sqlerrm;
end $$;

-- Khóa so khớp số điện thoại: chỉ giữ chữ số, bỏ đầu số quốc gia VN (84) hoặc số 0 đầu
--   '0902143107' = '+84 902 143 107' = '84902143107' -> '902143107'
create or replace function public._phone_key(p text) returns text
language sql immutable as $$
    select case when d ~ '^84[0-9]{9,10}$' then substr(d, 3) when d ~ '^0' then substr(d, 2) else d end
      from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x
$$;

-- Mã kế tiếp theo tiền tố (gọi khi đang giữ khóa dòng rev)
create or replace function public._next_id(p_prefix text, p_width int, p_table text, p_col text) returns text
language plpgsql security definer set search_path = public as $$
declare n bigint; v_id text; v_dup boolean;
begin
    loop
        update he_thong set gia_tri = jsonb_set(gia_tri, array[p_prefix], to_jsonb(coalesce((gia_tri ->> p_prefix)::bigint, 0) + 1), true)
         where khoa = 'seq' returning (gia_tri ->> p_prefix)::bigint into n;
        v_id := p_prefix || lpad(n::text, p_width, '0');
        execute format('select exists(select 1 from public.%I where %I = $1)', p_table, p_col) into v_dup using v_id;
        exit when not v_dup;
    end loop;
    return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Danh mục công khai
-- ---------------------------------------------------------------------
create or replace function public.online_catalog() returns jsonb
language sql stable security definer set search_path = public as $$
    select jsonb_build_object(
        'shop', (select jsonb_build_object('name', ten_cua_tiem, 'addr', dia_chi, 'addrEn', coalesce(dia_chi_en, dia_chi), 'phone', thong_tin_lien_lac)
                   from cua_tiem order by ma_cua_tiem limit 1),
        'svcTypes', (select coalesce(jsonb_agg(jsonb_build_object('id', ma_loai_dv::text, 'name', ten_loai_dv) order by ma_loai_dv), '[]'::jsonb) from loai_dich_vu),
        'services', (select coalesce(jsonb_agg(jsonb_build_object('id', ma_dich_vu::text, 'type', ma_loai_dv::text, 'name', ten_dich_vu,
                                                                  'unit', don_vi_tinh, 'price', coalesce(don_gia, 0)) order by ma_dich_vu), '[]'::jsonb) from dich_vu),
        'baskets', (select coalesce(jsonb_agg(jsonb_build_object('id', g.ma_gio::text,
                       'full', exists(select 1 from don_hang o where o.ma_gio = g.ma_gio and public._order_active(o.trang_thai::text, o.dang_xu_ly))
                   ) order by g.ma_gio), '[]'::jsonb) from gio_dung g)
    )
$$;

-- ---------------------------------------------------------------------
-- Khách đặt đơn
--   p = { name, phone, addr, note, services:[DV..], basket, photos:[ "<uuid>/1.jpg", ... ] }
--   Trả { id, createdAt, status, customerId }
-- ---------------------------------------------------------------------
create or replace function public.online_create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_name text := trim(coalesce(p ->> 'name', ''));
    v_phone text := trim(coalesce(p ->> 'phone', ''));
    v_addr text := nullif(trim(coalesce(p ->> 'addr', '')), '');
    v_note text := nullif(trim(coalesce(p ->> 'note', '')), '');
    v_basket text := coalesce(p ->> 'basket', '');
    v_svcs text[]; v_photos text[];
    v_cust text; v_cust_type text; v_new_cust boolean := false;
    v_id text; v_user text; v_shop text; v_now timestamp := vn_now(); v_i int := 0; s text; v_price numeric; v_rev bigint;
begin
    if length(v_name) not between 1 and 50 then raise exception 'Tên khách hàng phải từ 1 đến 50 ký tự' using errcode = 'PT422'; end if;
    if v_phone !~ '^\+?[0-9 ]{,20}$' then raise exception 'Số điện thoại không hợp lệ' using errcode = 'PT422'; end if;
    if length(coalesce(v_addr, '')) > 100 then raise exception 'Địa chỉ tối đa 100 ký tự' using errcode = 'PT422'; end if;
    if length(coalesce(v_note, '')) > 100 then raise exception 'Ghi chú tối đa 100 ký tự' using errcode = 'PT422'; end if;
    if jsonb_typeof(p -> 'services') is distinct from 'array' or jsonb_array_length(p -> 'services') not between 1 and 10 then
        raise exception 'Chọn từ 1 đến 10 dịch vụ' using errcode = 'PT422';
    end if;
    v_svcs := array(select jsonb_array_elements_text(p -> 'services'));
    if (select count(distinct x) from unnest(v_svcs) x) <> cardinality(v_svcs) then raise exception 'Dịch vụ bị chọn trùng' using errcode = 'PT422'; end if;
    if jsonb_typeof(p -> 'photos') is distinct from 'array' or jsonb_array_length(p -> 'photos') not between 1 and 3 then
        raise exception 'Cần từ 1 đến 3 ảnh giỏ đựng' using errcode = 'PT422';
    end if;
    v_photos := array(select jsonb_array_elements_text(p -> 'photos'));
    if exists (select 1 from unnest(v_photos) x where x !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[1-3]\.jpg$') then
        raise exception 'Đường dẫn ảnh không hợp lệ' using errcode = 'PT422';
    end if;

    -- một người ghi tại một thời điểm (cùng khóa với apply_changes)
    perform 1 from he_thong where khoa = 'rev' for update;

    foreach s in array v_svcs loop
        if not exists (select 1 from dich_vu where ma_dich_vu = s) then raise exception 'Dịch vụ không tồn tại' using errcode = 'PT422'; end if;
    end loop;
    if v_basket !~ '^G[0-9]{2}$' or not exists (select 1 from gio_dung where ma_gio = v_basket) then
        raise exception 'Giỏ đựng không hợp lệ' using errcode = 'PT422';
    end if;
    if exists (select 1 from don_hang o where o.ma_gio = v_basket and public._order_active(o.trang_thai::text, o.dang_xu_ly)) then
        raise exception 'Giỏ % vừa có người khác chọn, vui lòng chọn giỏ khác', v_basket using errcode = 'PT409';
    end if;

    select min(ten_dang_nhap)::text into v_user from tai_khoan;
    select min(ma_cua_tiem)::text into v_shop from cua_tiem;
    if v_user is null or v_shop is null then raise exception 'Cửa hàng chưa sẵn sàng nhận đơn online' using errcode = 'PT422'; end if;

    -- khách hàng theo số điện thoại (bỏ khoảng trắng khi so khớp)
    select ma_khach_hang::text, ma_loai_kh::text into v_cust, v_cust_type from khach_hang
     where public._phone_key(thong_tin_lien_lac) = public._phone_key(v_phone) limit 1;
    if v_cust is not null then
        if public.is_wholesale(v_cust_type) then raise exception 'Đặt đơn online chỉ dành cho khách lẻ' using errcode = 'PT422'; end if;
        if (select count(*) from don_hang where ma_khach_hang = v_cust and trang_thai = 'Chờ xác nhận'
               and ma_don_hang in (select ma_don_hang from don_hang_online)) >= 3 then
            raise exception 'Bạn đang có 3 đơn chờ cửa hàng xác nhận, vui lòng đợi xác nhận trước khi đặt thêm' using errcode = 'PT429';
        end if;
    end if;
    if (select count(*) from don_hang where trang_thai = 'Chờ xác nhận' and ma_don_hang in (select ma_don_hang from don_hang_online)) >= 30 then
        raise exception 'Cửa hàng đang nhận nhiều đơn, vui lòng thử lại sau ít phút hoặc gọi cho cửa hàng' using errcode = 'PT429';
    end if;

    if v_cust is null then
        select ma_loai_kh::text into v_cust_type from loai_khach_hang where not public.is_wholesale(ma_loai_kh::text) order by ma_loai_kh limit 1;
        if v_cust_type is null then raise exception 'Chưa có loại khách lẻ trong hệ thống' using errcode = 'PT422'; end if;
        v_cust := public._next_id('KH', 8, 'khach_hang', 'ma_khach_hang');
        insert into khach_hang (ma_khach_hang, ma_loai_kh, ten_khach_hang, thong_tin_lien_lac, dia_chi) values (v_cust, v_cust_type, v_name, v_phone, v_addr);
        v_new_cust := true;
    end if;

    v_id := public._next_id('DH', 8, 'don_hang', 'ma_don_hang');
    insert into don_hang (ma_don_hang, ma_khach_hang, ma_gio, ten_dang_nhap, ma_cua_tiem, ngay_tao_don, trang_thai, ghi_chu, giam_gia, phu_thu, dang_xu_ly, da_in)
    values (v_id, v_cust, v_basket, v_user, v_shop, v_now, 'Chờ xác nhận', v_note, 0, 0, false, 0);
    -- đơn online chưa có số ký/số lượng (nhân viên cân khi nhận đồ): lưu 0 với đơn giá hiện hành
    foreach s in array v_svcs loop
        v_i := v_i + 1;
        select coalesce(don_gia, 0) into v_price from dich_vu where ma_dich_vu = s;
        insert into chi_tiet_don_hang (ma_chi_tiet_dh, ma_don_hang, ma_dich_vu, stt, khoi_so_luong, don_gia)
        values ('CT' || lpad(nextval('seq_chi_tiet_don_hang')::text, 8, '0'), v_id, s, v_i, 0, v_price);
    end loop;
    insert into don_hang_online (ma_don_hang, hinh_anh_gio_dung) values (v_id, v_photos);
    update gio_dung set trang_thai = 'Đầy' where ma_gio = v_basket;

    update he_thong set gia_tri = to_jsonb((gia_tri #>> '{}')::bigint + 1) where khoa = 'rev' returning (gia_tri #>> '{}')::bigint into v_rev;
    return jsonb_build_object('id', v_id, 'createdAt', ts_iso(v_now), 'status', 'Chờ xác nhận', 'customerId', v_cust, 'newCustomer', v_new_cust, 'rev', v_rev);
end $$;

-- ---------------------------------------------------------------------
-- Tra cứu theo số điện thoại. Chỉ khách lẻ; không trả thông tin nhân viên/tài khoản.
-- ---------------------------------------------------------------------
create or replace function public.online_lookup(p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_cust text; v_type text; v_name text; v_phone text := trim(coalesce(p_phone, ''));
begin
    if v_phone !~ '^\+?[0-9 ]{1,20}$' then raise exception 'Số điện thoại không hợp lệ' using errcode = 'PT422'; end if;
    select ma_khach_hang::text, ma_loai_kh::text, ten_khach_hang, thong_tin_lien_lac into v_cust, v_type, v_name, v_phone from khach_hang
     where public._phone_key(thong_tin_lien_lac) = public._phone_key(v_phone) limit 1;
    if v_cust is null then return jsonb_build_object('found', false); end if;
    if public.is_wholesale(v_type) then return jsonb_build_object('found', true, 'wholesale', true); end if;
    return jsonb_build_object('found', true, 'wholesale', false, 'name', v_name, 'orders', (
        select coalesce(jsonb_agg(x order by x ->> 'createdAt' desc), '[]'::jsonb) from (
            select jsonb_build_object(
                'id', o.ma_don_hang::text, 'status', o.trang_thai, 'createdAt', ts_iso(o.ngay_tao_don),
                'name', v_name, 'contact', v_phone, 'basket', coalesce(o.ma_gio::text, ''), 'note', coalesce(o.ghi_chu, ''),
                'svcs', (select coalesce(jsonb_agg(c.ma_dich_vu::text order by c.stt, c.ma_chi_tiet_dh), '[]'::jsonb) from chi_tiet_don_hang c where c.ma_don_hang = o.ma_don_hang),
                'photos', to_jsonb(coalesce(ol.hinh_anh_gio_dung, array[]::text[])),
                'pay', case when o.trang_thai in ('Chờ thanh toán', 'Đã thanh toán', 'Đã giao') and t.sub > 0 then
                           jsonb_build_object('sub', t.sub, 'sur', coalesce(o.phu_thu, 0), 'dis', coalesce(o.giam_gia, 0),
                                              'tot', public._order_total(t.sub, o.phu_thu, o.giam_gia)) end
            ) as x
              from don_hang o
              left join don_hang_online ol on ol.ma_don_hang = o.ma_don_hang
              left join lateral (select coalesce(sum(c.khoi_so_luong * c.don_gia), 0) as sub from chi_tiet_don_hang c where c.ma_don_hang = o.ma_don_hang) t on true
             where o.ma_khach_hang = v_cust
             order by o.ngay_tao_don desc limit 50
        ) q));
end $$;

-- Ảnh giỏ của một đơn online (cho nhân viên đã đăng nhập)
create or replace function public.order_photos(p_user text, p_order text) returns text[]
language plpgsql stable security definer set search_path = public as $$
begin
    perform public.set_user(p_user);
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập hoặc tài khoản đã bị khóa' using errcode = 'PT401';
    end if;
    return coalesce((select hinh_anh_gio_dung from don_hang_online where ma_don_hang = p_order), array[]::text[]);
end $$;

revoke all on function public._phone_key(text), public._next_id(text, int, text, text), public.online_catalog(), public.online_create_order(jsonb),
                       public.online_lookup(text), public.order_photos(text, text) from public, anon, authenticated;
grant execute on function public.online_catalog(), public.online_create_order(jsonb), public.online_lookup(text),
                          public.order_photos(text, text) to service_role;
