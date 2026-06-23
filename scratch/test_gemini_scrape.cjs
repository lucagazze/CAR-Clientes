const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Read .env.local manually
const envLocalPath = path.resolve(__dirname, '../.env.local');
let geminiKey = '';
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  const match = content.match(/GOOGLE_AI_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (match) {
    geminiKey = match[1];
  }
}

async function main() {
  if (!geminiKey) {
    console.error('No GOOGLE_AI_API_KEY found in .env.local');
    return;
  }

  const systemPrompt = `You are a professional business strategist and AI prompt engineer.
Analyze the web page text and extract 4 fields:
1. business_description: a concise summary of the business.
2. tone: communication style rules.
3. offers: general promotions or discounts (or empty string if none).
4. faq: frequently asked questions (or empty string if none).

Return your output ONLY as a raw JSON object with these keys.`;

  const userPrompt = `TEXTO DEL SITIO WEB:
=== HOME ===
Tienda Online de Selka
Tenemos tónico, crema facial y más. Hacé tu pedido y pagalo online.
Envios: Enviamos a todo el país. Recibí tu rutina en la puerta de tu casa.
Medios de Pago: Pagá en cuotas sin interés con todas las tarjetas.`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { 
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) {
      console.error(`HTTP error: ${res.status}`, await res.text());
      return;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Gemini Response:');
    console.log(text);
    console.log('Parsed JSON:', JSON.parse(text));
  } catch (err) {
    console.error('Error calling Gemini:', err);
  }
}

main();
