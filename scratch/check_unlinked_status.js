import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const users = [
    { email: 'lucagazze1@gmail.com', id: 'c9cff993-01d3-4523-b6ea-105d57d048d5' },
    { email: 'algoritmiadesarrollos@gmail.com', id: '3973abe3-ca7c-4a7c-b51a-f5024731bb6c' }
  ];

  for (const user of users) {
    console.log(`\n=================== USER: ${user.email} (${user.id}) ===================`);
    
    // Auth user metadata
    const { data: { user: authUser }, error: authErr } = await supabase.auth.admin.getUserById(user.id);
    if (authErr) {
      console.error("Auth fetch error:", authErr);
    } else {
      console.log("Auth User Metadata:", authUser?.user_metadata);
    }

    const { data: client } = await supabase.from('car_clients').select('*').eq('user_id', user.id).maybeSingle();
    console.log("car_clients matches:", client);

    const { data: assoc } = await supabase.from('car_business_accounts').select('*').eq('user_id', user.id).maybeSingle();
    console.log("car_business_accounts user_id matches:", assoc);

    const { data: assocEmail } = await supabase.from('car_business_accounts').select('*').ilike('email', user.email).maybeSingle();
    console.log("car_business_accounts email matches:", assocEmail);
  }
}

run();
