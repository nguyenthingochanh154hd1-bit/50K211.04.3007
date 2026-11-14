import { fail, json, readJson } from './_lib/http.js';
import { signSession } from './_lib/session.js';
import { ApiError, rpc } from './_lib/supabase.js';

/* POST /api/login { username, password } -> { token, account }
 * Database kiểm tra mật khẩu (bcrypt) và đếm số lần sai: sai 5 lần liên tiếp khóa tài khoản 15 phút.
 * Token trả về dùng cho mọi lời gọi /api/* khác: "Authorization: Bearer <token>". */
export async function POST(request: Request): Promise<Response> {
  try {
    const b = await readJson(request);
    const username = typeof b.username === 'string' ? b.username.trim() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    if (!username || !password || username.length > 50 || password.length > 100) {
      throw new ApiError(401, 'Sai tên đăng nhập hoặc mật khẩu');
    }
    const r = await rpc<{ ok: boolean; locked?: boolean; user?: string; name?: string; phone?: string }>(
      'dang_nhap', { p_user: username, p_pass: password });
    if (!r.ok) {
      if (r.locked) throw new ApiError(429, 'Tài khoản tạm khóa 15 phút do nhập sai nhiều lần');
      throw new ApiError(401, 'Sai tên đăng nhập hoặc mật khẩu');
    }
    const token = await signSession(r.user as string);
    return json({ token, account: { user: r.user, name: r.name, phone: r.phone } });
  } catch (e) {
    return fail(e);
  }
}
