import { API } from '../../services/api.js';

/* Thông tin cửa tiệm đi chung /api/payments (cùng nhóm cấu hình tiệm); xem payments.service.js */
export const shopsService={
  endpoint:'/api/payments',
  list:()=>API.get('/api/payments?resource=shops')
};
