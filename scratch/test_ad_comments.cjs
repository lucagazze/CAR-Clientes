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

  const { data: clients } = await supabase
    .from('car_clients')
    .select('*');

  for (const client of clients) {
    console.log(`\n========================================`);
    console.log(`Checking client: ${client.business_name}`);
    const fbPageId = client.fb_page_id;
    const pageToken = client.fb_page_access_token || token;

    if (fbPageId) {
      try {
        console.log(`Fetching feed for Page: ${fbPageId}...`);
        const feedRes = await fetch(`https://graph.facebook.com/v21.0/${fbPageId}/feed?fields=id,message,comments{id,message,text,from,username,timestamp}&limit=10&access_token=${pageToken}`).then(r => r.json());
        
        for (const post of (feedRes.data || [])) {
          if (post.comments?.data && post.comments.data.length > 0) {
            console.log(`[SUCCESS] Found comments on FB post ${post.id}:`);
            console.log(JSON.stringify(post.comments.data.slice(0, 3), null, 2));
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching feed comments:', err.message);
      }
    }

    if (client.meta_account_id) {
      try {
        console.log(`Fetching ads for account: ${client.meta_account_id}...`);
        const adsRes = await fetch(`https://graph.facebook.com/v21.0/${client.meta_account_id}/ads?fields=id,name,creative{id,effective_object_story_id,effective_instagram_story_id}&limit=30&access_token=${token}`).then(r => r.json());
        
        for (const ad of (adsRes.data || [])) {
          const storyId = ad.creative?.effective_object_story_id || ad.creative?.effective_instagram_story_id;
          if (storyId) {
            const commentsRes = await fetch(`https://graph.facebook.com/v21.0/${storyId}/comments?fields=id,text,message,timestamp,from,username,like_count&limit=10&access_token=${pageToken}`).then(r => r.json());
            if (commentsRes.data && commentsRes.data.length > 0) {
              console.log(`[SUCCESS] Found comments on Ad ${ad.name} (story: ${storyId}):`);
              console.log(JSON.stringify(commentsRes.data.slice(0, 3), null, 2));
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching ad comments:', err.message);
      }
    }
  }
}

main().catch(console.error);
