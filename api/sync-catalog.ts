import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clientId } = req.body as { clientId: string };
  if (!clientId) return res.status(400).json({ error: 'Missing clientId' });

  // Fetch client
  const { data: client, error } = await supabase
    .from('car_clients')
    .select('shopify_domain, shopify_access_token, ecommerce_platform')
    .eq('id', clientId)
    .maybeSingle();

  if (error || !client) return res.status(404).json({ error: 'Client not found' });

  if (!client.shopify_domain || !client.shopify_access_token) {
    return res.status(400).json({ error: 'No Shopify credentials configured for this client' });
  }

  const domain = client.shopify_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const token = client.shopify_access_token;

  try {
    // Fetch all products (paginated, up to 250 per page)
    let allProducts: any[] = [];
    let pageUrl = `https://${domain}/admin/api/2024-01/products.json?limit=250&fields=id,title,handle,status,variants,product_type,tags`;

    while (pageUrl) {
      const shopifyRes = await fetch(pageUrl, {
        headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' },
      });
      if (!shopifyRes.ok) throw new Error(`Shopify error: ${shopifyRes.status}`);
      const data = await shopifyRes.json();
      allProducts = allProducts.concat(data.products || []);

      // Check for next page via Link header
      const linkHeader = shopifyRes.headers.get('link') || '';
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      pageUrl = nextMatch ? nextMatch[1] : '';
    }

    // Filter only active products
    const active = allProducts.filter(p => p.status === 'active');

    // Build structured catalog
    const catalog = active.map(p => {
      const variants = p.variants || [];
      const prices = [...new Set(variants.map((v: any) => v.price).filter(Boolean))];
      const priceStr = prices.length === 1
        ? `$${prices[0]}`
        : prices.length > 1
          ? `$${Math.min(...prices.map(Number))} - $${Math.max(...prices.map(Number))}`
          : 'Consultar';
      const variantTitles = variants
        .map((v: any) => v.title)
        .filter((t: string) => t && t !== 'Default Title');
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        type: p.product_type || '',
        tags: p.tags || '',
        price: priceStr,
        variants: variantTitles,
      };
    });

    const syncedAt = new Date().toISOString();

    // Save to Supabase
    const { error: updateError } = await supabase
      .from('car_clients')
      .update({
        products_catalog: JSON.stringify(catalog),
        catalog_synced_at: syncedAt,
      })
      .eq('id', clientId);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      success: true,
      count: catalog.length,
      synced_at: syncedAt,
      catalog,
    });
  } catch (err: any) {
    console.error('[sync-catalog]', err);
    return res.status(502).json({ error: err.message || 'Sync failed' });
  }
}
