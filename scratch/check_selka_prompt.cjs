const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const clientId = 'e33a4b38-56a3-4638-a508-1682f2898978';
  const { data: cl, error } = await supabase
    .from('car_clients')
    .select('business_name, business_description, custom_instructions, scraped_content, website_url, instagram_context')
    .eq('id', clientId)
    .maybeSingle();

  if (error || !cl) {
    console.error('Error fetching client details:', error);
    return;
  }

  console.log('CLIENT PROFILE DETAILS:');
  console.log('Business Name:', cl.business_name);
  console.log('Business Description:', cl.business_description);
  console.log('Custom Instructions:', cl.custom_instructions);
  console.log('Website URL:', cl.website_url);
}

main();
