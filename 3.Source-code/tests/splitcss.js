// Tách styles.css thành 5 file giữ nguyên thứ tự tương đối trong từng file.
const fs=require('fs');
let src=fs.readFileSync(process.argv[2],'utf8');
// '.pos .two' trong @media bị ghi đè hằng định bởi quy tắc .pos .two{...repeat(2,...)} đứng sau -> bỏ phần chết để chuyển @media xuống cuối không đổi kết quả
src=src.replace('.pos .recv,.pos .two{grid-template-columns:1fr}','.pos .recv{grid-template-columns:1fr}');
const out=process.argv[3];
// 1) cắt thành các khối cấp cao nhất (giữ lại comment đứng trước khối)
const blocks=[];let i=0,n=src.length,start=0,depth=0,inStr=null,inCom=false;
for(i=0;i<n;i++){const c=src[i],d=src[i+1];
 if(inCom){if(c==='*'&&d==='/'){inCom=false;i++;if(depth===0){blocks.push({t:'comment',s:src.slice(start,i+1)});start=i+1}}continue}
 if(inStr){if(c==='\\')i++;else if(c===inStr)inStr=null;continue}
 if(c==='/'&&d==='*'){ if(depth===0&&src.slice(start,i).trim()){} inCom=true;i++;continue}
 if(c==='"'||c==="'"){inStr=c;continue}
 if(c==='{')depth++;
 else if(c==='}'){depth--;if(depth===0){blocks.push({t:'rule',s:src.slice(start,i+1)});start=i+1}}
 else if(c===';'&&depth===0){blocks.push({t:'rule',s:src.slice(start,i+1)});start=i+1}}
if(src.slice(start).trim())blocks.push({t:'tail',s:src.slice(start)});
// 2) phân loại
const F={variables:[],layout:[],components:[],forms:[],responsive:[]};
const LAYOUT=/^(\*|html|body|button|input,select,textarea|svg|\.hide|\.inter|#app|\.side|\.brand|\.nav|\.acct|\.main|\.content|\.top|\.topbar|\.crumbs|\.burger|#side|\.pg|\.wrap)/;
const FORMS=/(^|[\s,>+~(])(input|select|textarea|label)\b|\.inp\b|\.fi\b|\.pw\b|\.fld\b|\.f\b|\.err\b|\.sel\b|\.chk\b|\.usw\b|\.radio\b|\.ta\b|\.pick|\.combo|\.sw\b|\.dd\b/;
let pendingComments=[];
const sel=s=>s.slice(0,s.indexOf('{')).trim();
const stats={};
blocks.forEach(b=>{
 if(b.t==='comment'){pendingComments.push(b.s);return}
 const t=b.s.trim();let k;
 if(t.startsWith('@media')||t.startsWith('@supports'))k='responsive';
 else if(t.startsWith('@'))k='components';  // @keyframes, @font-face...
 else{const s=sel(t);
  if(/^:root\b/.test(s))k='variables';
  else if(LAYOUT.test(s)&&!FORMS.test(s))k='layout';
  else if(FORMS.test(s.split(',')[0]))k='forms';
  else k='components'}
 F[k].push(...pendingComments.map(c=>c.trim()),b.s.trim());pendingComments=[];stats[k]=(stats[k]||0)+1});
const H={variables:'Biến thiết kế (màu, kích thước) và thiết lập gốc của :root',layout:'Khung trang: reset, thân trang, thanh bên, thanh trên, vùng nội dung',components:'Thành phần giao diện: nút, bảng danh sách, nhãn, popup, thông báo, POS, chi tiết, báo cáo, công nợ, đăng nhập, phiếu in',forms:'Ô nhập liệu, nhãn, thông báo lỗi, bộ chọn, ô tìm kiếm',responsive:'Quy tắc theo kích thước màn hình (@media)'};
fs.mkdirSync(out,{recursive:true});
for(const k of Object.keys(F))fs.writeFileSync(out+'/'+k+'.css',`/* ${H[k]} */\n`+F[k].join('\n')+'\n');
console.log(JSON.stringify(stats),'blocks',blocks.length,'pending',pendingComments.length);
