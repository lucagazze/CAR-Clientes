const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: client, error } = await supabase
    .from('car_clients')
    .select('wordpress_url, woo_consumer_key, woo_consumer_secret')
    .eq('business_name', 'Materia Prima Telas')
    .single();

  if (error || !client) {
    console.error("Failed to fetch client credentials from database:", error);
    return;
  }

  const { wordpress_url, woo_consumer_key, woo_consumer_secret } = client;
  console.log("Found client credentials:");
  console.log("URL:", wordpress_url);
  console.log("Key starting with:", woo_consumer_key.slice(0, 10));

  const base = wordpress_url.replace(/\/$/, '');
  const creds = Buffer.from(`${woo_consumer_key}:${woo_consumer_secret}`).toString('base64');
  const headers = { Authorization: `Basic ${creds}` };

  console.log("Fetching orders from WooCommerce...");
  const res = await fetch(`${base}/wp-json/wc/v3/orders?per_page=40`, { headers });
  if (!res.ok) {
    console.error("Failed to fetch WooCommerce orders:", res.status, await res.text());
    return;
  }
  const orders = await res.json();
  console.log(`Successfully fetched ${orders.length} orders.`);
  
  if (orders.length > 0) {
    console.log("Sample Order billing email:", orders[0].billing?.email);
    console.log("Sample Order date_created_gmt:", orders[0].date_created_gmt);
    console.log("Sample Order status:", orders[0].status);
  }
}

main().catch(console.error);
