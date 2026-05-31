const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";

async function checkPage(pageId, name) {
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === String(pageId));
  if (!page) {
    console.error(`❌ Page ${name} not found.`);
    return;
  }
  const pageToken = page.access_token;
  
  console.log(`\n--- Subscriptions for ${name} (${pageId}) ---`);
  const subs = await fetch(`https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${pageToken}`).then(r => r.json());
  console.log(JSON.stringify(subs, null, 2));
}

async function main() {
  await checkPage('101165642053074', 'The Skirting Factory');
  await checkPage('113050655227145', 'Liliana Sueños');
}

main().catch(console.error);
