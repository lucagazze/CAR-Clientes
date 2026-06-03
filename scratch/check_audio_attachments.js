import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('car_clients').select('id, business_name, chatwoot_url, chatwoot_token');
  const client = data.find(c => c.business_name === 'Materia Prima Telas');
  if (!client) {
    console.log("Client not found");
    return;
  }

  const cleanUrl = client.chatwoot_url.replace(/\/$/, '');
  const accountId = await fetch(`${cleanUrl}/api/v1/profile`, {
    headers: { 'api_access_token': client.chatwoot_token }
  }).then(r => r.json()).then(d => d.account_id).catch(() => null);

  if (!accountId) {
    console.log("Could not get account ID");
    return;
  }

  console.log(`Fetching conversations for Account ID ${accountId}...`);
  const res = await fetch(`${cleanUrl}/api/v1/accounts/${accountId}/conversations?status=open&page=1&assignee_type=all`, {
    headers: { 'api_access_token': client.chatwoot_token }
  });
  const body = await res.json();
  const convs = body?.data?.payload || body?.payload || [];

  console.log(`Found ${convs.length} open conversations. Scanning for messages with audio attachments...`);

  for (const conv of convs) {
    try {
      const messagesRes = await fetch(`${cleanUrl}/api/v1/accounts/${accountId}/conversations/${conv.id}/messages`, {
        headers: { 'api_access_token': client.chatwoot_token }
      });
      const messages = await messagesRes.json().then(d => d.payload || d || []);
      
      const audioMsgs = messages.filter(m => m.attachments && m.attachments.some(a => a.file_type.includes('audio') || a.data_url?.includes('audio') || a.data_url?.match(/\.(mp3|wav|ogg|oga|opus|m4a)/i)));
      
      if (audioMsgs.length > 0) {
        console.log(`\nConversation ${conv.id} has ${audioMsgs.length} audio messages:`);
        audioMsgs.forEach(m => {
          console.log(`- Message ID: ${m.id}`);
          m.attachments.forEach(att => {
            console.log(`  Attachment file_type: ${att.file_type}`);
            console.log(`  Attachment data_url: ${att.data_url}`);
            console.log(`  Attachment data:`, JSON.stringify(att.data, null, 2));
          });
        });
      }
    } catch (err) {
      console.error(`Error scanning messages for conv ${conv.id}:`, err.message);
    }
  }
}

run();
