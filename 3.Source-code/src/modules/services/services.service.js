import { API, registerResource } from '../../services/api.js';

/* Dịch vụ & loại dịch vụ – khai báo tài nguyên đồng bộ với máy chủ (/api/services) */
registerResource('services',{endpoint:'/api/services',colls:['svcTypes','services'],group:1});
export const servicesService={
  endpoint:'/api/services',
  /* lấy danh sách mới nhất từ máy chủ (giao diện thường dùng DB đã đồng bộ sẵn) */
  list:()=>API.get('/api/services')
};
