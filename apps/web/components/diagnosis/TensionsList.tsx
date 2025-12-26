'use client';

interface TensionsListProps {
  tensions: string[];
}

export function TensionsList({
  tensions,
}: TensionsListProps) {
  if (!tensions?.length) return null;

  return (
    <section className="app-section animate-fade-in">
      <h2 className="text-muted text-small">
        Tensiones observadas
      </h2>

      <ul style={{ marginTop: 24, lineHeight: 1.7 }}>
        {tensions.map((t, i) => (
          <li key={i} style={{ marginBottom: 12 }}>
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
