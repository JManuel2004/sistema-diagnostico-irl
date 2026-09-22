import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useActiveDiagnosticId } from '@/shared/hooks/useDiagnostics';
import { cn } from '@/shared/lib/utils';

/**
 * Navegación de la cabecera: panel de iniciativa y resultados del diagnóstico
 * activo.
 *
 * Solo existe en las pantallas posteriores al asistente (resultados, panel):
 * el asistente y la portada no la llevan. El cuestionario ya no es una
 * entrada: es un paso del asistente, no una pantalla a la que se vuelva.
 *
 * Va **a continuación** del descriptor institucional, que `DESIGN.md` exige en
 * la cabecera de cada página y que no se duplica ni se sustituye. El
 * diagnóstico activo es el de la URL si se está dentro de uno y, si no, el
 * más reciente con resultados; sin él, «Resultados» se muestra deshabilitada.
 * La página actual se marca con un subrayado azul además de `aria-current`;
 * en móvil los dos enlaces son pestañas de 48px que ocupan la fila.
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
