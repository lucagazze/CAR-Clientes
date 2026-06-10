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

  const { wordpress_url, woo_consumer_key, woo_consumer_secret } = client;
  const base = wordpress_url.replace(/\/$/, '');
  const creds = Buffer.from(`${woo_consumer_key}:${woo_consumer_secret}`).toString('base64');
  const headers = { Authorization: `Basic ${creds}` };

  const sinceIso = new Date("2026-06-01T00:00:00-03:00").toISOString();
  const untilIso = new Date("2026-06-11T23:59:59-03:00").toISOString();

  console.log("Date ranges being queried:");
  console.log("after (since):", sinceIso);
  console.log("before (until):", untilIso);

  const url = `${base}/wp-json/wc/v3/orders?after=${sinceIso}&before=${untilIso}&per_page=100`;
  console.log("Fetching from URL:", url);
  const res = await fetch(url, { headers });
  const data = await res.json();
  console.log(`Response status: ${res.status}`);
  console.log(`Returned orders count: ${Array.isArray(data) ? data.length : "Not an array"}`);
}

main().catch(console.error);
