/* Kiểm tra sống: GET /api/health  (không cần đăng nhập, không trả thông tin nhạy cảm) */
const env: Record<string, string | undefined> = (globalThis as any).process?.env ?? {};

export async function GET(): Promise<Response> {
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const configured = !!(url && key && (env.SESSION_SECRET || '').length >= 32);
  let db: 'up' | 'down' | 'unconfigured' = 'unconfigured';
  if (url && key) {
    try {
      const h: Record<string, string> = { apikey: key };
      if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
      const r = await fetch(`${url}/rest/v1/`, { headers: h, signal: AbortSignal.timeout(4000) });
      db = r.ok ? 'up' : 'down';
    } catch {
      db = 'down';
    }
  }
  const ok = configured && db === 'up';
  return new Response(JSON.stringify({ ok, configured, db, time: new Date().toISOString() }), {
    status: ok ? 200 : 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
