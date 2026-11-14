const {chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BASE='http://localhost:5099';
const sh=q=>execSync(`psql -h /tmp -p 55432 -U pgt -d cl -qtA -c "${q.replace(/"/g,'\\"')}"`).toString().trim();
const R=[];const ok=(n,c,i)=>R.push((c?'PASS ':'FAIL ')+n+(c?'':' :: '+i));
async function login(br,u,p){const ctx=await br.newContext({viewport:{width:1440,height:900}});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));
 await pg.goto(BASE+'/');await pg.fill('#lu',u);await pg.fill('#lp',p);await pg.click('#lform .go');await pg.waitForSelector('.side',{timeout:8000});return pg}
async function addCust(pg,name,phone){await pg.evaluate(()=>{location.hash='#customers'});await pg.waitForTimeout(400);await pg.click('.topbar [data-act$="-add"]');await pg.waitForSelector('#m_name');
 await pg.fill('#m_name',name);await pg.fill('#m_phone',phone);
 const t=await pg.$('#m_type');if(t){const tag=await t.evaluate(e=>e.tagName);if(tag==='SELECT')await t.selectOption({index:1});else await t.fill('Khách lẻ')}
 const a=await pg.$('#m_addr');if(a)await a.fill('1 Test');}
(async()=>{const br=await chromium.launch();
 const staff=await login(br,'kimvui','ChangeMe!2026'); /* phiên thứ hai của cùng một tài khoản (hai thiết bị) */
 const navs=await staff.$$eval('.nav > a span',e=>e.map(x=>x.textContent));ok('nav shows expenses/reports (no roles)',navs.includes('Quản lý chi phí')&&navs.includes('Theo dõi báo cáo')&&navs.includes('Quản lý bán hàng'),navs.join('|'));
 await staff.evaluate(()=>{location.hash='#reports-revenue'});await staff.waitForTimeout(500);ok('reports page reachable',staff.url().endsWith('#reports-revenue'),staff.url());
 await staff.evaluate(()=>{location.hash='#services'});await staff.waitForTimeout(500);
 ok('services has add button',(await staff.$$('.topbar [data-act$="-add"]:not(.hide)')).length>0);
 const tok=await staff.evaluate(()=>sessionStorage.getItem('cl_token'));
 const r1=await fetch(BASE+'/api/reports?kind=revenue&from=2026-01-01&to=2026-12-31',{headers:{Authorization:'Bearer '+tok}});ok('API reports 200',r1.status===200,r1.status);
 const r2=await fetch(BASE+'/api/state',{headers:{Authorization:'Bearer '+tok}}).then(r=>r.json());ok('state has expenses + account',r2.state.expenses.length>0&&r2.state.account.user==='kimvui'&&!('perms' in r2.state));
 const r3=await fetch(BASE+'/api/state',{headers:{Authorization:'Bearer bad.token.x'}});ok('bad token 401',r3.status===401,r3.status);
 // owner + concurrent
 const own=await login(br,'kimvui','ChangeMe!2026');
 const before=+sh("select count(*) from khach_hang");
 await addCust(own,'Race Owner','0911000001');await addCust(staff,'Race Staff','0911000002');
 const seen=[];const watch=pg=>pg.evaluate(()=>{window.__t=[];new MutationObserver(()=>{document.querySelectorAll('#toasts .toast').forEach(t=>window.__t.push(t.innerText))}).observe(document.querySelector('#toasts'),{childList:true,subtree:true})});
 await watch(own);await watch(staff);
 await Promise.all([own.click('#mSave'),staff.click('#mSave')]);
 await own.waitForTimeout(2500);await staff.waitForTimeout(2500);
 const after=+sh("select count(*) from khach_hang");ok('concurrent create same id: exactly one saved',after===before+1,before+' -> '+after);
 const toastTxt=(await own.evaluate(()=>window.__t.join('|')))+'##'+(await staff.evaluate(()=>window.__t.join('|')));
 ok('loser sees conflict toast',/thay đổi ở nơi khác|Không lưu/.test(toastTxt),toastTxt);
 // sync: staff-saved visible to owner via poll within 8s
 await addCust(staff,'Sync Staff','0911000003');await staff.click('#mSave');await staff.waitForTimeout(1200);
 ok('staff saved customer',sh("select count(*) from khach_hang where thong_tin_lien_lac='0911000003'")==='1');
 await own.evaluate(()=>{location.hash='#customers'});await own.waitForTimeout(7500);
 ok('owner sees staff customer via polling',(await own.evaluate(()=>document.querySelector('#app').innerText)).includes('Sync Staff'));
 // creator on staff-made data irrelevant; online order arrival toast
 sh("update he_thong set gia_tri=gia_tri where khoa='rev'");
 console.log(R.join('\n'));console.log('page errors:',own.errs.concat(staff.errs));await br.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
