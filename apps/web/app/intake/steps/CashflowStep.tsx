import type { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';
import { FormBlock } from '@/components/ui/FormBlock';

export function CashflowStep({
  form,
  update,
  onNext,
  onBack,
}: {
  form: IntakeQuestionnaire;
  update: <K extends keyof IntakeQuestionnaire>(
    key: K,
    value: IntakeQuestionnaire[K]
  ) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const ready =
    !!form.incomeBand &&
    !!form.expensesCoverage &&
    !!form.tracksExpenses;

  return (
    <div className="app-content animate-fade-in">
      {/* Intro */}
      <div className="app-section">
        <p className="text-small text-muted">
          Paso 2 · Ingresos y gastos
        </p>

        <h1>Ingresos y gastos</h1>

        <p className="text-muted max-w-xl">
          Esta sección nos ayuda a entender tu flujo mensual de dinero
          y si tus ingresos actuales son suficientes para cubrir tus gastos.
        </p>
      </div>

      {/* Form */}
      <div className="form-section">
        <FormBlock
          label="¿Cuál es tu nivel de ingresos mensuales aproximado?"
          help="Selecciona un rango aproximado."
        >
          <select
            value={form.incomeBand}
            onChange={(e) =>
              update('incomeBand', e.target.value as any)
            }
          >
            <option value="<500k">Menos de $500.000</option>
            <option value="500k-1M">$500.000 – $1.000.000</option>
            <option value="1M-2M">$1.000.000 – $2.000.000</option>
            <option value=">2M">Más de $2.000.000</option>
          </select>
        </FormBlock>

        <FormBlock
          label="¿Tus ingresos cubren tus gastos mensuales?"
          help="Evalúa tu situación al final del mes."
        >
          <select
            value={form.expensesCoverage}
            onChange={(e) =>
              update('expensesCoverage', e.target.value as any)
            }
          >
            <option value="surplus">Sí, me sobra dinero</option>
            <option value="tight">Llego justo a fin de mes</option>
            <option value="sometimes">A veces no alcanza</option>
            <option value="no">No logro cubrirlos</option>
          </select>
        </FormBlock>

        <FormBlock
          label="¿Registras o haces seguimiento de tus gastos?"
          help="Puede ser con una app, Excel o de forma manual."
        >
          <select
            value={form.tracksExpenses}
            onChange={(e) =>
              update('tracksExpenses', e.target.value as any)
            }
          >
            <option value="yes">Sí, de forma regular</option>
            <option value="sometimes">A veces</option>
            <option value="no">No</option>
          </select>
        </FormBlock>
      </div>

      {/* Footer */}
      <div className="form-footer">
        <button
          type="button"
          onClick={onBack}
          className="continue-ghost"
        >
          Volver
        </button>

        {ready && (
          <button
            type="button"
            onClick={onNext}
            className="continue-ghost"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
