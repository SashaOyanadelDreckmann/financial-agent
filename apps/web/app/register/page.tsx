'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/lib/api';
import { useSessionStore } from '@/state/session.store';

export default function RegisterPage() {
  const router = useRouter();
  const setAuthenticated = useSessionStore((s) => s.setAuthenticated);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
        if (res?.user?.name || form.name) localStorage.setItem('user_name', res?.user?.name ?? form.name);
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
    <main className="auth-shell">
        <div className="auth-card">
          <div className="auth-eyebrow">FinancieraMente</div>
          <h1 className="auth-title">Crear cuenta</h1>
          <p className="auth-subtitle">Un primer paso breve. Luego, conversamos con calma.</p>

          <div className="auth-fields">
            <div className="auth-field">
              <label className="auth-label">Nombre</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Cómo prefieres que te llame"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                autoComplete="given-name"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="tu@correo.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Contraseña</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Una clave simple, solo para ti"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}
          </div>

          <button
            className="auth-submit"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? 'Creando…' : 'Continuar'}
          </button>

          <div className="auth-footer">
            <span className="auth-footer-text">¿Ya tienes cuenta?</span>
            <Link href="/login" className="auth-footer-link">Iniciar sesión</Link>
          </div>

          <p className="auth-fine-print">Toma menos de un minuto · Privado · Sin spam</p>
        </div>
    </main>
  );
}
