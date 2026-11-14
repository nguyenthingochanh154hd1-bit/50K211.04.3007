#!/usr/bin/env node
/* Nhập dữ liệu cũ (file trạng thái JSON của bản Flask/JSON) vào Supabase.
 *
 *   node scripts/import-legacy.mjs <đường-dẫn-state.json> [--wipe] [--dry-run]
 *
 *  - IMPORT_USERNAME là tên đăng nhập của bạn; khóa service_role lấy từ .env.local (chỉ chạy trên máy bạn).
 *  - Gọi hàm import_legacy_state() (supabase/migrations/006) – chạy trong MỘT giao dịch, lỗi thì hoàn tác hết.
 *  - --wipe    : xóa sạch dữ liệu nghiệp vụ hiện có (kể cả danh mục do seed.sql tạo) trước khi nạp. Không có --wipe: chỉ nạp thêm, trùng mã sẽ báo lỗi.
 *  - --dry-run : chỉ kiểm tra tệp (đếm bản ghi, mã sai định dạng) mà không gửi gì lên máy chủ.
 *  Không đưa khóa service_role cho ai và không commit .env.local.
 */
import fs from 'node:fs';
import path from 'node:path';

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(path.resolve(process.cwd(), '.env.local'));

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const wipe = args.includes('--wipe');
const dry = args.includes('--dry-run');
if (!file) { console.error('Cách dùng: node scripts/import-legacy.mjs <state.json> [--wipe] [--dry-run]'); process.exit(1); }

const state = JSON.parse(fs.readFileSync(file, 'utf8'));
const COLLS = ['shops', 'custTypes', 'customers', 'svcTypes', 'services', 'baskets', 'pays', 'expenses', 'debts', 'orders'];
const RE = { shops: /^CH\d{3}$/, custTypes: /^LKH\d{2}$/, customers: /^KH\d{8}$/, svcTypes: /^LDV\d{2}$/, services: /^DV\d{8}$/, baskets: /^G\d{2}$/, pays: /^PTTT\d{6}$/, expenses: /^CP\d{8}$/, debts: /^CN\d{8}$/, orders: /^DH\d{8}$/ };
let problems = 0;
console.log('Tệp:', file);
for (const c of COLLS) {
  const arr = state[c] || [];
  const bad = arr.filter((x) => !RE[c].test(String(x.id)));
  console.log(`  ${c.padEnd(10)} ${String(arr.length).padStart(5)} bản ghi${bad.length ? `  ⚠ ${bad.length} mã sai định dạng (vd ${bad[0].id})` : ''}`);
  problems += bad.length;
}
if (problems) { console.error(`\nCó ${problems} mã sai định dạng – sửa tệp rồi chạy lại.`); process.exit(2); }
if (dry) { console.log('\n--dry-run: không gửi gì lên máy chủ.'); process.exit(0); }

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const USER = (process.env.IMPORT_USERNAME || '').toLowerCase();
if (!URL_ || !KEY || !USER) { console.error('Thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / IMPORT_USERNAME (xem .env.example).'); process.exit(1); }
const headers = { apikey: KEY, 'Content-Type': 'application/json', ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}) };

if (wipe) console.log('\n⚠ --wipe: dữ liệu nghiệp vụ hiện có sẽ bị xóa trước khi nạp.');
const r = await fetch(`${URL_}/rest/v1/rpc/import_legacy_state`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ p_user: USER, p_state: state, p_wipe: wipe })
});
const out = await r.json().catch(() => ({}));
if (!r.ok) { console.error(`\nNhập thất bại (HTTP ${r.status}): ${out.message || JSON.stringify(out)}\nKhông có gì bị thay đổi (giao dịch đã hoàn tác).`); process.exit(3); }
console.log('\nĐã nhập xong:', JSON.stringify(out.imported), '— rev', out.rev);
