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
  console.log(`Page Name: ${page.name}`);
  console.log(`Page Token: ${pageToken.slice(0, 15)}...`);

  console.log('\nDebugging Page Token...');
  const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${pageToken}&access_token=${NEW_TOKEN}`).then(r => r.json());
  
  if (debugRes.error) {
    console.error('❌ Debug Error:', debugRes.error);
    return;
  }

  console.log('Page Token Granular Scopes:');
  const scopesData = debugRes.data.granular_scopes || [];
  scopesData.forEach(s => {
    console.log(`- Scope: ${s.scope}`);
  });
  
  console.log('\nChecking /me/permissions for Page Token:');
  const permsRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${pageToken}`).then(r => r.json());
  console.log(JSON.stringify(permsRes, null, 2));
}

main().catch(console.error);
