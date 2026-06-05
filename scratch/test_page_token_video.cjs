const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PAGE_ID = '101165642053074';
const STORY_ID = '101165642053074_1362515982592994';
const VIDEO_ID = '846313141848132';

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('value')
    .eq('key', 'meta_ads_token')
    .single();
  const token = settings?.value;
  if (!token) return;

  const base = 'https://graph.facebook.com/v21.0';
  
  // 1. Get Page Token
  console.log(`Fetching accounts for Page ID ${PAGE_ID}...`);
  const accountsRes = await fetch(`${base}/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === PAGE_ID);
  
  if (!page) {
    console.log("❌ Could not find page token in me/accounts");
    return;
  }
  
  const pageToken = page.access_token;
  console.log(`✅ Found page token for: ${page.name}`);

  // 2. Query the post using Page Token
  console.log(`\nQuerying post ${STORY_ID} using PAGE TOKEN...`);
  const postRes = await fetch(
    `${base}/${STORY_ID}?fields=attachments,source,type,object_id,message,full_picture,video_id&access_token=${pageToken}`
  ).then(r => r.json());
  
  console.log("Post Response:");
  console.log(JSON.stringify(postRes, null, 2));

  // 3. Query the video using Page Token
  console.log(`\nQuerying video ${VIDEO_ID} using PAGE TOKEN...`);
  const videoRes = await fetch(
    `${base}/${VIDEO_ID}?fields=source,picture,format,embed_html&access_token=${pageToken}`
  ).then(r => r.json());

  console.log("Video Response:");
  console.log(JSON.stringify(videoRes, null, 2));
}

main();
