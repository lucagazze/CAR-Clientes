import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data, error } = await supabase.rpc('get_triggers', {});
  if (error) {
    // If RPC doesn't exist, query pg_trigger directly
    console.log("RPC get_triggers failed, trying raw sql...");
    const { data: rawTriggers, error: rawErr } = await supabase.html ? null : await supabase
      .from('pg_trigger')
      .select('*')
      .limit(10);
    console.log("Triggers pg_trigger:", rawTriggers || rawErr);
  } else {
    console.log("Triggers:", data);
  }
  
  // Let's do a direct select on information_schema.triggers using a query if we can
  const { data: infoTriggers, error: infoErr } = await supabase
    .from('information_schema.triggers')
    .select('*')
    .limit(10);
  console.log("information_schema triggers:", infoTriggers || infoErr);
}

run();
