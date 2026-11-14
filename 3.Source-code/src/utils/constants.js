import { esc, pad } from './format.js';

const ST_KEYS={};
export const BCLS={'Chờ xác nhận':'cx','Đang xử lý':'xl','Đã giao':'gh','Chờ thanh toán':'tt','Đã thanh toán':'ok','Đã hủy':'hu','Trống':'ok','Đầy':'tt'};
export const TAGN={'giat':['#2563EB','#DBEAFE'],'say':['#9333EA','#F3E8FF'],'ui':['#F97316','#FFEDD5'],'khac':['#EA3336','#FFE8E8']};
export const TAGC=[['#2563EB','#DBEAFE'],['#9333EA','#F3E8FF'],['#F97316','#FFEDD5'],['#EA3336','#FFE8E8'],['#0E9AA0','#E0F7F7'],['#0fa80f','#E7FEEA']];
export const TYORD=['giat','ui','say','khac'];
export const NAV=[
{k:'orders',t:'Quản lý bán hàng',i:'nReg',h:'#orders-new'},
{k:'svc',t:'Quản lý dịch vụ',i:'nGrid',h:'#svc-types',sub:[['svc-types','Loại dịch vụ','#svc-types'],['services','Thông tin dịch vụ','#services']]},
{k:'cust',t:'Quản lý khách hàng',i:'nUsers',h:'#customers',sub:[['cust-types','Loại khách hàng','#cust-types'],['customers','Thông tin khách hàng','#customers']]},
{k:'debts',t:'Quản lý công nợ',i:'nBook',h:'#debts'},
{k:'expenses',t:'Quản lý chi phí',i:'nCost',h:'#expenses'},
{k:'reports',t:'Theo dõi báo cáo',i:'nChart',h:'#reports-revenue',sub:[['rev','Báo cáo doanh thu','#reports-revenue'],['profit','Báo cáo lợi nhuận','#reports-profit'],['debtrep','Báo cáo công nợ','#reports-debt']]},
{k:'pays',t:'Phương thức thanh toán',i:'nPay',h:'#payments'},
{k:'baskets',t:'Quản lý giỏ đựng',i:'nBasket',h:'#baskets'},
{k:'shop',t:'Quản lý thông tin tiệm',i:'nStore',h:'#shop'}];
const TIMES=(()=>{const a=[];for(let h=7;h<=21;h++){a.push(pad(h)+':00');if(h<21)a.push(pad(h)+':30')}return a})();
export const LICO_GIAT='<span class="lico lico-giat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="10.4"/><circle cx="12" cy="12" r="4.6"/></svg></span>';
export const LICO_SAY='<span class="lico lico-say"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4c-2.2 2.5 2.2 5.5 0 8s2.2 5.5 0 8"/><path d="M12 4c-2.2 2.5 2.2 5.5 0 8s2.2 5.5 0 8"/><path d="M17 4c-2.2 2.5 2.2 5.5 0 8s2.2 5.5 0 8"/></svg></span>';
export const LICO_UI='<span class="lico lico-ui"><svg width="11.9" height="8.7" viewBox="0 0 24 17.5" fill="none" stroke="#F97316" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 15.8h21V8.2H9.5C5.6 8.2 2.6 11.2 1.5 15.8z"/><path d="M11 8.2c0-3.6 1.6-6.4 4.2-6.4h7.3v6.4"/></svg></span>';
export const FLOW_R=['Xác nhận','Đang xử lý','Chờ thanh toán','Đã thanh toán'],FLOW_S=['Đang xử lý','Chờ thanh toán','Đã giao','Đã thanh toán'];
export const SBD={'giat':['#E6F0FF','#1D4ED8'],'ui':['#FFEDD5','#C2410C'],'say':['#F3E8FF','#9333EA'],'khac':['#FFE8E8','#EA3336']};
export function BADGE_BIG(s){const m={'Chờ xác nhận':['#FFF8EC','#F8AD34'],'Đang xử lý':['#E6F0FF','#1D4ED8'],'Chờ thanh toán':['#F6E7FE','#6016C1'],'Đã thanh toán':['#E7FEEA','#16C116'],'Đã giao':['#E3F9FA','#0e8e92'],'Đã hủy':['#FFE9E9','#C0262D']}[s]||['#eee','#333'];return `<span class="bd big" style="background:${m[0]};color:${m[1]};border-color:${m[0]}">${esc(s)}</span>`}
export const PAYIC={cash:'<svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="#12263F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-10 29 14)"><rect x="16.5" y="2" width="20" height="25" rx="1.5" fill="#fff"/></g><g transform="rotate(-10 29 14)"><rect x="20" y="4" width="20" height="25" rx="1.5" fill="#E9F1FB"/><path d="M30 12l4.5 4.5L30 21l-4.5-4.5z"/><path d="M23 8h2M35 25h2"/></g><path d="M3 31l7-5c2-1.4 4-1 6 .4l7 .6c1.6.2 2.2 2.2.8 3l-6 .8 11-1.6c2-.3 3.6-1.6 5-3l3.5-3c1.4-1.2 3.2.4 2.2 2L32 38l-11 4-9 .5L3 38z" fill="#fff"/><path d="M3 31v8M16 27l6 .6"/></svg>',
bank:'<svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="26" height="40" rx="3.5" fill="#fff"/><path d="M4 8h26M4 38h26"/><rect x="2" y="17" width="42" height="14" rx="1.5" fill="#fff"/><rect x="8" y="19.5" width="30" height="9" fill="#000" stroke="none"/><path d="M25 22.1a2 2 0 0 0-1.8-.9h-.4a1.4 1.4 0 0 0 0 2.8h.5a1.4 1.4 0 0 1 0 2.8h-.4a2 2 0 0 1-1.8-.9M23 20v1.2M23 26.8v1.2" stroke="#fff" stroke-width="1.3"/><path d="M34 8h8M39 5l3 3-3 3M42 37h-8M37 34l-3 3 3 3"/></svg>'};
export const EN_T={'Giặt':'Wash','Sấy':'Dry','Ủi':'Iron','Khác':'Other'};
export const EN_SV={'giat men':'Blanket Wash','giat rem':'Curtain Wash','giat tham':'Carpet Wash','giat tham bong':'Carpet Wash','giat tay':'Hand Wash','giat giay':'Shoe Wash','giat mu':'Hat Wash','giat chan mong':'Thin Blanket Wash','giat quan ao':'Clothes Wash','giat thu nhoi bong':'Stuffed Toy Wash','giat balo':'Backpack Wash','say quan ao':'Clothes Drying','ui quan ao':'Clothes Ironing'};
export const DBADGE=s=>s==='Đã thanh toán'?'<span class="bd ok" style="min-width:87px">Đã thanh toán</span>':'<span class="bd tt" style="min-width:87px">Chờ thanh toán</span>';
export const BADRANGE='Thời gian không hợp lệ. Vui lòng chọn lại.';
