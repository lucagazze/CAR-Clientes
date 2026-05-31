const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ALGORITMIA_PAGE_ID = '925570770649286';
const CONV_ID = 'aWdfZAG06MTpJR01lc3NhZA2VUaHJlYWQ6MTc4NDE0NTQwMDE0OTc4MDQ6MzQwMjgyMzY2ODQxNzEwMzAxMjQ0MjU5MDk1NzU0ODc5NzM2MDMx';

async function main() {
  console.log('1. Fetching settings...');
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  
  const token = settings?.value;
  if (!token) {
    console.error('❌ Token not found in DB');
    return;
  }
  console.log('Token snippet:', token.slice(0, 15) + '...');

  console.log('2. Fetching accounts...');
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  if (accountsRes.error) {
    console.error('❌ Error accounts:', accountsRes.error);
    return;
  }

  const page = (accountsRes?.data || []).find(p => String(p.id) === ALGORITMIA_PAGE_ID);
  if (!page) {
    console.log('❌ Page not found in accounts.');
    return;
  }
  const pageToken = page.access_token;
  console.log(`✅ Found Page: ${page.name}`);

  console.log('3. Fetching messages for conversation...');
  const msgRes = await fetch(`https://graph.facebook.com/v21.0/${CONV_ID}/messages?fields=id,message,from,created_time&access_token=${pageToken}&limit=10`).then(r => r.json());
  
  if (msgRes.error) {
    console.error('❌ Error fetching messages:', msgRes.error);
  } else {
    console.log(`✅ Messages count: ${msgRes.data?.length || 0}`);
    console.log('Messages:', JSON.stringify(msgRes.data, null, 2));
  }
}

main().catch(console.error);
