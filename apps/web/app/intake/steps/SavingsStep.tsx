import type { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';
import { FormBlock } from '@/components/ui/FormBlock';

export function SavingsStep({
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
    form.hasSavingsOrInvestments === false ||
    (form.hasSavingsOrInvestments === true &&
      Boolean(form.savingsBand));

  return (
    <div className="app-content animate-fade-in">
      {/* Intro */}
      <div className="app-section">
        <p className="text-small text-muted">
          Paso 3 · Ahorro, inversión y deudas
        </p>

        <h1>Ahorro, inversión y deudas</h1>

        <p className="text-muted max-w-xl">
          Esta sección nos permite entender tu situación financiera general:
          si tienes un respaldo de ahorro y si mantienes compromisos de deuda
          activos actualmente.
        </p>
      </div>

      {/* Form */}
      <div className="form-section">
        {/* ───────── Ahorro ───────── */}
        <FormBlock
          label="¿Actualmente tienes ahorros o dinero destinado a inversión?"
          help="Incluye ahorros en cuentas, depósitos, fondos o inversiones."
        >
          <select
            value={form.hasSavingsOrInvestments ? 'yes' : 'no'}
            onChange={(e) =>
              update(
                'hasSavingsOrInvestments',
                e.target.value === 'yes'
              )
            }
          >
            <option value="yes">Sí</option>
            <option value="no">No</option>
          </select>
        </FormBlock>

        {form.hasSavingsOrInvestments && (
          <FormBlock
            label="¿A cuánto asciende aproximadamente ese ahorro o inversión?"
            help="Selecciona un rango aproximado. No es necesario ser exacto."
          >
            <select
              value={form.savingsBand ?? ''}
              onChange={(e) =>
                update('savingsBand', e.target.value as any)
              }
            >
              <option value="" disabled>
                Selecciona un rango
              </option>
              <option value="<500k">Menos de $500.000</option>
              <option value="500k-1M">$500.000 – $1.000.000</option>
              <option value="1M-2M">$1.000.000 – $2.000.000</option>
              <option value=">2M">Más de $2.000.000</option>
            </select>
          </FormBlock>
        )}

        {/* ───────── Deudas ───────── */}
        <FormBlock
          label="¿Actualmente tienes deudas o compromisos financieros activos?"
          help="Incluye créditos, tarjetas, préstamos o pagos en cuotas."
        >
          <select
            value={form.hasDebt ? 'yes' : 'no'}
            onChange={(e) =>
              update('hasDebt', e.target.value === 'yes')
            }
          >
            <option value="yes">Sí</option>
            <option value="no">No</option>
          </select>
        </FormBlock>

        {form.hasDebt && (
          <div className="text-small text-muted max-w-xl">
            Más adelante te pediremos el detalle de tus productos financieros
            para entender mejor estas deudas (montos, costos y condiciones).
          </div>
        )}
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
