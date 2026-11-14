const {chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs=require('fs');
const orig=fs.readFileSync('../sys/frontend/css/styles.css','utf8');
const split=['variables','layout','components','forms','responsive'].map(f=>fs.readFileSync('cherry-laundry/src/styles/'+f+'.css','utf8')).join('\n');
(async()=>{const br=await chromium.launch();const pg=await br.newPage({viewport:{width:1440,height:900}});
 await pg.goto('http://localhost:5099/');await pg.waitForSelector('#lform');
 const routes=['#login','#orders','#orders-new','#orders-DH00000006','#orders-DH00000005-invoice','#orders-DH00000005-slip','#svc-types','#services','#customers','#customers-KH00000002','#debts','#debts-CN00000001','#expenses','#reports-revenue','#reports-profit','#reports-debt','#payments','#baskets','#shop','#account'];
 let total=0,diffs=[];
 for(const h of routes){
  if(h==='#login'){}else{ if(!(await pg.$('.side'))){await pg.fill('#lu','kimvui');await pg.fill('#lp','ChangeMe!2026');await pg.click('#lform .go');await pg.waitForSelector('.side')}
   await pg.evaluate(h=>{location.hash=h},h);await pg.waitForTimeout(700)}
  for(const w of [1920,1440,1100,820,600]){
   await pg.setViewportSize({width:w,height:900});
   const res=await pg.evaluate(async({orig,split})=>{
    const links=[...document.querySelectorAll('link[rel=stylesheet][href="/main.css"]')];const saved=links.map(l=>l.disabled);links.forEach(l=>l.disabled=true);
    const snap=()=>{const out=[];document.querySelectorAll('#app *,#app').forEach((e,i)=>{const cs=getComputedStyle(e);const o=[];for(const p of cs){if(/^(animation|transition|-webkit-)/.test(p)||p==='block-size'||p==='inline-size')continue;o.push(p+':'+cs.getPropertyValue(p))}out.push(o.join(';'))});return out};
    const st=document.createElement('style');document.head.appendChild(st);
    const NT='*,*::before,*::after{transition:none!important;animation:none!important}';st.textContent=orig+NT;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const A=snap();
    st.textContent=split+NT;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const B=snap();
    st.remove();links.forEach((l,i)=>l.disabled=saved[i]);
    const d=[];A.forEach((a,i)=>{if(a!==B[i]){const pa=a.split(';'),pb=B[i].split(';');const ch=pa.filter((x,j)=>x!==pb[j]).slice(0,3);d.push(i+' '+ch.join(' | '))}});
    return {n:A.length,d}},{orig,split});
   total+=res.n;if(res.d.length)diffs.push(h+'@'+w+': '+res.d.length+' elems e.g. '+res.d.slice(0,2).join(' // '))}}
 console.log('elements compared',total);console.log(diffs.length?diffs.join('\n'):'IDENTICAL computed styles');await br.close()})();
