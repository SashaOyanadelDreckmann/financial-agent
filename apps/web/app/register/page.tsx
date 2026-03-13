// apps/web/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/api';
import { useSessionStore } from '@/state/session.store';

export default function RegisterPage() {
  const router = useRouter();
  const setAuthenticated = useSessionStore((s) => s.setAuthenticated);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await registerUser(form);
      try {
        if (form.name) localStorage.setItem('user_name', form.name);
        if (res?.user?.id) localStorage.setItem('user_id', res.user.id);
      } catch {}
      setAuthenticated();
      router.push('/intake');
    } catch (e: any) {
      setError(e.message ?? 'Ocurrió un error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Fondo animado */}
      <div className="animated-bg">
        <div className="bg-layer layer-1" />
        <div className="bg-layer layer-2" />
      </div>

      <main className="app-shell">
        <div className="app-content">

          <section className="app-section animate-fade-in">
            <h1 className="text-3xl font-light">
              Crear cuenta
            </h1>

            <p className="text-muted max-w-sm">
              Un primer paso breve.  
              Luego, conversamos con calma.
            </p>
          </section>

          <section className="app-section">
            <div className="form-section max-w-md">

              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  placeholder="Cómo prefieres que te llame"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  placeholder="Tu correo personal"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  placeholder="Una clave simple, solo para ti"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                />
              </div>

              {error && (
                <p className="text-small text-muted">
                  {error}
                </p>
              )}

            </div>
          </section>

          <section className="app-section">
            <div className="form-footer max-w-md">
              <button
                onClick={onSubmit}
                disabled={loading}
                className="button-primary"
              >
                {loading ? 'Creando…' : 'Continuar'}
              </button>

              <span className="text-small text-muted">
                Toma menos de un minuto
              </span>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
