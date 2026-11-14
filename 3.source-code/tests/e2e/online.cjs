const {chromium,devices}=require('/home/claude/.npm-global/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BASE='http://localhost:5099';
const sh=q=>execSync(`psql -h /tmp -p 55432 -U pgt -d cl -qtA -c "${q.replace(/"/g,'\\"')}"`).toString().trim();
const R=[];const ok=(n,c,i)=>R.push((c?'PASS ':'FAIL ')+n+(c?'':' :: '+i));
const api=(m,b)=>fetch(BASE+'/api/online',{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(async r=>({s:r.status,j:await r.json()}));
const jpg='data:image/jpeg;base64,'+require('fs').readFileSync('/tmp/basket1.jpg').toString('base64');
(async()=>{const br=await chromium.launch();
 const ctx=await br.newContext({...devices['iPhone 12']});const m=await ctx.newPage();m.errs=[];m.on('pageerror',e=>m.errs.push(e.message));
 await m.goto(BASE+'/online/');await m.waitForSelector('.s-home');
 ok('home shows shop phone from server',(await m.innerText('.s-home')).includes('0905 117 311'));
 ok('home hides nothing broken (no netErr alert)',(await m.$$('.s-home .alert')).length===0);
 await m.click('[data-h="#new"]');await m.fill('#ph','0911 222 333');await m.click('#okbtn');await m.waitForSelector('#name');
 ok('create form contact prefilled + readonly',(await m.inputValue('#contact'))==='0911222333'&&await m.$eval('#contact',e=>e.readOnly));
 await m.fill('#name','Nguyen Test');await m.fill('#addr','12 Le Loi');
 await m.selectOption('#type','LDV01');await m.selectOption('#svc','DV00000008');
 await m.selectOption('#mt0','LDV02');await m.selectOption('#ms0','DV00000011');
 await m.click('[data-act=bk][data-b=G03]');
 await m.setInputFiles('#file',['/tmp/basket1.jpg','/tmp/basket2.png']);await m.waitForSelector('.thumbs .th img');
 ok('2 photo thumbnails (jpg + png compressed)',(await m.$$('.thumbs .th img')).length===2);
 await m.fill('#note','Ao trang giat rieng');
 await m.click('#sbtn');await m.waitForSelector('.s-ok',{timeout:15000});
 const doneTxt=await m.innerText('.s-ok');const code=(/DH\d{8}/.exec(doneTxt)||[])[0];
 ok('success screen with order code',!!code&&doneTxt.includes('Chờ xác nhận'),doneTxt);
 // --- database ---
 const st=sh(`select trang_thai||'|'||ma_gio||'|'||coalesce(ghi_chu,'') from don_hang where ma_don_hang='${code}'`);
 ok('db: order Chờ xác nhận, basket G03, note',st==='Chờ xác nhận|G03|Ao trang giat rieng',st);
 ok('db: 2 lines (qty 0) with current prices',sh(`select string_agg(ma_dich_vu||':'||khoi_so_luong||':'||don_gia,',' order by stt) from chi_tiet_don_hang where ma_don_hang='${code}'`)==='DV00000008:0.00:10000.00,DV00000011:0.00:10000.00');
 ok('db: online record with 2 photo paths',sh(`select cardinality(hinh_anh_gio_dung) from don_hang_online where ma_don_hang='${code}'`)==='2');
 ok('db: new retail customer created',sh(`select ten_khach_hang||'|'||thong_tin_lien_lac||'|'||ma_loai_kh from khach_hang where thong_tin_lien_lac='0911222333'`)==='Nguyen Test|0911222333|LKH01');
 ok('db: basket G03 Đầy',sh("select trang_thai from gio_dung where ma_gio='G03'")==='Đầy');
 const files=(await (await fetch(BASE+'/__storage')).json()).files;ok('storage: 2 jpg files saved',files.length===2&&files.every(f=>/^[0-9a-f-]{36}\/[12]\.jpg$/.test(f)),files.join());
 // --- staff sees it ---
 const sc=await br.newContext({viewport:{width:1440,height:900}});const s=await sc.newPage();s.errs=[];s.on('pageerror',e=>s.errs.push(e.message));
 await s.goto(BASE+'/');await s.fill('#lu','kimvui');await s.fill('#lp','ChangeMe!2026');await s.click('#lform .go');await s.waitForSelector('.side');
 await s.evaluate(()=>{location.hash='#orders'});await s.waitForTimeout(800);
 const listTxt=await s.innerText('#app');ok('staff list has the online order (Chờ xác nhận)',listTxt.includes(code)&&listTxt.includes('Chờ xác nhận'));
 await s.evaluate(c=>{location.hash='#orders-'+c},code);await s.waitForTimeout(800);
 const dtxt=await s.innerText('#app');ok('staff detail: creator is online customer',dtxt.includes('Khách đặt online')||dtxt.includes('Nguyen Test'),dtxt.slice(0,200));
 await s.click('[data-act=ord-photo][data-i="0"]');await s.waitForSelector('#modal img',{timeout:8000});
 await s.waitForFunction(()=>{const i=document.querySelector('#modal img');return i&&i.complete&&i.naturalWidth>0},null,{timeout:8000});
 ok('staff can open basket photo (signed url)',true);
 await s.click('#modal [data-act=close]');
 // --- customer tracking ---
 await m.goto(BASE+'/online/#track');await m.waitForSelector('#ph');await m.fill('#ph','+84 911 222 333'.replace('+84 ','0'));await m.click('#okbtn');await m.waitForSelector('.oc');
 ok('tracking lists the order',(await m.innerText('.s-pl')).includes(code));
 await m.click('.oc');await m.waitForSelector('.pg .th');
 await m.waitForFunction(()=>{const i=document.querySelector('.pg .th img');return i&&i.complete&&i.naturalWidth>0},null,{timeout:8000});
 ok('tracking detail shows photos',(await m.$$('.pg .th img')).length===2);
 await m.reload();await m.waitForSelector('.pg .th',{timeout:8000});ok('detail survives reload (session phone)',(await m.innerText('.s-pl')).includes(code));
 // --- API rules ---
 const base={name:'X',phone:'0911222333',services:['DV00000001'],basket:'G03',photos:[jpg]};
 let r=await api('POST',{op:'create',...base});ok('basket taken -> 409',r.s===409,JSON.stringify(r));
 ok('failed create leaves no orphan files',(await (await fetch(BASE+'/__storage')).json()).files.length===2);
 r=await api('POST',{op:'create',...base,basket:'G04',photos:['data:image/png;base64,AAAA']});ok('non-jpeg photo -> 422',r.s===422,JSON.stringify(r));
 r=await api('POST',{op:'create',...base,basket:'G04',photos:[]});ok('no photo -> 422',r.s===422);
 r=await api('POST',{op:'create',...base,basket:'G04',services:['DV99999999']});ok('unknown service -> 422',r.s===422);
 r=await api('POST',{op:'create',...base,basket:'G04',phone:'abc'});ok('bad phone -> 422',r.s===422);
 sh("insert into khach_hang values ('KH00000090','LKH02','Si','0902000000',null)");
 r=await api('POST',{op:'create',...base,basket:'G04',phone:'0902000000'});ok('wholesale phone -> 422',r.s===422&&/khách lẻ/.test(r.j.error),JSON.stringify(r));
 r=await api('POST',{op:'lookup',phone:'0902000000'});ok('wholesale lookup flagged',r.j.wholesale===true&&!r.j.orders);
 r=await api('POST',{op:'lookup',phone:'0999999999'});ok('unknown phone lookup -> found false',r.j.found===false);
 // per-phone cap: same phone, 2 more ok (3 total pending), 4th -> 429
 r=await api('POST',{op:'create',...base,basket:'G04'});ok('2nd pending ok',r.s===201,JSON.stringify(r));
 r=await api('POST',{op:'create',...base,basket:'G05'});ok('3rd pending ok',r.s===201,JSON.stringify(r));
 r=await api('POST',{op:'create',...base,basket:'G06'});ok('4th pending -> 429',r.s===429,JSON.stringify(r));
 // staff polling sees new orders
 await s.evaluate(()=>{location.hash='#orders'});await s.waitForTimeout(7500);
 ok('staff list shows 3 online orders after polling',((await s.innerText('#app')).match(/Chờ xác nhận/g)||[]).length>=3);
 // English UI
 const e=await br.newContext({...devices['iPhone 12']});const en=await e.newPage();await en.goto(BASE+'/online/');await en.click('[data-act=lang][data-l=en]');
 ok('English home',(await en.innerText('.s-home')).includes('Create Order'));
 // staff confirm keeps photos
 console.log(R.join('\n'));console.log('page errors:',m.errs.concat(s.errs));await br.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
