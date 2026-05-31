import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const NEW_TOKEN = "EAARvpoGdZCfIBRvqIYbjMZCcIZCFVjKeu6GStKQed5WIRyCjKIN7ASzHeMoNOvhXwZCW4crWIwcQHeSk5k5rTHHumDtLJ3UFZB8IA0xNEYoZB9LbLZAxAIxnyZAp7IGtuIHliixZCbcX7B5NZAGyLdRliBEs1iKCRC4QziIMvMi58ON4U6QNpBzZCBJpITgwww64MQvwHTV29gBCgxFCER7xsW53GrsYUDD6QVgDg0nGH2UIZBaeZAxLKrn5EfPzboX0JGJjwq2bQBB8817RBBxofsiNnwl8yf2Ohkx3lTvQtkS4ZD";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const pageId = '101165642053074';

async function run() {
  // 1. Update token in Supabase
  console.log('Updating token in Supabase...');
  const { error } = await supabase
    .from('AgencySettings')
    .upsert({ key: 'meta_ads_token', value: NEW_TOKEN }, { onConflict: 'key' });

  if (error) {
    console.error('Error updating token:', error.message);
    return;
  }
  console.log('✅ Token updated in Supabase\n');

  // 2. Get Page Access Token using the new token
  const resMe = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const pageObj = (resMe?.data || []).find(p => p.id === pageId);
  const pageToken = pageObj?.access_token || NEW_TOKEN;
  console.log('Page token retrieved:', !!pageToken);

  // 3. Check permissions
  const permsRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${NEW_TOKEN}`).then(r => r.json());
  const granted = (permsRes?.data || []).filter(p => p.status === 'granted').map(p => p.permission);
  console.log('\n--- PERMISSIONS ---');
  console.log('instagram_manage_messages:', granted.includes('instagram_manage_messages') ? '✅ YES' : '❌ NO');
  console.log('pages_messaging:', granted.includes('pages_messaging') ? '✅ YES' : '❌ NO');

  // 4. Test Instagram DMs
  console.log('\n--- INSTAGRAM DMs TEST ---');
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time,messages.limit(1){id,message,from,created_time}&limit=25`).then(r => r.json());
  
  if (igRes.error) {
    console.log('❌ Error:', igRes.error.message);
  } else {
    const count = igRes?.data?.length || 0;
    console.log(`✅ Instagram DMs: ${count} conversaciones encontradas`);
    if (count > 0) {
      igRes.data.slice(0, 3).forEach(conv => {
        const participant = conv.participants?.data?.find(p => p.id !== pageId);
        console.log(`  - ${participant?.name || 'Unknown'} (unread: ${conv.unread_count})`);
      });
    }
  }

  // 5. Test Facebook DMs
  console.log('\n--- FACEBOOK DMs TEST ---');
  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants,unread_count&limit=5`).then(r => r.json());
  console.log(`✅ Facebook DMs: ${fbRes?.data?.length || 0} conversaciones encontradas`);
}

run().catch(console.error);
