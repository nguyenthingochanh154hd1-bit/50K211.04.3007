import { DB, G, S, isSi } from './state.js';
import { pos } from '../modules/orders/orders.form.js';
import { BCLS, TAGC, TAGN, TYORD } from '../utils/constants.js';
import { $, esc, norm } from '../utils/format.js';
import { ic } from '../utils/icons.js';
import { applyLimits } from '../utils/validation.js';

export const LOGO=(s=44)=>`<img src="/assets/logo.jpg" width="${s}" height="${s}" alt="Cherry Laundry" style="object-fit:contain">`;
export const badge=s=>`<span class="bd ${BCLS[s]||''}">${esc(s)}</span>`;
export const ctBadge=c=>{const t=c&&G.ctype(c.type);if(!t)return'';return `<span class="bd ${isSi(c)?'si':'le'}">${esc(t.name)}</span>`};
export const tagCol=id=>{const t=G.stype(id);const k=norm(t?t.name:'');if(TAGN[k])return TAGN[k];const i=Math.max(0,DB.svcTypes.findIndex(x=>x.id===id));return TAGC[i%TAGC.length]};
export const stag=id=>{const c=tagCol(id);const t=G.stype(id);return `<span class="tag" style="color:${c[0]};background:${c[1]};border-color:${c[0]}">${esc(t?t.name:'')}</span>`};
export const svcTypesOrd=()=>DB.svcTypes.slice().sort((a,b)=>{const x=TYORD.indexOf(norm(a.name)),y=TYORD.indexOf(norm(b.name));return (x<0?99:x)-(y<0?99:y)});
const typeIco=id=>({giat:'wash',ui:'iron',say:'steam'})[norm((G.stype(id)||{}).name)]||'dots';
export function toast(msg,kind,sub,opt){opt=opt||{};const el=document.createElement('div');el.className='toast '+(kind||'')+(sub?'':' s');el.innerHTML=`<div class="ti">${kind==='e'?ic('alert',20):ic('check',20,2.6)}</div><div><b>${esc(msg)}</b>${sub?`<span>${esc(sub)}</span>`:''}</div>${opt.x?`<button class="x" aria-label="Đóng">${ic('x',16)}</button>`:''}`;$('#toasts').appendChild(el);const rm=()=>el.remove();const xb=el.querySelector('.x');if(xb)xb.onclick=rm;setTimeout(rm,opt.ms||3600)}
export function openModal(html,cls){const m=$('#modal');m.innerHTML=`<div class="dlg ${cls||''}" role="dialog" aria-modal="true">${html}</div>`;m.classList.add('on');applyLimits(m);fitDlg();setTimeout(()=>{const i=m.querySelector('input:not([readonly]):not([type=checkbox]):not([type=date]),select,textarea');if(i&&!m.dataset.nofocus)i.focus()},30)}
function openTP(inp){const w=inp.parentNode;const old=w.querySelector('.tpop');if(old){old.remove();return}
 const H=36,pad=72;let cur=String(inp.value||'');let h24,m;if(/^\d{1,2}:\d{2}$/.test(cur)){[h24,m]=cur.split(':').map(Number)}else{const n=new Date();h24=n.getHours();m=n.getMinutes()}
 const ap=h24>=12?1:0,h12=(h24%12)||12;
 const hrs=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')),mins=Array.from({length:60},(_,i)=>String(i).padStart(2,'0')),aps=['AM','PM'];
 const col=(k,arr)=>`<div class="tcol" data-k="${k}"><div style="height:${pad}px"></div>${arr.map(v=>`<div class="ti">${v}</div>`).join('')}<div style="height:${pad}px"></div></div>`;
 const pop=document.createElement('div');pop.className='tpop';pop.innerHTML=col('h',hrs)+'<div class="tsep">:</div>'+col('m',mins)+col('a',aps);w.appendChild(pop);
 const cols=[...pop.querySelectorAll('.tcol')];const idx={h:h12-1,m:m,a:ap};
 const mark=c=>{const i=Math.round(c.scrollTop/H);[...c.querySelectorAll('.ti')].forEach((e,j)=>e.classList.toggle('on',j===i));return i};
 const commit=()=>{const hi=Math.round(cols[0].scrollTop/H),mi=Math.round(cols[1].scrollTop/H),ai=Math.round(cols[2].scrollTop/H);let hh=(hi+1)%12+(ai?12:0);const v=String(hh).padStart(2,'0')+':'+String(mi).padStart(2,'0');inp.value=v;if(typeof pos.cur!=='undefined'&&pos.cur){pos.cur.recvTime=v;pos.cur.err.time=''}inp.classList.remove('bad');const e=document.getElementById('e_pos_time');if(e)e.textContent=''};
 cols.forEach(c=>{c.scrollTop=idx[c.dataset.k]*H;mark(c);let t;c.addEventListener('scroll',()=>{mark(c);clearTimeout(t);t=setTimeout(()=>{c.scrollTo({top:Math.round(c.scrollTop/H)*H,behavior:'smooth'});commit()},120)});c.addEventListener('click',ev=>{const it=ev.target.closest('.ti');if(!it)return;const j=[...c.querySelectorAll('.ti')].indexOf(it);c.scrollTo({top:j*H,behavior:'smooth'})})});
 commit();
 setTimeout(()=>{const off=ev=>{if(!w.contains(ev.target)){pop.remove();document.removeEventListener('mousedown',off)}};document.addEventListener('mousedown',off)},0)}
// Inline onclick không thấy được hàm trong ES module → dùng event delegation cho ô chọn giờ
document.addEventListener('click',e=>{const t=e.target&&e.target.closest&&e.target.closest('[data-tp]');if(t&&!t.disabled)openTP(t)});
function openCal(inp){closeCal();const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const tdy=iso(new Date());const v=/^\d{4}-\d{2}-\d{2}$/.test(inp.value)?inp.value:'';let y,m;{const b=(v||tdy).split('-').map(Number);y=b[0];m=b[1]-1}
 const pop=document.createElement('div');pop.className='calp';pop._inp=inp;document.body.appendChild(pop);
 const draw=()=>{const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());let cells='';for(let i=0;i<42;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);const k=iso(d);const dis=(inp.min&&k<inp.min)||(inp.max&&k>inp.max);cells+=`<button type="button" class="cd${d.getMonth()!==m?' om':''}${k===v?' sel':''}${k===tdy?' td':''}" data-d="${k}" ${dis?'disabled':''}>${d.getDate()}</button>`}
  pop.innerHTML=`<div class="ch"><button type="button" class="cn" data-c="-1" aria-label="Tháng trước"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg></button><b>Tháng ${m+1} năm ${y}</b><button type="button" class="cn" data-c="1" aria-label="Tháng sau"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></button></div><div class="cw">${['CN','T2','T3','T4','T5','T6','T7'].map(x=>`<span>${x}</span>`).join('')}</div><div class="cg">${cells}</div>`};
 draw();
 const place=()=>{const r=inp.getBoundingClientRect();pop.style.width=Math.max(200,r.width)+'px';const W=pop.offsetWidth,H=pop.offsetHeight;let l=Math.min(r.left,innerWidth-W-8),t=r.bottom+6;if(t+H>innerHeight-8)t=Math.max(8,r.top-H-6);pop.style.left=Math.max(8,l)+'px';pop.style.top=t+'px'};place();
 pop.addEventListener('mousedown',e=>e.preventDefault());
 pop.addEventListener('click',e=>{const c=e.target.closest('[data-c]');if(c){m+=+c.dataset.c;if(m<0){m=11;y--}if(m>11){m=0;y++}draw();place();return}const d=e.target.closest('[data-d]');if(d&&!d.disabled){inp.value=d.dataset.d;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));inp.classList.remove('bad');closeCal()}});
 setTimeout(()=>{document.addEventListener('mousedown',calOut,true);window.addEventListener('resize',closeCal);document.addEventListener('scroll',closeCal,true)},0)}
function calOut(e){const p=document.querySelector('.calp');if(p&&!p.contains(e.target)&&e.target!==p._inp)closeCal()}
function closeCal(){document.querySelectorAll('.calp').forEach(p=>p.remove());document.removeEventListener('mousedown',calOut,true);window.removeEventListener('resize',closeCal);document.removeEventListener('scroll',closeCal,true)}
document.addEventListener('mousedown',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[type=date]')&&!t.disabled&&!t.readOnly){const o=document.querySelector('.calp');if(o&&o._inp===t)return;openCal(t)}},true);
document.addEventListener('input',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[type=date]')){const o=document.querySelector('.calp');if(o&&o._inp===t&&!t.value)closeCal()}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCal()});
try{const sp=HTMLInputElement.prototype.showPicker;HTMLInputElement.prototype.showPicker=function(){if(this.type==='date'){openCal(this);return}return sp&&sp.call(this)}}catch(e){}
document.addEventListener('keydown',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[type=date]')&&(e.key===' '||e.key==='Enter')){e.preventDefault();openCal(t)}},true);
function fitDlg(){const m=document.getElementById('modal');const d=m&&m.querySelector('.dlg');if(!d||!d.querySelector('.frame')||d.classList.contains('w795'))return;d.style.zoom='';const cs=getComputedStyle(m);const avail=m.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);const h=d.offsetHeight;if(h>avail&&avail>200)d.style.zoom=(avail/h).toFixed(3)}
window.addEventListener('resize',fitDlg);
export function closeModal(){const m=$('#modal');m.classList.remove('on');m.innerHTML=''}
export const val=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
export function setErr(id,msg){const e=document.getElementById(id),m=document.getElementById('e_'+id);if(e)e.classList.toggle('bad',!!msg);if(m)m.textContent=msg||''}
function clearErrs(root){(root||document).querySelectorAll('.bad').forEach(e=>e.classList.remove('bad'));(root||document).querySelectorAll('[id^=e_]').forEach(e=>e.textContent='')}
export const fld=(o)=>`<div class="f"${o.style?` style="${o.style}"`:''}><label for="${o.id}">${esc(o.label)}${o.req?' <em>*</em>':''}</label>${o.html||`<input class="inp" id="${o.id}" ${o.type?`type="${o.type}"`:''} placeholder="${esc(o.ph||'')}" value="${esc(o.value??'')}" ${o.ro?'readonly':''} autocomplete="off"${o.extra||''}>`}<div class="err" id="e_${o.id}"></div></div>`;
export const selHTML=(id,opts,cur,ph)=>`<select class="sel ${cur?'has':''}" id="${id}"><option value="">${esc(ph||'Chọn')}</option>${opts.map(o=>`<option value="${esc(o[0])}" ${o[0]===cur?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
export const longDate=(pre)=>{const d=new Date();return `${pre} ngày ${d.getDate()} tháng ${d.getMonth()+1} năm ${d.getFullYear()}`};
/* popup form: title, subtitle (real date), code line, body, size class */
export function formDlg(o){openModal(`<div class="hd"><h3>${esc(o.title)}</h3><p>${esc(o.sub)}</p></div><div class="bd2">${o.code?`<div class="code2">${o.code}</div>`:''}<div class="frame ph-in">${o.body}</div></div><div class="ft"><button class="btn out" data-act="close" style="border-color:#A6A6A6">Hủy</button><button class="btn pri" id="mSave">Lưu</button></div>`,(o.cls||'h626'));}
export function confirmDlg(text,yes,o={}){openModal(`<div class="hd"><h3>Thông báo</h3></div><div class="bd2"><div class="ico">${ic('alert',30,2.4)}</div><p>${esc(text)}</p></div><div class="ft"><button class="btn gray" data-act="close">${o.no||'Hủy'}</button><button class="btn pri" id="cfmYes">${o.yes||'Xác nhận'}</button></div>`,'cf');$('#cfmYes').onclick=()=>{closeModal();yes()}}
export function infoDlg(text,ok=true,after){openModal(`<div class="hd"><h3>Thông báo</h3></div><div class="bd2"><div class="ico ${ok?'ok':''}">${ic(ok?'check':'alert',30,2.6)}</div><p>${esc(text)}</p></div><div class="ft ctr"><button class="btn pri" id="okBtn">OK</button></div>`,'cf');$('#okBtn').onclick=()=>{closeModal();after&&after()}}
/* success after create/update/delete: popup (customer modules) or toast */
export function done(msg,popup,after){if(popup)infoDlg(msg,true,after);else{toast(msg);after&&after()}}
export const offline=m=>{if(navigator.onLine===false){toast('Lỗi đường truyền! '+m,'e');return true}return false};
export function pager(key,totalN,per=10){const st=S(key),pages=Math.max(1,Math.ceil(totalN/per));if(st.page>pages)st.page=pages;if(!totalN)return'';const p=st.page;let nums=[];for(let i=1;i<=pages;i++)if(i===1||i===pages||Math.abs(i-p)<=1||(p<=3&&i<=4))nums.push(i);const out=[];nums.forEach((n,i)=>{if(i&&n-nums[i-1]>1)out.push('…');out.push(n)});return `<div class="pager"><button data-act="page" data-k="${key}" data-p="${p-1}" ${p===1?'disabled':''} aria-label="Trang trước">${ic('left',14)}</button>${out.map(n=>n==='…'?'<button class="dots" disabled>...</button>':`<button class="${n===p?'on':''}" data-act="page" data-k="${key}" data-p="${n}">${n}</button>`).join('')}<button data-act="page" data-k="${key}" data-p="${p+1}" ${p===pages?'disabled':''} aria-label="Trang sau">${ic('right',14)}</button></div>`}
export const paged=(key,arr,per=10)=>{const st=S(key);const pages=Math.max(1,Math.ceil(arr.length/per));if(st.page>pages)st.page=pages;return arr.slice((st.page-1)*per,st.page*per)};
export const searchBox=(key)=>`<div class="search"><input id="q_${key}" placeholder="Tìm kiếm" value="${esc(S(key).q)}" data-enter="search" data-k="${key}"><span data-act="search" data-k="${key}" title="Tìm kiếm">${ic('search',19)}</span></div>`;
export const filterBtn=(key,popHTML,on)=>`<div class="rel"><button class="fbtn" data-act="fpop" data-k="${key}">${ic('filter',15)} Bộ lọc${on?' •':''}</button>${S(key).fopen?`<div class="pop">${popHTML}</div>`:''}</div>`;
export const emptyBox=(msg,i='inbox')=>`<div class="empty">${ic(i,44,1.4)}<div>${esc(msg)}</div></div>`;
/* white list card: strip (title + tools) + table */
export function listCard(o){if(o.headOnly&&!(o.rows&&o.rows.length))return `<div class="lc ho"><div class="strip"><h2 class="${o.pop?'poppins':''}">${o.title}</h2>${o.tools||''}</div><div class="scroll"><table><thead><tr>${o.head}</tr></thead></table></div></div><div class="nf">${esc(o.none||'')}</div>`;return `<div class="lc"><div class="strip"><h2 class="${o.pop?'poppins':''}">${o.title}</h2>${o.tools||''}</div>${o.rows&&o.rows.length?`<div class="scroll"><table><thead><tr>${o.head}</tr></thead><tbody>${o.rows.join('')}</tbody></table></div>`:emptyBox(o.none||'Không có dữ liệu')}</div>`}
export const actBtns=(k,id)=>`<td class="act"><button class="ibtn" data-act="${k}-edit" data-id="${id}" aria-label="Sửa">${ic('edit',19)}</button><button class="ibtn" data-act="${k}-del" data-id="${id}" aria-label="Xóa">${ic('trash',19)}</button></td>`;
