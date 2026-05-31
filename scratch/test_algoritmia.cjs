const ALGORITMIA_PAGE_ID = '925570770649286';
const NEW_TOKEN = "EAARvpoGdZCfIBRvJ7FROGbLAO4ZCejvLUTrPKuUSp4i7ru4R0NdoQ5tH2NfHLuDIZCY8gNB4qo6mVSIdZBsDK8FKziECMancEnjNb91eprZCjfU0Vj2KvWfhJnGdhgZBYcEtxevBkmk4l3yTGi5t07innxrQwCVjd2633dwqSTj3bNj2IhLMXOaivGuVhfOo2O4b9glYZATtXtpUiNRqynRUmMZBKWF2inxPTtktkn7aV7PZAmCDJLPLZC5rGi9RVsP079pRZAnBbmzTFaYmNCtXRZBoTZBnZBoCKh3Xdg4ehkiAZDZD";

async function main() {
  const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${NEW_TOKEN}&limit=100`).then(r => r.json());
  const page = (accountsRes?.data || []).find(p => String(p.id) === ALGORITMIA_PAGE_ID);
  if (!page) {
    console.error('❌ Algoritmia page not found in accounts.');
    return;
  }
  const pageToken = page.access_token;
  
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${ALGORITMIA_PAGE_ID}/conversations?platform=instagram&access_token=${pageToken}&fields=id,participants,unread_count,updated_time&limit=5`).then(r => r.json());
  if (igRes.error) {
    console.error('❌ Error:', igRes.error);
  } else {
    console.log(`✅ Algoritmia IG Conversations: ${igRes.data?.length || 0}`);
    console.log(JSON.stringify(igRes.data, null, 2));
  }
}

main().catch(console.error);
