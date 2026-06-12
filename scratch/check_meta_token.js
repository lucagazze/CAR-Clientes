import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("Fetching meta_ads_token from AgencySettings...");
  const { data: setting, error: errSetting } = await supabase
    .from('AgencySettings')
    .select('value')
    .eq('key', 'meta_ads_token')
    .maybeSingle();

  if (errSetting) {
    console.error("Error fetching setting:", errSetting);
    return;
  }

  const token = setting?.value;
  console.log("Token exists:", !!token);
  if (!token) return;

  console.log("Token preview:", token.substring(0, 20) + "..." + token.substring(token.length - 20));

  // Let's test the token against Meta Graph API
  const url = `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Meta me response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Meta Graph API fetch error:", err);
  }
}

run();
