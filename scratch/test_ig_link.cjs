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
  
  console.log('Querying Page details (checking linked IG account)...');
  const details = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}?fields=id,name,instagram_business_account{id,username}&access_token=${pageToken}`).then(r => r.json());
  console.log(JSON.stringify(details, null, 2));
}

main().catch(console.error);
