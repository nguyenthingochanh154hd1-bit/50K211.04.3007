import { API } from '../services/api.js';
import { diffDays, norm, pad, today } from '../utils/format.js';

/* Mã luôn tăng dần: mã đã xóa không bao giờ được dùng lại */
export const nextCode=(arr,prefix,len)=>{let m=0;arr.forEach(x=>{const n=parseInt(String(x.id).slice(prefix.length),10);if(!isNaN(n)&&n>m)m=n});const s=(typeof DB!=='undefined'&&DB&&DB.seq&&DB.seq[prefix])||0;if(s>m)m=s;return prefix+pad(m+1,len)};
export const bumpSeq=()=>{if(!DB)return;DB.seq=DB.seq||{};Object.keys(DB).forEach(k=>{const v=DB[k];if(Array.isArray(v))v.forEach(x=>{const r=x&&/^([A-Z]+)(\d+)$/.exec(String(x.id));if(r){const n=+r[2];if(!(DB.seq[r[1]]>=n))DB.seq[r[1]]=n}})})};
export const emptyDB=()=>({v:1,account:{user:'',name:'',phone:''},shops:[],custTypes:[],customers:[],svcTypes:[],services:[],baskets:[],pays:[],expenses:[],orders:[],debts:[],seq:{}});
/* DB là một đối tượng duy nhất dùng chung cho mọi module; replaceDB ghi đè nội dung tại chỗ để các module không phải đổi tham chiếu */
export const DB=emptyDB();
export function replaceDB(next){Object.keys(DB).forEach(k=>delete DB[k]);Object.assign(DB,emptyDB(),next||{});return DB}
export function save(){bumpSeq();API.schedule()}
/* Phân quyền phía giao diện (chỉ để ẩn nút/menu cho gọn; quyền thật do database kiểm tra) */
export const can=()=>true; /* một người dùng duy nhất: không phân quyền */
export const G={cust:id=>DB.customers.find(c=>c.id===id),ctype:id=>DB.custTypes.find(t=>t.id===id),svc:id=>DB.services.find(s=>s.id===id),stype:id=>DB.svcTypes.find(t=>t.id===id),order:id=>DB.orders.find(o=>o.id===id),debt:id=>DB.debts.find(d=>d.id===id),pay:id=>DB.pays.find(p=>p.id===id)};
export const isSi=c=>{const t=c&&G.ctype(c.type);return !!t&&norm(t.name).includes('si')};
export const sub=o=>o.lines.reduce((a,l)=>a+(+l.qty||0)*(+l.price||0),0);
export const total=o=>{const s=sub(o);if(s<=0)return 0;return Math.max(30000,s+(+o.phuThu||0)-(+o.giamGia||0))};
export const debtTotal=d=>d.orderIds.map(G.order).filter(o=>o&&o.status!=='Đã hủy').reduce((a,o)=>a+total(o),0);
export const debtDay=d=>diffDays(today(),d.start)+1;
export const shop=()=>DB.shops[0]||{name:'Cherry Laundry',addr:'',contact:'',bank:'',acc:''};
const STATE={};
export const S=(k,def)=>STATE[k]||(STATE[k]=Object.assign({q:'',page:1},def||{}));
export let AUTH=false;
export const setAuth=v=>{AUTH=v};
