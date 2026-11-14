import { API, registerResource } from '../../services/api.js';

/* Công nợ khách sỉ (kèm đơn/giỏ liên quan để ghi nguyên tử) – khai báo tài nguyên đồng bộ với máy chủ (/api/debts) */
registerResource('debts',{endpoint:'/api/debts',colls:['debts','orders','baskets','customers'],group:2});
export const debtsService={
  endpoint:'/api/debts',
  /* lấy danh sách mới nhất từ máy chủ (giao diện thường dùng DB đã đồng bộ sẵn) */
  list:()=>API.get('/api/debts')
};
