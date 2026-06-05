const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  try {
    const { data: settings } = await supabase
      .from('AgencySettings')
      .select('value')
      .eq('key', 'meta_ads_token')
      .single();
    const token = settings?.value;
    if (!token) {
      console.error("No token found");
      return;
    }

    const base = 'https://graph.facebook.com/v21.0';
    const accountId = 'act_2136106490563351';

    console.log(`Fetching active ads for account ${accountId}...`);
    const adsRes = await fetch(`${base}/${accountId}/ads?fields=id,name,status,creative{id,name,object_type,video_id}&access_token=${token}&limit=50`).then(r => r.json());
    
    if (adsRes.error) {
      console.error("Ads error:", adsRes.error);
      return;
    }

    const activeAds = (adsRes.data || []).filter(a => a.status === 'ACTIVE');
    console.log(`Found ${activeAds.length} active ads.`);

    for (const ad of activeAds) {
      const creative = ad.creative;
      if (!creative) continue;
      console.log(`\n----------------------------------------`);
      console.log(`Ad: ${ad.name} (ID: ${ad.id})`);
      console.log(`Creative ID: ${creative.id}, Object Type: ${creative.object_type}, Video ID: ${creative.video_id}`);
      
      // Fetch creative spec
      const creativeRes = await fetch(
        `${base}/${creative.id}?fields=video_id,object_story_spec,asset_feed_spec,object_type,image_url,thumbnail_url,account_id,effective_object_story_id,effective_instagram_story_id,object_story_id&access_token=${token}`
      ).then(r => r.json());

      console.log("Creative Details:");
      console.log("- image_url:", creativeRes.image_url ? "YES" : "NO");
      console.log("- thumbnail_url:", creativeRes.thumbnail_url ? "YES" : "NO");
      console.log("- video_id:", creativeRes.video_id);
      console.log("- effective_instagram_story_id:", creativeRes.effective_instagram_story_id);
      console.log("- effective_object_story_id:", creativeRes.effective_object_story_id);
      console.log("- object_story_id:", creativeRes.object_story_id);
      console.log("- object_story_spec keys:", creativeRes.object_story_spec ? Object.keys(creativeRes.object_story_spec) : "NONE");
      console.log("- asset_feed_spec keys:", creativeRes.asset_feed_spec ? Object.keys(creativeRes.asset_feed_spec) : "NONE");

      // Try resolving
      let resolved = null;
      if (creativeRes.video_id) {
        resolved = await resolveVideoSource(creativeRes.video_id, token);
        console.log(`  -> Resolved video_id ${creativeRes.video_id}:`, resolved ? (resolved.source ? "HAS SOURCE" : "HAS EMBED") : "FAILED");
      }
      
      if (creativeRes.effective_instagram_story_id) {
        resolved = await resolveInstagramStory(creativeRes.effective_instagram_story_id, token);
        console.log(`  -> Resolved effective_instagram_story_id:`, resolved ? resolved.type : "FAILED");
      }

      if (creativeRes.effective_object_story_id || creativeRes.object_story_id) {
        const storyId = creativeRes.effective_object_story_id || creativeRes.object_story_id;
        resolved = await resolveObjectStory(storyId, token);
        console.log(`  -> Resolved object_story_id ${storyId}:`, resolved ? resolved.type : "FAILED");
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function resolveVideoSource(vidId, token) {
  const base = 'https://graph.facebook.com/v21.0';
  const videoRes = await fetch(
    `${base}/${vidId}?fields=source,picture,format&access_token=${token}`
  ).then(r => r.json());
  
  if (videoRes.error) {
    console.log(`    resolveVideoSource error for ${vidId}:`, videoRes.error.message);
    return null;
  }
  
  let bestThumbnail = videoRes.picture || null;
  let embedHtml = null;
  if (Array.isArray(videoRes.format)) {
    const sorted = [...videoRes.format].sort((a, b) => (b.width || 0) - (a.width || 0));
    if (sorted[0]?.picture) bestThumbnail = sorted[0].picture;
    const withEmbed = sorted.find(f => f.embed_html);
    if (withEmbed) embedHtml = withEmbed.embed_html;
  }
  return { source: videoRes.source || null, picture: bestThumbnail, embedHtml };
}

async function resolveInstagramStory(instagramStoryId, token) {
  const base = 'https://graph.facebook.com/v21.0';
  const igRes = await fetch(
    `${base}/${instagramStoryId}?fields=media_url,media_type,thumbnail_url,permalink,children{media_url,media_type,thumbnail_url}&access_token=${token}`
  ).then(r => r.json());
  
  if (igRes.error) {
    console.log(`    resolveInstagramStory error for ${instagramStoryId}:`, igRes.error.message);
    return null;
  }
  return igRes;
}

async function resolveObjectStory(storyId, token) {
  const base = 'https://graph.facebook.com/v21.0';
  const postRes = await fetch(
    `${base}/${storyId}?fields=attachments,source,type,object_id,message,full_picture,video_id&access_token=${token}`
  ).then(r => r.json());
  
  if (postRes.error) {
    console.log(`    resolveObjectStory error for ${storyId}:`, postRes.error.message);
    return null;
  }
  return postRes;
}

main();
