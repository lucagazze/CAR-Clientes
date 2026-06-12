import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getMetaToken() {
  const { data } = await supabase.from('AgencySettings').select('value').eq('key', 'meta_ads_token').maybeSingle();
  return data?.value || '';
}

async function run() {
  const token = await getMetaToken();
  const vidId = "942250024873457";
  const url = `https://graph.facebook.com/v21.0/${vidId}?fields=source,picture,format&access_token=${token}`;
  
  console.log("Fetching video info url:", url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Video Response Status:", res.status);
    console.log("Video Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error fetching video:", err);
  }
}

run();
