import type { JSX } from 'react';
import { Clock } from 'lucide-react';

/**
 * `ResultMeta` — cuándo se guardó un resultado.
 *
 * Perfil, recomendación y roadmap son resultados guardados con fecha, no
 * cálculos que cambian al abrir la pantalla; este componente lo dice de la
 * misma forma y en el mismo lugar (bajo el título) en las tres.
 */
interface ResultMetaProps {
  /** Fecha ISO del momento en que el backend guardó el resultado. */
  readonly savedAt: string;
}

export function formatSavedAt(savedAt: string): string {
  return new Date(savedAt).toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export function ResultMeta({ savedAt }: ResultMetaProps): JSX.Element {
  return (
    <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
      <Clock className="size-4 shrink-0" aria-hidden="true" />
      <span>Resultado guardado el {formatSavedAt(savedAt)}</span>
    </p>
  );
}
