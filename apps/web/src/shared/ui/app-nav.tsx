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
 */
const LINK =
  'rounded-sm px-3 py-2 text-sm font-medium focus-visible:outline-none aria-[current=page]:text-azul-icesi aria-[current=page]:font-semibold text-muted-foreground hover:text-foreground';

export function AppNav(): JSX.Element {
  const diagnosticId = useActiveDiagnosticId();

  return (
    <nav aria-label="Principal" className="flex items-center gap-1">
      <NavLink to="/panel" className={LINK}>
        Panel
      </NavLink>
      {diagnosticId ? (
        <NavLink to={`/diagnosticos/${diagnosticId}/resultados`} className={LINK}>
          Resultados
        </NavLink>
      ) : (
        <span aria-disabled="true" className={cn(LINK, 'cursor-not-allowed opacity-50')}>
          Resultados
        </span>
      )}
    </nav>
  );
}
