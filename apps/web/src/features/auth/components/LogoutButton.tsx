import type { JSX } from 'react';
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
    <Button variant="ghost" size="sm" onClick={logout} disabled={isLoggingOut}>
      {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </Button>
  );
}
