\set ON_ERROR_STOP on
begin;
set local role service_role;
\set c `cat t/changes_all.json`
select (apply_changes('kimvui', (:'c'::jsonb)->'changes', (:'c'::jsonb)->'seq'))::text;
select jsonb_array_length(get_state('kimvui')->'orders'), jsonb_array_length(get_state('kimvui')->'debts'), get_rev('kimvui');
commit;
