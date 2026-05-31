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

  console.log('Fetching Page Access Token for The Skirting Factory Page:', fbPageId);
  const meAccountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`;
  const accountsRes = await fetch(meAccountsUrl).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === String(fbPageId));
  
  if (!page) {
    console.error('Page NOT found in me/accounts for The Skirting Factory!');
    return;
  }
  const pageToken = page.access_token;
  console.log('Page found:', page.name);

  // 1. Fetch conversations
  console.log('Fetching conversations...');
  const convsUrl = `https://graph.facebook.com/v21.0/${fbPageId}/conversations?platform=instagram&access_token=${pageToken}&limit=10`;
  const convsRes = await fetch(convsUrl).then(r => r.json());
  console.log('Conversations count:', convsRes?.data?.length || 0);
  console.log('Response:', JSON.stringify(convsRes, null, 2));
}

main();
