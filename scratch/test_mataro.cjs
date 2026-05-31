const MATARO_PAGE_ID = '103578942518865';
const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";

async function main() {
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === MATARO_PAGE_ID);
  if (!page) {
    console.error('❌ Page not found in accounts.');
    return;
  }
  const pageToken = page.access_token;
  
  console.log('Querying Mataró Distribuidora IG Conversations...');
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${MATARO_PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=5`).then(r => r.json());
  if (igRes.error) {
    console.error('❌ Error:', igRes.error);
  } else {
    console.log(`✅ Mataró Distribuidora IG Conversations: ${igRes.data?.length || 0}`);
    console.log(JSON.stringify(igRes.data, null, 2));
  }
}

main().catch(console.error);
