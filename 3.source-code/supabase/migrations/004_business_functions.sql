-- =====================================================================
-- CHERRY LAUNDRY – 004: HÀM NGHIỆP VỤ (toàn bộ ghi dữ liệu đi qua đây)
--   get_state()      -> toàn bộ dữ liệu theo dạng giao diện đang dùng + rev
--   get_rev()        -> số phiên bản dữ liệu (giao diện hỏi định kỳ để thấy đơn mới)
--   apply_changes()  -> áp một lô thay đổi NGUYÊN TỬ (hoặc tất cả, hoặc không gì cả)
--   update_profile() -> đổi họ tên / số điện thoại của chính mình
-- Mọi hàm cổng nhận p_user (tên đăng nhập đã được máy chủ api/ xác thực) và chỉ service_role được gọi.
-- Lỗi trả về qua PostgREST: PT401 -> 401, PT403 -> 403, PT409 -> 409 (xung đột), PT422 -> 422 (dữ liệu sai)
-- =====================================================================

create sequence if not exists public.seq_hoa_don;

create or replace function public.ts_iso(t timestamp) returns text
language sql immutable as $$ select to_char(t, 'YYYY-MM-DD"T"HH24:MI:SS') $$;

-- ---------------------------------------------------------------------
-- Đọc
-- ---------------------------------------------------------------------
create or replace function public.get_rev(p_user text) returns bigint
language plpgsql security definer set search_path = public as $$
begin
    perform public.set_user(p_user);
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập hoặc tài khoản đã bị khóa' using errcode = 'PT401';
    end if;
    return (select (gia_tri #>> '{}')::bigint from public.he_thong where khoa = 'rev');
end $$;

create or replace function public.get_state(p_user text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v jsonb;
begin
    perform public.set_user(p_user);
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập hoặc tài khoản đã bị khóa' using errcode = 'PT401';
    end if;

    select jsonb_build_object(
        'v', 1,
        'rev', (select (gia_tri #>> '{}')::bigint from he_thong where khoa = 'rev'),
        'seq', (select gia_tri from he_thong where khoa = 'seq'),
        'account', public.me(),
        'shops', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_cua_tiem::text, 'name', ten_cua_tiem, 'addr', dia_chi,
                'addrSlip', coalesce(dia_chi_phieu, ''), 'addrEn', coalesce(dia_chi_en, ''),
                'contact', thong_tin_lien_lac, 'bank', ten_ngan_hang, 'acc', so_tai_khoan_ngan_hang
            ) order by ma_cua_tiem), '[]'::jsonb) from cua_tiem),
        'custTypes', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_loai_kh::text, 'name', ten_loai_kh) order by ma_loai_kh), '[]'::jsonb) from loai_khach_hang),
        'customers', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_khach_hang::text, 'type', ma_loai_kh::text, 'name', ten_khach_hang,
                'phone', thong_tin_lien_lac, 'addr', coalesce(dia_chi, '')) order by ma_khach_hang), '[]'::jsonb) from khach_hang),
        'svcTypes', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_loai_dv::text, 'name', ten_loai_dv) order by ma_loai_dv), '[]'::jsonb) from loai_dich_vu),
        'services', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_dich_vu::text, 'type', ma_loai_dv::text, 'name', ten_dich_vu,
                'unit', don_vi_tinh, 'price', coalesce(don_gia, 0)) order by ma_dich_vu), '[]'::jsonb) from dich_vu),
        'baskets', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_gio::text, 'status', coalesce(trang_thai, 'Trống')) order by ma_gio), '[]'::jsonb) from gio_dung),
        'pays', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_pttt::text, 'name', ten_pttt) order by ma_pttt), '[]'::jsonb) from phuong_thuc_thanh_toan),
        'expenses', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', ma_chi_phi::text, 'name', ten_chi_phi, 'amount', tong_tien, 'date', ts_iso(ngay_tao)) order by ma_chi_phi), '[]'::jsonb) from chi_phi),
        'debts', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', d.ma_cong_no::text, 'custId', d.ma_khach_hang::text,
                'start', to_char(d.ngay_bat_dau_ky, 'YYYY-MM-DD'), 'due', to_char(d.han_thanh_toan, 'YYYY-MM-DD'),
                'status', d.trang_thai_cong_no, 'paidAt', ts_iso(d.thoi_gian_thanh_toan), 'pay', d.ma_pttt::text,
                'orderIds', (select coalesce(jsonb_agg(o.ma_don_hang::text order by o.ma_don_hang), '[]'::jsonb)
                               from don_hang o where o.ma_cong_no = d.ma_cong_no)
            ) order by d.ma_cong_no), '[]'::jsonb) from cong_no_khach_si d),
        'orders', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', o.ma_don_hang::text, 'custId', o.ma_khach_hang::text,
                'lines', (select coalesce(jsonb_agg(jsonb_build_object('svcId', c.ma_dich_vu::text, 'qty', c.khoi_so_luong, 'price', c.don_gia)
                                                   order by c.stt, c.ma_chi_tiet_dh), '[]'::jsonb)
                            from chi_tiet_don_hang c where c.ma_don_hang = o.ma_don_hang),
                'phuThu', coalesce(o.phu_thu, 0), 'giamGia', coalesce(o.giam_gia, 0), 'note', coalesce(o.ghi_chu, ''),
                'processing', o.dang_xu_ly, 'status', o.trang_thai, 'online', (ol.ma_don_hang is not null),
                'createdAt', ts_iso(o.ngay_tao_don),
                'recvDate', coalesce(to_char(o.ngay_nhan, 'YYYY-MM-DD'), ''),
                'recvTime', coalesce(to_char(o.gio_nhan, 'HH24:MI'), ''),
                'basket', coalesce(o.ma_gio::text, ''), 'pay', o.ma_pttt::text, 'paidAt', ts_iso(o.thoi_gian_thanh_toan),
                'debtId', o.ma_cong_no::text, 'printed', o.da_in,
                'photos', coalesce(cardinality(ol.hinh_anh_gio_dung), 0),
                'photoUrls', to_jsonb(coalesce(ol.hinh_anh_gio_dung, array[]::text[])),
                'creator', case when ol.ma_don_hang is not null then 'Khách đặt online'
                               else coalesce(nullif((select gia_tri ->> 'name' from he_thong where khoa = 'chu_tiem'), ''), o.ten_dang_nhap) end
            ) order by o.ma_don_hang), '[]'::jsonb)
            from don_hang o left join don_hang_online ol on ol.ma_don_hang = o.ma_don_hang)
    ) into v;
    return v;
end $$;

-- ---------------------------------------------------------------------
-- Hàm phụ (nội bộ, không cấp cho người dùng)
-- ---------------------------------------------------------------------
create or replace function public._chk_id(p_coll text, p_id text) returns void
language plpgsql immutable as $$
declare re text;
begin
    re := case p_coll
        when 'shops'     then '^CH[0-9]{3}$'
        when 'custTypes' then '^LKH[0-9]{2}$'
        when 'customers' then '^KH[0-9]{8}$'
        when 'svcTypes'  then '^LDV[0-9]{2}$'
        when 'services'  then '^DV[0-9]{8}$'
        when 'baskets'   then '^G[0-9]{2}$'
        when 'pays'      then '^PTTT[0-9]{6}$'
        when 'expenses'  then '^CP[0-9]{8}$'
        when 'orders'    then '^DH[0-9]{8}$'
        when 'debts'     then '^CN[0-9]{8}$'
    end;
    if re is null then
        raise exception 'Bộ dữ liệu "%" không hợp lệ', p_coll using errcode = 'PT422';
    end if;
    if p_id is null or p_id !~ re then
        raise exception 'Mã "%" không đúng định dạng của "%"', coalesce(p_id, ''), p_coll using errcode = 'PT422';
    end if;
end $$;

create or replace function public._exists(p_coll text, p_id text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare t text; c text; r boolean;
begin
    select tbl, col into t, c from (values
        ('shops','cua_tiem','ma_cua_tiem'), ('custTypes','loai_khach_hang','ma_loai_kh'),
        ('customers','khach_hang','ma_khach_hang'), ('svcTypes','loai_dich_vu','ma_loai_dv'),
        ('services','dich_vu','ma_dich_vu'), ('baskets','gio_dung','ma_gio'),
        ('pays','phuong_thuc_thanh_toan','ma_pttt'), ('expenses','chi_phi','ma_chi_phi'),
        ('orders','don_hang','ma_don_hang'), ('debts','cong_no_khach_si','ma_cong_no')
    ) m(k, tbl, col) where k = p_coll;
    execute format('select exists(select 1 from public.%I where %I = $1)', t, c) into r using p_id;
    return r;
end $$;

create or replace function public._money(p_val numeric, p_label text) returns numeric
language plpgsql immutable as $$
begin
    if p_val is null or p_val < 0 or p_val > 9999999999 then
        raise exception '% không hợp lệ (0 – 9.999.999.999)', p_label using errcode = 'PT422';
    end if;
    return p_val;
end $$;

create or replace function public._bump_seq(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare m text[];
begin
    m := regexp_match(p_id, '^([A-Z]+)([0-9]+)$');
    if m is null then return; end if;
    update he_thong
       set gia_tri = jsonb_set(gia_tri, array[m[1]],
                       to_jsonb(greatest(coalesce((gia_tri ->> m[1])::bigint, 0), m[2]::bigint)), true)
     where khoa = 'seq';
end $$;

-- Đơn đang giữ giỏ: chờ xác nhận / đang xử lý / đã thanh toán nhưng vẫn đang xử lý
create or replace function public._order_active(p_status text, p_processing boolean) returns boolean
language sql immutable as $$
    select p_status in ('Chờ xác nhận', 'Đang xử lý') or (p_status = 'Đã thanh toán' and coalesce(p_processing, false))
$$;

-- ---------------------------------------------------------------------
-- Ghi từng bộ dữ liệu
-- ---------------------------------------------------------------------
create or replace function public._up_master(p_coll text, p_doc jsonb, p_new boolean) returns void
language plpgsql security definer set search_path = public as $$
declare id text := p_doc ->> 'id';
begin
    if p_coll = 'shops' then
        insert into cua_tiem (ma_cua_tiem, ten_cua_tiem, dia_chi, dia_chi_phieu, dia_chi_en, thong_tin_lien_lac, ten_ngan_hang, so_tai_khoan_ngan_hang)
        values (id, p_doc ->> 'name', coalesce(p_doc ->> 'addr', ''), nullif(p_doc ->> 'addrSlip', ''), nullif(p_doc ->> 'addrEn', ''),
                coalesce(p_doc ->> 'contact', ''), coalesce(p_doc ->> 'bank', ''), coalesce(p_doc ->> 'acc', ''))
        on conflict (ma_cua_tiem) do update set ten_cua_tiem = excluded.ten_cua_tiem, dia_chi = excluded.dia_chi,
            dia_chi_phieu = excluded.dia_chi_phieu, dia_chi_en = excluded.dia_chi_en, thong_tin_lien_lac = excluded.thong_tin_lien_lac,
            ten_ngan_hang = excluded.ten_ngan_hang, so_tai_khoan_ngan_hang = excluded.so_tai_khoan_ngan_hang;
    elsif p_coll = 'custTypes' then
        insert into loai_khach_hang (ma_loai_kh, ten_loai_kh) values (id, p_doc ->> 'name')
        on conflict (ma_loai_kh) do update set ten_loai_kh = excluded.ten_loai_kh;
    elsif p_coll = 'customers' then
        insert into khach_hang (ma_khach_hang, ma_loai_kh, ten_khach_hang, thong_tin_lien_lac, dia_chi)
        values (id, p_doc ->> 'type', p_doc ->> 'name', p_doc ->> 'phone', nullif(p_doc ->> 'addr', ''))
        on conflict (ma_khach_hang) do update set ma_loai_kh = excluded.ma_loai_kh, ten_khach_hang = excluded.ten_khach_hang,
            thong_tin_lien_lac = excluded.thong_tin_lien_lac, dia_chi = excluded.dia_chi;
    elsif p_coll = 'svcTypes' then
        insert into loai_dich_vu (ma_loai_dv, ten_loai_dv) values (id, p_doc ->> 'name')
        on conflict (ma_loai_dv) do update set ten_loai_dv = excluded.ten_loai_dv;
    elsif p_coll = 'services' then
        insert into dich_vu (ma_dich_vu, ma_loai_dv, ten_dich_vu, don_vi_tinh, don_gia)
        values (id, p_doc ->> 'type', p_doc ->> 'name', p_doc ->> 'unit', _money((p_doc ->> 'price')::numeric, 'Đơn giá'))
        on conflict (ma_dich_vu) do update set ma_loai_dv = excluded.ma_loai_dv, ten_dich_vu = excluded.ten_dich_vu,
            don_vi_tinh = excluded.don_vi_tinh, don_gia = excluded.don_gia;
    elsif p_coll = 'baskets' then
        insert into gio_dung (ma_gio, trang_thai) values (id, coalesce(p_doc ->> 'status', 'Trống'))
        on conflict (ma_gio) do update set trang_thai = excluded.trang_thai;
    elsif p_coll = 'pays' then
        insert into phuong_thuc_thanh_toan (ma_pttt, ten_pttt) values (id, p_doc ->> 'name')
        on conflict (ma_pttt) do update set ten_pttt = excluded.ten_pttt;
    elsif p_coll = 'expenses' then
        insert into chi_phi (ma_chi_phi, ten_chi_phi, tong_tien, ngay_tao)
        values (id, p_doc ->> 'name', _money((p_doc ->> 'amount')::numeric, 'Số tiền chi phí'),
                coalesce(nullif(p_doc ->> 'date', '')::timestamp, vn_now()))
        on conflict (ma_chi_phi) do update set ten_chi_phi = excluded.ten_chi_phi, tong_tien = excluded.tong_tien, ngay_tao = excluded.ngay_tao;
    end if;
end $$;

create or replace function public._up_debt(p_doc jsonb, p_new boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
    id text := p_doc ->> 'id';
    old cong_no_khach_si%rowtype;
    v_status text := coalesce(p_doc ->> 'status', 'Chờ thanh toán');
    v_pay text := nullif(p_doc ->> 'pay', '');
begin
    if not p_new then
        select * into old from cong_no_khach_si where ma_cong_no = id;
        if old.trang_thai_cong_no = 'Đã thanh toán' and v_status <> 'Đã thanh toán' then
            raise exception 'Công nợ % đã thanh toán, không thể chuyển lại trạng thái cũ', id using errcode = 'PT422';
        end if;
    end if;
    if v_status = 'Đã thanh toán' and v_pay is null then
        raise exception 'Công nợ % đã thanh toán phải có phương thức thanh toán', id using errcode = 'PT422';
    end if;
    insert into cong_no_khach_si (ma_cong_no, ma_khach_hang, ngay_bat_dau_ky, han_thanh_toan, thoi_gian_thanh_toan, ma_pttt, trang_thai_cong_no)
    values (id, p_doc ->> 'custId', (p_doc ->> 'start')::timestamp, (p_doc ->> 'due')::timestamp,
            nullif(p_doc ->> 'paidAt', '')::timestamp, v_pay, v_status)
    on conflict (ma_cong_no) do update set ma_khach_hang = excluded.ma_khach_hang, ngay_bat_dau_ky = excluded.ngay_bat_dau_ky,
        han_thanh_toan = excluded.han_thanh_toan, thoi_gian_thanh_toan = excluded.thoi_gian_thanh_toan,
        ma_pttt = excluded.ma_pttt, trang_thai_cong_no = excluded.trang_thai_cong_no;
end $$;

create or replace function public._up_order(p_doc jsonb, p_new boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
    id        text := p_doc ->> 'id';
    old       don_hang%rowtype;
    v_status  text := p_doc ->> 'status';
    v_online  boolean := coalesce((p_doc ->> 'online')::boolean, false);
    v_proc    boolean := coalesce((p_doc ->> 'processing')::boolean, false);
    v_shop    text;
    v_user    text;
    v_pay     text := nullif(p_doc ->> 'pay', '');
    v_paid_at timestamp := nullif(p_doc ->> 'paidAt', '')::timestamp;
    v_created timestamp := coalesce(nullif(p_doc ->> 'createdAt', '')::timestamp, vn_now());
    v_phu     numeric := _money(coalesce((p_doc ->> 'phuThu')::numeric, 0), 'Phụ thu');
    v_giam    numeric := _money(coalesce((p_doc ->> 'giamGia')::numeric, 0), 'Giảm giá');
    v_printed smallint := coalesce((p_doc ->> 'printed')::smallint, 0);
    v_nphotos int := least(greatest(coalesce((p_doc ->> 'photos')::int, 0), 1), 3);
    v_urls    text[];
    ln        jsonb; i int := 0; q numeric; pr numeric;
    v_old_lines jsonb; v_new_lines jsonb;
begin
    if v_status is null then
        raise exception 'Đơn % thiếu trạng thái', id using errcode = 'PT422';
    end if;
    if jsonb_typeof(p_doc -> 'lines') is distinct from 'array' then
        raise exception 'Đơn % thiếu danh sách dịch vụ', id using errcode = 'PT422';
    end if;
    if jsonb_array_length(p_doc -> 'lines') > 100 then
        raise exception 'Đơn % có quá nhiều dòng dịch vụ', id using errcode = 'PT422';
    end if;
    if v_status = 'Đã thanh toán' and v_pay is null then
        raise exception 'Đơn % đã thanh toán phải có phương thức thanh toán', id using errcode = 'PT422';
    end if;

    -- chuẩn hóa dòng dịch vụ
    select coalesce(jsonb_agg(jsonb_build_object('svcId', l ->> 'svcId', 'qty', (l ->> 'qty')::numeric, 'price', (l ->> 'price')::numeric)), '[]'::jsonb)
      into v_new_lines from jsonb_array_elements(p_doc -> 'lines') l;
    for ln in select * from jsonb_array_elements(v_new_lines) loop
        q := (ln ->> 'qty')::numeric; pr := _money((ln ->> 'price')::numeric, 'Đơn giá');
        if q is null or q < 0 or q > 999999.99 then
            raise exception 'Khối lượng/số lượng không hợp lệ (0 – 999.999,99)' using errcode = 'PT422';
        end if;
    end loop;

    if not p_new then
        select * into old from don_hang where ma_don_hang = id for update;
        -- trạng thái
        if old.trang_thai is distinct from v_status then
            if old.trang_thai = 'Đã hủy' then
                raise exception 'Đơn % đã hủy, không thể đổi trạng thái', id using errcode = 'PT422';
            end if;
            if old.trang_thai = 'Đã thanh toán' then
                raise exception 'Đơn % đã thanh toán, không thể đổi trạng thái', id using errcode = 'PT422';
            end if;
            if v_status = 'Chờ xác nhận' then
                raise exception 'Đơn % không thể quay lại "Chờ xác nhận"', id using errcode = 'PT422';
            end if;
        end if;
        if (old.ma_don_hang in (select ma_don_hang from don_hang_online)) is distinct from v_online then
            raise exception 'Không thể đổi loại đơn (online/tại tiệm) của %', id using errcode = 'PT422';
        end if;
        -- đơn đã thanh toán: khóa số liệu tài chính
        if old.trang_thai = 'Đã thanh toán' then
            select coalesce(jsonb_agg(jsonb_build_object('svcId', ma_dich_vu::text, 'qty', khoi_so_luong, 'price', don_gia) order by stt, ma_chi_tiet_dh), '[]'::jsonb)
              into v_old_lines from chi_tiet_don_hang where ma_don_hang = id;
            if old.ma_khach_hang is distinct from (p_doc ->> 'custId') or coalesce(old.phu_thu, 0) <> v_phu
               or coalesce(old.giam_gia, 0) <> v_giam or v_old_lines is distinct from v_new_lines then
                raise exception 'Đơn % đã thanh toán, không thể sửa khách hàng/dịch vụ/phụ thu/giảm giá', id using errcode = 'PT422';
            end if;
        end if;
        v_user := old.ten_dang_nhap;
        v_shop := old.ma_cua_tiem;
    else
        v_user := public.auth_username();
        select min(ma_cua_tiem)::text into v_shop from cua_tiem;
        if v_shop is null then
            raise exception 'Chưa có cửa tiệm trong hệ thống' using errcode = 'PT422';
        end if;
    end if;

    if v_online then
        v_urls := coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(p_doc -> 'photoUrls') = 'array' then p_doc -> 'photoUrls' else '[]'::jsonb end)), array[]::text[]);
        if cardinality(v_urls) = 0 then
            v_urls := array(select 'pending/' || id || '/' || g from generate_series(1, v_nphotos) g);
        elsif cardinality(v_urls) > 3 then
            v_urls := v_urls[1:3];
        end if;
    end if;

    insert into don_hang (ma_don_hang, ma_khach_hang, ma_gio, ten_dang_nhap, ma_cua_tiem, ma_cong_no, ma_pttt, ngay_tao_don,
                          ngay_nhan, gio_nhan, trang_thai, giam_gia, phu_thu, ghi_chu, dang_xu_ly, da_in, thoi_gian_thanh_toan)
    values (id, p_doc ->> 'custId', nullif(p_doc ->> 'basket', ''), v_user, v_shop, nullif(p_doc ->> 'debtId', ''), v_pay, v_created,
            nullif(p_doc ->> 'recvDate', '')::date, nullif(p_doc ->> 'recvTime', '')::time, v_status, v_giam, v_phu,
            nullif(p_doc ->> 'note', ''), v_proc, v_printed, v_paid_at)
    on conflict (ma_don_hang) do update set
        ma_khach_hang = excluded.ma_khach_hang, ma_gio = excluded.ma_gio, ma_cong_no = excluded.ma_cong_no, ma_pttt = excluded.ma_pttt,
        ngay_nhan = excluded.ngay_nhan, gio_nhan = excluded.gio_nhan, trang_thai = excluded.trang_thai,
        giam_gia = excluded.giam_gia, phu_thu = excluded.phu_thu, ghi_chu = excluded.ghi_chu, dang_xu_ly = excluded.dang_xu_ly,
        da_in = excluded.da_in, thoi_gian_thanh_toan = excluded.thoi_gian_thanh_toan,
        thoi_gian_xac_nhan = case when don_hang.trang_thai = 'Chờ xác nhận' and excluded.trang_thai <> 'Chờ xác nhận'
                                  then vn_now() else don_hang.thoi_gian_xac_nhan end;

    -- dòng dịch vụ: thay mới nếu khác
    if p_new or v_old_lines is null then
        select coalesce(jsonb_agg(jsonb_build_object('svcId', ma_dich_vu::text, 'qty', khoi_so_luong, 'price', don_gia) order by stt, ma_chi_tiet_dh), '[]'::jsonb)
          into v_old_lines from chi_tiet_don_hang where ma_don_hang = id;
    end if;
    if v_old_lines is distinct from v_new_lines then
        delete from chi_tiet_don_hang where ma_don_hang = id;
        i := 0;
        for ln in select * from jsonb_array_elements(v_new_lines) loop
            i := i + 1;
            insert into chi_tiet_don_hang (ma_chi_tiet_dh, ma_don_hang, ma_dich_vu, stt, khoi_so_luong, don_gia)
            values ('CT' || lpad(nextval('seq_chi_tiet_don_hang')::text, 8, '0'), id, ln ->> 'svcId', i, (ln ->> 'qty')::numeric, (ln ->> 'price')::numeric);
        end loop;
    end if;

    -- đơn online
    if v_online then
        insert into don_hang_online (ma_don_hang, hinh_anh_gio_dung) values (id, v_urls)
        on conflict (ma_don_hang) do update set hinh_anh_gio_dung = excluded.hinh_anh_gio_dung;
    end if;

    -- hóa đơn (1 – 1): tạo khi đơn được in lần đầu, cập nhật thời điểm thanh toán
    if v_printed > 0 then
        insert into hoa_don (ma_hoa_don, ma_don_hang, thoi_gian_in, thoi_gian_thanh_toan)
        values ('HD' || lpad(nextval('seq_hoa_don')::text, 8, '0'), id, case when p_new then v_created else vn_now() end, null)
        on conflict (ma_don_hang) do nothing;
    end if;
    if v_status = 'Đã thanh toán' then
        update hoa_don set thoi_gian_thanh_toan = coalesce(v_paid_at, vn_now())
         where ma_don_hang = id and thoi_gian_thanh_toan is null;
    end if;
end $$;

-- ---------------------------------------------------------------------
-- Áp một lô thay đổi
--   p_changes = { "<bộ dữ liệu>": { "upsert":[{"doc":{...},"new":true|false}], "delete":["id",...] }, ... }
--   p_seq     = { "DH": 18, "KH": 7, ... }  (bộ đếm mã phía giao diện; server chỉ nâng lên, không hạ xuống)
-- ---------------------------------------------------------------------
create or replace function public.apply_changes(p_user text, p_changes jsonb, p_seq jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_phase text := 'upsert';
    v_coll  text;
    v_item  jsonb;
    v_id    text;
    v_new   boolean;
    v_rev   bigint;
    v_touched text[] := array[]::text[];
    v_key   text; v_val jsonb;
    v_order text[] := array['shops','custTypes','svcTypes','pays','baskets','customers','services','debts','orders','expenses'];
    v_del   text[] := array['orders','debts','expenses','customers','services','baskets','pays','svcTypes','custTypes','shops'];
    b text; r record;
begin
    perform public.set_user(p_user);
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập hoặc tài khoản đã bị khóa' using errcode = 'PT401';
    end if;
    if jsonb_typeof(p_changes) is distinct from 'object' then
        raise exception 'Gói thay đổi không hợp lệ' using errcode = 'PT422';
    end if;
    -- kiểm tra tên bộ dữ liệu
    for v_coll in select jsonb_object_keys(p_changes) loop
        if not (v_coll = any (v_order)) then
            raise exception 'Bộ dữ liệu "%" không hợp lệ', v_coll using errcode = 'PT422';
        end if;
    end loop;

    -- một người ghi tại một thời điểm: tránh đua nhau cùng giành một giỏ / một mã
    perform 1 from he_thong where khoa = 'rev' for update;

    -- 1) xóa đơn trước (để giải phóng giỏ/công nợ)
    v_phase := 'delete';
    if p_changes ? 'orders' then
        for v_id in select jsonb_array_elements_text(coalesce(p_changes -> 'orders' -> 'delete', '[]'::jsonb)) loop
            perform _chk_id('orders', v_id);
            delete from don_hang where ma_don_hang = v_id;
        end loop;
    end if;

    -- 2) thêm/sửa theo thứ tự phụ thuộc
    v_phase := 'upsert';
    foreach v_coll in array v_order loop
        continue when not (p_changes ? v_coll);
        for v_item in select * from jsonb_array_elements(coalesce(p_changes -> v_coll -> 'upsert', '[]'::jsonb)) loop
            if jsonb_typeof(v_item -> 'doc') is distinct from 'object' then
                raise exception 'Bản ghi trong "%" không hợp lệ', v_coll using errcode = 'PT422';
            end if;
            v_id  := v_item -> 'doc' ->> 'id';
            v_new := coalesce((v_item ->> 'new')::boolean, false);
            perform _chk_id(v_coll, v_id);
            if v_new and _exists(v_coll, v_id) then
                raise exception 'Mã % đã tồn tại (có người khác vừa tạo)', v_id using errcode = 'PT409';
            elsif not v_new and not _exists(v_coll, v_id) then
                raise exception 'Bản ghi % không còn tồn tại (có người khác vừa xóa)', v_id using errcode = 'PT409';
            end if;
            if v_coll = 'orders' then
                perform _up_order(v_item -> 'doc', v_new);
                v_touched := v_touched || v_id;
            elsif v_coll = 'debts' then
                perform _up_debt(v_item -> 'doc', v_new);
            else
                perform _up_master(v_coll, v_item -> 'doc', v_new);
            end if;
            perform _bump_seq(v_id);
        end loop;
    end loop;

    -- 3) mỗi giỏ chỉ thuộc một đơn đang xử lý
    for b in select distinct o.ma_gio::text from don_hang o
              where o.ma_don_hang = any (v_touched) and o.ma_gio is not null and _order_active(o.trang_thai, o.dang_xu_ly) loop
        if (select count(*) from don_hang o2 where o2.ma_gio = b and _order_active(o2.trang_thai, o2.dang_xu_ly)) > 1 then
            raise exception 'Giỏ % đang được đơn khác sử dụng', b using errcode = 'PT409';
        end if;
    end loop;

    -- 4) xóa các bộ còn lại
    v_phase := 'delete';
    foreach v_coll in array v_del loop
        continue when v_coll = 'orders' or not (p_changes ? v_coll);
        for v_id in select jsonb_array_elements_text(coalesce(p_changes -> v_coll -> 'delete', '[]'::jsonb)) loop
            perform _chk_id(v_coll, v_id);
            execute format('delete from public.%I where %I = $1',
                (select tbl from (values ('shops','cua_tiem'),('custTypes','loai_khach_hang'),('customers','khach_hang'),('svcTypes','loai_dich_vu'),
                                         ('services','dich_vu'),('baskets','gio_dung'),('pays','phuong_thuc_thanh_toan'),('expenses','chi_phi'),
                                         ('debts','cong_no_khach_si')) m(k, tbl) where k = v_coll),
                (select col from (values ('shops','ma_cua_tiem'),('custTypes','ma_loai_kh'),('customers','ma_khach_hang'),('svcTypes','ma_loai_dv'),
                                         ('services','ma_dich_vu'),('baskets','ma_gio'),('pays','ma_pttt'),('expenses','ma_chi_phi'),
                                         ('debts','ma_cong_no')) m(k, col) where k = v_coll)) using v_id;
        end loop;
    end loop;

    -- 5) bộ đếm mã do giao diện gửi (chỉ nâng lên)
    if jsonb_typeof(p_seq) = 'object' then
        for v_key, v_val in select * from jsonb_each(p_seq) loop
            if v_key ~ '^[A-Z]{1,5}$' and jsonb_typeof(v_val) = 'number' and (v_val #>> '{}')::numeric between 0 and 99999999 then
                update he_thong set gia_tri = jsonb_set(gia_tri, array[v_key],
                    to_jsonb(greatest(coalesce((gia_tri ->> v_key)::bigint, 0), (v_val #>> '{}')::bigint)), true)
                where khoa = 'seq';
            end if;
        end loop;
    end if;

    update he_thong set gia_tri = to_jsonb((gia_tri #>> '{}')::bigint + 1) where khoa = 'rev' returning (gia_tri #>> '{}')::bigint into v_rev;
    return jsonb_build_object('ok', true, 'rev', v_rev);

exception
    when sqlstate 'PT401' or sqlstate 'PT403' or sqlstate 'PT409' or sqlstate 'PT422' then
        raise;
    when unique_violation then
        raise exception 'Dữ liệu bị trùng (%)', sqlerrm using errcode = 'PT409';
    when deadlock_detected or lock_not_available then
        raise exception 'Hệ thống đang bận, vui lòng thử lại' using errcode = 'PT409';
    when foreign_key_violation then
        if v_phase = 'delete' then
            raise exception 'Không thể xóa vì dữ liệu này đang được sử dụng' using errcode = 'PT409';
        else
            raise exception 'Dữ liệu tham chiếu không tồn tại: %', sqlerrm using errcode = 'PT422';
        end if;
    when others then
        raise exception 'Dữ liệu không hợp lệ: %', sqlerrm using errcode = 'PT422';
end $$;

-- ---------------------------------------------------------------------
-- Cập nhật họ tên / số điện thoại hiển thị
-- ---------------------------------------------------------------------
create or replace function public.update_profile(p_user text, p_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
    perform public.set_user(p_user);
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập' using errcode = 'PT401';
    end if;
    if length(trim(coalesce(p_name, ''))) not between 1 and 50 or length(coalesce(p_phone, '')) > 20 then
        raise exception 'Họ tên 1–50 ký tự, số điện thoại tối đa 20 ký tự' using errcode = 'PT422';
    end if;
    update he_thong set gia_tri = jsonb_build_object('name', trim(p_name), 'phone', trim(coalesce(p_phone, ''))) where khoa = 'chu_tiem';
    return public.me();
end $$;

-- ---------------------------------------------------------------------
-- Phân quyền thực thi: chỉ máy chủ api/ (service_role) gọi được các hàm cổng
-- ---------------------------------------------------------------------
revoke all on function public.get_state(text), public.get_rev(text), public.apply_changes(text, jsonb, jsonb),
                       public.update_profile(text, text, text) from public, anon, authenticated;
grant execute on function public.get_state(text), public.get_rev(text), public.apply_changes(text, jsonb, jsonb),
                          public.update_profile(text, text, text) to service_role;
