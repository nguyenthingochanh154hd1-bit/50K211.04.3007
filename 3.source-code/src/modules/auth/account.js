import { ACT } from '../../core/registry.js';
import { render } from '../../core/router.js';
import { DB } from '../../core/state.js';
import { closeModal, confirmDlg, emptyBox, infoDlg, offline, openModal, setErr, toast } from '../../core/ui.js';
import { authService } from './auth.service.js';
import { $, esc } from '../../utils/format.js';
import { ic } from '../../utils/icons.js';

window.addEventListener('online',()=>{if(location.hash==='#account')render()});
window.addEventListener('offline',()=>{if(location.hash==='#account')render()});
export function vAccount(){const A=DB.account;if(navigator.onLine===false){return {nav:'account',crumbs:[['Quản lý tài khoản']],html:`<div class="lc">${emptyBox('Lỗi đường truyền! Không thể tải thông tin tài khoản.','alert')}</div>`}}return {nav:'account',crumbs:[['Quản lý tài khoản']],html:`<div class="accbig"><div class="av"><svg width="113" height="110.94" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><circle cx="50" cy="38" r="18" fill="#fff"/><path d="M14 100c0-21 16-36 36-36s36 15 36 36z" fill="#fff"/></svg></div><div style="width:100%;max-width:973px;border-top:2px solid #000"></div><div class="in"><div class="rw"><label>Tên đăng nhập:</label><input class="inp" style="max-width:359px;background:#fff;color:#000;border-color:#CECECE" value="${esc(A.user)}" readonly></div><div class="rw"><label>Mật khẩu:</label><input class="inp" style="max-width:359px;background:#fff;color:#000;border-color:#CECECE;letter-spacing:2px" type="text" value="∗∗∗∗∗∗∗∗" readonly aria-label="Mật khẩu được ẩn"></div></div><div class="btns"><button class="btn" data-act="pw-open" style="background:#007AFF;color:#fff">Đổi mật khẩu</button><button class="btn gray" data-act="logout" style="border:1px solid #000000">Đăng xuất</button></div></div>`}}
ACT['pw-open']=()=>{openModal(`<div class="hd" style="text-align:center;border-bottom:2px solid #000;padding:22px 0 16px"><h3>Đổi mật khẩu</h3></div><div class="bd2" style="padding:30px 20px 10px"><div class="frame" style="width:665px;max-width:100%;min-height:min(501px,60vh);border-color:#414141;gap:50px;justify-content:center">${[['po','Mật khẩu cũ','Nhập mật khẩu cũ'],['pn','Mật khẩu mới','Mật khẩu hợp lệ gồm chữ và số, tối thiểu 8 kí tự'],['pr','Nhập lại mật khẩu mới','Nhập lại mật khẩu mới']].map(s=>`<div class="f"><label for="${s[0]}" style="font-size:25px;font-weight:700">${s[1]} <em>*</em></label><div class="pw"><input class="inp" id="${s[0]}" type="password" placeholder="${s[2]}" autocomplete="off" style="height:56px"><button type="button" data-act="eye" data-t="${s[0]}" aria-label="Hiện/ẩn">${ic('eye',20)}</button></div><div class="err" id="e_${s[0]}"></div></div>`).join('')}</div></div><div class="ft"><button class="btn out" data-act="close" style="font-weight:400">Hủy</button><button class="btn pri" id="mSave" style="font-weight:400">Lưu</button></div>`,'w795 h772');
 {const po=document.getElementById('po'),lk=[document.getElementById('pn'),document.getElementById('pr')];let T=0;
  const apply=wrong=>{setErr('po',wrong?'Mật khẩu cũ không đúng!':'');lk.forEach(i=>{i.disabled=wrong;i.style.background=wrong?'#F3F4F6':'';i.style.cursor=wrong?'not-allowed':'';if(wrong)setErr(i.id,'')})};
  const chk=async()=>{const v=po.value;if(!v){apply(false);return}try{const ok=await authService.checkPassword(DB.account.user,v);apply(!ok)}catch(e){}};
  po.addEventListener('input',()=>{clearTimeout(T);T=setTimeout(chk,900)});po.addEventListener('blur',chk)}
 $('#mSave').onclick=async()=>{const o=document.getElementById('po').value,n=document.getElementById('pn').value,r=document.getElementById('pr').value;const E='Không được để trống!';
  setErr('po',!o?E:'');const badN=!!n&&(n.length<8||!/[A-Za-z]/.test(n)||!/\d/.test(n));const misR=!!n&&!!r&&n!==r;
  setErr('pn',!n?E:badN?'Mật khẩu mới không hợp lệ!':'');setErr('pr',!r?E:misR?'Mật khẩu mới nhập lại chưa khớp!':'');
  if(!o||!n||!r||badN||misR)return;if(offline('Đổi mật khẩu thất bại!'))return;
  try{await authService.changePassword(DB.account.user,o,n);closeModal();render();infoDlg('Đổi mật khẩu thành công!',true)}
  catch(e){if(e.status===400&&/cũ/.test(e.message)){setErr('po','Mật khẩu cũ không đúng!');['pn','pr'].forEach(id=>{const i=document.getElementById(id);i.disabled=true;i.style.background='#F3F4F6'})}else toast(e.message||'Đổi mật khẩu thất bại!','e')}}};
