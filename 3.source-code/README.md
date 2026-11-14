# Cherry Laundry – hệ thống quản lý tiệm giặt ủi

Vite (giao diện) + Vercel Functions (`api/`) + Supabase (chỉ dùng làm **PostgreSQL**; **không dùng Supabase Auth**).

```
Trình duyệt ──/api/login──► Vercel Function ──► hàm SQL dang_nhap() (kiểm tra mật khẩu bcrypt) ──► token phiên
Trình duyệt ──/api/*  + token──► Vercel Function (xác thực token) ──service_role──► hàm SQL (get_state, apply_changes, report_*)
```
- Trình duyệt **không có khóa Supabase nào** và không gọi Supabase trực tiếp.
- Mọi bảng bật RLS và **không có policy** → khóa anon công khai không đọc/ghi được gì. Chỉ máy chủ `api/` (giữ `service_role` key) gọi được các hàm SQL.
- Mọi luật nghiệp vụ và phân quyền nằm **trong database**; `api/` chỉ xác thực, kiểm tra đầu vào và chuyển tiếp.

## Tài khoản & mật khẩu
- Hệ thống dành cho **một người dùng**: không có vai trò hay phân quyền; đăng nhập được là dùng đủ mọi chức năng.
- Bảng `tai_khoan` đúng thiết kế: `ten_dang_nhap` (khóa chính) + `mat_khau`. `mat_khau` là **mã băm bcrypt**, không phải mật khẩu chữ thường (nếu lưu chữ thường, ai xem được database đều đọc được mật khẩu).
- Họ tên + số điện thoại hiển thị (in trên đơn, trang tài khoản) lưu ở bảng `he_thong` (khóa `chu_tiem`), sửa được trong trang *Quản lý tài khoản*.
- Sai mật khẩu 5 lần liên tiếp → khóa đăng nhập 15 phút (bộ đếm tính chung, lưu ở `he_thong`, khóa `dang_nhap_sai`). Token phiên sống 12 giờ, lưu trong `sessionStorage` (đóng tab là đăng xuất).
- Quên mật khẩu / mở khóa ngay (chạy trong Supabase SQL Editor):
  ```sql
  select dat_lai_mat_khau('kimvui', 'MatKhauMoi123');   -- đồng thời mở khóa đăng nhập
  select tao_tai_khoan('ten_moi', 'MatKhau123');         -- tạo thêm tài khoản (nếu cần)
  ```
  Tên đăng nhập: 3–50 ký tự thường `a-z 0-9 . _ -`. Mật khẩu: 8–72 ký tự, có chữ và số.

## 1. Cài đặt Supabase
1. Tạo project tại supabase.com (region Singapore).
2. **SQL Editor** → dán và chạy `supabase/all_in_one.sql` (gộp 001 → 006 + seed). Hoặc chạy lần lượt từng file `supabase/migrations/001…006` rồi `supabase/seed.sql`. Mỗi file phải báo *Success*; chỉ chạy một lần.
3. `seed.sql` tạo cửa tiệm, bảng giá, giỏ và tài khoản **`kimvui` / `ChangeMe!2026`** → **đổi mật khẩu ngay** sau lần đăng nhập đầu (menu *Quản lý tài khoản*).
4. **Project Settings → API**: lấy **Project URL** và khóa **service_role** (hoặc *secret key* dạng `sb_secret_…`).
   Khóa này toàn quyền với database: chỉ đặt trong `.env.local` và Environment Variables của Vercel; không commit, không gửi ai.

## 2. Chạy trên máy
```bash
npm install
cp .env.example .env.local      # điền SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET
npx vercel dev                  # chạy api/ + giao diện (cổng 3000) – dùng cái này
```
Tạo `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
(`npm run dev` chạy riêng Vite ở cổng 5173 và chuyển `/api` sang `vercel dev` đang chạy ở cổng 3000.)

## 3. Nhập dữ liệu cũ
```bash
# .env.local cần SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMPORT_USERNAME (tên đăng nhập của bạn)
node scripts/import-legacy.mjs duong-dan/state.json --dry-run   # kiểm tra tệp
node scripts/import-legacy.mjs duong-dan/state.json --wipe      # nạp lần đầu (xóa dữ liệu seed rồi nạp)
```
Chạy trong một giao dịch: lỗi thì không có gì thay đổi. Không có `--wipe`, mã trùng dữ liệu hiện có sẽ báo 409.

## 4. Deploy Vercel
1. Đẩy mã lên GitHub → Vercel → *Add New Project* → chọn repo (Vite, nhận từ `vercel.json`).
2. **Environment Variables** (Production + Preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`.
3. Deploy, rồi kiểm tra `https://<domain>/api/health` → `{"ok":true,...}`.
4. Domain: Vercel → Settings → Domains → thêm tên miền, trỏ DNS theo hướng dẫn (CNAME `cname.vercel-dns.com` hoặc A `76.76.21.21`). HTTPS tự cấp.

## 5. Cấu trúc & điểm khác thiết kế gốc
Theo đúng cấu trúc thư mục mô tả; bổ sung: `api/login.ts`, `api/state.ts`, `api/account.ts`, `api/_lib/*`, `supabase/migrations/004–006`, `supabase/all_in_one.sql`, `scripts/`, `tests/`, `src/core/{registry,ui,crud}.js`, `src/utils/{qr,icons}.js` và các file module phụ. **Không còn `src/services/supabase.js`** vì giao diện không gọi Supabase.

Database theo thiết kế vật lý 14 bảng (+ `he_thong`), sang PostgreSQL (snake_case). Khác/bổ sung (đánh dấu `[+]`/`[~]` trong `001_initial_schema.sql`):
- `TaiKhoan` → `tai_khoan` (đúng 2 cột). Không có bảng hồ sơ/phân quyền (một người dùng).
- Thêm cột: `cua_tiem.dia_chi_phieu/dia_chi_en`, `cong_no_khach_si.ma_khach_hang/ma_pttt`, `don_hang.dang_xu_ly/da_in/thoi_gian_thanh_toan`, `chi_tiet_don_hang.stt`; trạng thái đơn thêm `Đã hủy`; số lượng cho phép 0 (đơn online chờ xác nhận); `don_hang.ma_gio`/`ma_pttt` cho phép rỗng; ảnh online là `text[]` 1–3 ảnh.
- Bảng `he_thong` (số phiên bản dữ liệu, bộ đếm mã, họ tên/SĐT hiển thị, bộ đếm đăng nhập sai).
- Giá/số tiền tối đa 9.999.999.999 đ (ô nhập giới hạn 10 chữ số).
- Đã bỏ: mật khẩu hiển thị ở trang tài khoản, tài khoản demo ở trang đăng nhập, nút "đặt lại dữ liệu mẫu".
- Ảnh giỏ đồ của đơn online lưu trong Supabase Storage (bucket riêng tư `basket-photos`), DB chỉ giữ đường dẫn.

## 5b. Đặt đơn online cho khách (`/online/`)
- Trang công khai, không cần đăng nhập: `online/index.html` + `src/online/*` (build thành trang thứ hai của Vite; `vercel.json` có rewrite `/online`). Trang Cửa hàng của nhân viên có thẻ liên kết + mã QR để gửi khách.
- Luồng: khách nhập tên, SĐT, chọn dịch vụ, giỏ trống, chụp 1–3 ảnh → `POST /api/online` (`op:create`) → hàm SQL `online_create_order` tạo khách (nếu SĐT mới) + `don_hang` trạng thái **Chờ xác nhận** + `don_hang_online`, giỏ chuyển 'Đầy', số lượng 0 (nhân viên cân sau). Đơn hiện ngay ở tab "Đơn online" của danh sách đơn (người tạo: "Khách đặt online") sau tối đa 6 giây.
- Khách tra đơn bằng SĐT (`op:lookup`), ảnh xem qua đường dẫn ký 10 phút.
- Migration `007_online_orders.sql` (đã có trong `all_in_one.sql`) tạo bucket `basket-photos`. Nếu khối này báo lỗi, tạo bucket **private** tên `basket-photos` trong Supabase → Storage.
- Chống lạm dụng: tối đa 3 đơn chờ xác nhận/SĐT, 30 đơn chờ toàn hệ thống, giới hạn theo IP (trong bộ nhớ), ảnh nén phía trình duyệt (≤1024px) và tối đa 600KB/ảnh; khách sỉ không đặt được.
- Vercel Hobby cho tối đa 12 function: dự án đang dùng đúng 12 (`api/*.ts` không bắt đầu bằng `_`), không thêm file mới vào `api/`.
- Giới hạn: tra cứu chỉ bằng SĐT (ai biết SĐT đều xem được đơn và tên khách đó); ảnh của đơn bị hủy/xóa chưa được dọn khỏi Storage; phần Storage chưa thử trên Supabase thật.

## 6. Cách hoạt động của đồng bộ
Giao diện giữ dữ liệu trong bộ nhớ như trước; mỗi lần lưu chỉ gửi phần thay đổi tới đúng `/api/<tài nguyên>` (danh mục trước, nghiệp vụ sau; đơn + giỏ + công nợ + khách mới đi chung một yêu cầu để ghi nguyên tử). `apply_changes` ghi tuần tự từng lần, kiểm tra mã, giá, trạng thái (đơn hủy/đã thanh toán không đổi ngược), mỗi giỏ chỉ thuộc một đơn đang xử lý; xung đột trả 409 → giao diện tải lại. Cứ 6 giây giao diện hỏi `rev`; có thay đổi (đơn online mới…) thì gộp vào.

## 7. Giới hạn hiện tại
- Token phiên không bị thu hồi ngay khi đổi mật khẩu (hết hạn sau 12 giờ); xóa tài khoản khỏi bảng `tai_khoan` thì có hiệu lực ngay ở lời gọi kế tiếp.
- Hai người cùng tạo một mã: người đến sau nhận thông báo xung đột và phải nhập lại.
- Bộ đếm đăng nhập sai là chung: người lạ cố tình gõ sai 5 lần sẽ khiến bạn bị khóa 15 phút (bạn có thể mở khóa ngay bằng `dat_lai_mat_khau`).

## 8. Kiểm thử đã chạy
Database (PostgreSQL 16 thật, vai trò Supabase giả): 54 kiểm tra (đăng nhập, khóa sau 5 lần sai, mã băm bcrypt, anon/authenticated bị chặn hoàn toàn, nghiệp vụ…); 22 phép đối chiếu báo cáo SQL ↔ công thức JS cũ khớp; import trọn gói và hoàn tác khi lỗi. Giao diện (Playwright, máy chủ giả lập chạy các hàm `api/*.ts` thật): đăng nhập/đăng xuất, 21 trang, thanh toán đơn/công nợ, hai phiên cùng tạo một mã, đồng bộ qua polling. Module online: 19 kiểm tra DB (chuẩn hóa SĐT, giới hạn, quyền anon, nhân viên xác nhận giữ ảnh) và 31 kiểm tra e2e (đặt đơn có ảnh → nhân viên thấy → khách tra cứu, 409/422/429). CSS tách 5 file cho computed-style giống hệt bản gốc.
