import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const payload = {
    business_id: 'd560ee94-70ae-4eef-8dac-a82e8e689bda', // Algoritmia
    user_id: '3973abe3-ca7c-4a7c-b51a-f5024731bb6c', // algoritmiadesarrollos@gmail.com
    email: 'algoritmiadesarrollos@gmail.com'
  };

  console.log("Attempting to insert into car_business_accounts:", payload);
  const { data, error } = await supabase.from('car_business_accounts').insert(payload).select();
  
  if (error) {
    console.error("INSERT ERROR:", error);
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}

run();
