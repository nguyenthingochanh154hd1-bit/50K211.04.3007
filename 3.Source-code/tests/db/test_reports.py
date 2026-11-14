import json,subprocess
DB=['psql','-h','/tmp','-p','55432','-U','pgt','-d','cl','-qtA','-v','ON_ERROR_STOP=1']
def sql(q,role=None,uid=None):
    pre=(f"set role {role};" if role else '')
    r=subprocess.run(DB+['-c',pre+q],capture_output=True,text=True);return r.returncode,r.stdout+r.stderr
def adm(q): return sql(q)[1].strip().split('\n')[-1]
if adm("select count(*) from tai_khoan where ten_dang_nhap='nv1'")=='0': adm("select tao_tai_khoan('nv1','Staff12345')")
owner='kimvui';staff='nv1'
def rpc(q,uid=owner):
    rc,o=sql(q.replace('@U',uid),'service_role');return json.loads(o.strip().split('\n')[-1]) if rc==0 else o
exp=json.load(open('t/js_reports.json'));ok=bad=0
def near(a,b): return abs(float(a)-float(b))<0.01
def cmp(name,cond,info=''):
    global ok,bad
    if cond: ok+=1
    else: bad+=1;print('FAIL',name,info[:500])
for c in exp:
    f=c['f']
    if c['k']=='rev':
        r=rpc(f"select report_revenue('@U','{f['from']}','{f['to']}','{f['type']}','{f['svc']}','{f['ot']}')")
        if isinstance(r,str): cmp('rev call',False,r);continue
        cmp('rev totals',near(r['real'],c['real']) and near(r['gross'],c['gross']),f"{r['real']} {r['gross']} vs {c['real']} {c['gross']} {f}")
        cmp('rev rows',len(r['rows'])==len(c['rows']) and all(a['id']==b['id'] and near(a['total'],b['total']) and near(a['real'],b['real']) and near(a['debt'],b['debt']) and near(a['gross'],b['gross']) for a,b in zip(r['rows'],c['rows'])),str(f))
        cmp('rev bySvc',len(r['bySvc'])==len(c['bySvc']) and all(a['svcId']==b['svcId'] and near(a['real'],b['real']) and near(a['gross'],b['gross']) for a,b in zip(r['bySvc'],c['bySvc'])),f"{r['bySvc']} vs {c['bySvc']}")
    elif c['k']=='profit':
        r=rpc(f"select report_profit('@U','{f['from']}','{f['to']}','{f['ot']}')")
        if isinstance(r,str): cmp('profit call',False,r);continue
        cmp('profit',len(r)==len(c['w']) and all(x['a']==y['a'] and x['b']==y['b'] and x['n']==y['n'] and all(near(x[k],y[k]) for k in('gross','real','cp','lg','lr')) for x,y in zip(r,c['w'])),f"{r} vs {c['w']}")
    else:
        r=rpc(f"select report_debt('@U','{f['from']}','{f['to']}','{f['type']}','{f['cust']}','{f['svc']}')")
        if isinstance(r,str): cmp('debt call',False,r);continue
        cmp('debt',len(r)==len(c['rows']) and all(x['custId']==y['custId'] and near(x['tot'],y['tot']) and near(x['paid'],y['paid']) and x['n']==y['n'] for x,y in zip(r,c['rows'])),f"{r} vs {c['rows']}")
print('sample:',json.dumps(exp[0]['bySvc'][:2]),exp[0]['real'],exp[0]['gross'],len(exp[0]['rows']),'rows')
o=rpc("select report_revenue('@U','2026-01-01','2026-12-31')",'khongco');cmp('unknown user denied revenue','Chưa đăng nhập' in str(o),str(o))
print('reconcile',rpc("select report_reconcile('@U','2026-01-01','2026-12-31')"))
print(ok,'pass',bad,'fail')
