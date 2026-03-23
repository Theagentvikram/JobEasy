import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Always /new/ — proxied from root :3000 in dev, deployed path in prod
  base: '/new/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: '../dist/new',
    emptyOutDir: true,
  },
})
