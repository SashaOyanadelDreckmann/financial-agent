'use client';

import React, { useMemo, useState } from 'react';
import type { Artifact } from '@/lib/agent.response.types';
import { downloadFile, savePdfArtifact } from '@/lib/artifacts';

const IconPdf = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="1" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M11 1v5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IconBookmark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 2h8a1 1 0 0 1 1 1v10l-5-3-5 3V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function DocumentBubble({
  artifact,
  onSaved,
}: {
  artifact: Artifact;
  onSaved?: (payload: {
    artifact: Artifact;
    publicUrl: string;
    sourceRect?: DOMRect;
  }) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const openUrl = useMemo(() => savedUrl ?? artifact.fileUrl ?? '', [savedUrl, artifact.fileUrl]);

  const sourceLabel = useMemo(() => {
    if (artifact.source === 'simulation') return 'Simulación';
    if (artifact.source === 'diagnostic') return 'Diagnóstico';
    return 'Análisis';
  }, [artifact.source]);

  const formattedDate = useMemo(() => {
    if (!artifact.createdAt) return null;
    return new Date(artifact.createdAt).toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }, [artifact.createdAt]);

  const onOpen = () => {
    if (!openUrl) return;
    window.open(openUrl, '_blank', 'noopener,noreferrer');
  };

  const onDownload = () => {
    if (!openUrl) return;
    const safeName = (artifact.title || artifact.id || 'documento')
      .toLowerCase()
      .replace(/[^a-z0-9\-_\s]/gi, '')
      .trim()
      .replace(/\s+/g, '-');
    downloadFile(openUrl, `${safeName}.pdf`);
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (!artifact.fileUrl) throw new Error('Este documento aún no tiene URL.');
      const out = await savePdfArtifact(artifact);
      setSavedUrl(out.publicUrl);
      onSaved?.({
        artifact,
        publicUrl: out.publicUrl,
        sourceRect: containerRef.current?.getBoundingClientRect(),
      });
    } catch (e: any) {
      setError(e?.message ?? 'Error guardando el documento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`doc-bubble doc-bubble--${artifact.source ?? 'analysis'} ${artifact.source === 'diagnostic' ? 'is-diagnostic' : ''}`}
      ref={containerRef}
    >
      {/* Header */}
      <div className="doc-bubble-header">
        <div className="doc-bubble-icon">
          <IconPdf />
        </div>
        <div className="doc-bubble-meta">
          <span className="doc-bubble-badge">{sourceLabel}</span>
          <div className="doc-bubble-title">{artifact.title}</div>
          {artifact.description && (
            <div className="doc-bubble-desc">{artifact.description}</div>
          )}
          {formattedDate && (
            <div className="doc-bubble-date">{formattedDate}</div>
          )}
        </div>
      </div>

      {/* Preview thumbnail — image only, no iframe */}
      {artifact.previewImageUrl ? (
        <div className="doc-bubble-preview" onClick={onOpen} role="button" tabIndex={0} title="Abrir documento">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="doc-bubble-preview-img" src={artifact.previewImageUrl} alt="Vista previa del documento" />
        </div>
      ) : artifact.fileUrl ? (
        <div className="doc-bubble-preview doc-bubble-preview--placeholder" onClick={onOpen} role="button" tabIndex={0} title="Abrir documento">
          <div className="doc-bubble-a4-lines" />
          <span className="doc-bubble-preview-hint">Abrir para ver</span>
        </div>
      ) : (
        <div className="doc-bubble-preview doc-bubble-preview--generating">
          <div className="doc-bubble-spinner" />
          <span className="doc-bubble-preview-hint">Generando…</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="doc-bubble-actions">
        <button
          type="button"
          className="doc-bubble-btn"
          onClick={onOpen}
          disabled={!openUrl}
          title="Abrir en nueva pestaña"
        >
          <IconEye />
          <span>Abrir</span>
        </button>
        <button
          type="button"
          className="doc-bubble-btn"
          onClick={onDownload}
          disabled={!openUrl}
          title="Descargar PDF"
        >
          <IconDownload />
          <span>Descargar</span>
        </button>
        <button
          type="button"
          className={`doc-bubble-btn doc-bubble-btn--save ${savedUrl ? 'is-saved' : ''}`}
          onClick={onSave}
          disabled={saving || Boolean(savedUrl)}
          title={savedUrl ? 'Guardado en biblioteca' : 'Guardar en biblioteca'}
        >
          {savedUrl ? <IconCheck /> : <IconBookmark />}
          <span>{savedUrl ? 'Guardado' : saving ? 'Guardando…' : 'Guardar'}</span>
        </button>
      </div>

      {error && <div className="doc-bubble-error">{error}</div>}
    </div>
  );
}
