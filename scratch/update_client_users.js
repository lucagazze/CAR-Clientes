import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("Updating client user_ids...");
  
  // 1. Update The Skirting Factory
  const { data: update1, error: error1 } = await supabase
    .from('car_clients')
    .update({ user_id: '57759e50-2227-460a-915e-49eabf0b6eef' })
    .eq('business_name', 'The Skirting Factory')
    .select('business_name, user_id');
    
  if (error1) {
    console.error("Error updating The Skirting Factory:", error1);
  } else {
    console.log("Updated The Skirting Factory:", update1);
  }

  // 2. Update FranSa INmobiliaria
  const { data: update2, error: error2 } = await supabase
    .from('car_clients')
    .update({ user_id: 'd76b15fa-fd9e-4ba2-8913-fbe013be1274' })
    .eq('business_name', 'FranSa INmobiliaria')
    .select('business_name, user_id');
    
  if (error2) {
    console.error("Error updating FranSa INmobiliaria:", error2);
  } else {
    console.log("Updated FranSa INmobiliaria:", update2);
  }

  console.log("Database status after updates:");
  const { data: clients } = await supabase.from('car_clients').select('business_name, user_id, is_admin');
  console.log(JSON.stringify(clients, null, 2));
}

run();
