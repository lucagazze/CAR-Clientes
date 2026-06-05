const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('value')
    .eq('key', 'meta_ads_token')
    .single();
  const token = settings?.value;
  if (!token) return;

  const base = 'https://graph.facebook.com/v21.0';
  const storyId = '101165642053074_1337695755075017'; // Failed carousel story ID
  
  const resPage = await fetch(`${base}/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  const page = (resPage.data || []).find((p) => String(p.id) === '101165642053074');
  const pageToken = page?.access_token || token;

  const res = await fetch(`${base}/${storyId}?fields=id,message,status_type,full_picture,attachments&access_token=${pageToken}`);
  const data = await res.json();
  console.log("Post structure for carousel ad:", JSON.stringify(data, null, 2));
}

main();
