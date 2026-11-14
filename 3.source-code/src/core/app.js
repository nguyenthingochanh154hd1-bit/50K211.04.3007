import { ACT } from './registry.js';
import { render } from './router.js';
import { DB, can, shop } from './state.js';
import { LOGO, closeModal, confirmDlg } from './ui.js';
import { rmSet } from '../modules/debts/debts.reminders.js';
import { authService } from '../modules/auth/auth.service.js';
import { NAV } from '../utils/constants.js';
import { $, esc } from '../utils/format.js';
import { ic } from '../utils/icons.js';

const NAVRES={orders:'orders',svc:'svcTypes',cust:'customers',debts:'debts',expenses:'expenses',reports:'reports',pays:'pays',baskets:'baskets',shop:'shops'};
export function shell(v){const sp=shop();
 const nav=NAV.filter(n=>can(NAVRES[n.k],'xem')||!Object.keys(DB.perms||{}).length).map(n=>{const on=v.nav===n.k;let h=`<a data-act="nav" data-h="${n.h}" class="${on?'on':''}">${ic(n.i,29,1.4)}<span>${n.t}</span></a>`;if(n.sub&&on)h+=`<div class="sub">${n.sub.map(s=>`<a data-act="nav" data-h="${s[2]}" class="${v.sub===s[0]?'on':''}">${s[1]}</a>`).join('')}</div>`;return h}).join('');
 const crumbs=v.crumbs.map((c,i)=>i===v.crumbs.length-1?`<b>${esc(c[0])}</b>`:`<a data-act="nav" data-h="${c[1]}" class="${c[2]==='mid'?'mid':''}">${esc(c[0])}</a><i>&gt;</i>`).join('');
 return `<aside class="side" id="side"><div class="brand">${LOGO(57)}<div><b>${esc(sp.name)}</b><span>${esc(sp.addr)}</span></div></div><nav class="nav">${nav}</nav><div class="acct"><div class="me" data-act="nav" data-h="#account"><div class="avatar"><svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true"><path d="M12 92C16 68 31 56 50 56S84 68 88 92" fill="none" stroke="#000" stroke-width="6"/><circle cx="50" cy="38" r="15" fill="#fff" stroke="#000" stroke-width="6"/></svg></div><div style="min-width:0"><b>${esc(DB.account.name)}</b><span>${esc(DB.account.phone)}</span></div></div><button class="logout" data-act="logout" title="Đăng xuất" aria-label="Đăng xuất">${ic('logout',26,2)}</button></div></aside><div class="main"><header class="top"><button class="ibtn burger" data-act="burger" aria-label="Menu">${ic('menu',24)}</button><div class="crumbs">${crumbs}</div>${v.topRight?`<div class="back2">${v.topRight}</div>`:''}</header><main class="content ${v.flush?'flush':''}">${v.html}</main></div>`}
ACT.burger=()=>$('#side').classList.toggle('open');
ACT.logout=()=>confirmDlg('Rời khỏi trang web?',()=>{authService.logout();rmSet(false);closeModal();location.hash='#login';render()},{yes:'Rời khỏi',red:true});
export function alignCols(){document.querySelectorAll('.lc table,.dtbl table').forEach(t=>{const b=t.tBodies[0];if(!b)return;const rows=[...b.rows];if(!rows.length)return;const n=rows[0].cells.length;for(let i=0;i<n;i++){const ws=rows.map(r=>r.cells[i]&&r.cells[i].querySelector(':scope>.cust,:scope>.dtw')).filter(Boolean);if(!ws.length)continue;ws.forEach(w=>w.style.minWidth='');const m=Math.max(...ws.map(w=>w.getBoundingClientRect().width));ws.forEach(w=>w.style.minWidth=Math.ceil(m)+'px')}});eqEx()}
function eqEx(){const ts=[...document.querySelectorAll('.exlist table')];if(!ts.length)return;const rg=document.createRange();const m=[0,0,0,0];ts.forEach(t=>[...t.rows].forEach(r=>{for(let i=0;i<4;i++){const c=r.cells[i];if(!c)continue;rg.selectNodeContents(c);m[i]=Math.max(m[i],rg.getBoundingClientRect().width)}}));const pad=[28+47.5,95,95,95];ts.forEach(t=>{const h=t.tHead&&t.tHead.rows[0];if(!h)return;for(let i=0;i<4;i++)h.cells[i].style.width=Math.ceil(m[i]+pad[i])+'px'})}
let acT=0;
/* căn lại độ rộng cột khi nội dung đổi; gọi một lần khi khởi động */
export function initLayout(){
 new MutationObserver(()=>{cancelAnimationFrame(acT);acT=requestAnimationFrame(alignCols)}).observe(document.getElementById('app'),{childList:true,subtree:true});
 try{document.fonts.ready.then(alignCols)}catch(e){}}
