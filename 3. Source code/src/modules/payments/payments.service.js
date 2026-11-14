import { API, registerResource } from '../../services/api.js';

/* Phương thức thanh toán & thông tin cửa tiệm – khai báo tài nguyên đồng bộ với máy chủ (/api/payments) */
registerResource('payments',{endpoint:'/api/payments',colls:['pays','shops'],group:1});
export const paymentsService={
  endpoint:'/api/payments',
  /* lấy danh sách mới nhất từ máy chủ (giao diện thường dùng DB đã đồng bộ sẵn) */
  list:()=>API.get('/api/payments')
};
