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

  const fbPageId = '101165642053074'; // The Skirting Factory Page ID
  const igUserId = '17841438826922358'; // The Skirting Factory IG ID

  // Fetch Page Access Token
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === String(fbPageId));
  if (!page) {
    console.error('❌ Page not found in me/accounts');
    return;
  }
  const pageToken = page.access_token;
  console.log(`✅ Page Token obtained for ${page.name}`);

  // 1. Fetch Instagram media
  console.log('\n--- Fetching IG Media (Posts) ---');
  const mediaUrl = `https://graph.facebook.com/v21.0/${igUserId}/media?fields=id,caption,media_type,timestamp,permalink&limit=5&access_token=${pageToken}`;
  const mediaRes = await fetch(mediaUrl).then(r => r.json());
  if (mediaRes.error) {
    console.error('❌ Media Error:', mediaRes.error);
  } else {
    console.log(`✅ Media count: ${mediaRes.data?.length || 0}`);
    (mediaRes.data || []).forEach(m => {
      console.log(`- [${m.timestamp}] ID: ${m.id}, Caption: "${m.caption ? m.caption.slice(0, 50) + '...' : '(no caption)'}"`);
    });
  }

  // 2. Fetch conversations
  console.log('\n--- Fetching IG Conversations (DMs) ---');
  const convUrl = `https://graph.facebook.com/v21.0/${fbPageId}/conversations?platform=instagram&fields=id,participants,unread_count,updated_time,messages.limit(5){id,message,created_time,from}&limit=5&access_token=${pageToken}`;
  const convRes = await fetch(convUrl).then(r => r.json());
  if (convRes.error) {
    console.error('❌ Conversations Error:', convRes.error);
  } else {
    console.log(`✅ Conversations found: ${convRes.data?.length || 0}`);
    console.log('Full data:', JSON.stringify(convRes, null, 2));
  }
}

main().catch(console.error);
