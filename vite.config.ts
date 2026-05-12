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

      // Shopify: domain is encoded in the path as /api/shopify/<domain>/...
      // This proxy strips /api/shopify/<domain> and forwards to the correct admin API
      '/api/shopify': {
        target: 'https://placeholder.myshopify.com', // overridden by router
        changeOrigin: true,
        secure: true,
        router: (req) => {
          // URL pattern: /api/shopify/<domain>/orders.json?...
          const match = req.url?.match(/^\/api\/shopify\/([^/?]+)/);
          if (match?.[1]) {
            const domain = decodeURIComponent(match[1]);
            const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
            return `https://${clean}/admin/api/2024-01`;
          }
          return 'https://placeholder.myshopify.com';
        },
        rewrite: (path) => {
          // Remove /api/shopify/<domain> prefix, keep the rest
          return path.replace(/^\/api\/shopify\/[^/?]+/, '');
        },
      },
    },
  },
});
