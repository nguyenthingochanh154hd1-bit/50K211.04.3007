/* Trạng thái và hàm dùng chung của trang đặt đơn online.
 * Dữ liệu (dịch vụ, giá, giỏ trống, đơn của khách) đến từ /api/online – không còn dữ liệu giả trong trình duyệt. */
import { T, SVN, COUNTRIES } from './i18n.js';
import { esc, noAcc, pad } from './utils.js';

export const LOGO = '/assets/logo.jpg';
export const SS = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
};
export const emptyForm = () => ({ name: '', contact: '', addr: '', type: '', svc: '', more: [], basket: '', note: '', photos: [], errs: {} });

export const ST = {
  lang: SS.get('cm_lang') || 'vi',
  ph: { cc: 'VN', val: '', err: '', kind: '' },      // màn hình nhập số điện thoại
  auth: null,                                        // { cc, national, key, shown, flow } – số điện thoại đã xác nhận
  f: emptyForm(), last: null, sheet: false, sending: false, busy: false, failMsg: '',
  cat: null,                                         // { shop, svcTypes, services, baskets } từ máy chủ
  netErr: false,
  orders: [], ordersLoaded: false
};
try { ST.auth = JSON.parse(SS.get('cm_auth') || 'null'); } catch (e) {}

export const t = (k) => T[ST.lang][k];
export const svcTypes = () => ((ST.cat && ST.cat.svcTypes) || []).map((x) => [x.id, x.name]);
export const basketIds = () => ((ST.cat && ST.cat.baskets) || []).map((b) => b.id);
export const basketFull = (b) => { const x = ((ST.cat && ST.cat.baskets) || []).find((y) => y.id === b); return !x || x.full; };
export const shopPhone = () => { const p = (ST.cat && ST.cat.shop && ST.cat.shop.phone) || '0905117311'; return p.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3'); };
export const shopAddr = () => { const sh = ST.cat && ST.cat.shop; return sh ? (ST.lang === 'en' ? (sh.addrEn || sh.addr) : sh.addr) : t('addr'); };
export const failText = () => { const m = ST.failMsg; return m ? (T[ST.lang][m] || m) : t('fails'); };
export const svcOf=id=>ST.cat.services.find(s=>s.id===id)||{};
export const typeName=id=>(svcTypes().find(x=>x[0]===id)||[,''])[1];
export const sName=s=>ST.lang==='en'?(SVN[s.name]||noAcc(s.name)):s.name;
export const tName=id=>t('ST')[typeName(id)]||typeName(id);
export const person=n=>ST.lang==='en'?noAcc(n):n;
export const vnd=n=>Number(n||0).toLocaleString('vi-VN')+(ST.lang==='en'?' đ':' đ');
export const fDT=iso=>{const d=new Date(iso);if(isNaN(d))return'';let h=d.getHours();const m=pad(d.getMinutes(),2);const ap=ST.lang==='en'?(h<12?'AM':'PM'):(h<12?'SA':'CH');h=h%12||12;return `${pad(d.getDate(),2)}/${pad(d.getMonth()+1,2)}/${d.getFullYear()} ${pad(h,2)}:${m} ${ap}`};
export const fT=iso=>fDT(iso).slice(11);
export const stCls=s=>({'Chờ xác nhận':'p','Đang xử lý':'g','Chờ thanh toán':'w','Đã thanh toán':'d','Đã giao':'v'}[s]||'p');
export const badge=s=>`<span class="st ${stCls(s)}">${esc(t('S')[s]||s)}</span>`;
export const cc=code=>COUNTRIES.find(c=>c[0]===code)||COUNTRIES[0];
export function dedupe(){const seen=[ST.f.svc];for(let i=0;i<ST.f.more.length;i++){const s=ST.f.more[i]&&ST.f.more[i].svc;if(s&&seen.includes(s)){ST.f.more.length=i;break}seen.push(s)}}
export const oSvcs=o=>[o.svc,...(o.more||[]),o.svc2].filter(Boolean);
export const chain=()=>{const r=[];for(const m of ST.f.more){if(!m||!m.svc)break;r.push(m.svc)}return r};
export const svcTxt=o=>oSvcs(o).map(id=>{const s=svcOf(id);return tName(s.type)+' · '+sName(s)}).join(', ');
export const myOrders = () => ST.orders.slice().sort((a, b) => b.at.localeCompare(a.at));
