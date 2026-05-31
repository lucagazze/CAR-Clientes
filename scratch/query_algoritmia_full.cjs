const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: client, error } = await supabase
    .from('car_clients')
    .select('*')
    .eq('business_name', 'Algoritmia')
    .single();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Algoritmia full record:');
    console.log('ID:', client.id);
    console.log('fb_page_id:', client.fb_page_id);
    console.log('fb_page_name:', client.fb_page_name);
    console.log('ig_business_id:', client.ig_business_id);
    console.log('ig_username:', client.ig_username);
    console.log('fb_page_access_token exists:', !!client.fb_page_access_token);
    if (client.fb_page_access_token) {
      console.log('Token length:', client.fb_page_access_token.length);
      console.log('Token snippet:', client.fb_page_access_token.slice(0, 20) + '...');
    }
  }
}

main();
