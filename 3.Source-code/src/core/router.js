import { shell } from './app.js';
import { AUTH, DB, can } from './state.js';
import { closeModal, emptyBox } from './ui.js';
import { vAccount } from '../modules/auth/account.js';
import { bindLogin, loginView } from '../modules/auth/login.js';
import { vBaskets } from '../modules/baskets/baskets.js';
import { vCustTypes } from '../modules/customers/customer-types.js';
import { vCustDetail, vCustomers } from '../modules/customers/customers.js';
import { vDebtDetail, vDebts } from '../modules/debts/debts.js';
import { remindCheck, rm, rmSet } from '../modules/debts/debts.reminders.js';
import { vExpenses } from '../modules/expenses/expenses.js';
import { vOrders } from '../modules/orders/orders.js';
import { vOrderDetail } from '../modules/orders/orders.detail.js';
import { vPOS } from '../modules/orders/orders.form.js';
import { vInvoice, vSlip } from '../modules/orders/orders.print.js';
import { vPays } from '../modules/payments/payments.js';
import { vDebtRep, vProfit, vRevDetail, vRevenue } from '../modules/reports/reports.js';
import { vSvcTypes } from '../modules/services/service-types.js';
import { vServices } from '../modules/services/services.js';
import { vShop } from '../modules/shops/shops.js';
import { $ } from '../utils/format.js';

export const go=h=>{if(location.hash===h)render();else location.hash=h};
const ROUTES=[
[/^#orders$/,vOrders],[/^#orders-new$/,()=>vPOS(null)],[/^#orders-([^-]+)-edit$/,vPOS],[/^#orders-([^-]+)-slip$/,vSlip],[/^#orders-([^-]+)-invoice$/,vInvoice],[/^#orders-([^-]+)$/,vOrderDetail],
[/^#svc-types$/,vSvcTypes],[/^#services$/,vServices],[/^#cust-types$/,vCustTypes],[/^#customers$/,vCustomers],[/^#customers-([^-]+)$/,vCustDetail],
[/^#debts$/,vDebts],[/^#debts-([^-]+)$/,vDebtDetail],[/^#expenses$/,vExpenses],
[/^#reports-revenue$/,vRevenue],[/^#reports-revenue-detail$/,vRevDetail],[/^#reports-profit$/,vProfit],[/^#reports-debt$/,vDebtRep],
[/^#payments$/,vPays],[/^#baskets$/,vBaskets],[/^#shop$/,vShop],[/^#account$/,vAccount]];
/* trang nào thuộc tài nguyên nào (để chặn trang không có quyền xem và ẩn nút Thêm/Sửa/Xóa) */
const RES=[[/^#orders/,'orders'],[/^#svc-types/,'svcTypes'],[/^#services/,'services'],[/^#cust-types/,'custTypes'],[/^#customers/,'customers'],[/^#debts/,'debts'],[/^#expenses/,'expenses'],[/^#reports/,'reports'],[/^#payments/,'pays'],[/^#baskets/,'baskets'],[/^#shop/,'shops']];
const resOf=h=>{const r=RES.find(x=>x[0].test(h));return r?r[1]:''};
function applyPerms(res){if(!res)return;const root=document.getElementById('app');
 const hide=(sel)=>root.querySelectorAll(sel).forEach(e=>e.classList.add('hide'));
 if(!can(res,'them'))hide('.topbar [data-act$="-add"],.btn.add');
 if(!can(res,'sua'))hide('[data-act$="-edit"]');
 if(!can(res,'xoa'))hide('[data-act$="-del"]')}
let lastHash=null;
export function render(){const app=$('#app');const h=location.hash||'#orders-new';const keep=h===lastHash?window.scrollY:0;
 if(!AUTH){if(h!=='#login'){history.replaceState(null,'','#login')}app.innerHTML=loginView();bindLogin();lastHash='#login';remindCheck();document.title='Đăng nhập · Cherry Laundry';return}
 if(h==='#login'||h==='#'||h===''){history.replaceState(null,'','#orders-new');return render()}
 const res=resOf(h);if(res&&DB.perms&&Object.keys(DB.perms).length&&!can(res,'xem')){history.replaceState(null,'','#orders-new');return render()}
 let v=null;for(const [re,fn] of ROUTES){const m=h.match(re);if(m){v=fn(m);break}}
 if(!v)v={nav:'',crumbs:[['Không tìm thấy trang']],html:`<div class="lc">${emptyBox('Không tìm thấy trang này.')}<div style="text-align:center;padding-bottom:24px"><button class="btn pri" data-act="nav" data-h="#orders-new">Về trang bán hàng</button></div></div>`};
 app.innerHTML=shell(v);lastHash=h;applyPerms(res);v.after&&v.after();window.scrollTo(0,keep);remindCheck();document.title=v.crumbs[v.crumbs.length-1][0]+' · Cherry Laundry'}
window.addEventListener('hashchange',()=>{if(rm.skip)rm.skip=0;else if(rm.show){rmSet(false)}closeModal();$('#side')&&$('#side').classList.remove('open');render()});
