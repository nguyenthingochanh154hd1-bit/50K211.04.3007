import { fail, json } from './_lib/http.js';
import { authUser } from './_lib/session.js';
import { ApiError, rpc } from './_lib/supabase.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9]{0,12}$/;
const OT = new Set(['all', 'online', 'offline']);

/* GET /api/reports?kind=revenue|profit|debt|reconcile&from=YYYY-MM-DD&to=YYYY-MM-DD&...
 * Báo cáo tính trong database; chỉ chủ tiệm (owner) xem được – nhân viên nhận 403 từ database. */
export async function GET(request: Request): Promise<Response> {
  try {
    const user = await authUser(request);
    const q = new URL(request.url).searchParams;
    const from = q.get('from') || '';
    const to = q.get('to') || '';
    if (!DATE.test(from) || !DATE.test(to)) throw new ApiError(422, 'Ngày không hợp lệ (định dạng YYYY-MM-DD)');
    if (from > to) throw new ApiError(422, 'Từ ngày phải trước hoặc bằng đến ngày');
    const type = q.get('type') || '';
    const svc = q.get('svc') || '';
    const cust = q.get('cust') || '';
    const ot = q.get('ot') || 'all';
    if (!ID.test(type) || !ID.test(svc) || !ID.test(cust)) throw new ApiError(422, 'Bộ lọc không hợp lệ');
    if (!OT.has(ot)) throw new ApiError(422, 'Loại đơn không hợp lệ');

    switch (q.get('kind')) {
      case 'revenue':
        return json(await rpc('report_revenue', { p_user: user, p_from: from, p_to: to, p_type: type, p_svc: svc, p_ot: ot }));
      case 'profit':
        return json(await rpc('report_profit', { p_user: user, p_from: from, p_to: to, p_ot: ot }));
      case 'debt':
        return json(await rpc('report_debt', { p_user: user, p_from: from, p_to: to, p_type: type, p_cust: cust, p_svc: svc }));
      case 'reconcile':
        return json(await rpc('report_reconcile', { p_user: user, p_from: from, p_to: to }));
      default:
        throw new ApiError(422, 'Loại báo cáo không hợp lệ');
    }
  } catch (e) {
    return fail(e);
  }
}
