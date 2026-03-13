'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getSessionId } from '@/lib/session';
import { sendToAgent } from '@/lib/agent';
import { useProfileStore } from '@/state/profile.store';
import {
  getSessionInfo,
  removeInjectedIntake,
  removeInjectedProfile,
} from '@/lib/api';

import PanelCard from '../../components/PanelCard';
import ProfileCard from '../../components/ProfileCard';

import type {
  AgentBlock,
  AgentResponse,
  ChatItem,
} from '@/lib/agent.response.types';
import { toChatItemsFromAgentResponse } from '@/lib/agent.response.types';
import { DocumentBubble } from '@/components/conversation/DocumentBubble';
import { AgentBlocksRenderer } from '@/components/agent/AgentBlocksRenderer';
import { CitationBubble } from '@/components/conversation/CitationBubble';

type AgentMeta = {
  objective?: string;
  mode?: string;
};

type ReportGroup = 'plan_action' | 'simulation' | 'budget' | 'diagnosis' | 'other';

type SavedReport = {
  id: string;
  title: string;
  group: ReportGroup;
  fileUrl: string;
  createdAt: string;
};

type BudgetRow = {
  id: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  note: string;
};

type BankSimulation = {
  username: string;
  password: string;
  connected: boolean;
  randomMode: boolean;
  uploadedFiles: string[];
};

type DocFlight = {
  id: string;
  label: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  running: boolean;
};

type ChatThread = {
  id: string;
  label: string;
  name: string;
  autoNamed: boolean;
  items: ChatItem[];
  draft: string;
};

const CHAT_GAME_INSTRUCTION =
  'Para aprovechar al maximo este juego: 1) define un objetivo financiero concreto, 2) usa los 3 chats en paralelo para explorar escenarios, 3) pide primero grafico o simulacion y luego informe PDF, 4) guarda documentos clave para compararlos, 5) ajusta riesgo, plazo y aporte en cada iteracion para subir tu nivel de conocimiento.';

export default function AgentPage() {
  const router = useRouter();

  function buildContextualChatName(items: ChatItem[]): string {
    const userTexts = items
      .filter((it) => it.type === 'message' && it.role === 'user')
      .map((it) => (it as Extract<ChatItem, { type: 'message'; role: 'user' }>).content.toLowerCase())
      .slice(-8);

    const full = userTexts.join(' ');
    if (/(presupuesto|gasto|ingreso|deuda|balance|flujo)/i.test(full)) return 'Presupuesto y flujo';
    if (/(simul|escenario|rentabilidad|proyecci|retorno|aport)/i.test(full)) return 'Simulacion y escenarios';
    if (/(riesgo|volatil|drawdown|perdida|stress)/i.test(full)) return 'Riesgo y control';
    if (/(cmf|fintec|ley|regulaci|norma|compliance)/i.test(full)) return 'Marco regulatorio';
    if (/(pdf|informe|reporte|documento)/i.test(full)) return 'Informes y reportes';
    if (/(portafolio|cartera|acciones|fondos|etf|bonos)/i.test(full)) return 'Portafolio e inversion';
    if (/(ahorro|meta|objetivo|plan|plazo)/i.test(full)) return 'Plan financiero';
    return 'Analisis financiero';
  }

  function docVisualOffset(id: string, index: number) {
    let hash = 0;
    const seed = `${id}:${index}`;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    // Rotaciones y desplazamientos leves, controlados para mantener orden.
    const rotation = ((hash % 31) - 15) / 10; // -1.5deg .. +1.5deg
    const yShift = ((hash >> 4) % 5) - 2; // -2px .. +2px
    return { rotation, yShift };
  }

  function classifyReportGroup(title: string, source?: string): ReportGroup {
    const t = (title || '').toLowerCase();
    const s = (source || '').toLowerCase();
    if (t.includes('plan') || t.includes('accion')) return 'plan_action';
    if (t.includes('simul') || s.includes('simulation')) return 'simulation';
    if (t.includes('presupuesto') || t.includes('budget')) return 'budget';
    if (t.includes('diagnos') || t.includes('perfil')) return 'diagnosis';
    return 'other';
  }

  function randomBankCredential(prefix: 'usr' | 'pwd') {
    const seed = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${seed}`;
  }

  const [chatThreads, setChatThreads] = useState<ChatThread[]>([
    {
      id: 'chat-1',
      label: '1',
      name: 'Plan financiero',
      autoNamed: false,
      items: [
        {
          type: 'message',
          role: 'assistant',
          content: CHAT_GAME_INSTRUCTION,
          mode: 'information',
        },
      ],
      draft: '',
    },
    {
      id: 'chat-2',
      label: '2',
      name: 'Escenarios',
      autoNamed: false,
      items: [
        {
          type: 'message',
          role: 'assistant',
          content: CHAT_GAME_INSTRUCTION,
          mode: 'information',
        },
      ],
      draft: '',
    },
    {
      id: 'chat-3',
      label: '3',
      name: 'Diagnostico',
      autoNamed: false,
      items: [
        {
          type: 'message',
          role: 'assistant',
          content: CHAT_GAME_INSTRUCTION,
          mode: 'information',
        },
      ],
      draft: '',
    },
  ]);
  const [activeChatId, setActiveChatId] = useState('chat-1');
  const [loading, setLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [panelStage, setPanelStage] = useState(3);
  const [panelDirection, setPanelDirection] = useState<-1 | 1>(-1);
  const [isMonochrome, setIsMonochrome] = useState(false);
  const [progressPulse, setProgressPulse] = useState(false);
  const [isRailMorphing, setIsRailMorphing] = useState(false);
  const [levelUpText, setLevelUpText] = useState<string | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([
    {
      id: 'income-salary',
      category: 'Sueldo liquido',
      type: 'income',
      amount: 1450000,
      note: 'Ingreso principal',
    },
    {
      id: 'income-extra',
      category: 'Ingresos extra',
      type: 'income',
      amount: 220000,
      note: 'Freelance',
    },
    {
      id: 'expense-rent',
      category: 'Vivienda / arriendo',
      type: 'expense',
      amount: 470000,
      note: 'Pago mensual',
    },
    {
      id: 'expense-food',
      category: 'Alimentacion',
      type: 'expense',
      amount: 210000,
      note: 'Supermercado',
    },
    {
      id: 'expense-transport',
      category: 'Transporte',
      type: 'expense',
      amount: 95000,
      note: 'Metro + apps',
    },
    {
      id: 'expense-debt',
      category: 'Deuda financiera',
      type: 'expense',
      amount: 180000,
      note: 'Tarjeta + credito',
    },
  ]);
  const [bankSimulation, setBankSimulation] = useState<BankSimulation>({
    username: '',
    password: '',
    connected: false,
    randomMode: false,
    uploadedFiles: [],
  });
  const [docFlight, setDocFlight] = useState<DocFlight | null>(null);

  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const agentMetaRef = useRef<AgentMeta>({});
  const [, forceRender] = useState(0);
  const previousKnowledgeScoreRef = useRef(0);
  const previousMilestoneDoneIdsRef = useRef<Set<string>>(new Set());
  const recentLibraryRef = useRef<HTMLDivElement | null>(null);
  const previousPanelStageRef = useRef(panelStage);

  const loadProfileIfNeeded = useProfileStore((s) => s.loadProfileIfNeeded);
  const profile = useProfileStore((s) => s.profile);

  const activeThread = useMemo(
    () =>
      chatThreads.find((thread) => thread.id === activeChatId) ??
      chatThreads[0],
    [chatThreads, activeChatId]
  );

  const items = activeThread?.items ?? [];
  const input = activeThread?.draft ?? '';

  useEffect(() => {
    setChatThreads((prev) =>
      prev.map((thread) => {
        if (thread.items.length > 0) return thread;
        return {
          ...thread,
          items: [
            {
              type: 'message',
              role: 'assistant',
              content: CHAT_GAME_INSTRUCTION,
              mode: 'information',
            },
          ],
        };
      })
    );
  }, []);

  function setDraftForActive(nextDraft: string) {
    setChatThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeChatId
          ? { ...thread, draft: nextDraft }
          : thread
      )
    );
  }

  function setItemsForActive(
    updater: ChatItem[] | ((prevItems: ChatItem[]) => ChatItem[])
  ) {
    setChatThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeChatId) return thread;
        const nextItems =
          typeof updater === 'function'
            ? (updater as (prevItems: ChatItem[]) => ChatItem[])(thread.items)
            : updater;
        return { ...thread, items: nextItems };
      })
    );
  }

  function setNameForActive(nextName: string) {
    setChatThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeChatId
          ? { ...thread, name: nextName, autoNamed: true }
          : thread
      )
    );
  }

  useEffect(() => {
    setChatThreads((prev) => {
      let changed = false;
      const next = prev.map((thread) => {
        if (thread.autoNamed) return thread;
        const userTurns = thread.items.filter(
          (it) => it.type === 'message' && it.role === 'user'
        ).length;
        if (userTurns < 4) return thread;
        changed = true;
        return {
          ...thread,
          name: buildContextualChatName(thread.items),
          autoNamed: true,
        };
      });
      return changed ? next : prev;
    });
  }, [chatThreads]);

  const allItems = useMemo(
    () => chatThreads.flatMap((thread) => thread.items),
    [chatThreads]
  );

  const userMessagesCount = useMemo(
    () =>
      items.filter(
        (it) => it.type === 'message' && it.role === 'user'
      ).length,
    [items]
  );

  const totalUserMessagesCount = useMemo(
    () =>
      allItems.filter(
        (it) => it.type === 'message' && it.role === 'user'
      ).length,
    [allItems]
  );

  const totalAssistantMessagesCount = useMemo(
    () =>
      allItems.filter(
        (it) => it.type === 'message' && it.role === 'assistant'
      ).length,
    [allItems]
  );

  const citationsCount = useMemo(
    () => allItems.filter((it) => it.type === 'citation').length,
    [allItems]
  );

  const artifactsCount = useMemo(
    () => allItems.filter((it) => it.type === 'artifact').length,
    [allItems]
  );

  const engagedChatsCount = useMemo(
    () =>
      chatThreads.filter((thread) => {
        const userTurns = thread.items.filter(
          (it) => it.type === 'message' && it.role === 'user'
        ).length;
        return userTurns >= 3;
      }).length,
    [chatThreads]
  );

  const allAssistantBlocksCount = useMemo(
    () =>
      allItems.reduce((acc, item) => {
        if (item.type === 'message' && item.role === 'assistant') {
          return acc + (item.agent_blocks?.length ?? 0);
        }
        return acc;
      }, 0),
    [allItems]
  );

  const diagnosisReportsCount = useMemo(
    () =>
      savedReports.filter((report) => report.group === 'diagnosis').length,
    [savedReports]
  );

  const progressBreakdown = useMemo(() => {
    // 30% chat (densidad de conversación total)
    const chatSignal =
      totalUserMessagesCount * 1.35 + totalAssistantMessagesCount * 0.7;
    const chatDepth = Math.min(30, (chatSignal / 92) * 30);

    // 10% uso de múltiples chats (3/3 chats activos con contexto real)
    const multiChat = (engagedChatsCount / 3) * 10;

    // 10% evidencia (citas, artefactos, bloques estructurados)
    const evidenceSignal =
      Math.min(citationsCount * 1.4, 4) +
      Math.min(artifactsCount * 2.1, 3) +
      Math.min(allAssistantBlocksCount * 0.35, 3);
    const evidence = Math.min(10, evidenceSignal);

    // 10% comprensión de intención/modo
    const meta =
      (agentMetaRef.current.objective ? 5 : 0) +
      (agentMetaRef.current.mode ? 5 : 0);

    // 10% perfil/contexto de sesión
    const profileContext =
      (sessionInfo?.name ? 2 : 0) +
      (sessionInfo?.injectedIntake ? 3 : 0) +
      (sessionInfo?.injectedProfile || profile ? 5 : 0);

    // 10% presupuesto (desbloqueado + estructura útil)
    const budgetDataRows = budgetRows.filter((r) => r.amount > 0).length;
    const budget = Math.min(
      10,
      (budgetDataRows >= 8 ? 6 : (budgetDataRows / 8) * 6) +
        (budgetRows.length >= 6 ? 4 : 0)
    );

    // 10% transacciones (desbloqueo + conexión + evidencias)
    const transactions = Math.min(
      10,
      (bankSimulation.connected ? 4 : 0) +
        Math.min(bankSimulation.uploadedFiles.length * 2, 4) +
        (bankSimulation.randomMode ? 2 : 0)
    );

    // 10% entrevista/diagnóstico (flujo externo y resultados)
    const interviewDiagnosis = Math.min(
      10,
      (sessionInfo?.injectedIntake ? 5 : 0) +
        Math.min(diagnosisReportsCount * 2.5, 5)
    );

    const total =
      chatDepth +
      multiChat +
      evidence +
      meta +
      profileContext +
      budget +
      transactions +
      interviewDiagnosis;

    return {
      chatDepth,
      multiChat,
      evidence,
      meta,
      profileContext,
      budget,
      transactions,
      interviewDiagnosis,
      total: Math.max(0, Math.min(100, Math.round(total))),
    };
  }, [
    totalUserMessagesCount,
    totalAssistantMessagesCount,
    engagedChatsCount,
    citationsCount,
    artifactsCount,
    allAssistantBlocksCount,
    sessionInfo?.name,
    sessionInfo?.injectedIntake,
    sessionInfo?.injectedProfile,
    profile,
    budgetRows,
    bankSimulation.connected,
    bankSimulation.uploadedFiles.length,
    bankSimulation.randomMode,
    diagnosisReportsCount,
  ]);

  const knowledgeScore = progressBreakdown.total;

  const knowledgeStage = useMemo(() => {
    if (knowledgeScore < 30) return 'Explorando';
    if (knowledgeScore < 60) return 'Perfilando';
    if (knowledgeScore < 85) return 'Consolidando';
    return 'Alta resolucion';
  }, [knowledgeScore]);

  const milestones = useMemo(
    () => [
      {
        id: 'base',
        label: 'Contexto base',
        done: Boolean(sessionInfo?.name) || totalUserMessagesCount >= 3,
      },
      {
        id: 'objective',
        label: 'Objetivo detectado',
        done: Boolean(agentMetaRef.current.objective),
      },
      {
        id: 'mode',
        label: 'Modo cognitivo',
        done: Boolean(agentMetaRef.current.mode),
      },
      {
        id: 'evidence',
        label: 'Evidencia y resultados',
        done:
          citationsCount + artifactsCount + allAssistantBlocksCount > 2,
      },
      {
        id: 'profile',
        label: 'Perfil financiero',
        done: Boolean(sessionInfo?.injectedProfile || profile),
      },
      {
        id: 'multi_chat',
        label: '3 chats con contexto',
        done: engagedChatsCount >= 3,
      },
      {
        id: 'diagnosis',
        label: 'Entrevista y diagnostico',
        done:
          Boolean(sessionInfo?.injectedIntake) ||
          diagnosisReportsCount > 0,
      },
    ],
    [
      sessionInfo?.name,
      sessionInfo?.injectedIntake,
      sessionInfo?.injectedProfile,
      totalUserMessagesCount,
      citationsCount,
      artifactsCount,
      allAssistantBlocksCount,
      profile,
      engagedChatsCount,
      diagnosisReportsCount,
    ]
  );

  const completedMilestones = milestones.filter((m) => m.done).length;
  const nextMilestone = milestones.find((m) => !m.done);

  const unlockedPanelBlocks = useMemo(() => {
    const budgetUnlocked =
      knowledgeScore >= 55 ||
      allItems.some(
        (it) =>
          it.type === 'message' &&
          it.role === 'user' &&
          /presupuesto|gasto|ingreso|deuda|ahorro/i.test(it.content)
      );

    const transactionsUnlocked =
      knowledgeScore >= 74 ||
      allItems.some(
        (it) =>
          it.type === 'message' &&
          it.role === 'user' &&
          /transaccion|cartola|banco|cuenta|movimiento/i.test(it.content)
      );

    return { budgetUnlocked, transactionsUnlocked };
  }, [knowledgeScore, allItems]);

  const budgetTotals = useMemo(() => {
    const income = budgetRows
      .filter((r) => r.type === 'income')
      .reduce((acc, r) => acc + r.amount, 0);
    const expenses = budgetRows
      .filter((r) => r.type === 'expense')
      .reduce((acc, r) => acc + r.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [budgetRows]);

  const reportsByGroup = useMemo(() => {
    const base: Record<ReportGroup, SavedReport[]> = {
      plan_action: [],
      simulation: [],
      budget: [],
      diagnosis: [],
      other: [],
    };
    for (const report of savedReports) {
      base[report.group].push(report);
    }
    return base;
  }, [savedReports]);

  const recentReports = useMemo(
    () =>
      [...savedReports]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        )
        .slice(0, 6),
    [savedReports]
  );

  const coachHint = useMemo(() => {
    if (engagedChatsCount < 3) {
      return `Tip: activa los 3 chats (actual ${engagedChatsCount}/3) para sumar progreso real.`;
    }
    if (!unlockedPanelBlocks.budgetUnlocked) {
      return 'Tip: cuentame ingresos y gastos para desbloquear Presupuesto.';
    }
    if (!unlockedPanelBlocks.transactionsUnlocked) {
      return 'Tip: habla de cartolas, cuentas o banco para desbloquear Transacciones.';
    }
    if (progressBreakdown.interviewDiagnosis < 8) {
      return 'Tip: completa entrevista/diagnostico para acercarte al tramo final.';
    }
    return 'Sigue aportando evidencia y profundidad para llegar al 100%.';
  }, [
    engagedChatsCount,
    unlockedPanelBlocks.budgetUnlocked,
    unlockedPanelBlocks.transactionsUnlocked,
    progressBreakdown.interviewDiagnosis,
  ]);

  const isPanelCollapsed = panelStage === 3;

  useEffect(() => {
    try {
      const rawStage = localStorage.getItem('agent.panel.stage.v3');
      if (rawStage !== null) {
        const parsed = Number(rawStage);
        if (!Number.isNaN(parsed)) {
          setPanelStage(Math.max(1, Math.min(3, parsed)));
          return;
        }
      }
      // Compat con versiones anteriores (colapsado booleano).
      const rawCollapsed = localStorage.getItem('agent.panel.collapsed.v1');
      if (rawCollapsed === '1') setPanelStage(3);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('agent.ui.monochrome.v1');
      if (raw === '1') setIsMonochrome(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('agent.chat.threads.v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatThread[];
      if (!Array.isArray(parsed) || parsed.length !== 3) return;
      const sanitized = parsed.map((thread, idx) => ({
        id: thread.id || `chat-${idx + 1}`,
        label: thread.label || String(idx + 1),
        name:
          typeof thread.name === 'string' && thread.name.trim().length > 0
            ? thread.name
            : `Chat ${idx + 1}`,
        autoNamed: Boolean((thread as Partial<ChatThread>).autoNamed),
        items: Array.isArray(thread.items) ? thread.items : [],
        draft: typeof thread.draft === 'string' ? thread.draft : '',
      }));
      setChatThreads(sanitized);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('agent.saved.reports.v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedReport[];
      if (Array.isArray(parsed)) setSavedReports(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('agent.panel.stage.v3', String(panelStage));
      localStorage.setItem(
        'agent.panel.collapsed.v1',
        panelStage === 3 ? '1' : '0'
      );
    } catch {}
  }, [panelStage]);

  useEffect(() => {
    const prev = previousPanelStageRef.current;
    previousPanelStageRef.current = panelStage;

    if ((prev === 1 && panelStage === 2) || (prev === 2 && panelStage === 1)) {
      setIsRailMorphing(true);
      const timer = window.setTimeout(() => setIsRailMorphing(false), 460);
      return () => window.clearTimeout(timer);
    }
  }, [panelStage]);

  useEffect(() => {
    try {
      localStorage.setItem('agent.ui.monochrome.v1', isMonochrome ? '1' : '0');
    } catch {}
  }, [isMonochrome]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'agent.chat.threads.v1',
        JSON.stringify(chatThreads)
      );
    } catch {}
  }, [chatThreads]);

  useEffect(() => {
    const monoClass = 'agent-monochrome-bg';
    const normalClass = 'agent-normal-matte-bg';
    if (isMonochrome) {
      document.body.classList.add(monoClass);
      document.body.classList.remove(normalClass);
    } else {
      document.body.classList.remove(monoClass);
      document.body.classList.add(normalClass);
    }
    return () => {
      document.body.classList.remove(monoClass);
      document.body.classList.remove(normalClass);
    };
  }, [isMonochrome]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'agent.saved.reports.v1',
        JSON.stringify(savedReports)
      );
    } catch {}
  }, [savedReports]);

  useEffect(() => {
    const prevScore = previousKnowledgeScoreRef.current;
    const scoreDelta = knowledgeScore - prevScore;
    const prevDone = previousMilestoneDoneIdsRef.current;
    const nowDone = new Set(milestones.filter((m) => m.done).map((m) => m.id));
    const newlyUnlocked = milestones
      .filter((m) => m.done && !prevDone.has(m.id))
      .map((m) => m.id);

    previousKnowledgeScoreRef.current = knowledgeScore;
    previousMilestoneDoneIdsRef.current = nowDone;

    if (prevScore === 0) return;
    if (scoreDelta <= 0 && newlyUnlocked.length === 0) return;

    const levelText =
      newlyUnlocked.length > 0
        ? `Hito desbloqueado: ${milestones.find((m) => m.id === newlyUnlocked[0])?.label ?? 'nuevo avance'}`
        : `+${scoreDelta}% conocimiento`;

    setProgressPulse(true);
    setLevelUpText(levelText);

    const pulseTimer = window.setTimeout(() => setProgressPulse(false), 720);
    const textTimer = window.setTimeout(() => setLevelUpText(null), 2300);

    return () => {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(textTimer);
    };
  }, [knowledgeScore, milestones]);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const info = await getSessionInfo();
        if (alive) setSessionInfo(info);
      } catch {}
    };

    tick();
    const timer = setInterval(tick, 5000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    loadProfileIfNeeded().catch(() => {});
  }, [loadProfileIfNeeded]);

  async function onSend() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setDraftForActive('');
    setLoading(true);

    const historySnapshot = items
      .filter((it) => it.type === 'message')
      .map((m) => ({
        role: (m as any).role,
        content: (m as any).content,
      }))
      .slice(-12);
    const recentArtifacts = items
      .filter((it) => it.type === 'artifact')
      .slice(-4)
      .map((it) => {
        const artifact = (it as Extract<ChatItem, { type: 'artifact' }>).artifact;
        return {
          id: artifact.id,
          title: artifact.title,
          description: artifact.description,
          source: artifact.source,
          createdAt: artifact.createdAt,
          meta: artifact.meta,
        };
      });
    const recentChartSummaries = items
      .filter((it) => it.type === 'message' && it.role === 'assistant')
      .slice(-6)
      .flatMap((it) => {
        const blocks = (it as Extract<ChatItem, { type: 'message'; role: 'assistant' }>).agent_blocks ?? [];
        return blocks
          .filter((b): b is AgentBlock & { type: 'chart' } => b.type === 'chart')
          .map((b) => ({
            title: b.chart.title,
            subtitle: b.chart.subtitle,
            kind: b.chart.kind,
            xKey: b.chart.xKey,
            yKey: b.chart.yKey,
            points: Array.isArray(b.chart.data) ? b.chart.data.length : 0,
            lastValue:
              Array.isArray(b.chart.data) && b.chart.data.length > 0
                ? Number(
                    b.chart.data[b.chart.data.length - 1]?.[
                      b.chart.yKey as keyof (typeof b.chart.data)[number]
                    ] ?? 0
                  )
                : undefined,
          }));
      })
      .slice(-4);

    setItemsForActive((prev) => [
      ...prev,
      { type: 'message', role: 'user', content: userMessage },
    ]);

    try {
      const res = (await sendToAgent({
        user_message: userMessage,
        session_id: getSessionId(),
        history: historySnapshot,
        context: {
          recent_artifacts: recentArtifacts,
          recent_chart_summaries: recentChartSummaries,
        },
        ui_state: {
          panel_stage: panelStage,
          panel_collapsed: isPanelCollapsed,
          active_chat: {
            id: activeThread?.id,
            label: activeThread?.label,
            name: activeThread?.name,
          },
          unlocked_modules: {
            budget: unlockedPanelBlocks.budgetUnlocked,
            transactions: unlockedPanelBlocks.transactionsUnlocked,
          },
          knowledge_score: knowledgeScore,
          completed_milestones: completedMilestones,
          total_milestones: milestones.length,
          reports_count: savedReports.length,
          has_profile: Boolean(sessionInfo?.injectedProfile || profile),
          has_intake: Boolean(sessionInfo?.injectedIntake),
        },
        preferences: {
          response_style: 'professional',
          language: 'es-CL',
        },
      })) as AgentResponse;

      agentMetaRef.current.objective =
        res?.react?.objective ?? agentMetaRef.current.objective;
      agentMetaRef.current.mode = res?.mode ?? agentMetaRef.current.mode;
      forceRender((x) => x + 1);

      const next = toChatItemsFromAgentResponse(res);
      if (next.length === 0) {
        setItemsForActive((prev) => [
          ...prev,
          {
            type: 'message',
            role: 'assistant',
            content: res.message ?? '—',
            mode: res.mode ?? res.reasoning_mode,
            objective: res.react?.objective,
            agent_blocks: res.agent_blocks,
          },
        ]);
      } else {
        setItemsForActive((prev) => [...prev, ...next]);
      }
    } catch {
      setItemsForActive((prev) => [
        ...prev,
        {
          type: 'message',
          role: 'assistant',
          content: 'Ocurrio un error. Intenta nuevamente.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleMic() {
    setMicActive((v) => !v);
  }

  function updateBudgetRow(
    id: string,
    field: keyof BudgetRow,
    value: string | number
  ) {
    setBudgetRows((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === 'amount'
                  ? Number(value) || 0
                  : value,
            }
          : row
      )
    );
  }

  function addBudgetRow(type: 'income' | 'expense') {
    setBudgetRows((rows) => [
      ...rows,
      {
        id: `${type}-${Date.now()}`,
        category: type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto',
        type,
        amount: 0,
        note: '',
      },
    ]);
  }

  function sendBudgetToAgent() {
    const budgetSummary = budgetRows.map((r) => ({
      category: r.category,
      type: r.type,
      amount: r.amount,
      note: r.note,
    }));
    const message = `Actualiza mi presupuesto con esta tabla y entregame un diagnostico financiero profesional por categorias. Datos: ${JSON.stringify(
      budgetSummary
    )}`;
    setDraftForActive(message);
    setIsBudgetModalOpen(false);
  }

  function simulateBankLogin(randomMode = false) {
    if (randomMode) {
      setBankSimulation((prev) => ({
        ...prev,
        username: randomBankCredential('usr'),
        password: randomBankCredential('pwd'),
        randomMode: true,
        connected: true,
      }));
      return;
    }
    setBankSimulation((prev) => ({
      ...prev,
      connected:
        prev.username.trim().length > 0 &&
        prev.password.trim().length > 0,
    }));
  }

  function onUploadStatement(files: FileList | null) {
    if (!files || files.length === 0) return;
    const names = Array.from(files).map((f) => f.name);
    setBankSimulation((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...names],
    }));
  }

  function launchDocToLibraryAnimation(
    label: string,
    sourceRect?: DOMRect
  ) {
    if (!sourceRect || !recentLibraryRef.current) return;

    const targetRect =
      recentLibraryRef.current.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + 34;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setDocFlight({
      id,
      label,
      startX,
      startY,
      endX,
      endY,
      running: false,
    });

    window.requestAnimationFrame(() => {
      setDocFlight((prev) =>
        prev && prev.id === id
          ? { ...prev, running: true }
          : prev
      );
    });

    window.setTimeout(() => {
      setDocFlight((prev) =>
        prev && prev.id === id ? null : prev
      );
    }, 900);
  }

  function cyclePanelStage() {
    setPanelStage((prevStage) => {
      const minStage = 1;
      const maxStage = 3;
      let nextDirection = panelDirection;
      let nextStage = prevStage + nextDirection;

      // Rebote en extremos: no reinicia, devuelve el recorrido.
      if (nextStage < minStage || nextStage > maxStage) {
        nextDirection = nextDirection === -1 ? 1 : -1;
        nextStage = prevStage + nextDirection;
      }

      if (nextStage === minStage) nextDirection = 1;
      if (nextStage === maxStage) nextDirection = -1;

      if (nextDirection !== panelDirection) {
        setPanelDirection(nextDirection);
      }
      return nextStage;
    });
  }

  function renderLatexLikeMessage(content: string): ReactNode {
    const sanitized = content
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    const lines = sanitized.split('\n');
    const chunks: ReactNode[] = [];
    let bulletBuffer: string[] = [];
    let tableBuffer: string[][] = [];

    const flushBulletBuffer = () => {
      if (bulletBuffer.length === 0) return;
      chunks.push(
        <ul key={`ul-${chunks.length}`} className="latex-doc-list">
          {bulletBuffer.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    };

    const flushTableBuffer = () => {
      if (tableBuffer.length === 0) return;
      const [header, ...rows] = tableBuffer;
      chunks.push(
        <div key={`table-${chunks.length}`} className="latex-doc-table-wrap">
          <table className="latex-doc-table">
            <thead>
              <tr>
                {header.map((cell, idx) => (
                  <th key={`h-${idx}`}>{cell}</th>
                ))}
              </tr>
            </thead>
            {rows.length > 0 && (
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={`r-${rowIdx}`}>
                    {row.map((cell, cellIdx) => (
                      <td key={`c-${rowIdx}-${cellIdx}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      );
      tableBuffer = [];
    };

    lines.forEach((raw, idx) => {
      const line = raw.trim();
      if (!line) {
        flushBulletBuffer();
        flushTableBuffer();
        return;
      }

      const bulletMatch = line.match(/^[-*]\s+(.+)/);
      if (bulletMatch) {
        flushTableBuffer();
        bulletBuffer.push(bulletMatch[1]);
        return;
      }

      const tableLike = line.includes('|');
      if (tableLike) {
        flushBulletBuffer();
        const cells = line
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean);
        if (cells.length > 1 && !cells.every((c) => /^[-:]+$/.test(c))) {
          tableBuffer.push(cells);
          return;
        }
      }

      flushBulletBuffer();
      flushTableBuffer();

      const h2 = line.match(/^#\s+(.+)/);
      if (h2) {
        chunks.push(
          <h3 key={`h2-${idx}`} className="latex-doc-h2">
            {h2[1]}
          </h3>
        );
        return;
      }

      const h3 = line.match(/^##\s+(.+)/);
      if (h3) {
        chunks.push(
          <h4 key={`h3-${idx}`} className="latex-doc-h3">
            {h3[1]}
          </h4>
        );
        return;
      }

      chunks.push(
        <p key={`p-${idx}`} className="latex-doc-p">
          {line}
        </p>
      );
    });

    flushBulletBuffer();
    flushTableBuffer();
    return chunks.length > 0 ? chunks : <p className="latex-doc-p">{sanitized}</p>;
  }

  function shouldEnableBubbleScroll(content: string) {
    const normalized = (content || '').replace(/\r\n/g, '\n').trim();
    if (!normalized) return false;
    const explicitLines = normalized.split('\n').filter((l) => l.trim().length > 0);
    const estimatedWrappedLines = explicitLines.reduce((acc, line) => {
      const length = line.trim().length;
      return acc + Math.max(1, Math.ceil(length / 72));
    }, 0);
    return estimatedWrappedLines > 2;
  }

  return (
    <main
      className={`agent-layout ${
        isPanelCollapsed ? 'is-panel-collapsed' : ''
      } ${panelStage === 1 ? 'is-panel-stage-1' : ''} ${
        panelStage === 2 ? 'is-panel-stage-2' : ''
      } ${panelStage === 3 ? 'is-panel-stage-small' : ''} ${
        isRailMorphing ? 'is-mode-12-morphing' : ''
      } ${
        !isMonochrome ? 'is-normal-matte' : ''
      } ${
        isMonochrome ? 'is-monochrome' : ''
      }`}
    >
      <section
        className={`agent-chat active-chat-${activeThread?.label ?? '1'}`}
      >
        <header className="agent-chat-header">
          <div className="agent-chat-controls-row">
            <div className="chat-switcher" aria-label="Selector de chats">
              {chatThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`chat-sheet-tab ${
                    thread.id === activeChatId ? 'is-active' : ''
                  }`}
                  onClick={() => setActiveChatId(thread.id)}
                  title={`Cambiar a chat ${thread.label}`}
                  aria-label={`Cambiar a chat ${thread.label}`}
                >
                  {thread.label}
                </button>
              ))}
            </div>
            <div className="header-toggle-group">
              <button
                type="button"
                className="layout-mode-toggle"
                onClick={cyclePanelStage}
                title="Cambiar vista del panel"
                aria-label="Cambiar vista del panel derecho"
              >
                {panelDirection === -1 ? '»' : '«'}
              </button>
              <button
                type="button"
                className="layout-mode-toggle monochrome-toggle"
                onClick={() => setIsMonochrome((v) => !v)}
                title={
                  isMonochrome
                    ? 'Desactivar modo blanco y negro'
                    : 'Activar modo blanco y negro'
                }
                aria-label={
                  isMonochrome
                    ? 'Desactivar modo blanco y negro'
                    : 'Activar modo blanco y negro'
                }
              >
                B/N
              </button>
            </div>
          </div>
          <h1>Financiera mente</h1>
          <p className="muted">
            Proyecto de tesis en finanzas abiertas. Entorno seguro y privado para analisis financiero.
          </p>
          <div className="chat-meta-row">
            <span className="chat-id-badge">Chat {activeThread?.label}</span>
            <input
              value={activeThread?.name ?? ''}
              onChange={(e) => setNameForActive(e.target.value)}
              className="chat-name-input"
              placeholder="Nombre del chat"
              aria-label="Nombre del chat activo"
            />
          </div>
        </header>

        <div className="agent-chat-body">
          <div className="agent-thread">
            {items.map((it, i) => {
              if (it.type === 'message') {
                if (it.role === 'assistant') {
                  const isScrollable = shouldEnableBubbleScroll(it.content);
                  return (
                    <div
                      key={i}
                      className={`agent-bubble assistant latex-doc ${
                        isScrollable ? 'is-scrollable-bubble' : ''
                      }`}
                    >
                      <div className="latex-doc-head">
                        <span className="latex-doc-title">Informe del agente</span>
                        <span className="latex-doc-mode">
                          {(it.mode ?? agentMetaRef.current.mode ?? 'analysis')
                            .toString()
                            .replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div
                        className={`latex-doc-body ${
                          isScrollable ? 'is-scrollable-content' : ''
                        }`}
                      >
                        {renderLatexLikeMessage(it.content)}
                        {Array.isArray(it.agent_blocks) && it.agent_blocks.length > 0 && (
                          <div className="latex-inline-annex">
                            <div className="latex-inline-annex-head">
                              <span>Anexos tecnicos</span>
                              <span>charts</span>
                            </div>
                            <AgentBlocksRenderer blocks={it.agent_blocks} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                const isScrollable = shouldEnableBubbleScroll(it.content);
                return (
                  <div
                    key={i}
                    className={`agent-bubble ${it.role} ${
                      isScrollable ? 'is-scrollable-bubble' : ''
                    }`}
                  >
                    {it.content}
                  </div>
                );
              }

              if (it.type === 'artifact') {
                return (
                  <div
                    key={i}
                    className="agent-bubble assistant artifact"
                  >
                    <DocumentBubble
                      artifact={it.artifact}
                      onSaved={({
                        artifact,
                        publicUrl,
                        sourceRect,
                      }) => {
                        const report: SavedReport = {
                          id: `${artifact.id}-${Date.now()}`,
                          title: artifact.title,
                          group: classifyReportGroup(
                            artifact.title,
                            artifact.source
                          ),
                          fileUrl: publicUrl,
                          createdAt: new Date().toISOString(),
                        };
                        setSavedReports((prev) => [
                          report,
                          ...prev.filter((r) => r.fileUrl !== publicUrl),
                        ]);
                        launchDocToLibraryAnimation(
                          artifact.title,
                          sourceRect
                        );
                      }}
                    />
                  </div>
                );
              }

              if (it.type === 'citation') {
                return (
                  <div
                    key={i}
                    className="agent-bubble assistant citation"
                  >
                    <CitationBubble citation={it.citation} />
                  </div>
                );
              }

              return null;
            })}

            {loading && (
              <div className="agent-bubble assistant muted">
                Pensando...
              </div>
            )}
          </div>

          <div className="agent-input">
            <textarea
              placeholder="Escribe tu mensaje y moldea el campo a tu estilo..."
              value={input}
              onChange={(e) => setDraftForActive(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />

            <div className="controls">
              <button
                type="button"
                className={`continue-button ${micActive ? 'active' : ''}`}
                onClick={toggleMic}
              >
                {micActive ? '●' : 'hablar'}
              </button>

              <div style={{ flex: 1 }} />

              <button
                type="button"
                className="continue-button"
                onClick={onSend}
              >
                Enviar
              </button>
            </div>

            <div className="hint">
              Presiona <span>Enter</span> para enviar. {coachHint}
            </div>
          </div>
        </div>
      </section>

      <aside
        className="agent-divider-rail"
        aria-label="Progreso del conocimiento del usuario"
      >
        <div
          className={`knowledge-rail-card ${
            progressPulse ? 'is-level-up' : ''
          } ${isRailMorphing ? 'is-rail-morphing' : ''} stage-${panelStage}`}
        >
          <span className="knowledge-rail-label">Conocimiento</span>
          <span className="knowledge-rail-value">
            {knowledgeScore}%
          </span>
          <span className="knowledge-rail-stage">{knowledgeStage}</span>
          <span className="knowledge-rail-legend">
            Ponderado: chat 30%, multi-chat 10%, bloques y diagnostico completan el mapa.
          </span>
          {levelUpText && (
            <span className="knowledge-level-up" role="status">
              {levelUpText}
            </span>
          )}

          <div
            className="knowledge-rail-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={knowledgeScore}
          >
            <div
              className="knowledge-rail-fill"
              style={{ height: `${knowledgeScore}%` }}
            />
          </div>

          <span className="knowledge-rail-meta">
            {completedMilestones}/{milestones.length} hitos
          </span>

          <div className="knowledge-milestones" aria-label="Checklist de hitos">
            {milestones.map((milestone) => (
              <label
                key={milestone.id}
                className={`knowledge-milestone ${milestone.done ? 'is-done' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={milestone.done}
                  readOnly
                  aria-label={milestone.label}
                />
                <span>{milestone.label}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      <aside className="agent-panel">
        <div
          className={`panel-grid ${
            isPanelCollapsed ? 'is-compact-grid' : ''
          }`}
        >
          <ProfileCard
            className="panel-pos-profile"
            userName={sessionInfo?.name ?? undefined}
            profile={
              sessionInfo?.injectedProfile
                ? { profile: sessionInfo.injectedProfile }
                : profile
            }
            injected={Boolean(sessionInfo?.injectedProfile)}
          />

          <PanelCard
            label="Objetivo activo"
            className="panel-pos-objective panel-flow-gradient"
            bgImage="/fondo8.png"
            overlayColor="154,148,148"
            overlayOpacity={0.18}
            bgScale={1.2}
            bgPosition="center"
          >
            {agentMetaRef.current.objective ??
              'Conversa para que el agente defina un objetivo de alto impacto.'}
          </PanelCard>

          <PanelCard
            label="Modo cognitivo"
            value={agentMetaRef.current.mode ?? 'En calibracion'}
            className="panel-pos-mode panel-mode-cognitive"
            bgImage="/image3.png"
            overlayOpacity={0.28}
            bgScale={1}
            dataMode={agentMetaRef.current.mode ?? 'calibracion'}
          />

          <PanelCard
            label="Siguiente desbloqueo"
            className="panel-pos-next panel-flow-gradient"
            bgImage="/fondo8.png"
            overlayColor="154,148,148"
            overlayOpacity={0.2}
            bgScale={1.1}
            bgPosition="40% 40%"
          >
            {nextMilestone
              ? `Responde para completar: ${nextMilestone.label}.`
              : 'Mapa completo. Ya tenemos una lectura avanzada de tu perfil.'}
          </PanelCard>

          <button
            type="button"
            className="interview-flow-card panel-pos-interview"
            onClick={() => router.push('/interview')}
            title="Ir a entrevista y diagnóstico"
          >
            <span className="interview-flow-label">Flujo guiado</span>
            <span className="interview-flow-title">
              Entrevista hablada
              <br />
              → Diagnóstico final
                  </span>
            <span className="interview-flow-meta">
              Continuar proceso
            </span>
          </button>

          <button
            type="button"
            className={`panel-feature-card ${
              'panel-pos-budget'
            } ${unlockedPanelBlocks.budgetUnlocked ? '' : 'is-locked'}`}
            onClick={() => {
              if (!unlockedPanelBlocks.budgetUnlocked) return;
              setIsBudgetModalOpen(true);
            }}
            title={
              unlockedPanelBlocks.budgetUnlocked
                ? 'Abrir presupuesto inteligente'
                : 'Bloqueado: conversa sobre ingresos y gastos'
            }
          >
            <span className="panel-feature-label">Presupuesto</span>
            <span className="panel-feature-status">
              {unlockedPanelBlocks.budgetUnlocked ? 'Desbloqueado' : 'Bloqueado'}
            </span>
            <span className="panel-feature-copy">
              Diagnostico de analista financiero, editable por chat y manual.
            </span>
          </button>

          <button
            type="button"
            className={`panel-feature-card ${
              'panel-pos-transactions'
            } ${unlockedPanelBlocks.transactionsUnlocked ? '' : 'is-locked'}`}
            onClick={() => {
              if (!unlockedPanelBlocks.transactionsUnlocked) return;
              setIsTransactionsModalOpen(true);
            }}
            title={
              unlockedPanelBlocks.transactionsUnlocked
                ? 'Abrir transacciones y finanzas abiertas'
                : 'Bloqueado: conversa sobre cartolas y banco'
            }
          >
            <span className="panel-feature-label">Transacciones</span>
            <span className="panel-feature-status">
              {unlockedPanelBlocks.transactionsUnlocked
                ? 'Desbloqueado'
                : 'Bloqueado'}
            </span>
            <span className="panel-feature-copy">
              Simulador de conexion bancaria con carga de cartolas PDF/Excel.
            </span>
          </button>

          <PanelCard
            className="news-card panel-pos-news"
          >
            <a
              href="https://fintualist.com/chile/"
              target="_blank"
              rel="noreferrer"
              className="news-link"
            >
              <div className="news-image">
                <div className="news-overlay">
                  <span className="news-title">
                    Noticias y contexto
                  </span>
                </div>
              </div>
            </a>
          </PanelCard>

          <PanelCard
            label="Biblioteca de documentos"
            className="panel-pos-library panel-flow-gradient"
            bgImage="/fondo8.png"
            overlayColor="154,148,148"
            overlayOpacity={0.24}
            bgScale={1.08}
          >
            <div className="reports-grid">
              <div className="report-group">
                <span className="report-group-title">Plan de accion</span>
                <span className="report-group-count">
                  {reportsByGroup.plan_action.length}
                </span>
              </div>
              <div className="report-group">
                <span className="report-group-title">Simulacion</span>
                <span className="report-group-count">
                  {reportsByGroup.simulation.length}
                </span>
              </div>
              <div className="report-group">
                <span className="report-group-title">Presupuesto</span>
                <span className="report-group-count">
                  {reportsByGroup.budget.length}
                </span>
              </div>
              <div className="report-group">
                <span className="report-group-title">Diagnostico</span>
                <span className="report-group-count">
                  {reportsByGroup.diagnosis.length}
                </span>
              </div>
            </div>
            <div className="report-list">
              {savedReports.length === 0 && (
                <span className="report-empty">
                  Guarda PDFs desde el chat para agruparlos aqui.
                </span>
              )}
              {savedReports.slice(0, 6).map((report) => (
                <a
                  key={report.id}
                  href={report.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="report-item"
                >
                  <span>{report.title}</span>
                  <span className="report-tag">{report.group}</span>
                </a>
              ))}
            </div>
          </PanelCard>

          <div
            ref={recentLibraryRef}
            className="recent-library-card panel-pos-recent"
          >
            <div className="recent-library-head">
              <span className="recent-library-title">
                Documentos recientes
              </span>
              <span className="recent-library-count">
                {recentReports.length}
              </span>
            </div>

            <div className="recent-library-grid">
              {recentReports.length === 0 && (
                <span className="recent-empty">
                  Aqui llegan los PDFs guardados desde el chat.
                </span>
              )}
              {recentReports.map((report, idx) => (
                <a
                  key={report.id}
                  href={report.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="recent-item"
                  style={
                    (() => {
                      const offset = docVisualOffset(report.id, idx);
                      return {
                        ['--doc-rot' as any]: `${offset.rotation}deg`,
                        ['--doc-y' as any]: `${offset.yShift}px`,
                      } as React.CSSProperties;
                    })()
                  }
                >
                  <div className="recent-item-preview-wrap">
                    <embed
                      src={`${report.fileUrl}#page=1&view=FitH&zoom=55`}
                      type="application/pdf"
                      className="recent-item-preview"
                    />
                  </div>
                  <span className="recent-item-name">{report.title}</span>
                </a>
              ))}
            </div>
          </div>

          {sessionInfo?.injectedProfile && (
            <button
              className="continue-ghost panel-action panel-pos-aux"
              onClick={async () => {
                await removeInjectedProfile();
                window.location.reload();
              }}
            >
              Remover perfil inyectado
            </button>
          )}

          {sessionInfo?.injectedIntake && (
            <button
              className="continue-ghost panel-action panel-pos-aux"
              onClick={async () => {
                await removeInjectedIntake();
                window.location.reload();
              }}
            >
              Remover intake inyectado
            </button>
          )}
        </div>
      </aside>

      {docFlight && (
        <div
          className={`doc-flight-chip ${
            docFlight.running ? 'is-running' : ''
          }`}
          style={
            {
              left: `${docFlight.startX}px`,
              top: `${docFlight.startY}px`,
              ['--dx' as any]: `${docFlight.endX - docFlight.startX}px`,
              ['--dy' as any]: `${docFlight.endY - docFlight.startY}px`,
            } as any
          }
        >
          {docFlight.label}
          </div>
      )}

      {isBudgetModalOpen && (
        <div className="agent-modal-overlay" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="agent-modal budget-modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-modal-header">
              <h3>Presupuesto profesional</h3>
              <button type="button" className="agent-modal-close" onClick={() => setIsBudgetModalOpen(false)}>
                ×
              </button>
          </div>
            <p className="agent-modal-intro">
              Diagnostico de presupuesto estilo analista financiero.
              Puedes editar manualmente o pedir al core agent que ajuste categorias y montos.
            </p>

            <div className="budget-table-wrap">
              <table className="budget-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Monto mensual</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          value={row.category}
                          onChange={(e) =>
                            updateBudgetRow(row.id, 'category', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={row.type}
                          onChange={(e) =>
                            updateBudgetRow(
                              row.id,
                              'type',
                              e.target.value as 'income' | 'expense'
                            )
                          }
                        >
                          <option value="income">Ingreso</option>
                          <option value="expense">Gasto</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) =>
                            updateBudgetRow(row.id, 'amount', Number(e.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={row.note}
                          onChange={(e) =>
                            updateBudgetRow(row.id, 'note', e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="budget-summary">
              <span>Ingresos: ${budgetTotals.income.toLocaleString('es-CL')}</span>
              <span>Gastos: ${budgetTotals.expenses.toLocaleString('es-CL')}</span>
              <span className={budgetTotals.balance >= 0 ? 'is-positive' : 'is-negative'}>
                Balance: ${budgetTotals.balance.toLocaleString('es-CL')}
              </span>
            </div>

            <div className="agent-modal-actions">
              <button type="button" className="continue-ghost" onClick={() => addBudgetRow('income')}>
                + Ingreso
              </button>
              <button type="button" className="continue-ghost" onClick={() => addBudgetRow('expense')}>
                + Gasto
              </button>
              <button type="button" className="button-primary" onClick={sendBudgetToAgent}>
                Editar via chat core
              </button>
            </div>
          </div>
        </div>
      )}

      {isTransactionsModalOpen && (
        <div className="agent-modal-overlay" onClick={() => setIsTransactionsModalOpen(false)}>
          <div className="agent-modal transactions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-modal-header">
              <h3>Transacciones y finanzas abiertas</h3>
              <button type="button" className="agent-modal-close" onClick={() => setIsTransactionsModalOpen(false)}>
                ×
              </button>
            </div>
            <p className="agent-modal-intro">
              Simulacion de acceso bancario bajo esquema de finanzas abiertas.
              Usa credenciales demo o aleatorias para investigar integracion y carga de cartolas.
            </p>

            <div className="bank-sim-grid">
              <label>
                Usuario demo
                <input
                  value={bankSimulation.username}
                  onChange={(e) =>
                    setBankSimulation((prev) => ({
                      ...prev,
                      username: e.target.value,
                      connected: false,
                      randomMode: false,
                    }))
                  }
                />
              </label>
              <label>
                Contrasena demo
                <input
                  type="password"
                  value={bankSimulation.password}
                  onChange={(e) =>
                    setBankSimulation((prev) => ({
                      ...prev,
                      password: e.target.value,
                      connected: false,
                      randomMode: false,
                    }))
                  }
                />
              </label>
            </div>

            <div className="agent-modal-actions">
              <button type="button" className="continue-ghost" onClick={() => simulateBankLogin(true)}>
                Credenciales aleatorias
              </button>
              <button type="button" className="button-primary" onClick={() => simulateBankLogin(false)}>
                Simular login
              </button>
            </div>

            <div className="bank-sim-status">
              Estado:{' '}
              <strong>
                {bankSimulation.connected
                  ? `conectado (simulado${bankSimulation.randomMode ? ' aleatorio' : ''})`
                  : 'desconectado'}
              </strong>
            </div>

            <div className="upload-zone">
              <label className="upload-label">
                Subir cartola PDF/Excel
                <input
                  type="file"
                  accept=".pdf,.xls,.xlsx,.csv"
                  multiple
                  onChange={(e) => onUploadStatement(e.target.files)}
                />
              </label>
              <div className="upload-files">
                {bankSimulation.uploadedFiles.length === 0 && (
                  <span>Aun no hay cartolas cargadas.</span>
                )}
                {bankSimulation.uploadedFiles.map((name, idx) => (
                  <span key={`${name}-${idx}`} className="upload-file-pill">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
