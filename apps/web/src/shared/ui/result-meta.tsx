import type { JSX } from 'react';
import { Clock } from 'lucide-react';

import { formatDateTime } from '@/shared/lib/format';

interface ResultMetaProps {
  /** ISO date of the moment the backend saved the result. */
  readonly savedAt: string;
}

/**
 * `ResultMeta` — when a result was saved.
 *
 * Profile, recommendation and roadmap are saved results with a date, not
 * calculations that change when the screen opens; this component says so
 * the same way and in the same place (under the title) in all three.
 */
export function ResultMeta({ savedAt }: ResultMetaProps): JSX.Element {
  return (
    <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
      <Clock className="size-4 shrink-0" aria-hidden="true" />
      <span>Resultado guardado el {formatDateTime(savedAt)}</span>
    </p>
  );
}
