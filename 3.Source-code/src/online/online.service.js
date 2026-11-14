/* Gọi API công khai /api/online (không cần đăng nhập). Mọi luật nghiệp vụ do máy chủ + database kiểm tra. */
async function req(method, body) {
  let r;
  try {
    r = await fetch('/api/online', { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    const err = new Error('network'); err.network = true; throw err;
  }
  let j = null;
  try { j = await r.json(); } catch (e) { /* không phải JSON */ }
  if (!r.ok) { const err = new Error((j && j.error) || 'Lỗi máy chủ'); err.status = r.status; throw err; }
  return j;
}

/* Đơn từ máy chủ -> dạng giao diện dùng */
export const toUi = (o) => ({
  id: o.id, name: o.name, contact: o.contact, basket: o.basket, note: o.note || '', status: o.status,
  at: o.createdAt, svc: (o.svcs || [])[0], more: (o.svcs || []).slice(1), pay: o.pay || null, photos: o.photoUrls || []
});

export const fetchCatalog = () => req('GET');
export const lookupOrders = (phone) => req('POST', { op: 'lookup', phone });
export const createOrder = (p) => req('POST', Object.assign({ op: 'create' }, p));
