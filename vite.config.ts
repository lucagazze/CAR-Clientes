import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api/klaviyo': {
        target: 'https://a.klaviyo.com/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/klaviyo/, ''),
      },
      '/api/shopify': {
        target: 'https://shopify.com',
        changeOrigin: true,
        secure: false,
        router: (req) => {
          // Usamos Regex para extraer el shop= independientemente de cómo venga la URL
          const url = req.url || '';
          const match = url.match(/[?&]shop=([^&]+)/);
          const shop = match ? match[1] : null;

          if (shop) {
            const clean = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
            if (url.includes('/oauth/access_token')) {
              return `https://${clean}/admin`;
            }
            return `https://${clean}/admin/api/2024-01`;
          }
          return 'https://shopify.com';
        },
        rewrite: (path) => path.replace(/^\/api\/shopify/, ''),
      },
    },
  },
});
