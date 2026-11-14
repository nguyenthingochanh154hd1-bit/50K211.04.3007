/* Điểm vào trang đặt đơn online (/online): định tuyến theo #hash, xử lý sự kiện, gọi API. */
import { $ } from './utils.js';
import { SS, ST, cc, chain, dedupe, emptyForm, t } from './state.js';
import { vCreate, vDetail, vDone, vFail, vHome, vList, vPhone } from './views.js';
import { createOrder, fetchCatalog, lookupOrders, toUi } from './online.service.js';
import './styles/online.css';

let routeNo = 0;

async function refreshCatalog() {
  try { ST.cat = await fetchCatalog(); ST.netErr = false; } catch (e) { ST.netErr = true; }
}
async function loadOrders() {
  try {
    const r = await lookupOrders(ST.auth.shown);
    ST.orders = r.found && !r.wholesale ? (r.orders || []).map(toUi) : [];
    ST.ordersLoaded = true;
    ST.netErr = false;
  } catch (e) { ST.netErr = true; ST.orders = []; ST.ordersLoaded = false; }
}
const vLoading = () => `<div class="scr s-pl"><div class="empty" style="margin-top:40vh"><span class="spin" style="border-color:rgba(36,78,150,.25);border-top-color:#244E96"></span> ${t('loading')}</div></div>`;

export async function route() {
  const my = ++routeNo;
  const h = (location.hash || '#home').slice(1);
  let html;
  if (h === 'home') html = vHome();
  else if (h === 'track' || h === 'new') { if (ST.ph.kind !== h) { ST.ph = { cc: 'VN', val: '', err: '', kind: h, nf: '' }; } html = vPhone(h); }
  else if (h === 'create') {
    if (!ST.auth || ST.auth.flow !== 'new') { location.replace('#new'); return; }
    $('#app').innerHTML = vLoading();
    await refreshCatalog();
    if (my !== routeNo) return;
    if (!ST.cat) { location.replace('#home'); return; }
    html = vCreate();
  }
  else if (h === 'done') html = vDone();
  else if (h === 'failed') html = vFail();
  else if (h === 'list' || h.startsWith('o-')) {
    if (!ST.auth) { location.replace('#track'); return; }
    if (!ST.ordersLoaded) {
      $('#app').innerHTML = vLoading();
      await Promise.all([loadOrders(), ST.cat ? null : refreshCatalog()]);
      if (my !== routeNo) return;
      if (!ST.ordersLoaded) { location.replace('#home'); return; }
    }
    html = h === 'list' ? vList() : vDetail(h.slice(2));
  }
  else html = vHome();
  const y = window.scrollY;
  $('#app').innerHTML = html;
  if (window.__keep) { window.scrollTo(0, y); } else window.scrollTo(0, 0);
  window.__keep = false;
  document.documentElement.lang = ST.lang;
}
const rr = () => { window.__keep = true; route(); };
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

/* ---------- số điện thoại ---------- */
function normPhone(cca,raw){const c=cc(cca);const d=raw.replace(/\s/g,'');if(!d)return {err:'p_empty'};if(!/^\d+$/.test(d))return {err:'p_bad'};if(d.length>20)return {err:'p_len'};
const nat=d.replace(/^0+/,'')||d;return {key:c[3].slice(1)+nat,cc:cca,national:nat,shown:(cca==='VN'?'0'+nat:c[3]+' '+nat)}}

async function phoneOK(kind) {
  if (!ST.ph.val.trim() || ST.busy) return;
  if (kind === 'track' && /[^\d\s]/.test(ST.ph.val)) { ST.ph.err = ''; ST.ph.nf = 'nf'; rr(); return; }
  const r = normPhone(ST.ph.cc, ST.ph.val);
  ST.ph.nf = '';
  if (r.err) { ST.ph.err = r.err; rr(); return; }
  ST.ph.err = '';
  const ob = $('#okbtn');
  if (ob) { ob.disabled = true; ob.innerHTML = '<span class="spin"></span>'; }
  ST.busy = true;
  try {
    const res = await lookupOrders(r.shown);
    if (res.found && res.wholesale) { ST.ph.err = 'wholesale'; rr(); return; }
    if (kind === 'track') {
      if (!res.found) { ST.ph.nf = 'nf'; rr(); return; }
      ST.auth = { ...r, flow: 'track' }; SS.set('cm_auth', JSON.stringify(ST.auth));
      ST.orders = (res.orders || []).map(toUi); ST.ordersLoaded = true;
      go('#list'); return;
    }
    ST.auth = { ...r, flow: 'new' }; SS.set('cm_auth', JSON.stringify(ST.auth));
    ST.f = emptyForm(); ST.f.contact = r.shown;
    if (res.found && res.name) ST.f.name = res.name;
    ST.ordersLoaded = false;
    go('#create');
  } catch (e) {
    // chỉ báo "Lỗi đường truyền" khi thật sự không kết nối được máy chủ
    ST.ph.err = e.network ? 'neterr' : e.status === 429 ? 'busy' : e.status === 422 ? 'p_bad' : 'srverr';
    rr();
  } finally { ST.busy = false; }
}

/* ---------- ảnh giỏ đựng: nén trong trình duyệt (JPEG, cạnh dài <= 1024 px) trước khi gửi ---------- */
function addFiles(files) {
  const room = 3 - ST.f.photos.length;
  const list = [...files].slice(0, room);
  ST.f.errs.photos = '';
  let pend = list.length;
  if (!pend) return;
  const done = () => { if (--pend <= 0) rr(); };
  list.forEach((f) => {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const okT = /^image\/(jpeg|png|heic|heif)$/.test(f.type) || ['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(ext);
    if (!okT) { ST.f.errs.photos = 'badfmt'; done(); return; }
    if (f.size > 5 * 1024 * 1024) { ST.f.errs.photos = 'big'; done(); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 1024 / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        try { ST.f.photos.push(c.toDataURL('image/jpeg', 0.7)); } catch (e) { ST.f.errs.photos = 'unread'; }
        done();
      };
      im.onerror = () => { ST.f.errs.photos = 'unread'; done(); };   // vd. HEIC trên trình duyệt không đọc được
      im.src = fr.result;
    };
    fr.onerror = () => { ST.f.errs.photos = 'unread'; done(); };
    fr.readAsDataURL(f);
  });
}

/* ---------- gửi đơn ---------- */
function validate(){const e={};if(!ST.f.name.trim())e.name='empty';if(!ST.f.contact.trim())e.contact='empty';if(!ST.f.type)e.type='empty';if(!ST.f.svc)e.svc='empty';if(!ST.f.basket)e.basket='empty';if(!ST.f.photos.length)e.photos='empty';ST.f.errs=e;return !Object.keys(e).length}

async function submit() {
  if (ST.sending) return;
  if (!validate()) { rr(); const f = document.querySelector('.bad,.err:not(:empty)'); if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  ST.sending = true;
  const b = $('#sbtn'); if (b) { b.disabled = true; b.innerHTML = `<span class="spin"></span>${t('sending')}`; }
  const f = ST.f, svcIds = [f.svc, ...chain()];
  try {
    const r = await createOrder({ name: f.name.trim(), phone: ST.auth.shown, addr: f.addr.trim(), note: f.note.trim(), services: svcIds, basket: f.basket, photos: f.photos });
    ST.last = { id: r.id, name: f.name.trim(), svc: svcIds[0], more: svcIds.slice(1), basket: f.basket, at: r.createdAt, status: r.status };
    ST.f = emptyForm(); ST.sending = false; ST.ordersLoaded = false; ST.failMsg = '';
    go('#done');
  } catch (e) {
    ST.sending = false;
    if (e.status === 409) { await refreshCatalog(); ST.f.basket = ''; ST.f.errs.basket = 'taken'; rr(); return; }
    ST.failMsg = e.network ? 'neterr' : e.status === 429 ? 'busy' : (e.status === 422 && ST.lang === 'vi') ? e.message : '';
    go('#failed');
  }
}

/* ---------- sự kiện ---------- */
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
if(a==='sheet-x'){if(e.target.closest('[data-stop]'))return;ST.sheet=false;rr();return}
if(e.target.closest('[data-stop]')&&a==='sheet-x')return;
if(a==='go')go(el.dataset.h);
else if(a==='lang'){ST.lang=el.dataset.l;SS.set('cm_lang',ST.lang);rr()}
else if(a==='sheet'){ST.sheet=true;rr()}
else if(a==='cc-pick'){ST.ph.cc=el.dataset.c;ST.sheet=false;rr()}
else if(a==='phone-ok')phoneOK(el.dataset.kind);
else if(a==='bk'){ST.f.basket=el.dataset.b;ST.f.errs.basket='';rr()}
else if(a==='ph-add'){const f=$('#file');if(f)f.click()}
else if(a==='ph-rm'){ST.f.photos.splice(+el.dataset.i,1);rr()}
else if(a==='submit')submit();
else if(a==='retry'){go('#create')}});
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.in;if(!k)return;
if(k==='ph'){ST.ph.val=e.target.value;const ob=$('#okbtn');if(ob)ob.disabled=!ST.ph.val.trim();const pe=ST.ph.kind==='new'&&/[^\d\s]/.test(ST.ph.val)?'p_bad':ST.ph.val.replace(/\s/g,'').length>20?'p_len':'';if(pe){ST.ph.err=pe;const p=e.target.closest('.pin');if(p)p.classList.add('bad');const h=document.querySelector('.hint');if(h){h.className='hint err';h.setAttribute('role','alert');h.textContent=t(pe)}return}if(ST.ph.err){ST.ph.err='';const p=e.target.closest('.pin');if(p)p.classList.remove('bad');const h=document.querySelector('.hint');if(h){h.className='hint';h.textContent=t(ST.ph.kind==='new'?'hint_new':'hint_track')}}return}
if(['name','contact','addr','note'].includes(k)){ST.f[k]=e.target.value;if(ST.f.errs[k]){ST.f.errs[k]='';e.target.classList.remove('bad');const m=$('#e_'+k);if(m)m.textContent=''}}});
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.in;
if(e.target.id==='file'){addFiles(e.target.files);e.target.value='';return}
if(k==='type'){ST.f.type=e.target.value;ST.f.svc='';ST.f.errs.type='';rr()}
else if(k==='svc'){ST.f.svc=e.target.value;ST.f.errs.svc='';dedupe();rr()}
else if(/^m[ts]\d+$/.test(k)){const i=+k.slice(2);ST.f.more[i]=ST.f.more[i]||{type:'',svc:''};if(k[1]==='t'){ST.f.more[i].type=e.target.value;ST.f.more[i].svc=''}else ST.f.more[i].svc=e.target.value;dedupe();rr()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='ph'){phoneOK(ST.ph.kind)}if(e.key==='Escape'&&ST.sheet){ST.sheet=false;rr()}});
window.addEventListener('hashchange',()=>{ST.sheet=false;route()});

route();
refreshCatalog().then(() => { if ((location.hash || '#home') === '#home') rr(); });
