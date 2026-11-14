-- =====================================================================
-- CHERRY LAUNDRY – 005: BÁO CÁO (tính trong database, chỉ chủ tiệm xem)
-- Công thức giữ nguyên với bản chạy trên trình duyệt trước đây:
--   tổng đơn   t = 0 nếu tạm tính = 0, ngược lại max(30.000, tạm tính + phụ thu − giảm giá)
--   doanh thu thực của đơn  = t nếu "Đã thanh toán", ngược lại 0
--   công nợ của đơn         = t nếu khách sỉ và đơn "Đang xử lý" / "Đã giao", ngược lại 0
--   doanh thu gộp           = thực + công nợ
--   Bỏ qua đơn "Đã hủy" và "Chờ xác nhận". Lọc theo ngày tạo đơn (gồm cả hai đầu).
--   Lọc loại/dịch vụ: tính theo tỷ lệ tiền của các dòng được chọn trên tạm tính của đơn.
-- =====================================================================

-- Khách sỉ: tên loại khách (bỏ dấu, không phân biệt hoa/thường) có chứa "si"
create or replace function public.is_wholesale(p_ma_loai_kh text) returns boolean
language sql stable security definer set search_path = public as $$
    select coalesce(
        (select position('si' in lower(replace(regexp_replace(normalize(ten_loai_kh, NFD), '[̀-ͯ]', '', 'g'), 'đ', 'd'))) > 0
           from loai_khach_hang where ma_loai_kh = p_ma_loai_kh), false)
$$;

create or replace function public._order_total(p_sub numeric, p_phu numeric, p_giam numeric) returns numeric
language sql immutable as $$
    select case when p_sub <= 0 then 0 else greatest(30000, p_sub + coalesce(p_phu, 0) - coalesce(p_giam, 0)) end
$$;

create or replace function public._need_report() returns void
language plpgsql stable security definer set search_path = public as $$
begin
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập hoặc tài khoản đã bị khóa' using errcode = 'PT401';
    end if;
end $$;

-- Dòng doanh thu theo đơn (sau khi lọc)
create or replace function public._rev_rows(p_from date, p_to date, p_type text, p_svc text, p_ot text)
returns table (ma_don_hang text, tong numeric, thuc numeric, no_ numeric, gop numeric, ty_le numeric, tam_tinh numeric)
language sql stable security definer set search_path = public as $$
    with o as (
        select d.ma_don_hang, d.trang_thai, d.ma_khach_hang, d.phu_thu, d.giam_gia,
               (select coalesce(sum(c.khoi_so_luong * c.don_gia), 0) from chi_tiet_don_hang c where c.ma_don_hang = d.ma_don_hang) as s,
               (select coalesce(sum(c.khoi_so_luong * c.don_gia), 0)
                  from chi_tiet_don_hang c join dich_vu v on v.ma_dich_vu = c.ma_dich_vu
                 where c.ma_don_hang = d.ma_don_hang
                   and (coalesce(p_type, '') = '' or v.ma_loai_dv = p_type)
                   and (coalesce(p_svc, '') = '' or c.ma_dich_vu = p_svc)) as f,
               (select count(*) from chi_tiet_don_hang c join dich_vu v on v.ma_dich_vu = c.ma_dich_vu
                 where c.ma_don_hang = d.ma_don_hang
                   and (coalesce(p_type, '') = '' or v.ma_loai_dv = p_type)
                   and (coalesce(p_svc, '') = '' or c.ma_dich_vu = p_svc)) as nl,
               (x.ma_don_hang is not null) as is_online,
               k.ma_loai_kh
          from don_hang d
          left join don_hang_online x on x.ma_don_hang = d.ma_don_hang
          join khach_hang k on k.ma_khach_hang = d.ma_khach_hang
         where d.trang_thai not in ('Đã hủy', 'Chờ xác nhận')
           and d.ngay_tao_don::date between p_from and p_to
    ), t as (
        select o.*, _order_total(o.s, o.phu_thu, o.giam_gia) as tt from o
         where nl > 0
           and (coalesce(p_ot, 'all') in ('', 'all') or (p_ot = 'online' and is_online) or (p_ot = 'offline' and not is_online))
    )
    select ma_don_hang::text,
           tt * ratio,
           (case when trang_thai = 'Đã thanh toán' then tt else 0 end) * ratio,
           (case when is_wholesale(ma_loai_kh::text) and trang_thai in ('Đang xử lý', 'Đã giao') then tt else 0 end) * ratio,
           ((case when trang_thai = 'Đã thanh toán' then tt else 0 end)
            + (case when is_wholesale(ma_loai_kh::text) and trang_thai in ('Đang xử lý', 'Đã giao') then tt else 0 end)) * ratio,
           ratio, s
      from (select t.*, case when s > 0 then f / s else 0 end as ratio from t) q
$$;

-- Doanh thu: tổng + theo dịch vụ + danh sách đơn
create or replace function public.report_revenue(p_user text, p_from date, p_to date, p_type text default '', p_svc text default '', p_ot text default 'all')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
    perform public.set_user(p_user);
    perform _need_report();
    if p_from is null or p_to is null or p_from > p_to then
        raise exception 'Khoảng thời gian không hợp lệ' using errcode = 'PT422';
    end if;
    with r as (select * from _rev_rows(p_from, p_to, p_type, p_svc, p_ot)),
    line_share as (
        -- mỗi dòng dịch vụ (đã lọc) nhận phần doanh thu = thực/gộp đơn đầy đủ × tiền dòng / tạm tính
        select c.ma_dich_vu::text as svc,
               sum(case when d.trang_thai = 'Đã thanh toán' then _order_total(r.tam_tinh, d.phu_thu, d.giam_gia) else 0 end * c.khoi_so_luong * c.don_gia / nullif(r.tam_tinh, 0)) as thuc,
               sum(((case when d.trang_thai = 'Đã thanh toán' then 1 else 0 end)
                    + (case when is_wholesale(k.ma_loai_kh::text) and d.trang_thai in ('Đang xử lý', 'Đã giao') then 1 else 0 end))
                   * _order_total(r.tam_tinh, d.phu_thu, d.giam_gia) * c.khoi_so_luong * c.don_gia / nullif(r.tam_tinh, 0)) as gop
          from r
          join don_hang d on d.ma_don_hang = r.ma_don_hang
          join khach_hang k on k.ma_khach_hang = d.ma_khach_hang
          join chi_tiet_don_hang c on c.ma_don_hang = d.ma_don_hang
          join dich_vu v on v.ma_dich_vu = c.ma_dich_vu
         where (coalesce(p_type, '') = '' or v.ma_loai_dv = p_type)
           and (coalesce(p_svc, '') = '' or c.ma_dich_vu = p_svc)
         group by c.ma_dich_vu
    )
    select jsonb_build_object(
        'real',  coalesce((select sum(thuc) from r), 0),
        'gross', coalesce((select sum(gop) from r), 0),
        'rows',  coalesce((select jsonb_agg(jsonb_build_object('id', ma_don_hang, 'total', tong, 'real', thuc, 'debt', no_, 'gross', gop) order by ma_don_hang) from r), '[]'::jsonb),
        'bySvc', coalesce((select jsonb_agg(jsonb_build_object('svcId', svc, 'real', coalesce(thuc, 0), 'gross', coalesce(gop, 0)) order by svc)
                             from line_share where coalesce(gop, 0) > 0 or coalesce(thuc, 0) > 0), '[]'::jsonb)
    ) into v;
    return v;
end $$;

-- Lợi nhuận theo tuần (7 ngày một mốc kể từ ngày bắt đầu)
create or replace function public.report_profit(p_user text, p_from date, p_to date, p_ot text default 'all')
returns jsonb language plpgsql security definer set search_path = public as $$
declare a date := p_from; b date; v jsonb := '[]'::jsonb; g int := 0; rv record; cp numeric; n int;
begin
    perform public.set_user(p_user);
    perform _need_report();
    if p_from is null or p_to is null or p_from > p_to then
        raise exception 'Khoảng thời gian không hợp lệ' using errcode = 'PT422';
    end if;
    while a <= p_to and g < 60 loop
        g := g + 1;
        b := least(a + 6, p_to);
        select coalesce(sum(gop), 0) as gross, coalesce(sum(thuc), 0) as real, count(*) as n
          into rv from _rev_rows(a, b, '', '', p_ot);
        select coalesce(sum(tong_tien), 0) into cp from chi_phi where ngay_tao::date between a and b;
        v := v || jsonb_build_object('a', to_char(a, 'YYYY-MM-DD'), 'b', to_char(b, 'YYYY-MM-DD'),
                  'gross', rv.gross, 'real', rv.real, 'cp', cp, 'lg', rv.gross - cp, 'lr', rv.real - cp, 'n', rv.n);
        a := b + 1;
    end loop;
    return v;
end $$;

-- Công nợ khách sỉ theo khách hàng
create or replace function public.report_debt(p_user text, p_from date, p_to date, p_type text default '', p_cust text default '', p_svc text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
    perform public.set_user(p_user);
    perform _need_report();
    if p_from is null or p_to is null or p_from > p_to then
        raise exception 'Khoảng thời gian không hợp lệ' using errcode = 'PT422';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('custId', ma_khach_hang, 'tot', tot, 'paid', paid, 'n', n) order by ma_khach_hang), '[]'::jsonb)
      into v
      from (
        select d.ma_khach_hang::text as ma_khach_hang,
               sum(_order_total(s.tam, d.phu_thu, d.giam_gia)) as tot,
               sum(case when d.trang_thai = 'Đã thanh toán' then _order_total(s.tam, d.phu_thu, d.giam_gia) else 0 end) as paid,
               count(*) as n
          from don_hang d
          join khach_hang k on k.ma_khach_hang = d.ma_khach_hang
          cross join lateral (select coalesce(sum(c.khoi_so_luong * c.don_gia), 0) as tam from chi_tiet_don_hang c where c.ma_don_hang = d.ma_don_hang) s
         where is_wholesale(k.ma_loai_kh::text)
           and d.trang_thai not in ('Đã hủy', 'Chờ xác nhận')
           and d.ngay_tao_don::date between p_from and p_to
           and (coalesce(p_cust, '') = '' or d.ma_khach_hang = p_cust)
           and (coalesce(p_type, '') = '' or exists (select 1 from chi_tiet_don_hang c join dich_vu v2 on v2.ma_dich_vu = c.ma_dich_vu
                                                       where c.ma_don_hang = d.ma_don_hang and v2.ma_loai_dv = p_type))
           and (coalesce(p_svc, '') = '' or exists (select 1 from chi_tiet_don_hang c where c.ma_don_hang = d.ma_don_hang and c.ma_dich_vu = p_svc))
         group by d.ma_khach_hang
      ) q;
    return v;
end $$;

-- Đối soát thu tiền: số đơn và số tiền đã thu theo phương thức thanh toán (theo ngày thanh toán)
create or replace function public.report_reconcile(p_user text, p_from date, p_to date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
    perform public.set_user(p_user);
    perform _need_report();
    if p_from is null or p_to is null or p_from > p_to then
        raise exception 'Khoảng thời gian không hợp lệ' using errcode = 'PT422';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('payId', p.ma_pttt::text, 'name', p.ten_pttt, 'orders', coalesce(q.n, 0), 'amount', coalesce(q.amt, 0))
                              order by p.ma_pttt), '[]'::jsonb)
      into v
      from phuong_thuc_thanh_toan p
      left join (
          select d.ma_pttt, count(*) as n,
                 sum(_order_total((select coalesce(sum(c.khoi_so_luong * c.don_gia), 0) from chi_tiet_don_hang c where c.ma_don_hang = d.ma_don_hang), d.phu_thu, d.giam_gia)) as amt
            from don_hang d
           where d.trang_thai = 'Đã thanh toán' and d.thoi_gian_thanh_toan::date between p_from and p_to
           group by d.ma_pttt
      ) q on q.ma_pttt = p.ma_pttt;
    return v;
end $$;

revoke all on function public.report_revenue(text, date, date, text, text, text), public.report_profit(text, date, date, text),
                       public.report_debt(text, date, date, text, text, text), public.report_reconcile(text, date, date) from public, anon, authenticated;
grant execute on function public.report_revenue(text, date, date, text, text, text), public.report_profit(text, date, date, text),
                          public.report_debt(text, date, date, text, text, text), public.report_reconcile(text, date, date) to service_role;
