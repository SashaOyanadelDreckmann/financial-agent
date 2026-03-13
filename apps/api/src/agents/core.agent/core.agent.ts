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

function buildNarrativeSections(input: ChatAgentInput, intent: string): Array<{ heading: string; body: string }> {
  const recentUserSignals = pickRecentUserSignals(input);
  const profile = ((input.context ?? {}) as any)?.profile ?? ((input.context ?? {}) as any)?.injected_profile;
  const profileSummary = profile
    ? `Contexto de usuario disponible para personalizar el informe sin asumir datos no declarados.`
    : 'No hay perfil completo; se usa un enfoque pedagógico y accionable.';

  return [
    {
      heading: 'Contexto',
      body: `Objetivo solicitado: ${intent}. ${profileSummary}`,
    },
    {
      heading: 'Explicación clave',
      body:
        recentUserSignals.length > 0
          ? `Se priorizan estas señales del chat: ${recentUserSignals.join(' | ')}.`
          : 'Se explica el concepto principal de forma ordenada y con foco práctico.',
    },
    {
      heading: 'Aplicación práctica',
      body:
        'Se incluyen ejemplos aplicados a decisiones financieras reales y próximos pasos para profundizar análisis.',
    },
    {
      heading: 'Fuentes y marco regulatorio',
      body:
        'Se integra referencia regulatoria cuando corresponda (CMF y Ley Fintec), diferenciando hechos de interpretación.',
    },
  ];
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
  const asksPdf = /\b(pdf|reporte|informe|documento|descargar|archivo)\b/i.test(input.user_message);
  if (!asksPdf) return false;
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
  return steps.map((step) => {
    if (step.tool === 'pdf.generate_report') {
      const stylePrefs = inferPdfFormatPreferences(input);
      return {
        ...step,
        args: {
          ...step.args,
          title: step.args?.title ?? `Informe profesional · ${intent.slice(0, 58)}`,
          subtitle:
            step.args?.subtitle ??
            `Documento coherente con historial, perfil y objetivo del usuario`,
          style:
            step.args?.style ??
            (stylePrefs.style as 'corporativo' | 'minimalista' | 'tecnico' | undefined) ??
            'corporativo',
          sections: step.args?.sections ?? buildNarrativeSections(input, intent),
        },
      };
    }

    if (step.tool !== 'pdf.generate_simulation') return step;

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
  const conceptual = isConceptualPdfRequest(input, mode);
  if (conceptual) {
    return {
      goal: 'Generar informe PDF narrativo profesional',
      tool: 'pdf.generate_report',
      args: {
        title: `Informe profesional · ${intent.slice(0, 58)}`,
        subtitle: 'Documento narrativo personalizado al contexto del usuario',
        style: 'corporativo',
        sections: buildNarrativeSections(input, intent),
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
  if (!data || !Array.isArray(data.series)) return [];

  // Heurística mínima: series con month + balance / p50
  const sample = data.series[0];
  if (!sample || typeof sample.month !== 'number') return [];

  const blocks: ChartBlock[] = [];
  const pushBlock = (title: string, subtitle: string, yKey: string, kind: 'line' | 'bar' | 'area' = 'line') => {
    blocks.push({
      type: 'chart',
      chart: {
        kind,
        title,
        subtitle,
        xKey: 'month',
        yKey,
        data: data.series,
        format: 'currency',
        currency: 'CLP',
      },
    });
  };

  if ('p10' in sample && 'p50' in sample && 'p90' in sample) {
    pushBlock('Monte Carlo - Percentil P50', 'Escenario central esperado', 'p50', 'line');
    pushBlock('Monte Carlo - Banda conservadora P10', 'Cola baja de resultados', 'p10', 'area');
    pushBlock('Monte Carlo - Banda optimista P90', 'Cola alta de resultados', 'p90', 'area');
    return blocks;
  }

  if ('balance' in sample && 'scenario' in sample) {
    pushBlock('Escenario proyectado - Balance', 'Comparación por escenario', 'balance', 'line');
    return blocks;
  }

  if ('balance' in sample) {
    pushBlock('Evolución del portafolio', 'Proyección en el tiempo', 'balance', 'line');
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

  if (mode === 'regulation' || /\b(cmf|fintec|ley fintec|regulaci[oó]n)\b/i.test(text)) {
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
          inferred_user_model: inferredUserModel,
          ui_state: input.ui_state ?? {},
          preferences: input.preferences ?? {},
        }),
      })
    : { objective: 'respond', steps: [] };

  if (isConceptualPdfRequest(input, mode)) {
    plan.steps = plan.steps.map((s) =>
      s.tool === 'pdf.generate_simulation'
        ? {
            ...s,
            tool: 'pdf.generate_report',
            args: {
              title: `Informe profesional · ${classification.intent.slice(0, 58)}`,
              subtitle: 'Documento narrativo personalizado al contexto del usuario',
              style: 'corporativo',
              sections: buildNarrativeSections(input, classification.intent),
            },
          }
        : s
    );
  }

  const asksPdfNow = /\b(pdf|reporte|informe|documento|descargar|archivo)\b/i.test(text);
  const hasPdfStep = plan.steps.some(
    (s) => s.tool === 'pdf.generate_simulation' || s.tool === 'pdf.generate_report'
  );
  if (asksPdfNow && !hasPdfStep) {
    plan.steps.push(buildFallbackPdfStep(input, mode, classification.intent, inferredUserModel));
  }

  plan.steps = enrichPlanSteps(
    plan.steps,
    input,
    mode,
    classification.intent,
    inferredUserModel
  );

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
      const charts = extractChartBlocksFromToolOutput(step.tool, result.data);
      if (Array.isArray(charts) && charts.length > 0) {
        agent_blocks.push(...charts);
      }
    }

    if (result.citations) citations.push(...result.citations);
  }

  if (asksPdfNow && artifacts.length === 0) {
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
- Si existe PDF, incentiva guardarlo o reutilizarlo sin pedir confirmación.`,
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
        context: input.context ?? {},
        ui_state: input.ui_state ?? {},
        preferences: input.preferences ?? {},
        inferred_user_model: inferredUserModel,
      }),
    },
  ];

  const rawMessage = await complete(messages, { temperature: 0.4 });
  let message = stripEmojis(rawMessage ?? '');
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
