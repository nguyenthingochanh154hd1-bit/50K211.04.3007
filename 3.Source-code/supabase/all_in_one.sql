-- =====================================================================
-- CHERRY LAUNDRY – 001: LƯỢC ĐỒ DATABASE (PostgreSQL / Supabase)
-- Chuyển từ "Thiết kế vật lý cơ sở dữ liệu" (14 bảng, SQL Server) sang PostgreSQL.
--   • Tên bảng/cột viết snake_case (maDonHang -> ma_don_hang, ...).
--   • nvarchar -> varchar, datetime -> timestamp (giờ địa phương, không múi giờ),
--     getdate() -> now(), bit/time/date giữ nguyên.
--   • tai_khoan giữ đúng 2 cột (ten_dang_nhap khóa chính, mat_khau = mã băm bcrypt); chỉ có MỘT người dùng nên không có vai trò/phân quyền; họ tên, SĐT và bộ đếm đăng nhập sai nằm ở bảng he_thong.
--   • Không dùng Supabase Auth: đăng nhập do hàm dang_nhap() + máy chủ api/ xử lý (xem 002).
-- Các điểm BỔ SUNG so với thiết kế gốc (cần cho phần mềm hiện tại) được đánh dấu "[+]".
-- Các điểm KHÁC thiết kế gốc được đánh dấu "[~]".
-- =====================================================================

-- Giờ địa phương Việt Nam (ứng dụng lưu thời gian dạng "giờ tường", không múi giờ)
create extension if not exists pgcrypto with schema extensions;

create or replace function public.vn_now() returns timestamp
language sql stable as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp(0) $$;

-- ---------------------------------------------------------------------
-- Bảng 1. cua_tiem – Cửa tiệm
-- ---------------------------------------------------------------------
create table public.cua_tiem (
    ma_cua_tiem            char(5)       not null,
    ten_cua_tiem           varchar(50)   not null,
    dia_chi                varchar(100)  not null,
    dia_chi_phieu          varchar(100),                  -- [+] địa chỉ in trên phiếu giao nhận
    dia_chi_en             varchar(100),                  -- [+] địa chỉ tiếng Anh in trên hóa đơn
    thong_tin_lien_lac     varchar(15)   not null,
    ten_ngan_hang          varchar(50)   not null,
    so_tai_khoan_ngan_hang varchar(30)   not null,
    constraint pk_cua_tiem primary key (ma_cua_tiem)
);

-- ---------------------------------------------------------------------
-- Bảng 2. tai_khoan – Tài khoản đăng nhập (đúng thiết kế: chỉ 2 cột)
--   mat_khau lưu MÃ BĂM bcrypt (extensions.crypt), KHÔNG lưu mật khẩu chữ thường.
--   Đăng nhập do hàm dang_nhap() (002) kiểm tra; tạo tài khoản bằng tao_tai_khoan() (002).
-- ---------------------------------------------------------------------
create table public.tai_khoan (
    ten_dang_nhap  varchar(50)   not null,
    mat_khau       varchar(100)  not null,
    constraint pk_tai_khoan primary key (ten_dang_nhap),
    constraint ck_tai_khoan_ten check (ten_dang_nhap ~ '^[a-z0-9._-]{3,50}$')
);

-- ---------------------------------------------------------------------
-- Bảng 3. loai_khach_hang – Loại khách hàng
-- ---------------------------------------------------------------------
create table public.loai_khach_hang (
    ma_loai_kh   char(5)       not null,
    ten_loai_kh  varchar(50)   not null,
    constraint pk_loai_khach_hang primary key (ma_loai_kh)
);

-- ---------------------------------------------------------------------
-- Bảng 4. khach_hang – Khách hàng
-- ---------------------------------------------------------------------
create table public.khach_hang (
    ma_khach_hang      char(10)      not null,
    ma_loai_kh         char(5)       not null,
    ten_khach_hang     varchar(50)   not null,
    thong_tin_lien_lac varchar(20)   not null,
    dia_chi            varchar(100),
    constraint pk_khach_hang primary key (ma_khach_hang),
    constraint uq_khach_hang_sdt unique (thong_tin_lien_lac),
    constraint fk_khach_hang_loai foreign key (ma_loai_kh) references public.loai_khach_hang (ma_loai_kh)
);

-- ---------------------------------------------------------------------
-- Bảng 5. loai_dich_vu – Loại dịch vụ
-- ---------------------------------------------------------------------
create table public.loai_dich_vu (
    ma_loai_dv   char(5)       not null,
    ten_loai_dv  varchar(50)   not null,
    constraint pk_loai_dich_vu primary key (ma_loai_dv)
);

-- ---------------------------------------------------------------------
-- Bảng 6. dich_vu – Dịch vụ
-- ---------------------------------------------------------------------
create table public.dich_vu (
    ma_dich_vu   char(10)      not null,
    ma_loai_dv   char(5)       not null,
    ten_dich_vu  varchar(50)   not null,
    don_vi_tinh  varchar(20)   not null,
    don_gia      numeric(12,2),
    constraint pk_dich_vu primary key (ma_dich_vu),
    constraint fk_dich_vu_loai foreign key (ma_loai_dv) references public.loai_dich_vu (ma_loai_dv),
    constraint ck_dich_vu_don_gia check (don_gia >= 0)
);

-- ---------------------------------------------------------------------
-- Bảng 7. gio_dung – Giỏ đựng
-- ---------------------------------------------------------------------
create table public.gio_dung (
    ma_gio     char(3)       not null,
    trang_thai varchar(30),
    constraint pk_gio_dung primary key (ma_gio),
    constraint ck_gio_dung_trang_thai check (trang_thai in ('Trống', 'Đầy'))
);

-- ---------------------------------------------------------------------
-- Bảng 11. phuong_thuc_thanh_toan – Phương thức thanh toán
-- ---------------------------------------------------------------------
create table public.phuong_thuc_thanh_toan (
    ma_pttt   char(10)     not null,
    ten_pttt  varchar(50)  not null,
    constraint pk_phuong_thuc_thanh_toan primary key (ma_pttt)
);

-- ---------------------------------------------------------------------
-- Bảng 13. cong_no_khach_si – Công nợ khách sỉ
-- ---------------------------------------------------------------------
create table public.cong_no_khach_si (
    ma_cong_no          char(10)     not null,
    ma_khach_hang       char(10)     not null,            -- [+] khách sỉ nợ
    ngay_bat_dau_ky     timestamp(0) not null,
    han_thanh_toan      timestamp(0) not null,
    thoi_gian_thanh_toan timestamp(0),
    ma_pttt             char(10),                         -- [+] phương thức đã dùng để tất toán
    trang_thai_cong_no  varchar(30)  not null default 'Chờ thanh toán',
    constraint pk_cong_no_khach_si primary key (ma_cong_no),
    constraint fk_cong_no_khach_hang foreign key (ma_khach_hang) references public.khach_hang (ma_khach_hang),
    constraint fk_cong_no_pttt foreign key (ma_pttt) references public.phuong_thuc_thanh_toan (ma_pttt),
    constraint ck_cong_no_han check (han_thanh_toan >= ngay_bat_dau_ky),
    constraint ck_cong_no_trang_thai check (trang_thai_cong_no in ('Chờ thanh toán', 'Đã thanh toán'))
);

-- ---------------------------------------------------------------------
-- Bảng 8. don_hang – Đơn hàng
-- ---------------------------------------------------------------------
create table public.don_hang (
    ma_don_hang   char(10)      not null,
    ma_khach_hang char(10)      not null,
    ma_gio        char(3),                                  -- [~] cho phép rỗng: đơn đã giao/đã hủy không còn giữ giỏ
    ten_dang_nhap varchar(50)   not null,
    ma_cua_tiem   char(5)       not null,
    ma_cong_no    char(10),
    ma_pttt       char(10),                                 -- [~] chỉ có khi đã thanh toán
    ngay_tao_don  timestamp(0)  not null default public.vn_now(),
    ngay_nhan     date,
    gio_nhan      time(0),
    trang_thai    varchar(30)   not null,
    giam_gia      numeric(12,2) default 0,
    phu_thu       numeric(12,2) default 0,
    ghi_chu       varchar(100),
    dang_xu_ly    boolean       not null default false,     -- [+] đơn đã thanh toán nhưng vẫn đang xử lý (giữ giỏ)
    da_in         smallint      not null default 0,         -- [+] số lần đã in hóa đơn (0 = chưa in)
    thoi_gian_thanh_toan timestamp(0),                      -- [+] thời điểm thanh toán đơn
    thoi_gian_xac_nhan   timestamp(0),                      -- [+] thời điểm nhân viên xác nhận đơn online
    constraint pk_don_hang primary key (ma_don_hang),
    constraint fk_don_hang_khach_hang foreign key (ma_khach_hang) references public.khach_hang (ma_khach_hang),
    constraint fk_don_hang_gio_dung   foreign key (ma_gio)        references public.gio_dung (ma_gio),
    constraint fk_don_hang_tai_khoan foreign key (ten_dang_nhap) references public.tai_khoan (ten_dang_nhap) on update cascade,
    constraint fk_don_hang_cua_tiem   foreign key (ma_cua_tiem)   references public.cua_tiem (ma_cua_tiem),
    constraint fk_don_hang_cong_no    foreign key (ma_cong_no)    references public.cong_no_khach_si (ma_cong_no),
    constraint fk_don_hang_pttt       foreign key (ma_pttt)       references public.phuong_thuc_thanh_toan (ma_pttt),
    constraint ck_don_hang_ngay_nhan  check (ngay_nhan is null or ngay_nhan >= ngay_tao_don::date),
    constraint ck_don_hang_trang_thai check (trang_thai in ('Chờ xác nhận', 'Đang xử lý', 'Đã giao', 'Chờ thanh toán', 'Đã thanh toán', 'Đã hủy')),  -- [+] 'Đã hủy'
    constraint ck_don_hang_giam_gia   check (giam_gia >= 0),
    constraint ck_don_hang_phu_thu    check (phu_thu >= 0)
);

-- ---------------------------------------------------------------------
-- Bảng 9. don_hang_online – Đơn hàng online
-- ---------------------------------------------------------------------
create table public.don_hang_online (
    ma_don_hang      char(10)  not null,
    hinh_anh_gio_dung text[]   not null,                    -- [~] 1-3 đường dẫn ảnh (Supabase Storage), thay cho 1 URL
    constraint pk_don_hang_online primary key (ma_don_hang),
    constraint fk_don_hang_online_don_hang foreign key (ma_don_hang) references public.don_hang (ma_don_hang) on delete cascade,
    constraint ck_don_hang_online_anh check (cardinality(hinh_anh_gio_dung) between 1 and 3)
);

-- ---------------------------------------------------------------------
-- Bảng 10. chi_tiet_don_hang – Chi tiết đơn hàng
-- ---------------------------------------------------------------------
create sequence public.seq_chi_tiet_don_hang;

create table public.chi_tiet_don_hang (
    ma_chi_tiet_dh char(10)      not null,
    ma_don_hang    char(10)      not null,
    ma_dich_vu     char(10)      not null,
    stt            smallint      not null default 1,        -- [+] thứ tự dòng trong đơn
    khoi_so_luong  numeric(8,2)  not null,
    don_gia        numeric(12,2) not null,
    constraint pk_chi_tiet_don_hang primary key (ma_chi_tiet_dh),
    constraint fk_ctdh_don_hang foreign key (ma_don_hang) references public.don_hang (ma_don_hang) on delete cascade,
    constraint fk_ctdh_dich_vu  foreign key (ma_dich_vu)  references public.dich_vu (ma_dich_vu),
    constraint ck_ctdh_khoi_so_luong check (khoi_so_luong >= 0),   -- [~] >= 0: đơn online chờ xác nhận chưa có số ký
    constraint ck_ctdh_don_gia       check (don_gia >= 0)
);

-- ---------------------------------------------------------------------
-- Bảng 12. hoa_don – Hóa đơn
-- ---------------------------------------------------------------------
create table public.hoa_don (
    ma_hoa_don          char(10)     not null,
    ma_don_hang         char(10)     not null,
    thoi_gian_in        timestamp(0) not null,
    thoi_gian_thanh_toan timestamp(0),
    constraint pk_hoa_don primary key (ma_hoa_don),
    constraint uq_hoa_don_don_hang unique (ma_don_hang),                    -- quan hệ 1 – 1 với don_hang (theo ERD)
    constraint fk_hoa_don_don_hang foreign key (ma_don_hang) references public.don_hang (ma_don_hang) on delete cascade
);

-- ---------------------------------------------------------------------
-- Bảng 14. chi_phi – Chi phí
-- ---------------------------------------------------------------------
create table public.chi_phi (
    ma_chi_phi   char(10)      not null,
    ten_chi_phi  varchar(50)   not null,
    tong_tien    numeric(12,2) not null,
    ngay_tao     timestamp(0)  not null default public.vn_now(),
    constraint pk_chi_phi primary key (ma_chi_phi),
    constraint ck_chi_phi_tong_tien check (tong_tien > 0)
);

-- ---------------------------------------------------------------------
-- [+] he_thong – số phiên bản dữ liệu (rev) và bộ đếm mã (seq)
--   rev tăng 1 sau mỗi lần ghi thành công -> giao diện hỏi định kỳ để biết có đơn online mới.
--   seq giữ số lớn nhất đã cấp cho từng tiền tố mã (DH, KH, ...) để mã đã xóa không bị dùng lại.
-- ---------------------------------------------------------------------
create table public.he_thong (
    khoa     text  not null,
    gia_tri  jsonb not null,
    constraint pk_he_thong primary key (khoa)
);
insert into public.he_thong (khoa, gia_tri) values ('rev', '0'::jsonb), ('seq', '{}'::jsonb),
    ('chu_tiem', '{"name":"","phone":""}'::jsonb),            -- họ tên + SĐT hiển thị của người dùng duy nhất
    ('dang_nhap_sai', '{"sai":0,"den":null}'::jsonb);         -- số lần sai liên tiếp + thời điểm hết khóa

-- ---------------------------------------------------------------------
-- Chỉ mục hỗ trợ truy vấn thường dùng
-- ---------------------------------------------------------------------
create index ix_khach_hang_loai       on public.khach_hang (ma_loai_kh);
create index ix_dich_vu_loai          on public.dich_vu (ma_loai_dv);
create index ix_cong_no_khach_hang    on public.cong_no_khach_si (ma_khach_hang);
create index ix_don_hang_khach_hang   on public.don_hang (ma_khach_hang);
create index ix_don_hang_gio          on public.don_hang (ma_gio) where ma_gio is not null;
create index ix_don_hang_cong_no      on public.don_hang (ma_cong_no) where ma_cong_no is not null;
create index ix_don_hang_trang_thai   on public.don_hang (trang_thai, ngay_tao_don);
create index ix_don_hang_ngay_tao     on public.don_hang (ngay_tao_don);
create index ix_ctdh_don_hang         on public.chi_tiet_don_hang (ma_don_hang, stt);
create index ix_ctdh_dich_vu          on public.chi_tiet_don_hang (ma_dich_vu);
create index ix_chi_phi_ngay_tao      on public.chi_phi (ngay_tao);
-- =====================================================================
-- CHERRY LAUNDRY – 002: TÀI KHOẢN & ĐĂNG NHẬP (không dùng Supabase Auth, chỉ có MỘT người dùng nên không phân quyền)
--   • Mật khẩu lưu trong tai_khoan.mat_khau dưới dạng mã băm bcrypt (pgcrypto), không lưu chữ thường.
--   • Trình duyệt KHÔNG nói chuyện trực tiếp với Supabase. Chỉ các hàm api/ (Vercel) gọi database bằng
--     service_role key và truyền tên đăng nhập (p_user) đã xác thực bằng token phiên của ứng dụng.
--     Các hàm cổng chỉ cấp quyền thực thi cho service_role -> không ai tự khai p_user từ bên ngoài được.
--   • Chống dò mật khẩu: sai 5 lần liên tiếp -> khóa đăng nhập 15 phút (bộ đếm ở he_thong, khóa 'dang_nhap_sai').
-- =====================================================================

create or replace function public.cur_user() returns text
language sql stable as $$ select nullif(current_setting('app.user', true), '') $$;

create or replace function public.set_user(p_user text) returns void
language plpgsql as $$
begin
    perform set_config('app.user', lower(trim(coalesce(p_user, ''))), true);
end $$;

-- Tên đăng nhập hiện tại nếu tài khoản còn tồn tại, ngược lại NULL
create or replace function public.auth_username() returns text
language sql stable security definer set search_path = public as $$
    select ten_dang_nhap::text from public.tai_khoan where ten_dang_nhap = public.cur_user()
$$;

-- Thông tin hiển thị của người dùng hiện tại
create or replace function public.me() returns jsonb
language sql stable security definer set search_path = public as $$
    select jsonb_build_object(
        'user',  t.ten_dang_nhap,
        'name',  coalesce(nullif(g ->> 'name', ''), t.ten_dang_nhap),
        'phone', coalesce(g ->> 'phone', ''))
    from public.tai_khoan t
    left join lateral (select gia_tri as g from public.he_thong where khoa = 'chu_tiem') h on true
    where t.ten_dang_nhap = public.cur_user()
$$;

-- Mật khẩu hợp lệ: 8–72 ký tự, có chữ và số
create or replace function public._pw_ok(p text) returns boolean
language sql immutable as $$ select coalesce(length(p) >= 8 and length(p) <= 72 and p ~ '[A-Za-z]' and p ~ '[0-9]', false) $$;

-- ---------------------------------------------------------------------
-- Tạo tài khoản – chạy trong SQL Editor (quyền quản trị). KHÔNG cấp cho service_role/anon.
--   select tao_tai_khoan('kimvui', 'MatKhau123');
-- ---------------------------------------------------------------------
create or replace function public.tao_tai_khoan(p_ten text, p_mat_khau text)
returns void language plpgsql security definer set search_path = public as $$
begin
    p_ten := lower(trim(p_ten));
    if not public._pw_ok(p_mat_khau) then
        raise exception 'Mật khẩu phải từ 8 ký tự, có cả chữ và số';
    end if;
    insert into public.tai_khoan (ten_dang_nhap, mat_khau) values (p_ten, extensions.crypt(p_mat_khau, extensions.gen_salt('bf', 10)));
end $$;

-- Đặt lại mật khẩu (khi quên): select dat_lai_mat_khau('kimvui', 'MatKhauMoi1');  -- đồng thời mở khóa đăng nhập
create or replace function public.dat_lai_mat_khau(p_ten text, p_mat_khau text) returns void
language plpgsql security definer set search_path = public as $$
begin
    if not public._pw_ok(p_mat_khau) then
        raise exception 'Mật khẩu phải từ 8 ký tự, có cả chữ và số';
    end if;
    update public.tai_khoan set mat_khau = extensions.crypt(p_mat_khau, extensions.gen_salt('bf', 10)) where ten_dang_nhap = lower(trim(p_ten));
    update public.he_thong set gia_tri = '{"sai":0,"den":null}'::jsonb where khoa = 'dang_nhap_sai';
end $$;

-- ---------------------------------------------------------------------
-- Đăng nhập. Trả jsonb { ok, locked, user, name, phone }.
-- KHÔNG ném lỗi khi sai mật khẩu (để bộ đếm sai vẫn được ghi lại). Sai 5 lần liên tiếp -> khóa 15 phút.
-- Bộ đếm tính chung (kể cả khi gõ sai tên đăng nhập) để không dò được tên tài khoản.
-- ---------------------------------------------------------------------
create or replace function public._check_password(p_user text, p_pass text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tai_khoan%rowtype; l jsonb; n int; den timestamp; good boolean;
begin
    p_user := lower(trim(coalesce(p_user, '')));
    select gia_tri into l from he_thong where khoa = 'dang_nhap_sai' for update;
    n   := coalesce((l ->> 'sai')::int, 0);
    den := nullif(l ->> 'den', '')::timestamp;
    if den is not null and den > vn_now() then
        return jsonb_build_object('ok', false, 'locked', true);
    end if;

    select * into t from tai_khoan where ten_dang_nhap = p_user;
    if t.ten_dang_nhap is null then
        perform extensions.crypt(coalesce(p_pass, ''), extensions.gen_salt('bf', 10));   -- giữ thời gian xử lý tương đương
        good := false;
    else
        good := t.mat_khau = extensions.crypt(coalesce(p_pass, ''), t.mat_khau);
    end if;

    if good then
        if n <> 0 or den is not null then
            update he_thong set gia_tri = '{"sai":0,"den":null}'::jsonb where khoa = 'dang_nhap_sai';
        end if;
        return jsonb_build_object('ok', true, 'locked', false);
    end if;

    if n >= 4 then
        update he_thong set gia_tri = jsonb_build_object('sai', 0, 'den', to_char(vn_now() + interval '15 minutes', 'YYYY-MM-DD"T"HH24:MI:SS'))
         where khoa = 'dang_nhap_sai';
        return jsonb_build_object('ok', false, 'locked', true);
    end if;
    update he_thong set gia_tri = jsonb_build_object('sai', n + 1, 'den', null) where khoa = 'dang_nhap_sai';
    return jsonb_build_object('ok', false, 'locked', false);
end $$;

create or replace function public.dang_nhap(p_user text, p_pass text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
    r := public._check_password(p_user, p_pass);
    if (r ->> 'ok')::boolean then
        perform public.set_user(p_user);
        return r || public.me();
    end if;
    return r;
end $$;

-- Kiểm tra mật khẩu hiện tại (màn hình đổi mật khẩu)
create or replace function public.kiem_tra_mat_khau(p_user text, p_pass text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
    return public._check_password(p_user, p_pass);
end $$;

-- Đổi mật khẩu. Trả { ok } hoặc { ok:false, reason: 'old' | 'weak' | 'locked' }
create or replace function public.doi_mat_khau(p_user text, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
    p_user := lower(trim(coalesce(p_user, '')));
    if not public._pw_ok(p_new) then
        return jsonb_build_object('ok', false, 'reason', 'weak');
    end if;
    r := public._check_password(p_user, p_old);
    if not (r ->> 'ok')::boolean then
        return jsonb_build_object('ok', false, 'reason', case when (r ->> 'locked')::boolean then 'locked' else 'old' end);
    end if;
    update tai_khoan set mat_khau = extensions.crypt(p_new, extensions.gen_salt('bf', 10)) where ten_dang_nhap = p_user;
    return jsonb_build_object('ok', true);
end $$;

-- Các hàm đăng nhập / mật khẩu chỉ cho máy chủ api/ (service_role) gọi
revoke all on function public.dang_nhap(text, text), public.kiem_tra_mat_khau(text, text), public.doi_mat_khau(text, text, text) from public, anon, authenticated;
grant execute on function public.dang_nhap(text, text), public.kiem_tra_mat_khau(text, text), public.doi_mat_khau(text, text, text) to service_role;
revoke all on function public.tao_tai_khoan(text, text), public.dat_lai_mat_khau(text, text) from public, anon, authenticated, service_role;
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
-- =====================================================================
-- CHERRY LAUNDRY – 006: NHẬP DỮ LIỆU CŨ
-- import_legacy_state(p_state, p_wipe)
--   p_state: file trạng thái của bản cũ (Flask+SQLite / JSON): { shops, custTypes, customers, svcTypes, services,
--            baskets, pays, expenses, orders, debts, seq, ... }  (khóa "account" bị bỏ qua – tài khoản nằm ở bảng tai_khoan)
--   p_wipe : true  -> xóa SẠCH dữ liệu nghiệp vụ hiện có (kể cả danh mục do seed.sql tạo) rồi nạp
--            false -> chỉ nạp thêm; trùng mã sẽ báo lỗi 409 và không nạp gì
-- Cần tài khoản đăng nhập hợp lệ. Toàn bộ chạy trong MỘT giao dịch: lỗi ở đâu thì hoàn tác tất cả.
-- Các luật nghiệp vụ (mã, giá, giỏ, trạng thái...) áp dụng y như khi nhập tay qua ứng dụng.
-- Người tạo đơn: tài khoản đang chạy import.
-- =====================================================================
create or replace function public.import_legacy_state(p_user text, p_state jsonb, p_wipe boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_coll text; v_changes jsonb := '{}'::jsonb; v_res jsonb; v_n jsonb := '{}'::jsonb; v_arr jsonb;
    colls text[] := array['shops','custTypes','customers','svcTypes','services','baskets','pays','expenses','debts','orders'];
begin
    perform public.set_user(p_user);
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập' using errcode = 'PT401';
    end if;
    if jsonb_typeof(p_state) is distinct from 'object' then
        raise exception 'Tệp dữ liệu không hợp lệ' using errcode = 'PT422';
    end if;

    perform 1 from he_thong where khoa = 'rev' for update;

    if p_wipe then
        delete from hoa_don;  delete from don_hang_online; delete from chi_tiet_don_hang; delete from don_hang;
        delete from cong_no_khach_si; delete from chi_phi; delete from khach_hang; delete from dich_vu;
        delete from gio_dung; delete from phuong_thuc_thanh_toan; delete from loai_khach_hang; delete from loai_dich_vu; delete from cua_tiem;
        alter sequence seq_chi_tiet_don_hang restart;
        alter sequence seq_hoa_don restart;
        update he_thong set gia_tri = '{}'::jsonb where khoa = 'seq';
    end if;

    foreach v_coll in array colls loop
        v_arr := coalesce(p_state -> v_coll, '[]'::jsonb);
        if jsonb_typeof(v_arr) is distinct from 'array' then
            raise exception '"%" phải là một mảng', v_coll using errcode = 'PT422';
        end if;
        if jsonb_array_length(v_arr) > 0 then
            v_changes := v_changes || jsonb_build_object(v_coll, jsonb_build_object('upsert',
                (select jsonb_agg(jsonb_build_object('doc', d, 'new', true)) from jsonb_array_elements(v_arr) d)));
            v_n := v_n || jsonb_build_object(v_coll, jsonb_array_length(v_arr));
        end if;
    end loop;

    v_res := public.apply_changes(p_user, v_changes, coalesce(p_state -> 'seq', '{}'::jsonb));

    return jsonb_build_object('ok', true, 'imported', v_n, 'rev', v_res -> 'rev');
end $$;

revoke all on function public.import_legacy_state(text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.import_legacy_state(text, jsonb, boolean) to service_role;
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
    if v_phone !~ '^(\+[0-9]{1,4} )?0?[0-9]{1,20}$' then raise exception 'Số điện thoại không hợp lệ' using errcode = 'PT422'; end if;
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
    if v_phone !~ '^(\+[0-9]{1,4} )?0?[0-9]{1,20}$' then raise exception 'Số điện thoại không hợp lệ' using errcode = 'PT422'; end if;
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
