import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PAGE_ID = '101165642053074';
const IG_ID   = '17841438826922358';

async function run() {
  // 1. Get token
  const { data } = await supabase.from('AgencySettings').select('value').eq('key','meta_ads_token').maybeSingle();
  const userToken = data?.value;
  if (!userToken) { console.error('❌ Token not found in Supabase'); return; }
  console.log('✅ Token found in Supabase\n');

  // 2. Get page token
  const accounts = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}&limit=100&fields=id,name,access_token,instagram_business_account`).then(r=>r.json());
  const page = (accounts?.data||[]).find(p=>p.id===PAGE_ID);
  if (!page) { console.error('❌ Page not found in token accounts!'); return; }
  const pageToken = page.access_token || userToken;
  console.log(`✅ Page found: ${page.name}`);
  console.log(`   Instagram linked: ${page.instagram_business_account ? '✅ YES → ' + JSON.stringify(page.instagram_business_account) : '❌ NO'}\n`);

  // 3. Check permissions
  const perms = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${userToken}`).then(r=>r.json());
  const granted = (perms?.data||[]).filter(p=>p.status==='granted').map(p=>p.permission);
  const hasIGMsg = granted.includes('instagram_manage_messages');
  console.log(`instagram_manage_messages: ${hasIGMsg ? '✅ YES' : '❌ NO'}`);

  // 4. Check app access level via token debug
  const debug = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${userToken}&access_token=${userToken}`).then(r=>r.json());
  const appId = debug?.data?.app_id;
  const scopes = debug?.data?.scopes || [];
  console.log(`\nApp ID: ${appId}`);
  console.log(`Token scopes: ${scopes.join(', ')}`);
  console.log(`instagram_manage_messages in token scopes: ${scopes.includes('instagram_manage_messages') ? '✅ YES' : '❌ NO'}\n`);

  // 5. Try ALL variations of IG DM endpoint
  console.log('--- TESTING ALL INSTAGRAM DM ENDPOINTS ---');

  const tests = [
    { label: 'Page + platform=instagram (v21)', url: `https://graph.facebook.com/v21.0/${PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=50` },
    { label: 'Page + platform=instagram (v19)', url: `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=50` },
    { label: 'IG ID + conversations (v21)', url: `https://graph.facebook.com/v21.0/${IG_ID}/conversations?access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=50` },
    { label: 'Page + folder=inbox + platform=instagram', url: `https://graph.facebook.com/v21.0/${PAGE_ID}/conversations?platform=instagram&folder=inbox&access_token=${pageToken}&fields=id,participants,unread_count&limit=50` },
    { label: 'IG inbox messages direct', url: `https://graph.facebook.com/v21.0/${IG_ID}/messages?access_token=${pageToken}&fields=id,message,from,to,created_time&limit=10` },
  ];

  for (const test of tests) {
    const res = await fetch(test.url).then(r=>r.json());
    if (res.error) {
      console.log(`❌ ${test.label}: ${res.error.message} (code ${res.error.code})`);
    } else {
      const count = res?.data?.length ?? 'N/A';
      console.log(`${count > 0 ? '✅' : '⚠️ '} ${test.label}: ${count} result(s)`);
      if (count > 0) {
        console.log('   First item:', JSON.stringify(res.data[0]).slice(0, 200));
      }
    }
  }

  // 6. Check if IG account has messaging enabled
  console.log('\n--- IG ACCOUNT MESSAGING SETTINGS ---');
  const igInfo = await fetch(`https://graph.facebook.com/v21.0/${IG_ID}?fields=id,name,username,followers_count,is_private&access_token=${pageToken}`).then(r=>r.json());
  console.log('IG Account info:', JSON.stringify(igInfo, null, 2));

  // 7. Check page settings for messaging
  console.log('\n--- PAGE MESSAGING SETTINGS ---');
  const pageInfo = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}?fields=id,name,messaging_feature_status&access_token=${pageToken}`).then(r=>r.json());
  console.log('Page messaging status:', JSON.stringify(pageInfo, null, 2));

  // 8. FB DMs for reference
  console.log('\n--- FACEBOOK DMs (reference, should work) ---');
  const fbDMs = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants,unread_count&limit=5`).then(r=>r.json());
  console.log(`✅ Facebook DMs: ${fbDMs?.data?.length || 0} conversations found`);
}

run().catch(console.error);
