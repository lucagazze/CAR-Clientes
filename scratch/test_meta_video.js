import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getMetaToken() {
  const { data } = await supabase.from('AgencySettings').select('value').eq('key', 'meta_ads_token').maybeSingle();
  return data?.value || '';
}

async function testCreative(creativeId) {
  const token = await getMetaToken();
  const url = `https://graph.facebook.com/v21.0/${creativeId}?fields=video_id,object_story_spec,asset_feed_spec,object_type,image_url,thumbnail_url,account_id,effective_object_story_id,effective_instagram_story_id,object_story_id&access_token=${token}`;
  
  console.log("Fetching creative url:", url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Creative Response Status:", res.status);
    console.log("Creative Response:", JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error("Error fetching creative:", err);
  }
}

async function run() {
  // Let's first fetch one ad account and find some ads / creatives
  const token = await getMetaToken();
  console.log("Meta token active:", !!token);

  // Let's fetch ads for one of the clients' accounts
  const { data: clients } = await supabase.from('car_clients').select('business_name, meta_account_id').not('meta_account_id', 'is', null);
  console.log("Found clients with meta account:");
  console.log(clients);

  if (clients && clients.length > 0) {
    const actId = clients[0].meta_account_id;
    console.log(`Fetching ads for account ${actId} (Client: ${clients[0].business_name})...`);
    // Query Meta Graph API for ads
    const adsUrl = `https://graph.facebook.com/v21.0/${actId}/ads?fields=id,name,creative{id}&status=["ACTIVE"]&limit=5&access_token=${token}`;
    const adsRes = await fetch(adsUrl);
    const adsData = await adsRes.json();
    console.log("Ads response:", JSON.stringify(adsData, null, 2));

    if (adsData.data && adsData.data.length > 0) {
        await testCreative("1658748518472586");
    }
  }
}

run();
