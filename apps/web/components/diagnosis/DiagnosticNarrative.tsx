'use client';

interface DiagnosticNarrativeProps {
  narrative: string;
}

export function DiagnosticNarrative({
  narrative,
}: DiagnosticNarrativeProps) {
  return (
    <section className="app-section animate-fade-in">
      <h2 className="text-muted text-small">
        Diagnóstico integrado
      </h2>

      <p style={{ fontSize: 18, marginTop: 24 }}>
        {narrative}
      </p>
    </section>
  );
}
