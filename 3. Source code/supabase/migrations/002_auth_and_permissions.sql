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
