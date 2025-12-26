import type { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';

type FinancialKnowledgeKey =
  keyof IntakeQuestionnaire['financialKnowledge'];

const KNOWLEDGE_LABELS: Record<FinancialKnowledgeKey, string> = {
  interest: 'Intereses en un crédito',
  CAE : 'Carga Anual Equivalente (CAE)',
  inflation: 'Inflación y poder adquisitivo',
  creditCard: 'Tarjeta de crédito',
  creditLine: 'Línea de crédito',
  loanComponents: 'Componentes de un crédito',
  interestRate: 'Tasa nominal vs tasa real',
  liquidity: 'Liquidez',
  returnConcept: 'Riesgo y retorno',
  diversification: 'Diversificación',
  assetVsLiability: 'Activos y pasivos',
  financialRisk: 'Riesgo financiero',
  capitalMarkets: 'Mercados financieros',
  alternativeInvestments: 'Inversiones alternativas',
  fintech: 'Fintech',
};

const KNOWLEDGE_GROUPS: {
  title: string;
  description: string;
  keys: FinancialKnowledgeKey[];
}[] = [
  {
    title: 'Créditos y deudas',
    description: 'Préstamos, tarjetas y costos financieros',
    keys: [
      'interest',
      'CAE',
      'creditCard',
      'creditLine',
      'loanComponents',
      'interestRate',
    ],
  },
  {
    title: 'Economía personal',
    description: 'Conceptos del día a día',
    keys: [
      'inflation',
      'liquidity',
      'assetVsLiability',
      'financialRisk',
    ],
  },
  {
    title: 'Inversión y mercado',
    description: 'Ahorro, inversión y crecimiento',
    keys: [
      'returnConcept',
      'diversification',
      'capitalMarkets',
      'alternativeInvestments',
      'fintech',
    ],
  },
];

export function KnowledgeStep({
  form,
  update,
  onSubmit,
  loading,
  onBack,
}: {
  form: IntakeQuestionnaire;
  update: <K extends keyof IntakeQuestionnaire>(
    key: K,
    value: IntakeQuestionnaire[K]
  ) => void;
  onSubmit: () => void;
  loading: boolean;
  onBack: () => void;
}) {
  // En el contrato financialKnowledge es requerido, así que esto siempre debería existir.
  // Igual lo dejamos robusto.
  const knowledge = form.financialKnowledge ?? ({} as IntakeQuestionnaire['financialKnowledge']);

  const toggle = (key: FinancialKnowledgeKey) => {
    update('financialKnowledge', {
      ...knowledge,
      [key]: !knowledge[key],
    });
  };

  return (
    <div className="app-content animate-fade-in">
      {/* HEADER */}
      <div className="app-section" style={{ gap: 18 }}>
        <p className="text-small text-muted">Paso final</p>

        <h1>Conocimiento financiero</h1>

        <p className="text-muted" style={{ maxWidth: 520 }}>
          Selecciona los conceptos que reconoces o utilizas en la práctica.
          No es una prueba, solo contexto para el diagnóstico.
        </p>
      </div>

      {/* GRUPOS */}
      <div className="app-section" style={{ marginTop: 44, gap: 34 }}>
        {KNOWLEDGE_GROUPS.map((group) => (
          <div key={group.title} className="knowledge-group">
            <div>
              <div className="knowledge-group-title">{group.title}</div>
              <div className="knowledge-group-desc">{group.description}</div>
            </div>

            <div className="knowledge-pills">
              {group.keys.map((key) => {
                const active = Boolean(knowledge[key]);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    className={`knowledge-pill ${active ? 'is-active' : ''}`}
                    aria-pressed={active}
                  >
                    {KNOWLEDGE_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

{/* ───────────────── Reflexión final ───────────────── */}
<div className="app-section max-w-[520px] mt-20 gap-12">
  <p className="text-small text-muted">
    Antes de continuar, queremos entender cómo percibes tu situación
    financiera actual. No hay respuestas correctas o incorrectas.
  </p>

  {/* Comprensión financiera */}
  <div className="flex flex-col gap-4">
    <label className="form-label">
      ¿Qué tan sólida sientes que es tu comprensión financiera?
    </label>

    <input
      type="range"
      min={0}
      max={10}
      value={form.selfRatedUnderstanding}
      onChange={(e) =>
        update('selfRatedUnderstanding', Number(e.target.value))
      }
      className="range-editorial"
    />

    <span className="text-small text-muted">
      Nivel seleccionado: {form.selfRatedUnderstanding} de 10
    </span>
  </div>

  {/* Separador visual */}
  <div className="h-px bg-white/10" />

  {/* Estrés financiero */}
  <div className="flex flex-col gap-4">
    <label className="form-label">
      ¿Cuánto estrés te genera hoy tu situación financiera?
    </label>

    <input
      type="range"
      min={0}
      max={10}
      value={form.moneyStressLevel}
      onChange={(e) =>
        update('moneyStressLevel', Number(e.target.value))
      }
      className="range-editorial"
    />

    <span className="text-small text-muted">
      Nivel seleccionado: {form.moneyStressLevel} de 10
    </span>
  </div>
</div>




      {/* FOOTER */}
      <div className="form-footer">
        <button type="button" onClick={onBack} className="continue-ghost">
          Volver
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="continue-ghost"
        >
          {loading ? 'Analizando…' : 'Iniciar diagnóstico'}
        </button>
      </div>
    </div>
  );
}
