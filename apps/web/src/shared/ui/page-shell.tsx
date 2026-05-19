import type { JSX, ReactNode } from 'react';
import { BrandDescriptor } from './brand-descriptor';
import { cn } from '@/shared/lib/utils';

/**
 * `PageShell` — chrome común para todas las páginas del producto.
 *
 * Compone:
 *  - Header con el descriptor institucional INNLAB (lock-up Icesi)
 *    y un slot opcional para acciones (perfil, sesión, etc.).
 *  - Contenedor principal con anchos definidos por `DESIGN.md`:
 *      reading  → max-w-3xl (~768px), preguntas y texto extenso.
 *      standard → max-w-5xl, vistas mixtas (radar + cards).
 *      wide     → max-w-7xl, dashboards y listados.
 *  - Footer con la atribución KTH (RNF-09) cuando la página la
 *    necesita (`showAttribution` opt-in).
 *
 * El shell respeta los gris-1/gris-2 institucionales para los
 * hairlines, prefiere borde a sombra para indicar profundidad
 * (RNF-08 "compatibilidad con proyectores de baja DPI"), y nunca
 * tinta el fondo: blanco puro, conforme al manual de marca.
 */
type Width = 'reading' | 'standard' | 'wide';

const WIDTHS: Record<Width, string> = {
  reading: 'max-w-3xl',
  standard: 'max-w-5xl',
  wide: 'max-w-7xl',
};

interface PageShellProps {
  readonly children: ReactNode;
  readonly width?: Width;
  readonly showAttribution?: boolean;
  readonly headerActions?: ReactNode;
  readonly contentClassName?: string;
}

export function PageShell({
  children,
  width = 'standard',
  showAttribution = false,
  headerActions,
  contentClassName,
}: PageShellProps): JSX.Element {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div
          className={cn('mx-auto flex h-16 items-center justify-between px-6 sm:px-8', WIDTHS.wide)}
        >
          <BrandDescriptor />
          {headerActions ? <div className="flex items-center gap-3">{headerActions}</div> : null}
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full flex-1 px-6 py-10 sm:px-8 sm:py-12',
          WIDTHS[width],
          contentClassName,
        )}
      >
        {children}
      </main>

      {showAttribution ? (
        <footer className="border-border bg-surface-muted border-t">
          <div
            className={cn(
              'text-muted-foreground mx-auto flex flex-col gap-2 px-6 py-6 text-xs leading-relaxed sm:flex-row sm:items-center sm:justify-between sm:px-8',
              WIDTHS.wide,
            )}
          >
            <p>
              Marco IRL <span aria-hidden="true">©</span>
              <span className="sr-only">copyright</span> KTH Innovation. Licencia CC BY-NC-SA 4.0.
            </p>
            <p>INNLAB · Centro de Innovación · Universidad Icesi</p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
