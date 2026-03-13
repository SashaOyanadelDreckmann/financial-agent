'use client';

import { useEffect, useState } from 'react';
import { TypewriterText } from '@/components/ui/TypewriterText';

export function SummaryCard({
  summary,
  onAccept,
  onReject,
}: {
  summary: string;
  onAccept: () => void;
  onReject: (comment: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');

  /* ────────────────────────────── */
  /* 🔊 TEXT TO SPEECH (Summary)    */
  /* ────────────────────────────── */
  const speakSummary = () => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = 'es-CL';
    utterance.rate = 1.2;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.lang.startsWith('es') && /Google|Natural|Premium/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith('es')) ||
      null;

    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
  };

  /* ────────────────────────────── */
  /* Ritmo visual + auto-lectura    */
  /* ────────────────────────────── */
  useEffect(() => {
    setShowActions(false);
    setEditing(false);
    setComment('');
    stopSpeaking();

    const delay = Math.min(1800 + summary.length * 18, 5200);
    const t = setTimeout(() => {
      setShowActions(true);
      speakSummary();
    }, delay);

    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [summary]);

  /* ────────────────────────────── */
  /* Acciones                       */
  /* ────────────────────────────── */
  const accept = () => {
    stopSpeaking();
    onAccept();
  };

  const reject = () => {
    stopSpeaking();
    onReject(comment);
  };

  return (
    <div className="question-wrapper">
      {/* ───────────── Resumen ───────────── */}
      <h1 className="question-text text-white/80 text-center">
        <TypewriterText text={summary} />
      </h1>

      <div className="question-spacer" />

      {/* ───────────── Acciones ───────────── */}
      {showActions && !editing && (
        <div className="answer-wrapper visible">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={accept}
              className="continue-button"
              type="button"
            >
              Sí, esto refleja mi situación
            </button>

            <button
              onClick={() => setEditing(true)}
              className="continue-ghost"
              type="button"
            >
              Quiero ajustar algo
            </button>

            <button
              onClick={speakSummary}
              className="continue-ghost opacity-70"
              type="button"
            >
              Releer resumen
            </button>
          </div>
        </div>
      )}

      {/* ───────────── Edición ───────────── */}
      {showActions && editing && (
        <div className="answer-wrapper visible">
          <input
            className="answer-input"
            placeholder="Dime qué debería corregirse…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onFocus={stopSpeaking}
          />

          <div style={{ marginTop: 16 }}>
            <button
              onClick={reject}
              className="continue-button"
              type="button"
              disabled={!comment.trim()}
            >
              Enviar corrección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
