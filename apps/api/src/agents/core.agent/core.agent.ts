import type {
  ChatAgentInput,
  ChatAgentResponse,
  ReasoningMode,
  ToolCall,
  Citation,
  AgentBlock,
  ChartBlock,
} from './chat.types';

import {
  ChatAgentResponseSchema,
  ReasoningModeSchema,
} from './chat.types';

import { completeStructured, complete } from '../../services/llm.service';
import { runMCPTool } from '../../mcp/tools/runMCPTool';
import { randomUUID } from 'crypto';

import {
  CORE_CLASSIFIER_SYSTEM,
  CORE_RESPONSE_SYSTEM,
  CORE_PLANNER_SYSTEM,
} from './system.prompts';

type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/* ────────────────────────────── */
/* Helpers                        */
/* ────────────────────────────── */
function sourceName(c: { doc_id: string; doc_title?: string }): string {
  if (c.doc_title) return c.doc_title;
  try {
    return new URL(c.doc_id).hostname;
  } catch {
    const parts = c.doc_id.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] ?? 'source';
  }
}

function isArtifactLike(x: any): boolean {
  return (
    x &&
    typeof x === 'object' &&
    typeof x.id === 'string' &&
    typeof x.type === 'string' &&
    typeof x.title === 'string'
  );
}

/**
 * Detecta si un output contiene una serie temporal graficable
 */
function extractChartFromToolOutput(
  tool: string,
  data: any
): ChartBlock | null {
  if (!data || !Array.isArray(data.series)) return null;

  // Heurística mínima: series con month + balance / p50
  const sample = data.series[0];
  if (!sample || typeof sample.month !== 'number') return null;

  const yKey =
    'balance' in sample
      ? 'balance'
      : 'p50' in sample
      ? 'p50'
      : null;

  if (!yKey) return null;

  return {
    type: 'chart',
    chart: {
      kind: 'line',
      title: 'Evolución del portafolio',
      subtitle: 'Proyección en el tiempo',
      xKey: 'month',
      yKey,
      data: data.series,
      format: 'currency',
      currency: 'CLP',
    },
  };
}

/* ────────────────────────────── */
/* Core Agent                     */
/* ────────────────────────────── */
export async function runCoreAgent(
  input: ChatAgentInput
): Promise<ChatAgentResponse> {
  const turnId = randomUUID();
  const startedAt = Date.now();
  const text = input.user_message.trim();

  /* ────────────────────────────── */
  /* Clasificación                  */
  /* ────────────────────────────── */
  const classification = await completeStructured<{
    mode: string;
    intent: string;
    requires_tools: boolean;
    requires_rag?: boolean;
    confidence: number;
  }>({
    system: CORE_CLASSIFIER_SYSTEM,
    user: text,
  });

  const mode: ReasoningMode =
    ReasoningModeSchema.safeParse(classification.mode).success
      ? (classification.mode as ReasoningMode)
      : 'information';

  const confidence = Number.isFinite(classification.confidence)
    ? classification.confidence
    : 0.5;

  /* ────────────────────────────── */
  /* Buffers                        */
  /* ────────────────────────────── */
  const tool_calls: ToolCall[] = [];
  const tool_outputs: Array<{ tool: string; data: any }> = [];
  const citations: Citation[] = [];
  const artifacts: any[] = [];
  const agent_blocks: AgentBlock[] = [];

  /* ────────────────────────────── */
  /* RAG automático                 */
  /* ────────────────────────────── */
  if (confidence < 0.6) {
    const rag = await runMCPTool({
      tool: 'rag.lookup',
      args: { query: text, limit: 5 },
      turn_id: turnId,
      user_id: input.user_id,
      ctx: { mode, intent: classification.intent },
    });

    if (rag?.tool_call) tool_calls.push(rag.tool_call);
    if (rag?.data) tool_outputs.push({ tool: 'rag.lookup', data: rag.data });
    if (rag?.citations) citations.push(...rag.citations);
  }

  /* ────────────────────────────── */
  /* Planning                       */
  /* ────────────────────────────── */
  const plan = classification.requires_tools
    ? await completeStructured<{
        objective: string;
        steps: Array<{ goal: string; tool?: string; args?: any }>;
      }>({
        system: CORE_PLANNER_SYSTEM,
        user: JSON.stringify({
          message: text,
          intent: classification.intent,
          mode,
        }),
      })
    : { objective: 'respond', steps: [] };

  /* ────────────────────────────── */
  /* Ejecutar tools                 */
  /* ────────────────────────────── */
  for (const step of plan.steps) {
    if (!step.tool) continue;

    const result = await runMCPTool({
      tool: step.tool,
      args: step.args ?? {},
      turn_id: turnId,
      user_id: input.user_id,
      ctx: { mode, intent: classification.intent },
    });

    if (!result?.tool_call) continue;

    tool_calls.push(result.tool_call);

    if (result.data) {
      tool_outputs.push({ tool: step.tool, data: result.data });

      // 📦 artifacts
      if (isArtifactLike(result.data)) {
        artifacts.push(result.data);
      }

      // 📊 charts (NUEVO)
      const chart = extractChartFromToolOutput(step.tool, result.data);
      if (chart) agent_blocks.push(chart);
    }

    if (result.citations) citations.push(...result.citations);
  }

  /* ────────────────────────────── */
  /* Prompt final                   */
  /* ────────────────────────────── */
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: `${CORE_RESPONSE_SYSTEM}

Reglas:
- Explica resultados de forma clara y estructurada.
- Si hay gráficos, descríbelos y refiérelos en el texto.
- Si existe PDF, pregunta si desea guardarlo.`,
    },
    ...(input.history ?? []).map((h) => ({
      role: h.role as LLMMessage['role'],
      content: h.content,
    })),
    {
      role: 'user',
      content: JSON.stringify({
        message: text,
        objective: plan.objective,
        tool_outputs,
      }),
    },
  ];

  const message = await complete(messages, { temperature: 0.4 });

  /* ────────────────────────────── */
  /* Response canónica              */
  /* ────────────────────────────── */
  const response: ChatAgentResponse = {
    message,
    mode,
    tool_calls,
    react: {
      objective: plan.objective,
      steps: plan.steps.map((s, i) => ({
        step: i,
        goal: s.goal,
        decision: s.tool ?? 'none',
      })),
    },
    agent_blocks,
    artifacts,
    citations,
    compliance: {
      mode,
      no_auto_execution: true,
      includes_recommendation: mode === 'decision_support',
      includes_simulation: mode === 'simulation',
      includes_regulation: mode === 'regulation',
      risk_score: 1 - confidence,
      missing_information: [],
      disclaimers_shown: [],
      blocked: { is_blocked: false },
    },
    state_updates: {},
    meta: {
      turn_id: turnId,
      latency_ms: Date.now() - startedAt,
    },
  };

  return ChatAgentResponseSchema.parse(response);
}
