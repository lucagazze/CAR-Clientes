const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: clients, error } = await supabase
    .from('car_clients')
    .select('id, business_name, fb_page_id, fb_page_name, fb_page_access_token')
    .not('fb_page_access_token', 'is', null);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Clients with FB page access tokens:');
    clients.forEach(c => {
      console.log(`- ${c.business_name} (ID: ${c.id}): Page Name: ${c.fb_page_name}, Page ID: ${c.fb_page_id}, Token exists: ${!!c.fb_page_access_token}`);
    });
  }
}

main();
