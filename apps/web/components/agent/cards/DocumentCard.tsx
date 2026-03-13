import React from "react";

export function DocumentCard({ block }: { block: any }) {
  return (
    <div style={{
      marginTop: 16,
      padding: 16,
      borderRadius: 14,
      background: "rgba(255,255,255,0.08)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      color: "white",
      maxWidth: 720
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        {block.title}
      </h3>

      {block.sections?.map((s: any, i: number) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 12,
            opacity: 0.65,
            textTransform: "uppercase",
            marginBottom: 4
          }}>
            {s.heading}
          </div>
          <div style={{ whiteSpace: "pre-line", fontSize: 14 }}>
            {s.content}
          </div>
        </div>
      ))}
    </div>
  );
}
