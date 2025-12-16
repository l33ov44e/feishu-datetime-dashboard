import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { semiTheming } from 'vite-plugin-semi-theming';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  plugins: [
    react(),
    semiTheming({
      theme: '@semi-bot/semi-theme-feishu-dashboard',
    }),
  ],
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'public/index.html'
      }
    },
    emptyOutDir: true
  },
  resolve: {
    preserveSymlinks: true
  }
});