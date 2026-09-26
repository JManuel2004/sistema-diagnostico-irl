import type { JSX } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useLogout } from '../hooks/useLogout';

/**
 * The user's identity in the header (DIAGIRL-25).
 *
 * It gives the visible recognition the story asks for with an account menu
 * (avatar → dropdown with name, email and logout) instead of showing the
 * detail permanently in the header. The logout is centralized: Core runs
 * `GlobalSignOut` in Cognito, so the user leaves every INNLAB product.
 *
 * It never blocks the screen. If the context does not arrive, this piece
 * disappears silently: `UserContextGate` is what reports the failure and
 * stops the diagnostic, and repeating the error in the header would only
 * add noise.
 */
export function UserMenu(): JSX.Element | null {
  const { data, isSuccess } = useCurrentUser();
  const { logout, isLoggingOut } = useLogout();

  if (!isSuccess) return null;

  const { firstName, lastName, email } = data.user;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const initial = (fullName || email).charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="bg-primary text-primary-foreground focus-visible:ring-ring flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="Cuenta"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="text-foreground text-sm font-semibold">{fullName || email}</span>
          <span className="text-muted-foreground text-xs">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
