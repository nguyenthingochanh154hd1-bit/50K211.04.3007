import { fail, json, methodNotAllowed, readJson } from './http.js';
import { authUser } from './session.js';
import { ApiError, rpc } from './supabase.js';

export type Collection =
  | 'shops' | 'custTypes' | 'customers' | 'svcTypes' | 'services'
  | 'baskets' | 'pays' | 'expenses' | 'orders' | 'debts';

/* Mỗi file trong api/ khai báo nhóm bộ dữ liệu (collections) mà nó được phép ghi:
 *   GET  -> trả danh sách các bộ đó (lọc theo quyền xem của người dùng, do database quyết định)
 *   POST -> { changes: { <bộ>: { upsert:[{doc,new}], delete:[id] } }, seq } -> gọi apply_changes (nguyên tử) */
export function createResource(name: string, allowed: Collection[]) {
  const set = new Set<string>(allowed);

  async function GET(request: Request): Promise<Response> {
    try {
      const user = await authUser(request);
      const only = new URL(request.url).searchParams.get('resource');
      if (only && !set.has(only)) throw new ApiError(422, `Bộ dữ liệu "${only}" không thuộc /api/${name}`);
      const state = await rpc<Record<string, unknown>>('get_state', { p_user: user });
      const out: Record<string, unknown> = { rev: state.rev };
      for (const c of only ? [only] : allowed) out[c] = state[c] ?? [];
      return json(out);
    } catch (e) {
      return fail(e);
    }
  }

  async function POST(request: Request): Promise<Response> {
    try {
      const user = await authUser(request);
      const body = await readJson(request);
      const changes = body && body.changes;
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
        throw new ApiError(422, 'Thiếu "changes"');
      }
      const keys = Object.keys(changes);
      if (!keys.length) throw new ApiError(422, 'Không có thay đổi nào');
      for (const k of keys) {
        if (!set.has(k)) throw new ApiError(422, `Bộ dữ liệu "${k}" không được ghi qua /api/${name}`);
        const c = changes[k];
        if (!c || typeof c !== 'object' || (c.upsert && !Array.isArray(c.upsert)) || (c.delete && !Array.isArray(c.delete))) {
          throw new ApiError(422, `Thay đổi của "${k}" không hợp lệ`);
        }
      }
      const seq = body.seq && typeof body.seq === 'object' && !Array.isArray(body.seq) ? body.seq : {};
      const r = await rpc<{ ok: boolean; rev: number }>('apply_changes', { p_user: user, p_changes: changes, p_seq: seq });
      return json({ ok: true, rev: r.rev });
    } catch (e) {
      return fail(e);
    }
  }

  return { GET, POST, methodNotAllowed };
}
