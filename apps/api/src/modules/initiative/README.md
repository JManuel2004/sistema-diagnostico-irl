# initiative

## Alcance

El perfil de la iniciativa (nombre, sector, tipo de producto, etapa del catálogo y etapa declarada, equipo, mercado objetivo, financiamiento actual) y el consentimiento de tratamiento de datos (Ley 1581, RF-03), más el historial de diagnósticos del usuario. **No cubre** el estado del diagnóstico ni el cuestionario (`diagnosis/`). El consentimiento vive aquí, no en `diagnosis/` (la Ley 1581 liga el consentimiento a los datos que se tratan, y buena parte son los de la iniciativa).

## Reglas que deben respetarse

- Antes de escribir un consentimiento o una iniciativa, el `diagnosticId` debe **existir y pertenecer al usuario autenticado** (`DiagnosticOwnershipPort`): `NotFoundError` si no existe, `ForbiddenError` si es de otro usuario. La comprobación va antes que cualquier otra validación.
- La versión de los términos la fija el backend (`CURRENT_TERMS_VERSION`); un cliente con una versión distinta recibe `ConflictError`, no se acepta en silencio.
- No existe "rechazar consentimiento": quien no acepta no envía la petición.
- **La iniciativa exige el consentimiento registrado** (RF-03, RNF-06): `RegisterInitiativeUseCase` responde `ConflictError` (409) si el diagnóstico no tiene consentimiento y no guarda nada. La propiedad se comprueba antes que el consentimiento. El asistente del frontend pide la iniciativa primero, la mantiene como borrador del navegador y la envía después de registrar el consentimiento.
- `initiative/` no cambia el estado del diagnóstico: publica `ConsentRecordedEvent` **después** de guardar el consentimiento e `InitiativeRegisteredEvent` **después** de guardar la iniciativa, y `diagnosis/` mueve su propia máquina de estados.
- **Todos los campos del perfil son obligatorios** (el contrato y el agregado los validan; texto libre de hasta 500 caracteres, nombre de 3 a 120, equipo de al menos una persona). La etapa del catálogo (`stageId`) es la que lee el enrutador; `declaredStage` es la descripción del usuario y solo se muestra de vuelta.
- Registrar dos veces la iniciativa del mismo diagnóstico reemplaza el registro anterior (así se edita desde el panel) y no retrocede el diagnóstico.

## Nivel de completitud

- Implementado: registro y lectura del consentimiento (HU-05, paso 2 del asistente), registro y lectura de la iniciativa (HU-06, con su formulario y su panel en el frontend), catálogos de sectores y etapas para el formulario, lista de "mis diagnósticos" (HU-03), caracterización para `routing/`.
- El registro de la iniciativa avanza el diagnóstico a `WITH_INITIATIVE` por evento (`InitiativeRegisteredEvent`).
- Pendiente: `GetConsent`/`GetInitiative` no verifican propiedad. El catálogo de sectores solo tiene el del caso AgroConecta: falta la taxonomía de INNLAB.

## Responsabilidad (lenguaje ubicuo)

"Quién es la iniciativa y qué aceptó": los datos básicos de la iniciativa que se está diagnosticando y la constancia de que su líder aceptó el tratamiento de datos.

## Conceptos de dominio

`Initiative` (agregado), `Consent` (entidad), catálogos de sector y etapa (`InitiativeCatalogPort`).

## Qué expone hacia afuera

- **Puertos/casos de uso:** `GetInitiativeCharacterizationUseCase` (lo consume `routing/`).
- **Eventos que publica:** `ConsentRecordedEvent` e `InitiativeRegisteredEvent` (`shared/kernel/events/`).
- **HTTP:** `diagnostics/:id/consent`, `diagnostics/:id/initiative`, `diagnostics` (lista propia), `initiative-catalog/sectors` e `initiative-catalog/stages`. Contratos en Swagger.

## De qué depende

`diagnosis/` a través de `DIAGNOSIS_REPOSITORY` (puerto exportado), consumido solo por `DiagnosisOwnershipAdapter` y `ListMyDiagnosesUseCase`. `shared/identity` para `@CurrentUser()`.

## Datos que posee

Escribe: `irl_diagnostic.consent`, `irl_diagnostic.initiative`. Los catálogos `irl_catalog.sector` e `initiative_stage` se leen (solo se modifican por seed; el de sectores lo siembra `seed-catalog.ts`).

## Cobertura de pruebas

- **Unitarias:** entidades `Consent`/`Initiative`, `RecordConsentUseCase`, `RegisterInitiativeUseCase` (incluye el evento), `DiagnosisOwnershipAdapter`.
- **Integración:** `initiative-repository` (perfil completo, actualización, catálogos sembrados).
- **E2E:** `consent-and-ownership` (consentimiento → `WITH_CONSENT`, 403/404/409), `registration-flow` (iniciar → iniciativa → cuestionario → perfil).
- **Falta:** integración del repositorio de consentimiento; pruebas de los controladores y de los casos de uso de lectura.
