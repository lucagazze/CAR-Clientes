const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const clientId = "93c9b4cf-4688-4a60-9f0d-844f380f8ce8"; // Materia Prima Telas

function normalizeOrder(o, platform) {
  const isCancelled = ['cancelled', 'failed'].includes(o.status);
  const financial_status = o.status === 'completed' || o.status === 'processing' ? 'paid' : o.status === 'refunded' ? 'refunded' : 'pending';
  const fulfillment_status = o.status === 'completed' ? 'fulfilled' : 'unfulfilled';
  return {
    id: o.id,
    order_number: `#${o.number}`,
    created_at: o.date_created,
    cancelled_at: isCancelled ? o.date_modified || new Date().toISOString() : null,
    total_price: parseFloat(o.total || 0),
    subtotal_price: parseFloat(o.total || 0) - parseFloat(o.shipping_total || 0),
    total_discounts: parseFloat(o.discount_total || 0),
    total_tax: parseFloat(o.total_tax || 0),
    financial_status,
    fulfillment_status,
    customer_name: o.billing ? `${o.billing.first_name || ''} ${o.billing.last_name || ''}`.trim() : 'Sin Cliente',
    email: o.billing?.email || null,
    phone: o.billing?.phone || null,
    customer: o.billing ? {
      first_name: o.billing.first_name,
      last_name: o.billing.last_name,
      email: o.billing.email,
      phone: o.billing.phone,
      orders_count: 1,
      total_spent: parseFloat(o.total || 0)
    } : null
  };
}

async function main() {
  const { data: cl, error: clErr } = await supabase
    .from('car_clients')
    .select('ecommerce_platform, shopify_domain, shopify_access_token, wordpress_url, woo_consumer_key, woo_consumer_secret, tiendanube_store_id, tiendanube_access_token')
    .eq('id', clientId)
    .single();

  if (clErr || !cl) {
    console.error("Failed to load client:", clErr);
    return;
  }

  const active_wordpress_url = cl.wordpress_url;
  const active_woo_consumer_key = cl.woo_consumer_key;
  const active_woo_consumer_secret = cl.woo_consumer_secret;

  const since = "2026-05-27";
  const until = "2026-06-10";

  const sinceIso = new Date(`${since}T00:00:00-03:00`).toISOString();
  const untilIso = new Date(`${until}T23:59:59-03:00`).toISOString();

  console.log("Querying WooCommerce between:", sinceIso, "and", untilIso);

  const base = (active_wordpress_url || '').replace(/\/$/, '');
  const creds = Buffer.from(`${active_woo_consumer_key}:${active_woo_consumer_secret}`).toString('base64');
  const wcHeaders = { Authorization: `Basic ${creds}` };

  console.log("Fetching range, recent, and history...");
  const [wRangeRes, wRecentRes, wHistRes] = await Promise.all([
    fetch(`${base}/wp-json/wc/v3/orders?after=${sinceIso}&before=${untilIso}&per_page=100`, { headers: wcHeaders }),
    fetch(`${base}/wp-json/wc/v3/orders?per_page=40`, { headers: wcHeaders }),
    fetch(`${base}/wp-json/wc/v3/orders?per_page=100`, { headers: wcHeaders }),
  ]);

  if (!wRangeRes.ok) console.error("wRangeRes error:", wRangeRes.status, await wRangeRes.text());
  if (!wRecentRes.ok) console.error("wRecentRes error:", wRecentRes.status, await wRecentRes.text());
  if (!wHistRes.ok) console.error("wHistRes error:", wHistRes.status, await wHistRes.text());

  const wRangeData = wRangeRes.ok ? await wRangeRes.json() : [];
  const wRecentData = wRecentRes.ok ? await wRecentRes.json() : [];
  const wHistData = wHistRes.ok ? await wHistRes.json() : [];

  console.log("Range orders fetched:", wRangeData.length);
  console.log("Recent orders fetched:", wRecentData.length);
  console.log("History orders fetched:", wHistData.length);

  const rawOrders = Array.isArray(wRangeData) ? wRangeData : [];
  const rawRecent = Array.isArray(wRecentData) ? wRecentData : [];

  const orders = rawOrders.map(o => normalizeOrder(o, 'wordpress'));
  const recentOrders = rawRecent.map(o => normalizeOrder(o, 'wordpress'));

  console.log("Normalized orders count:", orders.length);

  const uniqueEmails = [...new Set(
    [...orders, ...recentOrders]
      .map((o) => (o.customer?.email || '').toLowerCase().trim())
      .filter(Boolean)
  )];

  console.log("Unique emails:", uniqueEmails);

  const nonShopifyLifetime = {};
  const nonShopifySpent = {};

  console.log("Fetching lifetimes for", uniqueEmails.length, "emails...");
  await Promise.all(
    uniqueEmails.map(async (email) => {
      try {
        const res = await fetch(`${base}/wp-json/wc/v3/orders?search=${encodeURIComponent(email)}&per_page=100`, { headers: wcHeaders });
        if (res.ok) {
          const totalCountHeader = res.headers.get('X-WP-Total');
          const ordersData = await res.json();
          const filtered = ordersData.filter((o) => (o.billing?.email || '').toLowerCase().trim() === email.toLowerCase().trim());
          const count = totalCountHeader ? parseInt(totalCountHeader, 10) : filtered.length;
          const spent = filtered.reduce((sum, ord) => sum + parseFloat(ord.total || 0), 0);
          nonShopifyLifetime[email] = count;
          nonShopifySpent[email] = spent;
          console.log(`Email: ${email}, Count: ${count}, Spent: ${spent}`);
        } else {
          console.error(`Error res not ok for email ${email}:`, res.status);
        }
      } catch (err) {
        console.error('[WooCommerce Scraper] Error fetching customer orders:', err);
      }
    })
  );

  console.log("Done");
}

main().catch(console.error);
