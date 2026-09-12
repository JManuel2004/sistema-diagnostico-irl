import type { JSX } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';

/**
 * Identidad del usuario en la cabecera (DIAGIRL-25).
 *
 * Cumple el reconocimiento visible que pide la historia: nombre, correo
 * y —cuando existe— la empresa a la que pertenece.
 *
 * Nunca bloquea la pantalla. Si el contexto no llega, esta pieza
 * desaparece en silencio: quien informa del fallo y frena el diagnóstico
 * es `UserContextGate`, y duplicar el mensaje de error en la cabecera
 * solo añadiría ruido.
 */
export function CurrentUserBadge(): JSX.Element | null {
  const { data, isSuccess } = useCurrentUser();

  if (!isSuccess) return null;

  const { firstName, lastName, email } = data.user;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const company = data.core.companies.find((c) => c.id === data.core.companyId);

  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-foreground text-sm font-semibold">{fullName || email}</span>
      <span className="text-muted-foreground text-xs">
        {company ? `${email} · ${company.name}` : email}
      </span>
    </div>
  );
}
