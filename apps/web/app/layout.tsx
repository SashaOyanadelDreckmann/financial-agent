// apps/web/app/layout.tsx
import './globals.css';
import './agent.css';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';

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
