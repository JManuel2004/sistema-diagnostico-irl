import type { JSX, ReactNode } from 'react';

/**
 * Guardia de ruta — placeholder.
 *
 * En Stage 1 renderiza los children sin condicionar — ninguna de las
 * tres historias objetivo (HU-07, HU-08, HU-09) requiere todavía un
 * flujo de sign-in OIDC, y forzarlo bloquearía el desarrollo local
 * sin Keycloak corriendo.
 *
 * Stage 2 (HU-01 / RF-00) conecta este wrapper a `react-oidc-context`:
 *   - Si `useAuth().isAuthenticated` es true → renderizar children.
 *   - Si no → llamar `signinRedirect()` y renderizar un loader.
 *
 * Mantener el wrapper en la tabla de rutas aunque sea un no-op
 * documenta la intención — cuando llegue Stage 2 el cambio es de un
 * solo archivo.
 */
interface ProtectedRouteProps {
  readonly children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  return <>{children}</>;
}
