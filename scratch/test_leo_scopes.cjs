const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const LEO_PAGE_ID = '574188879102510';

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  const token = settings?.value;
  if (!token) return;

  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === LEO_PAGE_ID);
  if (!page) {
    console.log('Page not associated');
    return;
  }
  const pageToken = page.access_token;

  console.log('--- Page Access Token details ---');
  const debug = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${pageToken}&access_token=${token}`).then(r => r.json());
  console.log('Debug result:', JSON.stringify(debug, null, 2));

  console.log('\n--- Page Permissions ---');
  const perms = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${pageToken}`).then(r => r.json());
  console.log('Permissions result:', JSON.stringify(perms, null, 2));
}

main();
