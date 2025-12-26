'use client';

interface OpenQuestionsCardProps {
  questions: string[];
}

export function OpenQuestionsCard({
  questions,
}: OpenQuestionsCardProps) {
  if (!questions?.length) return null;

  return (
    <section className="app-section animate-fade-in">
      <h2 className="text-muted text-small">
        Preguntas abiertas
      </h2>

      <div className="home-card muted" style={{ marginTop: 24 }}>
        <ul style={{ lineHeight: 1.7 }}>
          {questions.map((q, i) => (
            <li key={i} style={{ marginBottom: 10 }}>
              {q}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
