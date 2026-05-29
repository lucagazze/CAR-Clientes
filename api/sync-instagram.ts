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
    // 1. Retrieve the client profile to get ig_business_id
    const { data: client, error: clientErr } = await supabase
      .from('car_clients')
      .select('ig_business_id, business_name')
      .eq('id', clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return res.status(404).json({ error: 'No se encontró el cliente o hubo un error en la base de datos.' });
    }

    const igId = client.ig_business_id;
    if (!igId) {
      return res.status(400).json({ error: 'Instagram no está configurado para este cliente (falta ig_business_id).' });
    }

    // 2. Retrieve the Meta token from AgencySettings
    const { data: tokenData, error: tokenErr } = await supabase
      .from('AgencySettings')
      .select('value')
      .eq('key', 'meta_ads_token')
      .maybeSingle();

    const token = tokenData?.value;
    if (tokenErr || !token) {
      return res.status(500).json({ error: 'No se pudo recuperar el token de Meta de AgencySettings.' });
    }

    // 3. Fetch recent Instagram posts
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,media_type,timestamp,permalink&limit=20&access_token=${token}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!igRes.ok) {
      const errText = await igRes.text();
      return res.status(igRes.status).json({ error: `Error al obtener publicaciones de Instagram: ${errText.slice(0, 200)}` });
    }

    const igData = await igRes.json();
    const mediaItems = igData.data || [];

    if (mediaItems.length === 0) {
      return res.status(400).json({ error: 'No se encontraron publicaciones recientes en esta cuenta de Instagram.' });
    }

    // 4. Extract captions and clean them
    const compiledCaptions = mediaItems
      .map((item: any, i: number) => {
        if (!item.caption) return '';
        const cleanCaption = item.caption.replace(/\s+/g, ' ').trim();
        return `[Post ${i + 1} - ${new Date(item.timestamp).toLocaleDateString()}]\n"${cleanCaption}"`;
      })
      .filter(Boolean)
      .join('\n\n');

    if (!compiledCaptions) {
      return res.status(400).json({ error: 'Las publicaciones recientes de Instagram no contienen descripciones de texto.' });
    }

    // 5. Call OpenAI to analyze and summarize the Instagram posts
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un experto analista de marca y creador de bases de conocimiento.
Tu tarea es analizar las descripciones de las publicaciones de Instagram recientes de la marca "${client.business_name}" y redactar un resumen ejecutivo del negocio en Español.
Este resumen servirá de contexto para que un asistente de IA pueda responder mensajes de clientes sobre la marcha con información actualizada.

Organiza la información en los siguientes puntos:
1. PRODUCTOS DESTACADOS Y LANZAMIENTOS (¿Qué productos se mencionan y muestran frecuentemente?)
2. PRECIOS Y PROMOCIONES ACTIVAS (Descuentos, cuotas, envíos gratis, códigos promocionales activos)
3. ESTILO DE COMUNICACIÓN Y HASHTAGS (Cómo se comunica la marca, qué palabras clave usa)
4. NOVEDADES Y CAMPAÑAS RECIENTES (Últimos eventos, sorteos o anuncios del feed)

Sé sumamente conciso, práctico y directo. Escribe en Español.`
          },
          {
            role: 'user',
            content: `Aquí están los captions de las publicaciones recientes:\n\n${compiledCaptions.slice(0, 25000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(502).json({ error: 'Error al procesar la información de Instagram con OpenAI.', detail: errText });
    }

    const openaiData = await openaiRes.json();
    const summary = openaiData.choices?.[0]?.message?.content?.trim() || '';

    if (!summary) {
      return res.status(502).json({ error: 'OpenAI devolvió un resumen de Instagram vacío.' });
    }

    // 6. Save summarized content in public.car_clients (column instagram_context)
    const { error: dbError } = await supabase
      .from('car_clients')
      .update({ 
        instagram_context: summary
      })
      .eq('id', clientId);

    if (dbError) {
      return res.status(500).json({ error: 'Error al guardar la información de Instagram en la base de datos.', detail: dbError.message });
    }

    return res.status(200).json({ summary });

  } catch (err: any) {
    console.error('[Instagram Scraper] Error:', err);
    return res.status(500).json({ error: `Error interno de servidor: ${err.message}` });
  }
}
