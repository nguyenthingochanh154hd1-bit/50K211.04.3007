// Dựng bản bundle frontend bằng esbuild (thay cho Vite) + shim supabase-js
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/npm-tools/');
const esbuild = require('esbuild');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../cherry-laundry');
const out = path.join(HERE, 'dist');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const origin = process.env.ORIGIN || 'http://localhost:5099';
await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/main.js')], bundle: true, format: 'esm', outdir: out, sourcemap: false, logLevel: 'warning',
});
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace('<script type="module" src="/src/main.js"></script>', '<link rel="stylesheet" href="/main.css"><script type="module" src="/main.js"></script>');
fs.writeFileSync(path.join(out, 'index.html'), html);
await esbuild.build({ entryPoints: [path.join(ROOT, 'src/online/main.js')], bundle: true, format: 'esm', outdir: path.join(out, 'online'), sourcemap: false, logLevel: 'warning' });
let oh = fs.readFileSync(path.join(ROOT, 'online/index.html'), 'utf8');
oh = oh.replace('<script type="module" src="/src/online/main.js"></script>', '<link rel="stylesheet" href="/online/main.css"><script type="module" src="/online/main.js"></script>');
fs.writeFileSync(path.join(out, 'online/index.html'), oh);
console.log('built', fs.readdirSync(out).map(f => f + ':' + fs.statSync(path.join(out, f)).size).join(' '));
