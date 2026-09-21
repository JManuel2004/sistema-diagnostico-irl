import type { JSX } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * `LevelBar` — la escala 1 a 9 como nueve tramos: los alcanzados van en el
 * color de la dimensión y el resto en gris. Es lo que hace que un nivel se
 * lea de un vistazo, sin depender del número.
 *
 * `targetLevel` pinta con un tono suave el tramo que falta hasta la meta (el
 * roadmap), y `thresholdLevel` marca con una línea el último nivel que cuenta
 * como brecha. El número siempre va también como texto accesible.
 */
interface LevelBarProps {
  readonly level: number;
  /** Clase de fondo del color pleno (`getDimensionVisual().bg`). */
  readonly fillClass: string;
  /** Clase de fondo del tono suave para el tramo hasta la meta. */
  readonly softClass?: string;
  readonly targetLevel?: number;
  readonly thresholdLevel?: number;
  /** Cuántos tramos tiene la escala: 9 para el IRL, 5 para el Likert. */
  readonly segments?: number;
  readonly className?: string;
}

export function LevelBar({
  level,
  fillClass,
  softClass,
  targetLevel,
  thresholdLevel,
  segments = 9,
  className,
}: LevelBarProps): JSX.Element {
  const label =
    targetLevel === undefined
      ? `Nivel ${String(level)} de ${String(segments)}`
      : `Nivel ${String(level)} de ${String(segments)}, con meta en el nivel ${String(targetLevel)}`;

  return (
    <div role="img" aria-label={label} className={cn('flex gap-1', className)}>
      {Array.from({ length: segments }, (_, i) => i + 1).map((segment) => {
        const reached = segment <= level;
        const towardTarget = !reached && targetLevel !== undefined && segment <= targetLevel;
        return (
          <span
            key={segment}
            aria-hidden="true"
            className={cn(
              'h-2 flex-1 rounded-sm',
              reached ? fillClass : towardTarget && softClass ? softClass : 'bg-border',
              thresholdLevel === segment && 'ring-foreground/40 ring-1 ring-offset-1',
            )}
          />
        );
      })}
    </div>
  );
}
