-- =====================================================================
-- XÓA SẠCH các bảng / hàm của Cherry Laundry trong schema public (để chạy lại all_in_one.sql từ đầu).
-- CHỈ dùng khi chưa có dữ liệu thật: lệnh này xóa toàn bộ dữ liệu trong các bảng của ứng dụng.
-- Không đụng tới schema auth / storage / extensions của Supabase.
-- =====================================================================
drop table if exists
    public.hoa_don, public.chi_tiet_don_hang, public.don_hang_online, public.don_hang, public.cong_no_khach_si,
    public.chi_phi, public.khach_hang, public.dich_vu, public.gio_dung, public.phuong_thuc_thanh_toan,
    public.loai_khach_hang, public.loai_dich_vu, public.cua_tiem, public.ho_so_tai_khoan, public.tai_khoan,
    public.quyen_han, public.he_thong
    cascade;

drop sequence if exists public.seq_chi_tiet_don_hang, public.seq_hoa_don;

do $$
declare r record;
begin
    for r in select p.oid::regprocedure as sig
               from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prokind = 'f'
    loop
        execute 'drop function if exists ' || r.sig || ' cascade';
    end loop;
end $$;
