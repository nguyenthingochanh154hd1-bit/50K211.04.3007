import { simpleCrud } from '../../core/crud.js';
import { DB } from '../../core/state.js';
import { stag } from '../../core/ui.js';

export const vSvcTypes=simpleCrud({key:'st',coll:'svcTypes',nav:'svc',sub:'svc-types',crumbs:[['Quản lý dịch vụ','#svc-types'],['Loại dịch vụ']],title:'Danh sách loại dịch vụ',h1:'Mã loại dịch vụ',h2:'Tên loại dịch vụ',none:'Hiện chưa có loại dịch vụ nào!',prefix:'LDV',len:2,codeLabel:'Mã loại dịch vụ',label:'Tên loại dịch vụ',ph:'Nhập loại dịch vụ',tag:x=>stag(x.id),used:x=>DB.services.some(s=>s.type===x.id),usedMsg:'Không thể xóa vì Loại dịch vụ này đang được sử dụng!'});
