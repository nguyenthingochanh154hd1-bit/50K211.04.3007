import { createResource } from './_lib/resource.js';

/* Chi phí cửa hàng (chỉ chủ tiệm – database từ chối với nhân viên) */
const h = createResource('expenses', ['expenses']);

export async function GET(request: Request): Promise<Response> {
  return h.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return h.POST(request);
}
