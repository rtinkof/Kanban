import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      './Board': path.resolve(__dirname, './board.jsx'),   // если файл board.jsx
      './DatePickerModal': path.resolve(__dirname, './datepickerModal.jsx'), // если файл datepickerModal.jsx
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});