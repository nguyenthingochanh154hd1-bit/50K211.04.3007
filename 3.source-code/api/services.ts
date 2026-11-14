import { createResource } from './_lib/resource.js';

/* Dịch vụ & loại dịch vụ */
const h = createResource('services', ['svcTypes', 'services']);

export async function GET(request: Request): Promise<Response> {
  return h.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return h.POST(request);
}
