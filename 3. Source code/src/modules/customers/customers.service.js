import { API, registerResource } from '../../services/api.js';

/* Khách hàng & loại khách hàng – khai báo tài nguyên đồng bộ với máy chủ (/api/customers) */
registerResource('customers',{endpoint:'/api/customers',colls:['custTypes','customers'],group:1});
export const customersService={
  endpoint:'/api/customers',
  /* lấy danh sách mới nhất từ máy chủ (giao diện thường dùng DB đã đồng bộ sẵn) */
  list:()=>API.get('/api/customers')
};
