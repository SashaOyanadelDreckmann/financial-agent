// apps/api/src/services/llm.service.ts
import OpenAI from 'openai';

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no está definido');

  client = new OpenAI({ apiKey });
  return client;
}

type CompleteOptions = {
  systemPrompt?: string;
  temperature?: number;
  model?: string;
};

// ✅ Overloads (esto suele matar el error de VSCode altiro)
export async function complete(input: string, options?: CompleteOptions): Promise<string>;
export async function complete(input: LLMMessage[], options?: CompleteOptions): Promise<string>;
export async function complete(
  input: string | LLMMessage[],
  options?: CompleteOptions
): Promise<string> {
  const openai = getClient();
  const model = options?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const envTemp = process.env.OPENAI_TEMPERATURE
    ? Number(process.env.OPENAI_TEMPERATURE)
    : undefined;
  const temperature =
    options?.temperature ?? (Number.isFinite(envTemp) ? envTemp : 0.6);

  const messages: LLMMessage[] =
    typeof input === 'string'
      ? [
          {
            role: 'system',
            content: options?.systemPrompt ?? 'Eres un asistente profesional.',
          },
          { role: 'user', content: input },
        ]
      : input;

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
  });

  return response.choices[0].message.content?.trim() ?? '';
}

export async function completeStructured<T>(params: {
  system: string;
  user: string;
  temperature?: number;
  model?: string;
}): Promise<T> {
  const openai = getClient();
  const model = params.model ?? process.env.OPENAI_MODEL ?? 'gpt-4.1';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `${params.system}\n\nRespond ONLY with valid json.` },
      { role: 'user', content: `${params.user}\n\njson` },
    ],
    temperature: params.temperature ?? 0,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('LLM response vacío en completeStructured');

  return JSON.parse(content) as T;
}
