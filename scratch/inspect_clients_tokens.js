import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data: clients, error } = await supabase
    .from('car_clients')
    .select('id, business_name, meta_account_id, fb_page_id, fb_page_name, fb_page_access_token, facebook_access_token');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${clients.length} clients:`);
  clients.forEach(c => {
    console.log(`\nClient: ${c.business_name} (ID: ${c.id})`);
    console.log(`- meta_account_id: ${c.meta_account_id}`);
    console.log(`- fb_page_id: ${c.fb_page_id} (${c.fb_page_name})`);
    console.log(`- fb_page_access_token exists: ${!!c.fb_page_access_token}`);
    if (c.fb_page_access_token) {
      console.log(`  Preview: ${c.fb_page_access_token.substring(0, 15)}...`);
    }
    console.log(`- facebook_access_token exists: ${!!c.facebook_access_token}`);
    if (c.facebook_access_token) {
      console.log(`  Preview: ${c.facebook_access_token.substring(0, 15)}...`);
    }
  });
}

run();
