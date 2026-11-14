import { go, render } from './router.js';
import { S } from './state.js';
import { closeModal, toast } from './ui.js';
import { $, norm } from '../utils/format.js';

document.addEventListener('change',e=>{const t=e.target;if(t&&t.closest&&t.closest('.dlg .frame'))t.classList.add('typed')});
document.addEventListener('click',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[type=date]'))e.preventDefault()},true);
export { ACT, IN } from './registry.js';
import { ACT, IN } from './registry.js';
const NETACT=k=>/-del(-d|-row)?$/.test(k)?'Xóa thất bại!':(/-add$/.test(k)&&k!=='pos-add')||k==='pos-addcust'||k==='ord-new'?'Tạo thất bại!':/-edit(-row)?$/.test(k)||['pw-open','tg-proc','tg-proc-d','ord-confirm','ord-reject','ord-pay','debt-pay'].includes(k)?'Cập nhật thất bại!':'';
document.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(a&&ACT[a.dataset.act]){e.preventDefault();if(navigator.onLine===false){const m=NETACT(a.dataset.act);if(m){toast('Lỗi đường truyền! '+m,'e');return}}ACT[a.dataset.act](a,e)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.enter&&ACT[e.target.dataset.enter]){e.preventDefault();ACT[e.target.dataset.enter](e.target,e)}if(e.key==='Escape'&&$('#modal').classList.contains('on')&&!$('#modal').dataset.lock)closeModal()});
document.addEventListener('input',e=>{const t=e.target;if(t.parentNode&&t.parentNode.classList&&t.parentNode.classList.contains('usw')){const box=t.nextElementSibling,q=norm(t.value).trim();let vis=0,exact=false;[...box.children].forEach(o=>{const v=norm(o.textContent).trim();const ok=!q||v.includes(q);o.style.display=ok?'':'none';if(ok)vis++;if(v===q)exact=true});box.hidden=!vis||exact}if(t.closest&&t.closest('.dlg .frame'))t.classList.add('typed');if(t.classList&&t.classList.contains('bad')){t.classList.remove('bad');const m=document.getElementById('e_'+t.id);if(m)m.textContent=''}if(t.dataset&&t.dataset.digits)t.value=t.value.replace(/\D/g,'');if(t.dataset&&t.dataset.dec){let v=t.value.replace(/,/g,'.').replace(/[^\d.]/g,'');const k=v.indexOf('.');if(k>=0)v=v.slice(0,k+1)+v.slice(k+1).replace(/\./g,'');if(v!==t.value)t.value=v}if(t.dataset&&t.dataset.in&&IN[t.dataset.in])IN[t.dataset.in](t)});
document.addEventListener('change',e=>{const t=e.target;if(t.tagName==='SELECT')t.classList.toggle('has',!!t.value)});
ACT.close=()=>closeModal();
ACT.page=a=>{S(a.dataset.k).page=+a.dataset.p;render()};
ACT.search=a=>{const k=a.dataset.k,st=S(k);st.q=document.getElementById('q_'+k).value.trim();st.page=1;render()};
ACT.nav=a=>go(a.dataset.h);
