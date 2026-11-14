import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const at = (p) => fileURLToPath(new URL(p, import.meta.url));

/* Khi chạy `npm run dev`, các yêu cầu /api/* được chuyển tới máy chủ API.
 *  - Cách 1 (khuyên dùng): chạy `vercel dev` (cổng 3000) – nó chạy cả thư mục api/ giống production.
 *  - Đổi địa chỉ bằng biến VITE_API_PROXY trong .env.local nếu cần. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.VITE_API_PROXY || 'http://localhost:3000', changeOrigin: true }
      }
    },
    // Hai trang: app nhân viên (/) và trang đặt đơn online của khách (/online/)
    build: {
      outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900,
      rollupOptions: { input: { main: at('./index.html'), online: at('./online/index.html') } }
    }
  };
});
