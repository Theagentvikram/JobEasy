import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Build to /new/ so it can be served from jobeasy.app/new/
  base: process.env.NODE_ENV === 'production' ? '/new/' : '/',
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
