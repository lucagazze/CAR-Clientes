const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnyvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ALGORITMIA_PAGE_ID = '925570770649286';
const CONV_ID = 'aWdfZAG06MTpJR01lc3NhZA2VUaHJlYWQ6MTc4NDE0NTQwMDE0OTc4MDQ6MzQwMjgyMzY2ODQxNzEwMzAxMjQ0MjU5MDk1NzU0ODc5NzM2MDMx';

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  
  const token = settings?.value;
  if (!token) return;

  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === ALGORITMIA_PAGE_ID);
  if (!page) return;
  const pageToken = page.access_token;

  console.log(`Querying messages for conversation: ${CONV_ID}`);
  const msgRes = await fetch(`https://graph.facebook.com/v21.0/${CONV_ID}/messages?fields=id,message,from,created_time&access_token=${pageToken}&limit=10`).then(r => r.json());
  
  if (msgRes.error) {
    console.error('❌ Error fetching messages:', msgRes.error);
  } else {
    console.log(`✅ Messages count: ${msgRes.data?.length || 0}`);
    console.log('Messages:', JSON.stringify(msgRes.data, null, 2));
  }
}

main().catch(console.error);
