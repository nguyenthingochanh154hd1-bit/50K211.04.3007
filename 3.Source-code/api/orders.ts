import { createResource } from './_lib/resource.js';

/* Đơn hàng + giỏ đựng (+ công nợ, khách hàng tạo cùng lúc) – ghi nguyên tử */
const h = createResource('orders', ['orders', 'baskets', 'debts', 'customers']);

export async function GET(request: Request): Promise<Response> {
  return h.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return h.POST(request);
}
