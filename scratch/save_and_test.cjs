const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";

const PAGE_ID = '101165642053074';

async function main() {
  console.log('Debugging newly generated permanent system user token...');
  const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${NEW_TOKEN}&access_token=${NEW_TOKEN}`).then(r => r.json());
  
  if (debugRes.error) {
    console.error('❌ Debug Error:', debugRes.error);
    return;
  }
  console.log('✅ Token Debug Info (expires_at):', debugRes.data.expires_at === 0 ? 'Never (Permanent)' : debugRes.data.expires_at);

  // 1. Save new token in Supabase
  console.log('Saving token in Supabase AgencySettings...');
  const { error: dbError } = await supabase
    .from('AgencySettings')
    .upsert({ key: 'meta_ads_token', value: NEW_TOKEN }, { onConflict: 'key' });

  if (dbError) {
    console.error('❌ Error saving token:', dbError);
    return;
  }
  console.log('✅ Token successfully updated in Supabase!');

  // 2. Fetch page token for The Skirting Factory
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  if (accountsRes.error) {
    console.error('❌ Error listing accounts:', accountsRes.error);
    return;
  }
  
  const page = (accountsRes?.data || []).find(p => String(p.id) === PAGE_ID);
  if (!page) {
    console.error('❌ The Skirting Factory page not found in accounts.');
    console.log('Available pages for this system user token:', (accountsRes.data || []).map(p => `${p.name} (${p.id})`));
    return;
  }
  const pageToken = page.access_token;
  console.log(`✅ Page Token found for: ${page.name}`);

  // 3. Test querying DMs
  console.log('Fetching DMs from Meta...');
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time,messages.limit(5){id,message,from,created_time}&limit=10`).then(r => r.json());
  
  if (igRes.error) {
    console.error('❌ Error fetching DMs:', igRes.error);
  } else {
    console.log(`✅ Conversations found: ${igRes.data?.length || 0}`);
    console.log('Data:', JSON.stringify(igRes.data, null, 2));
  }
}

main().catch(console.error);
