// Máy chủ test e2e: giả lập Supabase (Auth + PostgREST) trên PostgreSQL thật + chạy các hàm api/*.ts bằng tsx + phục vụ bản build frontend.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../cherry-laundry');
const PORT = +process.env.PORT || 5099;
const SECRET = 'test-jwt-secret';
const PSQL = ['-h', '/tmp', '-p', '55432', '-U', 'pgt', '-d', 'cl', '-qtA', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
process.env.SUPABASE_URL = `http://localhost:${PORT}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
process.env.SESSION_SECRET = 'e2e-session-secret-at-least-32-characters!!';

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const sign = (p) => { const h = b64({ alg: 'HS256', typ: 'JWT' }), b = b64(p); return `${h}.${b}.${crypto.createHmac('sha256', SECRET).update(h + '.' + b).digest('base64url')}`; };
function verify(tok) {
  const [h, b, s] = (tok || '').split('.');
  if (!s || crypto.createHmac('sha256', SECRET).update(h + '.' + b).digest('base64url') !== s) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  return p.exp && p.exp < Date.now() / 1000 ? null : p;
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
function psql(sql) {
  return new Promise((resolve) => {
    const p = spawn('psql', PSQL); let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => resolve({ code, out: out.trim(), err }));
    p.stdin.end(sql);
  });
}
const lit = (v) => (v !== null && typeof v === 'object') ? `$j${'x'}$${JSON.stringify(v)}$j${'x'}$::jsonb` : (typeof v === 'number' ? String(v) : q(v));
const json = (res, st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d)); });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
const DIST = path.join(HERE, 'dist');
const apiCache = {};
const STORE = new Map();   // Storage giả: đường dẫn -> Buffer
const rawBody = (req) => new Promise((r) => { const a = []; req.on('data', (c) => a.push(c)); req.on('end', () => r(Buffer.concat(a))); });
const stats = { rpc: 0 };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    // ---- PostgREST giả: /rest/v1/rpc/<fn> ----
    const m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
    if (m && req.method === 'POST') {
      if (req.headers.apikey !== 'service-test-key') return json(res, 401, { code: 'PGRST301', message: 'Invalid API key' });
      const args = JSON.parse(await body(req) || '{}');
      const argSql = Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(', ');
      stats.rpc++;
      const r = await psql(`begin; set local role service_role; select to_json(${m[1]}(${argSql}))::text; commit;`);
      if (r.code !== 0) {
        const e = /ERROR:\s+(\w{5}):\s*([^\n]*)/.exec(r.err) || [];
        const code = e[1] || 'XX000';
        const st = /^PT(\d{3})$/.test(code) ? +code.slice(2) : code === '42501' ? 403 : code === '42883' ? 404 : 400;
        return json(res, st, { code, message: e[2] || r.err.slice(0, 200) });
      }
      const lines = r.out.split('\n').filter((l) => l.trim() && l !== 'SET' && l !== 'BEGIN' && l !== 'COMMIT');
      const val = lines[lines.length - 1];
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(val);
    }
    // ---- Supabase Storage giả (bucket basket-photos) ----
    const so = /^\/storage\/v1\/object\/(sign\/)?basket-photos(?:\/(.*))?$/.exec(url.pathname);
    if (so) {
      const p = decodeURIComponent(so[2] || '');
      if (req.method === 'GET' && so[1]) {   // tải bằng đường dẫn có chữ ký
        if (url.searchParams.get('token') !== 'tok-' + p || !STORE.has(p)) { res.writeHead(404); return res.end('no'); }
        res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(STORE.get(p));
      }
      if (req.headers.apikey !== 'service-test-key') return json(res, 401, { message: 'Invalid API key' });
      if (req.method === 'POST' && so[1]) { if (!STORE.has(p)) return json(res, 404, { message: 'not found' }); return json(res, 200, { signedURL: `/object/sign/basket-photos/${p}?token=tok-${p}` }); }
      if (req.method === 'POST') { if (STORE.has(p)) return json(res, 409, { message: 'exists' }); STORE.set(p, await rawBody(req)); return json(res, 200, { Key: 'basket-photos/' + p }); }
      if (req.method === 'DELETE') { for (const x of JSON.parse((await rawBody(req)).toString() || '{}').prefixes || []) STORE.delete(x); return json(res, 200, []); }
    }
    if (url.pathname === '/__storage') return json(res, 200, { files: [...STORE.keys()] });
    if (url.pathname === '/rest/v1/' ) return json(res, req.headers.apikey === 'service-test-key' ? 200 : 401, {});
    if (url.pathname === '/__stats') return json(res, 200, stats);
    // ---- Hàm Vercel: /api/<name> ----
    const a = /^\/api\/([a-z]+)$/.exec(url.pathname);
    if (a) {
      const file = path.join(ROOT, 'api', a[1] + '.ts');
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not found' });
      const mod = apiCache[a[1]] || (apiCache[a[1]] = await import(pathToFileURL(file).href));
      const fn = mod[req.method];
      if (!fn) return json(res, 405, { error: 'method not allowed' });
      const raw = ['GET', 'HEAD'].includes(req.method) ? undefined : await body(req);
      const r = await fn(new Request(url.href, { method: req.method, headers: req.headers, body: raw }));
      res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(await r.text());
    }
    // ---- tĩnh ----
    let f = url.pathname === '/' ? '/index.html' : url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    let fp = path.join(DIST, f);
    if (!fs.existsSync(fp)) fp = path.join(ROOT, 'public', f);
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(fs.readFileSync(fp));
  } catch (e) { console.error('server error', e); json(res, 500, { error: String(e) }); }
}).listen(PORT, () => console.log('e2e server on', PORT));
