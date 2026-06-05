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
  const storyId = '101165642053074_1315180083993251'; // Failed story ID
  
  // Let's get the page token first to be completely accurate
  const resPage = await fetch(`${base}/me/accounts?access_token=${token}&limit=100`).then(r => r.json());
  const page = (resPage.data || []).find((p) => String(p.id) === '101165642053074');
  const pageToken = page?.access_token || token;

  const fieldsToTest = [
    'id',
    'message',
    'type',
    'object_id',
    'full_picture',
    'picture',
    'attachments',
    'status_type'
  ];

  console.log("Testing individual fields on post:", storyId);
  for (const field of fieldsToTest) {
    try {
      const res = await fetch(`${base}/${storyId}?fields=${field}&access_token=${pageToken}`);
      const data = await res.json();
      if (res.ok) {
        console.log(`[SUCCESS] Field "${field}":`, JSON.stringify(data).slice(0, 150));
      } else {
        console.log(`[FAILED] Field "${field}":`, data.error?.message);
      }
    } catch (e) {
      console.log(`[ERROR] Field "${field}":`, e.message);
    }
  }

  // Also test all working fields combined
  console.log("\nTesting all combined fields (excluding any that failed)...");
}

main();
