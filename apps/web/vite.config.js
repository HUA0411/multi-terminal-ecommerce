import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 单仓库双应用：index.html = PC 门店端，admin.html = 管理后台
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // REST 接口代理到后端
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      // WebSocket 代理（ws:true 支持 Upgrade 头）
      '/ws': { target: 'ws://localhost:4000', ws: true },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
    chunkSizeWarningLimit: 1600,
  },
})
