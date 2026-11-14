import { ACT } from '../../core/registry.js';
import { render } from '../../core/router.js';
import { setAuth } from '../../core/state.js';
import { LOGO, setErr, val } from '../../core/ui.js';
import { rm, rmSet } from '../debts/debts.reminders.js';
import { authService } from './auth.service.js';
import { $, esc } from '../../utils/format.js';
import { ic } from '../../utils/icons.js';

export function loginView(){let u='';try{u=localStorage.getItem('cl_remember')||''}catch(e){}
 const bubs=[[6,14,90],[16,72,36],[84,16,60],[92,62,30],[72,84,48],[3,86,26],[48,6,22]].map(b=>`<span style="left:${b[0]}%;top:${b[1]}%;width:${b[2]}px;height:${b[2]}px"></span>`).join('');
 return `<div class="login"><div class="bgimg"></div><form class="lcard" id="lform" novalidate><div class="lh">${LOGO(142)}<b>Cherry<br>Laundry</b></div>
 <div class="f"><label for="lu">Tên tài khoản <em>*</em></label><div class="fi">${ic('user',18,1.8)}<input class="inp" id="lu" placeholder="Nhập tên tài khoản" value="${esc(u)}" autocomplete="username"></div><div class="err" id="e_lu"></div></div>
 <div class="f"><label for="lp">Mật khẩu <em>*</em></label><div class="fi">${ic('card',18,1.8).replace('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>','<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>')}<div class="pw"><input class="inp" id="lp" type="password" placeholder="Nhập mật khẩu" autocomplete="current-password"><button type="button" data-act="eye" data-t="lp" aria-label="Hiện/ẩn mật khẩu">${ic('eye',22)}</button></div></div><div class="err" id="e_lp"></div></div>
 <label class="rem"><input type="checkbox" id="lr" ${u?'checked':''}> Nhớ mật khẩu</label><div class="lerr" id="lerr"></div>
 <button class="go" type="submit">Đăng nhập</button>
 <div class="help">Để được trợ giúp, hãy liên hệ với bộ phận hỗ trợ của<br>Đội ngũ phát triển hệ thống: <b>0913 465 444</b></div></form></div>`}
ACT.eye=a=>{const i=document.getElementById(a.dataset.t);if(i.dataset.mask){const show=i.dataset.mask==='1';i.dataset.mask=show?'0':'1';i.value=show?i.dataset.real:'∗'.repeat(i.dataset.real.length);i.style.letterSpacing=show?'0':'2px';a.innerHTML=ic(show?'eyeoff':'eye',22);return}const show=i.type==='password';i.type=show?'text':'password';a.innerHTML=ic(show?'eyeoff':'eye',22)};
export function bindLogin(){$('#lform').onsubmit=async e=>{e.preventDefault();$('#lerr').textContent='';const u=val('lu'),p=document.getElementById('lp').value;setErr('lu',u?'':'Không được để trống!');setErr('lp',p?'':'Không được để trống!');if(!u||!p)return;const btn=document.querySelector('#lform .go');btn.disabled=true;
 try{await authService.login(u,p);try{if($('#lr').checked)localStorage.setItem('cl_remember',u);else localStorage.removeItem('cl_remember')}catch(e){}setAuth(true);rm.skip=1;rmSet(true);location.hash='#orders-new';render()}
 catch(err){$('#lerr').textContent=err.network?'Lỗi đường truyền! Không kết nối được máy chủ.':err.locked?(err.message||'Tài khoản đã bị khóa. Vui lòng liên hệ chủ tiệm.'):'Đăng nhập không thành công!'}finally{btn.disabled=false}}}
