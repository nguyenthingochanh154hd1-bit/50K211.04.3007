import { ApiError } from './supabase.js';

const HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

/* Chuyển mọi lỗi thành phản hồi JSON { error } với mã HTTP đúng */
export function fail(err: unknown): Response {
  if (err instanceof ApiError) return json({ error: err.message, code: err.code }, err.status);
  return json({ error: 'Lỗi máy chủ' }, 500);
}

export const MAX_BODY = 2 * 1024 * 1024; // 2 MB

export async function readJson(request: Request, max = MAX_BODY): Promise<any> {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > max) throw new ApiError(413, 'Dữ liệu gửi lên quá lớn');
  const text = await request.text();
  if (text.length > max) throw new ApiError(413, 'Dữ liệu gửi lên quá lớn');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(422, 'Nội dung gửi lên không phải JSON hợp lệ');
  }
}

export function methodNotAllowed(allow: string): Response {
  return new Response(JSON.stringify({ error: 'Phương thức không được hỗ trợ' }), { status: 405, headers: { ...HEADERS, Allow: allow } });
}
