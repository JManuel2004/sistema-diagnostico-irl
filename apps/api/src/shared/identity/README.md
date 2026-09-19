# identity

## Alcance
Anticorruption Layer hacia INNLAB Core y el pool de Cognito compartido: autentica la petición (JWT), expone quién es el usuario (`@CurrentUser()`) y resuelve su contexto (empresa, rol) desde Core. **No es dominio propio de SEMI**: la integración con Core es externa (`innlab-core-http.client.ts` lo declara en su cabecera).

## Reglas que deben respetarse
- **No hay login, hash de contraseñas ni sesiones aquí**: la autenticación la hace Cognito; este módulo solo valida el token.
- El JWT no lleva empresa, rol ni workspace: esos datos se leen de Core por `UserContextPort`, nunca se infieren del token.
- Core se llama con credenciales de servicio (`client_credentials`), nunca con el JWT del usuario (RNF-05); los tokens no se guardan en base de datos.
- `JwtAuthGuard` es global (`APP_GUARD`): toda ruta requiere token salvo las marcadas `@Public()`.
- Los decoradores y el guard viven en `presentation/` (son HTTP); el tipo `AuthenticatedUser` se publica por `application/dtos/` para que otros módulos no importen el dominio de identity.

## Nivel de completitud
Implementado: validación JWT (HU-01), contexto de usuario con caché en memoria (HU-02). Sin persistencia propia.

## Responsabilidad (lenguaje ubicuo)
"Quién está usando el sistema y a qué empresa pertenece".

## Conceptos de dominio
`AuthenticatedUser`, `UserContext`.

## Qué expone hacia afuera
`@CurrentUser()`, `@Public()`, `JwtAuthGuard`, tipo `AuthenticatedUser`, `ResolveUserContextUseCase`. HTTP: `me/context`.

## De qué depende
INNLAB Core (HTTP, integración externa) y el JWKS de Cognito.

## Datos que posee
Ninguna tabla. Caché en memoria del contexto de usuario.

## Cobertura de pruebas
- **Unitarias:** estrategia JWT, guard, cliente de Core, caché, caso de uso.
- **E2E:** `cognito-jwt-guard`; el resto de suites e2e atraviesan la autenticación real con un JWT firmado y un JWKS simulado.
