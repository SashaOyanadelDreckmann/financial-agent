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
      className="page-container home-page-pro"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <section className="home-monoblock">
        <div className="home-monoblock-main">
          <div className="home-monoblock-copy">
            <h1 className="home-title">Financiera - Mente</h1>
            <p className="home-subtitle">
              Claridad financiera, antes de decidir.
            </p>

            <p className="home-body-copy">
              Un agente conversacional diseñado para ayudarte a pensar tu
              situación financiera con calma, contexto y sin juicios.
            </p>

            <p className="home-rules-copy">
              No vendo productos financieros.
              <br />
              No entrego consejos automáticos.
              <br />
              No tomo decisiones por ti.
            </p>
          </div>

          <aside className="home-monoblock-art" aria-hidden>
            <div className="machine-frame">
              <div className="machine-text">
                <TypewriterText text={MACHINE_TEXT} speed={2} />
              </div>
            </div>
          </aside>
        </div>

        <div className="home-monoblock-actions">
          <Link href="/register" passHref legacyBehavior>
            <a className="continue-ghost home-action-left">
              Iniciar conversación
            </a>
          </Link>

          <Link href="/login" passHref legacyBehavior>
            <a className="continue-ghost home-action-right">
              Retomar conversación
            </a>
          </Link>
        </div>
      </section>
    </main>
  );
}
