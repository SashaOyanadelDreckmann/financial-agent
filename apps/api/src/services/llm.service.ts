// apps/api/src/services/llm.service.ts
import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY no está definido. Revisa tu archivo .env'
    );
  }

  client = new OpenAI({ apiKey });
  return client;
}

/**
 * Genera texto usando el LLM.
 * Servicio genérico reutilizable por cualquier agente.
 */
export async function complete(
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    
  }
    

): Promise<string> {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content:
          options?.systemPrompt ??
          'Eres un asistente profesional, claro y neutral.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: options?.temperature ?? 0.6,
  });
  console.log('LLM PROMPT:', prompt);
  return response.choices[0].message.content?.trim() ?? '';
  console.log('LLM RESPONSE:', response);

}

