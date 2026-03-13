// apps/web/components/conversation/QuestionCard.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TypewriterText } from '@/components/ui/TypewriterText';

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export function QuestionCard({
  question,
  onSubmit,
}: {
  question: string;
  onSubmit: (answer: string) => void;
}) {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ────────────────────────────── */
  /* 🔊 TEXT TO SPEECH (Pregunta)   */
  /* ────────────────────────────── */
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakQuestion = () => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    // Cancela cualquier lectura previa
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(question);

    // 🎙️ Configuración “voz agente senior”
    utterance.lang = 'es-CL'; // fallback automático a es-ES
    utterance.rate = 1.3;    // más humano
    utterance.pitch = 0.9;    // más sobrio
    utterance.volume = 1;

    // Elegir mejor voz disponible
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.lang.startsWith('es') && /Google|Natural|Premium/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith('es')) ||
      null;

    if (preferred) utterance.voice = preferred;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
  };

  /* ────────────────────────────── */
  /* Ritmo visual + auto-voz        */
  /* ────────────────────────────── */
  useEffect(() => {
    setReveal(false);
    setValue('');
    setError(null);

    const delay = Math.min(1200 + question.length * 18, 3200);
    const t = setTimeout(() => {
      setReveal(true);
      speakQuestion(); // 🔥 lee la pregunta automáticamente
    }, delay);

    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [question]);

  /* ────────────────────────────── */
  /* Dictado: cuando habla, calla   */
  /* ────────────────────────────── */
  const startListening = () => {
    stopSpeaking(); // 👈 clave UX
    setListening(true);
    // tu lógica de SR / Whisper sigue igual
  };

  const stopListening = () => {
    setListening(false);
  };

  const submit = () => {
    const clean = value.trim();
    if (!clean) return;
    stopSpeaking();
    onSubmit(clean);
    setValue('');
  };

  return (
    <div className="question-wrapper">
      {/* Pregunta */}
      <h1 className="question-text">
        <TypewriterText text={question} />
      </h1>

      <div className="question-spacer" />

      {/* Respuesta */}
      <div className={`answer-wrapper ${reveal ? 'visible' : 'hidden'}`}>
        <input
          className="answer-input"
          placeholder={listening ? 'Escuchando…' : 'Escribe o habla…'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        {error && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,120,120,0.95)' }}>
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 16,
            alignItems: 'center',
          }}
        >
          <button
            onClick={listening ? stopListening : startListening}
            className={`mic-button ${listening ? 'active' : ''}`}
            type="button"
          >
            {listening ? 'Detener' : 'Hablar'}
          </button>

          {/* 🔁 Repetir pregunta */}
          <button
            onClick={speakQuestion}
            className="continue-ghost"
            type="button"
          >
            Repetir pregunta
          </button>

          {value.trim() && (
            <button
              onClick={submit}
              className="continue-button"
              type="button"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
