import { ACT } from '../../core/registry.js';
import { go } from '../../core/router.js';
import { AUTH, DB, G, debtDay } from '../../core/state.js';
import { $, esc, fD } from '../../utils/format.js';
import { ic } from '../../utils/icons.js';

/* Thông báo nhắc nợ: hiện ở trang đầu tiên sau khi đăng nhập; bấm X (hoặc "Xem chi tiết", hoặc chuyển trang) thì mất và không hiện lại trong phiên này */
export const rm={show:false,skip:0};
try{rm.show=sessionStorage.getItem('cl_rm')==='1'}catch(e){}
export const rmSet=v=>{rm.show=v;try{sessionStorage.setItem('cl_rm',v?'1':'0')}catch(e){}};
export function remindCheck(){const root=$('#remind-root');if(!root)return;if(!AUTH||!rm.show){root.innerHTML='';return}
 const due=DB.debts.filter(d=>d.status==='Chờ thanh toán'&&debtDay(d)>=12&&debtDay(d)<=14);if(!due.length){root.innerHTML='';return}
 const d=due[0],c=G.cust(d.custId)||{};root.innerHTML=`<div class="remind" role="alert"><span class="ic">${ic('bell',34,1.6)}</span><div><b>Công nợ sắp đến hạn!</b><p>${esc(c.name)} - ${d.id} - Hạn: <em>${fD(d.due)}</em></p><a data-act="rm-view" data-id="${d.id}">Xem chi tiết</a></div><button class="x" data-act="rm-close" aria-label="Đóng">${ic('x',18)}</button></div>`}
ACT['rm-close']=()=>{rmSet(false);remindCheck()};
ACT['rm-view']=a=>{rmSet(false);remindCheck();go('#debts-'+a.dataset.id)};
