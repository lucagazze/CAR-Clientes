import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6b2NibnlvZW5qYnB4bWNxb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg0MjkxMywiZXhwIjoyMDY4NDE4OTEzfQ.jyLHl3PaY7wVTbcWZcr4JgoQi8yC459BbQ7UEDtaS6Y";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { clientId } = req.body as { clientId: string };

  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId' });
  }

  try {
    // 1. Fetch scraped_content and business_name from Supabase
    const { data: client, error: dbError } = await supabase
      .from('car_clients')
      .select('business_name, scraped_content')
      .eq('id', clientId)
      .maybeSingle();

    if (dbError || !client) {
      return res.status(404).json({ error: 'Client not found or database error' });
    }

    const { business_name, scraped_content } = client;

    if (!scraped_content) {
      return res.status(400).json({ error: 'Primero debes escanear tu sitio web para extraer conocimiento antes de optimizar los campos con IA.' });
    }

    // 2. Call OpenAI to generate manual context and tone instructions
    const systemPrompt = `You are a professional business strategist and AI prompt engineer.
Your task is to take the raw scraped business knowledge from the website of "${business_name}" and generate the optimal text for two settings fields:

1. "business_description" (Manual Context & Catalog):
   Summarize key support rules, catalog details, return processes, shipping options, and FAQ answers into a highly concise and actionable summary. Limit to 300 words.

2. "custom_instructions" (Tone & Style Rules):
   Write optimal tone guidelines (e.g. friendly, polite, using Argentine Spanish voseo ("vos", "tenés", "mirá"), emojis moderation, maximum length, and conciseness rules). Limit to 100 words.

CRITICAL: Return your output ONLY as a raw JSON object with the keys "business_description" and "custom_instructions". Do not include Markdown blocks, quotes, or conversational explanations.
Example output:
{
  "business_description": "...",
  "custom_instructions": "..."
}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Aquí está el contenido web extraído:\n\n${scraped_content}` }
        ],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(502).json({ error: 'Error al procesar la optimización de campos con OpenAI.', detail: errText });
    }

    const openaiData = await openaiRes.json();
    const resultJsonStr = openaiData.choices?.[0]?.message?.content?.trim() || '';

    let parsedResult: { business_description?: string; custom_instructions?: string } = {};
    try {
      parsedResult = JSON.parse(resultJsonStr);
    } catch (e) {
      return res.status(502).json({ error: 'La respuesta de OpenAI no pudo ser parseada como JSON.', detail: resultJsonStr });
    }

    const desc = parsedResult.business_description || '';
    const inst = parsedResult.custom_instructions || '';

    if (!desc || !inst) {
      return res.status(502).json({ error: 'La respuesta de OpenAI no contiene los campos requeridos.' });
    }

    // 3. Update the client settings in Supabase
    const { error: updateError } = await supabase
      .from('car_clients')
      .update({
        business_description: desc,
        custom_instructions: inst
      })
      .eq('id', clientId);

    if (updateError) {
      return res.status(500).json({ error: 'Error al guardar la optimización de campos en la base de datos.', detail: updateError.message });
    }

    return res.status(200).json({ business_description: desc, custom_instructions: inst });

  } catch (err: any) {
    console.error('[Generate Fields] Error:', err);
    return res.status(500).json({ error: `Error interno de servidor: ${err.message}` });
  }
}
