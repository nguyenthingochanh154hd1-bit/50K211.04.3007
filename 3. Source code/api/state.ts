import { fail, json } from './_lib/http.js';
import { authUser } from './_lib/session.js';
import { signedUrls } from './_lib/storage.js';
import { rpc } from './_lib/supabase.js';

/* GET /api/state        -> { state, rev }  toàn bộ dữ liệu theo quyền của người dùng (hồ sơ, quyền, danh mục, đơn, công nợ...)
 * GET /api/state?photos=DH00000001 -> { urls }  đường dẫn ảnh giỏ (có chữ ký, hết hạn sau 10 phút) của một đơn online
 * GET /api/state?rev=1  -> { rev }          chỉ số phiên bản dữ liệu, giao diện hỏi định kỳ để biết có thay đổi (đơn online mới...) */
export async function GET(request: Request): Promise<Response> {
  try {
    const user = await authUser(request);
    const orderId = new URL(request.url).searchParams.get('photos');
    if (orderId) {
      const paths = await rpc<string[]>('order_photos', { p_user: user, p_order: orderId.slice(0, 10) });
      return json({ urls: await signedUrls(paths || []) });
    }
    if (new URL(request.url).searchParams.get('rev')) {
      return json({ rev: await rpc<number>('get_rev', { p_user: user }) });
    }
    const state = await rpc<{ rev: number }>('get_state', { p_user: user });
    return json({ state, rev: state.rev });
  } catch (e) {
    return fail(e);
  }
}
