'use client';

import React, { useMemo, useState } from 'react';
import type { Artifact } from '@/lib/agent.response.types';
import { downloadFile, savePdfArtifact } from '@/lib/artifacts';

export function DocumentBubble({ artifact }: { artifact: Artifact }) {
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openUrl = useMemo(() => {
    return savedUrl ?? artifact.fileUrl ?? '';
  }, [savedUrl, artifact.fileUrl]);

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (artifact.source) parts.push(artifact.source === 'simulation' ? 'Simulación' : 'Análisis');
    if (artifact.createdAt) parts.push(new Date(artifact.createdAt).toLocaleString());
    return parts.join(' · ');
  }, [artifact.source, artifact.createdAt]);

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

      // Solo tiene sentido para PDFs con fileUrl
      if (!artifact.fileUrl) throw new Error('Este documento aún no tiene URL.');

      const out = await savePdfArtifact(artifact);
      setSavedUrl(out.publicUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Error guardando el documento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doc-bubble">
      <div className="doc-top">
        <div className="doc-meta">
          <div className="doc-title">{artifact.title}</div>
          {subtitle && <div className="doc-subtitle">{subtitle}</div>}
          {artifact.description && <div className="doc-desc">{artifact.description}</div>}
        </div>

        <div className="doc-actions">
          <button type="button" className="doc-btn" onClick={onOpen} disabled={!openUrl}>
            Abrir
          </button>
          <button type="button" className="doc-btn" onClick={onDownload} disabled={!openUrl}>
            Descargar
          </button>
          <button
            type="button"
            className={`doc-btn doc-btn-primary ${savedUrl ? 'is-saved' : ''}`}
            onClick={onSave}
            disabled={saving || Boolean(savedUrl)}
            title={savedUrl ? 'Guardado' : 'Guardar en biblioteca'}
          >
            {savedUrl ? 'Guardado ✓' : saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="doc-preview" onClick={onOpen} role="button" tabIndex={0}>
        {artifact.previewImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="doc-preview-img" src={artifact.previewImageUrl} alt="Preview del documento" />
        ) : artifact.fileUrl ? (
          <div className="doc-preview-placeholder">
            <div className="doc-a4" />
            <div className="doc-preview-hint">Documento PDF listo para abrir</div>
          </div>
        ) : (
          <div className="doc-preview-placeholder">
            <div className="doc-a4" />
            <div className="doc-preview-hint">Generando documento…</div>
          </div>
        )}
      </div>

      {error && <div className="doc-error">{error}</div>}
    </div>
  );
}
