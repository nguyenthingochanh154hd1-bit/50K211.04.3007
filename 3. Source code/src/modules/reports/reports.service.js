import { API } from '../../services/api.js';

/* Báo cáo tính trong database (supabase/migrations/005_reports.sql), chỉ chủ tiệm gọi được.
 * Có bộ nhớ đệm theo tham số + số phiên bản dữ liệu để không hỏi lại khi chưa có thay đổi. */
const cache=new Map();
const qs=o=>Object.entries(o).map(([k,v])=>k+'='+encodeURIComponent(v==null?'':v)).join('&');

export async function fetchReport(kind,params,rev){
  const key=kind+'?'+qs(params);
  const hit=cache.get(key);
  if(hit&&hit.rev===rev)return hit.data;
  const data=await API.get('/api/reports?'+qs(Object.assign({kind},params)));
  cache.set(key,{rev,data});
  if(cache.size>40)cache.delete(cache.keys().next().value);
  return data
}
export const clearReportCache=()=>cache.clear();
export const reportsService={
  revenue:(f,rev)=>fetchReport('revenue',{from:f.from,to:f.to,type:f.type||'',svc:f.svc||'',ot:f.ot||'all'},rev),
  profit:(f,rev)=>fetchReport('profit',{from:f.from,to:f.to,ot:f.ot||'all'},rev),
  debt:(f,rev)=>fetchReport('debt',{from:f.from,to:f.to,type:f.type||'',cust:f.cust||'',svc:f.svc||''},rev),
  reconcile:(f,rev)=>fetchReport('reconcile',{from:f.from,to:f.to},rev)
};
