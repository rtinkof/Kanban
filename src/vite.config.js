import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5000',
    //     changeOrigin: true,
    //   },
    // },
  },
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/modifiers'],
  },
});