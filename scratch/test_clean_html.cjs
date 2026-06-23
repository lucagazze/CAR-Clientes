const fetch = require('node-fetch');

function cleanHtml(html) {
  let text = html;
  // Remove non-content sections
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<aside[\s\S]*?<\/aside>/gi, '');
  
  // Remove elements with style="display: none" or similar hidden attributes
  text = text.replace(/<([a-z0-9]+)[^>]*style=["'][^"']*(display:\s*none|visibility:\s*hidden)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi, '');
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&#36;/g, '$').replace(/&#038;/g, '&').replace(/&amp;/g, '&')
             .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

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
    const cleaned = cleanHtml(html);
    
    console.log(`Cleaned Length: ${cleaned.length}`);
    console.log('Contains "Envío gratis"?', cleaned.includes('Envío gratis'));
    console.log('Contains "gratis"?', cleaned.toLowerCase().includes('gratis'));
    
    // Print around a product name
    const idx = cleaned.indexOf('PDRN Pink Niacinamide Milky Toner');
    if (idx !== -1) {
      console.log('\nText around Milky Toner:');
      console.log(cleaned.slice(Math.max(0, idx - 100), Math.min(cleaned.length, idx + 200)));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
