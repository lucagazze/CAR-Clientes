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
  
  if (accountsRes.error) {
    console.error('Error fetching accounts:', accountsRes.error);
    return;
  }

  const page = (accountsRes?.data || []).find(p => String(p.id) === String(fbPageId));
  console.log('Page found:', page ? { name: page.name, id: page.id, hasToken: !!page.access_token } : 'NOT FOUND');

  const pageToken = page?.access_token;
  if (!pageToken) {
    console.error('No page token found!');
    return;
  }

  const correctConvId = "aWdfZDo5MjU1NzA3NzA2NDkyODY6R1BTOjE3ODQxNDU0MDAxNDk3ODA0OjE3ODQxNDM4ODI2OTIyMzU4";
  
  console.log('--- Querying message field ---');
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${correctConvId}/messages?fields=id,message,from,created_time&access_token=${pageToken}&limit=3`).then(r => r.json());
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
