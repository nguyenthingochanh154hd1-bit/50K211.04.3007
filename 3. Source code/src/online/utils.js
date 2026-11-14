/* Tiện ích thuần (không phụ thuộc trạng thái) cho trang đặt đơn online */
export const $=s=>document.querySelector(s);
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pad=(n,l)=>String(n).padStart(l,'0');
export const noAcc=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
