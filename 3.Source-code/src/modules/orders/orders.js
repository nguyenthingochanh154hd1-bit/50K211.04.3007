import { ACT } from '../../core/registry.js';
import { go, render } from '../../core/router.js';
import { DB, G, S, save, total } from '../../core/state.js';
import { actBtns, badge, ctBadge, filterBtn, fld, listCard, offline, paged, pager, searchBox, selHTML, val } from '../../core/ui.js';
import { occupy } from '../baskets/baskets.js';
import { swHTML } from '../customers/customers.js';
import { delOrder, editOrder } from './orders.detail.js';
import { pos } from './orders.form.js';
import { esc, fD, fT, norm, vnd } from '../../utils/format.js';

const isOnTab=o=>o.online&&(o.status==='Chờ xác nhận'||(o.status==='Đã hủy'&&!o.confirmedAt));
export const unitOf=l=>(G.svc(l.svcId)||{}).unit||'';
const qtyTxt=l=>(l.qty===''||l.qty==null||+l.qty===0)?'—':(+l.qty).toLocaleString('vi-VN',{minimumFractionDigits:unitOf(l)==='kg'?1:0})+' '+unitOf(l);
export function vOrders(){const st=S('orders',{tab:'all',f:{from:'',to:'',type:'',status:''},fopen:false});let arr=DB.orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 if(st.tab==='online')arr=arr.filter(isOnTab);else if(st.tab==='offline')arr=arr.filter(o=>!isOnTab(o));
 if(st.q){const q=norm(st.q);arr=arr.filter(o=>norm(o.id).includes(q))}
 const f=st.f;if(f.from)arr=arr.filter(o=>o.createdAt.slice(0,10)>=f.from);if(f.to)arr=arr.filter(o=>o.createdAt.slice(0,10)<=f.to);if(f.type)arr=arr.filter(o=>(G.cust(o.custId)||{}).type===f.type);if(f.status)arr=arr.filter(o=>o.status===f.status);
 const filtered=!!(f.from||f.to||f.type||f.status);
 const rows=paged('orders',arr,50).map(o=>{const c=G.cust(o.custId)||{};const canT=o.status==='Đã thanh toán';return `<tr><td class="code l" style="padding-left:24px" data-act="nav" data-h="#orders-${o.id}">${o.id}</td><td class="dt"><div class="dtw">${fD(o.createdAt.slice(0,10))}<small>${fT(o.createdAt)}</small></div></td><td><span class="cust"><span class="avatar"><svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true"><path d="M12 92C16 68 31 56 50 56S84 68 88 92" fill="none" stroke="#000" stroke-width="7"/><circle cx="50" cy="38" r="15" fill="#fff" stroke="#000" stroke-width="7"/></svg></span>${esc(c.name)}</span></td><td>${ctBadge(c)}</td><td>${badge(o.status)}</td><td>${swHTML(o.processing&&canT,!canT,canT?`data-act="tg-proc" data-id="${o.id}"`:'')}</td><td class="num" style="font-weight:700;font-size:13.2px;color:#20252C">${total(o)?vnd(total(o)):'—'}</td>${actBtns('ord',o.id).replace('ord-edit','ord-edit-row').replace('ord-del','ord-del-row')}</tr>`});
 const none=(st.q||filtered)?'Không tìm thấy đơn hàng nào':'Hiện chưa có thông tin đơn hàng nào!';
 const stOpts=['Chờ xác nhận','Đang xử lý','Đã giao','Chờ thanh toán','Đã thanh toán','Đã hủy'].map(s=>[s,s]);
 const pop=`<div class="f"><label>Ngày tạo đơn</label><div style="display:flex;gap:8px"><input class="inp" type="date" id="fl_from" value="${f.from}"><input class="inp" type="date" id="fl_to" value="${f.to}"></div></div>${fld({id:'fl_type',label:'Loại khách hàng',html:selHTML('fl_type',DB.custTypes.map(t=>[t.id,t.name]),f.type,'Tất cả')})}${fld({id:'fl_status',label:'Trạng thái',html:selHTML('fl_status',stOpts,f.status,'Tất cả')})}<div style="display:flex;justify-content:flex-end"><button class="btn apply" data-act="fapply-od">Áp dụng</button></div>`;
 return {nav:'orders',crumbs:[['Quản lý bán hàng','#orders-new'],['Danh sách đơn hàng']],html:`<div class="topbar"><div class="tabs">${[['all','Tất cả'],['offline','Đơn offline'],['online','Đơn online']].map(t=>`<button class="${st.tab===t[0]?'on':''}" data-act="tab" data-k="orders" data-v="${t[0]}">${t[1]}</button>`).join('')}</div></div>${listCard({title:'Danh sách đơn hàng',tools:searchBox('orders')+filterBtn('orders',pop,filtered),head:'<th class="l oh7" style="padding-left:24px">Mã đơn hàng</th><th>Ngày tạo đơn</th><th>Tên khách hàng</th><th>Loại khách hàng</th><th>Trạng thái</th><th>Ghi chú</th><th class="num">Tổng tiền</th><th></th>',rows,none})}${pager('orders',arr.length,50)}`}}
ACT['fapply-od']=()=>{const st=S('orders');st.f={from:val('fl_from'),to:val('fl_to'),type:val('fl_type'),status:val('fl_status')};st.page=1;st.fopen=false;render()};
ACT['ord-new']=()=>{pos.cur=null;go('#orders-new')};
ACT['ord-edit-row']=a=>editOrder(a.dataset.id);
ACT['ord-del-row']=a=>delOrder(a.dataset.id,false);
ACT['tg-proc']=a=>{if(offline('Cập nhật thất bại!'))return;const o=G.order(a.dataset.id);o.processing=!o.processing;if(o.status==='Đã thanh toán'&&o.basket)occupy(o.basket,!!o.processing);save();render()};
