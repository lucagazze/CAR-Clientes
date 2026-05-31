const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";

async function main() {
  console.log('Debugging token target scopes...');
  const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${NEW_TOKEN}&access_token=${NEW_TOKEN}`).then(r => r.json());
  
  if (debugRes.error) {
    console.error('❌ Debug Error:', debugRes.error);
    return;
  }

  const scopesData = debugRes.data.granular_scopes || [];
  console.log('Granular Scopes found:');
  scopesData.forEach(s => {
    console.log(`- Scope: ${s.scope}`);
    if (s.target_ids) {
      console.log(`  Target IDs: ${s.target_ids.join(', ')}`);
    }
  });
}

main().catch(console.error);
