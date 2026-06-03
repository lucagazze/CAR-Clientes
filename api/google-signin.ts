import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  let credential = req.body?.credential;

  // Fallback body parsing in case req.body wasn't parsed automatically
  if (!credential && typeof req.body === 'string') {
    const params = new URLSearchParams(req.body);
    credential = params.get('credential');
  }

  if (!credential && Buffer.isBuffer(req.body)) {
    const params = new URLSearchParams(req.body.toString('utf-8'));
    credential = params.get('credential');
  }

  if (!credential) {
    return res.status(400).send('Missing Google credential token');
  }

  // Determine redirect target origin based on the request host
  const host = req.headers.host || 'car.algoritmiadesarrollos.com.ar';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';

  res.writeHead(302, {
    Location: `${protocol}://${host}/?id_token=${encodeURIComponent(credential)}`
  });
  res.end();
}
