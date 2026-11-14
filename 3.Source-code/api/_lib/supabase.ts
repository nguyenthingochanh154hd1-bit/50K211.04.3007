/* Gọi các hàm SQL (RPC) của Supabase từ máy chủ.
 *
 * Mô hình bảo mật: trình duyệt KHÔNG có khóa Supabase nào. Chỉ các hàm trong api/ (chạy trên Vercel) giữ
 * SUPABASE_SERVICE_ROLE_KEY và gọi các hàm SQL; mỗi hàm SQL nhận tên người dùng (p_user) đã được xác thực bằng
 * token phiên của ứng dụng (xem session.ts) và tự kiểm tra quyền/nghiệp vụ trong database.
 * Các hàm SQL đó chỉ cấp quyền thực thi cho service_role nên khóa anon công khai không gọi được. */

const env: Record<string, string | undefined> = (globalThis as any).process?.env ?? {};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function config(): { url: string; key: string } {
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new ApiError(500, 'Máy chủ chưa được cấu hình kết nối cơ sở dữ liệu');
  return { url, key };
}

export function headers(key: string): Record<string, string> {
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  // khóa dạng JWT (service_role cũ) cần thêm Authorization; khóa dạng sb_secret_... chỉ cần apikey
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

/* Gọi một hàm trong database. Mã PT401/PT403/PT409/PT422 do hàm SQL ném ra được PostgREST đổi thành HTTP tương ứng. */
export async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { url, key } = config();
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(key), body: JSON.stringify(args) });
  } catch {
    throw new ApiError(502, 'Không kết nối được cơ sở dữ liệu');
  }
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* không phải JSON */ }
  if (res.ok) return body as T;

  const msg: string = (body && (body.message || body.error_description || body.msg)) || '';
  const code: string | undefined = body && body.code;
  if (res.status === 401 && (code === 'PT401' || /đăng nhập/.test(msg))) throw new ApiError(401, msg || 'Chưa đăng nhập', code);
  if (res.status === 401 || res.status === 403 && /^PGRST/.test(code || '')) throw new ApiError(502, 'Khóa kết nối cơ sở dữ liệu không hợp lệ (kiểm tra SUPABASE_SERVICE_ROLE_KEY)', code);
  if (res.status === 403) throw new ApiError(403, /quyền|Chỉ chủ/.test(msg) ? msg : 'Bạn không có quyền thực hiện thao tác này', code);
  if (res.status === 429) throw new ApiError(429, msg || 'Quá nhiều yêu cầu, vui lòng thử lại sau', code);
  if (res.status === 409 || res.status === 422) throw new ApiError(res.status, msg || 'Dữ liệu không hợp lệ', code);
  if (res.status === 404) throw new ApiError(502, 'Hàm trong cơ sở dữ liệu chưa được cài (chạy lại các migration)', code);
  if (res.status === 400) throw new ApiError(422, 'Yêu cầu không hợp lệ', code);
  throw new ApiError(502, 'Cơ sở dữ liệu gặp lỗi, vui lòng thử lại', code);
}
