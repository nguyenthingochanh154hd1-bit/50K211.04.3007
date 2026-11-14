const {chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright');
const {execSync}=require('child_process');
const sh=q=>execSync(`psql -h /tmp -p 55432 -U pgt -d cl -qtA -c "${q.replace(/"/g,'\\"')}"`).toString().trim();
(async()=>{const br=await chromium.launch();const pg=await br.newPage({viewport:{width:1440,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:5099/');await pg.fill('#lu','kimvui');await pg.fill('#lp','ChangeMe!2026');await pg.click('#lform .go');await pg.waitForSelector('.side');
await pg.evaluate(()=>{location.hash='#debts-CN00000003'});await pg.waitForTimeout(500);await pg.click('[data-act=debt-pay]');await pg.waitForTimeout(500);
await pg.click('#modal >> text=Chuyển khoản');await pg.click('#modal >> text=Lưu');await pg.waitForTimeout(2000);
console.log('debt:',sh("select trang_thai_cong_no||' '||ma_pttt from cong_no_khach_si where ma_cong_no='CN00000003'"),'orders:',sh("select string_agg(trang_thai||'/'||coalesce(ma_pttt,'-'),',') from don_hang where ma_cong_no='CN00000003'"),'baskets full:',sh("select string_agg(ma_gio,',') from gio_dung where trang_thai='Đầy'"));
console.log('errs',errs);await br.close()})();
