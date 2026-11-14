const fs=require('fs');
const DB=JSON.parse(fs.readFileSync('t/legacy_state.json','utf8'));
const pad=(n,l=2)=>String(n).padStart(l,'0');
const isoD=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const addDays=(iso,n)=>{const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return isoD(d)};
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const G={cust:id=>DB.customers.find(c=>c.id===id),ctype:id=>DB.custTypes.find(t=>t.id===id),svc:id=>DB.services.find(s=>s.id===id)};
const isSi=c=>{const t=c&&G.ctype(c.type);return !!t&&norm(t.name).includes('si')};
const sub=o=>o.lines.reduce((a,l)=>a+(+l.qty||0)*(+l.price||0),0);
const total=o=>{const s=sub(o);if(s<=0)return 0;return Math.max(30000,s+(+o.phuThu||0)-(+o.giamGia||0))};
const src=fs.readFileSync('/tmp/work/out/src/modules/reports/reports.js','utf8').split('\n');
eval(src.slice(9,16).join('\n').replace(/^function /gm,'function ')); // revOrders, revCalc, revData
globalThis.revData=revData;
function profit(st){const weeks=[];let s=st.from;let guard=0;while(s<=st.to&&guard++<60){const e=addDays(s,6)>st.to?st.to:addDays(s,6);weeks.push([s,e]);s=addDays(e,1)}
 return weeks.map(([a,b])=>{const d=revData({from:a,to:b,type:'',svc:'',ot:st.ot});const cp=DB.expenses.filter(x=>x.date.slice(0,10)>=a&&x.date.slice(0,10)<=b).reduce((x,y)=>x+y.amount,0);return {a,b,gross:d.gross,real:d.real,cp,lg:d.gross-cp,lr:d.real-cp,n:d.rows.length}})}
function debt(st){let os=DB.orders.filter(o=>{const c=G.cust(o.custId);return isSi(c)&&!['Đã hủy','Chờ xác nhận'].includes(o.status)&&o.createdAt.slice(0,10)>=st.from&&o.createdAt.slice(0,10)<=st.to});
 if(st.cust)os=os.filter(o=>o.custId===st.cust);if(st.type)os=os.filter(o=>o.lines.some(l=>(G.svc(l.svcId)||{}).type===st.type));if(st.svc)os=os.filter(o=>o.lines.some(l=>l.svcId===st.svc));
 const by={};os.forEach(o=>{const b=by[o.custId]||(by[o.custId]={custId:o.custId,tot:0,paid:0,n:0});b.tot+=total(o);if(o.status==='Đã thanh toán')b.paid+=total(o);b.n++});return Object.values(by).sort((a,b)=>a.custId.localeCompare(b.custId))}
const out=[];
const today=isoD(new Date());const from=addDays(today,-40);
const cases=[{from,to:today,type:'',svc:'',ot:'all'},{from,to:today,type:'LDV01',svc:'',ot:'all'},{from,to:today,type:'',svc:'DV00000008',ot:'offline'},{from,to:today,type:'LDV02',svc:'',ot:'online'},{from:addDays(today,-12),to:addDays(today,-2),type:'',svc:'DV00000011',ot:'all'}];
for(const f of cases){const d=revData(f);out.push({k:'rev',f,real:d.real,gross:d.gross,rows:d.rows.map(r=>({id:r.o.id,total:r.total,real:r.real,debt:r.debt,gross:r.gross})).sort((a,b)=>a.id.localeCompare(b.id)),bySvc:d.bySvc.map(b=>({svcId:b.svcId,real:b.real,gross:b.gross})).sort((a,b)=>a.svcId.localeCompare(b.svcId))})}
for(const ot of ['all','online','offline'])out.push({k:'profit',f:{from,to:today,ot},w:profit({from,to:today,ot})});
for(const f of [{from,to:today,type:'',cust:'',svc:''},{from,to:today,type:'LDV01',cust:'KH00000002',svc:''},{from,to:today,type:'',cust:'',svc:'DV00000012'}])out.push({k:'debt',f,rows:debt(f)});
fs.writeFileSync('t/js_reports.json',JSON.stringify(out));console.log('cases',out.length);
