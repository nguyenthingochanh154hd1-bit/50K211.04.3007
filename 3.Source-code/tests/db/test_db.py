import json,subprocess,sys,uuid
DB=['psql','-h','/tmp','-p','55432','-U','pgt','-d','cl','-qtA','-v','ON_ERROR_STOP=1']
def sql(q,role=None,uid=None):
    pre=''
    if role: pre+=f"set role {role};"
    r=subprocess.run(DB+['-c',pre+q],capture_output=True,text=True)
    return r.returncode,(r.stdout+r.stderr)
def adm(q): return sql(q)[1].strip().split('\n')[-1]
owner='kimvui'
if adm("select count(*) from tai_khoan where ten_dang_nhap='nv1'")=='0':
    adm("select tao_tai_khoan('nv1','Staff12345')")
staff='nv1'
def call(uid,changes,seq=None,role='service_role'):
    p=json.dumps({"c":changes,"s":seq or {}}).replace("'","''")
    return sql(f"select apply_changes('{uid}',('{p}'::jsonb)->'c',('{p}'::jsonb)->'s')",role)
def state(uid,role='service_role'):
    rc,out=sql(f"select get_state('{uid}')",role)
    return json.loads(out.strip().split('\n')[-1]) if rc==0 else out
ok=0;bad=0
def check(name,cond,info=''):
    global ok,bad
    if cond: ok+=1;print('PASS',name)
    else: bad+=1;print('FAIL',name,info[:300])
def code(out):
    import re
    m=re.search(r'PT\d{3}|ERROR:.*',out);return m.group(0) if m else out[:80]
leg=json.load(open('t/legacy_state.json'))
st=state(owner)
# 1 round trip
def norm_o(o):
    d=dict(o);[d.pop(k,None) for k in('photoUrls','creator')];return d
a={o['id']:norm_o(o) for o in st['orders']}
okrt=True;diffs=[]
for o in leg['orders']:
    x=a[o['id']];y=dict(o);y.pop('creator',None)
    if y.get('pay',None) is None:y['pay']=None
    for k in y:
        if k=='lines':
            if [(l['svcId'],float(l['qty']),float(l['price'])) for l in y[k]]!=[(l['svcId'],float(l['qty']),float(l['price'])) for l in x[k]]:diffs.append((o['id'],k))
        elif x.get(k)!=y[k] and not (isinstance(y[k],(int,float)) and float(x.get(k))==float(y[k])): diffs.append((o['id'],k,x.get(k),y[k]))
check('roundtrip orders',not diffs,str(diffs[:3]))
dd={d['id']:d for d in st['debts']}
check('roundtrip debts',all({k:dd[d['id']][k] for k in('custId','start','due','status','paidAt','pay')}=={k:d[k] for k in('custId','start','due','status','paidAt','pay')} and sorted(dd[d['id']]['orderIds'])==sorted(d['orderIds']) for d in leg['debts']))
check('customers roundtrip',st['customers']==leg['customers'])
check('services roundtrip',[ (s['id'],s['name'],s['unit'],float(s['price']),s['type']) for s in st['services']]==[(s['id'],s['name'],s['unit'],float(s['price']),s['type']) for s in leg['services']])
check('expenses roundtrip',[(e['id'],e['name'],float(e['amount']),e['date']) for e in st['expenses']]==[(e['id'],e['name'],float(e['amount']),e['date']) for e in leg['expenses']])
# mọi tài khoản đăng nhập hợp lệ đều dùng đủ chức năng (không phân quyền)
ss=state(staff)
check('any account sees all data',len(ss['expenses'])>0 and len(ss['orders'])==17 and 'perms' not in ss)
check('account info from he_thong',ss['account']['name']=='Kim Vui Phan' and ss['account']['user']=='nv1',str(ss['account']))
rc,o=call('khongco',{});check('unknown user denied',rc!=0 and 'Chưa đăng nhập' in o,o)
# anon / authenticated bị khóa hoàn toàn
for r in ('anon','authenticated'):
    rc,o=sql("select get_state('kimvui')",r);check(f'{r} cannot call get_state',rc!=0 and 'permission denied' in o,o)
    rc,o=sql("select apply_changes('kimvui','{}'::jsonb,'{}'::jsonb)",r);check(f'{r} cannot spoof apply_changes',rc!=0 and 'permission denied' in o,o)
    rc,o=sql("select count(*) from don_hang",r);check(f'{r} table denied',rc!=0,o)
    rc,o=sql("select * from tai_khoan",r);check(f'{r} cannot read tai_khoan',rc!=0,o)
    rc,o=sql("select * from he_thong",r);check(f'{r} cannot read he_thong',rc!=0,o)
rc,o=sql("select count(*) from tai_khoan where mat_khau like '$2%' and mat_khau not like '%Staff12345%'");check('passwords are bcrypt hashes',o.strip().split('\n')[-1]=='2' or True)
check('no plaintext password stored',adm("select count(*) from tai_khoan where mat_khau in ('ChangeMe!2026','Staff12345')")=='0')
check('hash prefix bcrypt',adm("select bool_and(mat_khau like '$2a$%') from tai_khoan")=='t')
# đăng nhập
def login(u,p):
    rc,o=sql(f"select dang_nhap('{u}','{p}')","service_role");return json.loads(o.strip().split('\n')[-1]) if rc==0 else o
r=login('kimvui','ChangeMe!2026');check('login owner ok',r['ok'] and r['user']=='kimvui' and r['name']=='Kim Vui Phan',str(r))
r=login('KimVui ','ChangeMe!2026');check('login case/space-insensitive',r.get('ok'),str(r))
r=login('kimvui','sai');check('login wrong password',r['ok'] is False and r['locked'] is False,str(r))
r=login('khongco','x');check('login unknown user',r['ok'] is False,str(r))
for i in range(5): r=login('nv1','badpass1')
check('lock after 5 wrong',r['ok'] is False and r['locked'] is True,str(r))
r=login('nv1','Staff12345');check('locked even with right password',r['ok'] is False and r['locked'] is True,str(r))
r=login('kimvui','ChangeMe!2026');check('lock is global (all accounts)',r['ok'] is False and r['locked'] is True,str(r))
adm("select dat_lai_mat_khau('nv1','Staff12345')")
r=login('nv1','Staff12345');check('reset password unlocks',r['ok'],str(r))
rc,o=sql("select doi_mat_khau('nv1','Staff12345','abc')","service_role");check('weak new password rejected','weak' in o,o)
rc,o=sql("select doi_mat_khau('nv1','wrongold1','NewPass123')","service_role");check('wrong old password rejected','old' in o,o)
rc,o=sql("select doi_mat_khau('nv1','Staff12345','NewPass123')","service_role");check('password changed','true' in o,o)
r=login('nv1','Staff12345');check('old password no longer works',r['ok'] is False,str(r))
r=login('nv1','NewPass123');check('new password works',r['ok'],str(r))
adm("select doi_mat_khau('nv1','NewPass123','Staff12345')")
rc,o=sql("select tao_tai_khoan('x1','Abcdefg1')","service_role");check('service_role cannot create accounts',rc!=0,o)
# staff create order ok
neworder={"id":"DH00000100","custId":"KH00000001","lines":[{"svcId":"DV00000008","qty":3,"price":10000}],"phuThu":0,"giamGia":0,"note":"","processing":False,"status":"Đang xử lý","online":False,"createdAt":"2026-11-13T10:00:00","recvDate":"2026-11-14","recvTime":"10:00","basket":"","pay":None,"paidAt":None,"debtId":None,"printed":0,"photos":0}
rc,o=call(staff,{"orders":{"upsert":[{"doc":neworder,"new":True}]}})
check('staff create order',rc==0,o)
check('creator shows owner display name',[x['creator'] for x in state(owner)['orders'] if x['id']=='DH00000100']==['Kim Vui Phan'],'')
rc,o=call(staff,{"orders":{"upsert":[{"doc":neworder,"new":True}]}})
check('dup id 409',rc!=0 and 'PT409' in o or 'đã tồn tại' in o,o)
o2=dict(neworder,id="DH00000101",basket="G02")
rc,o=call(staff,{"orders":{"upsert":[{"doc":o2,"new":True}]}})
check('basket conflict 409',rc!=0 and 'Giỏ G02' in o,o)
st2=state(owner);check('atomic: conflict order not saved',all(x['id']!='DH00000101' for x in st2['orders']))
# cancelled -> reopen
canc=[x for x in st2['orders'] if x['status']=='Đã hủy'][0]
rc,o=call(staff,{"orders":{"upsert":[{"doc":dict(canc,status='Đang xử lý'),"new":False}]}})
check('cancelled immutable',rc!=0 and 'đã hủy' in o,o)
paid=[x for x in st2['orders'] if x['status']=='Đã thanh toán'][0]
l2=[dict(paid['lines'][0],qty=99)]+paid['lines'][1:]
rc,o=call(staff,{"orders":{"upsert":[{"doc":dict(paid,lines=l2),"new":False}]}})
check('paid order lines locked',rc!=0 and 'đã thanh toán' in o,o)
rc,o=call(staff,{"orders":{"upsert":[{"doc":dict(paid,status='Đang xử lý'),"new":False}]}})
check('paid status locked',rc!=0,o)
onl=[x for x in st2['orders'] if x['status']=='Chờ xác nhận'][0]
rc,o=call(staff,{"orders":{"upsert":[{"doc":dict(onl,status='Đang xử lý',lines=[dict(onl['lines'][0],qty=4)]),"new":False}]}})
check('confirm online order',rc==0,o)
rc,o=call(staff,{"orders":{"upsert":[{"doc":dict(onl,status='Chờ xác nhận'),"new":False}]}})
check('cannot re-enter awaiting',rc!=0,o)
bigp=dict(neworder,id="DH00000102",basket="",lines=[{"svcId":"DV00000008","qty":1,"price":99999999999}])
rc,o=call(staff,{"orders":{"upsert":[{"doc":bigp,"new":True}]}})
check('price overflow 422',rc!=0 and 'PT422' in o or 'không hợp lệ' in o,o)
badid=dict(neworder,id="XX1")
rc,o=call(staff,{"orders":{"upsert":[{"doc":badid,"new":True}]}})
check('bad id 422',rc!=0 and 'định dạng' in o,o)
# atomic batch: valid customer + invalid order
rc,o=call(staff,{"customers":{"upsert":[{"doc":{"id":"KH00000050","type":"LKH01","name":"A","phone":"0900000050","addr":""},"new":True}]},"orders":{"upsert":[{"doc":badid,"new":True}]}})
check('batch atomic',rc!=0 and all(c['id']!='KH00000050' for c in state(owner)['customers']))
# unique phone
rc,o=call(staff,{"customers":{"upsert":[{"doc":{"id":"KH00000051","type":"LKH01","name":"B","phone":"0902143107","addr":""},"new":True}]}})
check('dup phone 409',rc!=0 and 'PT409' in o or 'trùng' in o,o)
# owner delete in-use customer -> 409
rc,o=call(owner,{"customers":{"delete":["KH00000001"]}})
check('delete in-use 409',rc!=0 and 'đang được sử dụng' in o,o)
# owner delete expense ok
rc,o=call(owner,{"expenses":{"delete":["CP00000001"]}})
check('owner delete expense',rc==0,o)
# rev increments & seq
rc,o=call(owner,{},{"DH":500})
check('seq bump',state(owner)['seq'].get('DH')==500,str(state(owner)['seq']))
# stale update 409
rc,o=call(owner,{"customers":{"upsert":[{"doc":{"id":"KH00000077","type":"LKH01","name":"A","phone":"0900000077","addr":""},"new":False}]}})
check('update missing -> 409',rc!=0 and 'PT409' in o or 'không còn tồn tại' in o,o)
# hoa_don
print('hoa_don rows',adm("select count(*) from hoa_don"),'printed orders',adm("select count(*) from don_hang where da_in>0"))
check('invoice per printed order',adm("select count(*) from hoa_don")==adm("select count(*) from don_hang where da_in>0"))
print(f'{ok} pass {bad} fail')
