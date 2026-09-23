import type { JSX, ReactNode } from 'react';
import { AppNav } from './app-nav';
import { BrandDescriptor } from './brand-descriptor';
import { cn } from '@/shared/lib/utils';

/**
 * `PageShell` — common chrome for every page of the product.
 *
 * It composes:
 *  - A header with the INNLAB institutional descriptor (Icesi lock-up),
 *    the main navigation right after it (`showNavigation`, only on results
 *    and panel) and an optional slot for actions (profile, session). With
 *    navigation the descriptor leads to the panel; without it, to the
 *    landing. Under `md` the navigation drops to a tab row of its own:
 *    descriptor, links and actions do not fit in one row at 360–390px.
 *  - A main container with the widths defined by `DESIGN.md`:
 *      reading  → max-w-3xl (~768px), questions and long text.
 *      standard → max-w-5xl, mixed views (radar + cards).
 *      wide     → max-w-7xl, dashboards and lists.
 *  - A blue footer with the Icesi | INNLAB lockup in white, the faculty and
 *    the KTH attribution (RNF-09), like innlab.org's, when the page needs it
 *    (`showAttribution` opt-in).
 *  - A 16px side margin on mobile and 32px from `sm`.
 *
 * The shell prefers a border over a shadow to convey depth (RNF-08
 * "compatibility with low-DPI projectors") and keeps the content
 * background pure white, as the brand manual requires.
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
  /** Shows the navigation (panel, results); only on the screens after the wizard. */
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
