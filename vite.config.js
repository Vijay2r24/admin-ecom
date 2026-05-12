import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Disable Fast Refresh to avoid preamble issues
      fastRefresh: false,
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@mui/icons-material', '@mui/material'],
  },
  resolve: {
    preserveSymlinks: false,
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 5176, // Match the port from error
    host: 'localhost', // Explicitly set host
    hmr: false, // Disable HMR completely
  },
});