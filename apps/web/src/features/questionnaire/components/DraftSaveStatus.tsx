import type { JSX } from 'react';
import { CloudAlert, CloudCheck, LoaderCircle } from 'lucide-react';
import { formatTime } from '@/shared/lib/format';
import type { DraftSaveStatus as Status } from '../hooks/useServerDraftSync';

/**
 * Says whether the answers are saved on the server. It lives in the
 * questionnaire's sticky band, so it is always in view (usability test P02
 * did not know the answers were saved): saving, saved with its time, or the
 * error. Announced politely by screen readers; color is never the only
 * signal (icon and text).
 */
export function DraftSaveStatus({ status }: { readonly status: Status }): JSX.Element {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-muted-foreground flex items-center gap-1.5 text-sm"
    >
      {status.kind === 'saving' && (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Guardando…
        </>
      )}
      {status.kind === 'saved' && (
        <>
          <CloudCheck className="text-azul-icesi size-4" aria-hidden="true" />
          Guardado automáticamente a las {formatTime(status.at)}; puedes salir y volver.
        </>
      )}
      {status.kind === 'error' && (
        <>
          <CloudAlert className="size-4" aria-hidden="true" />
          Error al guardar. Lo intentamos de nuevo; tus respuestas siguen en esta pestaña.
        </>
      )}
      {status.kind === 'idle' && (
        <>
          <CloudCheck className="text-azul-icesi size-4" aria-hidden="true" />
          Se guarda automáticamente.
        </>
      )}
    </p>
  );
}
