import { fail, json, readJson } from './_lib/http.js';
import { authUser } from './_lib/session.js';
import { ApiError, rpc } from './_lib/supabase.js';

/* POST /api/account  (cần đăng nhập)
 *   { action: 'check',    password }            -> { ok }  kiểm tra mật khẩu hiện tại
 *   { action: 'password', old, new }            -> { ok }  đổi mật khẩu (>= 8 ký tự, có chữ và số)
 *   { name, phone }                             -> { ok, account }  đổi họ tên / số điện thoại của chính mình */
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authUser(request);
    const b = await readJson(request);

    if (b.action === 'check') {
      if (typeof b.password !== 'string' || b.password.length > 100) throw new ApiError(422, 'Mật khẩu không hợp lệ');
      const r = await rpc<{ ok: boolean; locked?: boolean }>('kiem_tra_mat_khau', { p_user: user, p_pass: b.password });
      if (r.locked) throw new ApiError(429, 'Tài khoản tạm khóa do nhập sai nhiều lần, thử lại sau 15 phút');
      return json({ ok: !!r.ok });
    }

    if (b.action === 'password') {
      if (typeof b.old !== 'string' || typeof b.new !== 'string' || b.old.length > 100 || b.new.length > 100) throw new ApiError(422, 'Mật khẩu không hợp lệ');
      const r = await rpc<{ ok: boolean; reason?: string }>('doi_mat_khau', { p_user: user, p_old: b.old, p_new: b.new });
      if (r.ok) return json({ ok: true });
      if (r.reason === 'weak') throw new ApiError(422, 'Mật khẩu mới không hợp lệ (tối thiểu 8 ký tự, gồm chữ và số)');
      if (r.reason === 'locked') throw new ApiError(429, 'Tài khoản tạm khóa do nhập sai nhiều lần, thử lại sau 15 phút');
      throw new ApiError(400, 'Mật khẩu cũ không đúng!');
    }

    if (typeof b.name !== 'string' || typeof b.phone !== 'string') throw new ApiError(422, 'Thiếu họ tên hoặc số điện thoại');
    const account = await rpc('update_profile', { p_user: user, p_name: b.name, p_phone: b.phone });
    return json({ ok: true, account });
  } catch (e) {
    return fail(e);
  }
}
