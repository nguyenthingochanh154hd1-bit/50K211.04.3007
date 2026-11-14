-- =====================================================================
-- CHERRY LAUNDRY – 003: ROW LEVEL SECURITY (khóa toàn bộ truy cập trực tiếp)
-- Mô hình: trình duyệt KHÔNG gọi Supabase. Chỉ máy chủ api/ (service_role) gọi các hàm SQL ở 002/004/005/006.
--   • Bật RLS cho mọi bảng và KHÔNG tạo policy nào -> vai trò anon / authenticated không đọc, không ghi được bất kỳ dòng nào,
--     kể cả khi ai đó lấy được anon key (khóa này công khai trong mọi dự án Supabase).
--   • Thu hồi toàn bộ quyền bảng / hàm của anon + authenticated, và đặt mặc định để hàm tạo sau này cũng không cấp cho họ.
--   • service_role bỏ qua RLS theo thiết kế của Supabase; mọi truy cập đều đi qua các hàm SQL cổng, và chỉ api/ (đã xác thực) gọi được.
-- =====================================================================

alter table public.cua_tiem               enable row level security;
alter table public.tai_khoan              enable row level security;
alter table public.loai_khach_hang        enable row level security;
alter table public.khach_hang             enable row level security;
alter table public.loai_dich_vu           enable row level security;
alter table public.dich_vu                enable row level security;
alter table public.gio_dung               enable row level security;
alter table public.phuong_thuc_thanh_toan enable row level security;
alter table public.cong_no_khach_si       enable row level security;
alter table public.don_hang               enable row level security;
alter table public.don_hang_online        enable row level security;
alter table public.chi_tiet_don_hang      enable row level security;
alter table public.hoa_don                enable row level security;
alter table public.chi_phi                enable row level security;
alter table public.he_thong               enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant usage on schema public to service_role;
