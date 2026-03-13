import type { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';
import { FormBlock } from '@/components/ui/FormBlock';

export function ContextStep({
  form,
  update,
  onNext,
}: {
  form: IntakeQuestionnaire;
  update: <K extends keyof IntakeQuestionnaire>(
    key: K,
    value: IntakeQuestionnaire[K]
  ) => void;
  onNext: () => void;
}) {
  return (
    <div className="app-content animate-fade-in">
      {/* Intro */}
      <div className="app-section">
        <p className="text-small text-muted">
          Paso 1 · Contexto inicial
        </p>

        <h1>Contexto personal</h1>

        <p className="text-muted max-w-xl">
          Este cuestionario inicial nos permite entender tu situación actual
          y adaptar el análisis financiero a tu realidad personal.
          No tomará más de unos minutos.
        </p>
      </div>

      {/* Form */}
      <div className="form-section">
        <FormBlock
          label="¿Cuál es tu edad?"
          help="Nos ayuda a contextualizar tu etapa financiera."
        >
          <input
            type="number"
            value={form.age ?? ''}
            onChange={(e) =>
              update('age', Number(e.target.value))
            }
          />
        </FormBlock>

        <FormBlock
          label="Situación laboral actual"
          help="Determina estabilidad y tipo de ingresos."
        >
          <select
            value={form.employmentStatus}
            onChange={(e) =>
              update('employmentStatus', e.target.value as any)
            }
          >
            <option value="employed">Empleado</option>
            <option value="freelance">Independiente</option>
            <option value="unemployed">Sin trabajo</option>
          </select>
        </FormBlock>

        <FormBlock
          label="Profesión u ocupación principal"
          help="Opcional. Solo si aplica a tu situación actual."
        >
          <input
            placeholder="Ej: Ingeniero, Diseñador, Emprendedor"
            value={form.profession}
            onChange={(e) =>
              update('profession', e.target.value)
            }
          />
        </FormBlock>
      </div>

      {/* Footer */}
      {form.age && (
        <div className="form-footer">
          <button
            onClick={onNext}
            className="continue-ghost"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
