const fetch = require('node-fetch');

async function main() {
  const url = 'https://selka5.mitiendanube.com';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    if (!res.ok) {
      console.error(`HTTP error: ${res.status}`);
      return;
    }
    const html = await res.text();
    console.log(`HTML Length: ${html.length}`);
    
    // Search for "gratis" case-insensitive
    const regexGratis = /gratis/gi;
    let match;
    const matches = [];
    while ((match = regexGratis.exec(html)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(html.length, match.index + 50);
      matches.push(html.slice(start, end).replace(/\s+/g, ' ').trim());
    }
    
    console.log(`Found ${matches.length} matches for 'gratis':`);
    matches.slice(0, 10).forEach((m, idx) => console.log(`${idx + 1}: ... ${m} ...`));

    // Search for "envio" or "envío"
    const regexEnvio = /envi/gi;
    const envMatches = [];
    while ((match = regexEnvio.exec(html)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(html.length, match.index + 50);
      envMatches.push(html.slice(start, end).replace(/\s+/g, ' ').trim());
    }
    
    console.log(`\nFound ${envMatches.length} matches for 'envio/envío':`);
    envMatches.slice(0, 10).forEach((m, idx) => console.log(`${idx + 1}: ... ${m} ...`));

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
