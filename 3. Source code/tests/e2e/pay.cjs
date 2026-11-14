const {chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright');
const {execSync}=require('child_process');
const sh=q=>execSync(`psql -h /tmp -p 55432 -U pgt -d cl -qtA -c "${q.replace(/"/g,'\\"')}"`).toString().trim();
(async()=>{const br=await chromium.launch();const pg=await br.newPage({viewport:{width:1440,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:5099/');await pg.fill('#lu','kimvui');await pg.fill('#lp','ChangeMe!2026');await pg.click('#lform .go');await pg.waitForSelector('.side');
await pg.evaluate(()=>{location.hash='#orders-DH00000005'});await pg.waitForTimeout(400);await pg.click('[data-act=ord-pay]');await pg.waitForTimeout(400);
console.log(await pg.$$eval('#modal [data-act],#modal button,#modal label,#modal input',e=>e.map(x=>x.tagName+':'+(x.dataset.act||x.id||x.className||'')+':'+(x.innerText||x.value||'').slice(0,20)).join(' | ')));
await pg.click('#modal >> text=Tiền mặt').catch(()=>{});await pg.click('#modal >> text=Lưu');await pg.waitForTimeout(1800);
console.log('DH5:',sh("select trang_thai||' pay='||coalesce(ma_pttt,'-')||' paidAt='||coalesce(thoi_gian_thanh_toan::text,'-') from don_hang where ma_don_hang='DH00000005'"),'| invoice paid:',sh("select thoi_gian_thanh_toan is not null from hoa_don where ma_don_hang='DH00000005'"));
// debt pay
await pg.evaluate(()=>{location.hash='#debts-CN00000001'});await pg.waitForTimeout(500);
console.log('debt acts:',await pg.$$eval('#app [data-act]',e=>[...new Set(e.map(x=>x.dataset.act))].join(',')));
console.log('errs',errs);await br.close()})();
