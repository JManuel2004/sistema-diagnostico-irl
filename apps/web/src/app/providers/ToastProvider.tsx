import type { JSX, PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

/**
 * Monta el `Toaster` de Sonner una vez en el root. Cualquier componente
 * descendiente puede emitir toasts vía `import { toast } from 'sonner'`
 * — no se requiere contexto adicional.
 *
 * `richColors` aplica colores semánticos por tipo (success/error/info),
 * `closeButton` añade el ícono de cierre por accesibilidad.
 */
export function ToastProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ duration: 5000 }} />
    </>
  );
}
