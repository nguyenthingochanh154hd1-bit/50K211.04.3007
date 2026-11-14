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
