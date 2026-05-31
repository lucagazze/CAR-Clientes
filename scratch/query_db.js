const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // 1. Get meta token
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  
  console.log('Meta token:', settings?.value ? (settings.value.slice(0, 15) + '...') : 'not found');
  
  // 2. Get clients
  const { data: clients, error } = await supabase
    .from('car_clients')
    .select('id, name, fb_page_id, ig_business_id, ig_username');
  
  if (error) {
    console.error('Error fetching clients:', error);
  } else {
    console.log('Clients:');
    clients.forEach(c => {
      console.log(`- ${c.name} (ID: ${c.id}): FB Page: ${c.fb_page_id}, IG ID: ${c.ig_business_id}, IG User: ${c.ig_username}`);
    });
  }
}

main();
