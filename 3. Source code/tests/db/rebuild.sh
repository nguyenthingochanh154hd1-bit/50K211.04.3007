#!/bin/bash
# dựng lại DB thử: vai trò Supabase giả + migrations + seed + (tùy chọn) nạp dữ liệu cũ
cd "$(dirname "$0")/.."
P="psql -h /tmp -p 55432 -U pgt"
$P -d postgres -qc "drop database if exists cl" -c "create database cl" || exit 1
for f in t/stub.sql cherry-laundry/supabase/migrations/*.sql cherry-laundry/supabase/seed.sql; do $P -d cl -v ON_ERROR_STOP=1 -q -f $f 2>&1 | grep -v NOTICE | tail -3; done
[ "$1" = "load" ] && $P -d cl -qtA -f t/run1.sql | tail -2
exit 0
