import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/employees': 'http://localhost:8787',
      '/evaluations': 'http://localhost:8787',
      '/dashboard': 'http://localhost:8787',
      '/reports': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
});
