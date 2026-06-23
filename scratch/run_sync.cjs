const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const clientId = 'e33a4b38-56a3-4638-a508-1682f2898978';
  console.log('Fetching client credentials...');
  const { data: cl } = await supabase
    .from('car_clients')
    .select('meta_account_id, shopify_domain, shopify_access_token, website_url, wordpress_url, woo_consumer_key, woo_consumer_secret, tiendanube_store_id, tiendanube_access_token, facebook_access_token')
    .eq('id', clientId)
    .maybeSingle();

  if (!cl) {
    console.error('Client not found');
    return;
  }

  console.log('Tiendanube Store ID:', cl.tiendanube_store_id);
  console.log('Tiendanube Token Exists:', !!cl.tiendanube_access_token);

  let catalog = [];
  let source = '';

  // Simulate Tiendanube block
  try {
    let allTN = [];
    for (let page = 1; page <= 3; page++) {
      console.log(`Fetching page ${page} from Tiendanube...`);
      const r = await fetch(`https://api.tiendanube.com/v1/${cl.tiendanube_store_id}/products?per_page=200&page=${page}`, {
        headers: { 'Authentication': `bearer ${cl.tiendanube_access_token}`, 'User-Agent': 'AlgorBot/1.0' }
      });
      if (!r.ok) {
        console.error('Page fetch failed status:', r.status);
        break;
      }
      const data = await r.json();
      if (!data.length) {
        console.log('No more data.');
        break;
      }
      allTN = allTN.concat(data);
    }
    console.log(`Fetched ${allTN.length} raw products. Mapping...`);
    catalog = allTN.map((p) => {
      const img = p.images?.[0]?.src || null;
      console.log(`Product: ${p.name?.es || p.name?.en || 'unnamed'}, Image: ${img}`);
      return {
        id: p.id || '',
        title: p.name?.es || p.name?.en || Object.values(p.name || {})[0] || '',
        handle: p.handle || '',
        type: p.categories?.[0]?.name?.es || '',
        tags: '',
        price: p.variants?.[0]?.price ? `$${p.variants[0].price}` : 'Consultar',
        variants: (p.variants || []).map((v) => v.values?.map((val) => val.es || val.en).join(' / ') || '').filter(Boolean),
        source: 'tiendanube',
        url: p.canonical_url || '',
        image: img
      };
    });
    source = `Tiendanube (${catalog.length} productos)`;
  } catch (e) {
    console.error('Tiendanube failed:', e);
  }

  console.log('Catalog mapped count:', catalog.length);
  if (catalog.length > 0) {
    console.log('Updating database...');
    const syncedAt = new Date().toISOString();
    const { error: ue } = await supabase
      .from('car_clients')
      .update({ products_catalog: JSON.stringify(catalog), catalog_synced_at: syncedAt })
      .eq('id', clientId);
    if (ue) {
      console.error('Database update failed:', ue.message);
    } else {
      console.log('Database updated successfully! Synced at:', syncedAt);
    }
  }
}

main();
