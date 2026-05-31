const LILIANA_PAGE_ID = '113050655227145';
const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";

async function main() {
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === LILIANA_PAGE_ID);
  if (!page) {
    console.error('❌ Page not found.');
    return;
  }
  const pageToken = page.access_token;
  
  console.log('Querying Liliana Sueños Messenger Conversations...');
  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${LILIANA_PAGE_ID}/conversations?platform=messenger&access_token=...`);
  // Let's actually execute the fetch
  const realRes = await fetch(`https://graph.facebook.com/v21.0/${LILIANA_PAGE_ID}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants&limit=5`).then(r => r.json());
  if (realRes.error) {
    console.error('❌ Messenger Error:', realRes.error);
  } else {
    console.log(`✅ Liliana Sueños Messenger Conversations: ${realRes.data?.length || 0}`);
  }
}

main().catch(console.error);
