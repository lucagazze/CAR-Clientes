const { createClient } = require('/Users/lucagazze/Downloads/Apps/CAR-Clientes/node_modules/@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing auth users:", error);
  } else {
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata
    }));
    console.log("Auth Users:", JSON.stringify(users, null, 2));
  }
}
run();
