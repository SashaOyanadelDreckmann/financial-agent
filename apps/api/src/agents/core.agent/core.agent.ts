import type {
  ChatAgentInput,
  ChatAgentResponse,
  ReasoningMode,
  ToolCall,
  Citation,
  AgentBlock,
  ChartBlock,
  TableBlock,
} from './chat.types';

import { runReportAgent } from '../report.agent/report.agent';

import {
  ChatAgentResponseSchema,
  ReasoningModeSchema,
} from './chat.types';

import { completeStructured, complete, getAnthropicClient } from '../../services/llm.service';
import { runMCPTool } from '../../mcp/tools/runMCPTool';
import { buildAnthropicTools, getOriginalToolName } from '../../mcp/anthropic-bridge';
import { randomUUID } from 'crypto';
import type Anthropic from '@anthropic-ai/sdk';
import { getLogger } from '../../logger';

import {
  CORE_CLASSIFIER_SYSTEM,
  CORE_RESPONSE_SYSTEM,
  CORE_TOOL_AGENT_SYSTEM,
} from './system.prompts';

import {
  detectKnowledgeEvent,
} from './knowledge-detector';
import {
  getMilestones,
  recordKnowledgeEvent,
} from '../../services/knowledge.service';
import { validateAgentDecision } from './coherence-validator';

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

type InferredUserModel = {
  preferred_output: 'pdf' | 'charts' | 'mixed';
  detail_level: 'standard' | 'high';
  risk_profile: 'conservative' | 'balanced' | 'aggressive';
  inferred_horizon_months?: number;
  inferred_monthly_contribution?: number;
  inferred_principal?: number;
};

type ContextArtifactSummary = {
  title?: string;
  description?: string;
  source?: string;
  createdAt?: string;
  meta?: Record<string, any>;
};

type ContextChartSummary = {
  title?: string;
  subtitle?: string;
  kind?: string;
  xKey?: string;
  yKey?: string;
  points?: number;
  lastValue?: number;
};

type UploadedEvidenceSummary = {
  name: string;
};

type ReportTablePayload = {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  align?: Array<'left' | 'center' | 'right'>;
};

type ReportChartPayload = {
  title: string;
  subtitle?: string;
  kind?: 'line' | 'bar' | 'area';
  labels: string[];
  values: number[];
};

type PdfContextPayload = {
  title: string;
  subtitle: string;
  executiveSummary: string;
  keyFindings: string[];
  assumptions: string[];
  contextHighlights: string[];
};

function isConceptualPdfRequest(input: ChatAgentInput, mode: ReasoningMode): boolean {
  const full = `${(input.history ?? []).map((h) => h.content).join(' ')} ${input.user_message}`.toLowerCase();
  const asksPdf = /\b(pdf|reporte|informe|documento|descargar|archivo)\b/i.test(full);
  if (!asksPdf) return false;
  const conceptual = /\b(que es|qué es|explica|concepto|definici[oó]n|glosario|cmf|fintec|ley)\b/i.test(full);
  const hasNumbers = /[\$]?\d{3,}/.test(full);
  return conceptual && !hasNumbers && (mode === 'education' || mode === 'regulation' || mode === 'information');
}

function getCurrentRequestText(input: ChatAgentInput, intent?: string): string {
  return `${input.user_message} ${intent ?? ''}`.toLowerCase();
}

function shouldPreferNarrativeReport(
  input: ChatAgentInput,
  mode: ReasoningMode,
  intent?: string
): boolean {
  const full = getCurrentRequestText(input, intent);
  const asksReport = /\b(pdf|reporte|informe|documento|archivo|resumen ejecutivo)\b/i.test(full);
  const asksTableOrChartExplanation =
    /\b(tabla|tablas|cuadro|matriz|grafico|gráfico|chart)\b/i.test(full) &&
    /\b(explica|explicame|explicación|analiza|interpret|estructur|resum)\b/i.test(full);

  if (!asksReport && !asksTableOrChartExplanation) return false;

  const strongSimulationSignal =
    /\b(simul|proyecci|rentabilidad|drawdown|volatilidad|monte\s*carlo|escenario)\b/i.test(full) ||
    (/\b(tasa|aporte|capital|mes|meses)\b/i.test(full) && /[\$]?\d{3,}/.test(full));

  if (strongSimulationSignal && mode === 'simulation') return false;
  return true;
}

function shouldIncludeCMFRegulatorySupport(
  input: ChatAgentInput,
  intent?: string
): boolean {
  const full = getCurrentRequestText(input, intent);
  const asksPdf = /\b(pdf|reporte|informe|documento|archivo)\b/i.test(full);
  const asksRegulatory = /\b(cmf|fintec|ley fintec|glosario|normativa|regulaci[oó]n|marco legal)\b/i.test(full);
  return asksPdf && asksRegulatory;
}

function buildNarrativeSections(input: ChatAgentInput, intent: string): Array<{ heading: string; body: string }> {
  const recentUserSignals = pickRecentUserSignals(input);
  const context = (input.context ?? {}) as Record<string, any>;
  const profile = context.profile ?? context.injected_profile;
  const recentArtifacts = pickContextArtifacts(input);
  const recentCharts = pickContextCharts(input);
  const uploadedEvidence = pickUploadedEvidence(input);
  const userInstructions = [input.user_message, ...recentUserSignals].filter(Boolean).slice(0, 4).join(' | ');
  const profileSummary = profile
    ? 'Se incorpora perfil del usuario para personalizar el contenido sin forzar un diagnóstico clínico.'
    : 'No hay perfil completo; se usa un enfoque contextual y accionable basado en el chat.';

  const chartSummary =
    recentCharts.length > 0
      ? `Graficos considerados: ${recentCharts
          .map((c) => c.title ?? c.yKey ?? c.kind)
          .filter(Boolean)
          .join(' | ')
          .slice(0, 320)}.`
      : 'No hay graficos recientes para anexar en este informe.';

  const artifactSummary =
    recentArtifacts.length > 0
      ? `Documentos previos usados como continuidad: ${recentArtifacts
          .map((a) => a.title)
          .filter(Boolean)
          .join(' | ')
          .slice(0, 300)}.`
      : 'No hay documentos previos del chat para continuidad.';

  const evidenceSummary =
    uploadedEvidence.length > 0
      ? `Archivos/evidencia subida: ${uploadedEvidence.map((f) => f.name).join(' | ').slice(0, 260)}.`
      : 'No hay evidencia de archivos subida en este tramo.';
  const includeCMF = shouldIncludeCMFRegulatorySupport(input, intent);

  const sections: Array<{ heading: string; body: string }> = [
    {
      heading: 'Contexto',
      body: `Objetivo solicitado: ${intent}. ${profileSummary}`,
    },
    {
      heading: 'Instrucciones y alcance',
      body:
        userInstructions.length > 0
          ? `Se priorizan estas instrucciones del usuario: ${userInstructions.slice(0, 380)}.`
          : 'Se estructura el informe en base al contexto conversacional disponible.',
    },
    {
      heading: 'Sintesis estructurada',
      body: [
        recentUserSignals.length > 0
          ? `Senales del chat usadas para estructurar el informe: ${recentUserSignals.join(' | ').slice(0, 320)}.`
          : 'Se entrega una sintesis clara en formato ejecutivo.',
        chartSummary,
        artifactSummary,
      ].join(' '),
    },
    {
      heading: 'Tablas, graficos y evidencia',
      body: `${evidenceSummary} Si corresponde, el informe traduce graficos y tablas en conclusiones accionables para la decision solicitada.`,
    },
    {
      heading: 'Cierre operativo',
      body:
        'Este documento es un informe contextual del tema conversado (no un diagnóstico por defecto) y queda listo para reutilizarse en nuevas iteraciones.',
    },
  ];

  if (includeCMF) {
    sections.push({
      heading: 'Marco regulatorio y fuentes (CMF)',
      body:
        'Este informe integra definiciones regulatorias de la CMF cuando corresponda. Si se usan datos normativos, deben citarse explícitamente como fuente CMF en el entregable y en la respuesta del chat.',
    });
  }

  return sections;
}

function pickUploadedEvidence(input: ChatAgentInput): UploadedEvidenceSummary[] {
  const context = (input.context ?? {}) as Record<string, any>;
  const direct = context.uploaded_evidence_files;
  const consolidated = context.consolidated_context?.transactions?.uploadedFiles;
  const candidate = Array.isArray(direct)
    ? direct
    : Array.isArray(consolidated)
    ? consolidated
    : [];

  return candidate
    .slice(-8)
    .filter((x: unknown) => typeof x === 'string' && x.trim().length > 0)
    .map((name: string) => ({ name: name.trim() }));
}

function isDiagnosticReportRequest(input: ChatAgentInput, intent?: string): boolean {
  const full = getCurrentRequestText(input, intent);
  return /\b(diagnos|diagnóstico|perfil financiero|radiograf[ií]a financiera)\b/i.test(
    full
  );
}

function buildDiagnosticNarrativeSections(
  input: ChatAgentInput,
  intent: string,
  mode: ReasoningMode
): Array<{ heading: string; body: string }> {
  const context = (input.context ?? {}) as Record<string, any>;
  const profile = context.profile ?? context.injected_profile;
  const intake = context.intake_context ?? context.injected_intake;
  const recentUserSignals = pickRecentUserSignals(input);
  const recentArtifacts = pickContextArtifacts(input);
  const recentCharts = pickContextCharts(input);
  const uploadedEvidence = pickUploadedEvidence(input);

  const profileNarrative =
    typeof profile?.diagnosticNarrative === 'string' && profile.diagnosticNarrative.trim().length > 0
      ? profile.diagnosticNarrative.trim().slice(0, 700)
      : 'Sin narrativa diagnóstica persistida; se usa diagnóstico inferido desde conversación y evidencia reciente.';

  const tensions = Array.isArray(profile?.tensions) ? profile.tensions.slice(0, 4) : [];
  const hypotheses = Array.isArray(profile?.hypotheses) ? profile.hypotheses.slice(0, 4) : [];
  const openQuestions = Array.isArray(profile?.openQuestions) ? profile.openQuestions.slice(0, 4) : [];

  const chartLine =
    recentCharts.length > 0
      ? `Graficos relevantes del chat: ${recentCharts
          .map((c) => c.title ?? c.yKey ?? c.kind)
          .filter(Boolean)
          .join(' | ')
          .slice(0, 320)}.`
      : 'No hay graficos recientes en el historial.';

  const docsLine =
    recentArtifacts.length > 0
      ? `Documentos previos considerados: ${recentArtifacts
          .map((a) => a.title)
          .filter(Boolean)
          .join(' | ')
          .slice(0, 320)}.`
      : 'No hay documentos previos en la conversacion.';

  const evidenceLine =
    uploadedEvidence.length > 0
      ? `Evidencia subida por el usuario: ${uploadedEvidence
          .map((f) => f.name)
          .join(' | ')
          .slice(0, 320)}.`
      : 'No se detecta evidencia de cartolas/archivos en este turno.';

  const profileTraits: string[] = [];
  if (profile?.profile?.financialClarity) profileTraits.push(`claridad ${profile.profile.financialClarity}`);
  if (profile?.profile?.decisionStyle) profileTraits.push(`decision ${profile.profile.decisionStyle}`);
  if (profile?.profile?.timeHorizon) profileTraits.push(`horizonte ${profile.profile.timeHorizon}`);
  if (profile?.profile?.financialPressure) profileTraits.push(`presion ${profile.profile.financialPressure}`);

  return [
    {
      heading: 'Resumen ejecutivo del diagnostico',
      body: `Objetivo del informe: ${intent}. Modo cognitivo aplicado: ${mode}. ${profileNarrative}`,
    },
    {
      heading: 'Lectura integrada del contexto',
      body: [
        recentUserSignals.length > 0
          ? `Senales conversacionales recientes: ${recentUserSignals.join(' | ').slice(0, 300)}.`
          : 'No hay senales conversacionales recientes suficientes.',
        chartLine,
        docsLine,
        evidenceLine,
      ].join(' '),
    },
    {
      heading: 'Diagnostico por categorias',
      body: profileTraits.length
        ? `Perfil inferido: ${profileTraits.join(', ')}.`
        : 'Perfil inferido no estructurado: se recomienda completar entrevista para robustecer categorias.',
    },
    {
      heading: 'Tensiones e hipotesis',
      body: [
        tensions.length > 0 ? `Tensiones detectadas: ${tensions.join(' | ')}.` : 'No se detectan tensiones explicitas.',
        hypotheses.length > 0 ? `Hipotesis de trabajo: ${hypotheses.join(' | ')}.` : 'Sin hipotesis persistidas.',
      ].join(' '),
    },
    {
      heading: 'Brechas y proximos pasos',
      body: [
        openQuestions.length > 0
          ? `Preguntas abiertas para cerrar brechas: ${openQuestions.join(' | ')}.`
          : 'No hay preguntas abiertas persistidas; el plan puede ejecutarse con seguimiento mensual.',
        intake ? 'Se incorporo informacion de intake para mantener coherencia con perfil.' : 'No hay intake persistido en este contexto.',
      ].join(' '),
    },
  ];
}

function classifyReportCategory(
  input: ChatAgentInput,
  mode: ReasoningMode,
  intent: string,
  diagnostic: boolean
): { key: 'plan_action' | 'simulation' | 'budget' | 'diagnosis' | 'other'; titlePrefix: string } {
  if (diagnostic) return { key: 'diagnosis', titlePrefix: 'Diagnostico financiero integral' };
  if (mode === 'budgeting') return { key: 'budget', titlePrefix: 'Presupuesto y flujo' };
  if (mode === 'planification' || mode === 'decision_support')
    return { key: 'plan_action', titlePrefix: 'Plan de accion financiero' };
  if (mode === 'simulation' || mode === 'comparison')
    return { key: 'simulation', titlePrefix: 'Simulacion y escenarios' };

  const full = `${input.user_message} ${intent}`.toLowerCase();
  if (/\b(presupuesto|gasto|ingreso|flujo)\b/i.test(full)) {
    return { key: 'budget', titlePrefix: 'Presupuesto y flujo' };
  }
  if (/\b(plan|accion|paso a paso|roadmap)\b/i.test(full)) {
    return { key: 'plan_action', titlePrefix: 'Plan de accion financiero' };
  }
  return { key: 'other', titlePrefix: 'Informe contextual' };
}

function buildBudgetReportTables(input: ChatAgentInput): ReportTablePayload[] {
  const context = (input.context ?? {}) as Record<string, any>;
  const rowsRaw = context.consolidated_context?.budget?.rows;
  const totals = context.consolidated_context?.budget?.totals;
  const rows = Array.isArray(rowsRaw) ? rowsRaw.slice(0, 20) : [];
  if (rows.length === 0 && !totals) return [];

  const out: ReportTablePayload[] = [];
  if (rows.length > 0) {
    out.push({
      title: 'Detalle presupuestario',
      columns: ['Categoria', 'Tipo', 'Monto', 'Nota'],
      rows: rows.map((r: any) => [
        String(r?.category ?? '-'),
        String(r?.type ?? '-'),
        typeof r?.amount === 'number' ? r.amount : Number(r?.amount ?? 0),
        String(r?.note ?? ''),
      ]),
      align: ['left', 'center', 'right', 'left'],
    });
  }

  if (totals && typeof totals === 'object') {
    out.push({
      title: 'Totales de presupuesto',
      columns: ['Indicador', 'Valor'],
      rows: [
        ['Ingresos', Number(totals?.income ?? 0)],
        ['Gastos', Number(totals?.expense ?? 0)],
        ['Balance', Number(totals?.balance ?? 0)],
      ],
      align: ['left', 'right'],
    });
  }

  return out;
}

function pickContextReportCharts(input: ChatAgentInput): ReportChartPayload[] {
  const raw = ((input.context ?? {}) as any)?.recent_chart_blocks;
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(-3)
    .map((b: any) => {
      const chart = b?.chart;
      if (!chart || !Array.isArray(chart?.data) || chart.data.length === 0) return null;
      const xKey = typeof chart?.xKey === 'string' ? chart.xKey : 'x';
      const yKey = typeof chart?.yKey === 'string' ? chart.yKey : 'y';
      const clipped = chart.data.slice(-48);
      const labels = clipped.map((p: any, i: number) => String(p?.[xKey] ?? i + 1));
      const values = clipped.map((p: any) => Number(p?.[yKey] ?? 0)).filter((v: number) => Number.isFinite(v));
      if (labels.length === 0 || values.length === 0) return null;

      return {
        title: String(chart?.title ?? 'Grafico del informe'),
        subtitle: typeof chart?.subtitle === 'string' ? chart.subtitle : undefined,
        kind:
          chart?.kind === 'line' || chart?.kind === 'bar' || chart?.kind === 'area'
            ? chart.kind
            : 'line',
        labels: labels.slice(0, values.length),
        values: values.slice(0, labels.length),
      } as ReportChartPayload;
    })
    .filter((x): x is ReportChartPayload => Boolean(x));
}

type PdfFormatPreferences = {
  audience?: string;
  detail?: string;
  structure?: string;
  style?: string;
};

function inferUserModel(input: ChatAgentInput): InferredUserModel {
  const historyText = (input.history ?? [])
    .map((h) => h.content)
    .join(' ')
    .toLowerCase();
  const current = input.user_message.toLowerCase();
  const full = `${historyText} ${current}`;

  const asksPdf = /\b(pdf|reporte|documento|descargar)\b/i.test(full);
  const asksChart = /\b(grafico|gráfico|chart|visual)\b/i.test(full);
  const preferred_output = asksPdf && asksChart ? 'mixed' : asksPdf ? 'pdf' : 'charts';

  const avgLen =
    ((input.history ?? []).reduce((acc, h) => acc + h.content.length, 0) +
      input.user_message.length) /
    Math.max(1, (input.history?.length ?? 0) + 1);
  const detail_level = avgLen > 170 ? 'high' : 'standard';

  const conservativeSignals = /(conservador|bajo riesgo|seguro|estable)/i.test(full);
  const aggressiveSignals = /(agresivo|alto riesgo|alto retorno|crecimiento)/i.test(full);
  const risk_profile = conservativeSignals
    ? 'conservative'
    : aggressiveSignals
    ? 'aggressive'
    : 'balanced';

  const monthsMatch = full.match(/(\d{1,3})\s*(mes|meses)\b/i);
  const inferred_horizon_months = monthsMatch ? Number(monthsMatch[1]) : undefined;

  const monthlyMatch = full.match(/(aporte|ahorro)\s*(mensual)?\s*(de)?\s*\$?\s*([\d.]{3,})/i);
  const inferred_monthly_contribution = monthlyMatch
    ? Number(monthlyMatch[4].replace(/\./g, ''))
    : undefined;

  const principalMatch = full.match(/(capital inicial|inicial|monto)\s*(de)?\s*\$?\s*([\d.]{4,})/i);
  const inferred_principal = principalMatch
    ? Number(principalMatch[3].replace(/\./g, ''))
    : undefined;

  return {
    preferred_output,
    detail_level,
    risk_profile,
    inferred_horizon_months,
    inferred_monthly_contribution,
    inferred_principal,
  };
}

function inferPdfFormatPreferences(input: ChatAgentInput): PdfFormatPreferences {
  const full = `${(input.history ?? []).map((h) => h.content).join(' ')} ${input.user_message}`.toLowerCase();

  const audience = /\b(directorio|gerencia|cliente|inversionista|academico|personal)\b/i.exec(full)?.[1];
  const detail = /\b(ejecutivo|resumen|detallado|tecnico|profundo|breve)\b/i.exec(full)?.[1];
  const structure = /\b(secciones|tabla de contenidos|paso a paso|comparativo|escenarios)\b/i.exec(full)?.[1];
  const style = /\b(blanco y negro|bn|corporativo|minimalista|formal|moderno)\b/i.exec(full)?.[1];

  return {
    audience,
    detail,
    structure,
    style,
  };
}

function isPdfFormatComplete(prefs: PdfFormatPreferences): boolean {
  return Boolean(prefs.audience && prefs.detail && prefs.structure && prefs.style);
}

function userAllowsAgentToChooseFormat(text: string): boolean {
  return /\b(lo que quieras|como quieras|como sea|cualquiera|elige tu|elige tú|solo hazlo|hazlo ya)\b/i.test(
    text
  );
}

function shouldAskPdfFormat(input: ChatAgentInput): boolean {
  const asksPdf = /\b(pdf|reporte|informe|documento|descargar|archivo|guarda(?:rlo)?|biblioteca)\b/i.test(
    input.user_message
  );
  if (!asksPdf) return false;

  // Si el usuario pide generar/entregar un PDF, se ejecuta en el turno actual sin bloquear por formato.
  const explicitGenerateIntent =
    /\b(haz|crea|genera|entrega|arm[aá]|prepara|construye|quiero)\b/i.test(input.user_message);
  if (explicitGenerateIntent) return false;

  // Solo preguntar formato cuando el usuario explícitamente pide diseñar/ajustar formato
  // y NO está pidiendo ejecución inmediata.
  const explicitFormatRequest =
    /\b(formato|audiencia|estilo visual|diseñ|diseñ[oa]r|estructura)\b/i.test(
      input.user_message
    );
  if (!explicitFormatRequest) return false;
  if (userAllowsAgentToChooseFormat(input.user_message)) return false;

  const recentAssistantAskedFormat = (input.history ?? [])
    .slice(-4)
    .some(
      (h) =>
        h.role === 'assistant' &&
        /define este formato|audiencia objetivo|estilo visual/i.test(h.content)
    );
  if (recentAssistantAskedFormat) return false;

  const prefs = inferPdfFormatPreferences(input);
  return !isPdfFormatComplete(prefs);
}

function riskRate(profile: InferredUserModel['risk_profile']): number {
  if (profile === 'conservative') return 0.04;
  if (profile === 'aggressive') return 0.09;
  return 0.06;
}

function buildPdfTitle(mode: ReasoningMode, intent: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const modeLabel =
    mode === 'budgeting'
      ? 'Presupuesto'
      : mode === 'planification'
      ? 'Plan financiero'
      : mode === 'decision_support'
      ? 'Decision financiera'
      : mode === 'comparison'
      ? 'Comparativo financiero'
      : 'Simulacion financiera';
  return `${modeLabel} · ${intent.slice(0, 42)} · ${stamp}`;
}

function normalizeAnnualRate(n: number): number {
  if (!Number.isFinite(n)) return 0.06;
  if (n > 1 && n <= 100) return n / 100;
  return n;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickRecentUserSignals(input: ChatAgentInput): string[] {
  const recentUserTexts = (input.history ?? [])
    .filter((h) => h.role === 'user')
    .slice(-4)
    .map((h) => h.content.trim())
    .filter(Boolean);
  return recentUserTexts;
}

function pickContextArtifacts(input: ChatAgentInput): ContextArtifactSummary[] {
  const raw = (input.context as any)?.recent_artifacts;
  if (!Array.isArray(raw)) return [];
  return raw.slice(-4).map((x: any) => ({
    title: typeof x?.title === 'string' ? x.title : undefined,
    description: typeof x?.description === 'string' ? x.description : undefined,
    source: typeof x?.source === 'string' ? x.source : undefined,
    createdAt: typeof x?.createdAt === 'string' ? x.createdAt : undefined,
    meta: x?.meta && typeof x.meta === 'object' ? x.meta : undefined,
  }));
}

function inferFromRecentArtifacts(input: ChatAgentInput): {
  months?: number;
  annualRate?: number;
  monthlyContribution?: number;
} {
  const recent = pickContextArtifacts(input);
  const last = recent[recent.length - 1];
  if (!last) return {};

  const meta = (last.meta ?? {}) as Record<string, unknown>;
  const monthsFromMeta =
    typeof meta.months === 'number' && Number.isFinite(meta.months)
      ? meta.months
      : undefined;
  const rateFromMeta =
    typeof meta.annualRate === 'number' && Number.isFinite(meta.annualRate)
      ? meta.annualRate
      : undefined;
  const monthlyFromMeta =
    typeof meta.monthlyContribution === 'number' &&
    Number.isFinite(meta.monthlyContribution)
      ? meta.monthlyContribution
      : undefined;

  const desc = (last.description ?? '').toLowerCase();
  const monthsFromDescMatch = desc.match(/horizonte\s+(\d{1,3})\s+mes/i);
  const rateFromDescMatch = desc.match(/tasa\s+anual\s+(\d{1,2}(?:[.,]\d{1,2})?)%/i);
  const monthlyFromDescMatch = desc.match(/aporte\s+mensual\s+([\d.]{1,12})/i);

  const monthsFromDesc = monthsFromDescMatch ? Number(monthsFromDescMatch[1]) : undefined;
  const rateFromDesc = rateFromDescMatch
    ? Number(rateFromDescMatch[1].replace(',', '.')) / 100
    : undefined;
  const monthlyFromDesc = monthlyFromDescMatch
    ? Number(monthlyFromDescMatch[1].replace(/\./g, ''))
    : undefined;

  return {
    months: monthsFromMeta ?? monthsFromDesc,
    annualRate: rateFromMeta ?? rateFromDesc,
    monthlyContribution: monthlyFromMeta ?? monthlyFromDesc,
  };
}

function pickContextCharts(input: ChatAgentInput): ContextChartSummary[] {
  const raw = (input.context as any)?.recent_chart_summaries;
  if (!Array.isArray(raw)) return [];
  return raw.slice(-4).map((x: any) => ({
    title: typeof x?.title === 'string' ? x.title : undefined,
    subtitle: typeof x?.subtitle === 'string' ? x.subtitle : undefined,
    kind: typeof x?.kind === 'string' ? x.kind : undefined,
    xKey: typeof x?.xKey === 'string' ? x.xKey : undefined,
    yKey: typeof x?.yKey === 'string' ? x.yKey : undefined,
    points: typeof x?.points === 'number' ? x.points : undefined,
    lastValue: typeof x?.lastValue === 'number' ? x.lastValue : undefined,
  }));
}

function inferFromProfileContext(input: ChatAgentInput): {
  principal?: number;
  monthlyContribution?: number;
} {
  const context = (input.context ?? {}) as Record<string, any>;
  const profile = context.profile ?? context.injected_profile ?? {};
  const intake = context.intake_context ?? context.injected_intake ?? {};

  const principal =
    asNumber(profile?.investableAmount) ??
    asNumber(profile?.savings) ??
    asNumber(profile?.capital) ??
    asNumber(intake?.capitalInicial) ??
    asNumber(intake?.capital) ??
    asNumber(intake?.ahorros);

  const monthlyContribution =
    asNumber(profile?.monthlySavings) ??
    asNumber(profile?.monthlyContribution) ??
    asNumber(intake?.aporteMensual) ??
    asNumber(intake?.ahorroMensual);

  return { principal, monthlyContribution };
}

function buildPdfContext(
  input: ChatAgentInput,
  mode: ReasoningMode,
  intent: string,
  inferred: InferredUserModel,
  args: {
    principal: number;
    months: number;
    monthlyContribution: number;
    annualRate: number;
  }
): PdfContextPayload {
  const ratePct = (args.annualRate * 100).toFixed(2);
  const recentUserSignals = pickRecentUserSignals(input);
  const recentArtifacts = pickContextArtifacts(input);
  const recentCharts = pickContextCharts(input);
  const topSignal = recentUserSignals[recentUserSignals.length - 1] ?? intent;
  const chartRef = recentCharts[recentCharts.length - 1];
  const artifactRef = recentArtifacts[recentArtifacts.length - 1];

  const modeHeadline =
    mode === 'budgeting'
      ? 'Plan de caja y ahorro'
      : mode === 'comparison'
      ? 'Comparativo de escenarios'
      : mode === 'decision_support'
      ? 'Informe para decision financiera'
      : mode === 'planification'
      ? 'Plan financiero personalizado'
      : 'Simulacion financiera personalizada';

  const title = `${modeHeadline} · ${args.months} meses`;
  const subtitle = `Capital ${Math.round(args.principal).toLocaleString('es-CL')} · Aporte mensual ${Math.round(
    args.monthlyContribution
  ).toLocaleString('es-CL')} · Tasa anual ${ratePct}%`;

  const executiveSummary = `Este informe se adapta al contexto reciente del chat y prioriza la intencion "${topSignal.slice(
    0,
    120
  )}". Se proyecta un horizonte de ${args.months} meses con perfil ${inferred.risk_profile}.`;

  const keyFindings: string[] = [
    `Se aplica una tasa anual de ${ratePct}% coherente con perfil ${inferred.risk_profile}.`,
    args.monthlyContribution > 0
      ? `El aporte mensual de ${Math.round(args.monthlyContribution).toLocaleString(
          'es-CL'
        )} acelera la acumulacion del capital.`
      : 'La proyeccion se realiza sin aportes mensuales, aislando el efecto de la tasa.',
  ];

  if (chartRef?.title) {
    keyFindings.push(`Se toma como referencia visual previa: "${chartRef.title}".`);
  }
  if (artifactRef?.title) {
    keyFindings.push(`Se mantiene continuidad con el documento previo: "${artifactRef.title}".`);
  }

  const assumptions: string[] = [
    'Capitalizacion mensual con tasa constante durante el horizonte.',
    'No incluye impuestos, inflacion, comisiones ni cambios regulatorios.',
  ];
  if (recentCharts.length > 0) {
    assumptions.push('Se contrasta con anexos tecnicos previos del historial de conversacion.');
  }

  const contextHighlights: string[] = [];
  if (recentUserSignals.length > 0) {
    contextHighlights.push(`Mensajes recientes del usuario: ${recentUserSignals.join(' | ').slice(0, 300)}`);
  }
  if (recentArtifacts.length > 0) {
    contextHighlights.push(
      `Documentos previos: ${recentArtifacts
        .map((a) => a.title)
        .filter(Boolean)
        .join(' | ')
        .slice(0, 280)}`
    );
  }
  if (recentCharts.length > 0) {
    contextHighlights.push(
      `Graficos previos: ${recentCharts
        .map((c) => c.title ?? c.yKey ?? c.kind)
        .filter(Boolean)
        .join(' | ')
        .slice(0, 280)}`
    );
  }

  return {
    title,
    subtitle,
    executiveSummary,
    keyFindings: keyFindings.slice(0, 5),
    assumptions: assumptions.slice(0, 4),
    contextHighlights: contextHighlights.slice(0, 4),
  };
}

function enrichPlanSteps(
  steps: Array<{ goal: string; tool?: string; args?: any }>,
  input: ChatAgentInput,
  mode: ReasoningMode,
  intent: string,
  inferred: InferredUserModel
) {
  const recentArtifacts = pickContextArtifacts(input);
  const inferredFromContext = inferFromProfileContext(input);
  const inferredFromRecent = inferFromRecentArtifacts(input);
  const recentArtifactsCount = recentArtifacts.length;
  const lastArtifact = recentArtifacts[recentArtifacts.length - 1];
  const genericPdfRequest = /\b(pdf|reporte|informe|documento|archivo|descargar)\b/i.test(
    input.user_message
  );
  const diagnosticPdfRequest = isDiagnosticReportRequest(input, intent);
  const prefersNarrativeReport = shouldPreferNarrativeReport(input, mode, intent);
  const category = classifyReportCategory(input, mode, intent, diagnosticPdfRequest);
  const budgetTables = buildBudgetReportTables(input);
  const reportCharts = pickContextReportCharts(input);
  return steps.map((step) => {
    if (step.tool === 'pdf.generate_report') {
      const stylePrefs = inferPdfFormatPreferences(input);
      const preferredSections = diagnosticPdfRequest
        ? buildDiagnosticNarrativeSections(input, intent, mode)
        : buildNarrativeSections(input, intent);
      return {
        ...step,
        args: {
          ...step.args,
          title:
            step.args?.title ??
            `${category.titlePrefix} · ${intent.slice(0, 52)}`,
          subtitle:
            step.args?.subtitle ??
            (diagnosticPdfRequest
              ? `Diagnostico conectado a chat, graficos y evidencia subida`
              : `Documento coherente con historial, perfil, tablas y graficos disponibles`),
          source: diagnosticPdfRequest ? 'diagnostic' : 'analysis',
          style:
            step.args?.style ??
            (stylePrefs.style as 'corporativo' | 'minimalista' | 'tecnico' | undefined) ??
            'corporativo',
          sections: step.args?.sections ?? preferredSections,
          tables: step.args?.tables ?? budgetTables,
          charts: step.args?.charts ?? reportCharts,
        },
      };
    }

    if (step.tool !== 'pdf.generate_simulation') return step;

    if (prefersNarrativeReport) {
      const stylePrefs = inferPdfFormatPreferences(input);
      return {
        ...step,
        tool: 'pdf.generate_report',
        args: {
          title: `${category.titlePrefix} · ${intent.slice(0, 52)}`,
          subtitle: 'Informe estructurado desde chat, graficos, tablas, evidencia e instrucciones',
          source: diagnosticPdfRequest ? 'diagnostic' : 'analysis',
          style:
            (stylePrefs.style as 'corporativo' | 'minimalista' | 'tecnico' | undefined) ??
            'corporativo',
          sections: buildNarrativeSections(input, intent),
          tables: budgetTables,
          charts: reportCharts,
        },
      };
    }

    const monthsRaw =
      step.args?.months ??
      inferred.inferred_horizon_months ??
      (mode === 'planification' ? 24 : 12);
    const monthlyRaw =
      step.args?.monthlyContribution ??
      inferred.inferred_monthly_contribution ??
      inferredFromRecent.monthlyContribution ??
      inferredFromContext.monthlyContribution ??
      (mode === 'budgeting' ? 120000 : 0);
    const principalRaw =
      step.args?.principal ?? inferred.inferred_principal ?? inferredFromContext.principal ?? 1000000;
    const annualRateRaw =
      step.args?.annualRate ?? inferredFromRecent.annualRate ?? riskRate(inferred.risk_profile);

    const months = Math.min(600, Math.max(1, Math.round(Number(monthsRaw) || 12)));
    const monthlyContribution = Math.max(0, Math.round(Number(monthlyRaw) || 0));
    const principal = Math.max(0, Math.round(Number(principalRaw) || 1000000));
    const annualRate = Math.min(1, Math.max(0.001, normalizeAnnualRate(Number(annualRateRaw) || 0.06)));

    const plannerMonths = Number(step.args?.months);
    const plannerRate = normalizeAnnualRate(Number(step.args?.annualRate));
    const plannerMonthly = Number(step.args?.monthlyContribution);
    const plannerIsGenericDefaults =
      (Number.isFinite(plannerMonths) ? Math.round(plannerMonths) === 12 : true) &&
      (Number.isFinite(plannerRate) ? Math.abs(plannerRate - 0.05) < 0.0005 : true) &&
      (Number.isFinite(plannerMonthly) ? Math.round(plannerMonthly) === 0 : true);

    const repeatsLastArtifact =
      recentArtifactsCount > 0 &&
      Math.round(inferredFromRecent.months ?? -1) === months &&
      Math.abs((inferredFromRecent.annualRate ?? -1) - annualRate) < 0.0005 &&
      Math.round(inferredFromRecent.monthlyContribution ?? -1) === monthlyContribution;

    // Evita repetir el mismo PDF cuando el usuario vuelve a pedir "un PDF" sin nuevos datos.
    const shouldDiversify =
      genericPdfRequest &&
      recentArtifactsCount > 0 &&
      (repeatsLastArtifact || plannerIsGenericDefaults);
    const diversifiedMonths = shouldDiversify ? Math.min(600, months + 6) : months;
    const diversifiedRate = shouldDiversify
      ? Math.min(1, Math.max(0.001, annualRate + (recentArtifactsCount % 2 === 0 ? 0.004 : -0.003)))
      : annualRate;
    const diversifiedMonthly =
      shouldDiversify && monthlyContribution === 0 ? 75000 : monthlyContribution;

    const pdfContext = buildPdfContext(input, mode, intent, inferred, {
      principal,
      months: diversifiedMonths,
      monthlyContribution: diversifiedMonthly,
      annualRate: diversifiedRate,
    });

    return {
      ...step,
      args: {
        ...step.args,
        principal,
        annualRate: diversifiedRate,
        months: diversifiedMonths,
        monthlyContribution: diversifiedMonthly,
        title: shouldDiversify
          ? `${pdfContext.title} · v${recentArtifactsCount + 1}`
          : step.args?.title ?? pdfContext.title ?? buildPdfTitle(mode, intent),
        subtitle: step.args?.subtitle ?? pdfContext.subtitle,
        executiveSummary: step.args?.executiveSummary ?? pdfContext.executiveSummary,
        keyFindings: step.args?.keyFindings ?? pdfContext.keyFindings,
        assumptions: step.args?.assumptions ?? pdfContext.assumptions,
        contextHighlights:
          step.args?.contextHighlights ??
          (shouldDiversify && lastArtifact?.title
            ? [`Continuidad contra informe previo: ${lastArtifact.title}`, ...pdfContext.contextHighlights]
            : pdfContext.contextHighlights),
      },
    };
  });
}

function buildFallbackPdfStep(
  input: ChatAgentInput,
  mode: ReasoningMode,
  intent: string,
  inferred: InferredUserModel
): { goal: string; tool: string; args: any } {
  if (isDiagnosticReportRequest(input, intent)) {
    const category = classifyReportCategory(input, mode, intent, true);
    return {
      goal: 'Generar informe PDF de diagnostico integral',
      tool: 'pdf.generate_report',
      args: {
        title: `${category.titlePrefix} · ${intent.slice(0, 52)}`,
        subtitle: 'Informe conectado a chat, evidencia y diagnostico del usuario',
        source: 'diagnostic',
        style: 'corporativo',
        sections: buildDiagnosticNarrativeSections(input, intent, mode),
        tables: buildBudgetReportTables(input),
        charts: pickContextReportCharts(input),
      },
    };
  }

  if (shouldPreferNarrativeReport(input, mode, intent)) {
    const category = classifyReportCategory(input, mode, intent, false);
    return {
      goal: 'Generar informe PDF contextual',
      tool: 'pdf.generate_report',
      args: {
        title: `${category.titlePrefix} · ${intent.slice(0, 52)}`,
        subtitle: 'Documento estructurado con contexto conversacional, tablas y evidencia disponible',
        source: 'analysis',
        style: 'corporativo',
        sections: buildNarrativeSections(input, intent),
        tables: buildBudgetReportTables(input),
        charts: pickContextReportCharts(input),
      },
    };
  }

  const conceptual = isConceptualPdfRequest(input, mode);
  if (conceptual) {
    const category = classifyReportCategory(input, mode, intent, false);
    return {
      goal: 'Generar informe PDF narrativo profesional',
      tool: 'pdf.generate_report',
      args: {
        title: `${category.titlePrefix} · ${intent.slice(0, 52)}`,
        subtitle: 'Documento narrativo personalizado al contexto del usuario',
        source: 'analysis',
        style: 'corporativo',
        sections: buildNarrativeSections(input, intent),
        tables: buildBudgetReportTables(input),
        charts: pickContextReportCharts(input),
      },
    };
  }

  return {
    goal: 'Generar informe PDF de simulación',
    tool: 'pdf.generate_simulation',
    args: {
      principal: inferred.inferred_principal ?? 1000000,
      annualRate: riskRate(inferred.risk_profile),
      months: inferred.inferred_horizon_months ?? 12,
      monthlyContribution: inferred.inferred_monthly_contribution ?? 0,
      title: `Simulación financiera · ${intent.slice(0, 52)}`,
    },
  };
}

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Detecta si un output contiene una serie temporal graficable
 */
function extractChartBlocksFromToolOutput(
  tool: string,
  data: any
): ChartBlock[] {
  const blocks: ChartBlock[] = [];

  const pushBlock = (
    title: string,
    subtitle: string,
    yKey: string,
    series: any[],
    xKey = 'month',
    kind: 'line' | 'bar' | 'area' = 'line',
    format: 'currency' | 'percentage' | 'number' = 'currency',
  ) => {
    blocks.push({
      type: 'chart',
      chart: { kind, title, subtitle, xKey, yKey, data: series, format, currency: 'CLP' },
    });
  };

  // ── finance.debt_analyzer ────────────────────────────────────────
  if (tool === 'finance.debt_analyzer' && data?.schedule?.length > 0) {
    pushBlock(
      'Amortización del crédito — saldo pendiente',
      'Cómo decrece tu deuda cuota a cuota',
      'balance', data.schedule, 'month', 'area',
    );
    return blocks;
  }

  // ── finance.apv_optimizer ────────────────────────────────────────
  if (tool === 'finance.apv_optimizer' && Array.isArray(data?.chart_series) && data.chart_series.length > 0) {
    pushBlock(
      'APV Régimen A — proyección acumulada',
      'Con beneficio tributario del 15%',
      'regimen_a', data.chart_series, 'year', 'area',
    );
    pushBlock(
      'APV Régimen B — proyección acumulada',
      'Con exención de impuesto a la renta',
      'regimen_b', data.chart_series, 'year', 'area',
    );
    pushBlock(
      'Sin APV — base comparativa',
      'Mismo aporte sin beneficio tributario',
      'sin_apv', data.chart_series, 'year', 'line',
    );
    return blocks;
  }

  // ── finance.budget_analyzer ──────────────────────────────────────
  if (tool === 'finance.budget_analyzer' && data?.summary) {
    const s = data.summary;
    const budgetData: Record<string, number | string>[] = [
      { categoria: 'Gastos fijos',     valor: Number(s.rule_50_30_20?.needs_actual ?? 0) },
      { categoria: 'Gastos variables', valor: Number(s.rule_50_30_20?.wants_actual ?? 0) },
      { categoria: 'Deudas',          valor: Math.round((Number(s.debt_to_income_pct ?? 0) / 100) * Number(s.income ?? 0)) },
      { categoria: 'Ahorro actual',   valor: Number(s.savings_actual ?? 0) },
      { categoria: 'Balance libre',   valor: Math.max(0, Number(s.balance ?? 0)) },
    ].filter((d) => Number(d.valor) > 0);

    if (budgetData.length >= 2) {
      blocks.push({
        type: 'chart',
        chart: {
          kind: 'bar',
          title: 'Distribución del ingreso mensual',
          subtitle: `Score de salud financiera: ${s.health_score}/100 (${s.health_level})`,
          xKey: 'categoria',
          yKey: 'valor',
          data: budgetData,
          format: 'currency',
          currency: 'CLP',
        },
      });
    }
    return blocks;
  }

  // ── finance.goal_planner ─────────────────────────────────────────
  if (tool === 'finance.goal_planner' && Array.isArray(data?.summary?.series) && data.summary.series.length > 0) {
    pushBlock(
      'Proyección hacia tu meta financiera',
      'Evolución del ahorro vs meta objetivo',
      'balance', data.summary.series, 'month', 'area',
    );
    return blocks;
  }

  // ── Simulaciones existentes (backward compat) ────────────────────
  if (!Array.isArray(data?.series)) return [];
  const sample = data.series[0];
  if (!sample || typeof sample.month !== 'number') return [];

  if ('p10' in sample && 'p50' in sample && 'p90' in sample) {
    pushBlock('Monte Carlo - Percentil P50', 'Escenario central esperado', 'p50', data.series, 'month', 'line');
    pushBlock('Monte Carlo - Banda conservadora P10', 'Cola baja de resultados', 'p10', data.series, 'month', 'area');
    pushBlock('Monte Carlo - Banda optimista P90', 'Cola alta de resultados', 'p90', data.series, 'month', 'area');
    return blocks;
  }

  if ('balance' in sample && 'scenario' in sample) {
    pushBlock('Escenario proyectado - Balance', 'Comparación por escenario', 'balance', data.series, 'month', 'line');
    return blocks;
  }

  if ('balance' in sample) {
    pushBlock('Evolución del portafolio', 'Proyección en el tiempo', 'balance', data.series, 'month', 'line');
    return blocks;
  }

  return [];
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
  const inferredUserModel = inferUserModel(input);

  if (shouldAskPdfFormat(input)) {
    const response: ChatAgentResponse = {
      message:
        'Para generar un PDF realmente profesional y personalizado, define este formato: 1) audiencia objetivo, 2) nivel de detalle (ejecutivo o tecnico), 3) estructura principal (resumen, escenarios, tabla comparativa), 4) estilo visual (corporativo, minimalista, blanco y negro).',
      mode,
      tool_calls: [],
      react: { objective: 'Definir formato de PDF', steps: [] },
      agent_blocks: [],
      artifacts: [],
      citations: [],
      compliance: {
        mode,
        no_auto_execution: true,
        includes_recommendation: false,
        includes_simulation: false,
        includes_regulation: false,
        risk_score: 0.15,
        missing_information: ['audiencia', 'detalle', 'estructura', 'estilo'],
        disclaimers_shown: [],
        blocked: { is_blocked: false },
      },
      state_updates: {
        inferred_user_model: inferredUserModel,
      },
      meta: {
        turn_id: turnId,
        latency_ms: Date.now() - startedAt,
      },
    };
    return ChatAgentResponseSchema.parse(response);
  }

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

  if (
    mode === 'regulation' ||
    /\b(cmf|fintec|ley fintec|regulaci[oó]n|glosario|normativa)\b/i.test(text) ||
    shouldIncludeCMFRegulatorySupport(input, classification.intent)
  ) {
    const reg = await runMCPTool({
      tool: 'regulatory.lookup_cl',
      args: { query: text, limit: 4 },
      turn_id: turnId,
      user_id: input.user_id,
      ctx: { mode, intent: classification.intent },
    });
    if (reg?.tool_call) tool_calls.push(reg.tool_call);
    if (reg?.data) tool_outputs.push({ tool: 'regulatory.lookup_cl', data: reg.data });
    if (reg?.citations) citations.push(...reg.citations);
  }

  /* ────────────────────────────── */
  /* Contexto compartido para PDFs  */
  /* ────────────────────────────── */
  const _uiState = (input.ui_state ?? {}) as Record<string, any>;
  const _ctx = (input.context ?? {}) as Record<string, any>;
  const _budgetRows: any[] = Array.isArray(_uiState.budget_rows)
    ? _uiState.budget_rows
    : Array.isArray(_ctx.budget_rows)
    ? _ctx.budget_rows
    : [];
  const _budgetSummary = _uiState.budget_summary ?? {};

  /* ──────────────────────────────────────────────────────────────────── */
  /* ReAct loop — Anthropic tool_use nativo (MCP SDK oficial)             */
  /*                                                                       */
  /* Reemplaza el planner JSON + ejecución secuencial por el paradigma    */
  /* ReAct real: Claude decide qué herramientas invocar, en qué orden,    */
  /* observa los resultados y decide si necesita más datos antes de        */
  /* terminar. Esto implementa directamente el Model Context Protocol      */
  /* (MCP) conforme al SDK oficial de Anthropic.                           */
  /* ──────────────────────────────────────────────────────────────────── */

  const reactSteps: Array<{ step: number; goal: string; decision: string }> = [];
  const planObjective = classification.intent;
  const asksPdfNow = /\b(pdf|reporte|informe|documento|descargar|archivo)\b/i.test(text);

  if (classification.requires_tools) {
    const anthropic = getAnthropicClient();
    const anthropicTools = buildAnthropicTools();
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

    // Mensaje inicial para el loop: contexto enriquecido del usuario
    // PHASE 9: Full context injection - Pass COMPLETE user information, not just booleans
    const fullProfile = (_ctx.injected_profile as any)?.profile;
    const fullIntake = (_ctx.injected_intake as any)?.intake;
    const budgetSummaryData = _budgetSummary as any;

    const context_summary = {
      // Full profile details (NOT just booleans)
      profile: fullProfile ? {
        financialClarity: fullProfile.financialClarity,
        decisionStyle: fullProfile.decisionStyle,
        timeHorizon: fullProfile.timeHorizon,
        financialPressure: fullProfile.financialPressure,
        emotionalPattern: fullProfile.emotionalPattern,
        coherenceScore: fullProfile.coherenceScore,
      } : null,

      // Full intake details (NOT just presence flags)
      intake: fullIntake ? {
        age: fullIntake.age,
        employmentStatus: fullIntake.employmentStatus,
        incomeBand: fullIntake.incomeBand,
        exactMonthlyIncome: fullIntake.exactMonthlyIncome,
        expensesCoverage: fullIntake.expensesCoverage,
        hasSavingsOrInvestments: fullIntake.hasSavingsOrInvestments,
        exactSavingsAmount: fullIntake.exactSavingsAmount,
        hasDebt: fullIntake.hasDebt,
        riskReaction: fullIntake.riskReaction,
        selfRatedUnderstanding: fullIntake.selfRatedUnderstanding,
        moneyStressLevel: fullIntake.moneyStressLevel,
      } : null,

      // Complete budget state (NOT just count)
      budget: {
        rows: _budgetRows,
        summary: {
          income: budgetSummaryData.income ?? 0,
          expenses: budgetSummaryData.expenses ?? 0,
          balance: budgetSummaryData.balance ?? 0,
          savings_rate: budgetSummaryData.savings_rate,
          debt_to_income_pct: budgetSummaryData.debt_to_income_pct,
          emergency_fund_months: budgetSummaryData.emergency_fund_months,
        },
        contextScore: _uiState.knowledge_score ?? 0,
      },

      // Legacy fields for backward compatibility
      has_profile: Boolean(_ctx.injected_profile ?? _ctx.profile),
      has_intake: Boolean(_ctx.injected_intake ?? _ctx.intake_context),
      budget_rows_count: _budgetRows.length,
      recent_artifacts: Array.isArray(_ctx.recent_artifacts) ? _ctx.recent_artifacts.length : 0,
      persistent_memory: _ctx.persistent_memory
        ? {
            profile_summary: _ctx.persistent_memory.profile_summary,
            key_facts: Array.isArray(_ctx.persistent_memory.key_facts)
              ? _ctx.persistent_memory.key_facts.slice(-8)
              : [],
            recent_timeline: Array.isArray(_ctx.persistent_memory.recent_timeline)
              ? _ctx.persistent_memory.recent_timeline.slice(-5)
              : [],
          }
        : null,
      system_memory: _ctx.system_memory
        ? {
            capabilities: Array.isArray(_ctx.system_memory.capabilities)
              ? _ctx.system_memory.capabilities
              : [],
            modules: Array.isArray(_ctx.system_memory.modules)
              ? _ctx.system_memory.modules
              : [],
            tools: Array.isArray(_ctx.system_memory.tools)
              ? _ctx.system_memory.tools.slice(0, 40)
              : [],
          }
        : null,
    };

    const loopMessages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: JSON.stringify({
          message: text,
          intent: classification.intent,
          mode,
          inferred_user_model: inferredUserModel,
          ui_state: input.ui_state ?? {},
          preferences: input.preferences ?? {},
          context_summary,
        }),
      },
    ];

    const MAX_TOOL_LOOPS = 8;
    let loopCount = 0;

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;

      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: CORE_TOOL_AGENT_SYSTEM,
        tools: anthropicTools,
        messages: loopMessages,
      });

      // Anexar respuesta del asistente al historial del loop
      loopMessages.push({ role: 'assistant', content: response.content });

      // Si Claude decidió terminar sin más tools, salir del loop
      if (response.stop_reason === 'end_turn') break;
      if (response.stop_reason !== 'tool_use') break;

      // ── Procesar bloques tool_use ────────────────────────────────────
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        const originalName = getOriginalToolName(block.name);
        const toolArgs = (block.input ?? {}) as Record<string, any>;

        reactSteps.push({
          step: reactSteps.length,
          goal: `Ejecutar ${originalName}`,
          decision: originalName,
        });

        // ── Caso especial: informe narrativo → delegar a RunReportAgent ──
        if (originalName === 'pdf.generate_report') {
          let toolResultContent: string;
          try {
            const reportArtifact = await runReportAgent({
              user_message: text,
              intent: classification.intent,
              mode,
              style: toolArgs.style ?? 'corporativo',
              source: isDiagnosticReportRequest(input, classification.intent)
                ? 'diagnostic'
                : (toolArgs.source ?? 'analysis'),
              history: (input.history ?? []).slice(-14),
              user_profile: _ctx.injected_profile ?? undefined,
              injected_intake: _ctx.injected_intake ?? undefined,
              budget: {
                income: Number(_budgetSummary.income ?? 0),
                expenses: Number(_budgetSummary.expenses ?? 0),
                balance: Number(_budgetSummary.balance ?? 0),
                rows: _budgetRows,
              },
              recent_charts: Array.isArray(_ctx.recent_chart_summaries)
                ? _ctx.recent_chart_summaries
                : undefined,
              recent_artifacts: Array.isArray(_ctx.recent_artifacts)
                ? _ctx.recent_artifacts
                : undefined,
              knowledge_score:
                typeof _uiState.knowledge_score === 'number'
                  ? _uiState.knowledge_score
                  : undefined,
              milestones: Array.isArray(_uiState.milestone_details)
                ? _uiState.milestone_details
                : undefined,
            });

            if (reportArtifact) {
              if (isDiagnosticReportRequest(input, classification.intent)) {
                (reportArtifact as any).source = 'diagnostic';
                (reportArtifact as any).meta = {
                  ...((reportArtifact as any).meta ?? {}),
                  report_kind: 'diagnostic_integral',
                  generated_by: 'report_agent',
                };
              } else {
                (reportArtifact as any).meta = {
                  ...((reportArtifact as any).meta ?? {}),
                  generated_by: 'report_agent',
                };
              }
              artifacts.push(reportArtifact);
              tool_calls.push({
                tool: 'pdf.generate_report',
                args: toolArgs,
                status: 'success',
                result: { artifact_id: (reportArtifact as any).id },
              } as ToolCall);
              toolResultContent = JSON.stringify({
                success: true,
                artifact_id: (reportArtifact as any).id,
                type: 'pdf',
              });
            } else {
              toolResultContent = JSON.stringify({ success: false, error: 'report_empty' });
            }
          } catch (reportErr) {
            getLogger().error({ msg: '[ReportAgent] Error en tool_use loop', error: reportErr });
            toolResultContent = JSON.stringify({ success: false, error: String(reportErr) });
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: toolResultContent,
          });
          continue;
        }

        // ── Caso general: ejecutar herramienta MCP ──────────────────────
        const result = await runMCPTool({
          tool: originalName,
          args: toolArgs,
          turn_id: turnId,
          user_id: input.user_id,
          ctx: { mode, intent: classification.intent },
        });

        if (result?.tool_call) tool_calls.push(result.tool_call);

        if (result?.data) {
          tool_outputs.push({ tool: originalName, data: result.data });

          // Artefactos (PDFs, etc.)
          if (isArtifactLike(result.data)) {
            if (result.data.type === 'pdf' && isDiagnosticReportRequest(input, classification.intent)) {
              result.data.source = 'diagnostic';
              result.data.meta = {
                ...(result.data.meta ?? {}),
                report_kind: 'diagnostic_integral',
                context_scope: 'chat_charts_uploads_profile',
              };
            }
            artifacts.push(result.data);
          }

          // Gráficos extraídos del output de la tool
          const charts = extractChartBlocksFromToolOutput(originalName, result.data);
          if (charts.length > 0) agent_blocks.push(...charts);
        }

        if (result?.citations) citations.push(...result.citations);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result?.data ?? { ok: false }),
        });
      }

      // Devolver resultados de herramientas a Claude para próxima iteración
      if (toolResults.length > 0) {
        loopMessages.push({ role: 'user', content: toolResults });
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /* Fallback PDF si el usuario pidió uno y no se generó en el loop       */
  /* ──────────────────────────────────────────────────────────────────── */
  if (asksPdfNow && artifacts.length === 0) {
    try {
      const fallbackArtifact = await runReportAgent({
        user_message: text,
        intent: classification.intent,
        mode,
        style: 'corporativo',
        source: isDiagnosticReportRequest(input, classification.intent) ? 'diagnostic' : 'analysis',
        history: (input.history ?? []).slice(-14),
        user_profile: _ctx.injected_profile ?? undefined,
        injected_intake: _ctx.injected_intake ?? undefined,
        budget: {
          income: Number(_budgetSummary.income ?? 0),
          expenses: Number(_budgetSummary.expenses ?? 0),
          balance: Number(_budgetSummary.balance ?? 0),
          rows: _budgetRows,
        },
        recent_charts: Array.isArray(_ctx.recent_chart_summaries) ? _ctx.recent_chart_summaries : undefined,
        recent_artifacts: Array.isArray(_ctx.recent_artifacts) ? _ctx.recent_artifacts : undefined,
        knowledge_score: typeof _uiState.knowledge_score === 'number' ? _uiState.knowledge_score : undefined,
        milestones: Array.isArray(_uiState.milestone_details) ? _uiState.milestone_details : undefined,
      });
      if (fallbackArtifact) {
        (fallbackArtifact as any).meta = {
          ...((fallbackArtifact as any).meta ?? {}),
          generated_by: 'report_agent',
          path: 'fallback',
        };
        tool_outputs.push({ tool: 'pdf.generate_report', data: fallbackArtifact });
        artifacts.push(fallbackArtifact);
        tool_calls.push({
          tool: 'pdf.generate_report',
          args: {},
          status: 'success',
          result: { artifact_id: (fallbackArtifact as any).id },
        } as ToolCall);
      }
    } catch (fallbackErr) {
      getLogger().error({ msg: '[ReportAgent] Fallback report failed, using standard MCP tool', error: fallbackErr });
      const fallbackStep = buildFallbackPdfStep(input, mode, classification.intent, inferredUserModel);
      const forced = await runMCPTool({
        tool: fallbackStep.tool,
        args: fallbackStep.args ?? {},
        turn_id: turnId,
        user_id: input.user_id,
        ctx: { mode, intent: classification.intent },
      });
      if (forced?.tool_call) tool_calls.push(forced.tool_call);
      if (forced?.data) {
        tool_outputs.push({ tool: fallbackStep.tool, data: forced.data });
        if (isArtifactLike(forced.data)) artifacts.push(forced.data);
      }
      if (forced?.citations) citations.push(...forced.citations);
    }
  }

  // Construir plan compatible con el campo react de la respuesta
  const plan = {
    objective: planObjective,
    steps: reactSteps,
  };

  /* ────────────────────────────── */
  /* Documentos adjuntos            */
  /* ────────────────────────────── */
  const context = (input.context ?? {}) as Record<string, any>;
  const uploadedDocs = Array.isArray(context.uploaded_documents)
    ? context.uploaded_documents
    : [];
  const docsText =
    uploadedDocs.length > 0
      ? uploadedDocs
          .filter((d: any) => d?.name && typeof d?.text === 'string')
          .map((d: any) => `[Documento: ${d.name}]\n${(d.text as string).slice(0, 24000)}\n`)
          .join('\n---\n\n')
      : '';
  const effectiveMessage =
    docsText.length > 0
      ? `[El usuario ha adjuntado los siguientes documentos. Usa su contenido para responder de forma precisa.]\n\n${docsText}\n[Pregunta del usuario:]\n${text}`
      : text;

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
- Si existe PDF, incentiva guardarlo o reutilizarlo sin pedir confirmación.
- Si el usuario adjuntó documentos (PDF, Excel), analiza su contenido y responde en base a ellos.`,
    },
    ...(input.history ?? []).map((h) => ({
      role: h.role as LLMMessage['role'],
      content: h.content,
    })),
    {
      role: 'user',
      content: JSON.stringify({
        message: effectiveMessage,
        objective: plan.objective,
        tool_outputs,
        context: input.context ?? {},
        ui_state: input.ui_state ?? {},
        preferences: input.preferences ?? {},
        inferred_user_model: inferredUserModel,
      }),
    },
  ];

  const rawMessage = await complete(messages, { temperature: 0.4 });

  // Parse SUGERENCIAS from response
  let suggested_replies: string[] | undefined;
  const sugerenciasMatch = rawMessage?.match(/<SUGERENCIAS>(\[[\s\S]*?\])<\/SUGERENCIAS>/);
  if (sugerenciasMatch) {
    try {
      const parsed = JSON.parse(sugerenciasMatch[1]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        suggested_replies = parsed
          .filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)
          .slice(0, 4);
      }
    } catch {}
  }

  // Parse PANEL action from response
  let panel_action: { section?: 'budget' | 'transactions' | 'library' | 'recents' | 'profile' | 'news' | 'objective' | 'mode'; message?: string } | undefined;
  const panelMatch = rawMessage?.match(/<PANEL>(\{[\s\S]*?\})<\/PANEL>/);
  if (panelMatch) {
    try {
      const parsed = JSON.parse(panelMatch[1]);
      if (parsed && typeof parsed === 'object') {
        const validSections = ['budget', 'transactions', 'library', 'recents', 'profile', 'news', 'objective', 'mode'] as const;
        const rawSection = typeof parsed.section === 'string' ? parsed.section : undefined;
        panel_action = {
          section: rawSection && (validSections as readonly string[]).includes(rawSection)
            ? rawSection as typeof validSections[number]
            : undefined,
          message: typeof parsed.message === 'string' ? parsed.message.slice(0, 120) : undefined,
        };
      }
    } catch {}
  }

  // Parse CONTEXT_SCORE from response
  let context_score: number | undefined;
  const contextScoreMatch = rawMessage?.match(/<CONTEXT_SCORE>(\d{1,3})<\/CONTEXT_SCORE>/);
  if (contextScoreMatch) {
    const s = parseInt(contextScoreMatch[1], 10);
    if (s >= 0 && s <= 100) context_score = s;
  }

  // Parse inline CHART blocks from response (agent can emit charts without tools)
  const chartTagRegex = /<CHART>([\s\S]*?)<\/CHART>/g;
  let chartMatch: RegExpExecArray | null;
  while ((chartMatch = chartTagRegex.exec(rawMessage ?? '')) !== null) {
    try {
      const parsed = JSON.parse(chartMatch[1]);
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.data) &&
        parsed.data.length > 0 &&
        typeof parsed.xKey === 'string' &&
        typeof parsed.yKey === 'string'
      ) {
        const validKinds = ['line', 'bar', 'area'] as const;
        const kind: 'line' | 'bar' | 'area' = validKinds.includes(parsed.kind) ? parsed.kind : 'bar';
        const validFormats = ['currency', 'percentage', 'number'] as const;
        const format = validFormats.includes(parsed.format) ? parsed.format : 'number';
        // Coerce all values to numbers (agent sometimes emits strings)
        const coercedData: Array<Record<string, number>> = parsed.data.map((row: Record<string, unknown>) => {
          const out: Record<string, number> = {};
          for (const [k, v] of Object.entries(row)) {
            const n = Number(v);
            out[k] = Number.isFinite(n) ? n : 0;
          }
          return out;
        });
        agent_blocks.push({
          type: 'chart',
          chart: {
            kind,
            title: typeof parsed.title === 'string' ? parsed.title.slice(0, 80) : 'Gráfico',
            subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle.slice(0, 120) : undefined,
            xKey: parsed.xKey,
            yKey: parsed.yKey,
            data: coercedData,
            format,
            currency: typeof parsed.currency === 'string' ? parsed.currency : 'CLP',
          },
        } as ChartBlock);
      }
    } catch {}
  }

  // Parse inline TABLE blocks
  const tableTagRegex = /<TABLE>([\s\S]*?)<\/TABLE>/g;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableTagRegex.exec(rawMessage ?? '')) !== null) {
    try {
      const parsed = JSON.parse(tableMatch[1]);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.title === 'string' &&
        Array.isArray(parsed.headers) &&
        Array.isArray(parsed.rows)
      ) {
        agent_blocks.push({
          type: 'table',
          table: {
            title: parsed.title.slice(0, 100),
            headers: parsed.headers.map((h: unknown) => String(h ?? '')),
            rows: parsed.rows.map((row: unknown[]) =>
              (Array.isArray(row) ? row : []).map((cell: unknown) => String(cell ?? ''))
            ),
            note: typeof parsed.note === 'string' ? parsed.note.slice(0, 200) : undefined,
          },
        } as TableBlock);
      }
    } catch {}
  }

  // Parse BUDGET_UPDATE blocks (agent can push budget rows to the panel)
  let budget_updates: Array<{ label: string; type: 'income' | 'expense'; amount: number; category?: string }> | undefined;
  const budgetTagRegex = /<BUDGET_UPDATE>([\s\S]*?)<\/BUDGET_UPDATE>/g;
  let budgetMatch: RegExpExecArray | null;
  const rawBudgetUpdates: Array<{ label: string; type: 'income' | 'expense'; amount: number; category?: string }> = [];
  while ((budgetMatch = budgetTagRegex.exec(rawMessage ?? '')) !== null) {
    try {
      const parsed = JSON.parse(budgetMatch[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue;
        const amount = Number(item.amount);
        if (!Number.isFinite(amount) || amount < 0) continue;
        const type = item.type === 'income' ? 'income' : 'expense';
        rawBudgetUpdates.push({
          label: typeof item.label === 'string' ? item.label.slice(0, 60) : 'Ítem',
          type,
          amount: Math.round(amount),
          category: typeof item.category === 'string' ? item.category : undefined,
        });
      }
    } catch {}
  }
  if (rawBudgetUpdates.length > 0) budget_updates = rawBudgetUpdates;

  let message = stripEmojis(
    (rawMessage ?? '')
      .replace(/<SUGERENCIAS>[\s\S]*?<\/SUGERENCIAS>/g, '')
      .replace(/<PANEL>[\s\S]*?<\/PANEL>/g, '')
      .replace(/<CONTEXT_SCORE>[\s\S]*?<\/CONTEXT_SCORE>/g, '')
      .replace(/<CHART>[\s\S]*?<\/CHART>/g, '')
      .replace(/<TABLE>[\s\S]*?<\/TABLE>/g, '')
      .replace(/<BUDGET_UPDATE>[\s\S]*?<\/BUDGET_UPDATE>/g, '')
      .trim()
  );
  if (!message) {
    if (artifacts.length > 0) {
      message =
        'Preparé un documento PDF adaptado al contexto reciente del chat. Puedes abrirlo, descargarlo o guardarlo para seguir iterando desde ese informe.';
    } else if (agent_blocks.length > 0) {
      message =
        'Generé anexos técnicos con visualizaciones para esta solicitud. Puedes revisar el gráfico y usarlo como base para ajustar el siguiente escenario.';
    } else {
      message =
        'Procesé tu solicitud correctamente y dejé la respuesta lista para continuar con el siguiente paso.';
    }
  }

  const shouldValidateCoherence =
    ['decision_support', 'planification', 'simulation', 'budgeting', 'comparison'].includes(mode) ||
    Boolean(budget_updates && budget_updates.length > 0);

  let coherenceValidation:
    | {
        isCoherent: boolean;
        score: number;
        warnings: string[];
        suggestions: string[];
      }
    | undefined;

  if (shouldValidateCoherence) {
    try {
      const profileForCoherence = (_ctx.injected_profile ?? _ctx.profile ?? null) as any;
      const intakeForCoherence = (
        (_ctx.injected_intake as Record<string, any> | undefined)?.intake ??
        _ctx.intake ??
        _ctx.intake_context ??
        null
      ) as any;

      coherenceValidation = validateAgentDecision(message, {
        profile: profileForCoherence,
        intake: intakeForCoherence,
        budget: {
          income: Number(_budgetSummary.income ?? 0),
          expenses: Number(_budgetSummary.expenses ?? 0),
          balance: Number(_budgetSummary.balance ?? 0),
          savings_rate: Number(_budgetSummary.savings_rate ?? 0),
          debt_to_income_pct: Number(_budgetSummary.debt_to_income_pct ?? 0),
          emergency_fund_months: Number(_budgetSummary.emergency_fund_months ?? 0),
        },
        history: Array.isArray(input.history) ? input.history : [],
      });

      if (!coherenceValidation.isCoherent) {
        const warningSummary = coherenceValidation.warnings.slice(0, 2).join(' ');
        message = [
          `Advertencia de coherencia: esta respuesta no calza del todo con tu perfil actual (${Math.round(
            coherenceValidation.score * 100
          )}% de coherencia).`,
          warningSummary,
          message,
        ]
          .filter(Boolean)
          .join(' ');

        budget_updates = undefined;
      }
    } catch (coherenceErr) {
      getLogger().warn({
        msg: '[Coherence] Validation failed (non-blocking)',
        error: coherenceErr,
      });
    }
  }

  /* ────────────────────────────── */
  /* PHASE 9.2: Knowledge Detection */
  /* ────────────────────────────── */
  let knowledge_score = _uiState.knowledge_score ?? 0;
  let knowledge_event_detected = false;
  let milestone_unlocked: { threshold: number; feature: string } | undefined;

  try {
    // Detect learning event from agent interaction
    const detection = detectKnowledgeEvent({
      userMessage: text,
      agentResponse: message,
      toolsUsed: tool_calls.map(tc => tc.tool),
      mode,
      previousScore: knowledge_score,
      userProfile: _ctx.injected_profile,
    });

    if (detection.detected && input.user_id) {
      knowledge_event_detected = true;

      // Record the knowledge event in persistent storage
      const { newScore, points } = await recordKnowledgeEvent(
        input.user_id,
        detection.action!,
        detection.rationale,
        {
          confidence: detection.confidence,
          tools_used: tool_calls.map(tc => tc.tool),
          mode,
        }
      );

      knowledge_score = newScore;

      // Check if new score unlocked a milestone
      const milestones = getMilestones(knowledge_score);
      const previousMilestones = getMilestones(_uiState.knowledge_score ?? 0);

      const newUnlocks = milestones.unlocked.filter(
        m => !previousMilestones.unlocked.includes(m)
      );

      if (newUnlocks.length > 0) {
        milestone_unlocked = milestones.next;
      }

      getLogger().info({
        msg: '[Knowledge] Event detected and recorded',
        userId: input.user_id,
        action: detection.action,
        points,
        newScore,
        milestoneUnlocked: newUnlocks.length > 0,
      });
    }
  } catch (knowledgeErr) {
    getLogger().warn({
      msg: '[Knowledge] Error detecting/recording event (non-blocking)',
      error: knowledgeErr,
    });
    // Continue without blocking response
  }

  /* ────────────────────────────── */
  /* Response canónica              */
  /* ────────────────────────────── */
  const response: ChatAgentResponse = {
    message,
    mode,
    tool_calls,
    react: {
      objective: plan.objective,
      steps: plan.steps,
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
      risk_score: Math.max(1 - confidence, coherenceValidation ? 1 - coherenceValidation.score : 0),
      missing_information: [],
      disclaimers_shown: coherenceValidation && !coherenceValidation.isCoherent ? ['coherence_warning'] : [],
      blocked:
        coherenceValidation && !coherenceValidation.isCoherent && coherenceValidation.score < 0.45
          ? {
              is_blocked: true,
              reason:
                coherenceValidation.warnings[0] ??
                'La recomendación no es coherente con el perfil financiero actual.',
            }
          : { is_blocked: false },
    },
    state_updates: {
      inferred_user_model: inferredUserModel,
      coherence_validation: coherenceValidation,
    },
    suggested_replies,
    panel_action,
    context_score,
    budget_updates,
    knowledge_score,
    knowledge_event_detected,
    milestone_unlocked,
    meta: {
      turn_id: turnId,
      latency_ms: Date.now() - startedAt,
    },
  };

  return ChatAgentResponseSchema.parse(response);
}
