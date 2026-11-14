import json,subprocess
exec(open('t/test_reports.py').read().split("exp=json.load")[0])
st=json.load(open('t/legacy_state.json'))
p=json.dumps(st).replace("'","''")
# người chưa đăng nhập không nhập được
rc,o=sql(f"select import_legacy_state('khongco','{p}'::jsonb,true)",'service_role',staff);print('unknown user denied:',rc!=0 and 'Chưa đăng nhập' in o)
rc,o=sql(f"select import_legacy_state('kimvui','{p}'::jsonb,false)",'service_role',owner);print('no-wipe dup ->',rc!=0 and ('đã tồn tại' in o or 'trùng' in o), o.strip().split('\n')[0][:100])
rc,o=sql(f"select import_legacy_state('kimvui','{p}'::jsonb,true)",'service_role',owner);print('wipe import:',o.strip()[-200:])
n=adm("select (select count(*) from don_hang)||','||(select count(*) from khach_hang)||','||(select count(*) from cong_no_khach_si)||','||(select count(*) from dich_vu)")
print('counts',n)
