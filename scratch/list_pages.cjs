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

  console.log('Fetching connected accounts from me/accounts...');
  const res = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100&fields=id,name,instagram_business_account{id,username,name,profile_picture_url},tasks`).then(r => r.json());

  if (res.error) {
    console.error('Error fetching accounts:', res.error);
    return;
  }

  console.log(`Found ${res.data?.length || 0} pages connected:`);
  (res.data || []).forEach(p => {
    console.log(`- Page: ${p.name} (ID: ${p.id})`);
    console.log(`  Tasks/Permissions on Page: ${JSON.stringify(p.tasks)}`);
    if (p.instagram_business_account) {
      console.log(`  IG Business Account: ${p.instagram_business_account.username} (ID: ${p.instagram_business_account.id})`);
    } else {
      console.log('  IG Business Account: NONE LINKED or NO PERMISSION');
    }
    console.log('----------------------------------------------------');
  });
}

main().catch(console.error);
