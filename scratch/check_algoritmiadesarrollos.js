import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const targetUserId = '3973abe3-ca7c-4a7c-b51a-f5024731bb6c'; // algoritmiadesarrollos@gmail.com
  
  console.log("Checking user in car_clients...");
  const { data: clients } = await supabase
    .from('car_clients')
    .select('*')
    .eq('user_id', targetUserId);
  console.log("Clients matching user_id:", clients);

  console.log("\nChecking user in car_business_accounts...");
  const { data: accounts } = await supabase
    .from('car_business_accounts')
    .select('*')
    .eq('user_id', targetUserId);
  console.log("Business accounts matching user_id:", accounts);

  console.log("\nChecking all clients in database...");
  const { data: allClients } = await supabase
    .from('car_clients')
    .select('id, business_name, user_id, is_admin');
  console.log("All clients:", allClients);
}

run();
