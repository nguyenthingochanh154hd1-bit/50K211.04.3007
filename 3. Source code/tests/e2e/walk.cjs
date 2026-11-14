const {chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BASE='http://localhost:5099';
const sh=q=>execSync(`psql -h /tmp -p 55432 -U pgt -d cl -qtA -c "${q.replace(/"/g,'\\"')}"`).toString().trim();
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
 const R=[];const ok=(n,c,i)=>{R.push([c?'PASS':'FAIL',n,c?'':String(i||'')])};
 await pg.goto(BASE+'/');await pg.waitForSelector('#lform');
 ok('login view, no demo text',!(await pg.content()).includes('cherry123')&&!(await pg.content()).includes('DEMO'));
 await pg.screenshot({path:'t/e2e/shots/login.png'});
 await pg.fill('#lu','kimvui');await pg.fill('#lp','wrongpass');await pg.click('#lform .go');await pg.waitForFunction(()=>document.querySelector('#lerr').textContent.length>0);
 ok('wrong password message',(await pg.textContent('#lerr')).includes('không thành công'),await pg.textContent('#lerr'));
 await pg.fill('#lp','ChangeMe!2026');await pg.click('#lform .go');await pg.waitForSelector('.side',{timeout:8000});
 ok('login ok -> #orders-new',pg.url().endsWith('#orders-new'),pg.url());
 const navs=await pg.$$eval('.nav > a span',e=>e.map(x=>x.textContent));ok('owner sees 9 nav items',navs.length===9,navs.join('|'));
 const routes=['#orders-new','#orders','#orders-DH00000006','#orders-DH00000006-edit','#orders-DH00000005-slip','#orders-DH00000001-invoice','#svc-types','#services','#cust-types','#customers','#customers-KH00000002','#debts','#debts-CN00000001','#expenses','#reports-revenue','#reports-profit','#reports-debt','#payments','#baskets','#shop','#account'];
 for(const h of routes){errs.length=0;await pg.evaluate(h=>{location.hash=h},h);await pg.waitForTimeout(500);
  const bad=await pg.evaluate(()=>/Không tìm thấy trang/.test(document.body.innerText));const txt=await pg.evaluate(()=>document.querySelector('#app').innerText.length);
  ok('route '+h,!bad&&txt>40&&!errs.length,(bad?'notfound ':'')+txt+' '+errs.join(';'));
  await pg.screenshot({path:'t/e2e/shots/'+h.slice(1).replace(/[^A-Za-z0-9]/g,'_')+'.png'})}
 // reports show data
 await pg.evaluate(()=>{location.hash='#reports-revenue'});await pg.waitForTimeout(600);
 await pg.fill('#rp_from','2026-10-01');await pg.click('[data-act=rev-apply]');await pg.waitForTimeout(1200);
 const rev=await pg.evaluate(()=>document.querySelector('#app').innerText);ok('revenue shows totals',/Tổng doanh thu thực/.test(rev)&&/1\.430\.000/.test(rev),rev.slice(0,400));
 await pg.screenshot({path:'t/e2e/shots/rev_data.png'});
 // profit
 await pg.evaluate(()=>{location.hash='#reports-profit'});await pg.waitForTimeout(300);await pg.fill('#rp_from','2026-10-04');await pg.click('[data-act=prof-apply]');await pg.waitForTimeout(1200);
 const prof=await pg.evaluate(()=>document.querySelector('#app').innerText);ok('profit shows table',/Lợi nhuận theo thời gian/.test(prof)&&/Chi phí cửa hàng/.test(prof),prof.slice(0,300));
 await pg.screenshot({path:'t/e2e/shots/profit_data.png'});
 // add service type through UI (simple crud)
 await pg.evaluate(()=>{location.hash='#svc-types'});await pg.waitForSelector('[data-act=st-add],[data-act$="-add"]');await pg.click('.topbar [data-act$="-add"]');await pg.waitForSelector('#m_name');
 await pg.fill('#m_name','Giặt hấp UI-test');await pg.click('#mSave');await pg.waitForTimeout(1500);
 ok('svc type saved in DB',sh("select count(*) from loai_dich_vu where ten_loai_dv='Giặt hấp UI-test'")==='1',sh("select ten_loai_dv from loai_dich_vu"));
 // reload -> persisted + session kept
 await pg.reload();await pg.waitForSelector('.side',{timeout:8000});await pg.evaluate(()=>{location.hash='#svc-types'});await pg.waitForTimeout(500);
 ok('persist after reload',(await pg.evaluate(()=>document.querySelector('#app').innerText)).includes('Giặt hấp UI-test'));
 // order status action: deliver DH00000006
 errs.length=0;await pg.evaluate(()=>{location.hash='#orders-DH00000006'});await pg.waitForTimeout(500);
 const acts=await pg.$$eval('[data-act]',e=>e.map(x=>x.dataset.act).filter(a=>/^ord-/.test(a)));ok('order detail actions',acts.length>0,acts.join(','));
 if(acts.includes('ord-deliver')){await pg.click('[data-act=ord-deliver]');await pg.waitForTimeout(800);const dlg=await pg.$('#mSave,.dlg .btn.pri');if(dlg){await dlg.click();await pg.waitForTimeout(800)}await pg.waitForTimeout(1200);
  ok('deliver persisted',sh("select trang_thai from don_hang where ma_don_hang='DH00000006'")==='Đã giao',sh("select trang_thai from don_hang where ma_don_hang='DH00000006'"))}
 // logout
 await pg.evaluate(()=>{location.hash='#account'});await pg.waitForTimeout(400);await pg.click('[data-act=logout]');await pg.waitForSelector('.dlg .btn.red,.dlg .btn.pri',{timeout:3000}).catch(()=>{});
 const yes=await pg.$('.dlg .btn.red,.dlg .btn.pri');if(yes)await yes.click();await pg.waitForSelector('#lform',{timeout:5000});ok('logout -> login view',true);
 await pg.goto(BASE+'/#orders');await pg.waitForSelector('#lform');ok('no session -> login',true);
 console.log(R.map(r=>r.join(' ')).join('\n'));console.log('remaining errors:',errs.slice(0,5));
 await br.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
