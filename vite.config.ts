import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 生产环境构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // 启用压缩（使用 esbuild，Vite 默认，更快且无需额外依赖）
    minify: 'esbuild',
    // 分块策略
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['recharts'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
  },
  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
  },
  // 预览服务器配置
  preview: {
    port: 4173,
    open: true,
  },
})
