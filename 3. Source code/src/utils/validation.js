/* Giới hạn độ dài / giá trị – khớp với cột trong database (supabase/migrations/001) để báo lỗi sớm trên giao diện. */
export const LIMITS={
  m_name:50, m_unit:20, m_addr:100, m_phone:20, m_bank:50, m_acc:30, m_contact:15,
  m_amt:10, m_price:10, pos_pt:10, pos_gg:10
};
export const MAX_MONEY=9999999999;        // numeric(12,2) – tối đa 9.999.999.999 đ
export const MAX_QTY=999999.99;           // numeric(8,2)
export const MAX_NOTE=100;

/* gắn maxlength cho các ô nhập có id nằm trong LIMITS (gọi sau khi dựng popup) */
export function applyLimits(root){
  (root||document).querySelectorAll('input[id],textarea[id]').forEach(e=>{
    const m=LIMITS[e.id];if(m&&(e.maxLength<0||e.maxLength>m))e.maxLength=m;
  });
}
export const isMoney=v=>Number.isFinite(+v)&&+v>=0&&+v<=MAX_MONEY;
export const isQty=v=>Number.isFinite(+v)&&+v>=0&&+v<=MAX_QTY;
export const isPhone=v=>/^[0-9+\s().-]{6,20}$/.test(String(v||'').trim());
/* mật khẩu hợp lệ: ≥ 8 ký tự, có chữ và số (giống quy tắc cũ của màn hình đổi mật khẩu) */
export const isStrongPassword=v=>String(v||'').length>=8&&/[A-Za-z]/.test(v)&&/\d/.test(v);
