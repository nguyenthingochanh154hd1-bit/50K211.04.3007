import { API } from '../../services/api.js';

/* Giỏ đựng được ghi cùng đơn hàng (đơn nhận/trả giỏ) nên đi chung /api/orders; xem orders.service.js */
export const basketsService={
  endpoint:'/api/orders',
  list:()=>API.get('/api/orders?resource=baskets')
};
