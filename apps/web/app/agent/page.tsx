'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { getSessionId } from '@/lib/session';
import { sendToAgent } from '@/lib/agent';
import { useProfileStore } from '@/state/profile.store';
import {
  getSessionInfo,
  removeInjectedIntake,
  removeInjectedProfile,
  loadSheets,
  saveSheets,
  getWelcomeMessage,
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
  previewUrl?: string;
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
  status: 'active' | 'context';
  contextScore: number;      // 0-100, agent-driven
  userMessageCount: number;  // track for 70-msg limit
  createdAt: string;
  completedAt?: string;
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

  function makeInitialThread(id: string, label: string, name: string): ChatThread {
    return {
      id,
      label,
      name,
      autoNamed: false,
      items: [],
      draft: '',
      status: 'active',
      contextScore: 0,
      userMessageCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  const [chatThreads, setChatThreads] = useState<ChatThread[]>([
    makeInitialThread('chat-1', '1', 'Nueva conversación'),
    makeInitialThread('chat-2', '2', 'Nueva conversación'),
    makeInitialThread('chat-3', '3', 'Nueva conversación'),
  ]);
  const [activeChatId, setActiveChatId] = useState('chat-1');
  const [sheetsLoaded, setSheetsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [panelStage, setPanelStage] = useState(3);
  const [mobileTab, setMobileTab] = useState<'chat' | 'panel'>('chat');
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false);
  const [panelDirection, setPanelDirection] = useState<-1 | 1>(-1);
  const [isMonochrome, setIsMonochrome] = useState(false);
  const [progressPulse, setProgressPulse] = useState(false);
  const [isRailMorphing, setIsRailMorphing] = useState(false);
  const [levelUpText, setLevelUpText] = useState<string | null>(null);
  const [knowledgePopupOpen, setKnowledgePopupOpen] = useState(false);
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
  const [mounted, setMounted] = useState(false);
  const [isRealtimeOpen, setIsRealtimeOpen] = useState(false);
  const [realtimeSpeaking, setRealtimeSpeaking] = useState(false);
  const [realtimeListening, setRealtimeListening] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [realtimeHistory, setRealtimeHistory] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const realtimeRecognitionRef = useRef<any>(null);
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const bubblePosInitRef = useRef(false);
  const bubbleDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const agentMetaRef = useRef<AgentMeta>({});
  const [, forceRender] = useState(0);
  const [chatSlideDir, setChatSlideDir] = useState<'left' | 'right' | null>(null);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const previousKnowledgeScoreRef = useRef(0);
  const previousMilestoneDoneIdsRef = useRef<Set<string>>(new Set());
  const recentLibraryRef = useRef<HTMLDivElement | null>(null);
  const panelScrollRef = useRef<HTMLElement | null>(null);
  const [newReportId, setNewReportId] = useState<string | null>(null);
  const [isLandingRecents, setIsLandingRecents] = useState(false);
  const [panelCallout, setPanelCallout] = useState<{ section: string; message: string } | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const panelCalloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPanelStageRef = useRef(panelStage);
  const chatSwipeTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const chatBodyRef = useRef<HTMLElement | null>(null);
  const mobilePanelHandleRef = useRef<HTMLDivElement | null>(null);
  const panelDragRef = useRef<{ startY: number; startH: number } | null>(null);
  const [msgPage, setMsgPage] = useState(0);
  const msgPageRef = useRef(0);
  const totalMsgPagesRef = useRef(1);
  const chatPagesTrackRef = useRef<HTMLDivElement | null>(null);

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

  const PAGE_SIZE = 4;
  const msgPages = useMemo(() => {
    const pages: ChatItem[][] = [];
    for (let i = 0; i < items.length; i += PAGE_SIZE) {
      pages.push(items.slice(i, i + PAGE_SIZE));
    }
    if (pages.length === 0) pages.push([]);
    return pages;
  }, [items]);

  // Mark as mounted so portals can render (prevents hydration mismatch)
  useEffect(() => { setMounted(true); }, []);

  // Bloquear scroll/bounce/resize en el body cuando esta la pagina del agente
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = 'hidden';
    html.style.position = 'fixed';
    html.style.inset = '0';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.inset = '0';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = '';
      html.style.position = '';
      html.style.inset = '';
      html.style.overscrollBehavior = '';
      body.style.overflow = '';
      body.style.position = '';
      body.style.inset = '';
      body.style.overscrollBehavior = '';
    };
  }, []);

  // Fix teclado virtual iOS/Android: ajusta --visual-vh al viewport visible real
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty('--visual-vh', `${vv.height}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // Drag continuo en panel mobile: arrastra el handle para ajustar altura
  useEffect(() => {
    const handle = mobilePanelHandleRef.current;
    const panel = panelScrollRef.current;
    if (!handle || !panel) return;

    const SNAP_CLOSED = 128;
    const SNAP_OPEN = Math.round(window.innerHeight * 0.52);

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const currentH = panel.getBoundingClientRect().height;
      panelDragRef.current = { startY: touch.clientY, startH: currentH };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!panelDragRef.current) return;
      const touch = e.touches[0];
      const dy = panelDragRef.current.startY - touch.clientY; // positivo = arrastrar hacia arriba
      const newH = Math.max(80, Math.min(SNAP_OPEN + 20, panelDragRef.current.startH + dy));
      (panel as HTMLElement).style.setProperty('--mobile-panel-h', `${newH}px`);
      (panel as HTMLElement).style.flexBasis = `${newH}px`;
    };

    const onTouchEnd = () => {
      if (!panelDragRef.current) return;
      const currentH = panel.getBoundingClientRect().height;
      const snapToOpen = currentH > (SNAP_CLOSED + SNAP_OPEN) / 2;
      const finalH = snapToOpen ? SNAP_OPEN : SNAP_CLOSED;
      (panel as HTMLElement).style.flexBasis = '';
      (panel as HTMLElement).style.removeProperty('--mobile-panel-h');
      setMobilePanelExpanded(snapToOpen);
      // Actualizar la variable CSS en el layout
      const layout = panel.closest('.agent-layout') as HTMLElement | null;
      if (layout) {
        layout.classList.toggle('mobile-panel-expanded', snapToOpen);
      }
      panelDragRef.current = null;
    };

    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    handle.addEventListener('touchmove', onTouchMove, { passive: true });
    handle.addEventListener('touchend', onTouchEnd);
    return () => {
      handle.removeEventListener('touchstart', onTouchStart);
      handle.removeEventListener('touchmove', onTouchMove);
      handle.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Load sheets from API on mount
  useEffect(() => {
    loadSheets().then((data) => {
      if (data?.sheets && Array.isArray(data.sheets) && data.sheets.length > 0) {
        // Migrate saved sheets to current type
        const restored: ChatThread[] = data.sheets.map((s: any) => ({
          id: s.id ?? `chat-${Date.now()}`,
          label: s.label ?? '1',
          name: s.name ?? 'Conversación',
          autoNamed: s.autoNamed ?? false,
          items: Array.isArray(s.items) ? s.items : [],
          draft: s.draft ?? '',
          status: s.status ?? 'active',
          contextScore: s.contextScore ?? 0,
          userMessageCount: s.userMessageCount ?? 0,
          createdAt: s.createdAt ?? new Date().toISOString(),
          completedAt: s.completedAt,
        }));
        // Ensure base sheets chat-1..3 always exist (pad missing ones)
        const BASE_IDS = ['chat-1', 'chat-2', 'chat-3'] as const;
        for (const bid of BASE_IDS) {
          if (!restored.find((s) => s.id === bid)) {
            const idx = BASE_IDS.indexOf(bid);
            restored.splice(idx, 0, makeInitialThread(bid, String(idx + 1), 'Nueva conversación'));
          }
        }
        setChatThreads(restored);
        const activeSheet = restored.find((s) => s.status === 'active');
        if (activeSheet) setActiveChatId(activeSheet.id);
      }
      setSheetsLoaded(true);
    }).catch(() => setSheetsLoaded(true));
  }, []);

  // Load welcome message after sheets loaded + session info
  const welcomeLoadedRef = useRef(false);
  useEffect(() => {
    if (!sheetsLoaded || welcomeLoadedRef.current) return;
    // Check if active thread has no messages
    const active = chatThreads.find((t) => t.id === activeChatId);
    if (!active || active.items.length > 0) return;
    welcomeLoadedRef.current = true;
    getWelcomeMessage().then((data) => {
      if (data?.message) {
        setChatThreads((prev) =>
          prev.map((t) =>
            t.id === activeChatId
              ? {
                  ...t,
                  items: [
                    {
                      type: 'message',
                      role: 'assistant',
                      content: data.message,
                      mode: 'information',
                      suggested_replies: [
                        'Simular mis ahorros actuales',
                        'Revisar mi presupuesto',
                        'Ver tasas actuales en Chile',
                        'Entender mis deudas',
                      ],
                    } as ChatItem,
                  ],
                }
              : t
          )
        );
      }
    }).catch(() => {});
  }, [sheetsLoaded, chatThreads, activeChatId]);

  // Save sheets to API with debounce whenever they change
  useEffect(() => {
    if (!sheetsLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Save only serializable parts (no functions)
      const toSave = chatThreads.map((t) => ({
        id: t.id,
        label: t.label,
        name: t.name,
        autoNamed: t.autoNamed,
        items: t.items,
        draft: t.draft,
        status: t.status,
        contextScore: t.contextScore,
        userMessageCount: t.userMessageCount,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      }));
      saveSheets(toSave).catch(() => {});
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [chatThreads, sheetsLoaded]);

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

  // Sheet-based progress: 3 base sheets × 50 msgs each = 100%
  const sheetProgress = useMemo(() => {
    const BASE_IDS = ['chat-1', 'chat-2', 'chat-3'];
    const baseSheets = chatThreads.filter((t) => BASE_IDS.includes(t.id));
    const completedCount = baseSheets.filter((t) => t.status === 'context').length;
    const activeSheet = baseSheets.find((t) => t.status === 'active');
    const activeContrib = activeSheet ? Math.min(activeSheet.userMessageCount / 50, 1) / 3 : 0;
    return Math.min(100, Math.round((completedCount / 3 + activeContrib) * 100));
  }, [chatThreads]);

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
      const parsed = JSON.parse(raw) as Partial<ChatThread>[];
      if (!Array.isArray(parsed)) return;
      const sanitized: ChatThread[] = parsed.map((thread, idx) => ({
        id: thread.id || `chat-${idx + 1}`,
        label: thread.label || String(idx + 1),
        name: typeof thread.name === 'string' && thread.name.trim().length > 0 ? thread.name : `Chat ${idx + 1}`,
        autoNamed: Boolean(thread.autoNamed),
        items: Array.isArray(thread.items) ? thread.items : [],
        draft: typeof thread.draft === 'string' ? thread.draft : '',
        status: thread.status ?? 'active',
        contextScore: thread.contextScore ?? 0,
        userMessageCount: thread.userMessageCount ?? 0,
        createdAt: thread.createdAt ?? new Date().toISOString(),
        completedAt: thread.completedAt,
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

  // Sync msgPage refs for event handler closures
  useEffect(() => { msgPageRef.current = msgPage; }, [msgPage]);
  useEffect(() => { totalMsgPagesRef.current = msgPages.length; }, [msgPages.length]);

  // Auto-advance to last page when new messages arrive
  useEffect(() => {
    setMsgPage(Math.max(0, msgPages.length - 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgPages.length]);

  // Reset to last page when switching chat threads
  useEffect(() => {
    setMsgPage(Math.max(0, msgPages.length - 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  // Native touch listeners for horizontal swipe — navigates message pages
  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let isHorizontal = false;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontal = false;
      const track = chatPagesTrackRef.current;
      if (track) track.style.transition = 'none';
    };
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!isHorizontal && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (!isHorizontal) {
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!isHorizontal) return;
      const track = chatPagesTrackRef.current;
      if (track) {
        track.style.transform = `translateX(calc(-${msgPageRef.current * 100}% + ${dx}px))`;
      }
    };
    const onEnd = (e: TouchEvent) => {
      const track = chatPagesTrackRef.current;
      if (track) track.style.transition = '';
      if (!isHorizontal) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(6);
        setMsgPage((prev) => {
          const total = totalMsgPagesRef.current;
          if (dx < 0) return Math.min(prev + 1, total - 1);
          return Math.max(prev - 1, 0);
        });
      } else {
        if (track) track.style.transform = `translateX(-${msgPageRef.current * 100}%)`;
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Haptic feedback — usa Vibration API si esta disponible (Android/algunos iOS PWA)
  function haptic(pattern: number | number[] = 10) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  async function onSend() {
    if (!input.trim() || loading) return;
    haptic(8); // feedback al enviar mensaje

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

    // Increment user message count for sheet cycling
    setChatThreads((prev) =>
      prev.map((t) =>
        t.id === activeChatId
          ? { ...t, userMessageCount: t.userMessageCount + 1 }
          : t
      )
    );

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
          milestone_details: milestones.map((m) => ({ id: m.id, label: m.label, done: m.done })),
          reports_count: savedReports.length,
          has_profile: Boolean(sessionInfo?.injectedProfile || profile),
          has_intake: Boolean(sessionInfo?.injectedIntake),
          budget_summary: {
            income: budgetTotals.income,
            expenses: budgetTotals.expenses,
            balance: budgetTotals.balance,
            rows_count: budgetRows.filter((r) => r.amount > 0).length,
          },
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

      // Handle panel action from agent
      if (res?.panel_action && (res.panel_action.section || res.panel_action.message)) {
        handlePanelAction(res.panel_action);
      }

      // Handle budget updates inferred by agent from conversation
      if (Array.isArray(res?.budget_updates) && res.budget_updates.length > 0) {
        setBudgetRows((prev) => {
          const updated = [...prev];
          for (const upd of res.budget_updates!) {
            // Try to find existing row with same label (case-insensitive)
            const existingIdx = updated.findIndex(
              (r) => r.type === upd.type && r.note.toLowerCase().includes(upd.label.toLowerCase())
            );
            if (existingIdx >= 0) {
              // Update existing row amount
              updated[existingIdx] = { ...updated[existingIdx], amount: upd.amount };
            } else {
              // Add new row
              updated.push({
                id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                category: upd.category ?? (upd.type === 'income' ? 'Ingresos' : 'Gastos'),
                type: upd.type,
                amount: upd.amount,
                note: upd.label,
              });
            }
          }
          return updated;
        });
      }

      // Update context score + check sheet cycling (50-message limit per sheet)
      if (typeof res?.context_score === 'number') {
        setChatThreads((prev) => {
          const updated = prev.map((t) => {
            if (t.id !== activeChatId) return t;
            const newScore = Math.max(t.contextScore, res.context_score!);
            const shouldCycle = t.userMessageCount >= 50 && t.status === 'active';
            if (shouldCycle) {
              // Auto-switch to next available base sheet (chat-1/2/3)
              const BASE_IDS = ['chat-1', 'chat-2', 'chat-3'];
              const nextSheet = prev.find((s) => BASE_IDS.includes(s.id) && s.status === 'active' && s.id !== t.id);
              if (nextSheet) {
                setTimeout(() => setActiveChatId(nextSheet.id), 0);
              } else {
                // All 3 base sheets complete — trigger meta-sheet after brief delay
                setTimeout(() => generateMetaSheet(prev), 600);
              }
              return { ...t, status: 'context' as const, contextScore: newScore, completedAt: new Date().toISOString() };
            }
            return { ...t, contextScore: newScore };
          });
          return updated;
        });
      }

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
    sourceRect?: DOMRect,
    previewUrl?: string,
    reportId?: string
  ) {
    if (!sourceRect) return;

    // 1 — Open the panel if collapsed, pointing to stage 2 (medium)
    setPanelStage((prev) => (prev === 3 ? 2 : prev));

    // Small delay so panel starts opening before we measure target position
    window.setTimeout(() => {
      const targetEl = recentLibraryRef.current;
      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();

      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;
      // Land in the top-left quadrant of the recents grid (like placing on a stack)
      const endX = targetRect.left + Math.min(80, targetRect.width * 0.28);
      const endY = targetRect.top + targetRect.height * 0.45;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      setDocFlight({
        id,
        label,
        previewUrl,
        startX,
        startY,
        endX,
        endY,
        running: false,
      });

      // Start flight on next frame (gives browser time to mount the element)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setDocFlight((prev) =>
            prev && prev.id === id ? { ...prev, running: true } : prev
          );
        });
      });

      // When flight lands: trigger recents landing effect + item entry animation
      window.setTimeout(() => {
        setDocFlight((prev) => (prev && prev.id === id ? null : prev));

        // Highlight the recents block
        setIsLandingRecents(true);
        window.setTimeout(() => setIsLandingRecents(false), 1200);

        // Mark the new item for its entry animation
        if (reportId) {
          setNewReportId(reportId);
          window.setTimeout(() => setNewReportId(null), 1800);
        }

        // Scroll the panel to show recents
        if (panelScrollRef.current && recentLibraryRef.current) {
          const panelEl = panelScrollRef.current;
          const cardEl = recentLibraryRef.current;
          const panelRect = panelEl.getBoundingClientRect();
          const cardRect = cardEl.getBoundingClientRect();
          const scrollTarget = panelEl.scrollTop + (cardRect.top - panelRect.top) - 16;
          panelEl.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }

        // Auto-expand mobile panel so user sees the PDF land in recents
        setMobilePanelExpanded(true);
      }, 920);
    }, 80);
  }

  async function generateMetaSheet(sheets: ChatThread[]) {
    const BASE_IDS = ['chat-1', 'chat-2', 'chat-3'];
    const contextSheets = sheets.filter((s) => BASE_IDS.includes(s.id) && s.status === 'context');
    if (contextSheets.length < 3) return;
    // Already have meta sheet?
    if (sheets.find((s) => s.id === 'meta-sheet')) return;

    const metaSheet = makeInitialThread('meta-sheet', '★', 'Hoja maestra');
    setChatThreads((prev) => [...prev, metaSheet]);
    setActiveChatId('meta-sheet');

    // Build a rich context summary from the 3 sheets
    const contextSummary = contextSheets
      .map((s) => {
        const msgs = s.items
          .filter((it) => it.type === 'message')
          .slice(-12)
          .map((it) => `[${(it as any).role}]: ${((it as any).content ?? '').slice(0, 300)}`)
          .join('\n');
        return `=== Hoja "${s.name}" ===\n${msgs}`;
      })
      .join('\n\n');

    try {
      const res = (await sendToAgent({
        user_message: `SISTEMA: Se han completado las 3 hojas de conversación. Genera un resumen ejecutivo personalizado que integre todo el contexto recopilado, los objetivos identificados, el perfil financiero del usuario y una hoja de ruta de recomendaciones de alto impacto para esta nueva hoja maestra. Contexto de las 3 hojas:\n${contextSummary}`,
        session_id: getSessionId(),
        history: [],
        context: { meta_sheet_init: true },
        ui_state: { meta_sheet: true },
        preferences: { response_style: 'professional', language: 'es-CL' },
      })) as AgentResponse;

      const items = toChatItemsFromAgentResponse(res);
      const toAdd = items.length > 0 ? items : [{
        type: 'message' as const,
        role: 'assistant' as const,
        content: res.message ?? 'Hoja maestra inicializada.',
        mode: res.mode ?? 'synthesis',
      }];
      setChatThreads((prev) =>
        prev.map((t) => t.id === 'meta-sheet' ? { ...t, items: toAdd } : t)
      );
    } catch {}
  }

  function openRealtimeMode() {
    if (!bubblePosInitRef.current) {
      setBubblePos({ x: window.innerWidth - 280, y: window.innerHeight - 120 });
      bubblePosInitRef.current = true;
    }
    setIsRealtimeOpen(true);
    setRealtimeHistory([]);
    setRealtimeTranscript('');
  }

  function onBubbleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    // Only drag on the bubble itself, not on buttons inside
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const orig = { ...bubblePos };
    bubbleDragRef.current = { startX: e.clientX, startY: e.clientY, origX: orig.x, origY: orig.y };

    const onMove = (ev: MouseEvent) => {
      if (!bubbleDragRef.current) return;
      setBubblePos({
        x: bubbleDragRef.current.origX + (ev.clientX - bubbleDragRef.current.startX),
        y: bubbleDragRef.current.origY + (ev.clientY - bubbleDragRef.current.startY),
      });
    };
    const onUp = () => {
      bubbleDragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function handlePanelAction(action: { section?: string; message?: string }) {
    const section = action.section;
    const message = action.message;
    if (!section && !message) return;

    // 1 — Abre el panel si está colapsado (desktop + mobile)
    setPanelStage((prev) => (prev === 3 ? 2 : prev));
    setMobilePanelExpanded(true);

    // 2 — Destaca la sección
    if (section) {
      setHighlightedSection(section);
      window.setTimeout(() => setHighlightedSection(null), 4500);
    }

    // 3 — Muestra callout con mensaje del agente
    if (message && section) {
      // Cancela timer anterior si había uno
      if (panelCalloutTimerRef.current) clearTimeout(panelCalloutTimerRef.current);
      setPanelCallout({ section, message });
      // Auto-dismiss después de 7 segundos
      panelCalloutTimerRef.current = setTimeout(() => {
        setPanelCallout(null);
        panelCalloutTimerRef.current = null;
      }, 7000);
    }

    // 4 — Scroll al bloque objetivo dentro del panel (breve delay para que abra)
    if (section && panelScrollRef.current) {
      window.setTimeout(() => {
        const target = panelScrollRef.current?.querySelector(`[data-panel-section="${section}"]`);
        if (target && panelScrollRef.current) {
          const panelRect = panelScrollRef.current.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const scrollTarget = panelScrollRef.current.scrollTop + (targetRect.top - panelRect.top) - 12;
          panelScrollRef.current.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
        }
      }, 180);
    }
  }

  function closeRealtimeMode() {
    setIsRealtimeOpen(false);
    setRealtimeSpeaking(false);
    setRealtimeListening(false);
    if (realtimeRecognitionRef.current) {
      try { realtimeRecognitionRef.current.stop(); } catch {}
      realtimeRecognitionRef.current = null;
    }
  }

  async function sendRealtimeMessage(text: string) {
    if (!text.trim()) return;
    const userText = text.trim();
    setRealtimeHistory((prev) => [...prev, { role: 'user', text: userText }]);
    setRealtimeTranscript('');
    setRealtimeSpeaking(true);

    // Write user message to active chat sheet
    setItemsForActive((prev) => [
      ...prev,
      { type: 'message', role: 'user', content: `🎙 ${userText}` },
    ]);
    setChatThreads((prev) =>
      prev.map((t) => t.id === activeChatId ? { ...t, userMessageCount: t.userMessageCount + 1 } : t)
    );

    try {
      const res = (await sendToAgent({
        user_message: userText,
        session_id: getSessionId(),
        history: realtimeHistory.slice(-6).map((h) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.text,
        })),
        context: {},
        ui_state: { realtime_mode: true },
        preferences: { response_style: 'concise', language: 'es-CL' },
      })) as any;

      const agentText = res?.message ?? 'No pude generar una respuesta.';
      setRealtimeHistory((prev) => [...prev, { role: 'agent', text: agentText }]);

      // Write agent response to active chat sheet
      setItemsForActive((prev) => [
        ...prev,
        { type: 'message', role: 'assistant', content: agentText, mode: 'conversacion' },
      ]);

      // TTS — voz juvenil y simpática (misma configuración que modo entrevista)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utt = new SpeechSynthesisUtterance(agentText.slice(0, 500));
        utt.lang = 'es-CL';
        utt.rate = 1.3;
        utt.pitch = 1.1;
        utt.volume = 1;
        // Prefer Google Neural / Natural / Premium voices — más naturales y juveniles
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith('es') && /Google|Natural|Premium|Paulina/i.test(v.name)) ||
          voices.find((v) => v.lang === 'es-CL') ||
          voices.find((v) => v.lang.startsWith('es')) ||
          null;
        if (preferred) utt.voice = preferred;
        utt.onend = () => setRealtimeSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);
      } else {
        setRealtimeSpeaking(false);
      }
    } catch {
      setRealtimeSpeaking(false);
      setRealtimeHistory((prev) => [...prev, { role: 'agent', text: 'Ocurrió un error. Intenta de nuevo.' }]);
    }
  }

  function startRealtimeListen() {
    haptic(realtimeListening ? [10, 10, 10] : 20); // triple para detener, largo para iniciar
    if (realtimeListening) {
      if (realtimeRecognitionRef.current) {
        try { realtimeRecognitionRef.current.stop(); } catch {}
      }
      setRealtimeListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'es-CL';
    rec.interimResults = true;
    rec.continuous = false;
    realtimeRecognitionRef.current = rec;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setRealtimeTranscript(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        sendRealtimeMessage(transcript);
      }
    };
    rec.onend = () => setRealtimeListening(false);
    rec.start();
    setRealtimeListening(true);
  }

  function switchChatBySwipe(direction: 'left' | 'right') {
    const ids = chatThreads.map((t) => t.id);
    const currentIdx = ids.indexOf(activeChatId);
    const nextIdx = direction === 'left'
      ? Math.min(currentIdx + 1, ids.length - 1)
      : Math.max(currentIdx - 1, 0);
    if (nextIdx === currentIdx) return;
    setChatSlideDir(direction);
    setActiveChatId(ids[nextIdx]);
    setTimeout(() => setChatSlideDir(null), 320);
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

  function renderChatItem(it: ChatItem, i: number) {
    if (it.type === 'message') {
      if (it.role === 'assistant') {
        const isScrollable = shouldEnableBubbleScroll(it.content);
        return (
          <div
            key={i}
            className={`agent-bubble assistant latex-doc ${isScrollable ? 'is-scrollable-bubble' : ''}`}
          >
            <div className="latex-doc-head">
              <span className="latex-doc-title">Informe del agente</span>
              <span className="latex-doc-mode">
                {(it.mode ?? agentMetaRef.current.mode ?? 'analysis').toString().replaceAll('_', ' ')}
              </span>
            </div>
            <div className={`latex-doc-body ${isScrollable ? 'is-scrollable-content' : ''}`}>
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
          className={`agent-bubble ${it.role} ${isScrollable ? 'is-scrollable-bubble' : ''}`}
        >
          {it.content}
        </div>
      );
    }
    if (it.type === 'artifact') {
      return (
        <div key={i} className="agent-bubble assistant artifact">
          <DocumentBubble
            artifact={it.artifact}
            onSaved={({ artifact, publicUrl, sourceRect }) => {
              const reportId = `${artifact.id}-${Date.now()}`;
              const report: SavedReport = {
                id: reportId,
                title: artifact.title,
                group: classifyReportGroup(artifact.title, artifact.source),
                fileUrl: publicUrl,
                createdAt: new Date().toISOString(),
              };
              setSavedReports((prev) => [report, ...prev.filter((r) => r.fileUrl !== publicUrl)]);
              launchDocToLibraryAnimation(artifact.title, sourceRect, artifact.previewImageUrl ?? publicUrl, reportId);
            }}
          />
        </div>
      );
    }
    if (it.type === 'citation') {
      return (
        <div key={i} className="agent-bubble assistant citation">
          <CitationBubble citation={it.citation} />
        </div>
      );
    }
    return null;
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
      } ${
        mobilePanelExpanded ? 'mobile-panel-expanded' : ''
      }`}
    >
      <section
        ref={chatBodyRef as React.RefObject<HTMLElement>}
        className={`agent-chat active-chat-${activeThread?.label ?? '1'}${chatSlideDir ? ` chat-slide-${chatSlideDir}` : ''}`}
      >
        <header className="agent-chat-header">
          <div className="agent-chat-controls-row">
            <div className="chat-switcher" aria-label="Selector de chats">
              {chatThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`chat-sheet-tab${thread.id === activeChatId ? ' is-active' : ''}${thread.status === 'context' ? ' is-context' : ''}`}
                  onClick={() => setActiveChatId(thread.id)}
                  title={thread.status === 'context' ? `Contexto: ${thread.name}` : `Chat ${thread.label}: ${thread.name}`}
                >
                  {thread.status === 'context' ? '◆' : thread.label}
                </button>
              ))}
              {/* No manual new-sheet button — sheets are fixed to 3 + optional meta sheet */}
            </div>
            {/* Context score progress bar */}
            {activeThread && activeThread.contextScore > 0 && (
              <div className="sheet-context-bar" title={`Contexto: ${activeThread.contextScore}%`}>
                <div className="sheet-context-fill" style={{ width: `${activeThread.contextScore}%` }} />
                <span className="sheet-context-label">{activeThread.contextScore}% contexto</span>
                {activeThread.contextScore >= 80 && (
                  <span className="sheet-context-badge">Rico</span>
                )}
              </div>
            )}
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
              <button
                type="button"
                className="layout-mode-toggle mobile-preview-toggle"
                onClick={() => setIsMobilePreview((v) => !v)}
                title={isMobilePreview ? 'Cerrar vista mobile' : 'Ver en vista mobile'}
                aria-label="Ver en vista mobile"
              >
                📱
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
          {/* Paginated message track — 4 items per page, swipe left/right to navigate */}
          <div className="chat-pages-outer">
            <div
              ref={chatPagesTrackRef}
              className="chat-pages-track"
              style={{ transform: `translateX(-${msgPage * 100}%)` }}
            >
              {msgPages.map((pageItems, pageIdx) => (
                <div key={`page-${pageIdx}`} className="agent-thread chat-page">
                  {pageItems.map((it, localIdx) =>
                    renderChatItem(it, pageIdx * PAGE_SIZE + localIdx)
                  )}

                  {/* Suggested replies + loading only on last page */}
                  {pageIdx === msgPages.length - 1 && !loading && (() => {
                    const lastAssistant = [...items].reverse().find(
                      (it) => it.type === 'message' && it.role === 'assistant'
                    ) as Extract<(typeof items)[number], { type: 'message'; role: 'assistant' }> | undefined;
                    if (!lastAssistant?.suggested_replies?.length) return null;
                    return (
                      <div className="suggested-replies">
                        {lastAssistant.suggested_replies.map((reply, idx) => (
                          <button
                            key={`${reply}-${idx}`}
                            type="button"
                            className="suggestion-chip"
                            onClick={() => {
                              setDraftForActive(reply);
                              setTimeout(() => onSend(), 80);
                            }}
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {pageIdx === msgPages.length - 1 && loading && (
                    <div className="agent-bubble assistant thinking-bubble">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          {/* Page indicator dots — inside pager outer for position:absolute anchor */}
          {msgPages.length > 1 && (
            <div className="chat-page-dots">
              {msgPages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Página ${i + 1}`}
                  className={`chat-page-dot${i === msgPage ? ' active' : ''}`}
                  onClick={() => setMsgPage(i)}
                />
              ))}
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
                className="continue-button realtime-btn"
                onClick={openRealtimeMode}
                title="Abrir modo conversación en tiempo real"
              >
                Hablar en tiempo real
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
        {/* Compact circular progress button */}
        {/* Full-height interactive rail card */}
        <button
          type="button"
          className={`knowledge-rail-card ${progressPulse ? 'is-level-up' : ''}`}
          onClick={() => setKnowledgePopupOpen((v) => !v)}
          aria-label={`Conocimiento ${knowledgeScore}% — ver hitos`}
          title="Ver mapa de conocimiento"
          style={{ '--rail-glow-h': `${knowledgeScore}%` } as React.CSSProperties}
        >
          {/* Rotated label */}
          <span className="knowledge-rail-label">Conoc.</span>

          {/* Vertical progress track with milestone dots */}
          <div className="knowledge-rail-track-wrap">
            <div className="knowledge-rail-track">
              <div
                className="knowledge-rail-fill"
                style={{ height: `${knowledgeScore}%` }}
              />
              {milestones.map((m, i) => {
                const isNext = !m.done && milestones.slice(0, i).every((prev) => prev.done);
                return (
                  <div
                    key={m.id}
                    className={`knowledge-rail-dot${m.done ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}
                    style={{
                      bottom: `${(i / Math.max(milestones.length - 1, 1)) * 100}%`,
                    }}
                    title={m.label}
                  />
                );
              })}
            </div>
          </div>

          {/* Score */}
          <div className="knowledge-rail-score">
            <span className="knowledge-rail-value">{knowledgeScore}%</span>
            <span className="knowledge-rail-stage">{knowledgeStage}</span>
          </div>

          {/* Milestones count */}
          <span className="knowledge-rail-meta">
            {completedMilestones}/{milestones.length}
          </span>

          {/* Click hint */}
          <span className="knowledge-rail-cta">hitos</span>

          {/* Level-up toast */}
          {levelUpText && (
            <span className="knowledge-level-up" role="status">
              {levelUpText}
            </span>
          )}
        </button>

        {/* Floating popup */}
        {knowledgePopupOpen && (
          <>
            <div
              className="knowledge-popup-backdrop"
              onClick={() => setKnowledgePopupOpen(false)}
            />
            <div className="knowledge-popup" role="dialog" aria-label="Mapa de conocimiento">
              <div className="knowledge-popup-header">
                <div className="knowledge-popup-score">
                  <span className="knowledge-popup-pct">{knowledgeScore}%</span>
                  <span className="knowledge-popup-stage">{knowledgeStage}</span>
                  <div className="knowledge-popup-bar">
                    <div
                      className="knowledge-popup-bar-fill"
                      style={{ width: `${knowledgeScore}%` }}
                    />
                  </div>
                </div>
                <span className="knowledge-popup-meta">
                  {completedMilestones}/{milestones.length}<br />hitos
                </span>
              </div>
              <div className="knowledge-popup-milestones">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`knowledge-popup-milestone ${milestone.done ? 'is-done' : ''}`}
                  >
                    <div className="knowledge-popup-check">
                      <svg className="knowledge-popup-check-icon" viewBox="0 0 10 8">
                        <polyline points="1,4 4,7 9,1" />
                      </svg>
                    </div>
                    <span className="knowledge-popup-milestone-text">
                      {milestone.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Mobile subtitle — visible only on mobile via CSS */}
        <div className="mobile-rail-subtitle">
          <span className="mobile-rail-subtitle-title">
            {sessionInfo?.name?.split(' ')[0] ?? 'Financieramente'}
          </span>
          <span className="mobile-rail-subtitle-badge">{knowledgeStage}</span>
          {sessionInfo?.hasIntake && (
            <span className="mobile-rail-subtitle-memory">● perfil activo</span>
          )}
        </div>
      </aside>

      <aside className="agent-panel" ref={panelScrollRef as React.RefObject<HTMLElement>}>
        {/* Mobile: always-visible strip handle + expand toggle */}
        <div
          ref={mobilePanelHandleRef}
          className="mobile-panel-handle"
          onClick={() => { haptic(12); setMobilePanelExpanded((v) => !v); }}
          role="button"
          tabIndex={0}
          aria-label={mobilePanelExpanded ? 'Minimizar panel' : 'Expandir panel'}
        >
          <span className="mobile-panel-handle-title">⊞ Panel</span>
          <svg
            className={`mobile-panel-chevron${mobilePanelExpanded ? ' rotated' : ''}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            aria-hidden="true"
          >
            <path d="M4 10L8 6L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* Desktop: close button (hidden on mobile) */}
        <div className="mobile-panel-close">
          <button
            type="button"
            className="mobile-panel-close-btn"
            onClick={() => setMobileTab('chat')}
            aria-label="Volver al chat"
          >
            ← Chat
          </button>
          <span className="mobile-panel-close-title">Panel</span>
        </div>
        {/* Panel callout — mensaje del agente señalando una sección */}
        {panelCallout && (
          <div className={`panel-callout panel-callout-${panelCallout.section}`}>
            <div className="panel-callout-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="10" cy="10" r="8" />
                <path d="M10 6v4l2.5 2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="panel-callout-content">
              <span className="panel-callout-tag">Agente</span>
              <p className="panel-callout-msg">{panelCallout.message}</p>
            </div>
            <button
              type="button"
              className="panel-callout-close"
              onClick={() => setPanelCallout(null)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="panel-callout-progress" />
          </div>
        )}

        <div
          className={`panel-grid ${
            isPanelCollapsed ? 'is-compact-grid' : ''
          }`}
        >
          <div className="mob-col mob-col-wide">
            <ProfileCard
              className={`panel-pos-profile${highlightedSection === 'profile' ? ' is-panel-highlighted' : ''}`}
              data-panel-section="profile"
              userName={sessionInfo?.name ?? undefined}
              profile={
                sessionInfo?.injectedProfile
                  ? { profile: sessionInfo.injectedProfile }
                  : profile
              }
              injected={Boolean(sessionInfo?.injectedProfile)}
            />
          </div>

          <div className="mob-col mob-col-wide">
            <PanelCard
              label="Objetivo activo"
              className={`panel-pos-objective panel-flow-gradient${highlightedSection === 'objective' ? ' is-panel-highlighted' : ''}`}
              data-panel-section="objective"
              bgImage="/fondo8.png"
              overlayColor="154,148,148"
              overlayOpacity={0.18}
              bgScale={1.2}
              bgPosition="center"
            >
              {agentMetaRef.current.objective ??
                'Conversa para que el agente defina un objetivo de alto impacto.'}
            </PanelCard>
          </div>

          <div className="mob-col">
            <PanelCard
              label="Modo cognitivo"
              value={agentMetaRef.current.mode ?? 'En calibracion'}
              className={`panel-pos-mode panel-mode-cognitive${highlightedSection === 'mode' ? ' is-panel-highlighted' : ''}`}
              data-panel-section="mode"
              bgImage="/image3.png"
              overlayOpacity={0.28}
              bgScale={1}
              dataMode={agentMetaRef.current.mode ?? 'calibracion'}
            />
          </div>

          <div className="mob-col">
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
          </div>

          <div className="mob-col mob-col-wide">
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
          </div>

          <div className="mob-col">
            <button
              type="button"
              data-panel-section="budget"
              className={`panel-feature-card panel-pos-budget ${unlockedPanelBlocks.budgetUnlocked ? '' : 'is-locked'}${highlightedSection === 'budget' ? ' is-panel-highlighted' : ''}`}
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
          </div>

          <div className="mob-col">
            <button
              type="button"
              data-panel-section="transactions"
              className={`panel-feature-card panel-pos-transactions ${unlockedPanelBlocks.transactionsUnlocked ? '' : 'is-locked'}${highlightedSection === 'transactions' ? ' is-panel-highlighted' : ''}`}
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
          </div>

          <div className="mob-col mob-col-wide">
            <PanelCard
              className={`news-card panel-pos-news${highlightedSection === 'news' ? ' is-panel-highlighted' : ''}`}
              data-panel-section="news"
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
          </div>

          <div className="mob-col mob-col-wide">
            <PanelCard
              label="Biblioteca de documentos"
              className={`panel-pos-library panel-flow-gradient${highlightedSection === 'library' ? ' is-panel-highlighted' : ''}`}
              data-panel-section="library"
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
          </div>

          <div className="mob-col mob-col-wide">
            <div
              ref={recentLibraryRef}
              data-panel-section="recents"
              className={`recent-library-card panel-pos-recent${isLandingRecents ? ' is-landing' : ''}${highlightedSection === 'recents' ? ' is-panel-highlighted' : ''}`}
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
                    className={`recent-item${report.id === newReportId ? ' is-new' : ''}`}
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
          </div>

          <div className="mob-col mob-col-wide">
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
        </div>
      </aside>

      {docFlight && (
        <div
          className={`doc-flight-chip${docFlight.running ? ' is-running' : ''}`}
          style={
            {
              left: `${docFlight.startX}px`,
              top: `${docFlight.startY}px`,
              ['--dx' as any]: `${docFlight.endX - docFlight.startX}px`,
              ['--dy' as any]: `${docFlight.endY - docFlight.startY}px`,
            } as any
          }
        >
          <div className="doc-flight-preview">
            {docFlight.previewUrl ? (
              <embed
                src={`${docFlight.previewUrl}#page=1&view=FitH`}
                type="application/pdf"
                className="doc-flight-embed"
              />
            ) : (
              <div className="doc-flight-placeholder" />
            )}
          </div>
          <span className="doc-flight-label">{docFlight.label}</span>
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

      {/* Floating voice bubble — only renders when open */}
      {mounted && isRealtimeOpen && createPortal(
        <div
          className={`voice-bubble is-open${realtimeListening ? ' is-listening' : ''}${realtimeSpeaking ? ' is-speaking' : ''}`}
          role="dialog"
          aria-label="Llamada en tiempo real"
          style={{ left: bubblePos.x, top: bubblePos.y }}
          onMouseDown={onBubbleMouseDown}
        >
          <div className="voice-bubble-inner">
            {/* Drag handle area — subtle grip indicator */}
            <div className="voice-bubble-drag-handle" />

            {/* Close */}
            <button className="voice-bubble-close" onClick={closeRealtimeMode} aria-label="Cerrar">✕</button>

            {/* Status row */}
            <div className="voice-bubble-status">
              <div className={`voice-status-dot${realtimeListening ? ' is-listening' : realtimeSpeaking ? ' is-speaking' : ''}`} />
              <span className="voice-status-text">
                {realtimeListening ? 'Escuchando...' : realtimeSpeaking ? 'Respondiendo...' : 'Listo para hablar'}
              </span>
              {/* Mic button inline in status row */}
              <button
                type="button"
                className={`voice-mic-btn${realtimeListening ? ' is-active' : ''}`}
                onClick={startRealtimeListen}
                aria-label={realtimeListening ? 'Detener' : 'Hablar'}
              >
                <div className="voice-mic-ring" />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {realtimeListening ? (
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* Waveform visual — siempre presente, visible cuando escucha/habla */}
            <div className="voice-waveform" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="voice-waveform-bar" />
              ))}
            </div>

            {/* Live transcript */}
            {(realtimeHistory.length > 0 || realtimeListening) && (
              <div className="voice-bubble-transcript">
                {realtimeHistory.slice(-4).map((h, idx) => (
                  <div key={idx} className={`voice-transcript-line voice-transcript-${h.role}`}>
                    {h.text}
                  </div>
                ))}
                {realtimeListening && realtimeTranscript && (
                  <div className="voice-transcript-line voice-transcript-user is-interim">
                    {realtimeTranscript}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile preview overlay — desktop only, portaled to body to escape overflow:hidden */}
      {isMobilePreview && mounted && createPortal(
        <div
          className="mobile-preview-overlay"
          onClick={() => setIsMobilePreview(false)}
        >
          <div
            className="mobile-preview-phone"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-preview-bar">
              <span>Vista mobile — 390 × 844</span>
              <button
                type="button"
                onClick={() => setIsMobilePreview(false)}
                className="mobile-preview-close"
              >
                ✕
              </button>
            </div>
            <iframe
              src={window.location.href}
              title="Mobile preview"
              width={390}
              height={844}
              className="mobile-preview-iframe"
            />
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
