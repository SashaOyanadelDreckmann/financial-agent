// apps/web/app/layout.tsx
import './globals.css';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {/* Fondo animado */}
        <AnimatedBackground />

        {/* App */}
        <div className="app-shell">
          <main className="app-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
