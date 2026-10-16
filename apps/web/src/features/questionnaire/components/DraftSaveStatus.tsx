import type { JSX } from 'react';
import { CloudAlert, CloudCheck, LoaderCircle } from 'lucide-react';
import { formatTime } from '@/shared/lib/format';
import type { DraftSaveStatus as Status } from '../hooks/useServerDraftSync';

/**
 * Says whether the answers are saved on the server. Announced politely by
 * screen readers; color is never the only signal (icon and text).
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
          Guardando tus respuestas…
        </>
      )}
      {status.kind === 'saved' && (
        <>
          <CloudCheck className="text-azul-icesi size-4" aria-hidden="true" />
          Respuestas guardadas a las {formatTime(status.at)}. Puedes cerrar sesión y continuar
          después.
        </>
      )}
      {status.kind === 'error' && (
        <>
          <CloudAlert className="size-4" aria-hidden="true" />
          No pudimos guardar tus respuestas; lo intentaremos de nuevo. Siguen en esta pestaña.
        </>
      )}
      {status.kind === 'idle' && 'Tus respuestas se guardan automáticamente.'}
    </p>
  );
}
