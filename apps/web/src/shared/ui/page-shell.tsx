import type { JSX, ReactNode } from 'react';
import { AppNav } from './app-nav';
import { BrandDescriptor } from './brand-descriptor';
import { cn } from '@/shared/lib/utils';

/**
 * `PageShell` — chrome común para todas las páginas del producto.
 *
 * Compone:
 *  - Header con el descriptor institucional INNLAB (lock-up Icesi),
 *    la navegación principal a continuación (`showNavigation`, solo en
 *    resultados y panel) y un slot opcional para acciones (perfil, sesión).
 *    Con navegación el descriptor lleva al panel; sin ella, a la portada.
 *    Bajo `md` la navegación baja a una fila de pestañas propia: en una
 *    sola fila no caben descriptor, enlaces y acciones a 360–390px.
 *  - Contenedor principal con anchos definidos por `DESIGN.md`:
 *      reading  → max-w-3xl (~768px), preguntas y texto extenso.
 *      standard → max-w-5xl, vistas mixtas (radar + cards).
 *      wide     → max-w-7xl, dashboards y listados.
 *  - Footer azul con el lockup Icesi | INNLAB en blanco, la facultad y la
 *    atribución KTH (RNF-09), como el de innlab.org, cuando la página la
 *    necesita (`showAttribution` opt-in).
 *  - Margen lateral de 16px en móvil y 32px desde `sm`.
 *
 * El shell prefiere borde a sombra para indicar profundidad (RNF-08
 * "compatibilidad con proyectores de baja DPI") y deja el fondo del
 * contenido en blanco puro, conforme al manual de marca.
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
  /** Muestra la navegación (panel, resultados); solo en las pantallas posteriores al asistente. */
  readonly showNavigation?: boolean;
  readonly headerActions?: ReactNode;
  readonly contentClassName?: string;
}

export function PageShell({
  children,
  width = 'standard',
  showAttribution = false,
  showNavigation = false,
  headerActions,
  contentClassName,
}: PageShellProps): JSX.Element {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-20 border-b backdrop-blur">
        <div
          className={cn(
            'mx-auto flex flex-wrap items-center justify-between gap-x-10 px-4 sm:px-8 md:h-[4.75rem] md:flex-nowrap',
            WIDTHS.wide,
          )}
        >
          <div className="flex h-16 items-center md:h-full">
            <BrandDescriptor to={showNavigation ? '/panel' : '/'} />
          </div>
          {showNavigation ? (
            <AppNav className="border-border order-last -mx-4 basis-[calc(100%+2rem)] border-t px-4 sm:-mx-8 sm:basis-[calc(100%+4rem)] sm:px-8 md:order-none md:mx-0 md:mr-auto md:basis-auto md:self-stretch md:border-t-0 md:px-0" />
          ) : null}
          {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full flex-1 px-4 py-8 sm:px-8 sm:py-12',
          WIDTHS[width],
          contentClassName,
        )}
      >
        {children}
      </main>

      {showAttribution ? (
        <footer className="bg-azul-icesi text-primary-foreground">
          <div
            className={cn(
              'mx-auto flex flex-col gap-6 px-4 py-8 text-sm leading-relaxed sm:px-8 sm:py-10',
              WIDTHS.wide,
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <p
                className="flex items-center gap-3"
                aria-label="INNLAB Centro de Innovación · Universidad Icesi"
              >
                <span
                  aria-hidden="true"
                  className="text-[1.375rem] font-bold leading-none tracking-tight"
                >
                  Icesi
                </span>
                <span aria-hidden="true" className="h-6 w-px bg-white/70" />
                <span aria-hidden="true" className="flex flex-col leading-tight">
                  <span className="text-overline">INNLAB</span>
                  <span className="text-[0.8125rem] font-medium">Centro de Innovación</span>
                </span>
              </p>
              <p className="sm:text-right">
                Facultad Barberi de Ingeniería, Diseño y Ciencias Aplicadas
                <br />
                Escuela de Tecnología, Diseño e Innovación
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-white/35 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Marco IRL <span aria-hidden="true">©</span>
                <span className="sr-only">copyright</span> KTH Innovation. Licencia CC BY-NC-SA 4.0.
              </p>
              <p>INNLAB · Centro de Innovación · Universidad Icesi</p>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
