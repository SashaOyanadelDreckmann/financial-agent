// components/ui/FormBlock.tsx
export function FormBlock({
    label,
    help,
    children,
  }: {
    label: string;
    help?: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="flex flex-col gap-6">
        {/* Texto */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-white/80 font-light">
            {label}
          </label>
          {help && (
            <p className="text-xs text-white/40 leading-relaxed">
              {help}
            </p>
          )}
        </div>
  
        {/* INPUT WRAPPER (CLAVE) */}
        <div className="pt-6">
          {children}
        </div>
      </div>
    );
  }
  