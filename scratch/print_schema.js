import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: clients, error: errClients } = await supabase.from('car_clients').select('*').limit(1);
  if (errClients) console.error(errClients);
  else console.log("car_clients columns:", Object.keys(clients[0] || {}));

  const { data: accounts, error: errAccounts } = await supabase.from('car_business_accounts').select('*').limit(1);
  if (errAccounts) console.error(errAccounts);
  else console.log("car_business_accounts columns:", Object.keys(accounts[0] || {}));
}

run();
