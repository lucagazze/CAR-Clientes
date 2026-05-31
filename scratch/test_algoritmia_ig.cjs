const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ALGORITMIA_PAGE_ID = '925570770649286';

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  
  const token = settings?.value;
  if (!token) {
    console.error('❌ Meta Ads Token not found in AgencySettings');
    return;
  }
  
  console.log('✅ Agency token found');

  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  if (accountsRes.error) {
    console.error('❌ Error listing accounts:', accountsRes.error);
    return;
  }

  const page = (accountsRes?.data || []).find(p => String(p.id) === ALGORITMIA_PAGE_ID);
  if (!page) {
    console.log('❌ Algoritmia page not found in accounts.');
    console.log('Available accounts:', (accountsRes.data || []).map(p => `${p.name} (${p.id})`));
    return;
  }
  const pageToken = page.access_token;
  console.log(`✅ Found Page: ${page.name}`);

  // FB Messenger
  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${ALGORITMIA_PAGE_ID}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=5`).then(r => r.json());
  if (fbRes.error) {
    console.error('❌ FB Error:', fbRes.error);
  } else {
    console.log(`✅ FB Messenger conversations count: ${fbRes.data?.length || 0}`);
  }

  // Instagram DMs
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${ALGORITMIA_PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=5`).then(r => r.json());
  if (igRes.error) {
    console.error('❌ IG Error:', igRes.error);
  } else {
    console.log(`✅ IG conversations count: ${igRes.data?.length || 0}`);
    if (igRes.data && igRes.data.length > 0) {
      console.log('First conversation:', JSON.stringify(igRes.data[0]));
    }
  }
}

main().catch(console.error);
