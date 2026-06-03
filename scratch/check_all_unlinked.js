import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://czocbnyoenjbpxmcqobn.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const [allAuthRes, clientsRes, assocRes] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('car_clients').select('user_id, business_name'),
    supabase.from('car_business_accounts').select('user_id, email, business_id')
  ]);

  const authUsers = allAuthRes.data.users || [];
  const clientsData = clientsRes.data || [];
  const assocData = assocRes.data || [];

  const unlinked = authUsers.filter(u => {
    const isOwner = clientsData.some((c) => c.user_id === u.id);
    const isAssoc = assocData.some((a) => a.user_id === u.id);
    return !isOwner && !isAssoc;
  });

  console.log(`Unlinked Users (${unlinked.length}):`);
  unlinked.forEach(u => {
    console.log(`- ID: ${u.id}, Email: ${u.email}, Meta:`, u.user_metadata);
  });
}

run();
