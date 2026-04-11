'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/api';
import { useSessionStore } from '@/state/session.store';

export default function LoginPage() {
  const router = useRouter();
  const setAuthenticated = useSessionStore((s) => s.setAuthenticated);

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loginUser(form);
      try {
        if (res?.user?.name) localStorage.setItem('user_name', res.user.name);
        if (res?.user?.id) localStorage.setItem('user_id', res.user.id);
      } catch {}
      setAuthenticated();
      router.push('/agent');
    } catch (e: any) {
      setError(e.message ?? 'Ocurrió un error iniciando sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
        <div className="auth-card">
          <div className="auth-eyebrow">FinancieraMente</div>
          <h1 className="auth-title">Bienvenido de vuelta</h1>
          <p className="auth-subtitle">Accede a tu sesión y retoma donde lo dejaste.</p>

          <div className="auth-fields">
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="tu@correo.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Contraseña</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Tu clave"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}
          </div>

          <button
            className="auth-submit"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? 'Entrando…' : 'Continuar'}
          </button>

          <div className="auth-footer">
            <span className="auth-footer-text">¿Primera vez?</span>
            <Link href="/register" className="auth-footer-link">Crear cuenta</Link>
          </div>
        </div>
    </main>
  );
}
