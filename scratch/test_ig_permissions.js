import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testPermissions() {
  try {
    const { data: tokenData } = await supabase
      .from('AgencySettings')
      .select('value')
      .eq('key', 'meta_ads_token')
      .maybeSingle();

    const token = tokenData?.value;
    if (!token) { console.error('Token not found!'); return; }

    const pageId = '101165642053074';
    const igId = '17841438826922358';

    // Get Page Access Token
    const resMe = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
    const pageObj = (resMe?.data || []).find(p => p.id === pageId);
    const pageToken = pageObj?.access_token || token;
    console.log('Page token available:', !!pageToken);

    // 1. Check USER token permissions
    console.log('\n--- USER TOKEN PERMISSIONS ---');
    const userPerms = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`).then(r => r.json());
    const grantedPerms = (userPerms?.data || []).filter(p => p.status === 'granted').map(p => p.permission);
    console.log('Granted permissions:', grantedPerms.join(', '));
    const hasIGMessages = grantedPerms.includes('instagram_manage_messages');
    console.log('Has instagram_manage_messages:', hasIGMessages);

    // 2. Check PAGE token permissions
    console.log('\n--- PAGE TOKEN PERMISSIONS ---');
    const pagePerms = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${pageToken}`).then(r => r.json());
    const grantedPagePerms = (pagePerms?.data || []).filter(p => p.status === 'granted').map(p => p.permission);
    console.log('Page token granted permissions:', grantedPagePerms.join(', '));

    // 3. Try IG conversations with user token (not page token)
    console.log('\n--- IG CONVERSATIONS WITH USER TOKEN ---');
    const igUser = await fetch(`https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&access_token=${token}&fields=id,participants,unread_count,updated_time`).then(r => r.json());
    console.log('Result:', JSON.stringify(igUser, null, 2));

    // 4. Try IG conversations with page token
    console.log('\n--- IG CONVERSATIONS WITH PAGE TOKEN ---');
    const igPage = await fetch(`https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time`).then(r => r.json());
    console.log('Result:', JSON.stringify(igPage, null, 2));

    // 5. Try via IG Business Account node
    console.log('\n--- IG CONVERSATIONS VIA IG BUSINESS ID ---');
    const igBiz = await fetch(`https://graph.facebook.com/v21.0/${igId}/conversations?access_token=${pageToken}&fields=id,participants,unread_count,updated_time`).then(r => r.json());
    console.log('Result:', JSON.stringify(igBiz, null, 2));

    // 6. Fetch IG account info to confirm connection
    console.log('\n--- IG ACCOUNT INFO ---');
    const igInfo = await fetch(`https://graph.facebook.com/v21.0/${igId}?fields=id,name,username,followers_count&access_token=${pageToken}`).then(r => r.json());
    console.log('IG Account:', JSON.stringify(igInfo, null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

testPermissions();
