'use client';

import { ChartBlockRenderer } from './ChartBlockRenderer';
import { TableBlockRenderer } from './TableBlockRenderer';
import type { AgentBlock } from '@/lib/agent.response.types';

export function AgentBlocksRenderer({
  blocks,
}: {
  blocks: AgentBlock[];
}) {
  if (!blocks?.length) return null;

  return (
    <div className="latex-annex-blocks">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'chart':
            return (
              <div key={i} className="latex-annex-chart">
                <ChartBlockRenderer block={block} />
              </div>
            );

          case 'table':
            return (
              <div key={i} className="latex-annex-table">
                <TableBlockRenderer block={block} />
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
