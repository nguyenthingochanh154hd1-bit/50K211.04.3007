import { ApiError } from './supabase.js';

/* Token phiên của ứng dụng: JWT HS256 tự ký bằng SESSION_SECRET (chuỗi ngẫu nhiên >= 32 ký tự, chỉ nằm trên Vercel).
 * Nội dung: { sub: tên đăng nhập, iat, exp }. Quyền thật (vai trò, khóa tài khoản) luôn được database kiểm tra lại ở mỗi lời gọi. */

const env: Record<string, string | undefined> = (globalThis as any).process?.env ?? {};
const enc = new TextEncoder();
export const SESSION_TTL = 12 * 60 * 60; // 12 giờ

function b64u(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64u(s: string): Uint8Array {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(p);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const utf8 = (o: unknown): string => b64u(enc.encode(JSON.stringify(o)));

async function hmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const secret = env.SESSION_SECRET || '';
  if (secret.length < 32) throw new ApiError(500, 'Máy chủ chưa cấu hình SESSION_SECRET (>= 32 ký tự)');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function signSession(user: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const data = `${utf8({ alg: 'HS256', typ: 'JWT' })}.${utf8({ sub: user, iat: now, exp: now + SESSION_TTL })}`;
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey('sign'), enc.encode(data)));
  return `${data}.${b64u(sig)}`;
}

/* Trả tên đăng nhập nếu token hợp lệ và chưa hết hạn, ngược lại null (kiểm tra chữ ký theo thời gian hằng định) */
export async function verifySession(token: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey('verify'), fromB64u(parts[2]) as BufferSource, enc.encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64u(parts[1])));
    if (typeof p.sub !== 'string' || typeof p.exp !== 'number' || p.exp < Date.now() / 1000) return null;
    return p.sub;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return null;
  }
}

/* Lấy người dùng từ header "Authorization: Bearer <token>" */
export async function authUser(request: Request): Promise<string> {
  const m = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec((request.headers.get('authorization') || '').trim());
  const user = m ? await verifySession(m[1]) : null;
  if (!user) throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  return user;
}
