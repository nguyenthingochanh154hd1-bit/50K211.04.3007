-- =====================================================================
-- CHERRY LAUNDRY – 006: NHẬP DỮ LIỆU CŨ
-- import_legacy_state(p_state, p_wipe)
--   p_state: file trạng thái của bản cũ (Flask+SQLite / JSON): { shops, custTypes, customers, svcTypes, services,
--            baskets, pays, expenses, orders, debts, seq, ... }  (khóa "account" bị bỏ qua – tài khoản nằm ở bảng tai_khoan)
--   p_wipe : true  -> xóa SẠCH dữ liệu nghiệp vụ hiện có (kể cả danh mục do seed.sql tạo) rồi nạp
--            false -> chỉ nạp thêm; trùng mã sẽ báo lỗi 409 và không nạp gì
-- Cần tài khoản đăng nhập hợp lệ. Toàn bộ chạy trong MỘT giao dịch: lỗi ở đâu thì hoàn tác tất cả.
-- Các luật nghiệp vụ (mã, giá, giỏ, trạng thái...) áp dụng y như khi nhập tay qua ứng dụng.
-- Người tạo đơn: tài khoản đang chạy import.
-- =====================================================================
create or replace function public.import_legacy_state(p_user text, p_state jsonb, p_wipe boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_coll text; v_changes jsonb := '{}'::jsonb; v_res jsonb; v_n jsonb := '{}'::jsonb; v_arr jsonb;
    colls text[] := array['shops','custTypes','customers','svcTypes','services','baskets','pays','expenses','debts','orders'];
begin
    perform public.set_user(p_user);
    if public.auth_username() is null then
        raise exception 'Chưa đăng nhập' using errcode = 'PT401';
    end if;
    if jsonb_typeof(p_state) is distinct from 'object' then
        raise exception 'Tệp dữ liệu không hợp lệ' using errcode = 'PT422';
    end if;

    perform 1 from he_thong where khoa = 'rev' for update;

    if p_wipe then
        delete from hoa_don;  delete from don_hang_online; delete from chi_tiet_don_hang; delete from don_hang;
        delete from cong_no_khach_si; delete from chi_phi; delete from khach_hang; delete from dich_vu;
        delete from gio_dung; delete from phuong_thuc_thanh_toan; delete from loai_khach_hang; delete from loai_dich_vu; delete from cua_tiem;
        alter sequence seq_chi_tiet_don_hang restart;
        alter sequence seq_hoa_don restart;
        update he_thong set gia_tri = '{}'::jsonb where khoa = 'seq';
    end if;

    foreach v_coll in array colls loop
        v_arr := coalesce(p_state -> v_coll, '[]'::jsonb);
        if jsonb_typeof(v_arr) is distinct from 'array' then
            raise exception '"%" phải là một mảng', v_coll using errcode = 'PT422';
        end if;
        if jsonb_array_length(v_arr) > 0 then
            v_changes := v_changes || jsonb_build_object(v_coll, jsonb_build_object('upsert',
                (select jsonb_agg(jsonb_build_object('doc', d, 'new', true)) from jsonb_array_elements(v_arr) d)));
            v_n := v_n || jsonb_build_object(v_coll, jsonb_array_length(v_arr));
        end if;
    end loop;

    v_res := public.apply_changes(p_user, v_changes, coalesce(p_state -> 'seq', '{}'::jsonb));

    return jsonb_build_object('ok', true, 'imported', v_n, 'rev', v_res -> 'rev');
end $$;

revoke all on function public.import_legacy_state(text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.import_legacy_state(text, jsonb, boolean) to service_role;
