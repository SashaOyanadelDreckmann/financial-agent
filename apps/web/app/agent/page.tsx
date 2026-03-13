'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';

import { getSessionId } from '@/lib/session';
import { sendToAgent } from '@/lib/agent';
import { useProfileStore } from '@/state/profile.store';
import {
  getSessionInfo,
  removeInjectedProfile,
  removeInjectedIntake,
} from '@/lib/api';

import PanelCard from '../../components/PanelCard';
import ProfileCard from '../../components/ProfileCard';

import type { AgentResponse, ChatItem } from '@/lib/agent.response.types';
import { toChatItemsFromAgentResponse } from '@/lib/agent.response.types';
import { DocumentBubble } from '@/components/conversation/DocumentBubble';
import { AgentBlocksRenderer } from '@/components/agent/AgentBlocksRenderer';
import { CitationBubble } from '@/components/conversation/CitationBubble';

type AgentMeta = {
  objective?: string;
  mode?: string;
  ui_events?: any[];
  citations?: any[];
};

export default function AgentPage() {
  const router = useRouter();

  /* ================= STATE ================= */

  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);

  const agentMetaRef = useRef<AgentMeta>({});
  const [, forceRender] = useState(0);

  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const loadProfileIfNeeded = useProfileStore((s) => s.loadProfileIfNeeded);
  const profile = useProfileStore((s) => s.profile);

  const lastAssistant = useMemo(() => {
    return [...items]
      .reverse()
      .find(
        (it) => it.type === 'message' && it.role === 'assistant'
      ) as
      | Extract<ChatItem, { type: 'message'; role: 'assistant' }>
      | undefined;
  }, [items]);

  // 👇 CAST DEFENSIVO (solo lectura UI)
  const lastAssistantBlocks =
    (lastAssistant as any)?.agent_blocks ?? [];

  const actionPlans = ['/planes/plan1.pdf', '/planes/plan2.pdf'];

  /* ================= SESSION ================= */

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const info = await getSessionInfo();
        if (alive) setSessionInfo(info);
      } catch {}
    };

    tick();
    const t = setInterval(tick, 5000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    loadProfileIfNeeded().catch(() => {});
  }, [loadProfileIfNeeded]);

  /* ================= CHAT ================= */

  async function onSend() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const historySnapshot = items
      .filter((it) => it.type === 'message')
      .map((m) => ({
        role: (m as any).role,
        content: (m as any).content,
      }))
      .slice(-12);

    setItems((prev) => [
      ...prev,
      { type: 'message', role: 'user', content: userMessage },
    ]);

    try {
      const res = (await sendToAgent({
        user_message: userMessage,
        session_id: getSessionId(),
        history: historySnapshot,
      })) as AgentResponse;

      agentMetaRef.current.objective =
        res?.react?.objective ?? agentMetaRef.current.objective;
      agentMetaRef.current.mode =
        res?.mode ?? agentMetaRef.current.mode;

      forceRender((x) => x + 1);

      const next = toChatItemsFromAgentResponse(res);

      if (next.length === 0) {
        setItems((prev) => [
          ...prev,
          {
            type: 'message',
            role: 'assistant',
            content: (res as any)?.message ?? '—',
            mode: res.mode ?? (res as any).reasoning_mode,
            objective: (res as any)?.react?.objective,
            agent_blocks: (res as any).agent_blocks,
          } as any, // 👈 CAST DEFENSIVO (no rompe contrato global)
        ]);
      } else {
        setItems((prev) => [...prev, ...next]);
      }
    } catch {
      setItems((prev) => [
        ...prev,
        {
          type: 'message',
          role: 'assistant',
          content: 'Ocurrió un error. Intenta nuevamente.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleMic() {
    setMicActive((v) => !v);
  }

  /* ================= RENDER ================= */

  return (
    <main className="agent-layout">
      <section className="agent-chat">
        <header className="agent-chat-header">
          <h1>Financiera — Mente</h1>
          <p className="muted">Asistente financiero interactivo</p>
        </header>

        <div className="agent-chat-body">
          <div className="agent-thread">
            {items.length === 0 && !loading && (
              <div className="agent-bubble assistant muted">
                Puedes comenzar escribiendo una pregunta financiera o una inquietud.
              </div>
            )}

            {items.map((it, i) => {
              if (it.type === 'message') {
                return (
                  <div key={i} className={`agent-bubble ${it.role}`}>
                    {it.content}
                  </div>
                );
              }

              if (it.type === 'artifact') {
                return (
                  <div key={i} className="agent-bubble assistant artifact">
                    <DocumentBubble artifact={it.artifact} />
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
            })}

            {/* ✅ AGENT BLOCKS (charts, tablas, etc.) */}
            {lastAssistantBlocks.length > 0 && (
              <div className="agent-bubble assistant">
                <AgentBlocksRenderer blocks={lastAssistantBlocks} />
              </div>
            )}

            {loading && (
              <div className="agent-bubble assistant muted">Pensando…</div>
            )}
          </div>

          <div className="agent-input">
            <textarea
              placeholder="Escribe tu mensaje…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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

              <button type="button" className="continue-button" onClick={onSend}>
                Enviar
              </button>
            </div>

            <div className="hint">
              Presiona <span>Enter</span> para enviar
            </div>
          </div>
        </div>
      </section>

      {/* ================= PANEL ================= */}
      <aside className="agent-panel">
        <div className="panel-grid">
          <ProfileCard
            userName={sessionInfo?.name ?? undefined}
            profile={sessionInfo?.injectedProfile ? { profile: sessionInfo.injectedProfile } : profile}
            injected={Boolean(sessionInfo?.injectedProfile)}
          />

          {sessionInfo?.injectedProfile && (
            <button
              className="continue-ghost"
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
              className="continue-ghost"
              onClick={async () => {
                await removeInjectedIntake();
                window.location.reload();
              }}
            >
              Remover intake inyectado
            </button>
          )}

          {/* OBJETIVO */}
          <PanelCard
            label="Objetivo"
            className="blue x2 y0"
            bgImage="/fondo8.png"
            overlayColor="154,148,148"
            overlayOpacity={0.1228}
            bgScale={4.5}
            bgPosition="290955% 98%"
          >
            {agentMetaRef.current.objective ?? 'Aún no definido'}
          </PanelCard>

          {/* MODO COGNITIVO */}
          <PanelCard
            label="Modo cognitivo"
            value={agentMetaRef.current.mode ?? '—'}
            className="x3 y1"
            bgImage="/image3.png"
            overlayOpacity={0.25}
            bgScale={1}
          />

          {/* COLUMNA TRANSACCIONES + PRESUPUESTO */}
          <div className="finance-dual-stack x1 y0">
            <PanelCard
              label="Transacciones"
              bgImage="/fondo8.png"
              overlayColor="154,148,148"
              overlayOpacity={0.1028}
              bgScale={3.5}
              bgPosition="54455555550% 5%"
            >
              Historial, categorización y análisis de movimientos.
            </PanelCard>

            <PanelCard
              label="Presupuesto"
              bgImage="/fondo8.png"
              overlayColor="154,148,148"
              overlayOpacity={0.19228}
              bgScale={4.5}
              bgPosition="2060% 1%"
            >
              Planificación mensual y control de desvíos.
            </PanelCard>
          </div>

          {/* ENTREVISTA */}
          <PanelCard className="x3 y0 interview-card">
            <a className="interview-link" href="/interview">
              <div className="interview-image">
                <div className="interview-overlay">
                  <span className="interview-title">
                    Entrevista para análisis financiero profundo
                  </span>
                </div>
              </div>
            </a>
          </PanelCard>

          {/* PLANES DE ACCIÓN — PDFs (apilados) */}
          <div
            className="simulations-slot x2 y1"
            onClick={() => router.push('/agent/planes')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push('/agent/planes');
              }
            }}
          >
            <div className="simulations-label">Planes de acción</div>

            <div className="pdf-stack">
              {actionPlans.slice(0, 3).map((pdf, i) => (
                <div key={i} className="pdf-sheet">
                  <embed
                    src={`${pdf}#page=1&view=FitH&zoom=80`}
                    type="application/pdf"
                    className="pdf-sheet"
                  />
                </div>
              ))}
            </div>

            <div className="simulations-meta">{actionPlans.length} planes generados</div>
          </div>

          {/* NOTICIAS */}
          <PanelCard className="news-card x2 y2">
            <a
              href="https://fintualist.com/chile/"
              target="_blank"
              rel="noreferrer"
              className="news-link"
            >
              <div className="news-image">
                <div className="news-overlay">
                  <span className="news-title">Noticias & Actualidad</span>
                </div>
              </div>
            </a>
          </PanelCard>

        

          {/* SEGUIMIENTO PROACTIVO */}
          <PanelCard
            label="Seguimiento proactivo"
            className="x2 y2"
            bgImage="/fondo8.png"
            overlayColor="154,148,148"
            overlayOpacity={0.1228}
            bgScale={3.5}
            bgPosition="20600% 1%"
          >
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Estado, notificaciones y configuración del agente seguimiento
            </div>
          </PanelCard>

      

          {/* SIMULACIONES */}
          <div
            className="simulations-slot x2 y3"
            onClick={() => router.push('/agent/simulaciones')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push('/agent/simulaciones');
              }
            }}
          >
            <div className="simulations-label">Simulaciones</div>
            <div className="simulations-meta">Biblioteca: /public/pdfs/simulaciones</div>
          </div>
          </div>
      </aside>
    </main>
  );
}
