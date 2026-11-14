import { createResource } from './_lib/resource.js';

/* Công nợ khách sỉ (kèm đơn hàng/giỏ/khách hàng liên quan) – ghi nguyên tử */
const h = createResource('debts', ['debts', 'orders', 'baskets', 'customers']);

export async function GET(request: Request): Promise<Response> {
  return h.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return h.POST(request);
}
