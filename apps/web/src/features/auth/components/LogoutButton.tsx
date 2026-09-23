import type { JSX } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useLogout } from '../hooks/useLogout';

/**
 * Logout from the ecosystem.
 *
 * The copy says just "Cerrar sesión", but keep in mind the logout is
 * centralized: Core runs `GlobalSignOut` in Cognito, so the user leaves
 * every INNLAB product, not only this one.
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
      {/* On mobile only the icon remains; the text is still its accessible name. */}
      <span className="sr-only sm:not-sr-only">
        {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </span>
    </Button>
  );
}
