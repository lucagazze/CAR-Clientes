const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('--- Checking failed or error publications ---');
  const { data: publications, error } = await supabase
    .from('car_social_publications')
    .select('*')
    .or('status.eq.failed,status.eq.error')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching failed publications:', error);
    return;
  }

  console.log(`Found ${publications.length} failed/error publications:`);
  publications.forEach((p, idx) => {
    console.log(`\nFailed Publication #${idx + 1}:`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Client ID: ${p.client_id}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Channels: ${JSON.stringify(p.selected_channels)}`);
    console.log(`  Caption: ${p.caption}`);
    console.log(`  Video Path: ${p.video_path}`);
    console.log(`  Results: ${JSON.stringify(p.results)}`);
  });

  console.log('\n--- Checking publications with error in results object ---');
  const { data: publicationsWithErrors, error: err2 } = await supabase
    .from('car_social_publications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (err2) {
    console.error('Error fetching general publications:', err2);
    return;
  }

  let errorCount = 0;
  publicationsWithErrors.forEach((p) => {
    let hasError = false;
    if (p.results) {
      if (p.results.error) hasError = true;
      else {
        // check keys in results
        for (const k of Object.keys(p.results)) {
          if (p.results[k] && (p.results[k].status === 'error' || p.results[k].status === 'failed' || p.results[k].error)) {
            hasError = true;
          }
        }
      }
    }
    if (hasError) {
      errorCount++;
      console.log(`\nPublication ID: ${p.id} (Client: ${p.client_id}, Status: ${p.status})`);
      console.log(`  Results: ${JSON.stringify(p.results)}`);
    }
  });
  console.log(`Total publications with errors in results array: ${errorCount}`);
}

main();
