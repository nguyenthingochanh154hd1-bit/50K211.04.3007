# Bộ kiểm thử (tham khảo)

Các script này dùng khi dựng dự án để kiểm chứng; cần PostgreSQL cục bộ, **không** cần cho việc deploy.
- `db/` – kiểm thử database trên PostgreSQL thật với các vai trò Supabase giả (`stub.sql`): đăng nhập/bcrypt/khóa, RLS, nghiệp vụ, import, và đối chiếu báo cáo SQL với công thức JS cũ.
- `e2e/` – chạy giao diện bằng Playwright trên máy chủ giả lập (`server.mjs`: PostgREST giả trên PostgreSQL + chạy các hàm `api/*.ts` thật). `cssdiff.cjs` so computed-style của CSS đã tách với CSS gốc.
- `splitcss.js` – công cụ đã dùng để tách `styles.css` thành 5 file.
Đường dẫn trong script theo môi trường dựng ban đầu (PostgreSQL socket `/tmp:55432`); sửa lại nếu chạy trên máy bạn.
