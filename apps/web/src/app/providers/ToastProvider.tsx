import type { JSX, PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

/**
 * Mounts Sonner's `Toaster` once at the root. Any descendant component can
 * emit toasts with `import { toast } from 'sonner'` — no extra context is
 * needed.
 *
 * `richColors` applies semantic colors per type (success/error/info),
 * `closeButton` adds the close icon for accessibility.
 */
export function ToastProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ duration: 5000 }} />
    </>
  );
}
