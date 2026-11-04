# Matriz de aceptación funcional

Cada requisito funcional del SRS con los casos de prueba que lo verifican y su resultado en la última ejecución.
Este archivo se genera con `node scripts/test-reports.mjs matrix <reportes> docs/testing/matriz-aceptacion.md`
a partir de los reportes de Jest, Vitest y Playwright; el pipeline de Jenkins lo regenera en cada ejecución.

Resultados de: Jenkins, ejecución 2 de la rama feature/simulated-auth-tests-and-report-ux. Matriz generada: 16 de octubre de 2026 a las 4:41 p. m.
Reportes leídos: api sí, web sí, browser sí.

## Resumen

| Requisito | Descripción | Casos | Pasan | Fallan | Omitidos | Niveles | Resultado |
|---|---|---|---|---|---|---|---|
| RF-00 | Autenticación mediante el ecosistema INNLAB | 64 | 64 | 0 | 0 | API extremo a extremo; API unitaria; Frontend; Navegador, stack real | Pasa |
| RF-01 | Obtención del contexto del usuario autenticado | 29 | 26 | 0 | 3 | API integración; API unitaria; Frontend | Pasa |
| RF-02 | Acceso al diagnóstico existente | 106 | 106 | 0 | 0 | API extremo a extremo; API integración; API unitaria; Frontend; Navegador, stack real | Pasa |
| RF-03 | Verificación de consentimiento para el tratamiento de datos | 47 | 47 | 0 | 0 | API extremo a extremo; API unitaria; Frontend; Navegador, API simulada; Navegador, stack real | Pasa |
| RF-04 | Captura de información de la iniciativa | 99 | 99 | 0 | 0 | API extremo a extremo; API integración; API unitaria; Frontend; Navegador, API simulada; Navegador, stack real | Pasa |
| RF-05 | Presentación del cuestionario IRL | 146 | 146 | 0 | 0 | API extremo a extremo; API integración; API unitaria; Frontend; Navegador, API simulada; Navegador, stack real | Pasa |
| RF-06 | Verificación de completitud antes de procesar el diagnóstico | 73 | 73 | 0 | 0 | API unitaria; Frontend; Navegador, stack real | Pasa |
| RF-07 | Cálculo del nivel IRL por dimensión | 112 | 112 | 0 | 0 | API unitaria | Pasa |
| RF-08 | Identificación del cuello de botella principal | 93 | 93 | 0 | 0 | API unitaria; Frontend | Pasa |
| RF-09 | Presentación del gráfico de perfil de madurez | 74 | 74 | 0 | 0 | API unitaria; Frontend | Pasa |
| RF-10 | Señalización visual de desequilibrios dimensionales | 58 | 58 | 0 | 0 | API unitaria; Frontend | Pasa |
| RF-11 | Oferta del análisis profundo al usuario | 48 | 48 | 0 | 0 | API extremo a extremo; API unitaria; Frontend; Navegador, stack real | Pasa |
| RF-12 | Clasificación de desequilibrios entre pares de dimensiones | 30 | 30 | 0 | 0 | API unitaria | Pasa |
| RF-13 | Detección de dimensiones en estado crítico | 21 | 21 | 0 | 0 | API extremo a extremo; API unitaria; Frontend | Pasa |
| RF-14 | Generación del roadmap de orientaciones por dimensión | 157 | 157 | 0 | 0 | API extremo a extremo; API integración; API unitaria; Frontend | Pasa |
| RF-15 | Recomendación del servicio del portafolio INNLAB | 252 | 252 | 0 | 0 | API extremo a extremo; API integración; API unitaria; Frontend; Navegador, stack real | Pasa |
| RF-16 | Visualización y descarga del reporte completo | 60 | 60 | 0 | 0 | API extremo a extremo; API unitaria; Frontend; Navegador, stack real | Pasa |
| RF-17 | Notificación al equipo INNLAB al completar el análisis profundo | 7 | 7 | 0 | 0 | API extremo a extremo; API unitaria | Pasa |

Casos leídos en total: 1577 (fallan 0). Un mismo caso puede verificar más de un requisito.

## Detalle por requisito

### RF-00. Autenticación mediante el ecosistema INNLAB

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) acepta un token valido y expone las claims como usuario | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) rechaza una peticion sin cabecera Authorization | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) rechaza un token emitido por otro issuer | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) rechaza un id_token donde se espera un access token | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) rechaza un token firmado con otra clave | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) rechaza un token vencido | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) acepta el mismo token mientras no ha vencido | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) rechaza un token cuyo kid no esta en el JWKS | Pasa |
| API extremo a extremo | `test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts` | Guard global de Cognito (e2e) deja pasar una ruta @Public() sin token | Pasa |
| API unitaria | `test/unit/shared/identity/presentation/guards/jwt-auth.guard.spec.ts` | JwtAuthGuard lets a @Public() route through without invoking passport | Pasa |
| API unitaria | `test/unit/shared/identity/presentation/guards/jwt-auth.guard.spec.ts` | JwtAuthGuard hands an unmarked route to the jwt strategy | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/strategies/cognito-jwt.strategy.spec.ts` | CognitoJwtStrategy maps Cognito claims onto the authenticated user | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/strategies/cognito-jwt.strategy.spec.ts` | CognitoJwtStrategy rejects an id_token used where an access token is required | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/strategies/cognito-jwt.strategy.spec.ts` | CognitoJwtStrategy carries no company context — that only exists in INNLAB Core | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/strategies/cognito-jwt.strategy.spec.ts` | CognitoJwtStrategy acepta el token real del pool, que solo trae sub | Pasa |
| Frontend | `src/app/router/__tests__/ProtectedRoute.test.tsx` | ProtectedRoute renderiza la pantalla protegida cuando hay sesión | Pasa |
| Frontend | `src/app/router/__tests__/ProtectedRoute.test.tsx` | ProtectedRoute manda al Hub y oculta el contenido cuando no hay sesión | Pasa |
| Frontend | `src/app/router/__tests__/ProtectedRoute.test.tsx` | ProtectedRoute conserva la ruta pedida para volver después del login | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema no reporta sesión cuando no hay nada guardado | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema persiste y recupera ambos tokens | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema expone el accessToken y no el id_token como credencial | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema descarta una sesión guardada sin accessToken | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema descarta una sesión guardada con accessToken que no es texto | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema descarta una sesión guardada con accessToken vacío | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema descarta una sesión guardada con token que no es texto | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema descarta una sesión guardada con un valor que no es un objeto | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema descarta una sesión guardada con null | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema descarta una sesión guardada con un arreglo | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema acepta una sesión sin id_token y lo toma como cadena vacía | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema ignora campos que no son del contrato | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema sobrevive a un localStorage con JSON corrupto | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema olvida la sesión al cerrarla | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema manda al Hub con la url de callback como redirect | Pasa |
| Frontend | `src/shared/auth/__tests__/session.test.ts` | sesión del ecosistema recuerda y consume la ruta original una sola vez | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode canjea el código por ambos tokens | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode rechaza una respuesta sin accessToken | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode rechaza una respuesta con un accessToken que no es texto en vez de fiarse del tipo | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode rechaza una respuesta con un accessToken vacío en vez de fiarse del tipo | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode rechaza una respuesta con un cuerpo que no es un objeto en vez de fiarse del tipo | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode rechaza una respuesta con un cuerpo nulo en vez de fiarse del tipo | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode acepta una respuesta sin id_token y devuelve solo los campos del contrato | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode explica en claro que el código ya se usó o caducó | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode distingue un fallo de red de un rechazo de Core | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | exchangeSsoCode reporta el status cuando Core rechaza por otra razón | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | isSessionAlive manda el accessToken como Bearer y acepta la sesión viva | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | isSessionAlive da la sesión por muerta solo ante un 401 | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | isSessionAlive no expulsa al usuario cuando Core falla por otra razón | Pasa |
| Frontend | `src/features/auth/api/__tests__/core-auth.api.test.ts` | logoutFromCore cierra la sesión centralizada con el accessToken | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser obtiene nombre, correo e identificador del usuario autenticado | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser expone la empresa a la que pertenece | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser acepta un usuario que todavia no pertenece a ninguna empresa | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser queda en error cuando Core no responde, sin reintentar | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser no consulta nada si no hay sesion guardada | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange canjea el código y persiste la sesión | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange canjea el código una sola vez aunque el efecto se remonte | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange vuelve a la ruta recordada tras el canje | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange sin una ruta recordada, lleva al panel: ahí se elige un diagnóstico anterior o uno nuevo | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange reporta error sin guardar sesión cuando el código ya expiró | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange falla de inmediato si la URL no traía código | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange bajo StrictMode (doble montaje del efecto) sigue resolviendo el estado de error | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useSsoExchange.test.tsx` | useSsoExchange bajo StrictMode (doble montaje del efecto) sigue resolviendo el camino feliz y persiste la sesion | Pasa |
| Navegador, stack real | `tests/full-stack/errors.spec.ts` | [chromium] una sesión inválida lleva de nuevo al inicio de sesión | Pasa |
| Navegador, stack real | `tests/full-stack/errors.spec.ts` | [firefox] una sesión inválida lleva de nuevo al inicio de sesión | Pasa |
| Navegador, stack real | `tests/full-stack/errors.spec.ts` | [msedge] una sesión inválida lleva de nuevo al inicio de sesión | Pasa |

### RF-01. Obtención del contexto del usuario autenticado

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API integración | `test/integration/external/innlab-core.spec.ts` | INNLAB Core real (instancia de desarrollo) acepta la llave interna del sistema: un usuario desconocido responde 404, no 401 | Omitido |
| API integración | `test/integration/external/innlab-core.spec.ts` | INNLAB Core real (instancia de desarrollo) rechaza una llave interna equivocada | Omitido |
| API integración | `test/integration/external/innlab-core.spec.ts` | INNLAB Core real (instancia de desarrollo) devuelve el contexto de un usuario real con la forma que el sistema espera | Omitido |
| API unitaria | `test/unit/shared/identity/infrastructure/integrations/innlab-core-http.client.spec.ts` | InnlabCoreHttpClient calls the context endpoint with the static internal key | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/integrations/innlab-core-http.client.spec.ts` | InnlabCoreHttpClient translates a 404 from Core into a domain NotFoundError | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/integrations/innlab-core-http.client.spec.ts` | InnlabCoreHttpClient fails loudly when our internal key is rejected | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/integrations/innlab-core-http.client.spec.ts` | InnlabCoreHttpClient fails loudly when Core is unreachable rather than assuming no context | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/cache/in-memory-user-context.cache.spec.ts` | InMemoryUserContextCache returns null for a user it has never seen | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/cache/in-memory-user-context.cache.spec.ts` | InMemoryUserContextCache returns a stored context while it is still fresh | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/cache/in-memory-user-context.cache.spec.ts` | InMemoryUserContextCache expires the context once the TTL has elapsed | Pasa |
| API unitaria | `test/unit/shared/identity/infrastructure/cache/in-memory-user-context.cache.spec.ts` | InMemoryUserContextCache drops the context on invalidate | Pasa |
| API unitaria | `test/unit/shared/identity/application/use-cases/resolve-user-context.use-case.spec.ts` | ResolveUserContextUseCase reads from Core and caches the result on a cache miss | Pasa |
| API unitaria | `test/unit/shared/identity/application/use-cases/resolve-user-context.use-case.spec.ts` | ResolveUserContextUseCase serves a cache hit without calling Core | Pasa |
| API unitaria | `test/unit/shared/identity/application/use-cases/resolve-user-context.use-case.spec.ts` | ResolveUserContextUseCase bypasses a cache hit when forceRefresh is set | Pasa |
| API unitaria | `test/unit/shared/identity/application/use-cases/resolve-user-context.use-case.spec.ts` | ResolveUserContextUseCase propagates a Core failure instead of returning an empty context | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserContextGate.test.tsx` | UserContextGate permite iniciar el diagnóstico cuando el contexto está disponible | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserContextGate.test.tsx` | UserContextGate informa que el servicio no está disponible y retira la acción | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserContextGate.test.tsx` | UserContextGate permite reintentar la obtención del contexto | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserContextGate.test.tsx` | UserContextGate oculta la acción mientras carga, pero sin mostrar error | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserMenu.test.tsx` | UserMenu no renderiza nada mientras el contexto no esté disponible | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserMenu.test.tsx` | UserMenu muestra la inicial del nombre en el avatar y mantiene el detalle oculto hasta abrir | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserMenu.test.tsx` | UserMenu despliega nombre y correo al hacer click en el avatar | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserMenu.test.tsx` | UserMenu cae al correo cuando el nombre viene vacío | Pasa |
| Frontend | `src/features/auth/components/__tests__/UserMenu.test.tsx` | UserMenu cierra la sesión al elegir "Cerrar sesión" | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser obtiene nombre, correo e identificador del usuario autenticado | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser expone la empresa a la que pertenece | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser acepta un usuario que todavia no pertenece a ninguna empresa | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser queda en error cuando Core no responde, sin reintentar | Pasa |
| Frontend | `src/features/auth/hooks/__tests__/useCurrentUser.test.tsx` | useCurrentUser no consulta nada si no hay sesion guardada | Pasa |

### RF-02. Acceso al diagnóstico existente

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) reads back what was saved, with the time of the save | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) replaces the previous draft instead of adding to it | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) a diagnostic without a saved draft reads as empty | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) goes with the diagnostic when this is deleted | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) deleting the draft leaves the diagnostic | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) the database refuses an entry with neither level nor justification | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) the database refuses a level out of 1..5 | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) the database refuses a blank justification | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) crea un diagnóstico del usuario autenticado, al comienzo del recorrido | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) el diagnóstico queda guardado, pero no se lista mientras no tenga perfil | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) si hay un diagnóstico sin terminar pregunta antes: responde 409 y no elimina nada (estaba en STARTED) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) si hay un diagnóstico sin terminar pregunta antes: responde 409 y no elimina nada (estaba en WITH_INITIATIVE) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) si hay un diagnóstico sin terminar pregunta antes: responde 409 y no elimina nada (estaba en QUESTIONNAIRE_IN_PROGRESS) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) si hay un diagnóstico sin terminar se ofrece para continuarlo, y con la decisión de descartarlo lo elimina y crea uno nuevo | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) sin diagnóstico en curso, consultarlo responde 404 | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) cuando ya tiene diagnósticos con resultados crea uno nuevo y conserva el anterior en PROFILE_GENERATED | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) cuando ya tiene diagnósticos con resultados crea uno nuevo y conserva el anterior en DEEP_ANALYSIS_COMPLETE | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) iniciar uno nuevo no elimina el diagnóstico sin terminar de otro usuario | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/start-diagnosis.e2e-spec.ts` | Iniciar diagnóstico (e2e) sin token responde 401 | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) saves what was answered so far and marks the questionnaire as started | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) a later session of the same user reads it back, and the panel offers to continue | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) nobody else can read or overwrite it (404, as if it did not exist) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) rejects a malformed draft (422) and keeps the saved one | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) once the answers are processed the draft is gone and cannot change (409) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/view-completed-diagnosis.e2e-spec.ts` | Consultar un diagnóstico inicial completado (e2e) GET /diagnostics lista solo los diagnósticos completados del usuario | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/view-completed-diagnosis.e2e-spec.ts` | Consultar un diagnóstico inicial completado (e2e) GET /diagnostics identifica cada uno por su iniciativa, la fecha de su perfil y su nivel global | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/view-completed-diagnosis.e2e-spec.ts` | Consultar un diagnóstico inicial completado (e2e) un diagnóstico propio se lee con su estado y su perfil guardado, sin recalcular nada | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/view-completed-diagnosis.e2e-spec.ts` | Consultar un diagnóstico inicial completado (e2e) un diagnóstico ajeno o inexistente responde 404 al diagnóstico de otro usuario | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/view-completed-diagnosis.e2e-spec.ts` | Consultar un diagnóstico inicial completado (e2e) un diagnóstico ajeno o inexistente responde 404 al diagnóstico que no existe | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving replaces the draft and returns it as saved, in the contract shape | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving the first save marks the questionnaire as started | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving later saves do not touch the diagnostic | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving answers someone else's diagnostic as missing and saves nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in STARTED (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in WITH_CONSENT (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in PROFILE_GENERATED (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in DEEP_ANALYSIS_COMPLETE (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses a statement outside the diagnostic's questionnaire (422) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server reading returns the saved draft to its owner | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server reading returns an empty draft when nothing was saved | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server reading never shows the draft of someone else's diagnostic | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/list-user-diagnoses.query.spec.ts` | ListUserDiagnosesQuery lists only the completed diagnostics of the user, in the repository order | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/list-user-diagnoses.query.spec.ts` | ListUserDiagnosesQuery gives each one when its profile was computed and its global level, as stored | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/list-user-diagnoses.query.spec.ts` | ListUserDiagnosesQuery does not read any profile when the user has no completed diagnostic | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/list-my-diagnoses.use-case.spec.ts` | ListMyDiagnosesUseCase names each of the caller's diagnostics by the initiative it was answered for | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase creates one owned by the caller, at the start of the flow | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase saves the diagnostic it returns | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase with a diagnostic in progress asks first: answers DiagnosisInProgressError and deletes nothing (STARTED) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase with a diagnostic in progress asks first: answers DiagnosisInProgressError and deletes nothing (WITH_INITIATIVE) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase with a diagnostic in progress asks first: answers DiagnosisInProgressError and deletes nothing (QUESTIONNAIRE_IN_PROGRESS) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase with a diagnostic in progress once the user chose to discard it, deletes it before creating the new one | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase a completed diagnostic is not in progress: a new one starts without asking | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/start-diagnosis.use-case.spec.ts` | StartDiagnosisUseCase creates a new diagnostic on every call: starting is always from the beginning | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase returns the caller's diagnostic as the contract describes it | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in WITH_INITIATIVE the deep analysis accepted flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in QUESTIONNAIRE_IN_PROGRESS the deep analysis accepted flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in PROFILE_GENERATED the deep analysis accepted flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in DEEP_ANALYSIS_IN_PROGRESS the deep analysis accepted flag is true | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in DEEP_ANALYSIS_COMPLETE the deep analysis accepted flag is true | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in PROFILE_GENERATED the deep analysis completed flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in DEEP_ANALYSIS_IN_PROGRESS the deep analysis completed flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in DEEP_ANALYSIS_COMPLETE the deep analysis completed flag is true | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in STARTED the completed flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in WITH_CONSENT the completed flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in WITH_INITIATIVE the completed flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in QUESTIONNAIRE_IN_PROGRESS the completed flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in QUESTIONNAIRE_COMPLETE the completed flag is false | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in PROFILE_GENERATED the completed flag is true | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in DEEP_ANALYSIS_IN_PROGRESS the completed flag is true | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase in DEEP_ANALYSIS_COMPLETE the completed flag is true | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase answers not found for a diagnostic that does not exist | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-diagnosis.use-case.spec.ts` | GetDiagnosisUseCase answers not found, not forbidden, for someone else's diagnostic | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft keeps a level, a justification, or both, per statement | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft drops an entry with neither, and treats a blank justification as missing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects the level 0, outside the Likert scale | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects the level 6, outside the Likert scale | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects the level 2.5, outside the Likert scale | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects a justification longer than an answer accepts | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects a statement that appears twice | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft an empty draft has nothing and was never saved | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-in-progress-diagnosis.query.spec.ts` | GetInProgressDiagnosisQuery returns the most recently started diagnostic without a profile | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-in-progress-diagnosis.query.spec.ts` | GetInProgressDiagnosisQuery answers NotFoundError when every diagnostic is completed | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa muestra la iniciativa del diagnóstico completado más reciente | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa ofrece editar la iniciativa y ver los resultados del más reciente, no el cuestionario | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con diagnósticos completados lista todos, del más reciente al más antiguo, con su iniciativa, fecha y nivel global | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con diagnósticos completados ofrece también iniciar uno nuevo, que conserva los anteriores | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con un diagnóstico en curso lo ofrece aunque esta pestaña no tenga nada: sus respuestas están en el servidor | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con un diagnóstico en curso iniciar uno nuevo pregunta antes, y continuar lleva al que tiene | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con un diagnóstico en curso descartarlo envía esa decisión y abre el asistente del nuevo | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con un diagnóstico en curso cancelar vuelve al panel sin descartar nada | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con un diagnóstico en curso si el servidor avisa de uno que el panel no conocía (otro dispositivo), pregunta en vez de descartarlo | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa con un diagnóstico en curso no ofrece el borrador que esta pestaña guarde de un diagnóstico que ya no está en curso | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa sin ningún diagnóstico, la única acción es iniciar uno, y al crearlo abre el asistente | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa navegación lleva la navegación principal y el descriptor institucional lleva al panel | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa avisa si no se pudo cargar el panel | Pasa |
| Frontend | `src/pages/__tests__/DashboardPage.test.tsx` | DashboardPage — panel de iniciativa muestra un estado de carga | Pasa |
| Frontend | `src/pages/__tests__/StartDiagnosticPage.test.tsx` | StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico» pide el diagnóstico al abrirse y abre el asistente, sin otro clic | Pasa |
| Frontend | `src/pages/__tests__/StartDiagnosticPage.test.tsx` | StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico» pide el diagnóstico una sola vez, también bajo StrictMode | Pasa |
| Frontend | `src/pages/__tests__/StartDiagnosticPage.test.tsx` | StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico» muestra que está preparando el diagnóstico mientras espera | Pasa |
| Frontend | `src/pages/__tests__/StartDiagnosticPage.test.tsx` | StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico» avisa si no se pudo y permite reintentar | Pasa |
| Frontend | `src/pages/__tests__/StartDiagnosticPage.test.tsx` | StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico» sin el perfil del usuario no pide el diagnóstico y dice por qué | Pasa |
| Frontend | `src/pages/__tests__/StartDiagnosticPage.test.tsx` | StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico» con un diagnóstico sin terminar pregunta qué hacer en vez de descartarlo, y ofrece continuarlo | Pasa |
| Frontend | `src/pages/__tests__/StartDiagnosticPage.test.tsx` | StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico» con un diagnóstico sin terminar descartarlo pide el diagnóstico nuevo con esa decisión y abre el asistente | Pasa |
| Navegador, stack real | `tests/full-stack/decline-deep-analysis.spec.ts` | [chromium] el líder no continúa con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/decline-deep-analysis.spec.ts` | [firefox] el líder no continúa con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/decline-deep-analysis.spec.ts` | [msedge] el líder no continúa con el análisis profundo | Pasa |

### RF-03. Verificación de consentimiento para el tratamiento de datos

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) consent text serves the current text, the one to accept | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) initiatives creates an initiative with its consent and lists it for its owner only | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) initiatives refuses to create an initiative with an outdated version (409) or a malformed one (422) | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) initiatives accepting the consent again adds to the history instead of replacing it | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) initiatives answers 404 for a missing initiative and 403 for someone else's | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) profile of a diagnostic's initiative registering it moves the diagnostic from STARTED to WITH_INITIATIVE | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) profile of a diagnostic's initiative refuses someone else's diagnostic (403) and a missing one (404), writing nothing | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) profile of a diagnostic's initiative refuses someone else's initiative (403) | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) profile of a diagnostic's initiative is frozen once the deep analysis is accepted (409) | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/consent-and-ownership.e2e-spec.ts` | Initiatives and consent (e2e) profile of a diagnostic's initiative refuses to read someone else's initiative profile with 403 | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/record-consent.use-case.spec.ts` | RecordConsentUseCase adds an acceptance of a new version and keeps the earlier one | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/record-consent.use-case.spec.ts` | RecordConsentUseCase refuses a version that is not the current one | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/record-consent.use-case.spec.ts` | RecordConsentUseCase answers 404 for a missing initiative and 403 for someone else's, before anything else | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/create-initiative.use-case.spec.ts` | CreateInitiativeUseCase creates the initiative together with the acceptance of the current consent text | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/create-initiative.use-case.spec.ts` | CreateInitiativeUseCase refuses a version that is not the current one and stores nothing | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept defaults acceptedAt to now when not given | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept accepts a well-formed terms version v1 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept accepts a well-formed terms version v2 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept accepts a well-formed terms version v2.1 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept accepts a well-formed terms version v10.3.2 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept rejects a malformed terms version 1 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept rejects a malformed terms version version-1 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept rejects a malformed terms version v | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept rejects a malformed terms version v1. | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent accept rejects a malformed terms version  | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/consent.entity.spec.ts` | Consent fromPersistence / toPersistence round-trips | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente orden de los pasos un diagnóstico nuevo entra por el consentimiento | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa aceptar el texto abre la iniciativa sin enviar nada al servidor | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa con el formulario vacío no avanza y marca cada campo | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa «Atrás» y «Continuar» van en la misma fila, como en los demás pasos | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa lo escrito sobrevive a ir y volver entre la iniciativa y el consentimiento | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa recargar la página en la iniciativa no pierde el formulario ni la aceptación | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa el borrador de otro diagnóstico no cuenta | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento muestra el texto del consentimiento y no deja continuar sin aceptarlo | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento al aceptar y completar la iniciativa la crea, registra su información y abre el cuestionario | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento vacía el borrador cuando la iniciativa quedó registrada | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento si la información falla tras crear la iniciativa, avisa y el reintento no crea otra | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento si el texto cambió mientras se leía (409) pide recargar y no registra la iniciativa | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento un error del servidor al aceptar no registra la iniciativa | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente elegir una iniciativa existente con el consentimiento vigente registra la información en el acto y abre el cuestionario | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente elegir una iniciativa existente con un consentimiento de un texto anterior registra la aceptación de ese texto al guardar | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [chromium] from the landing to the results through the four wizard steps | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [firefox] from the landing to the results through the four wizard steps | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [msedge] from the landing to the results through the four wizard steps | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [chromium] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [firefox] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [msedge] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |

### RF-04. Captura de información de la iniciativa

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) catálogos de la iniciativa sirve el sector del caso y las tres etapas en orden | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) consentimiento previo a la iniciativa (RF-03 / RNF-06) no guarda el perfil de una iniciativa sin consentimiento y responde 409 | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa guarda el perfil completo y lo devuelve con el sector y la etapa nombrados | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa lo que se guardó es lo que se lee de vuelta | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa avanza el diagnóstico de STARTED a WITH_INITIATIVE: el consentimiento es de la iniciativa | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa volver a registrarla la actualiza y no retrocede el diagnóstico | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa rechaza con 422 un perfil sin productType y no lo guarda | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa rechaza con 422 un perfil sin declaredStage y no lo guarda | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa rechaza con 422 un perfil sin teamDescription y no lo guarda | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa rechaza con 422 un perfil sin targetMarket y no lo guarda | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa rechaza con 422 un perfil sin currentFunding y no lo guarda | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) registro de la iniciativa rechaza con 404 una etapa que no existe | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) cuestionario con justificaciones procesa las 48 respuestas del caso y da el perfil esperado | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) cuestionario con justificaciones guarda la justificación junto a cada respuesta | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) cuestionario con justificaciones la justificación es opcional: una en blanco, una nula y una ausente se guardan como NULL | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) cuestionario con justificaciones rechaza con 422 una justificación de más de 1000 caracteres, sin guardar nada | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) cuestionario con justificaciones no deja procesar el cuestionario antes de registrar la iniciativa | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) resultados: qué se muestra depende del análisis profundo congela las respuestas: procesar de nuevo un diagnóstico con perfil responde 409 | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) resultados: qué se muestra depende del análisis profundo el perfil trae el estado crítico calculado por el backend: solo BRL | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) resultados: qué se muestra depende del análisis profundo el perfil trae el promedio IRL global (RF-09) de las seis dimensiones del caso | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) resultados: qué se muestra depende del análisis profundo cada puntaje trae lo que significa su nivel, y el global se redondea hacia arriba en x,5 | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) resultados: qué se muestra depende del análisis profundo el diagnóstico dice que el análisis profundo no fue aceptado, hasta que se acepta | Pasa |
| API extremo a extremo | `test/e2e/modules/initiative/registration-flow.e2e-spec.ts` | Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e) resultados: qué se muestra depende del análisis profundo un diagnóstico ajeno se responde como inexistente | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) the seed carries the sector of the case, the three stages and the consent text | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) seeding twice does not duplicate the sector | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) an initiative is stored with its first consent and listed for its owner | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) the consent is a history: a new acceptance is added, the earlier one kept | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) the database refuses a consent whose user is not the initiative's owner | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) the database refuses a consent to a text that was never published | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) reads back the whole snapshot of the diagnostic's profile | Pasa |
| API integración | `test/integration/database/initiative-repository.spec.ts` | Initiative — persistence (integration) saving again replaces the diagnostic's snapshot instead of adding another | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/register-initiative-profile.use-case.spec.ts` | RegisterInitiativeProfileUseCase saves the snapshot of the profile and then publishes InitiativeRegisteredEvent | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/register-initiative-profile.use-case.spec.ts` | RegisterInitiativeProfileUseCase refuses the profile while the consent is not accepted at the current version | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/register-initiative-profile.use-case.spec.ts` | RegisterInitiativeProfileUseCase freezes the profile once the deep analysis is accepted | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/register-initiative-profile.use-case.spec.ts` | RegisterInitiativeProfileUseCase refuses someone else's initiative and a missing one | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/register-initiative-profile.use-case.spec.ts` | RegisterInitiativeProfileUseCase checks the diagnostic ownership first | Pasa |
| API unitaria | `test/unit/modules/initiative/application/use-cases/register-initiative-profile.use-case.spec.ts` | RegisterInitiativeProfileUseCase replaces the snapshot of the same diagnostic when registered again | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register creates an initiative with the whole profile | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register trims every text field | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register rejects a name that is too short | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register rejects a name that is too long | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register requires productType: rejects blank and over 500 characters | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register requires declaredStage: rejects blank and over 500 characters | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register requires teamDescription: rejects blank and over 500 characters | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register requires targetMarket: rejects blank and over 500 characters | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register requires currentFunding: rejects blank and over 500 characters | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register rejects a team size of 0 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register rejects a team size of -1 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register rejects a team size of 1.5 | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile register rejects a team size of NaN | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative-profile.aggregate.spec.ts` | InitiativeProfile fromPersistence / toPersistence round-trips the whole profile | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative.aggregate.spec.ts` | Initiative is created with an identity of its own, owned by the user who creates it | Pasa |
| API unitaria | `test/unit/modules/initiative/domain/entities/initiative.aggregate.spec.ts` | Initiative round-trips its persistence shape | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente orden de los pasos no se puede saltar al paso «iniciativa» sin haber completado los anteriores | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa aceptar el texto abre la iniciativa sin enviar nada al servidor | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa con el formulario vacío no avanza y marca cada campo | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa «Atrás» y «Continuar» van en la misma fila, como en los demás pasos | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa lo escrito sobrevive a ir y volver entre la iniciativa y el consentimiento | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa recargar la página en la iniciativa no pierde el formulario ni la aceptación | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1 → 2: el consentimiento va antes de pedir la iniciativa el borrador de otro diagnóstico no cuenta | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento al aceptar y completar la iniciativa la crea, registra su información y abre el cuestionario | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento vacía el borrador cuando la iniciativa quedó registrada | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento si la información falla tras crear la iniciativa, avisa y el reintento no crea otra | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento si el texto cambió mientras se leía (409) pide recargar y no registra la iniciativa | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente paso 1: consentimiento un error del servidor al aceptar no registra la iniciativa | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente elegir una iniciativa existente ofrece las iniciativas del usuario y precarga la información de la más reciente | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente elegir una iniciativa existente elegir «Nueva iniciativa» deja el formulario vacío | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente elegir una iniciativa existente con el consentimiento vigente registra la información en el acto y abre el cuestionario | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente elegir una iniciativa existente con un consentimiento de un texto anterior registra la aceptación de ese texto al guardar | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente reanudar un diagnóstico con la información de la iniciativa ya registrada va al cuestionario | Pasa |
| Frontend | `src/pages/__tests__/DiagnosticWizardPage.test.tsx` | DiagnosticWizardPage — el asistente reanudar un diagnóstico con el borrador de una iniciativa que ya aceptó el texto vigente, ofrece guardarla | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) trae la iniciativa registrada, con los catálogos, para editarla | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) al guardar actualiza la iniciativa y vuelve al panel | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) con el análisis profundo aceptado no ofrece corregirla | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) el primer registro es el paso 1 del asistente: sin iniciativa se manda allí | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) todos los campos siguen siendo obligatorios al corregir | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) avisa si no se pudo guardar y conserva lo escrito | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) avisa si no se pudo cargar el formulario | Pasa |
| Frontend | `src/pages/__tests__/InitiativePage.test.tsx` | InitiativePage — corregir la iniciativa ya registrada (HU-06) lleva la navegación principal, con el descriptor hacia el panel | Pasa |
| Frontend | `src/features/initiative/components/__tests__/InitiativeSummary.test.tsx` | InitiativeSummary abre con el nombre de la iniciativa y su sector como insignia | Pasa |
| Frontend | `src/features/initiative/components/__tests__/InitiativeSummary.test.tsx` | InitiativeSummary muestra cada dato con su nombre, en bloques legibles | Pasa |
| Frontend | `src/features/initiative/components/__tests__/InitiativeSummary.test.tsx` | InitiativeSummary dice «persona» en singular para un equipo de una | Pasa |
| Frontend | `src/features/initiative/components/__tests__/InitiativeSummary.test.tsx` | InitiativeSummary deja lugar a una acción junto al nombre | Pasa |
| Frontend | `src/features/initiative/components/__tests__/InitiativeSummary.test.tsx` | InitiativeSummary se lee a tamaño de lectura: sin texto de nota ni sobretítulos diminutos | Pasa |
| Frontend | `src/features/initiative/lib/__tests__/form-values.test.ts` | valores del formulario de la iniciativa una iniciativa registrada se vuelve texto de formulario, con los ids de sector y etapa | Pasa |
| Frontend | `src/features/initiative/lib/__tests__/form-values.test.ts` | valores del formulario de la iniciativa el borrador guardado vuelve al formulario tal como se envió, con el equipo como texto | Pasa |
| Frontend | `src/features/initiative/store/__tests__/initiative-draft.store.test.ts` | initiative draft store guarda el formulario de la iniciativa antes de registrarla | Pasa |
| Frontend | `src/features/initiative/store/__tests__/initiative-draft.store.test.ts` | initiative draft store conserva la iniciativa elegida, o la que el paso 2 creó, junto al formulario | Pasa |
| Frontend | `src/features/initiative/store/__tests__/initiative-draft.store.test.ts` | initiative draft store cambiar de diagnóstico descarta el borrador del anterior | Pasa |
| Frontend | `src/features/initiative/store/__tests__/initiative-draft.store.test.ts` | initiative draft store inicializar con el mismo diagnóstico conserva el borrador | Pasa |
| Frontend | `src/features/initiative/store/__tests__/initiative-draft.store.test.ts` | initiative draft store se vacía al registrar la iniciativa, sin perder de qué diagnóstico es | Pasa |
| Frontend | `src/features/initiative/store/__tests__/initiative-draft.store.test.ts` | initiative draft store recuerda la versión del texto aceptada antes de elegir la iniciativa | Pasa |
| Frontend | `src/features/initiative/store/__tests__/initiative-draft.store.test.ts` | initiative draft store vive en sessionStorage, no en localStorage: muere con la pestaña | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [chromium] from the landing to the results through the four wizard steps | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [firefox] from the landing to the results through the four wizard steps | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [msedge] from the landing to the results through the four wizard steps | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [chromium] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [firefox] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [msedge] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |

### RF-05. Presentación del cuestionario IRL

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) reads back what was saved, with the time of the save | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) replaces the previous draft instead of adding to it | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) a diagnostic without a saved draft reads as empty | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) goes with the diagnostic when this is deleted | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) deleting the draft leaves the diagnostic | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) the database refuses an entry with neither level nor justification | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) the database refuses a level out of 1..5 | Pasa |
| API integración | `test/integration/database/questionnaire-draft-repository.spec.ts` | Questionnaire draft — persistence (integration) the database refuses a blank justification | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) reads back each answer with the justification it was saved with | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) replaces the previous answers, justifications included | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) keeps a justification of exactly 1000 characters | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) stores an answer without a justification as NULL and reads it back | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) the database refuses a blank justification ("") even if the domain is skipped | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) the database refuses a blank justification ("   ") even if the domain is skipped | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) the database refuses a blank justification ("\n\t") even if the domain is skipped | Pasa |
| API integración | `test/integration/database/answer-sheet-repository.spec.ts` | Answers with justification — persistence (integration) the database refuses a justification above 1000 characters | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) saves what was answered so far and marks the questionnaire as started | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) a later session of the same user reads it back, and the panel offers to continue | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) nobody else can read or overwrite it (404, as if it did not exist) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) rejects a malformed draft (422) and keeps the saved one | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/questionnaire-draft.e2e-spec.ts` | Borrador del cuestionario en el servidor (e2e) once the answers are processed the draft is gone and cannot change (409) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/get-questionnaire-structure.e2e-spec.ts` | GET /api/v1/catalog/questionnaire (e2e) Questionnaire structure endpoint returns 200 with the complete questionnaire structure | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/get-questionnaire-structure.e2e-spec.ts` | GET /api/v1/catalog/questionnaire (e2e) Questionnaire structure endpoint returns consistent results on multiple calls (idempotency) | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/get-questionnaire-structure.e2e-spec.ts` | GET /api/v1/catalog/questionnaire (e2e) Questionnaire structure endpoint response body contains required fields in each dimension | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/get-questionnaire-structure.e2e-spec.ts` | GET /api/v1/catalog/questionnaire (e2e) Questionnaire structure endpoint response body contains required fields in each statement | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/get-questionnaire-structure.e2e-spec.ts` | GET /api/v1/catalog/questionnaire (e2e) Questionnaire structure endpoint returns a frameworkVersion field for cache invalidation | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving replaces the draft and returns it as saved, in the contract shape | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving the first save marks the questionnaire as started | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving later saves do not touch the diagnostic | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving answers someone else's diagnostic as missing and saves nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in STARTED (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in WITH_CONSENT (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in PROFILE_GENERATED (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses to change the draft in DEEP_ANALYSIS_COMPLETE (409) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server saving refuses a statement outside the diagnostic's questionnaire (422) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server reading returns the saved draft to its owner | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server reading returns an empty draft when nothing was saved | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.spec.ts` | Questionnaire draft on the server reading never shows the draft of someone else's diagnostic | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery reads the statements of the requested framework version | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery answers NotFoundError for an unknown framework version | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery returns the current version when none is requested | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery returns exactly 6 dimensions | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery each dimension has exactly 8 statements | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery groups statements under their correct dimension | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery fetches dimensions and statements in parallel (both called once) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery maps dimension fields correctly | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.spec.ts` | GetQuestionnaireStructureQuery maps statement fields correctly | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer-sheet.aggregate.spec.ts` | AnswerSheet create creates an empty sheet | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer-sheet.aggregate.spec.ts` | AnswerSheet fromPersistence reconstructs sheet from rows | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer-sheet.aggregate.spec.ts` | AnswerSheet setAnswer adds a new answer | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer-sheet.aggregate.spec.ts` | AnswerSheet setAnswer upserts an existing answer | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer-sheet.aggregate.spec.ts` | AnswerSheet setAnswer accumulates distinct answers | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer-sheet.aggregate.spec.ts` | AnswerSheet toPersistence serialises all answers | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create stores the statementId, the value and the justification | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create trims the justification | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create normalizes a blank justification ("") to null | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create normalizes a blank justification ("   ") to null | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create normalizes a blank justification ("\n\t") to null | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create accepts an answer without a justification | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create rejects a justification above 1000 characters, accepts exactly 1000 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer create treats an absent justification (undefined from a request body) as missing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer fromPersistence reconstructs an answer saved without a justification | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer fromPersistence reconstructs an answer from a persistence row | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer withResponse returns a new Answer with the new value and justification, preserving statementId | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer withResponse does not mutate the original answer | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer withResponse can drop the justification: a blank one becomes null | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer equals returns true when both answers share the same statementId regardless of value | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/answer.entity.spec.ts` | Answer equals returns false when the statementIds differ | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft keeps a level, a justification, or both, per statement | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft drops an entry with neither, and treats a blank justification as missing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects the level 0, outside the Likert scale | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects the level 6, outside the Likert scale | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects the level 2.5, outside the Likert scale | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects a justification longer than an answer accepts | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft rejects a statement that appears twice | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.spec.ts` | QuestionnaireDraft an empty draft has nothing and was never saved | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence creates a valid statement | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence throws for sequence 0 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence throws for sequence 9 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence throws for sequence -1 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence throws for sequence 1.5 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence throws for empty text | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence throws for whitespace-only text | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/statement.spec.ts` | Statement fromPersistence accepts sequence 8 (max) | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/DraftSaveStatus.test.tsx` | DraftSaveStatus — si las respuestas están guardadas antes de guardar, dice que se guardan solas | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/DraftSaveStatus.test.tsx` | DraftSaveStatus — si las respuestas están guardadas mientras guarda, lo dice | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/DraftSaveStatus.test.tsx` | DraftSaveStatus — si las respuestas están guardadas guardadas, dice a qué hora y que puede volver después | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/DraftSaveStatus.test.tsx` | DraftSaveStatus — si las respuestas están guardadas si falló, dice que lo reintentará y que no se perdieron | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/LikertScale.test.tsx` | LikertScale renders five selectable options and ties the group to the statement text | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/LikertScale.test.tsx` | LikertScale updates the highlighted option when a different value is selected | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/LikertScale.test.tsx` | LikertScale supports keyboard navigation with tab and arrow keys | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireProgress.test.tsx` | QuestionnaireProgress cuenta las afirmaciones respondidas y el porcentaje | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireProgress.test.tsx` | QuestionnaireProgress cuenta una respuesta aunque no tenga justificación | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireProgress.test.tsx` | QuestionnaireProgress no dice que el borrador viva solo en esta pestaña | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireSkeleton.test.tsx` | QuestionnaireSkeleton renders a status region with aria-busy=true | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireSkeleton.test.tsx` | QuestionnaireSkeleton provides an accessible label so screen readers announce loading | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireSkeleton.test.tsx` | QuestionnaireSkeleton renders 8 placeholder rows (one per statement) | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView renders the skeleton while the request is in flight | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView renders six dimension tabs after a successful fetch | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView shows 8 statements for the first dimension by default | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView switches to the clicked dimension and shows its statements | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView scroll does not scroll when the questionnaire mounts | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView scroll does not scroll when it mounts on a tab restored from the draft | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView scroll scrolls back to the top of the panel when the dimension changes | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView renders an error state when the request fails | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView clicking Reintentar triggers a refetch | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/QuestionnaireView.test.tsx` | QuestionnaireView persists answers when switching dimension tabs and after remount | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCard.test.tsx` | StatementCard renders the statement text | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCard.test.tsx` | StatementCard renders the position label and binds the Likert group to the statement text | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCard.test.tsx` | StatementCard stores the selected answer and keeps the selection when clicked again | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | StatementCard — justification asks why the user chose the level, next to the Likert scale | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | StatementCard — justification says the justification is optional and shows the length limit | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | StatementCard — justification marks the statement complete with the answer alone | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | StatementCard — justification stores what the user writes, per statement, and counts the characters | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | StatementCard — justification shows a justification that was already in the draft | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | StatementCard — justification does not accept more than 1000 characters | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | StatementCard — justification does not touch the answer when only the justification changes | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | isStatementComplete needs the answer; the justification is optional | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | draft store — justifications wipes the justifications together with the answers when the diagnostic changes | Pasa |
| Frontend | `src/features/questionnaire/components/__tests__/StatementCardJustification.test.tsx` | draft store — justifications fills answers and justifications at once | Pasa |
| Frontend | `src/features/questionnaire/hooks/__tests__/useAnswerForStatement.test.tsx` | useAnswerForStatement returns null when no answer exists yet | Pasa |
| Frontend | `src/features/questionnaire/hooks/__tests__/useAnswerForStatement.test.tsx` | useAnswerForStatement writes through to the store when setAnswer is invoked | Pasa |
| Frontend | `src/features/questionnaire/hooks/__tests__/useAnswerForStatement.test.tsx` | useAnswerForStatement subscriptions for different statementIds are independent | Pasa |
| Frontend | `src/features/questionnaire/hooks/__tests__/useAnswerForStatement.test.tsx` | useAnswerForStatement reflects later writes performed directly on the store | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store initial state starts empty with no diagnostic, TRL as default tab and dirty=false | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store initialize attaches the diagnosticId and preserves answers when called with the same id | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store initialize wipes per-diagnostic state when called with a different diagnosticId (AC-5) | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store initialize treats null/undefined as a single nullable identity | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store setAnswer records a value and marks the store as dirty | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store setAnswer replaces an existing value (AC-3, AC-4) | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store setActiveTab updates the active dimension tab | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store reset clears per-diagnostic state but keeps the diagnosticId | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store clear wipes everything including the diagnosticId | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store persistence (AC-3, NF-1) writes answers, activeTab and diagnosticId to sessionStorage | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store persistence (AC-3, NF-1) does NOT persist the dirty flag (partialize) | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store what the server has (unsynced, syncedAt) every local change is unsynced and counts as a new revision | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store what the server has (unsynced, syncedAt) a save marks the draft as synced only if nothing changed meanwhile | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store what the server has (unsynced, syncedAt) hydrate replaces the draft with the server one, as synced | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/questionnaire-draft.store.test.ts` | questionnaire draft store what the server has (unsynced, syncedAt) persists unsynced and syncedAt, so a reload still saves what the server lacks | Pasa |
| Frontend | `src/features/questionnaire/store/__tests__/selector-isolation.test.tsx` | selector isolation (NF-4) updating one answer does not re-render unrelated subscribers | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [chromium] from the landing to the results through the four wizard steps | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [firefox] from the landing to the results through the four wizard steps | Pasa |
| Navegador, API simulada | `tests/e2e/diagnostic-flow.spec.ts` | [msedge] from the landing to the results through the four wizard steps | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [chromium] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [firefox] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [msedge] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |

### RF-06. Verificación de completitud antes de procesar el diagnóstico

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase submits answers, computes the profile, and transitions to PROFILE_GENERATED | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase finalizes a diagnostic that only registered its initiative (WITH_INITIATIVE) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase does not finalize a diagnostic that has no initiative yet (STARTED) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase does not finalize a diagnostic that has no initiative yet (WITH_CONSENT) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase advances from QUESTIONNAIRE_COMPLETE to PROFILE_GENERATED | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase refuses to process again once the profile exists (PROFILE_GENERATED), changing nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase refuses to process again once the profile exists (DEEP_ANALYSIS_IN_PROGRESS), changing nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase refuses to process again once the profile exists (DEEP_ANALYSIS_COMPLETE), changing nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase returns an err result when the diagnostic does not exist | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase returns an err result when finalizing from an earlier state | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase propagates the questionnaire submission error without computing a profile | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase does not transition state if computation fails | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.spec.ts` | FinalizeInitialDiagnosisUseCase does not skip the linear state machine | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase refuses to change the answers once the profile exists (PROFILE_GENERATED) and stores nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase refuses to change the answers once the profile exists (DEEP_ANALYSIS_IN_PROGRESS) and stores nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase refuses to change the answers once the profile exists (DEEP_ANALYSIS_COMPLETE) and stores nothing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase rejects an answer to a statement outside the diagnostic's framework version | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase saves the answer sheet and returns a response | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase throws for invalid diagnostic UUID | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase throws for invalid Likert value | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase upserts duplicate statementId (last write wins) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase rejects submission with fewer than 48 answers and does not persist | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.spec.ts` | SubmitQuestionnaireUseCase rejects submission with more than 48 distinct answers and does not persist | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario incompleto does not show the completeness alert before the user tries to advance | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario incompleto blocks the summary: advancing with unanswered statements shows the alert and stays | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario incompleto lists every dimension that has gaps, with its progress | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario incompleto shows partial progress inside a dimension | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario incompleto omits completed dimensions from the list | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario incompleto keeps the alert while something is still missing, and clears it when nothing is | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario incompleto the footer says how many dimensions still have gaps | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario completo the footer says it is ready to review | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: cuestionario completo advancing opens the summary, without an alert | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: justificación opcional a statement with a empty justification still counts as complete | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) Escenario: justificación opcional a statement with a spaces only justification still counts as complete | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) nothing is sent to the server from this step: the draft stays in the browser | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) «Atrás» goes back to the initiative step | Pasa |
| Frontend | `src/pages/wizard/__tests__/QuestionnaireStep.test.tsx` | QuestionnaireStep — completeness validation (RF-06) no autofill button outside development: the switch is a build-time variable | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar la iniciativa resume la iniciativa antes de las respuestas, con su nombre, sector y datos | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar la iniciativa permite volver a corregirla | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar la iniciativa si no se puede cargar, avisa pero deja procesar el diagnóstico | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar el color de la tabla cada dimensión usa su color en la pestaña y en la cabecera de su tabla | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar el color de la tabla cambia de color al cambiar de dimensión | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar el color de la tabla el puntaje va con una barra de cinco tramos, además del texto | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar el color de la tabla el texto de la tabla es de lectura: no baja de text-sm | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar la tabla de respuestas tiene las columnas Afirmación, Puntaje seleccionado y Justificación | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar la tabla de respuestas lista las 8 afirmaciones de la dimensión con su puntaje y su justificación | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar la tabla de respuestas recorre las seis dimensiones por pestañas, sin apilar las seis tablas | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar procesar el diagnóstico envía las 48 respuestas, cada una con su justificación, y abre los resultados | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar procesar el diagnóstico envía como null las justificaciones que el usuario no escribió | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar procesar el diagnóstico muestra la pantalla de carga y oculta el resumen mientras espera | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar procesar el diagnóstico avisa si el servidor falla y no abre los resultados | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar «Volver al cuestionario» permite corregir las respuestas | Pasa |
| Frontend | `src/pages/wizard/__tests__/SummaryStep.test.tsx` | SummaryStep — resumen antes de procesar no se puede ver con respuestas faltantes: vuelve al cuestionario | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps los pasos van en el orden que ve el usuario: consentimiento, iniciativa, cuestionario y resumen | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps reconoce solo los pasos del asistente | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps arma la ruta de un paso, o la del asistente sin paso | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps firstPendingStep {"consentAccepted":false,"initiativeRegistered":false} → consentimiento | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps firstPendingStep {"consentAccepted":true,"initiativeRegistered":false} → iniciativa | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps firstPendingStep {"consentAccepted":true,"initiativeRegistered":true} → cuestionario | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps firstPendingStep nunca devuelve el resumen: se llega a él desde el cuestionario | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso consentimiento con «consentimiento» pendiente: true | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso iniciativa con «consentimiento» pendiente: false | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso cuestionario con «consentimiento» pendiente: false | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso consentimiento con «iniciativa» pendiente: true | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso iniciativa con «iniciativa» pendiente: true | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso cuestionario con «iniciativa» pendiente: false | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso consentimiento con «cuestionario» pendiente: true | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso iniciativa con «cuestionario» pendiente: true | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el paso cuestionario con «cuestionario» pendiente: true | Pasa |
| Frontend | `src/pages/wizard/__tests__/wizard-steps.test.ts` | wizard-steps isReachable el resumen se alcanza solo cuando lo único que falta es el cuestionario | Pasa |
| Navegador, stack real | `tests/full-stack/errors.spec.ts` | [chromium] un cuestionario incompleto no avanza y dice qué falta | Pasa |
| Navegador, stack real | `tests/full-stack/errors.spec.ts` | [firefox] un cuestionario incompleto no avanza y dice qué falta | Pasa |
| Navegador, stack real | `tests/full-stack/errors.spec.ts` | [msedge] un cuestionario incompleto no avanza y dice qué falta | Pasa |

### RF-07. Cálculo del nivel IRL por dimensión

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService conversion table boundaries (Annex A, every range) boundary case: avg={"ones":8,"twos":0,"threes":0,"fours":0,"fives":0} → IRL 1 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService conversion table boundaries (Annex A, every range) boundary case: avg={"ones":4,"twos":0,"threes":0,"fours":0,"fives":4} → IRL 3 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService conversion table boundaries (Annex A, every range) boundary case: avg={"ones":0,"twos":0,"threes":0,"fours":0,"fives":8} → IRL 5 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=8 → avg=1 → IRL 1 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=9 → avg=1.125 → IRL 1 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=10 → avg=1.25 → IRL 1 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=11 → avg=1.375 → IRL 1 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=12 → avg=1.5 → IRL 2 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=13 → avg=1.625 → IRL 2 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=14 → avg=1.75 → IRL 2 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=15 → avg=1.875 → IRL 3 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=16 → avg=2 → IRL 3 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=17 → avg=2.125 → IRL 3 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=18 → avg=2.25 → IRL 4 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=19 → avg=2.375 → IRL 4 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=20 → avg=2.5 → IRL 4 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=21 → avg=2.625 → IRL 5 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=22 → avg=2.75 → IRL 5 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=23 → avg=2.875 → IRL 5 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=24 → avg=3 → IRL 6 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=25 → avg=3.125 → IRL 6 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=26 → avg=3.25 → IRL 6 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=27 → avg=3.375 → IRL 6 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=28 → avg=3.5 → IRL 7 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=29 → avg=3.625 → IRL 7 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=30 → avg=3.75 → IRL 7 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=31 → avg=3.875 → IRL 8 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=32 → avg=4 → IRL 8 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=33 → avg=4.125 → IRL 8 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=34 → avg=4.25 → IRL 8 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=35 → avg=4.375 → IRL 8 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=36 → avg=4.5 → IRL 9 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=37 → avg=4.625 → IRL 9 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=38 → avg=4.75 → IRL 9 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=39 → avg=4.875 → IRL 9 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService average and level for each k/8 sum (k from 8 to 40) sum=40 → avg=5 → IRL 9 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService PayFlow case (KTH guide, page 22) reproduces the six reported levels: TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService property: any valid 48 Likert input produces a sane profile always returns exactly 6 results in [1,5]×[1,9] | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService error scenarios throws when conversion table is empty | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService error scenarios throws when fewer than 6 dimensions are present | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService error scenarios throws when a dimension has fewer than 8 answers | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts` | IrlCalculatorService error scenarios throws when the conversion table has a coverage gap | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create builds with valid inputs | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create accepts averageLikert = 1 (boundary or k/8 value) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create accepts averageLikert = 1.125 (boundary or k/8 value) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create accepts averageLikert = 2.75 (boundary or k/8 value) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create accepts averageLikert = 4.5 (boundary or k/8 value) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create accepts averageLikert = 5 (boundary or k/8 value) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create rejects invalid averageLikert throws InvariantViolationError for 0.99 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create rejects invalid averageLikert throws InvariantViolationError for 5.01 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create rejects invalid averageLikert throws InvariantViolationError for -1 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create rejects invalid averageLikert throws InvariantViolationError for 10 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create rejects invalid averageLikert throws InvariantViolationError for NaN | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) factory create rejects invalid averageLikert throws InvariantViolationError for Infinity | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) persistence round-trip toPersistence + fromPersistence preserve the data | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) persistence round-trip fromPersistence rejects an invalid dimension code | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) persistence round-trip fromPersistence rejects an invalid IRL level | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) equality two results with identical fields are equal | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) equality different dimensions are not equal | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/dimension-result.vo.spec.ts` | DimensionResult (maturity-profile) equality different averages are not equal even with same level | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 1 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 2 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 3 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 4 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 5 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 6 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 7 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 8 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create accepts valid level 9 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create throws for invalid level 0 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create throws for invalid level 10 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create throws for invalid level -1 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel create throws for invalid level 1.5 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel equals returns true for same level | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel equals returns false for different levels | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel diff returns absolute difference | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | IrlLevel diff returns 0 for same level | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel accepts 1 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel accepts 5 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel accepts 9 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel rejects 0 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel rejects 10 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel rejects -1 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel rejects 1.5 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/value-objects/irl-level.spec.ts` | isValidIrlLevel rejects NaN | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) valid range 1..5 accepts 1 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) valid range 1..5 accepts 2 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) valid range 1..5 accepts 3 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) valid range 1..5 accepts 4 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) valid range 1..5 accepts 5 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) out-of-range values rejects 0 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) out-of-range values rejects 6 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) out-of-range values rejects -1 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) out-of-range values rejects 100 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) non-integer values rejects non-integer 1.5 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) non-integer values rejects non-integer 2.9 | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) non-integer values rejects non-integer NaN | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) non-integer values rejects non-integer Infinity | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) equality two LikertValues with same value are equal | Pasa |
| API unitaria | `test/unit/shared/kernel/domain/likert-value.spec.ts` | LikertValue (shared/kernel) equality two LikertValues with different values are not equal | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange fromPersistence creates a valid range | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange fromPersistence throws when avgMin < 1 | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange fromPersistence throws when avgMax > 5 | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange fromPersistence throws when avgMin > avgMax | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange fromPersistence throws for invalid IRL level | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange contains returns true for value at lower bound | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange contains returns true for value at upper bound | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange contains returns true for value inside range | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange contains returns false for value below range | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/conversion-range.spec.ts` | ConversionRange contains returns false for value above range | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/services/irl-levels-by-dimension.spec.ts` | irlLevelsByDimension maps each dimension code to its IRL level | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/services/irl-levels-by-dimension.spec.ts` | irlLevelsByDimension returns an empty map for no results, without validating the count | Pasa |

### RF-08. Identificación del cuello de botella principal

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) factory create builds with exactly six unique dimensions | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) factory create rejects fewer than 6 results | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) factory create rejects more than 6 results | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) factory create rejects duplicate dimensions | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) factory create rejects when a framework dimension is missing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) canonical sort sorts the results in TRL, CRL, BRL, IPRL, TmRL, FRL order | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) resultFor lookup returns the result for TRL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) resultFor lookup returns the result for CRL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) resultFor lookup returns the result for BRL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) resultFor lookup returns the result for IPRL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) resultFor lookup returns the result for TmRL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) resultFor lookup returns the result for FRL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) resultFor lookup returns undefined for an unknown code | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) bottleneck (RF-08) returns the single dimension with the lowest level | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) bottleneck (RF-08) returns all tied dimensions when several share the minimum level | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) bottleneck (RF-08) returns all six dimensions when every level is the same | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) bottleneck (RF-08) returns level 1 when the minimum is the lowest possible IRL level | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) strength returns the single dimension with the highest level | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) strength returns all tied dimensions at the maximum | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) globalAverage (RF-09) is the simple average of the six levels | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) globalAverage (RF-09) is exact when the levels are all equal | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) globalAverage (RF-09) rounds to one decimal | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) globalAverage (RF-09) stays inside the 1..9 scale at the extremes | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) asymmetry classifies a spread of 3 as MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) asymmetry classifies a uniform profile as ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) asymmetry classifies a spread of 8 as CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) gaps (critical IRL threshold) includes every dimension with IRL ≤ 3 and reports the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) gaps (critical IRL threshold) returns no dimensions when every level is above the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) gaps (critical IRL threshold) includes a dimension exactly at the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) criticalState (RF-13) is the gaps restricted to CRL, BRL and TmRL, whatever the level of the others | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) criticalState (RF-13) is empty when no eligible dimension is in a gap, even if others are | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) criticalState (RF-13) is empty when the catalog marks no dimension as eligible | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) persistence round-trip toPersistence + fromPersistence preserve the aggregate | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse exposes gaps computed by the aggregate, including the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse exposes the critical dimensions: only CRL, BRL and TmRL, and only when in gap | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse exposes an empty critical state when no susceptible dimension is in gap | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse exposes an empty gaps list when no dimension is at or below the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse exposes strength and asymmetry from persisted levels | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse exposes the global average computed by the aggregate, not derived by the client | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse names each dimension from the catalog, never by its code | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse fails when the catalog is missing a dimension of the profile | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse what each level means each dimension carries the text of its current level, or null without one | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse what each level means the global level is the average as shown, rounded half up, with its text | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/dtos/map-maturity-profile-response.spec.ts` | toMaturityProfileResponse what each level means carries the nine levels of every dimension, level 1 first, for the roadmap targets | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | MaturityProfileSummary — bottleneck card (RF-08) using server-provided bottleneck renders the bottleneck eyebrow label | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | MaturityProfileSummary — bottleneck card (RF-08) using server-provided bottleneck shows the dimension name and level for a single bottleneck | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | MaturityProfileSummary — bottleneck card (RF-08) using server-provided bottleneck shows a tie summary title when multiple dimensions share the minimum | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | MaturityProfileSummary — bottleneck card (RF-08) using server-provided bottleneck lists the tied dimension names when there is more than one bottleneck | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | MaturityProfileSummary — bottleneck card (RF-08) using server-provided bottleneck does not show a name list inside the bottleneck card when there is only one dimension | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | MaturityProfileSummary — bottleneck card (RF-08) does not infer bottleneck when the server field is absent does not render the bottleneck card from dimensionResults alone | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | empty state shows fallback message when dimensionResults is empty | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | empty state does not render summary cards in empty state | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Strength card shows a single strength dimension with its level | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Strength card shows tied count and level when multiple dimensions share the maximum | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Strength card lists all tied names when there is a tie | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Asymmetry card shows asymmetry = 3 for PayFlow (TRL 5 − IPRL 2) | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Asymmetry card shows 0 asymmetry for uniform levels | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Asymmetry card says the profile advances evenly for acceptable asymmetry | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Asymmetry card says the gap is very large for a critical asymmetry | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Asymmetry card says the gap is important for a moderate asymmetry | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Asymmetry card uses singular "nivel" when asymmetry is 1 | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Gap card (server-provided gaps) appears when the server reports at least one gap dimension | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Gap card (server-provided gaps) uses the moderate tone, not the critical red | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Gap card (server-provided gaps) does not appear when the server reports no gaps, even if levels are ≤ 3 | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Gap card (server-provided gaps) does not derive gaps from dimensionResults when the server field is absent | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Gap card (server-provided gaps) lists the Spanish names of gap dimensions from the server list | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | Gap card (server-provided gaps) states the threshold supplied by the server in words, without symbols | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | what the summary no longer shows (deep analysis only) has no imbalance pairs card, whatever the profile | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | glossary tooltips explains "Cuello de botella" in one plain sentence on hover | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | glossary tooltips explains "Brecha" in one plain sentence on hover | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | glossary tooltips explains "Asimetría" in one plain sentence on hover | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | glossary tooltips makes the term reachable by keyboard, not only by mouse | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | cards highlight their dimensions in the radar reports the bottleneck dimensions on hover and clears them on leave | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | cards highlight their dimensions in the radar reports every gap dimension for the gap card | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | cards highlight their dimensions in the radar also reacts to keyboard focus, so it does not depend on the mouse | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityProfileSummary.test.tsx` | cards highlight their dimensions in the radar is inert without a handler: cards are not tab stops | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa abre con el nombre de la iniciativa como título de la página | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa muestra una descripción breve y el sector como insignia | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa deja lugar para la fecha en que se guardó el resultado | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa sin el nombre todavía, habla de «tu iniciativa» | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el nivel IRL global muestra el promedio de las seis dimensiones sobre 9, calculado por el backend | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el nivel IRL global explica qué es en una frase | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el nivel IRL global nombra lo más fuerte y lo más débil con sus niveles | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el nivel IRL global marca lo más débil en el tono moderado, no en el rojo de emergencia | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el nivel IRL global nombra todas las dimensiones empatadas | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el nivel IRL global explica «más débil» y «más fuerte» al pasar el cursor | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el nivel IRL global no inventa una etiqueta de estado del nivel: solo lo que el backend calcula | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | ProfileHero — el perfil es de una iniciativa el texto de lectura no baja de text-sm | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | formatOneDecimal 3.5 se muestra como 3,5 | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | formatOneDecimal 4 se muestra como 4 | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | formatOneDecimal 1.2 se muestra como 1,2 | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | formatOneDecimal 8.8 se muestra como 8,8 | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ProfileHero.test.tsx` | formatOneDecimal 9 se muestra como 9 | Pasa |

### RF-09. Presentación del gráfico de perfil de madurez

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-maturity-profile.use-case.spec.ts` | GetMaturityProfileUseCase returns the persisted profile and stored imbalances without recomputing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-maturity-profile.use-case.spec.ts` | GetMaturityProfileUseCase does not invent imbalances when none were persisted | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-maturity-profile.use-case.spec.ts` | GetMaturityProfileUseCase returns an err result when the profile has not been computed | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-own-maturity-profile.use-case.spec.ts` | GetOwnMaturityProfileUseCase serves the profile to the owner of the diagnostic | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/get-own-maturity-profile.use-case.spec.ts` | GetOwnMaturityProfileUseCase answers someone else's diagnostic as missing, without reading the profile | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — navegación y acceso lleva la navegación principal, con el panel y los resultados | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — navegación y acceso el descriptor institucional lleva al panel, no a la portada | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — navegación y acceso ofrece el menú de cuenta | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — navegación y acceso un diagnóstico que sigue en el asistente no tiene resultados: se le devuelve a él | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo muestra solo el perfil de madurez: radar, niveles y las señales del perfil | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo no muestra los pares desequilibrados ni las alertas de estado crítico | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo no ofrece el reporte completo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo no muestra el roadmap ni la recomendación, y ni siquiera los pide | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo el botón de aceptar vive en esta página y no envía nada al entrar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo dice que el perfil es un resultado guardado, con la fecha de la respuesta | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo acepta el análisis profundo y pasa a mostrar todo en la misma página | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo avisa si no se pudo aceptar y deja reintentar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo muestra la recomendación del portafolio antes del roadmap, también en la barra de secciones | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo muestra, además del perfil, los pares desequilibrados, el estado crítico, el roadmap y la recomendación | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo todo en una sola página: una vista, no pantallas separadas | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo la barra de secciones marca en cuál se está, como la navegación principal | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo con el análisis profundo completo, lleva al reporte completo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo mientras el análisis profundo no está completo, no ofrece el reporte | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo ya no ofrece aceptar el análisis profundo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo cada resultado guardado lleva su propia fecha: perfil, roadmap y recomendación | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo reutiliza el panel plegable para el detalle: la explicación del roadmap y la traza | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo si el roadmap no se generó del lado del servidor, avisa y ofrece reintentar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo si la recomendación no se generó, avisa y el roadmap sigue visible | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — explicabilidad para quien no conoce el marco abre con un bloque de contexto: qué es el IRL, una dimensión y un nivel | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — explicabilidad para quien no conoce el marco nombra las seis dimensiones con lo que trae la respuesta, no con una lista del frontend | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — explicabilidad para quien no conoce el marco explica cada término técnico en una frase, al pasar el cursor | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — el radar explica cada dimensión en su punta no tiene leyenda aparte: el color y el nombre están en la punta del radar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — el radar explica cada dimensión en su punta avisa que se puede pasar el cursor por cada punta para leerla | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — el radar explica cada dimensión en su punta pasar por una tarjeta del resumen no rompe el radar compartido | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista abre con su nombre, una descripción breve y el sector | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista muestra al lado el nivel IRL global que calcula el backend | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista el perfil no repite los niveles en una lista: los explica el radar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista al pasar por una señal, las demás señales y niveles se atenúan | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista se dirige a la iniciativa por su nombre en la invitación al análisis profundo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista con el análisis profundo, sus secciones hablan de la iniciativa por su nombre | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista si la iniciativa no carga, la cabecera habla de «tu iniciativa» y el resto sigue | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — el análisis profundo se entiende sin conocer el sistema ninguna sección expone flechas, códigos de ajuste ni siglas del marco, ni siquiera abiertas | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — el análisis profundo se entiende sin conocer el sistema no usa texto de tamaño de nota (text-xs) en la sección del análisis profundo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — estados de error y de carga muestra un estado de carga mientras espera el perfil | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — estados de error y de carga un diagnóstico sin perfil calculado dice qué falta | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — estados de error y de carga si no se puede saber si aceptó el análisis, no adivina: avisa | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | LevelBar pinta tantos tramos como el nivel, de nueve | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | LevelBar lo dice también como texto, para quien no ve el color | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | LevelBar pinta con tono suave el tramo que falta hasta la meta | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | LevelBar marca con un anillo el último nivel que cuenta como brecha | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | LevelBar sirve para otras escalas, como el Likert de cinco | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | Badge el tono neutral lleva su texto | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | Badge el tono info lleva su texto | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | Badge el tono critical lleva su texto | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | Badge el tono moderate lleva su texto | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | Badge el tono acceptable lleva su texto | Pasa |
| Frontend | `src/shared/ui/__tests__/level-bar.test.tsx` | Badge no baja de text-sm | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices returns empty map when no imbalances supplied | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices skips acceptable pairs — they produce no vertex entry | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices marks the higher-level dimension for a moderate pair | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices marks the higher-level dimension for a critical pair | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices escalates from moderate to critical when a dimension appears in multiple flagged pairs | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices does not downgrade critical to moderate | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices right side becomes vertex when it has the higher level | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | buildImbalancedVertices on a tie both dimensions have equal levels — left wins | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | MaturityRadarChart renders the accessible container with the correct role and label | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | MaturityRadarChart renders without throwing when imbalances is undefined | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | MaturityRadarChart renders without throwing when all imbalances are acceptable | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | MaturityRadarChart renders without throwing when a critical imbalance is present | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/MaturityRadarChart.test.tsx` | MaturityRadarChart renders without throwing when a moderate imbalance is present | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/RadarHighlight.test.tsx` | useRadarHighlight shares one highlight between the radar points and the cards | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/RadarHighlight.test.tsx` | DimensionTooltipContent explains the dimension: its name, what it measures and the level of the initiative | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/RadarHighlight.test.tsx` | DimensionTooltipContent says that the level text is what that level means | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/RadarHighlight.test.tsx` | DimensionTooltipContent still names the dimension and its level when the catalog description is not there | Pasa |

### RF-10. Señalización visual de desequilibrios dimensionales

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 5 → diff 0 → ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 4 → diff 1 → ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 3 → diff 2 → MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 2 → diff 3 → MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 1 → diff 4 → CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 9 vs 1 → diff 8 → CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) result is order-insensitive: (a,b) and (b,a) produce the same difference | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 produces exactly 6 results — one per KTH pair | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 preserves pair id, left, and right codes on each result | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[0]: difference=2, classification=MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[1]: difference=2, classification=MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[2]: difference=0, classification=ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[3]: difference=1, classification=ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[4]: difference=1, classification=ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[5]: difference=3, classification=MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases returns empty array when no pairs are supplied | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases uses 0 when a dimension code is missing from the level map (missing = 0) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases classifies as ACCEPTABLE when both codes are missing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases critical threshold is strictly > 3 (not ≥ 3) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases all levels equal → all pairs ACCEPTABLE with difference 0 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases extreme levels (1 vs 9) → all possible pairs CRITICAL | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/dimension-pair.spec.ts` | DimensionPair fromPersistence creates a valid pair | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/dimension-pair.spec.ts` | DimensionPair fromPersistence throws when left and right codes are the same | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/dimension-pair.spec.ts` | DimensionPair fromPersistence throws for invalid dimension code | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/dimension-pair.spec.ts` | DimensionPair equals returns true for same-order pair | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/dimension-pair.spec.ts` | DimensionPair equals returns true for reversed pair (order-insensitive) | Pasa |
| API unitaria | `test/unit/shared/irl-taxonomy/domain/entities/dimension-pair.spec.ts` | DimensionPair equals returns false for different pair | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) constructor stores all fields as given | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) constructor accepts difference = 0 (identical levels) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) constructor accepts difference = 8 (max spread IRL 1 vs IRL 9) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() returns a plain object with the correct shape | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() round-trips classification CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() round-trips classification MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() round-trips classification ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() returns a new plain object each time (not a reference) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) fromPersistence() restores the value object from a snapshot | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs shows all six pairs, the most serious first | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs summarizes how many pairs are critical, moderate and balanced | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs says in words how far apart the two dimensions are and which one leads | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs gives each dimension of the pair its level and a bar | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs when both dimensions are in a gap it asks to raise them together, not to hold one back | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs tells a balanced pair that nothing has to be held back | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs uses no arrows, deltas or codes: the texts say the same in plain words | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs shows an empty message when there are no pairs to evaluate | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs addresses the initiative by name in the title | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs explains "desequilibrio" in plain words | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs highlights the two dimensions of a pair on hover and clears them on leave | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) gives each critical dimension its own prominent card, named from the response | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) shows the level of the critical dimension, with a bar and what it measures | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) says the next step from the plan when the roadmap already has the dimension | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) still says what to do when the plan is not there yet | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) lists the other dimensions in a gap as a lower, «prioridad media» priority | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) says none is critical when the backend reports none, without an alarming card | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) does not treat a gap as a critical state: it only shows what the backend calls critical | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) explains the threshold in words, without symbols | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) addresses the initiative by name | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) explains "críticas" in plain words | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) highlights the critical dimension in the radar on hover | Pasa |

### RF-11. Oferta del análisis profundo al usuario

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta finalizar guarda el estado crítico solo en las dimensiones que RF-13 admite | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta antes de aceptar, no existe recomendación ni se ha publicado nada | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta aceptar el análisis profundo publica el evento y ambos módulos publican el suyo | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta la recomendación existe y sigue siendo la de AgroConecta, sin llamar a routing/ directamente | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta el roadmap se calcula para el mismo perfil, y leerlo no publica ningún evento | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta aceptar de nuevo mantiene el análisis completo, vuelve a publicar y no acumula recomendaciones | Pasa |
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta un diagnóstico sin perfil calculado responde 409 y no publica nada | Pasa |
| API unitaria | `test/unit/shared/kernel/events/deep-analysis-wiring.spec.ts` | DeepAnalysisRequestedEvent wiring reaches routing/ and roadmap/ independently, even when routing/ fails | Pasa |
| API unitaria | `test/unit/shared/kernel/events/deep-analysis-wiring.spec.ts` | DeepAnalysisRequestedEvent wiring the two "calculated" events reach diagnosis/, which records each result | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/record-deep-analysis-result.use-case.spec.ts` | RecordDeepAnalysisResultUseCase applies the result inside `modify`, which completes the diagnostic with both | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/record-deep-analysis-result.use-case.spec.ts` | RecordDeepAnalysisResultUseCase does not publish when one result is still missing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/record-deep-analysis-result.use-case.spec.ts` | RecordDeepAnalysisResultUseCase answers NotFoundError for a missing diagnostic | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.spec.ts` | RequestDeepAnalysisUseCase transitions PROFILE_GENERATED to DEEP_ANALYSIS_IN_PROGRESS and publishes the event after saving | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.spec.ts` | RequestDeepAnalysisUseCase answers someone else's diagnostic as missing, without saving or publishing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.spec.ts` | RequestDeepAnalysisUseCase when already DEEP_ANALYSIS_IN_PROGRESS: keeps the state without saving, but re-publishes so a failed calculation can be retried | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.spec.ts` | RequestDeepAnalysisUseCase when already DEEP_ANALYSIS_COMPLETE: keeps the state without saving, but re-publishes so a failed calculation can be retried | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.spec.ts` | RequestDeepAnalysisUseCase returns a ConflictError when requested from STARTED | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.spec.ts` | RequestDeepAnalysisUseCase returns a ConflictError when requested from QUESTIONNAIRE_COMPLETE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.spec.ts` | RequestDeepAnalysisUseCase returns a NotFoundError when the diagnostic does not exist | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo muestra solo el perfil de madurez: radar, niveles y las señales del perfil | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo no muestra los pares desequilibrados ni las alertas de estado crítico | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo no ofrece el reporte completo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo no muestra el roadmap ni la recomendación, y ni siquiera los pide | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo el botón de aceptar vive en esta página y no envía nada al entrar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo dice que el perfil es un resultado guardado, con la fecha de la respuesta | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo acepta el análisis profundo y pasa a mostrar todo en la misma página | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — sin análisis profundo avisa si no se pudo aceptar y deja reintentar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo muestra la recomendación del portafolio antes del roadmap, también en la barra de secciones | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo muestra, además del perfil, los pares desequilibrados, el estado crítico, el roadmap y la recomendación | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo todo en una sola página: una vista, no pantallas separadas | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo la barra de secciones marca en cuál se está, como la navegación principal | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo con el análisis profundo completo, lleva al reporte completo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo mientras el análisis profundo no está completo, no ofrece el reporte | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo ya no ofrece aceptar el análisis profundo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo cada resultado guardado lleva su propia fecha: perfil, roadmap y recomendación | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo reutiliza el panel plegable para el detalle: la explicación del roadmap y la traza | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo si el roadmap no se generó del lado del servidor, avisa y ofrece reintentar | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — con análisis profundo si la recomendación no se generó, avisa y el roadmap sigue visible | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista se dirige a la iniciativa por su nombre en la invitación al análisis profundo | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — la iniciativa como protagonista con el análisis profundo, sus secciones hablan de la iniciativa por su nombre | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — el análisis profundo se entiende sin conocer el sistema ninguna sección expone flechas, códigos de ajuste ni siglas del marco, ni siquiera abiertas | Pasa |
| Frontend | `src/pages/__tests__/ResultsPage.test.tsx` | ResultsPage — el análisis profundo se entiende sin conocer el sistema no usa texto de tamaño de nota (text-xs) en la sección del análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/decline-deep-analysis.spec.ts` | [chromium] el líder no continúa con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/decline-deep-analysis.spec.ts` | [firefox] el líder no continúa con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/decline-deep-analysis.spec.ts` | [msedge] el líder no continúa con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [chromium] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [firefox] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [msedge] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |

### RF-12. Clasificación de desequilibrios entre pares de dimensiones

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 5 → diff 0 → ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 4 → diff 1 → ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 3 → diff 2 → MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 2 → diff 3 → MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 5 vs 1 → diff 4 → CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) levels 9 vs 1 → diff 8 → CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService classification boundaries (KTH rules) result is order-insensitive: (a,b) and (b,a) produce the same difference | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 produces exactly 6 results — one per KTH pair | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 preserves pair id, left, and right codes on each result | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[0]: difference=2, classification=MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[1]: difference=2, classification=MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[2]: difference=0, classification=ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[3]: difference=1, classification=ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[4]: difference=1, classification=ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3 pair[5]: difference=3, classification=MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases returns empty array when no pairs are supplied | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases uses 0 when a dimension code is missing from the level map (missing = 0) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases classifies as ACCEPTABLE when both codes are missing | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases critical threshold is strictly > 3 (not ≥ 3) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases all levels equal → all pairs ACCEPTABLE with difference 0 | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/services/imbalance-evaluator.service.spec.ts` | ImbalanceEvaluatorService edge cases extreme levels (1 vs 9) → all possible pairs CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) constructor stores all fields as given | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) constructor accepts difference = 0 (identical levels) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) constructor accepts difference = 8 (max spread IRL 1 vs IRL 9) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() returns a plain object with the correct shape | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() round-trips classification CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() round-trips classification MODERATE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() round-trips classification ACCEPTABLE | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) toPersistence() returns a new plain object each time (not a reference) | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/value-objects/imbalance-result.vo.spec.ts` | ImbalanceResult (value object) fromPersistence() restores the value object from a snapshot | Pasa |

### RF-13. Detección de dimensiones en estado crítico

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/diagnosis/deep-analysis-events.e2e-spec.ts` | Análisis profundo por eventos (e2e) — AgroConecta finalizar guarda el estado crítico solo en las dimensiones que RF-13 admite | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) asymmetry classifies a spread of 8 as CRITICAL | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) gaps (critical IRL threshold) includes every dimension with IRL ≤ 3 and reports the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) gaps (critical IRL threshold) returns no dimensions when every level is above the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) gaps (critical IRL threshold) includes a dimension exactly at the threshold | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) criticalState (RF-13) is the gaps restricted to CRL, BRL and TmRL, whatever the level of the others | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) criticalState (RF-13) is empty when no eligible dimension is in a gap, even if others are | Pasa |
| API unitaria | `test/unit/modules/diagnosis/domain/entities/maturity-profile.aggregate.spec.ts` | MaturityProfile (aggregate root) criticalState (RF-13) is empty when the catalog marks no dimension as eligible | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/dimensions-seed.spec.ts` | dimensions seed marks exactly CRL, BRL and TmRL as susceptible to a critical state | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — pairs summarizes how many pairs are critical, moderate and balanced | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) gives each critical dimension its own prominent card, named from the response | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) shows the level of the critical dimension, with a bar and what it measures | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) says the next step from the plan when the roadmap already has the dimension | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) still says what to do when the plan is not there yet | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) lists the other dimensions in a gap as a lower, «prioridad media» priority | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) says none is critical when the backend reports none, without an alarming card | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) does not treat a gap as a critical state: it only shows what the backend calls critical | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) explains the threshold in words, without symbols | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) addresses the initiative by name | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) explains "críticas" in plain words | Pasa |
| Frontend | `src/features/maturity-profile/components/__tests__/ImbalanceInsights.test.tsx` | ImbalanceInsights — critical state (RF-13) highlights the critical dimension in the radar on hover | Pasa |

### RF-14. Generación del roadmap de orientaciones por dimensión

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta el perfil de partida es el de AgroConecta | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta el perfil nombra cada dimensión con el catálogo, no con su código | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta antes de aceptar el análisis profundo el roadmap no existe: 409 ROADMAP_NOT_GENERATED | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo GET /roadmap devuelve tres fases: equilibra al final y sube a lo sumo dos niveles por fase | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo excluye Tecnología y Equipo, y lo dice explícitamente | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo termina en un perfil sin desequilibrios con alerta | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo expone qué desbloquea cada dimensión, para que el orden sea refutable | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo nombra cada dimensión del roadmap con el catálogo | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo explica por qué cada dimensión está en el plan y qué fija su meta final | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo propone un servicio por fase, de lo más liviano a lo más profundo, con su ficha | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta tras aceptar el análisis profundo es un resultado guardado: leerlo dos veces da la misma fecha | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta answers another user's diagnostic as missing (404), not revealing it exists | Pasa |
| API extremo a extremo | `test/e2e/modules/roadmap/roadmap.e2e-spec.ts` | Roadmap de escalamiento (e2e) — AgroConecta un diagnóstico sin perfil calculado devuelve 409, no 404 | Pasa |
| API integración | `test/integration/database/roadmap-repository.spec.ts` | Roadmap — persistence (integration) returns null when nothing was saved | Pasa |
| API integración | `test/integration/database/roadmap-repository.spec.ts` | Roadmap — persistence (integration) reads back exactly what was saved, explanation and date included | Pasa |
| API integración | `test/integration/database/roadmap-repository.spec.ts` | Roadmap — persistence (integration) replaces the previous roadmap instead of accumulating versions | Pasa |
| API integración | `test/integration/database/roadmap-repository.spec.ts` | Roadmap — persistence (integration) is removed with its diagnostic | Pasa |
| API integración | `test/integration/database/roadmap-graph-seed.spec.ts` | Seed del graph de dependencies (integration) siembra las nueve edges resolviendo las FKs por código | Pasa |
| API integración | `test/integration/database/roadmap-graph-seed.spec.ts` | Seed del graph de dependencies (integration) las seis dimensions quedan con nivel mínimo esperado 4 | Pasa |
| API integración | `test/integration/database/roadmap-graph-seed.spec.ts` | Seed del graph de dependencies (integration) una segunda ejecución no duplica rows | Pasa |
| API integración | `test/integration/database/roadmap-graph-seed.spec.ts` | Seed del graph de dependencies (integration) el DO UPDATE actualiza de verdad el nivel requerido | Pasa |
| API integración | `test/integration/database/roadmap-graph-seed.spec.ts` | Seed del graph de dependencies (integration) la base rechaza una edge reflexiva | Pasa |
| API integración | `test/integration/database/roadmap-graph-seed.spec.ts` | Seed del graph de dependencies (integration) la base rechaza duplicar el mismo par dirigido | Pasa |
| API integración | `test/integration/database/roadmap-graph-seed.spec.ts` | Seed del graph de dependencies (integration) la base admite la edge inversa: la aciclicidad no la impone el esquema | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase calculates the balanced roadmap for AgroConecta, at most two levels per phase | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase a dimension that only rises to keep up with its pair enters by BALANCE | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase asks a service per phase: the recommendation first, then by phase, never lighter nor repeated | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase without a routing configuration the phases stay, with no service | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase saves the roadmap it calculates | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase records why each dimension is in the plan and what sets its target | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase does not save when the profile is missing | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.spec.ts` | GenerateScalingRoadmapUseCase propagates the profile error | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-balance-and-phases.spec.ts` | Route — AgroConecta on the seeded graph without balancing it is the roadmap of the minimums: two phases | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-balance-and-phases.spec.ts` | Route — AgroConecta on the seeded graph balanced (no imbalance with an alert), Cliente joins and the targets rise to keep up with Tecnología | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-balance-and-phases.spec.ts` | Route — AgroConecta on the seeded graph at most two levels per phase: Propiedad Intelectual 1→5 spans two phases | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-balance-and-phases.spec.ts` | Route — properties the balanced route never lowers a dimension and leaves no pair beyond the tolerance | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-balance-and-phases.spec.ts` | Route — properties every phase raises a dimension by at most the limit, and the route reaches every target | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-balance-and-phases.spec.ts` | Route — properties without a limit per phase the phases are the topological layers of the roadmap | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/get-scaling-roadmap.use-case.spec.ts` | GetScalingRoadmapUseCase names every dimension of the saved roadmap from the catalog | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/get-scaling-roadmap.use-case.spec.ts` | GetScalingRoadmapUseCase explains the inclusion and the target of each dimension | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/get-scaling-roadmap.use-case.spec.ts` | GetScalingRoadmapUseCase gives each phase its service with the catalog card, under the name it was calculated with | Pasa |
| API unitaria | `test/unit/modules/roadmap/application/use-cases/get-scaling-roadmap.use-case.spec.ts` | GetScalingRoadmapUseCase returns ROADMAP_NOT_GENERATED when nothing was saved | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route the first phase opens with the portfolio recommendation itself | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route a next phase gets the service that best works its dimensions, never one already proposed | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route never goes lighter than the previous phase, and shows the best one as approximate when none fits | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route has no service when the route leaves no candidate | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route answers that the configuration is missing instead of guessing | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph construcción válida acepta un graph acíclico con mínimos completos | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph construcción válida acepta un graph sin ninguna edge | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph construcción válida indexa edges entrantes y salientes por dimensión | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph construcción válida admite mínimos distintos por dimensión | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph rechazo de configuración inválida rechaza una edge reflexiva | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph rechazo de configuración inválida rechaza una edge duplicada | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph rechazo de configuración inválida acepta A→B y B→A como edges distintas, pero las detecta como ciclo | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph rechazo de configuración inválida rechaza un nivel requerido fuera de [1,9] | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph rechazo de configuración inválida rechaza un mínimo esperado fuera de [1,9] | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph rechazo de configuración inválida rechaza que falte el mínimo de alguna dimensión, y la nombra | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph rechazo de configuración inválida rechaza un mínimo declarado dos veces para la misma dimensión | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph detección de ciclos detecta un ciclo de tres nodos y nombra las dimensions implicadas | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph detección de ciclos detecta un ciclo de dos nodos | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph detección de ciclos un ciclo es un RoadmapCalculationError, y por tanto un 500 | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph detección de ciclos no confunde un rombo con un ciclo | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph — accesos defensivos el símbolo del puerto identifica la dependencia, no el nombre de clase | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/dependency-graph.vo.spec.ts` | DependencyGraph — accesos defensivos `expectedMinimum` lanza ante una dimensión sin mínimo declarado | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-engine.properties.spec.ts` | Propiedades del motor de roadmap ninguna dimensión aparece en una layer anterior a la de un predecesor suyo | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-engine.properties.spec.ts` | Propiedades del motor de roadmap toda dimensión intervenida tiene una meta estrictamente mayor que su nivel | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-engine.properties.spec.ts` | Propiedades del motor de roadmap las layers son una partición exacta del conjunto a intervenir | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-engine.properties.spec.ts` | Propiedades del motor de roadmap el cierre contiene siempre al focus | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-engine.properties.spec.ts` | Propiedades del motor de roadmap el motor es determinista | Pasa |
| API unitaria | `test/unit/modules/roadmap/infrastructure/messaging/deep-analysis-requested.listener.spec.ts` | roadmap DeepAnalysisRequestedListener starts its own calculation for the diagnostic in the event | Pasa |
| API unitaria | `test/unit/modules/roadmap/infrastructure/messaging/deep-analysis-requested.listener.spec.ts` | roadmap DeepAnalysisRequestedListener publishes ScalingRoadmapCalculatedEvent once the calculation succeeded | Pasa |
| API unitaria | `test/unit/modules/roadmap/infrastructure/messaging/deep-analysis-requested.listener.spec.ts` | roadmap DeepAnalysisRequestedListener swallows a business-outcome Result.err instead of throwing | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta conjunto a intervenir es exactamente {BRL, IPRL, FRL} | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta conjunto a intervenir excluye TRL, CRL y TmRL del roadmap | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta conjunto a intervenir no incorpora ningún habilitador: todos cumplen lo que sus edges exigen | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta orden de fases produce dos layers | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta orden de fases capa 0 lleva BRL e IPRL en paralelo | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta orden de fases capa 1 lleva FRL, que dependía de las dos anteriores | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta targets por dimensión lleva BRL de 3 a 4, IPRL de 1 a 4 y FRL de 2 a 4 | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta targets por dimensión toda meta supera el nivel actual | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta justificación de dependencies BRL e IPRL habilitan FRL; FRL no habilita a nadie del conjunto | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta sensibilidad del caso si CRL bajara a 3 entraría al roadmap y arrastraría el orden | Pasa |
| API unitaria | `test/unit/modules/roadmap/acceptance/agroconecta-roadmap.spec.ts` | Aceptación — roadmap de escalamiento para AgroConecta sensibilidad del caso un perfil que cumple en las seis produce un roadmap vacío | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap deriva las dimensiones sin intervención a partir de las que sí la tienen | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap un roadmap sin fases es válido: la iniciativa cumple en las seis | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap una subida grande se reparte en fases que continúan donde la dejó la anterior | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap rechaza que una dimensión aparezca dos veces en la misma fase | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap rechaza que una fase retome una dimensión en un nivel distinto del que dejó la anterior | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap rechaza una ruta que no lleva la dimensión a su meta final | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap rechaza una meta que no supera el nivel actual | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap rechaza fases numeradas fuera de secuencia | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/scaling-roadmap.aggregate.spec.ts` | ScalingRoadmap conserva el diagnóstico, el perfil final, si quedó equilibrado y el instante de generación | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-edge-cases.spec.ts` | PhasePlannerService — bordes una dimensión que el perfil no trae parte del nivel 1, y una sin meta no entra en la ruta | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-edge-cases.spec.ts` | PhasePlannerService — bordes un grafo con un ciclo que se coló detiene la planificación en vez de girar sin fin | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-edge-cases.spec.ts` | RoadmapBalancingService — bordes una meta que no explica ni un mínimo, ni una dependencia, ni un socio se lee como mínimo esperado | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-edge-cases.spec.ts` | RoadmapBalancingService — bordes un perfil que no trae una dimensión la toma en el nivel 1 | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-edge-cases.spec.ts` | RoadmapBalancingService — bordes un perfil final incompleto se evalúa con el nivel 1 en lo que falta | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-edge-cases.spec.ts` | DependencyGraph — bordes una dimensión que el grafo no conoce no tiene aristas, ni de entrada ni de salida | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/route-edge-cases.spec.ts` | ScalingRoadmap — bordes rechaza una fase que lleva una dimensión más allá de su meta final | Pasa |
| API unitaria | `test/unit/modules/routing/domain/phase-affinity-scorer.service.spec.ts` | PhaseAffinityScorerService — how a service works the dimensions of a phase adds intensity × levels the phase raises, per dimension of the phase, plus the stage | Pasa |
| API unitaria | `test/unit/modules/routing/domain/phase-affinity-scorer.service.spec.ts` | PhaseAffinityScorerService — how a service works the dimensions of a phase checks the band against the average projected to the start of the phase | Pasa |
| API unitaria | `test/unit/modules/routing/domain/phase-affinity-scorer.service.spec.ts` | PhaseAffinityScorerService — how a service works the dimensions of a phase a service that works none of the phase dimensions only gets its stage and band | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService el focus son las dimensions por debajo de su mínimo esperado | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService una dimensión exactamente en su mínimo no entra al focus | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService incorpora un habilitador que no alcanza lo que su edge exige | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService no incorpora un habilitador que sí cumple lo que su edge exige | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService alcanza el punto fijo: incorpora al habilitador del habilitador | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService encadena tres levels de habilitadores | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService un perfil sano produce un cierre vacío | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService no entra en bucle cuando dos dimensions se habilitan en cadena larga | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/roadmap-closure.service.spec.ts` | RoadmapClosureService — perfiles incompletos ignora dimensions ausentes del perfil en vez de tratarlas como cero | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/topological-layering.service.spec.ts` | TopologicalLayeringService coloca en la capa 0 las dimensions sin dependencies internas | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/topological-layering.service.spec.ts` | TopologicalLayeringService ignora edges cuyo source queda fuera del conjunto | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/topological-layering.service.spec.ts` | TopologicalLayeringService ignora edges cuyo target queda fuera del conjunto | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/topological-layering.service.spec.ts` | TopologicalLayeringService ordena dentro de la capa por el orden canónico del marco | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/topological-layering.service.spec.ts` | TopologicalLayeringService produce una cadena de layers unitarias cuando todo es secuencial | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/topological-layering.service.spec.ts` | TopologicalLayeringService un conjunto vacío produce cero layers | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/topological-layering.service.spec.ts` | TopologicalLayeringService lanza con los nodos implicados si el subgrafo tuviera un ciclo | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService sin sucesores en el conjunto, la meta es el mínimo esperado | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService eleva la meta cuando un sucesor exige más que el mínimo propio | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService no eleva la meta si la exigencia del sucesor es menor que el mínimo | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService toma la mayor exigencia cuando hay varios sucesores | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService ignora sucesores que quedan fuera del conjunto a intervenir | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService respeta un mínimo esperado distinto por dimensión | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService un conjunto vacío produce cero targets | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService demandedBy es null cuando la meta es el mínimo esperado | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService demandedBy es null cuando la exigencia iguala el mínimo (no lo fija nadie más) | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService demandedBy nombra al sucesor cuya exigencia supera el mínimo | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService demandedBy nombra al de mayor exigencia entre varios sucesores | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService demandedBy ante igual exigencia gana la primera en el orden canónico del marco | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/target-level-calculator.service.spec.ts` | TargetLevelCalculatorService demandedBy ignora sucesores fuera del conjunto a intervenir | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/kahn-layers.spec.ts` | kahnLayers puts nodes without a dependency between them in the same layer, in canonical order | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/kahn-layers.spec.ts` | kahnLayers ignores edges with an end outside the node set | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/kahn-layers.spec.ts` | kahnLayers throws DependencyGraphCycleError naming the nodes left in a cycle | Pasa |
| API unitaria | `test/unit/modules/roadmap/domain/kahn-layers.spec.ts` | kahnLayers returns no layers for an empty set | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList muestra las tres fases del caso AgroConecta | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList presenta las dimensiones de una fase como paralelas, no como jerarquía | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList muestra de qué nivel a qué nivel va cada dimensión en la fase, en palabras y en una barra | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList una subida que pasa del límite por fase dice que sigue en la próxima | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList explica qué significa el nivel al que llega cada dimensión | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList explica qué desbloquea cada dimensión, para que el orden sea refutable | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList dice por qué una dimensión está en el plan y qué fija su meta final | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList dice cuando una dimensión entra porque otra la necesita, y quién fija su meta | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList cada fase propone un servicio con su ficha, del más liviano al más profundo | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList cuando ningún servicio atiende bien la fase, muestra el más cercano y lo dice | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList explica por qué se propone cada servicio, en palabras | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList compara cómo quedan las dimensiones al terminar la ruta con cómo están hoy | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList al pasar por una pareja, deja encendidas solo sus dos dimensiones | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList nombra las dimensiones que quedaron fuera del plan | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList un roadmap vacío se presenta como resultado, no como error | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList — lenguaje llano no usa flechas ni símbolos de código en las tarjetas | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapPhaseList — lenguaje llano no deja texto de tamaño de nota: nada de text-xs | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapExplanationPanel explica la lógica en cuatro pasos con títulos claros | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapExplanationPanel cuenta qué espera a qué con frases, una vez cada una | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapExplanationPanel nombra lo que quedó fuera y por qué | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapExplanationPanel no muestra identificadores ni una tabla de columnas técnicas | Pasa |
| Frontend | `src/features/scaling-roadmap/components/__tests__/RoadmapPhaseList.test.tsx` | RoadmapExplanationPanel el texto de lectura no baja de text-sm | Pasa |

### RF-15. Recomendación del servicio del portafolio INNLAB

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta el perfil de partida es el de AgroConecta | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta aceptar el análisis profundo recomienda Célula de Grado · Posgrado, con Academia a la Medida y Reto Express | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta cada servicio trae la descripción del catálogo del portafolio | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta cada servicio trae su ficha: subtítulo, qué puede lograr, banda y nivel | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta el roadmap abre con esta recomendación y sigue con servicios más profundos | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta la justificación habla de afinidad global: ningún servicio atiende IPRL, el cuello de botella | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta GET /recommendation/trace expone las tres capas y el servicio que INC-02 metió en el ranking | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta volver a aceptar el análisis profundo es idempotente y no acumula filas | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta answers another user's diagnostic as missing (404), not revealing it exists | Pasa |
| API extremo a extremo | `test/e2e/modules/routing/generate-recommendation.e2e-spec.ts` | Enrutamiento de portafolio (e2e) — AgroConecta un diagnóstico sin recomendación generada devuelve 409, no 404 | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) persiste recomendación, alternatives y trace, y las recupera íntegras | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) guarda un servicio incluido por un ajuste sin puntaje, con su regla, y lo recupera | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) la base exige que un puesto tenga puntaje o la regla que lo incluyó, no ambos ni ninguno | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) guarda el ranking con el servicio recomendado en la posición 1 | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) no deja nada escrito si la transacción falla a mitad de camino | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) regenerar reemplaza por completo en vez de acumular | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) la base de datos impide dos recommendations para el mismo diagnóstico | Pasa |
| API integración | `test/integration/database/recommendation-repository.spec.ts` | Recomendación — persistencia (integration) exige la justificación o el motivo de no recomendar | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta servicios solo por ajuste no participan en la capa 1 ni en la 2: no se excluyen ni se puntúan | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 1 · eligibility no excluye ningún servicio: su equipo tiene más de una persona | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 1 · eligibility no excluye Reto en el Aula: el equipo tiene 3 personas (ELG-02 exige ≥2) | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 2 · cálculo de afinidad puntúa Reto Express en 2.80, con el desglose término a término esperado | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 2 · cálculo de afinidad puntúa Célula de Grado · Posgrado en 4.30: trabaja Cliente y Negocio dentro de su banda | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 2 · cálculo de afinidad produce el ranking previo a los ajustes esperado | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 2 · cálculo de afinidad conserva la etiqueta ordinal de origen junto a cada contribución | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 3 · ajustes solo se dispara INC-02; los demás se descartan en su orden de prioridad | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 3 · ajustes INC-02 mete Academia a la Medida en el puesto 2 del ranking, sin puntaje | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta capa 3 · ajustes descarta E-02 porque el cuello de botella es IPRL | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta resultado final recomienda Célula de Grado · Posgrado, con Academia a la Medida (exenta del umbral) y Reto Express | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta sensibilidad del caso sin cuello de botella en IPRL, E-02 promueve Reto en el Aula | Pasa |
| API unitaria | `test/unit/modules/routing/acceptance/agroconecta.spec.ts` | Aceptación — enrutamiento de portafolio para AgroConecta sensibilidad del caso un equipo de una persona excluye Reto en el Aula e incluye Práctica de Innovación | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial el seed vigente es coherente | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial trae los 12 servicios del portafolio, 4 de ellos solo por ajuste | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial cada servicio trae nombre, subtítulo, descripción, alcance y nivel, separados | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial los cuatro niveles del portafolio van de lo más liviano a lo más profundo | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza un servicio con un nivel que no existe | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza un servicio sin subtítulo o sin alcance | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza niveles cuyo orden no es consecutivo desde 1 | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial cada servicio tiene una ficha con sus seis intensidades | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial Alianza Residente conserva su banda 1–9 aunque sea solo por ajuste | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza un servicio puntuable sin banda | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza una banda fuera de 1–9 o invertida | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza una ficha sin las seis intensidades o con una etapa desconocida | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza una exclusión sobre un servicio solo por ajuste | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza INCLUDE sobre un servicio puntuable | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza FORCE sobre un servicio solo por ajuste que ninguna regla anterior incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza VETO sobre un servicio solo por ajuste que ninguna regla anterior incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza PROMOTE sobre un servicio solo por ajuste que ninguna regla anterior incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza DEMOTE sobre un servicio solo por ajuste que ninguna regla anterior incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial admite FORCE sobre un servicio solo por ajuste después de la regla que lo incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial admite VETO sobre un servicio solo por ajuste después de la regla que lo incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial admite PROMOTE sobre un servicio solo por ajuste después de la regla que lo incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial admite DEMOTE sobre un servicio solo por ajuste después de la regla que lo incluye | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial exige el puesto de destino en INCLUDE y el desplazamiento en PROMOTE, y lo rechaza en FORCE | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza códigos o prioridades repetidos y servicios desconocidos | Pasa |
| API unitaria | `test/unit/shared/kernel/infrastructure/database/routing-seed.spec.ts` | Seed de enrutamiento — portafolio oficial rechaza un servicio sin ficha | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) un servicio incluido es alternativa aunque no tenga puntaje | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) un servicio incluido en el primer puesto es la recomendación | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) si ningún puntuable alcanza el umbral, el incluido evita el «sin recomendación» | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) toma como primary el primero por encima del threshold | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) limita las alternatives a `alternativesCount` y nunca incluye la primary | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) descarta del ranking a los que no llegan al threshold | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) devuelve SIN_RECOMENDACION cuando nadie supera el threshold | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) devuelve SIN_RECOMENDACION cuando no queda ningún candidate | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) adjustedByException es falso cuando el ganador del cálculo también gana al final | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) adjustedByException es verdadero cuando un ajuste desplazó al ganador del cálculo | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) adjustedByException es falso si la trace está vacía, en vez de reventar | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | Recommendation (agregado) se rehidrata desde persistencia conservando la trace | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | errores del módulo de enrutamiento cada error expone un código estable, que es el contrato del cliente | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | errores del módulo de enrutamiento los mensajes nombran el diagnóstico afectado | Pasa |
| API unitaria | `test/unit/modules/routing/domain/recommendation.aggregate.spec.ts` | errores del módulo de enrutamiento los puertos se identifican por símbolo, no por name de clase | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService acciones FORZAR lleva el objetivo al primer puesto | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService acciones VETAR retira el objetivo del ranking | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService acciones PROMOVER sube el objetivo tantas positions como indique | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService acciones DEGRADAR baja el objetivo tantas positions como indique | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService saturación en los extremos promover más positions de las disponibles deja el primer puesto | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService saturación en los extremos degradar más positions de las disponibles deja el último puesto | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService saturación en los extremos promover al que ya es primero no lo mueve y lo dice en el effect | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService cascada y order aplica las exceptions en order de prioridad ascendente | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService cascada y order registra el ranking antes y después de cada excepción por separado | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService descartes descarta la excepción cuya condición no se cumple | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService descartes descarta con reason explícito si el objetivo no está en el ranking | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService descartes un ranking vacío no rompe el motor | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService sin exceptions configuradas devuelve el ranking intacto | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) INCLUDE mete el servicio en el puesto que fija la regla, sin puntaje | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) con el puesto 1 pasa a encabezar el ranking | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) un puesto más allá del final lo deja último | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) incluir un servicio que ya está en el ranking se descarta | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) INCLUDE sobre un servicio puntuable se descarta con su motivo | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) un ajuste posterior puede aplicar PROMOTE al servicio incluido | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) un ajuste posterior puede aplicar DEMOTE al servicio incluido | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) un ajuste posterior puede aplicar FORCE al servicio incluido | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) un ajuste posterior puede aplicar VETO al servicio incluido | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) un ajuste sobre un servicio solo por ajuste que nadie incluyó se descarta | Pasa |
| API unitaria | `test/unit/modules/routing/domain/exception-engine.service.spec.ts` | ExceptionEngineService servicios solo por ajuste (INCLUDE) una condición que no se cumple no incluye nada | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route the first phase opens with the portfolio recommendation itself | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route a next phase gets the service that best works its dimensions, never one already proposed | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route never goes lighter than the previous phase, and shows the best one as approximate when none fits | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route has no service when the route leaves no candidate | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/evaluate-phase-service.query.spec.ts` | EvaluatePhaseServiceQuery — the service of each phase of the route answers that the configuration is missing instead of guessing | Pasa |
| API unitaria | `test/unit/modules/routing/infrastructure/messaging/deep-analysis-requested.listener.spec.ts` | routing DeepAnalysisRequestedListener starts its own calculation for the diagnostic in the event | Pasa |
| API unitaria | `test/unit/modules/routing/infrastructure/messaging/deep-analysis-requested.listener.spec.ts` | routing DeepAnalysisRequestedListener swallows a business-outcome Result.err instead of throwing | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService cuello de botella multiplica el peso por la intensity en la dimensión rezagada | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService cuello de botella promedia las intensities cuando varias dimensions empatan en el mínimo | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService cuello de botella registra la label ordinal de cada dimensión empatada | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService gaps suma las intensities sobre las dimensions en brecha | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService gaps un perfil sin gaps no aporta por este término | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService imbalances pondera el peso del pair por la intensity dominante de sus dos dimensions | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService imbalances ignora los pares aceptables | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService imbalances no aporta si el service no atiende ninguna dimensión del pair | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService afinidad de stage y penalización de rango aporta cuando la stage del perfil está entre las pertinentes | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService afinidad de stage y penalización de rango una stage sin registrar no matches con ninguna | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService afinidad de stage y penalización de rango penaliza cuando el nivel promedio queda fuera de la banda del service | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService afinidad de stage y penalización de rango no penaliza en los extremos de la banda, que son inclusivos | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService propiedades (fast-check) el total es exactamente la suma de contributions menos la penalización | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService propiedades (fast-check) el score no decrece al aumentar la intensity en el cuello de botella | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService propiedades (fast-check) un service que no atiende ninguna dimensión solo puede aportar por stage | Pasa |
| API unitaria | `test/unit/modules/routing/domain/affinity-scorer.service.spec.ts` | AffinityScorerService propiedades (fast-check) el score es determinista | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService separación de modos rechaza un operador de grado en modo BOOLEAN | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService separación de modos admite el mismo operador en modo CON_GRADO | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService separación de modos admite igualdad y pertenencia en modo BOOLEAN | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un campo desconocido y nombra los disponibles | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un operador de pertenencia sobre un campo escalar | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza una comparación de orden sobre un campo no numérico | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un valor de tipo incompatible con el operador | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un nodo sin operador | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza `no` con más de un operando | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un compuesto sin operands | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un nodo que no es un objeto | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un operador que no existe en el DSL | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar rechaza un valor no textual para un operador de pertenencia | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService validación al compilar propaga el error desde un nodo anidado, indicando la ruta | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación resuelve pertenencia sobre el cuello de botella | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación resuelve el conteo de gaps | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación deriva los pares en desequilibrio crítico a partir de los facts | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación resuelve un nivel dimensional concreto | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación combina con y / o / no | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"bottleneck","op":"not_contains","value":"TRL"} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"bottleneck","op":"not_contains","value":"IPRL"} como false | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"gaps","op":"count<=","value":3} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"gaps","op":"count<=","value":2} como false | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"gaps","op":"count=","value":3} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"gaps","op":"count=","value":4} como false | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"averageLevel","op":">=","value":3.5} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"averageLevel","op":">=","value":4} como false | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"averageLevel","op":">","value":3} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"averageLevel","op":">","value":3.5} como false | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"levelByDimension.TRL","op":"=","value":6} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"levelByDimension.TRL","op":"!=","value":6} como false | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"characterization.stage","op":"!=","value":"idea"} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"characterization.sector","op":"=","value":null} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"moderateImbalances","op":"contains","value":"TRL-CRL"} como true | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores evalúa {"field":"moderateImbalances","op":"contains","value":"TRL-IPRL"} como false | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación cobertura de todos los operadores un nivel dimensional inexistente resuelve a null y no cumple | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación datos ausentes una comparación de orden contra un dato ausente es falsa | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | PredicateCompilerService evaluación datos ausentes una igualdad contra un dato ausente es falsa | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND declares a kind for every queryable field and nothing else | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND bottleneck (collection) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND gaps (collection) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND criticalImbalances (collection) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND moderateImbalances (collection) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND averageLevel (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND levelByDimension.TRL (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND levelByDimension.CRL (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND levelByDimension.BRL (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND levelByDimension.IPRL (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND levelByDimension.TmRL (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND levelByDimension.FRL (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND characterization.stage (scalar) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND characterization.sector (scalar) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/predicate-compiler.service.spec.ts` | FIELD_KIND characterization.teamSize (numeric) rejects the operators its kind does not support | Pasa |
| API unitaria | `test/unit/modules/routing/domain/phase-affinity-scorer.service.spec.ts` | PhaseAffinityScorerService — how a service works the dimensions of a phase adds intensity × levels the phase raises, per dimension of the phase, plus the stage | Pasa |
| API unitaria | `test/unit/modules/routing/domain/phase-affinity-scorer.service.spec.ts` | PhaseAffinityScorerService — how a service works the dimensions of a phase checks the band against the average projected to the start of the phase | Pasa |
| API unitaria | `test/unit/modules/routing/domain/phase-affinity-scorer.service.spec.ts` | PhaseAffinityScorerService — how a service works the dimensions of a phase a service that works none of the phase dimensions only gets its stage and band | Pasa |
| API unitaria | `test/unit/modules/routing/domain/projected-facts.spec.ts` | factsFromLevels — the facts of a projected profile derives AgroConecta facts as the measured profile does | Pasa |
| API unitaria | `test/unit/modules/routing/domain/projected-facts.spec.ts` | factsFromLevels — the facts of a projected profile reports every dimension tied at the lowest level as the bottleneck | Pasa |
| API unitaria | `test/unit/modules/routing/domain/eligibility-filter.service.spec.ts` | EligibilityFilterService un service sin rules asociadas es elegible por defecto | Pasa |
| API unitaria | `test/unit/modules/routing/domain/eligibility-filter.service.spec.ts` | EligibilityFilterService excluye el service cuya rule se cumple y reporta su mensaje | Pasa |
| API unitaria | `test/unit/modules/routing/domain/eligibility-filter.service.spec.ts` | EligibilityFilterService no excluye cuando la condición no se cumple | Pasa |
| API unitaria | `test/unit/modules/routing/domain/eligibility-filter.service.spec.ts` | EligibilityFilterService con varias rules sobre un service, reporta la primera que se cumple | Pasa |
| API unitaria | `test/unit/modules/routing/domain/eligibility-filter.service.spec.ts` | EligibilityFilterService una rule solo afecta al service al que está asociada | Pasa |
| API unitaria | `test/unit/modules/routing/domain/eligibility-filter.service.spec.ts` | EligibilityFilterService puede excluir todos los services | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/build-justification.spec.ts` | construirJustificacion names the lagging dimension by its catalog name, not by its code or its ordinal label | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/build-justification.spec.ts` | construirJustificacion lists several tied dimensions with a comma and a final «y» | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/build-justification.spec.ts` | construirJustificacion skips the dimensions the service does not address | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/build-justification.spec.ts` | construirJustificacion falls back to the global affinity sentence when no dimension applies | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/build-justification.spec.ts` | construirJustificacion cites the declared reason when an exception decided the first place | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/build-justification.spec.ts` | construirJustificacion returns null when there is no ranking | Pasa |
| API unitaria | `test/unit/modules/routing/application/use-cases/build-justification.spec.ts` | construirJustificacion if an adjustment put the winner into the ranking, it quotes the adjustment | Pasa |
| API unitaria | `test/unit/modules/routing/domain/calibration-scale.spec.ts` | CalibrationScale acepta una scale estrictamente decreciente | Pasa |
| API unitaria | `test/unit/modules/routing/domain/calibration-scale.spec.ts` | CalibrationScale acepta los peldaños en cualquier order de entrada y los normaliza | Pasa |
| API unitaria | `test/unit/modules/routing/domain/calibration-scale.spec.ts` | CalibrationScale rechaza una scale no monótona | Pasa |
| API unitaria | `test/unit/modules/routing/domain/calibration-scale.spec.ts` | CalibrationScale rechaza dos peldaños con el mismo value | Pasa |
| API unitaria | `test/unit/modules/routing/domain/calibration-scale.spec.ts` | CalibrationScale rechaza una scale vacía | Pasa |
| API unitaria | `test/unit/modules/routing/domain/calibration-scale.spec.ts` | CalibrationScale `tiene` permite comprobar pertenencia sin lanzar | Pasa |
| API unitaria | `test/unit/modules/routing/domain/calibration-scale.spec.ts` | CalibrationScale lanza al pedir una label que no existe, en vez de devolver cero | Pasa |
| API unitaria | `test/unit/modules/routing/domain/ordinal-translator.service.spec.ts` | OrdinalTranslatorService resuelve cada label a su value numérico | Pasa |
| API unitaria | `test/unit/modules/routing/domain/ordinal-translator.service.spec.ts` | OrdinalTranslatorService conserva la label original junto al value | Pasa |
| API unitaria | `test/unit/modules/routing/domain/ordinal-translator.service.spec.ts` | OrdinalTranslatorService es determinista: dos traducciones iguales producen lo mismo | Pasa |
| API unitaria | `test/unit/modules/routing/domain/ordinal-translator.service.spec.ts` | OrdinalTranslatorService propaga el fallo si una profile usa una label ausente en la scale | Pasa |
| API unitaria | `test/unit/modules/routing/domain/ordinal-translator.service.spec.ts` | OrdinalTranslatorService conserva rango y etapas sin alterarlos | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel arranca colapsado y no pide la trace hasta que se abre | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel avisa al abrirse para que la trace se cargue solo entonces | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel abre con el veredicto: qué servicio quedó primero y por qué | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel cuando la recomendación sale de un ajuste, el veredicto lo dice | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel cuenta el cálculo en tres pasos | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 1 — lo que se descartó dice qué servicios no aplican y por qué | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 1 — lo que se descartó dice que ninguno se descartó cuando es así | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 2 — el orden resume los aportes en etiquetas, con los nombres de las dimensiones y sin códigos | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 2 — el orden dice cuáles son las brechas y los desequilibrios que resume | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 2 — el orden muestra ese detalle al pasar el cursor por la etiqueta | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 2 — el orden no expone los puntajes de la calibración | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 2 — el orden omite las dimensiones que el servicio no atiende | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 2 — el orden dice cuando el servicio suele usarse con otro nivel de madurez | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 2 — el orden dice que no hay afinidad destacada cuando nada aporta | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes un ajuste que incluye un servicio dice en qué lugar entró, sin código ni puntaje | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes describe el ajuste por lo que hizo y no por su código | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes muestra la razón que declaró el centro | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes la acción PROMOTE se lee «Se subió Consultoría Experta en el orden» | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes la acción DEMOTE se lee «Se bajó Consultoría Experta en el orden» | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes la acción VETO se lee «Se retiró Consultoría Experta de las opciones» | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes dice que ya estaba en ese lugar cuando el ajuste no lo movió | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes muestra el orden que dejaron los ajustes, junto a cada ajuste y su motivo | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes en ese orden, el servicio que incluyó el centro lo dice y no muestra motivos del cálculo | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes si un ajuste puso otro servicio primero, el orden del cálculo no marca a su primero como recomendado | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes dice que no hizo falta ningún ajuste cuando no se aplicó ninguno, sin repetir el orden | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes cuenta los ajustes revisados y no aplicados sin listar sus códigos | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel paso 3 — los ajustes usa el plural cuando fueron varios | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel avisa cuando el resultado viene de un ajuste y no del cálculo | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel no muestra ese aviso cuando el servicio ganó el cálculo | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel señala cuando faltaron datos de la iniciativa, en español | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel no repite la fecha del resultado | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel los ajustes del centro no usan colores de advertencia | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | LayerTracePanel no usa símbolos de código: ni flechas, ni puntos medios, ni siglas | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary presenta el servicio y su justificación sin mostrar puntajes | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary la presenta como recomendada para la iniciativa, por su nombre | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary sin nombre habla de «tu iniciativa» | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary explica el caso sin recomendación en vez de mostrar una vacía | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary una alternativa que incluyó el centro dice por qué, sin mostrar puntaje | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary una alternativa calculada no lleva motivo de ajuste | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary explica de qué se trata el servicio recomendado con la descripción del catálogo | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary sin descripción en el catálogo no muestra la sección | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary muestra la ficha del servicio: subtítulo, nivel, banda y qué puede lograr | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary explica la banda del servicio al pasar el cursor por su chip | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary explica el nivel del servicio con lo que el portafolio dice de él | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary cada alternativa trae su subtítulo y su ficha detrás de «Ver ficha» | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary un servicio sin banda en el portafolio sirve a cualquier nivel | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary sin flujo de solicitud, la acción se muestra deshabilitada y anunciada como próxima | Pasa |
| Frontend | `src/features/portfolio-recommendation/components/__tests__/LayerTracePanel.test.tsx` | RecommendationSummary con flujo de solicitud, la acción lo dispara | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [chromium] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [firefox] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [msedge] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |

### RF-16. Visualización y descarga del reporte completo

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta antes del análisis profundo el reporte no existe: 409 REPORT_NOT_AVAILABLE | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta antes del análisis profundo tampoco se descarga: 409 REPORT_NOT_AVAILABLE | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta con el análisis profundo completo el diagnóstico dice que su análisis profundo está completo | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta con el análisis profundo completo reúne la iniciativa, el perfil, la recomendación, el roadmap y la atribución | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta con el análisis profundo completo lleva las 48 respuestas, por dimensión y en el orden del marco | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta con el análisis profundo completo dice lo mismo que los endpoints de la recomendación y del roadmap | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta con el análisis profundo completo descarga el reporte como un PDF adjunto, con el nombre de la iniciativa | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report.e2e-spec.ts` | Reporte completo (e2e) — AgroConecta answers another user's diagnostic as missing (404), not revealing it exists | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument follows the order of the report on screen | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument draws the profile as a radar of the six levels, each point named | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument draws each dimension today and at the end of the route | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument lists the 48 answers by dimension, each value in words and with its justification | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument is titled with the initiative and dated when the deep analysis finished | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument carries the attribution to the IRL framework and its CC BY-NC-SA 4.0 license (RNF-09) | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument says every score with its meaning, and names dimensions instead of codes | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument lists the most severe pair first | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument includes the recommendation with its justification and the roadmap with each phase service | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | buildReportDocument contains only the information of the diagnostic it was built from | Pasa |
| API unitaria | `test/unit/modules/reporting/application/dtos/report-document.spec.ts` | reportFileName names the file after the initiative and the day, with no accents or spaces | Pasa |
| API unitaria | `test/unit/modules/reporting/infrastructure/pdfkit-report.renderer.spec.ts` | PdfkitReportRenderer produces a complete PDF file | Pasa |
| API unitaria | `test/unit/modules/reporting/infrastructure/pdfkit-report.renderer.spec.ts` | PdfkitReportRenderer carries the title and the author as metadata | Pasa |
| API unitaria | `test/unit/modules/reporting/infrastructure/pdfkit-report.renderer.spec.ts` | PdfkitReportRenderer puts the attribution and the page number at the foot of every page | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/download-diagnostic-report.use-case.spec.ts` | DownloadDiagnosticReportUseCase draws the report of the caller as a PDF, named after the initiative | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/download-diagnostic-report.use-case.spec.ts` | DownloadDiagnosticReportUseCase without the deep analysis complete, draws nothing: REPORT_NOT_AVAILABLE | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/download-diagnostic-report.use-case.spec.ts` | DownloadDiagnosticReportUseCase answers someone else's diagnostic as missing, and draws nothing | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase gathers the initiative, the profile, the recommendation and the roadmap as the contract describes | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase carries what the user answered to each statement, by dimension | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase carries the attribution of the KTH framework and its license (RNF-09) | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase dates the report when the deep analysis finished: the later of its two results | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase in PROFILE_GENERATED the report is not available yet, and no result is read | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase in DEEP_ANALYSIS_IN_PROGRESS the report is not available yet, and no result is read | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase answers someone else's diagnostic as missing, before reading any result | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/get-diagnostic-report.use-case.spec.ts` | GetDiagnosticReportUseCase propagates a missing section instead of serving a partial report | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo se titula con el nombre de la iniciativa y dice cuándo se completó el análisis | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo muestra los datos de la iniciativa | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo muestra el perfil de las seis dimensiones, con el nivel y lo que significa | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo el perfil lleva el mismo radar interactivo de los resultados | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo muestra las brechas, las alertas de estado crítico y los desequilibrios, los más graves primero | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo muestra la recomendación del portafolio con su justificación | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo muestra el roadmap por fases, cada una con su servicio | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo lleva la atribución al marco KTH Innovation Readiness Level y su licencia | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — con el análisis profundo completo ofrece volver a los resultados | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — las respuestas al cuestionario muestra las 48 respuestas de un vistazo, cada casilla con su valor | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — las respuestas al cuestionario cada dimensión tiene su pestaña con las afirmaciones, el valor y la justificación | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — las respuestas al cuestionario al hacer clic en una casilla abre su dimensión y marca la afirmación | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — secciones plegables abre primero la iniciativa, el perfil y la recomendación; el resto empieza plegado | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — secciones plegables cada título dice qué contenido controla y si está abierto | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — secciones plegables se abre y se pliega con el teclado (Enter y Espacio) | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — secciones plegables «Expandir todas» abre todas y «Contraer todas» las pliega | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — secciones plegables elegir una sección plegada en la barra la abre | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — secciones plegables plegar secciones no cambia la descarga: el PDF sigue disponible y completo | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — sin el análisis profundo completo dice que el reporte solo existe tras el análisis profundo, y ni siquiera lo pide | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — sin el análisis profundo completo si el backend responde que no está disponible, dice lo mismo | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — descargar el reporte (HU-24) con el análisis profundo completo ofrece descargarlo como PDF | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — descargar el reporte (HU-24) descarga el archivo con el nombre que sugiere el servidor y lo confirma | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — descargar el reporte (HU-24) si el servidor responde que aún no está disponible, lo dice | Pasa |
| Frontend | `src/pages/__tests__/ReportPage.test.tsx` | ReportPage — descargar el reporte (HU-24) sin el análisis profundo completo no hay ninguna opción de descarga | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [chromium] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [firefox] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |
| Navegador, stack real | `tests/full-stack/deep-analysis-and-report.spec.ts` | [msedge] del inicio de sesión al reporte en PDF, con el análisis profundo | Pasa |

### RF-17. Notificación al equipo INNLAB al completar el análisis profundo

| Nivel | Archivo | Caso | Resultado |
|---|---|---|---|
| API extremo a extremo | `test/e2e/modules/reporting/report-mail-failure.e2e-spec.ts` | Falla del correo del reporte (e2e) con el servidor de correo caído, el líder igual obtiene su análisis completo y su reporte | Pasa |
| API extremo a extremo | `test/e2e/modules/reporting/report-mail.e2e-spec.ts` | Correo del reporte a INNLAB (e2e, buzón de pruebas real) al completar el análisis profundo llega un correo con el reporte en PDF adjunto | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/notify-innlab-of-completed-report.use-case.spec.ts` | NotifyInnlabOfCompletedReportUseCase mails the PDF of the completed report to the configured address | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/notify-innlab-of-completed-report.use-case.spec.ts` | NotifyInnlabOfCompletedReportUseCase sends nothing when mail is not configured | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/notify-innlab-of-completed-report.use-case.spec.ts` | NotifyInnlabOfCompletedReportUseCase sends nothing when the deep analysis is not complete | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/notify-innlab-of-completed-report.use-case.spec.ts` | NotifyInnlabOfCompletedReportUseCase sends nothing when the diagnostic has no owner | Pasa |
| API unitaria | `test/unit/modules/reporting/application/use-cases/notify-innlab-of-completed-report.use-case.spec.ts` | NotifyInnlabOfCompletedReportUseCase lets a mail failure surface so the listener can record it | Pasa |
