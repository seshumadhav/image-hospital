import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend server running on port 3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Also proxy /upload directly for backward compatibility
      '/upload': 'http://localhost:3000',
      // Proxy /image/ routes to backend for image access (not /images/)
      // Using bypass to exclude /images/ paths
      '/image': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass: (req) => {
          // Don't proxy if it's /images/ (plural) - let Vite serve static files
          if (req.url?.startsWith('/images/')) {
            return req.url;
          }
          // Proxy /image/ (singular) paths to backend
          return null;
        },
      },
    },
  },
}); 


