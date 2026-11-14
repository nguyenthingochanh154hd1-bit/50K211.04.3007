import json,sys
s=json.load(open('t/legacy_state.json'))
def up(arr): return {"upsert":[{"doc":d,"new":True} for d in arr]}
ch={k:up(s[k]) for k in ['customers','expenses','debts','orders']}
json.dump({"changes":ch,"seq":{}},open('t/changes_all.json','w'))
