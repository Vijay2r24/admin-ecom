import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@mui/icons-material', '@mui/material'],
  },
  resolve: {
    preserveSymlinks: false,
  },
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
});