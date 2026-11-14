-- =====================================================================
-- 008 – Trang đặt đơn online: số điện thoại cho phép nhập từ 1 - 20 số
--   * Trước đây bắt buộc 6 - 20 ký tự (regex {6,20}).
--   * Chuỗi máy chủ nhận có dạng:
--       VN : '0' + phần số (1 - 20 số)              VD: 0905117311
--       khác: '+<mã vùng> ' + phần số (1 - 20 số)    VD: +886 912345678
--     => phần số luôn 1 - 20 số; chuỗi lưu dài tối đa '+886 ' + 20 = 25 ký tự
--        nên nới cột lên varchar(25).
-- =====================================================================

alter table public.khach_hang alter column thong_tin_lien_lac type varchar(25);

do $$
declare f text;
begin
    foreach f in array array['online_create_order', 'online_lookup'] loop
        execute (
            select replace(pg_get_functiondef(p.oid),
                           '''^\+?[0-9 ]{6,20}$''',
                           '''^(\+[0-9]{1,4} )?0?[0-9]{1,20}$''')
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = f
        );
    end loop;
end $$;
