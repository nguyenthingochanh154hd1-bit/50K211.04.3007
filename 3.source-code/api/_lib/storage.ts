import { ApiError, config, headers } from './supabase.js';

/* Ảnh giỏ đựng của đơn online: Supabase Storage, bucket RIÊNG TƯ "basket-photos" (tạo trong 007_online_orders.sql).
 * Chỉ máy chủ api/ (service_role) đọc/ghi được; trình duyệt chỉ nhận đường dẫn tạm có chữ ký (hết hạn sau vài phút). */
export const BUCKET = 'basket-photos';
export const SIGN_SECONDS = 600;

const objUrl = (path: string) => {
  const { url } = config();
  return `${url}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
};

export async function uploadJpeg(path: string, bytes: Uint8Array): Promise<void> {
  const { key } = config();
  let res: Response;
  try {
    res = await fetch(objUrl(path), { method: 'POST', headers: { ...headers(key), 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }, body: bytes as any });
  } catch {
    throw new ApiError(502, 'Không lưu được ảnh, vui lòng thử lại');
  }
  if (!res.ok) throw new ApiError(502, 'Không lưu được ảnh (kiểm tra bucket "basket-photos" trong Supabase Storage)');
}

/* Xóa ảnh (dùng khi đơn không tạo được). Lỗi bị bỏ qua: chỉ là dọn dẹp. */
export async function removeObjects(paths: string[]): Promise<void> {
  if (!paths.length) return;
  try {
    const { url, key } = config();
    await fetch(`${url}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: headers(key), body: JSON.stringify({ prefixes: paths }) });
  } catch { /* bỏ qua */ }
}

/* Đường dẫn tạm có chữ ký cho từng ảnh; ảnh nào lỗi thì bị bỏ (trả chuỗi rỗng) */
export async function signedUrls(paths: string[]): Promise<string[]> {
  const { url, key } = config();
  return Promise.all(paths.map(async (p) => {
    try {
      const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`,
        { method: 'POST', headers: headers(key), body: JSON.stringify({ expiresIn: SIGN_SECONDS }) });
      if (!res.ok) return '';
      const j: any = await res.json();
      const s: string = j.signedURL || j.signedUrl || '';
      if (!s) return '';
      return s.startsWith('http') ? s : s.startsWith('/storage/v1') ? `${url}${s}` : `${url}/storage/v1${s}`;
    } catch {
      return '';
    }
  }));
}
