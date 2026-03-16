// apps/web/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import './agent.css';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';

export const metadata: Metadata = {
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {/* Fondo animado global */}
        <AnimatedBackground />

        {/* App shell neutro (SIN padding) */}
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
