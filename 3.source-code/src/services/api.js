/* Lớp kết nối máy chủ cho giao diện Cherry Laundry (bản Vercel + Supabase, tự quản lý đăng nhập).
 *  - Đăng nhập qua /api/login (mật khẩu băm bcrypt trong database); mọi lời gọi /api/* kèm "Authorization: Bearer <token phiên>".
 *  - Giao diện vẫn giữ dữ liệu trong biến DB; mỗi lần save() chỉ gửi phần THAY ĐỔI (diff) tới đúng /api/<tài nguyên>.
 *  - Mỗi module khai báo tài nguyên của mình bằng registerResource() trong file *.service.js.
 *  - Cứ vài giây hỏi /api/state?rev=1; có thay đổi (vd. khách vừa đặt đơn online) thì gộp vào DB.
 */
import { DB, bumpSeq, emptyDB, replaceDB, setAuth } from '../core/state.js';
import { render } from '../core/router.js';
import { toast } from '../core/ui.js';
import { occupy } from '../modules/baskets/baskets.js';

/* Token phiên (do /api/login cấp) lưu trong sessionStorage: đóng tab là đăng xuất, an toàn cho máy dùng chung tại quầy */
const TK='cl_token';
const getToken=()=>{try{return sessionStorage.getItem(TK)}catch(e){return null}};
export const setToken=t=>{try{t?sessionStorage.setItem(TK,t):sessionStorage.removeItem(TK)}catch(e){}};

const COLLS=['shops','custTypes','customers','svcTypes','services','baskets','pays','expenses','orders','debts'];
const j=x=>JSON.stringify(x);

/* ---------- đăng ký tài nguyên (mỗi module một lần) ---------- */
const RES={};
/* group 1 = danh mục (gửi trước), group 2 = nghiệp vụ đơn/công nợ (gửi sau) */
export function registerResource(name,{endpoint,colls,group=1}){RES[name]={endpoint,colls,group}}
const collOwner=c=>Object.keys(RES).find(k=>RES[k].colls.includes(c));

/* Chia diff thành các yêu cầu theo thứ tự: danh mục trước, nghiệp vụ sau.
 * - đơn/giỏ/công nợ (+ khách hàng nếu cùng lúc tạo khách mới) đi chung MỘT yêu cầu để ghi nguyên tử.
 * - có công nợ -> /api/debts, ngược lại -> /api/orders. */
export function planRequests(ch){
  const has=c=>!!ch[c];const reqs=[];const done=new Set();
  const biz=['orders','baskets','debts'].some(has);
  const take=(endpoint,list)=>{const colls=list.filter(c=>has(c)&&!done.has(c));if(!colls.length)return;colls.forEach(c=>done.add(c));reqs.push({endpoint,colls})};
  take(RES.customers.endpoint,biz?['custTypes']:['custTypes','customers']);
  take(RES.services.endpoint,['svcTypes','services']);
  take(RES.payments.endpoint,['pays','shops']);
  take(RES.expenses.endpoint,['expenses']);
  if(biz)take(has('debts')?RES.debts.endpoint:RES.orders.endpoint,['customers','baskets','orders','debts']);
  COLLS.filter(c=>has(c)&&!done.has(c)).forEach(c=>take((RES[collOwner(c)]||{}).endpoint||'/api/orders',[c]));
  return reqs}

/* ---------- trạng thái đồng bộ ---------- */
let SNAP={},REV=0,timer=null,pushing=false,again=false,pollT=null,needRender=false,stT=0,started=false;
const stEl=()=>document.getElementById('syncst');
function setSt(k){const el=stEl();if(!el)return;clearTimeout(stT);el.className='on '+k;el.textContent={saving:'Đang lưu...',ok:'Đã lưu',off:'Mất kết nối - sẽ thử lại',err:'Không lưu được'}[k]||'';if(k==='ok')stT=setTimeout(()=>{el.className=''},1600)}

async function req(method,url,data,opt){
  const token=getToken();
  let r;
  try{r=await fetch(url,{method,keepalive:!!(opt&&opt.keepalive),headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:data===undefined?undefined:j(data)})}
  catch(e){const er=new Error('Lỗi đường truyền!');er.network=true;throw er}
  let b=null;try{b=await r.json()}catch(e){}
  if(!r.ok){const er=new Error((b&&(b.error||b.message))||('Lỗi '+r.status));er.status=r.status;er.body=b;if(r.status===401&&started)expired();throw er}
  return b}

function expired(){
  if(!started)return;started=false;stopPoll();clearTimeout(timer);timer=null;
  setToken(null);
  setAuth(false);replaceDB(emptyDB());location.hash='#login';render();toast('Phiên đăng nhập đã hết hạn','e','Vui lòng đăng nhập lại.')}

function snapshot(){SNAP={};COLLS.forEach(c=>{SNAP[c]={};(DB[c]||[]).forEach(x=>{SNAP[c][x.id]=j(x)})})}
/* đơn đang giữ giỏ thì giỏ phải hiển thị "Đầy" */
function normalize(){bumpSeq();DB.orders.forEach(o=>{if((o.status==='Chờ xác nhận'||(o.status==='Đã thanh toán'&&o.processing))&&o.basket)occupy(o.basket,true)})}

async function loadState(){const r=await req('GET','/api/state');replaceDB(r.state);REV=r.rev;snapshot();normalize();schedule()}

function diff(){const ch={};let n=0;
  COLLS.forEach(c=>{const cur={};(DB[c]||[]).forEach(x=>{cur[x.id]=x});const up=[],del=[];
    Object.keys(cur).forEach(id=>{const s=j(cur[id]);if(SNAP[c][id]!==s)up.push({doc:cur[id],new:!(id in SNAP[c]),_s:s})});
    Object.keys(SNAP[c]).forEach(id=>{if(!(id in cur))del.push(id)});
    if(up.length||del.length){ch[c]={upsert:up,delete:del};n+=up.length+del.length}});
  return {ch,n}}

function schedule(){if(!started)return;clearTimeout(timer);timer=setTimeout(push,350)}

async function push(keep){
  timer=null;if(!started)return;if(pushing){again=true;return}
  const {ch,n}=diff();if(!n)return;
  const plan=planRequests(ch);
  pushing=true;setSt('saving');
  try{
    let remote=false;
    for(const rq of plan){
      const sent={},payload={};
      rq.colls.forEach(c=>{sent[c]=ch[c];payload[c]={upsert:ch[c].upsert.map(u=>({doc:u.doc,new:u.new})),delete:ch[c].delete}});
      const r=await req('POST',rq.endpoint,{changes:payload,seq:DB.seq},{keepalive:!!keep===true});
      Object.keys(sent).forEach(c=>{sent[c].upsert.forEach(u=>{SNAP[c][u.doc.id]=u._s});sent[c].delete.forEach(id=>{delete SNAP[c][id]})});
      if(r.rev!==REV+1)remote=true;REV=r.rev}
    setSt('ok');
    if(remote)await pull(true)}
  catch(e){
    if(e.network){setSt('off');clearTimeout(timer);timer=setTimeout(push,5000)}
    else if(e.status===409||e.status===422||e.status===403){setSt('err');
      toast(e.status===409?'Dữ liệu vừa được thay đổi ở nơi khác':e.status===403?'Bạn không có quyền thực hiện thao tác này':'Không lưu được thay đổi','e',e.message);
      try{await loadState();render()}catch(_){}}
    else if(e.status!==401){setSt('err');toast('Không lưu được thay đổi','e',e.message)}}
  finally{pushing=false;if(again){again=false;schedule()}}}

/* gộp thay đổi từ máy chủ vào DB (không đè lên phần đang sửa chưa lưu) */
function merge(S){let changed=false;
  COLLS.forEach(c=>{const srv=S[c]||[];const srvMap={};srv.forEach(x=>{srvMap[x.id]=x});const local=DB[c]||[];const locMap={};local.forEach(x=>{locMap[x.id]=x});
    const out=[];
    local.forEach(x=>{const sx=srvMap[x.id];
      if(sx){const dirty=SNAP[c][x.id]!==undefined&&SNAP[c][x.id]!==j(x);
        if(dirty||j(sx)===j(x)){out.push(x);if(!dirty)SNAP[c][x.id]=j(x)}else{out.push(sx);SNAP[c][x.id]=j(sx);changed=true}}
      else{if(SNAP[c][x.id]===undefined){out.push(x)}            /* mới tạo ở máy này, chưa lưu */
        else if(SNAP[c][x.id]!==j(x)){out.push(x)}               /* đang sửa */
        else{changed=true;delete SNAP[c][x.id]}}});             /* đã bị xóa ở nơi khác */
    srv.forEach(sx=>{if(!locMap[sx.id]&&SNAP[c][sx.id]===undefined){out.push(sx);SNAP[c][sx.id]=j(sx);changed=true}});
    DB[c]=out});
  const sq=S.seq||{};DB.seq=DB.seq||{};Object.keys(sq).forEach(k=>{if(!(DB.seq[k]>=sq[k]))DB.seq[k]=sq[k]});
  if(S.account)DB.account=S.account;
  return {changed}}

async function pull(force){const r=await req('GET','/api/state');const m=merge(r.state);REV=r.rev;
  if(m.changed||force){normalize();safeRender()}}
function busy(){const m=document.getElementById('modal');if(m&&m.children.length)return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.closest('#app'))}
function safeRender(){if(busy()){needRender=true;return}needRender=false;render()}
async function tick(){if(!started||document.hidden||pushing||timer)return;if(needRender&&!busy()){needRender=false;render()}
  try{const r=await req('GET','/api/state?rev=1');if(r.rev!==REV)await pull(false)}catch(e){}}
function startPoll(){stopPoll();pollT=setInterval(tick,6000)}
function stopPoll(){if(pollT)clearInterval(pollT);pollT=null}

/* ---------- vòng đời ---------- */
/* sau khi đăng nhập thành công: tải dữ liệu rồi bắt đầu đồng bộ */
async function start(){started=true;try{await loadState()}catch(e){started=false;throw e}setAuth(true);startPoll()}
function stop(){setToken(null);started=false;stopPoll();clearTimeout(timer);timer=null;setAuth(false);replaceDB(emptyDB());SNAP={}}

function msg(html,color){const app=document.getElementById('app');app.innerHTML=`<div style="padding:40px;font:15px sans-serif;color:${color||'#555'}">${html}</div>`}
async function boot(){
  if(getToken()){msg('Đang tải dữ liệu...');
    try{await start()}
    catch(e){
      if(e.network){msg('Lỗi đường truyền! Không kết nối được máy chủ. <button onclick="location.reload()">Thử lại</button>','#B42318');return}
      setToken(null);setAuth(false)}}
  else setAuth(false);
  render()}

window.addEventListener('pagehide',()=>{if(timer){clearTimeout(timer);push(true)}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});

export const API={boot,start,stop,loadState,schedule,rev:()=>REV,post:(u,d)=>req('POST',u,d),get:u=>req('GET',u)};
