const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  const token = settings.value;

  const testPages = [
    { name: 'Algoritmia', id: '925570770649286' },
    { name: 'Libreria Mayorista Leo', id: '574188879102510' },
    { name: 'The Skirting Factory', id: '101165642053074' }
  ];

  // Fetch Page tokens
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  
  for (const pageInfo of testPages) {
    const page = (accountsRes?.data || []).find(p => String(p.id) === pageInfo.id);
    if (!page) {
      console.log(`❌ Page ${pageInfo.name} not found in token accounts.`);
      continue;
    }
    const pageToken = page.access_token;
    
    console.log(`\n--- Querying ${pageInfo.name} ---`);
    
    // Instagram conversations
    const igUrl = `https://graph.facebook.com/v21.0/${pageInfo.id}/conversations?platform=instagram&access_token=${pageToken}&limit=5`;
    const igRes = await fetch(igUrl).then(r => r.json());
    if (igRes.error) {
      console.log(`  Instagram Error: ${igRes.error.message}`);
    } else {
      console.log(`  Instagram Conversations: ${igRes.data?.length || 0}`);
      if (igRes.data && igRes.data.length > 0) {
        console.log(`  Example IG Conversation IDs: ${igRes.data.map(c => c.id).join(', ')}`);
      }
    }

    // Messenger conversations
    const fbUrl = `https://graph.facebook.com/v21.0/${pageInfo.id}/conversations?platform=messenger&access_token=${pageToken}&limit=5`;
    const fbRes = await fetch(fbUrl).then(r => r.json());
    if (fbRes.error) {
      console.log(`  Messenger Error: ${fbRes.error.message}`);
    } else {
      console.log(`  Messenger Conversations: ${fbRes.data?.length || 0}`);
      if (fbRes.data && fbRes.data.length > 0) {
        console.log(`  Example Messenger Conversation IDs: ${fbRes.data.map(c => c.id).join(', ')}`);
      }
    }
  }
}

main().catch(console.error);
