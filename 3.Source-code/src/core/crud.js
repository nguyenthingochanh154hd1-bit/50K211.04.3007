import { ACT } from './registry.js';
import { render } from './router.js';
import { DB, nextCode, save } from './state.js';
import { actBtns, closeModal, confirmDlg, done, fld, formDlg, infoDlg, listCard, longDate, offline, setErr, toast, val } from './ui.js';
import { $, esc, norm } from '../utils/format.js';
import { ic } from '../utils/icons.js';

export function simpleCrud(c){
 const key=c.key;
 const list=()=>{const arr=DB[c.coll];const rows=arr.map(x=>`<tr><td class="code l" style="width:260px;padding-left:28px">${x.id}</td><td class="${c.tag?'tagc':'l'}">${c.tag?c.tag(x):esc(x.name)}</td>${actBtns(key,x.id)}</tr>`);
  return {nav:c.nav,sub:c.sub,crumbs:c.crumbs,html:`<div class="topbar"><button class="btn add" data-act="${key}-add">${ic('plus',16,2.4)} Thêm mới</button></div>${listCard({title:c.title,head:`<th class="l${c.g95?' g95':''}${c.key==='ct'?' ct1':''}" style="padding-left:28px">${c.h1}</th><th class="${c.tag?'tagc':'l'}">${c.h2}</th><th></th>`,rows,none:c.none})}`}};
 const form=(x)=>{
  formDlg({cls:'w876',title:x?'Cập nhật':'Thêm mới',sub:longDate(x?'Cập nhật vào':'Thêm vào'),code:`${c.codeLabel}: ${x?x.id:nextCode(DB[c.coll],c.prefix,c.len)}`,body:`<div class="onef">${fld({id:'m_name',label:c.label,req:1,ph:c.ph,value:x?x.name:''})}</div>`});
  $('#mSave').onclick=()=>{const n=val('m_name');setErr('m_name',n?'':(c.key==='ct'?'Không được để trống!':'Thông tin không được bỏ trống!'));if(!n)return;if(DB[c.coll].some(y=>norm(y.name)===norm(n)&&(!x||y.id!==x.id))){setErr('m_name','Tên đã tồn tại!');return}if(offline(x?'Cập nhật thất bại!':'Tạo thất bại!'))return;
   if(x)x.name=n;else DB[c.coll].push({id:nextCode(DB[c.coll],c.prefix,c.len),name:n});save();closeModal();done(x?'Cập nhật thành công!':'Tạo thành công!',c.popup,()=>render());if(!c.popup)render()}};
 ACT[key+'-add']=()=>form();
 ACT[key+'-edit']=a=>form(DB[c.coll].find(x=>x.id===a.dataset.id));
 ACT[key+'-del']=a=>{const x=DB[c.coll].find(y=>y.id===a.dataset.id);if(c.used(x)){if(c.key==='ct')toast(c.usedMsg,'e');else infoDlg(c.usedMsg,false);return}confirmDlg(c.key==='ct'?'Xác nhận xóa loại khách hàng này không?':'Bạn có chắc chắn muốn xóa không?',()=>{if(offline('Xóa thất bại!'))return;DB[c.coll]=DB[c.coll].filter(y=>y.id!==x.id);save();done('Đã xóa thành công!',c.popup,()=>render());if(!c.popup)render()})};
 return list}
