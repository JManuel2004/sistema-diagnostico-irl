import type { JSX } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * `LoadingState` — estado de carga de una página o de un bloque.
 *
 * Un solo tratamiento (indicador giratorio y texto) para todo lo que espera
 * datos, en lugar de un texto suelto distinto por pantalla. El
 * esqueleto del cuestionario es aparte a propósito: reproduce la forma de
 * las 48 tarjetas, que un indicador genérico no puede.
 */
interface LoadingStateProps {
  readonly label: string;
  readonly className?: string;
}

export function LoadingState({ label, className }: LoadingStateProps): JSX.Element {
  return (
    <div
      role="status"
      className={cn('text-muted-foreground flex items-center gap-3 text-base', className)}
    >
      <span
        className="border-azul-icesi/40 size-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
