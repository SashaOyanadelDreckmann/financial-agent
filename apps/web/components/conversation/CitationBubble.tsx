'use client';

import React from 'react';
import type { Citation } from '@/lib/agent.response.types';

export function CitationBubble({ citation }: { citation: Citation }) {
  return (
    <div className="citation-bubble">
      <div className="citation-head">
        <span className="citation-pill">fuente</span>
        <span className="citation-source">{citation.source}</span>
      </div>

      {citation.url ? (
        <a className="citation-link" href={citation.url} target="_blank" rel="noreferrer">
          {citation.title || citation.url}
        </a>
      ) : (
        <div className="citation-link">{citation.title || citation.source}</div>
      )}
    </div>
  );
}
