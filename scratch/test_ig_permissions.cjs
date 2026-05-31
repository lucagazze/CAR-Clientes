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

  const fbPageId = '925570770649286';
  const meAccountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`;
  const accountsRes = await fetch(meAccountsUrl).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === String(fbPageId));
  const pageToken = page?.access_token || token;

  console.log('--- Fetching platform=instagram conversations ---');
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${fbPageId}/conversations?platform=instagram&access_token=${pageToken}&limit=50`).then(r => r.json());
  console.log('IG count:', igRes?.data?.length || 0);
  if (igRes?.data) {
    igRes.data.forEach(c => console.log(`- ID: ${c.id}, Updated: ${c.updated_time}`));
  }

  console.log('--- Fetching platform=messenger conversations ---');
  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${fbPageId}/conversations?platform=messenger&access_token=${pageToken}&limit=50`).then(r => r.json());
  console.log('Messenger count:', fbRes?.data?.length || 0);
  if (fbRes?.data) {
    fbRes.data.forEach(c => console.log(`- ID: ${c.id}, Updated: ${c.updated_time}`));
  }
}

main();
