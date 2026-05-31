const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SKIRTING_PAGE_ID = '101165642053074';
const SKIRTING_IG_ID = '17841438826922358';

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('*')
    .eq('key', 'meta_ads_token')
    .single();
  const token = settings?.value;
  if (!token) return;

  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === SKIRTING_PAGE_ID);
  if (!page) {
    console.log('❌ Page not found');
    return;
  }
  const pageToken = page.access_token;
  console.log(`Page: ${page.name}`);

  // Query IG conversations
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${SKIRTING_PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=5`).then(r => r.json());
  if (igRes.error) {
    console.error('❌ IG Error:', igRes.error);
  } else {
    console.log(`✅ IG conversations count: ${igRes.data?.length || 0}`);
  }

  // Query Messenger conversations
  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${SKIRTING_PAGE_ID}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=5`).then(r => r.json());
  if (fbRes.error) {
    console.error('❌ FB Error:', fbRes.error);
  } else {
    console.log(`✅ FB conversations count: ${fbRes.data?.length || 0}`);
  }
}

main();
