import type {
  IntakeQuestionnaire,
  FinancialProductEntry,
} from '@financial-agent/shared/src/intake/intake-questionnaire.types';

export function ProductsStep({
  form,
  updateProduct,
  addProductRow,
  onNext,
  onBack,
}: {
  form: IntakeQuestionnaire;
  updateProduct: (
    index: number,
    field: keyof FinancialProductEntry,
    value: any
  ) => void;
  addProductRow: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const hasAtLeastOneProduct =
    form.financialProducts.some((p) => p.product.trim());

  return (
    <div className="app-content animate-fade-in">
      {/* Intro */}
      <div className="app-section">
        <p className="text-small text-muted">
          Paso 4 · Productos financieros
        </p>

        <h1>Productos financieros</h1>

        <p className="text-muted max-w-xl">
          Ingresa los productos financieros que utilizas actualmente.
          No es necesario ser exacto: una estimación aproximada es suficiente
          para el análisis.
        </p>
      </div>

      {/* Productos */}
      <div className="form-section">
        {form.financialProducts.map((p, i) => (
          <div
            key={i}
            className="
              flex flex-col gap-10
              border border-white/10
              rounded-3xl
              p-10
              bg-white/[0.02]
            "
          >
            <div className="text-small text-muted">
              Producto {i + 1}
            </div>

            {/* Datos principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="form-group">
                <label className="form-label">
                  Tipo de producto
                </label>
                <input
                  placeholder="Ej: Tarjeta de crédito, crédito consumo"
                  value={p.product}
                  onChange={(e) =>
                    updateProduct(i, 'product', e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Institución
                </label>
                <input
                  placeholder="Ej: Banco, fintech, aseguradora"
                  value={p.institution}
                  onChange={(e) =>
                    updateProduct(i, 'institution', e.target.value)
                  }
                />
              </div>
            </div>

            {/* Costos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="form-group">
                <label className="form-label">
                  Costo mensual aproximado
                </label>
                <input
                  type="number"
                  placeholder="Monto en pesos"
                  value={p.monthlyCost ?? ''}
                  onChange={(e) =>
                    updateProduct(
                      i,
                      'monthlyCost',
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Notas u observaciones
                  <span className="text-muted"> (opcional)</span>
                </label>
                <input
                  placeholder="Ej: costo anual, pago variable"
                  value={p.notes}
                  onChange={(e) =>
                    updateProduct(i, 'notes', e.target.value)
                  }
                />
              </div>
            </div>
            </div>
        ))}
        {/* Agregar producto */}
        <div className="flex justify-center pt-10">
          <button
            type="button"
            onClick={addProductRow}
            className="continue-ghost"
          >
            <span className="text-lg leading-none">+</span>
            Agregar otro producto
          </button>
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

          {hasAtLeastOneProduct && (
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
    </div>
  );
}
