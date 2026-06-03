const NEW_TOKEN = "EAARvpoGdZCfIBRmwYmTLRXW7nqEklscBVuehoaqUcnZBv9UvpQyKjWeNJbd2yloKjwZBLRPQAgfUFczhiiE7oKVZBEpsIZAF5ZCglUUkiVxN9jL1p5rVYws2wq9iT1aK87IOpGUUQRxRmjgzzRC0aUZCMhd5n19kcvo1EXpeAofoXi6JvmjDCkiCQe1nIgRFNm3ngZDZD";
const LEO_PAGE_ID = '574188879102510';

async function main() {
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === LEO_PAGE_ID);
  if (!page) {
    console.error('❌ Libreria Leo Page not found in accounts.');
    return;
  }
  const pageToken = page.access_token;
  console.log(`Using Libreria Leo pageToken: ${pageToken.slice(0, 15)}...`);

  // Query Feed
  const feedRes = await fetch(`https://graph.facebook.com/v21.0/${LEO_PAGE_ID}/feed?fields=id,message,comments.limit(10){id,message,text,from,username,timestamp}&limit=100&access_token=${pageToken}`).then(r => r.json());
  
  if (feedRes.error) {
    console.error('Error fetching feed:', feedRes.error);
    return;
  }

  const posts = feedRes.data || [];
  console.log(`Found ${posts.length} posts in feed.`);
  
  for (const post of posts) {
    const comments = post.comments?.data || [];
    if (comments.length > 0) {
      console.log(`\n[SUCCESS] Found comments on FB post ${post.id}:`);
      console.log(JSON.stringify(comments, null, 2));
      return;
    }
  }
  console.log('No comments found in Libreria Leo feed.');
}

main().catch(console.error);
