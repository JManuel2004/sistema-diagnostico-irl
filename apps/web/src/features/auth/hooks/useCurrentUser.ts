import { useQuery } from '@tanstack/react-query';
import type { MeContextResponse } from '@innlab/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { hasStoredSession } from '@/shared/auth/session';
import { getMeContext } from '../api/me.api';

/**
 * Usuario autenticado y su contexto de empresa (DIAGIRL-25).
 *
 * Única fuente del perfil en el frontend. El access token del pool
 * compartido solo trae el `sub`, así que nombre y correo no se pueden
 * leer del token: hay que pedirlos.
 *
 * `enabled` evita disparar la consulta sin sesión guardada, que
 * devolvería 401 y haría que el interceptor de `http` expulsara al
 * usuario al Hub justo mientras `ProtectedRoute` ya lo está redirigiendo.
 *
 * Sin reintentos: el contexto depende de que INNLAB Core responda, y
 * ante una caída suya preferimos avisar rápido y ofrecer reintentar a
 * mano (RF-01, escenario de contexto no disponible) antes que dejar la
 * pantalla bloqueada mientras se agotan los reintentos automáticos.
 */
export function useCurrentUser() {
  return useQuery<MeContextResponse>({
    queryKey: queryKeys.session.context,
    queryFn: getMeContext,
    enabled: hasStoredSession(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
