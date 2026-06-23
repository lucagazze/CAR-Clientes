const fs = require('fs');
const path = require('path');

// Manually parse and load .env.local
try {
  const dotenvContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  dotenvContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length > 0) {
      let cleanVal = val.join('=').trim();
      if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
        cleanVal = cleanVal.slice(1, -1);
      }
      process.env[key.trim()] = cleanVal;
    }
  });
} catch (e) {
  console.error('Error loading .env.local:', e.message);
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const activeKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!activeKey) {
    console.error('No Gemini Key found in environment variables.');
    return;
  }
  
  console.log('Using Gemini Key (masked):', activeKey.slice(0, 8) + '...');

  const clientId = 'e33a4b38-56a3-4638-a508-1682f2898978';
  const { data: client } = await supabase
    .from('car_clients')
    .select('business_name, business_description, custom_instructions, website_url, instagram_context, scraped_content')
    .eq('id', clientId)
    .maybeSingle();

  // Re-create prompt logic
  let linksStr = '';
  let toneInstructions = '', offersContext = '', faqContext = '';
  try {
    const ci = JSON.parse(client.custom_instructions || '{}');
    toneInstructions = ci.tone || '';
    offersContext = ci.offers || '';
    faqContext = ci.faq || '';
  } catch {
    toneInstructions = client.custom_instructions || '';
  }

  const cerebroContext = [
    client.business_description && `DESCRIPCIÓN GENERAL:\n${client.business_description}`,
    client.scraped_content && `CONTENIDO WEB / CEREBRO:\n${client.scraped_content}`,
    client.instagram_context && `CONTEXTO DE REDES SOCIALES:\n${client.instagram_context}`,
    toneInstructions && `ESTILO / TONO VIGENTE:\n${toneInstructions}`,
    offersContext && `OFERTAS ACTIVAS:\n${offersContext}`,
    faqContext && `FAQ:\n${faqContext}`,
  ].filter(Boolean).join('\n\n---\n\n');

  const goalInstructions = `El objetivo es alcance viral y engagement. Creá un gancho inicial sumamente intrépido o polémico en la primera línea. Usá humor, curiosidad o intriga. Invitá al usuario a guardar o compartir el video.`;
  const toneOverride = `Tono: Basate en las instrucciones de tono predeterminadas de la marca: ${toneInstructions || 'Natural y dinámico'}.`;

  const systemPrompt = `Sos un experto en marketing digital, copywriting y redes sociales. Tu tarea es redactar un excelente pie de página ('caption' o 'copy') para publicar en redes sociales (Instagram, Facebook, TikTok o YouTube Shorts) para un negocio.`;

  const userPrompt = `Escribí un copy enganchador, persuasivo y nativo de redes sociales para un creativo.

Detalles del creativo / video:
- ¿De qué trata el video?: Un video mostrando los pasos para aplicar la crema y lograr un brillo e hidratación en la piel.
- Cómo enfocar la publicación / video: Resaltar la textura y el glow inmediato.

Información del negocio (Cerebro de la marca):
- Nombre: ${client.business_name || 'Mi Negocio'}
- Sitio web: ${client.website_url || '—'}
${linksStr}

Contexto y conocimiento de la marca (Cerebro de la marca):
${cerebroContext || '—'}

Enfoque de redacción solicitado:
- Objetivo de la publicación: ${goalInstructions}
- Tono a emplear: ${toneOverride}

Instrucciones de formato y estilo:
1. El copy debe sonar totalmente humano, dinámico y adaptado al enfoque solicitado.
2. Usá saltos de línea para que sea fácil de leer (separando gancho, desarrollo y CTA).
3. Usá emojis de manera inteligente para destacar puntos clave, sin abusar.
4. Incluí llamados a la acción (CTA) claros dirigidos a entrar al enlace, enviar mensaje o visitar la tienda.
5. Colocá al final una sección de hashtags relevantes (entre 5 y 10).
6. Devolvé únicamente el texto del copy redactado, sin ningún comentario tuyo, ni comillas iniciales/finales, ni markdown adicional.`;

  const geminiBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  };

  const model = 'gemini-2.5-flash';
  console.log(`Calling Gemini API using model ${model}...`);
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    }
  );

  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Full Raw Response Candidates:');
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    console.log(JSON.stringify(data.candidates[0].content, null, 2));
    console.log('Finish Reason:', data.candidates[0].finishReason);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
