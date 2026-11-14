import { API, registerResource } from '../../services/api.js';

/* Chi phí cửa hàng (chỉ chủ tiệm) – khai báo tài nguyên đồng bộ với máy chủ (/api/expenses) */
registerResource('expenses',{endpoint:'/api/expenses',colls:['expenses'],group:1});
export const expensesService={
  endpoint:'/api/expenses',
  /* lấy danh sách mới nhất từ máy chủ (giao diện thường dùng DB đã đồng bộ sẵn) */
  list:()=>API.get('/api/expenses')
};
