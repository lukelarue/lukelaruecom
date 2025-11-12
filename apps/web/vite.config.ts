import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/login-api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/chat-api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/chat-api/, ''),
      },
    },
  },
});
