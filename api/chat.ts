import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { messages, systemPrompt } = req.body as {
    messages: Array<{ role: string; content: string }>;
    systemPrompt?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const systemMessage = systemPrompt || `Sos el asistente de marketing digital de Algoritmia para clientes de The Skirting Factory. 
Tu nombre es "Algo". Respondés en español argentino, de manera clara, amigable y profesional.
Ayudás con dudas sobre campañas de email marketing, Meta Ads, estrategias de captación, retención y resultados de la tienda.
Si te preguntan algo muy específico que requiere revisar datos, deciles que van a poder verlo en la plataforma.
Sé conciso: máximo 3 párrafos por respuesta. Usá emojis con moderación.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          ...messages,
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return res.status(response.status).json({ error: 'OpenAI API error' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
