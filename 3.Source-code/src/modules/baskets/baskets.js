import { ACT } from '../../core/registry.js';
import { render } from '../../core/router.js';
import { DB, nextCode, save } from '../../core/state.js';
import { confirmDlg, listCard, offline, toast } from '../../core/ui.js';
import { esc } from '../../utils/format.js';
import { ic } from '../../utils/icons.js';

export function vBaskets(){const rows=DB.baskets.map(b=>`<tr><td class="code l">${b.id}</td><td class="l"><span class="bkst ${b.status==='Đầy'?'full':'emp'}">${esc(b.status)}</span></td><td></td></tr>`);return {nav:'baskets',crumbs:[['Quản lý giỏ đựng']],html:`<div class="topbar"><button class="btn add" data-act="bk-add">${ic('plus',16,2.4)} Thêm mới</button></div>${listCard({title:'Danh sách giỏ đựng',head:'<th class="l g95 g2">Mã giỏ</th><th class="l">Trạng thái giỏ đựng</th><th style="width:100%"></th>',rows,none:'Hiện chưa có thông tin giỏ đựng!'})}`}}
ACT['bk-add']=()=>confirmDlg('Bạn có chắc chắn muốn thêm không?',()=>{if(offline('Tạo thất bại!'))return;DB.baskets.push({id:nextCode(DB.baskets,'G',2),status:'Trống'});save();toast('Tạo thành công!');render()});
export function occupy(basketId,on){const b=DB.baskets.find(x=>x.id===basketId);if(b)b.status=on?'Đầy':'Trống'}
