const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: cl, error } = await supabase
    .from('car_clients')
    .select('products_catalog, catalog_synced_at')
    .eq('id', 'e33a4b38-56a3-4638-a508-1682f2898978')
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Catalog synced at:', cl.catalog_synced_at);
  if (!cl.products_catalog) {
    console.log('No catalog found in database.');
    return;
  }
  
  const catalog = typeof cl.products_catalog === 'string'
    ? JSON.parse(cl.products_catalog)
    : cl.products_catalog;
    
  console.log(`Number of products: ${catalog.length}`);
  console.log('First 3 products:');
  console.log(JSON.stringify(catalog.slice(0, 3), null, 2));
}

main();
