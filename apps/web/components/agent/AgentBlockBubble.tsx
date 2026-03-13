import React from "react";

export function AgentBlockBubble({ block }: { block: any }) {
  if (block.type !== "document") return null;

  return (
    <div className="agent-bubble agent-bubble--document">
      <div className="agent-doc-title">{block.title}</div>
      {block.sections?.map((s: any, i: number) => (
        <div key={i} className="agent-doc-section">
          <div className="agent-doc-heading">{s.heading}</div>
          <div className="agent-doc-content">{s.content}</div>
        </div>
      ))}
    </div>
  );
}
