import { fail, json, readJson } from './_lib/http.js';
import { limit } from './_lib/ratelimit.js';
import { removeObjects, signedUrls, uploadJpeg } from './_lib/storage.js';
import { ApiError, rpc } from './_lib/supabase.js';

/* API CÔNG KHAI của trang đặt đơn online (/online) – khách không đăng nhập.
 *   GET  /api/online                      -> { shop, svcTypes, services, baskets:[{id,full}] }
 *   POST /api/online { op:'create', ... } -> { id, createdAt, status }   tạo đơn "Chờ xác nhận"
 *   POST /api/online { op:'lookup', phone } -> { found, wholesale, orders:[...] }   tra cứu đơn theo số điện thoại
 * Mọi luật nghiệp vụ (giỏ trống, khách lẻ, giới hạn số đơn chờ...) do database kiểm tra trong 007_online_orders.sql. */

const MAX_PHOTO_BYTES = 600 * 1024;       // ảnh đã được trình duyệt nén (~50–150 KB); trần để chặn lạm dụng
const MAX_BODY = 3 * 1024 * 1024;         // 3 ảnh base64 + dữ liệu form

function decodeJpeg(dataUrl: unknown): Uint8Array {
  if (typeof dataUrl !== 'string') throw new ApiError(422, 'Ảnh không hợp lệ');
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m) throw new ApiError(422, 'Ảnh phải ở định dạng JPG hoặc PNG');
  let bin: string;
  try { bin = atob(m[1]); } catch { throw new ApiError(422, 'Ảnh không hợp lệ'); }
  if (bin.length > MAX_PHOTO_BYTES) throw new ApiError(422, 'Dung lượng ảnh quá lớn');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (out.length < 4 || out[0] !== 0xff || out[1] !== 0xd8 || out[2] !== 0xff) throw new ApiError(422, 'Ảnh không hợp lệ');
  return out;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET(request: Request): Promise<Response> {
  try {
    limit(request, 'catalog', 120, 600);
    const r = await rpc<Record<string, unknown>>('online_catalog', {});
    const res = json(r);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const b = await readJson(request, MAX_BODY);
    if (b.op === 'lookup') {
      limit(request, 'lookup', 30, 600);
      const phone = str(b.phone, 25);
      if (!/^(\+[0-9]{1,4} )?0?[0-9]{1,20}$/.test(phone)) throw new ApiError(422, 'Số điện thoại không hợp lệ');
      const r = await rpc<any>('online_lookup', { p_phone: phone });
      if (r && Array.isArray(r.orders)) {
        for (const o of r.orders) {
          o.photoUrls = o.status === 'Đã hủy' ? [] : await signedUrls(Array.isArray(o.photos) ? o.photos : []);
          delete o.photos;
        }
      }
      return json(r);
    }
    if (b.op !== 'create') throw new ApiError(422, 'Yêu cầu không hợp lệ');

    limit(request, 'create', 10, 600);
    const phone = str(b.phone, 25);
    if (!str(b.name, 50)) throw new ApiError(422, 'Vui lòng nhập tên khách hàng');
    if (!/^(\+[0-9]{1,4} )?0?[0-9]{1,20}$/.test(phone)) throw new ApiError(422, 'Số điện thoại không hợp lệ');
    if (!Array.isArray(b.services) || b.services.length < 1 || b.services.length > 10 || b.services.some((x: unknown) => typeof x !== 'string')) {
      throw new ApiError(422, 'Vui lòng chọn dịch vụ');
    }
    if (!Array.isArray(b.photos) || b.photos.length < 1 || b.photos.length > 3) throw new ApiError(422, 'Cần từ 1 đến 3 ảnh giỏ đựng');
    const images: Uint8Array[] = b.photos.map((x: unknown) => decodeJpeg(x));

    const folder = crypto.randomUUID();
    const paths: string[] = images.map((_img: Uint8Array, i: number) => `${folder}/${i + 1}.jpg`);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) { await uploadJpeg(paths[i], images[i]); uploaded.push(paths[i]); }
      const r = await rpc<{ id: string; createdAt: string; status: string }>('online_create_order', {
        p: { name: str(b.name, 50), phone, addr: str(b.addr, 100), note: str(b.note, 100), services: b.services, basket: str(b.basket, 3), photos: paths }
      });
      return json({ id: r.id, createdAt: r.createdAt, status: r.status }, 201);
    } catch (e) {
      await removeObjects(uploaded);
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}
