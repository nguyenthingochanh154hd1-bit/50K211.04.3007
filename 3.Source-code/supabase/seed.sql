-- =====================================================================
-- CHERRY LAUNDRY – SEED: dữ liệu danh mục ban đầu + tài khoản chủ tiệm
-- Chạy SAU khi đã chạy 001 -> 006 (Supabase: SQL Editor, hoặc `supabase db reset`).
-- Chạy lại nhiều lần vẫn an toàn (on conflict do nothing).
-- KHÔNG có đơn hàng/khách mẫu giả: dữ liệu thật nhập qua ứng dụng hoặc script import (scripts/import-legacy.mjs).
-- =====================================================================

-- ---- 1. Cửa tiệm ----------------------------------------------------
insert into public.cua_tiem (ma_cua_tiem, ten_cua_tiem, dia_chi, dia_chi_phieu, dia_chi_en, thong_tin_lien_lac, ten_ngan_hang, so_tai_khoan_ngan_hang)
values ('CH001', 'Cherry Laundry', '41 Phùng Tá Chu, Sơn Trà, Đà Nẵng',
        '41 Phùng Tá Chu, P. Sơn Trà, TP. Đà Nẵng', '41 Phung Ta Chu, Son Tra Ward, Da Nang City',
        '0905117311', 'VietComBank (VCB)', '1052879335')
on conflict do nothing;

-- ---- 2. Loại khách hàng, loại dịch vụ, phương thức thanh toán, giỏ ---
insert into public.loai_khach_hang (ma_loai_kh, ten_loai_kh) values ('LKH01', 'Khách lẻ'), ('LKH02', 'Khách sỉ') on conflict do nothing;
insert into public.loai_dich_vu (ma_loai_dv, ten_loai_dv) values ('LDV01','Giặt'), ('LDV02','Sấy'), ('LDV03','Ủi'), ('LDV04','Khác') on conflict do nothing;
insert into public.phuong_thuc_thanh_toan (ma_pttt, ten_pttt) values ('PTTT000001', 'Tiền mặt'), ('PTTT000002', 'Chuyển khoản') on conflict do nothing;
insert into public.gio_dung (ma_gio, trang_thai) values ('G01','Trống'),('G02','Trống'),('G03','Trống'),('G04','Trống'),('G05','Trống'),('G06','Trống') on conflict do nothing;

-- ---- 3. Bảng giá dịch vụ --------------------------------------------
insert into public.dich_vu (ma_dich_vu, ma_loai_dv, ten_dich_vu, don_vi_tinh, don_gia) values
 ('DV00000001','LDV01','Giặt mền',            'kg',  25000),
 ('DV00000002','LDV01','Giặt rèm',            'kg',  25000),
 ('DV00000003','LDV01','Giặt thảm',           'kg',  15000),
 ('DV00000004','LDV01','Giặt tay',            'món', 10000),
 ('DV00000005','LDV01','Giặt giày',           'món', 60000),
 ('DV00000006','LDV01','Giặt mũ',             'món', 20000),
 ('DV00000007','LDV01','Giặt chăn mỏng',      'món', 30000),
 ('DV00000008','LDV01','Giặt quần áo',        'kg',  10000),
 ('DV00000009','LDV01','Giặt thú nhồi bông',  'món', 60000),
 ('DV00000010','LDV01','Giặt balo',           'món', 30000),
 ('DV00000011','LDV02','Sấy quần áo',         'kg',  10000),
 ('DV00000012','LDV03','Ủi quần áo',          'món', 10000)
on conflict do nothing;

-- bộ đếm mã: các mã trên đã dùng đến DV12, CH001, LKH02, LDV04, PTTT000002, G06
update public.he_thong set gia_tri = coalesce(gia_tri, '{}'::jsonb) || '{"DV":12,"CH":1,"LKH":2,"LDV":4,"PTTT":2,"G":6}'::jsonb where khoa = 'seq';

-- ---- 4. Tài khoản chủ tiệm ------------------------------------------
-- Tên đăng nhập: kimvui   Mật khẩu tạm: ChangeMe!2026  ->  ĐỔI NGAY sau lần đăng nhập đầu tiên (menu Tài khoản trong ứng dụng).
-- Mật khẩu được băm bcrypt khi lưu (tai_khoan.mat_khau không bao giờ chứa mật khẩu chữ thường).
do $$
begin
    if exists (select 1 from public.tai_khoan where ten_dang_nhap = 'kimvui') then
        raise notice 'Tài khoản kimvui đã tồn tại – bỏ qua';
    else
        perform public.tao_tai_khoan('kimvui', 'ChangeMe!2026');
        update public.he_thong set gia_tri = '{"name":"Kim Vui Phan","phone":"+84 905 117 311"}'::jsonb where khoa = 'chu_tiem';
    end if;
end $$;
