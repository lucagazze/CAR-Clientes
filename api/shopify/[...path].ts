import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = req.query.path as string[];
  const shopifyPath = pathSegments ? pathSegments.join('/') : '';
  
  const domain = req.headers['x-shopify-domain'] as string;
  const token = req.headers['x-shopify-access-token'] as string;

  if (!domain || !token) {
    return res.status(400).json({ error: 'Missing Shopify domain or token' });
  }

  // Preserve query string
  const queryString = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) value.forEach(v => queryString.append(key, v));
    else if (value) queryString.set(key, value as string);
  }
  const qs = queryString.toString();
  
  // Format: https://{domain}/admin/api/2024-01/{path}.json
  // Make sure domain doesn't contain protocol
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const targetUrl = `https://${cleanDomain}/admin/api/2024-01/${shopifyPath}.json${qs ? `?${qs}` : ''}`;

  try {
    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const shopifyRes = await fetch(targetUrl, fetchOptions);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'x-shopify-domain, x-shopify-access-token, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const data = await shopifyRes.json();
    return res.status(shopifyRes.status).json(data);
  } catch (error: any) {
    console.error('Shopify API Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
