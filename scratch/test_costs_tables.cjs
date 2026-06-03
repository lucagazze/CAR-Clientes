const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('Checking car_variant_costs...');
  const { data: varData, error: varError } = await supabase
    .from('car_variant_costs')
    .select('*')
    .limit(1);

  if (varError) {
    console.error('❌ Error checking car_variant_costs:', varError);
  } else {
    console.log('✅ car_variant_costs exists! Data:', varData);
  }

  console.log('Checking car_additional_costs...');
  const { data: addData, error: addError } = await supabase
    .from('car_additional_costs')
    .select('*')
    .limit(1);

  if (addError) {
    console.error('❌ Error checking car_additional_costs:', addError);
  } else {
    console.log('✅ car_additional_costs exists! Data:', addData);
  }
}

main().catch(console.error);
