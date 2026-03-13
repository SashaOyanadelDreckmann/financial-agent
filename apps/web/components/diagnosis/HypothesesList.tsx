'use client';

interface HypothesesListProps {
  hypotheses: string[];
}

export function HypothesesList({
  hypotheses,
}: HypothesesListProps) {
  if (!hypotheses?.length) return null;

  return (
    <section className="app-section animate-fade-in">
      <h2 className="text-muted text-small">
        Hipótesis interpretativas
      </h2>

      <ul style={{ marginTop: 24, lineHeight: 1.7 }}>
        {hypotheses.map((h, i) => (
          <li key={i} style={{ marginBottom: 12 }}>
            {h}
          </li>
        ))}
      </ul>
    </section>
  );
}
