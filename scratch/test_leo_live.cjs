const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const LEO_PAGE_ID = '574188879102510';
const LEO_IG_ID = '17841438390504961';

async function main() {
  // 1. Get current token from Supabase
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  const token = settings?.value;
  if (!token) {
    console.error('❌ Token not found in Supabase');
    return;
  }
  console.log('✅ Token retrieved from Supabase');

  // 2. Fetch page accounts to get Page Access Token for Leo
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  if (accountsRes.error) {
    console.error('❌ Error listing accounts:', accountsRes.error);
    return;
  }

  const page = (accountsRes?.data || []).find(p => String(p.id) === LEO_PAGE_ID);
  if (!page) {
    console.log('❌ Leo page not found in accounts associated with the active Supabase token.');
    console.log('Available pages for this token:', (accountsRes.data || []).map(p => `${p.name} (${p.id})`));
    return;
  }
  const pageToken = page.access_token;
  console.log(`✅ Found Page: ${page.name}`);

  // 3. Query Messenger Conversations
  console.log('\n--- Querying Messenger Conversations for Leo ---');
  const msgrRes = await fetch(`https://graph.facebook.com/v21.0/${LEO_PAGE_ID}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=5`).then(r => r.json());
  if (msgrRes.error) {
    console.error('❌ Error fetching Messenger conversations:', msgrRes.error);
  } else {
    console.log(`✅ Found ${msgrRes.data?.length || 0} Messenger conversations`);
  }

  // 4. Query Instagram Conversations
  console.log('\n--- Querying IG Conversations for Leo ---');
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${LEO_PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=10`).then(r => r.json());
  
  if (igRes.error) {
    console.error('❌ Error fetching IG conversations:', igRes.error);
  } else {
    console.log(`✅ Found ${igRes.data?.length || 0} IG conversations:`);
    if (igRes.data) {
      for (const conv of igRes.data) {
        // Exclude the brand itself to show the customer
        const other = (conv.participants?.data || []).find(p => p.id !== LEO_PAGE_ID && p.id !== LEO_IG_ID);
        console.log(`- Conversation ID: ${conv.id}`);
        console.log(`  Customer: ${other ? `@${other.username} (ID: ${other.id})` : 'Unknown'}`);
        console.log(`  Unread count: ${conv.unread_count}, Last Updated: ${conv.updated_time}`);

        // Fetch last message for validation
        const msgsRes = await fetch(`https://graph.facebook.com/v21.0/${conv.id}/messages?fields=id,message,from,created_time&access_token=${pageToken}&limit=1`).then(r => r.json());
        if (msgsRes?.data?.[0]) {
          const lastMsg = msgsRes.data[0];
          const isFromMe = lastMsg.from?.id === LEO_PAGE_ID || lastMsg.from?.id === LEO_IG_ID;
          console.log(`  Last Message: "${lastMsg.message || '📎 Attachment'}"`);
          console.log(`  Sent by: ${isFromMe ? 'BRAND (Me)' : 'CUSTOMER'}`);
        }
      }
    }
  }
}

main().catch(console.error);
