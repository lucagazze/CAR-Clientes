const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('--- Checking storage buckets ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.error('Error listing buckets:', bErr);
  } else {
    console.log('Buckets found:');
    buckets.forEach(b => {
      console.log(`- ${b.name} (Public: ${b.public}, Limit: ${b.file_size_limit} bytes)`);
    });
  }

  console.log('\n--- Checking last 5 social publications ---');
  const { data: publications, error: pErr } = await supabase
    .from('car_social_publications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (pErr) {
    console.error('Error fetching publications:', pErr);
  } else {
    publications.forEach((p, idx) => {
      console.log(`\nPublication #${idx + 1}:`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Client ID: ${p.client_id}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Channels: ${JSON.stringify(p.selected_channels)}`);
      console.log(`  Caption: ${p.caption}`);
      console.log(`  Video Path: ${p.video_path}`);
      console.log(`  Video URL: ${p.video_url}`);
      console.log(`  Results: ${JSON.stringify(p.results)}`);
    });
  }
}

main();
