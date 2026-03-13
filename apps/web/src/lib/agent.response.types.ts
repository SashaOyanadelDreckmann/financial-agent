export type Artifact = {
  id: string;
  type: 'pdf' | 'chart' | 'table';
  title: string;
  description?: string;
  fileUrl: string;
  previewImageUrl?: string;
  source?: 'simulation' | 'analysis';
  createdAt: string;
  saved?: boolean;
};

export type Citation = {
  id: string;
  title: string;
  url: string;
  source?: string;
};

export type UIEvent = {
  type: string;
  [key: string]: any;
};

export type AgentResponse = {
  // compat
  message?: string;

  // recommended fields
  reasoning_mode?: string;
  mode?: string;

  react?: {
    objective?: string;
  };

  artifacts?: Artifact[];
  citations?: Citation[];
  ui_events?: UIEvent[];

  // allow unknown stuff without breaking
  [key: string]: any;
};

export type ChatItem =
  | {
      type: 'message';
      role: 'user' | 'assistant';
      content: string;
      mode?: string;
      objective?: string;
    }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'citation'; citation: Citation };

export function toChatItemsFromAgentResponse(res: AgentResponse): ChatItem[] {
  const items: ChatItem[] = [];

  const mode = res.mode ?? res.reasoning_mode;
  const objective = res.react?.objective;

  const msg = (res.message ?? '').trim();
  if (msg.length > 0) {
    items.push({
      type: 'message',
      role: 'assistant',
      content: msg,
      mode,
      objective,
    });
  }

  for (const a of res.artifacts ?? []) {
    items.push({ type: 'artifact', artifact: a });
  }

  for (const c of res.citations ?? []) {
    items.push({ type: 'citation', citation: c });
  }

  return items;
}