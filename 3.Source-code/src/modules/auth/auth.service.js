import { replaceDB, emptyDB, setAuth } from '../../core/state.js';
import { API, setToken } from '../../services/api.js';

/* Đăng nhập / đăng xuất / đổi mật khẩu / hồ sơ qua /api/login và /api/account.
 * Mật khẩu được băm bcrypt trong database; giao diện không lưu và không hiển thị mật khẩu. */
const netErr=()=>{const e=new Error('Lỗi đường truyền!');e.network=true;return e};

export const authService={
  /* ném lỗi {network} nếu không kết nối được; {locked} nếu tài khoản bị khóa/tạm khóa; lỗi thường nếu sai tên/mật khẩu */
  async login(username,password){
    let r;
    try{r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})})}
    catch(e){throw netErr()}
    let b=null;try{b=await r.json()}catch(e){}
    if(!r.ok){const e=new Error((b&&b.error)||'Đăng nhập không thành công');e.status=r.status;e.locked=r.status===429||r.status===403;throw e}
    setToken(b.token);
    try{await API.start()}
    catch(e){setToken(null);if(e.network)throw e;const er=new Error(e.message||'Không đăng nhập được');er.locked=e.status===401||e.status===403;throw er}
  },
  logout(){API.stop();replaceDB(emptyDB());setAuth(false)},
  /* kiểm tra mật khẩu hiện tại của tài khoản đang đăng nhập */
  async checkPassword(_username,password){
    const r=await API.post('/api/account',{action:'check',password});return !!r.ok
  },
  async changePassword(_username,oldPassword,newPassword){
    await API.post('/api/account',{action:'password',old:oldPassword,new:newPassword})
  },
  /* đổi họ tên / số điện thoại của chính mình */
  async updateProfile(name,phone){return API.post('/api/account',{name,phone})}
};
