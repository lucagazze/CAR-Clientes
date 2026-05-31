const LEO_PAGE_ID = '574188879102510';
const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";

async function main() {
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === LEO_PAGE_ID);
  if (!page) {
    console.error('❌ Page not found in accounts.');
    return;
  }
  const pageToken = page.access_token;
  console.log(`Page Token: ${pageToken.slice(0, 15)}...`);

  console.log('Querying Page node directly...');
  const pageDetails = await fetch(`https://graph.facebook.com/v21.0/${LEO_PAGE_ID}?fields=id,name,instagram_business_account&access_token=${pageToken}`).then(r => r.json());
  console.log('Page details:', JSON.stringify(pageDetails, null, 2));

  console.log('\nQuerying conversations platform=messenger...');
  const msgrDetails = await fetch(`https://graph.facebook.com/v21.0/${LEO_PAGE_ID}/conversations?platform=messenger&access_token=${pageToken}&fields=id,participants&limit=2`).then(r => r.json());
  console.log('Messenger response:', JSON.stringify(msgrDetails, null, 2));

  console.log('\nQuerying conversations platform=instagram...');
  const igDetails = await fetch(`https://graph.facebook.com/v21.0/${LEO_PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants&limit=2`).then(r => r.json());
  console.log('Instagram response:', JSON.stringify(igDetails, null, 2));
}

main().catch(console.error);
