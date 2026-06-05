const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let pageTokensCache = {};

async function getPageToken(pageId, systemToken) {
  const now = Date.now();
  if (pageTokensCache[pageId] && pageTokensCache[pageId].expiresAt > now) {
    return pageTokensCache[pageId].value;
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${systemToken}&limit=100`);
    if (res.ok) {
      const data = await res.json();
      const page = (data.data || []).find((p) => String(p.id) === String(pageId));
      if (page && page.access_token) {
        pageTokensCache[pageId] = { value: page.access_token, expiresAt: now + 15 * 60 * 1000 };
        return page.access_token;
      }
    }
  } catch (err) {
    console.error("Error fetching page token:", err);
  }
  return null;
}

async function main() {
  const { data: settings } = await supabase
    .from('AgencySettings')
    .select('value')
    .eq('key', 'meta_ads_token')
    .single();
  const token = settings?.value;
  if (!token) return;

  const base = 'https://graph.facebook.com/v21.0';
  const accountId = 'act_2136106490563351';

  const adsRes = await fetch(`${base}/${accountId}/ads?fields=id,name,status,creative{id,name,object_type}&access_token=${token}&limit=15`).then(r => r.json());
  const activeAds = (adsRes.data || []).filter(a => a.status === 'ACTIVE');

  console.log(`Running final resolver simulation on ${activeAds.length} active ads...`);

  for (const ad of activeAds) {
    console.log(`\n========================================`);
    console.log(`AD: ${ad.name} (ID: ${ad.id})`);
    const creativeId = ad.creative?.id;
    if (!creativeId) {
      console.log("No creative ID");
      continue;
    }

    try {
      let activeToken = token;
      let pageToken = null;
      let creativeData = null;

      // 1. Fetch creative spec
      const creativeRes = await fetch(
        `${base}/${creativeId}?fields=video_id,object_story_spec,asset_feed_spec,object_type,image_url,thumbnail_url,account_id,effective_object_story_id,effective_instagram_story_id,object_story_id&access_token=${token}`
      );
      if (!creativeRes.ok) {
        console.log(`Failed to fetch creative ${creativeId}`);
        continue;
      }

      creativeData = await creativeRes.json();

      // Extract pageId
      const pageId = 
        creativeData.object_story_spec?.page_id ||
        (creativeData.effective_object_story_id ? creativeData.effective_object_story_id.split('_')[0] : null) ||
        (creativeData.object_story_id ? creativeData.object_story_id.split('_')[0] : null);

      console.log(`Page ID: ${pageId}`);
      pageToken = pageId ? await getPageToken(pageId, token) : null;
      console.log(`Page Token obtained: ${pageToken ? "YES" : "NO"}`);

      activeToken = pageToken || token;

      // Helper function to resolve video source
      async function resolveVideoSource(vidId, useToken) {
        const videoRes = await fetch(
          `${base}/${vidId}?fields=source,picture,format&access_token=${useToken}`
        );
        if (videoRes.ok) {
          const data = await videoRes.json();
          let bestThumbnail = data.picture || null;
          let embedHtml = null;
          if (Array.isArray(data.format)) {
            const sorted = [...data.format].sort((a, b) => (b.width || 0) - (a.width || 0));
            if (sorted[0]?.picture) bestThumbnail = sorted[0].picture;
            const withEmbed = sorted.find((f) => f.embed_html);
            if (withEmbed) embedHtml = withEmbed.embed_html || embedHtml;
          }
          return { source: data.source || null, picture: bestThumbnail, embedHtml };
        }
        return null;
      }

      // Check if carousel
      const childAttachments = creativeData.object_story_spec?.link_data?.child_attachments;
      if (childAttachments && childAttachments.length > 0) {
        console.log("Type: CAROUSEL");
        // Simulate child resolution
        const cards = await Promise.all(
          childAttachments.map(async (att) => {
            if (att.video_id) {
              const resolvedVideo = await resolveVideoSource(att.video_id, activeToken);
              return { isVideo: true, source: resolvedVideo?.source ? "YES" : "NO" };
            }
            return { isVideo: false };
          })
        );
        console.log("Carousel cards resolved:", cards);
        continue;
      }

      // Check if single video creative
      const resolvedVideoId =
        creativeData.object_story_spec?.video_data?.video_id ||
        creativeData.object_story_spec?.link_data?.video_id ||
        creativeData.asset_feed_spec?.videos?.[0]?.video_id ||
        creativeData.video_id;

      if (resolvedVideoId) {
        console.log(`Type: VIDEO (ID: ${resolvedVideoId})`);
        const resolved = await resolveVideoSource(resolvedVideoId, activeToken);
        console.log("Resolved result:", resolved ? `source: ${resolved.source ? "YES" : "NO"}` : "FAILED");
        continue;
      }

      // Try resolving via effective_instagram_story_id
      const instagramStoryId = creativeData.effective_instagram_story_id;
      if (instagramStoryId) {
        console.log(`Type: INSTAGRAM STORY (ID: ${instagramStoryId})`);
        // Simulate IG call
        const igRes = await fetch(
          `${base}/${instagramStoryId}?fields=media_url,media_type,thumbnail_url,permalink,children{media_url,media_type,thumbnail_url}&access_token=${activeToken}`
        );
        if (igRes.ok) {
          const igData = await igRes.json();
          console.log(`IG media_type: ${igData.media_type}, media_url: ${igData.media_url ? "YES" : "NO"}`);
        } else {
          console.log("IG fetch failed");
        }
        continue;
      }

      // Try resolving via effective_object_story_id
      const storyId = creativeData.effective_object_story_id || creativeData.object_story_id;
      if (storyId) {
        console.log(`Type: OBJECT STORY (ID: ${storyId})`);
        const postRes = await fetch(
          `${base}/${storyId}?fields=attachments,message,full_picture&access_token=${activeToken}`
        );
        if (postRes.ok) {
          const postData = await postRes.json();
          const attachments = postData.attachments?.data;
          console.log("Post status: FETCHED, attachments length:", attachments ? attachments.length : 0);
          if (attachments && attachments.length > 0) {
            const first = attachments[0];
            console.log("First attachment type:", first.type, "has target ID:", !!first.target?.id);
            if (first.target?.id && first.type?.includes('video')) {
              const resolved = await resolveVideoSource(first.target.id, activeToken);
              console.log("Resolved post attachment video:", resolved ? `source: ${resolved.source ? "YES" : "NO"}` : "FAILED");
            } else if (first.subattachments?.data) {
              console.log("Subattachments count:", first.subattachments.data.length);
              const cards = await Promise.all(
                first.subattachments.data.map(async (sub) => {
                  if (sub.target?.id && (sub.type?.includes('video') || sub.type === 'video_inline')) {
                    const resolvedVideo = await resolveVideoSource(sub.target.id, activeToken);
                    return { isVideo: true, source: resolvedVideo?.source ? "YES" : "NO" };
                  }
                  return { isVideo: false };
                })
              );
              console.log("Subattachment cards resolved:", cards);
            }
          }
        } else {
          const errData = await postRes.json();
          console.log("Post fetch failed:", errData.error?.message);
        }
        continue;
      }

      console.log("Type: IMAGE / OTHER");

    } catch (e) {
      console.error(e);
    }
  }
}

main();
