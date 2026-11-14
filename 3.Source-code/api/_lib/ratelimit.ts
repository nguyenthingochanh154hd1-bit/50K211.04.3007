import { ApiError } from './supabase.js';

/* Giới hạn tần suất theo địa chỉ IP, lưu trong bộ nhớ của từng instance Vercel (giải pháp "cố gắng", không chia sẻ giữa các instance).
 * Giới hạn thật nằm trong database (mỗi số điện thoại tối đa 3 đơn chờ xác nhận, toàn tiệm tối đa 30 đơn chờ) – xem 007. */
const hits = new Map<string, number[]>();

export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for') || '';
  return (xff.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

export function limit(request: Request, bucket: string, max: number, windowSec: number): void {
  const k = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowSec * 1000);
  if (arr.length >= max) throw new ApiError(429, 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút');
  arr.push(now);
  hits.set(k, arr);
  if (hits.size > 5000) for (const [kk, v] of hits) if (!v.some((t) => now - t < windowSec * 1000)) hits.delete(kk);
}
