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
  // Let's test the client 'Libreria Leo'
  const actId = "act_2136106490563351";
  const fields = 'id,name,status,campaign_id,preview_shareable_link,creative{id,name,body,title,thumbnail_url,image_url,object_type,video_id,effective_object_story_id,effective_instagram_story_id,instagram_permalink_url}';
  const url = `https://graph.facebook.com/v21.0/${actId}/ads?fields=${fields}&limit=5&access_token=${token}`;
  
  console.log("Fetching account ads from url:", url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Response data fields:");
    if (data.data) {
      data.data.forEach((ad, i) => {
        console.log(`\nAD #${i+1}: ${ad.name}`);
        console.log(`- status: ${ad.status}`);
        console.log(`- creative id: ${ad.creative?.id}`);
        console.log(`- creative object_type: ${ad.creative?.object_type}`);
        console.log(`- creative video_id: ${ad.creative?.video_id}`);
        console.log(`- creative effective_object_story_id: ${ad.creative?.effective_object_story_id}`);
        console.log(`- creative effective_instagram_story_id: ${ad.creative?.effective_instagram_story_id}`);
      });
    } else {
      console.log(data);
    }
  } catch (err) {
    console.error("Error fetching ads:", err);
  }
}

run();
