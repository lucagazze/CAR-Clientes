const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";

async function main() {
  console.log('Listing pages...');
  const res = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100&fields=id,name,instagram_business_account{id,username}`).then(r => r.json());
  if (res.error) {
    console.error('❌ Error:', res.error);
    return;
  }
  console.log(`Connected Pages count: ${res.data?.length || 0}`);
  (res.data || []).forEach(p => {
    console.log(`- ${p.name} (ID: ${p.id})`);
    if (p.instagram_business_account) {
      console.log(`  Linked IG: ${p.instagram_business_account.username} (ID: ${p.instagram_business_account.id})`);
    } else {
      console.log(`  Linked IG: None`);
    }
  });
}

main().catch(console.error);
