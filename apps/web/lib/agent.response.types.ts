export type Artifact = {
  id: string;
  type: 'pdf' | 'chart' | 'table';
  title: string;
  description?: string;
  fileUrl?: string;
  previewImageUrl?: string;
  source?: 'simulation' | 'analysis';
  createdAt: string;
  saved?: boolean;
};
export type AgentBlock =
  | {
      type: 'chart';
      chart: {
        kind: string;
        data: any[];
        xKey: string;
        yKey: string;
      };
    }
  | {
      type: 'document';
      artifact: Artifact;
    };

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
};

export type AgentResponse = {
  message?: string;

  artifacts?: Artifact[];
  citations?: Citation[];

  tool_calls?: any[];
  ui_events?: any[];
  react?: { objective?: string };
  reasoning_mode?: string;

  // compat: algunos backends pueden mandar mode directo
  mode?: string;
};

export type ChatItem =
  | { type: 'agent_block'; role: 'assistant'; block: any }
  | { type: 'message'; role: 'user' | 'assistant'; content: string; mode?: string; objective?: string }
  | { type: 'artifact'; role: 'assistant'; artifact: Artifact }
  | { type: 'citation'; role: 'assistant'; citation: Citation };

export function toChatItemsFromAgentResponse(res: AgentResponse): ChatItem[] {
  const items: ChatItem[] = [];

  if (res?.message) {
    items.push({
      type: 'message',
      role: 'assistant',
      content: res.message,
      mode: res.mode ?? res.reasoning_mode,
      objective: res.react?.objective,
    });
  }

  if (Array.isArray(res?.artifacts)) {
    for (const a of res.artifacts) {
      if (!a?.id || !a?.type) continue;
      items.push({ type: 'artifact', role: 'assistant', artifact: a });
    }
  }

  if (Array.isArray(res?.citations)) {
    for (const c of res.citations) {
      if (!c?.url) continue;
      items.push({ type: 'citation', role: 'assistant', citation: c });
    }
  }

  return items;
}
