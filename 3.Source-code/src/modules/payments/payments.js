import { simpleCrud } from '../../core/crud.js';
import { DB } from '../../core/state.js';

export const vPays=simpleCrud({g95:1,key:'pm',coll:'pays',nav:'pays',crumbs:[['Phương thức thanh toán']],title:'Danh sách phương thức thanh toán',h1:'Mã phương thức thanh toán',h2:'Tên phương thức thanh toán',none:'Hiện chưa có phương thức thanh toán!',prefix:'PTTT',len:6,codeLabel:'Mã phương thức thanh toán',label:'Tên phương thức thanh toán',ph:'Nhập tên phương thức thanh toán',used:x=>DB.orders.some(o=>o.pay===x.id)||DB.debts.some(d=>d.pay===x.id),usedMsg:'Không thể xóa vì phương thức thanh toán này đang được sử dụng!'});
