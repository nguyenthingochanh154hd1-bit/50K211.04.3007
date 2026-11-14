import { API, registerResource } from '../../services/api.js';

/* Đơn hàng + giỏ đựng (+ khách hàng tạo cùng lúc) – ghi nguyên tử qua /api/orders */
registerResource('orders',{endpoint:'/api/orders',colls:['orders','baskets','debts','customers'],group:2});
export const ordersService={
  endpoint:'/api/orders',
  list:()=>API.get('/api/orders')
};
