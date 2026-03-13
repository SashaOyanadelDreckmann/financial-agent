'use client';

import { ChartBlockRenderer } from './ChartBlockRenderer';

type AgentBlock =
  | {
      type: 'chart';
      chart: any;
    };

export function AgentBlocksRenderer({
  blocks,
}: {
  blocks: AgentBlock[];
}) {
  if (!blocks?.length) return null;

  return (
    <div className="mt-4 space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'chart':
            return <ChartBlockRenderer key={i} block={block} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
