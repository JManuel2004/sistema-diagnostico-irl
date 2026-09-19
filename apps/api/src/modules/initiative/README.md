# initiative

## Alcance
El perfil de la iniciativa (sector, nombre, descripción, etapa, equipo) y el consentimiento de tratamiento de datos (Ley 1581, RF-03), más el historial de diagnósticos del usuario. **No cubre** el estado del diagnóstico ni el cuestionario (`diagnosis/`). El consentimiento vive aquí, no en `diagnosis/` (`convenciones-objetivo.md` §1.3).

## Reglas que deben respetarse
- Antes de escribir un consentimiento o una iniciativa, el `diagnosticId` debe **existir y pertenecer al usuario autenticado** (`DiagnosticOwnershipPort`): `NotFoundError` si no existe, `ForbiddenError` si es de otro usuario. La comprobación va antes que cualquier otra validación.
- La versión de los términos la fija el backend (`CURRENT_TERMS_VERSION`); un cliente con una versión distinta recibe `ConflictError`, no se acepta en silencio.
- No existe "rechazar consentimiento": quien no acepta no envía la petición.
- `initiative/` no cambia el estado del diagnóstico: publica `ConsentRecordedEvent` **después** de guardar el consentimiento y `diagnosis/` mueve su propia máquina de estados.
- Registrar dos veces la iniciativa del mismo diagnóstico reemplaza el registro anterior.

## Nivel de completitud
- Implementado: registro y lectura del consentimiento (HU-05), registro y lectura de la iniciativa (HU-06, sin formulario en el frontend todavía — backlog 11.2), lista de "mis diagnósticos" (HU-03, backlog 11.3), caracterización para `routing/`.
- Pendiente: `RegisterInitiativeUseCase` no avanza el diagnóstico a `WITH_INITIATIVE` (backlog 14.1); `GetConsent`/`GetInitiative` no verifican propiedad (backlog 14.2).

## Responsabilidad (lenguaje ubicuo)
"Quién es la iniciativa y qué aceptó": los datos básicos de la iniciativa que se está diagnosticando y la constancia de que su líder aceptó el tratamiento de datos.

## Conceptos de dominio
`Initiative` (agregado), `Consent` (entidad), catálogos de sector y etapa (`InitiativeCatalogPort`).

## Qué expone hacia afuera
- **Puertos/casos de uso:** `GetInitiativeCharacterizationUseCase` (lo consume `routing/`).
- **Eventos que publica:** `ConsentRecordedEvent` (`shared/kernel/events/`).
- **HTTP:** `diagnostics/:id/consent`, `diagnostics/:id/initiative`, `diagnostics` (lista propia). Contratos en Swagger.

## De qué depende
`diagnosis/` a través de `DIAGNOSIS_REPOSITORY` (puerto exportado), consumido solo por `DiagnosisOwnershipAdapter` y `ListMyDiagnosesUseCase`. `shared/identity` para `@CurrentUser()`.

## Datos que posee
Escribe: `irl_diagnostic.consent`, `irl_diagnostic.initiative`. Los catálogos `irl_catalog.sector` e `initiative_stage` se leen (solo se modifican por seed).

## Cobertura de pruebas
- **Unitarias:** entidades `Consent`/`Initiative`, `RecordConsentUseCase`, `RegisterInitiativeUseCase`, `DiagnosisOwnershipAdapter`.
- **E2E:** `consent-and-ownership` (consentimiento → `WITH_CONSENT`, 403/404/409).
- **Falta:** integración de los repositorios TypeORM; pruebas de los controladores y de los casos de uso de lectura.
