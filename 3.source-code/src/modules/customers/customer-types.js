import { simpleCrud } from '../../core/crud.js';
import { DB } from '../../core/state.js';

export const vCustTypes=simpleCrud({key:'ct',coll:'custTypes',nav:'cust',sub:'cust-types',crumbs:[['Quản lý khách hàng','#customers'],['Loại khách hàng']],title:'Danh sách loại khách hàng',h1:'Mã loại khách hàng',h2:'Tên loại khách hàng',none:'Hiện chưa có loại khách hàng nào!',prefix:'LKH',len:2,codeLabel:'Mã loại khách hàng',label:'Tên loại khách hàng',ph:'Nhập tên loại khách hàng',popup:false,used:x=>DB.customers.some(c=>c.type===x.id),usedMsg:'Không thể xóa vì loại khách hàng này đang được sử dụng!'});
