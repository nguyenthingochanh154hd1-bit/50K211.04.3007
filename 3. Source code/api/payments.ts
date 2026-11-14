import { createResource } from './_lib/resource.js';

/* Phương thức thanh toán & thông tin cửa tiệm */
const h = createResource('payments', ['pays', 'shops']);

export async function GET(request: Request): Promise<Response> {
  return h.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return h.POST(request);
}
