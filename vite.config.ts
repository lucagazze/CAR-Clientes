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
        target: 'https://shopify.com', // placeholder — overridden by router()
        changeOrigin: true,
        secure: false,
        router: (req) => {
          // Vite strips the matched prefix (/api/shopify) before passing req.url
          // So req.url here is: /theskirtingfactory.myshopify.com/orders.json?...
          const url = req.url || '';
          const parts = url.split('/').filter(Boolean); // ["theskirtingfactory.myshopify.com", "orders.json?..."]
          const domain = parts[0];

          if (domain && domain.includes('.')) {
            const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
            if (url.includes('/oauth/access_token')) {
              return `https://${cleanDomain}/admin`;
            }
            return `https://${cleanDomain}/admin/api/2024-01`;
          }
          return 'https://shopify.com';
        },
        rewrite: (path) => {
          // path comes in as: /api/shopify/theskirtingfactory.myshopify.com/orders.json?...
          // Strip /api/shopify/<domain> so Shopify gets just /orders.json?...
          return path.replace(/^\/api\/shopify\/[^/]+/, '');
        },
      },
    },
  },
});
