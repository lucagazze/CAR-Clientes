import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data, error } = await supabase.from('car_clients').select('*');
  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }
  console.log('CLIENTS IN DATABASE:');
  data.forEach(c => {
    console.log(JSON.stringify({
      id: c.id,
      business_name: c.business_name,
      is_admin: c.is_admin,
      meta_account_id: c.meta_account_id,
      ecommerce_platform: c.ecommerce_platform,
      shopify_domain: c.shopify_domain,
      shopify_access_token: c.shopify_access_token ? c.shopify_access_token.substring(0, 8) + '...' : null,
      klaviyo_api_key: c.klaviyo_api_key ? 'configured' : null
    }, null, 2));
  });
}

run();
