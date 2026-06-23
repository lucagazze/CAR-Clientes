const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: clients, error } = await supabase
    .from('car_clients')
    .select('id, business_name, custom_instructions, website_url');

  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }

  console.log(`Found ${clients.length} clients:`);
  clients.forEach(c => {
    console.log(`\nClient ID: ${c.id}`);
    console.log(`Name: ${c.business_name}`);
    console.log(`URL: ${c.website_url}`);
    console.log(`Custom Instructions: ${c.custom_instructions}`);
  });
}

main();
