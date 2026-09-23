import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useActiveDiagnosticId } from '@/shared/hooks/useDiagnostics';
import { cn } from '@/shared/lib/utils';

/**
 * Header navigation: initiative panel and results of the active
 * diagnostic.
 *
 * It only exists on the screens after the wizard (results, panel): the
 * wizard and the landing do not carry it. The questionnaire is no longer
 * an entry: it is a wizard step, not a screen one comes back to.
 *
 * It goes **right after** the institutional descriptor, which `DESIGN.md`
 * requires in the header of every page and which is neither duplicated nor
 * replaced. The active diagnostic is the one in the URL when inside one
 * and, otherwise, the most recent with results; without it, «Resultados»
 * is shown disabled. The current page is marked with a blue underline on
 * top of `aria-current`; on mobile the two links are 48px tabs that fill
 * the row.
 */
const LINK = cn(
  'text-muted-foreground hover:text-foreground flex h-12 items-center justify-center border-b-2 border-transparent px-3 text-[0.9375rem] font-semibold focus-visible:outline-none md:h-auto',
  'aria-[current=page]:border-primary aria-[current=page]:text-foreground aria-[current=page]:font-bold',
);

interface AppNavProps {
  readonly className?: string;
}

export function AppNav({ className }: AppNavProps): JSX.Element {
  const diagnosticId = useActiveDiagnosticId();

  return (
    <nav
      aria-label="Principal"
      className={cn('grid grid-cols-2 items-stretch md:flex md:gap-2', className)}
    >
      <NavLink to="/panel" className={LINK}>
        Panel
      </NavLink>
      {diagnosticId ? (
        <NavLink to={`/diagnosticos/${diagnosticId}/resultados`} className={LINK}>
          Resultados
        </NavLink>
      ) : (
        <span aria-disabled="true" className={cn(LINK, 'cursor-not-allowed opacity-60')}>
          Resultados
        </span>
      )}
    </nav>
  );
}
