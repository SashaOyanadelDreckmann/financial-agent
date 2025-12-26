'use client';

import { useEffect, useRef, useState } from 'react';
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

    // 🎙️ Voz más reflexiva que la pregunta
    utterance.lang = 'es-CL';
    utterance.rate = 1.2;   // más lento
    utterance.pitch = 0.85;  // más grave
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
  /* Timing + auto lectura          */
  /* ────────────────────────────── */
  useEffect(() => {
    setShowActions(false);
    setEditing(false);
    setComment('');
    stopSpeaking();

    const estimatedTime = Math.min(
      2000 + summary.length * 18,
      6000
    );

    const t = setTimeout(() => {
      setShowActions(true);
      speakSummary(); // 🔥 lee el resumen automáticamente
    }, estimatedTime);

    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [summary]);

  /* ────────────────────────────── */
  /* Interacciones callan la voz    */
  /* ────────────────────────────── */
  const accept = () => {
    stopSpeaking();
    onAccept();
  };

  const startEditing = () => {
    stopSpeaking();
    setEditing(true);
  };

  const reject = () => {
    stopSpeaking();
    onReject(comment);
  };

  return (
    <div className="interview-shell">
      <div className="interview-column">
        {/* Summary text */}
        <h1 className="text-[24px] md:text-[28px] font-light leading-snug max-w-3xl">
          <TypewriterText text={summary} />
        </h1>

        {/* Actions */}
        {showActions && !editing && (
          <div className="flex flex-col gap-6 pt-14 animate-fade-up">
            <button
              onClick={accept}
              className="continue-ghost visible w-fit"
            >
              Sí, esto refleja mi situación
            </button>

            <button
              onClick={startEditing}
              className="talk-button text-left"
            >
              Quiero ajustar algo
            </button>

            {/* 🔁 Releer resumen */}
            <button
              onClick={speakSummary}
              className="continue-ghost w-fit opacity-70"
            >
              Releer resumen
            </button>
          </div>
        )}

        {/* Edit mode */}
        {showActions && editing && (
          <div className="flex flex-col gap-10 pt-14 animate-fade-up">
            <div className="input-line answer-enter">
              <input
                type="text"
                placeholder="Dime qué debería corregirse…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onFocus={stopSpeaking}
              />
            </div>

            <button
              onClick={reject}
              className="continue-ghost visible w-fit"
            >
              Enviar corrección
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
