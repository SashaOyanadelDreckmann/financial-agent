// apps/api/src/services/llm.service.ts
import Anthropic from '@anthropic-ai/sdk';

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no está definido');

  _client = new Anthropic({ apiKey });
  return _client;
}

type CompleteOptions = {
  systemPrompt?: string;
  temperature?: number;
  model?: string;
};

// ✅ Overloads
export async function complete(input: string, options?: CompleteOptions): Promise<string>;
export async function complete(input: LLMMessage[], options?: CompleteOptions): Promise<string>;
export async function complete(
  input: string | LLMMessage[],
  options?: CompleteOptions
): Promise<string> {
  const client = getAnthropicClient();
  const model = options?.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const envTemp = process.env.ANTHROPIC_TEMPERATURE
    ? Number(process.env.ANTHROPIC_TEMPERATURE)
    : undefined;
  const temperature = options?.temperature ?? (Number.isFinite(envTemp) ? envTemp : 0.6);

  let system: string | undefined;
  let messages: Anthropic.MessageParam[];

  if (typeof input === 'string') {
    system = options?.systemPrompt ?? 'Eres un asistente profesional.';
    messages = [{ role: 'user', content: input }];
  } else {
    // Extraer system del array de mensajes
    const sysMsg = input.find((m) => m.role === 'system');
    system = sysMsg?.content;
    messages = input
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    temperature,
    ...(system ? { system } : {}),
    messages,
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return textBlock?.text?.trim() ?? '';
}

export async function completeStructured<T>(params: {
  system: string;
  user: string;
  temperature?: number;
  model?: string;
}): Promise<T> {
  const client = getAnthropicClient();
  const model = params.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: params.temperature ?? 0,
    system: `${params.system}\n\nIMPORTANTE: Responde ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown, sin bloques de código.`,
    messages: [{ role: 'user', content: params.user }],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const raw = textBlock?.text?.trim();
  if (!raw) throw new Error('Respuesta LLM vacía en completeStructured');

  // Extraer JSON de posible bloque markdown ```json ... ```
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : raw;

  return JSON.parse(jsonStr) as T;
}
