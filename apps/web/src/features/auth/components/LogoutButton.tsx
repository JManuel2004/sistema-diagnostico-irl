import type { JSX } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useLogout } from '../hooks/useLogout';

/**
 * Salida de sesión del ecosistema.
 *
 * El copy dice "Cerrar sesión" a secas, pero conviene recordar que el
 * logout es centralizado: Core hace `GlobalSignOut` en Cognito, así que
 * el usuario sale de todos los productos INNLAB, no solo de este.
 */
export function LogoutButton(): JSX.Element {
  const { logout, isLoggingOut } = useLogout();

  return (
    <Button
      variant="ghost"
      onClick={logout}
      disabled={isLoggingOut}
      className="text-muted-foreground hover:text-foreground w-11 px-0 sm:w-auto sm:px-4"
    >
      <LogOut className="size-5 shrink-0" aria-hidden="true" />
      {/* En móvil solo queda el icono; el texto sigue siendo su nombre accesible. */}
      <span className="sr-only sm:not-sr-only">
        {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </span>
    </Button>
  );
}
