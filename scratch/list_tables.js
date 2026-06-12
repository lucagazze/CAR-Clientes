import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // If get_tables RPC doesn't exist, we can try querying a schema table or just check common tables
    console.log("RPC get_tables not found, trying fallback query...");
    const { data: queryData, error: queryError } = await supabase.from('AgencySettings').select('*').limit(1);
    console.log("AgencySettings access test:", { hasData: !!queryData, error: queryError });
    
    // Check if we can query pg_class or other tables via supabase.rpc if they have custom ones
    // Or we can just list the tables by trying to query them
    const commonTables = ['car_clients', 'car_business_accounts', 'car_creative_cache', 'car_creatives', 'meta_creative_cache', 'AgencySettings'];
    for (const t of commonTables) {
      const { error: te } = await supabase.from(t).select('*').limit(1);
      console.log(`Table '${t}' exists check:`, !te ? "YES" : `NO (${te.message})`);
    }
  } else {
    console.log("Tables:", data);
  }
}

run();
