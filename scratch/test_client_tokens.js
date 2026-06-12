import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data: client, error } = await supabase
    .from('car_clients')
    .select('id, business_name, facebook_access_token, fb_page_access_token, fb_page_id')
    .eq('id', '260cff21-2c95-4e37-ba35-f9202fbeb613') // studionotem
    .maybeSingle();

  if (error || !client) {
    console.error("Error fetching client or not found:", error);
    return;
  }

  console.log(`Testing tokens for client: ${client.business_name}`);
  
  if (client.facebook_access_token) {
    console.log("Testing facebook_access_token...");
    const url = `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${client.facebook_access_token}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log("Facebook user response:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error testing facebook_access_token:", err);
    }
  } else {
    console.log("No facebook_access_token found for client");
  }

  if (client.fb_page_access_token && client.fb_page_id) {
    console.log(`Testing fb_page_access_token for page ${client.fb_page_id}...`);
    const url = `https://graph.facebook.com/v21.0/${client.fb_page_id}?fields=id,name&access_token=${client.fb_page_access_token}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log("Facebook page response:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error testing fb_page_access_token:", err);
    }
  } else {
    console.log("No fb_page_access_token or fb_page_id found for client");
  }
}

run();
