const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";
const PAGE_ID = '101165642053074';

async function main() {
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === PAGE_ID);
  if (!page) {
    console.error('❌ Page not found.');
    return;
  }
  const pageToken = page.access_token;
  
  console.log('Querying Messenger Conversations...');
  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants,unread_count&limit=5`).then(r => r.json());
  if (fbRes.error) {
    console.error('❌ Messenger Error:', fbRes.error);
  } else {
    console.log(`✅ Messenger Conversations: ${fbRes.data?.length || 0}`);
  }
}

main().catch(console.error);
