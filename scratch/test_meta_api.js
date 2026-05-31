import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testMeta() {
  try {
    const { data: tokenData } = await supabase
      .from('AgencySettings')
      .select('value')
      .eq('key', 'meta_ads_token')
      .maybeSingle();

    const token = tokenData?.value;
    if (!token) {
      console.error('Meta ads token not found in AgencySettings!');
      return;
    }

    const pageId = '101165642053074'; // The Skirting Factory FB Page ID

    // 1. Get the Page Access Token first
    const urlMe = `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}&limit=100`;
    const resMe = await fetch(urlMe).then(r => r.json());
    
    console.log('--- FB ACCOUNTS IN TOKEN ---');
    const pageObj = (resMe?.data || []).find(p => p.id === pageId);
    if (pageObj) {
      console.log('Found page in me/accounts:', pageObj.name, 'with ID:', pageObj.id);
    } else {
      console.log('Page ID NOT found in the user accounts list inside this token! Available pages:', 
        (resMe?.data || []).map(p => `${p.name} (${p.id})`).join(', ')
      );
    }

    const pageToken = pageObj?.access_token || token;

    // 2. Query Instagram DMs
    console.log('\n--- CALLING INSTAGRAM CONVERSATIONS ---');
    const igUrl = `https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time,messages.limit(1){id,message,from,created_time}`;
    const resIg = await fetch(igUrl).then(r => r.json());
    console.log('Instagram Conversations Response:', JSON.stringify(resIg, null, 2));

    // 3. Query Facebook Messenger DMs
    console.log('\n--- CALLING FACEBOOK CONVERSATIONS ---');
    const fbUrl = `https://graph.facebook.com/v21.0/${pageId}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants,unread_count,updated_time,messages.limit(1){id,message,from,created_time}`;
    const resFb = await fetch(fbUrl).then(r => r.json());
    console.log('Facebook Conversations Response:', JSON.stringify(resFb, null, 2));

  } catch (err) {
    console.error('Error during Meta API call:', err);
  }
}

testMeta();
