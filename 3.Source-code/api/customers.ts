import { createResource } from './_lib/resource.js';

/* Khách hàng & loại khách hàng */
const h = createResource('customers', ['custTypes', 'customers']);

export async function GET(request: Request): Promise<Response> {
  return h.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return h.POST(request);
}
