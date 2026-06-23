const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: cl, error } = await supabase
    .from('car_clients')
    .select('tiendanube_store_id, tiendanube_access_token')
    .eq('id', 'e33a4b38-56a3-4638-a508-1682f2898978')
    .maybeSingle();

  if (error || !cl) {
    console.error('Error fetching client credentials:', error);
    return;
  }

  console.log(`Calling Tiendanube API for Store ID: ${cl.tiendanube_store_id}`);
  const r = await fetch(`https://api.tiendanube.com/v1/${cl.tiendanube_store_id}/products?per_page=1`, {
    headers: { 'Authentication': `bearer ${cl.tiendanube_access_token}`, 'User-Agent': 'AlgorBot/1.0' }
  });
  
  if (!r.ok) {
    console.error('Tiendanube API failed:', r.status, await r.text());
    return;
  }

  const products = await r.json();
  if (products && products.length > 0) {
    const p = products[0];
    console.log('Tiendanube Raw Product Images structure:');
    console.log(JSON.stringify(p.images, null, 2));
  } else {
    console.log('No products found in Tiendanube store.');
  }
}

main();
