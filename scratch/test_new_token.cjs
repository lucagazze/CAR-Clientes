const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const tokenToCheck = "EAARvpoGdZCfIBRvJ7FROGbLAO4ZCejvLUTrPKuUSp4i7ru4R0NdoQ5tH2NfHLuDIZCY8gNB4qo6mVSIdZBsDK8FKziECMancEnjNb91eprZCjfU0Vj2KvWfhJnGdhgZBYcEtxevBkmk4l3yTGi5t07innxrQwCVjd2633dwqSTj3bNj2IhLMXOaivGuVhfOo2O4b9glYZATtXtpUiNRqynRUmMZBKWF2inxPTtktkn7aV7PZAmCDJLPLZC5rGi9RVsP079pRZAnBbmzTFaYmNCtXRZBoTZBnZBoCKh3Xdg4ehkiAZDZD";

async function main() {
  console.log('Debugging new token...');
  const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${tokenToCheck}&access_token=${tokenToCheck}`).then(r => r.json());
  
  if (debugRes.error) {
    console.error('❌ Debug Error:', debugRes.error);
    return;
  }

  console.log('✅ Token Debug Info:', JSON.stringify(debugRes.data, null, 2));

  // If valid, let's also check if it can list the pages
  console.log('\nFetching me/accounts...');
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${tokenToCheck}&limit=100`).then(r => r.json());
  if (accountsRes.error) {
    console.error('❌ Error listing accounts:', accountsRes.error);
  } else {
    console.log(`✅ Success! Found ${accountsRes.data?.length || 0} pages connected.`);
    const skirting = (accountsRes.data || []).find(p => p.id === '101165642053074');
    if (skirting) {
      console.log('✅ Found The Skirting Factory in pages list!');
    } else {
      console.log('❌ The Skirting Factory NOT found in the pages linked to this token!');
    }
  }
}

main().catch(console.error);
