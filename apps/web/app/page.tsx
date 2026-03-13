// apps/web/app/page.tsx
'use client';

import Link from 'next/link';
import { TypewriterText } from '@/components/ui/TypewriterText';

const MACHINE_TEXT = `
────────────────────▄▄▄▄
────────────────▄▄█▀▀──▀▀█▄
─────────────▄█▀▀─────────▀▀█▄
────────────▄█▀──▄▄▄▄▄▄──────▀█
────────────█───█▌────▀▀█▄─────█
────────────█──▄█────────▀▀▀█──█
────────────█──█──▀▀▀──▀▀▀▄─▐──█
────────────█──▌────────────▐──█
────────────█──▌─▄▀▀▄───────▐──█
───────────█▀▌█──▄▄▄───▄▀▀▄─▐──█
───────────▌─▀───█▄█▌─▄▄▄────█─█
───────────▌──────▀▀──█▄█▌────█
───────────█───────────▀▀─────▐
────────────█──────▌──────────█
────────────██────█──────────█
─────────────█──▄──█▄█─▄────█
─────────────█──▌─▄▄▄▄▄hagamos que tu ─────────────█──▌─▄dinero valga la pena :) 
─────────────█─────▄▄──▄▀─█
─────────────█▄──────────█
─────────────█▀█▄▄──▄▄▄▄▄█▄▄▄▄▄
───────────▄██▄──▀▀▀█─────────█
──────────██▄─█▄────█─────────█
───▄▄▄▄███──█▄─█▄───█─────────██▄▄▄
▄█▀▀────█────█──█▄──█▓▓▓▓▓▓▓▓▓█───▀▀▄
█──────█─────█───████▓▓▓▓▓▓▓▓▓█────▀█
█──────█─────█───█████▓▓▓▓▓▓▓█──────█
█─────█──────█───███▀▀▀▀█▓▓▓█───────█
█────█───────█───█───▄▄▄▄████───────█
█────█───────█──▄▀───────────█──▄───█
█────█───────█─▄▀─────█████▀▀▀─▄█───█
█────█───────█▄▀────────█─█────█────█
█────█───────█▀───────███─█────█────█
█─────█────▄█▀──────────█─█────█────█
█─────█──▄██▀────────▄▀██─█▄───█────█
█────▄███▀─█───────▄█─▄█───█▄──█────█
█─▄██▀──█──█─────▄███─█─────█──█────█
██▀────▄█───█▄▄▄█████─▀▀▀▀█▀▀──█────█
█──────█────▄▀──█████─────█────▀█───█


`;
export default function HomePage() {
  return (
    <main
      className="page-container"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="home-grid">

        {/* COLUMNA IZQUIERDA */}
        <section className="home-panel">

          <div
            className="home-card"
            style={{
    
              backgroundSize: '90%',
              backgroundPosition: '20% 30%',
              opacity: 0.9,
              backgroundColor: 'black',
            }}
          >
            <h1 className="home-title">Financiera - Mente</h1>
            <p className="home-subtitle">
              Claridad financiera, antes de decidir.
            </p>
          </div>

          <div
            className="home-card muted"
            style={{
              backgroundImage: "url('/fondo8.png')",
              backgroundSize: '100%',
              backgroundPosition: '60% 20%',
              opacity: 0.7,
            }}
          >
            <p>
              Un agente conversacional diseñado para ayudarte a pensar tu
              situación financiera con calma, contexto y sin juicios.
            </p>
          </div>

          <div
            className="home-card muted"
            style={{
         
              backgroundSize: '100%',
              backgroundPosition: '50% 80%',
              backgroundColor: 'black',
              opacity: 0.8,
            
            }}
          >
            <p className="text-small">
              No vendo productos financieros.<br />
              No entrego consejos automáticos.<br />
              No tomo decisiones por ti.
            </p>
          </div>

          <div className="home-actions">
            <Link href="/register" passHref legacyBehavior>
              <a className="continue-ghost">
                Iniciar conversación
              </a>
            </Link>

            <Link href="/login" passHref legacyBehavior>
              <a className="continue-ghost">
                Retomar conversación
              </a>
            </Link>
          </div>
        </section>

        {/* COLUMNA DERECHA — decorativa */}
        <aside className="home-aside" aria-hidden>
          <div className="machine-frame">
            <div className="machine-text">
              <TypewriterText text={MACHINE_TEXT} speed={2} />
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
}
