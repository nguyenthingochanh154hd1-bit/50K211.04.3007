import json,subprocess
DB=['psql','-h','/tmp','-p','55432','-U','pgt','-d','cl','-qtA','-v','ON_ERROR_STOP=1']
def sql(q,role='service_role'):
    r=subprocess.run(DB+['-c',f"set role {role};"+q if role else q],capture_output=True,text=True);return r.returncode,(r.stdout+r.stderr)
def adm(q): return sql(q,None)[1].strip().split('\n')[-1]
ok=bad=0
def check(n,c,i=''):
    global ok,bad
    if c: ok+=1;print('PASS',n)
    else: bad+=1;print('FAIL',n,i)
def create(**kw):
    p=dict(name='A',phone='0911000111',addr='',note='',services=['DV00000008'],basket='G01',photos=['aaaaaaaa-1111-2222-3333-444444444444/1.jpg']);p.update(kw)
    rc,o=sql("select online_create_order('%s'::jsonb)"%json.dumps(p).replace("'","''"))
    return rc,o
rc,o=create();check('create ok',rc==0 and 'Chờ xác nhận' in o,o);oid=json.loads(o.strip().split('\n')[-1])['id']
check('same phone other format -> same customer',(create(phone='+84 911 000 111',basket='G02')[0]==0) and adm("select count(*) from khach_hang")=='1')
check('anon cannot call online_create_order',sql("select online_create_order('{}'::jsonb)",'anon')[0]!=0)
check('authenticated cannot call online_lookup',sql("select online_lookup('0911000111')",'authenticated')[0]!=0)
check('anon cannot read table',sql("select * from don_hang",'anon')[0]!=0)
rc,o=create(basket='G01',phone='0922000222');check('basket taken 409 text','vừa có người khác chọn' in o,o)
rc,o=create(basket='X1');check('bad basket 422','Giỏ đựng không hợp lệ' in o,o)
rc,o=create(photos=['../../etc/passwd']);check('bad photo path rejected','Đường dẫn ảnh không hợp lệ' in o,o)
rc,o=create(services=['DV00000008','DV00000008'],basket='G05');check('duplicate service rejected','trùng' in o,o)
rc,o=create(name='x'*51,basket='G05');check('long name rejected','Tên khách hàng' in o,o)
# staff confirms the online order through apply_changes: photos kept, qty saved
rc,st=sql("select get_state('kimvui')");st=json.loads(st.strip().split('\n')[-1])
od=[x for x in st['orders'] if x['id']==oid][0]
check('state: online flag + photoUrls + creator',od['online'] and od['photoUrls']==['aaaaaaaa-1111-2222-3333-444444444444/1.jpg'] and od['creator']=='Khách đặt online',str(od))
od2=dict(od,status='Đang xử lý',lines=[dict(l,qty=3) for l in od['lines']])
p=json.dumps({"c":{"orders":{"upsert":[{"doc":od2,"new":False}]}},"s":{}}).replace("'","''")  # same shape as test_db.call
rc,o=sql(f"select apply_changes('kimvui',('{p}'::jsonb)->'c',('{p}'::jsonb)->'s')");check('staff confirm ok',rc==0,o)
check('photos kept after confirm',adm(f"select hinh_anh_gio_dung[1] from don_hang_online where ma_don_hang='{oid}'")=='aaaaaaaa-1111-2222-3333-444444444444/1.jpg')
check('confirmed -> Đang xử lý + lines qty 3',adm(f"select trang_thai||'|'||(select sum(khoi_so_luong)::text from chi_tiet_don_hang where ma_don_hang='{oid}') from don_hang where ma_don_hang='{oid}'")=='Đang xử lý|3.00')
# lookup computes payment for paid/delivered orders
adm(f"update don_hang set trang_thai='Đã giao', phu_thu=5000 where ma_don_hang='{oid}'")
rc,o=sql("select online_lookup('0911000111')");lk=json.loads(o.strip().split('\n')[-1])
pay=[x for x in lk['orders'] if x['id']==oid][0]['pay']
check('lookup pay = lines*price + surcharge (min 30000)',pay and pay['sub']==30000 and pay['tot']==35000,str(pay))
check('lookup has no staff/account fields',all(set(x)<={'id','status','createdAt','name','contact','basket','note','svcs','photos','pay'} for x in lk['orders']),str(lk['orders'][0].keys()))
# order_photos needs login
rc,o=sql(f"select order_photos('khongco','{oid}')");check('order_photos denied for unknown user',rc!=0 and 'Chưa đăng nhập' in o,o)
rc,o=sql(f"select order_photos('kimvui','{oid}')");check('order_photos for staff',rc==0 and 'aaaaaaaa' in o,o)
# global cap: 30 pending online orders
adm("update don_hang set trang_thai='Đã giao' where ma_gio is not null")
adm("update gio_dung set trang_thai='Trống'")
adm("insert into khach_hang select 'KH'||lpad((100+g)::text,8,'0'),'LKH01','K'||g,'09500000'||lpad(g::text,2,'0'),null from generate_series(1,30) g")
adm("insert into don_hang (ma_don_hang,ma_khach_hang,ten_dang_nhap,ma_cua_tiem,trang_thai,ma_gio) select 'DH'||lpad((200+g)::text,8,'0'),'KH'||lpad((100+g)::text,8,'0'),'kimvui','CH001','Chờ xác nhận',null from generate_series(1,30) g")
adm("insert into don_hang_online select ma_don_hang,array['x'] from don_hang where ma_don_hang like 'DH000002%'")
rc,o=create(phone='0966000000',basket='G03');check('global pending cap -> 429','nhiều đơn' in o,o)
print(ok,'pass',bad,'fail')
