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
 * Identidad del usuario en la cabecera (DIAGIRL-25).
 *
 * Cumple el reconocimiento visible que pide la historia con un patrón
 * de menú de cuenta (avatar → desplegable con nombre, correo y cierre
 * de sesión), en vez de mostrar el detalle permanentemente en la
 * cabecera.
 *
 * Nunca bloquea la pantalla. Si el contexto no llega, esta pieza
 * desaparece en silencio: quien informa del fallo y frena el diagnóstico
 * es `UserContextGate`, y duplicar el mensaje de error en la cabecera
 * solo añadiría ruido.
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
