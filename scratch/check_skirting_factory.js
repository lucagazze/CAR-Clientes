import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  try {
    const { data: clients, error } = await supabase
      .from('car_clients')
      .select('id, business_name, fb_page_id, fb_page_name, ig_business_id, ig_username, meta_account_id')
      .ilike('business_name', '%skirting%');

    if (error) throw error;
    console.log('CLIENT DATA:', JSON.stringify(clients, null, 2));
  } catch (err) {
    console.error('Error querying Supabase:', err);
  }
}

check();
