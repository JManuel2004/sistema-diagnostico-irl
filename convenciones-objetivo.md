# Convenciones objetivo — Sistema de Diagnóstico IRL

**Fecha:** 2026-09-15
**Naturaleza de este documento:** estándar de referencia contra el cual se mide cada fase posterior del refactor. No es un diagnóstico — el diagnóstico está en `backlog-deuda-tecnica.md`. Donde una decisión depende de un juicio de negocio o de producto que el código no puede resolver por sí solo, se deja marcado como **[PREGUNTA ABIERTA]** en vez de decidirse aquí.

---

## 1. Límites de contexto acotado propuestos

**Este mapa reemplaza por completo el de una versión anterior de este documento** (que tenía `irl-catalog`, `questionnaire`, `maturity-profile`, `diagnostic`, `portfolio-routing`, `scaling-roadmap`, `report`, `notifications`, `identity`, `audit`). Es una decisión de producto posterior, más granular en algunos puntos (`initiative` y `service-catalog` se separan) y más consolidada en otros (`report`+`notifications` se funden en `reporting`). La sección 1.3 detalla exactamente qué cambió respecto a la versión anterior y por qué, para que no se lea como una contradicción silenciosa.

### 1.1 Mapa de contextos resultante

| Módulo | Tipo (DDD) | Responsabilidad | Qué absorbe del código/esquema actual |
|---|---|---|---|
| **`shared/irl-taxonomy/`** | Genérico / Shared Kernel | El vocabulario de las seis dimensiones del marco IRL (código, nombre, descripción, secuencia). Sin lógica de cálculo propia — es catálogo de referencia, solo lectura. | La parte de `irl_catalog.dimension` que define las dimensiones **en sí**. Hoy vive junto con las afirmaciones en `modules/irl-catalog/`; se separa porque las afirmaciones son contenido específico del cuestionario (ver `diagnosis/`), no vocabulario compartido. |
| **`shared/identity/`** | Anticorruption Layer | Traduce la identidad de Cognito y el contexto de compañía de INNLAB Core al resto del sistema. No es dominio de este sistema (SEMI). | **Confirmado contra el estado real del código, no es una suposición:** ya existe, completo y ya construido correctamente, como `apps/api/src/modules/identity/` — estrategia JWT de Cognito, `InnlabCoreHttpClient` como único punto de contacto HTTP con Core, caché de contexto en memoria de proceso (nunca persistida), cero tablas o JOINs locales sobre datos de compañía (verificado exhaustivamente, ver `backlog-deuda-tecnica.md` 1.4). Este ítem es una reubicación de carpeta (`modules/identity/` → `shared/identity/`), **no una construcción desde cero** — la integración con Core no es tan reciente como para no tener código; ya está hecha. |
| **`initiative/`** | Supporting | El perfil de la iniciativa (sector, equipo, financiamiento, etapa) como extensión de la `company` de Core, más el historial de diagnósticos de esa iniciativa. | El formulario de "información básica de la iniciativa" (HU-06/RF-04 — hoy un stub sin implementar, `InProgressPage`, ver `backlog-deuda-tecnica.md` 11.2) y las tablas `irl_diagnostic.iniciativa`/`etapa_iniciativa`. **Confirmado:** estas tablas ya son propias, separadas de `respuesta`/`answer` desde la migración original — no están mezcladas con las respuestas del cuestionario. El historial de diagnósticos se apoya en `DiagnosticRepositoryPort.findAllByUserId`, ya declarado en el puerto pero sin caso de uso que lo use (`backlog-deuda-tecnica.md` 11.3) — ese caso de uso pasa a vivir aquí, no en `diagnosis/`. |
| **`diagnosis/`** | Core | Ejecución del cuestionario (48 afirmaciones, escala Likert) y cómputo del perfil IRL (nivel por dimensión, cuello de botella, brechas, desequilibrios, estado crítico). | Fusiona los actuales `diagnostic` (orquestador + máquina de estados + consentimiento), `questionnaire` (captura de respuestas) y `maturity-profile` (cálculo del perfil) — las tres etapas de la fase 1 que hoy ya dependen unas de otras a través del único orquestador real del sistema. Además absorbe `irl_catalog.statement` (las 48 afirmaciones, separadas de `shared/irl-taxonomy/` — ver arriba) y las tablas `irl_diagnostic.respuesta`/`resultado_dimension`/`analisis_desequilibrio`. |
| **`routing/`** | Core, alcance reducido al ciclo de consulta | Cálculo de la recomendación de portafolio: fichas ordinales → exclusiones (elegibilidad) → puntaje (afinidad) → ajustes (excepciones) → explicación (traza por capas). | El actual `portfolio-routing` completo — motor de capas, seed de AgroConecta, endpoint(s) de recomendación — **más el catálogo de los seis servicios de INNLAB** (`irl_catalog.servicio_portafolio`), que una versión anterior de este mapa evaluaba como módulo Supporting propio (`service-catalog/`) y que ahora se repliega aquí — ver la nota inmediatamente debajo de esta tabla. **Debe perder** cualquier tabla o lógica de versión activa/archivada construida ahí (`version_configuracion`, `snapshot_calibracion`, `snapshot_parametros`, las cuatro tablas `*_borrador`, el método `loadByVersion` sin llamador) — ver el detalle completo de qué se retira y por qué en `backlog-deuda-tecnica.md` 5.6. **Lo que sí se conserva intacto:** `traza_capas`, el registro de auditoría por cálculo individual — no es versionamiento de configuración, es trazabilidad de una decisión puntual y sigue siendo un requisito vigente. |
| **`roadmap/`** | Core | Cálculo de las fases de escalamiento a partir del grafo de dependencias entre dimensiones. | El actual `scaling-roadmap` completo — el grafo sembrado, el motor de capas/metas, el endpoint de roadmap. Por la misma razón que `routing/`, **debe perder** el mecanismo de activar/desactivar aristas (`dependencia_dimension.activa`) construido para el mismo ciclo de configuración ausente — ver `backlog-deuda-tecnica.md` 5.6. |
| **`reporting/`** | Supporting, no existe todavía | Visualización, generación y notificación de reportes para INNLAB. | Nada del código actual — es la primera de las historias de usuario futuras evaluadas en `backlog-deuda-tecnica.md` 11.1. Absorbe, como dos sub-conceptos de un mismo módulo (generación del documento y envío de la notificación), lo que una versión anterior de este documento había resuelto como dos módulos separados (`report` + `notifications`) — ver la nota de revisión en 1.3. |

**`audit` no aparece en este mapa porque sigue sin ser un contexto de dominio** (resolución que no cambió): registra eventos de cualquier módulo sin lenguaje ubicuo propio — vive como servicio de infraestructura transversal en `shared/kernel/` (ver el párrafo siguiente) o como interceptor/decorador global, nunca como módulo con su propia carpeta `domain/`.

**`service-catalog/` deja de ser un módulo Supporting propio y se repliega dentro de `routing/`.** Una versión anterior de este mapa lo separaba con la misma forma que `shared/irl-taxonomy/` (catálogo de solo lectura). La razón del repliegue: el único consumidor real y directo del catálogo de los seis servicios de INNLAB es `routing/` — `roadmap/` obtiene el servicio asociado a cada dimensión a través de `routing/`, nunca directamente del catálogo. Mantenerlo como módulo separado creaba un bounded context con un solo cliente, sin ningún beneficio de aislamiento que ese cliente ya no obtenga con el catálogo viviendo dentro de su propia carpeta de infraestructura (`routing/infrastructure/service-catalog/`, o la ubicación que resulte más natural dentro de sus cuatro capas al implementarlo). **Condición de reversión, explícita:** el día que exista un segundo consumidor real y directo del catálogo — no a través de `routing/` — se vuelve a separar como módulo propio, con la misma forma que `shared/irl-taxonomy/` tiene hoy.

**`shared/` se organiza en tres subcarpetas, cada una con su propia estructura de capas.** Una versión anterior de este documento distinguía `shared/` (categoría DDD: Shared Kernel / Anticorruption Layer, con `shared/irl-taxonomy/` y `shared/identity/`) del `shared-kernel/` técnico que ya existe en el código (`apps/api/src/shared-kernel/`, con los VOs genéricos `Uuid`/`LikertValue`/`DimensionCode`, la jerarquía de `DomainError`, y la interfaz `UseCase`), tratándolos como dos directorios distintos y sin mover el segundo. Esa distinción se retira: ambos se fusionan en un único `shared/`, con tres subcarpetas propias, cada una responsable de su propio contenido y sin aplanarse entre sí:

- **`shared/kernel/`** — las primitivas genéricas que hoy vive en `shared-kernel/`: `Uuid`, `BaseEntity`, `AggregateRoot`, `DomainError`, `Result<T, E>` (ver la subsección dedicada más abajo), y las clases de eventos de dominio pensadas para cruzar módulos (`events/`, ver la subsección de eventos de dominio). Es infraestructura de dominio sin puertos ni casos de uso propios — no sigue la estructura de cuatro capas de la sección 2. **Estado real tras la Fase 4:** además de `domain/`, `application/` (p. ej. `unwrapResult()`) y `events/`, contiene dos carpetas técnicas para lo transversal a toda la API, ninguna de las cuales es un contexto de negocio: `infrastructure/database/` (`data-source`, `migrations/`, `seeds/`, `numeric.transformer`) e `infrastructure/http/` (`configureApp`, `problem-details`, filtros de excepciones), y `presentation/controllers/` (`health.controller`). En `apps/api/src/` ya no existen carpetas `infrastructure/` ni `interfaces/` propias.
- **`shared/irl-taxonomy/`** — sin cambio de responsabilidad respecto a la versión anterior de este documento, solo de ubicación bajo `shared/`. Conserva su propia estructura de cuatro capas (`domain/`, `application/`, `infrastructure/`, `presentation/` — ver sección 2).
- **`shared/identity/`** — ídem: integración con INNLAB Core, sin cambio de responsabilidad, solo de ubicación. Conserva su propia estructura de cuatro capas. El archivo que implementa la integración con Core (`InnlabCoreHttpClient` u otro que cumpla ese rol) debe llevar un comentario de cabecera que declare explícitamente que es integración externa y no dominio propio de SEMI — compensación necesaria porque, al vivir dentro de `shared/` junto a `kernel/` e `irl-taxonomy/`, la carpeta ya no comunica esa distinción por sí sola tan claramente como cuando `identity` era la única carpeta de su tipo en el árbol.

**Regla de composición que debe mantenerse — reescrita para distinguir dos casos que la redacción anterior de esta regla no separaba:**

- **(a) Un contexto Core que dispara o depende directamente de un *proceso* de otro contexto Core.** Esto sigue prohibido. `diagnosis/` sigue siendo el único orquestador de la fase 1 (cuestionario → perfil). `routing/` y `roadmap/` no se llaman entre sí ni a `diagnosis/` directamente cuando el usuario activa el análisis profundo — se resuelve con eventos de dominio (ver la subsección dedicada más abajo), no con un orquestador de fase 2 construido a mano.
- **(b) Una consulta síncrona de solo lectura a datos de referencia de un contexto Supporting o Genérico.** Esto sí está permitido — no es el patrón que la regla buscaba evitar. Ejemplos: `routing/` consultando su propio catálogo de servicios (ahora replegado dentro de su propia carpeta, ver arriba), o cualquier módulo consultando `shared/irl-taxonomy/` a través de su puerto. La redacción anterior de esta regla, leída de forma literal, habría prohibido también este segundo caso — eso era una imprecisión de la regla, no una restricción real que este documento haya querido imponer nunca.

#### Eventos de dominio

El caso (a) de arriba — un contexto Core que depende de un *proceso* de otro — se resuelve con eventos de dominio, no con un orquestador construido a mano. Esta subsección fija el mecanismo, la regla de ubicación y los eventos concretos de esta fase; el patrón de código (clase base `DomainEvent<T>`) sigue documentado en la sección 2.2.

- **Mecanismo:** `EventEmitter2` de NestJS (`@nestjs/event-emitter`), con despacho síncrono dentro del mismo caso de uso que produce el cambio de estado, publicado después de que la transacción que originó el evento se confirmó. El proyecto no tiene infraestructura de cola (no hay SQS, no hay Redis, no hay ningún broker) y no se introduce una para esto — el despacho síncrono en proceso es suficiente para el volumen y la topología actuales, y adoptar una cola sin una necesidad real sería la misma clase de sobre-construcción que ya documenta el hallazgo 5.6 del backlog para el esquema de versionado.
- **Regla de ubicación:** toda clase de evento que un módulo **distinto** al que lo dispara escucha — **o que se declara precisamente para que otro módulo pueda escucharlo, aunque hoy no tenga listener** — vive en `shared/kernel/events/`, no dentro de `domain/events/` del módulo que lo dispara. Esa carpeta (ver el árbol de la sección 2) queda reservada para eventos que ningún otro módulo escucha ni escuchará: hechos internos del propio módulo. La razón de declarar en `shared/kernel/events/` un evento todavía sin listener es que su único propósito es desacoplar al que lo dispara de quien lo consuma: si viviera en el módulo emisor, el futuro consumidor (`reporting/`) tendría que importar de `routing/` o `roadmap/` para escucharlo, que es exactamente la dependencia que el evento existe para evitar. (Una versión anterior de esta regla pedía mover el evento a `shared/kernel/events/` solo cuando ganara un listener externo; se corrigió en la Fase 4 por esa razón.)
- **Eventos de esta fase:**
  - **`DeepAnalysisRequestedEvent`** — disparado por `diagnosis/` cuando el usuario, ya con su perfil de madurez calculado, **acepta** recibir la recomendación de portafolio y el roadmap. No al completar el cuestionario — son dos momentos distintos del flujo del usuario, y confundirlos dispararía el análisis profundo antes de que el usuario lo haya pedido. Este evento reemplaza al "orquestador de fase 2" que una versión anterior de este documento dejaba como trabajo pendiente sin resolver cómo se construiría: no se construye un orquestador directo entre `diagnosis/` y `routing/`/`roadmap/`, se construye este evento. Lo escuchan `routing/` y `roadmap/`, cada uno inicia su propio cálculo de forma independiente — ninguno de los dos sabe que el otro también está escuchando.
  - **`ConsentRecordedEvent`** — disparado por `initiative/` una vez guardado el consentimiento de tratamiento de datos (Ley 1581). Lo escucha `diagnosis/`, que mueve su máquina de estados de `STARTED` a `WITH_CONSENT`: el consentimiento es de `initiative/`, la transición de estado es de `diagnosis/`, y ninguno llama al otro. La reacción es idempotente (un diagnóstico que ya pasó de `STARTED` no se toca) y un fallo del listener se registra sin hacer fallar la petición del usuario, porque el consentimiento ya quedó guardado.
  - **`InitiativeRegisteredEvent`** — disparado por `initiative/` una vez guardado el perfil de la iniciativa (RF-04). Lo escucha `diagnosis/`, que mueve su máquina de estados de `WITH_CONSENT` a `WITH_INITIATIVE`, con el mismo patrón que el consentimiento: reacción idempotente (un diagnóstico más avanzado no se toca, así que editar la iniciativa no lo hace retroceder) y un fallo del listener solo se registra.
  - **`PortfolioRecommendationCalculatedEvent`** — disparado por `routing/` al terminar su cálculo. Sin listener todavía; vive en `shared/kernel/events/` por la regla de ubicación de arriba.
  - **`ScalingRoadmapCalculatedEvent`** — disparado por `roadmap/` al terminar el suyo. Sin listener todavía; ídem. Como `roadmap/` no persiste su resultado y lo recalcula en cada consulta, hoy lo publica también en cada `GET /roadmap` — ver `backlog-deuda-tecnica.md` 14.4.
  - Los dos últimos existen para que `reporting/` pueda engancharse el día que se construya, sin que `routing/`/`roadmap/` necesiten saber que `reporting/` existe — el mismo principio de composición que ya rige `diagnosis/` → `routing/`/`roadmap/` a través de `DeepAnalysisRequestedEvent`, aplicado en la dirección inversa del flujo.
- **Diseño de `reporting/` para estos dos últimos eventos** (especificación para cuando ese módulo se construya, no una implementación de esta fase): cada listener, al recibir su evento, persiste su pieza del reporte y verifica si la otra pieza ya llegó; solo cuando ambas están presentes se genera el reporte final y se dispara la notificación. Es un patrón de finalización idempotente por correlación (clave: el identificador del diagnóstico/análisis) — la comprobación "¿ya llegó la otra pieza?" contra una fila existente, no una espera activa ni un temporizador. No se necesita infraestructura de saga ni una máquina de estados con espera explícita para esto: dos escrituras idempotentes y una comprobación de presencia bastan porque solo hay dos piezas, siempre las mismas dos, y ninguna depende del orden en que llegue la otra.

### 1.2 Trazabilidad — de dónde viene cada módulo nuevo

| Módulo nuevo | Módulo(s)/tabla(s) de origen |
|---|---|
| `shared/irl-taxonomy/` | `modules/irl-catalog/` (solo la parte de `dimension`) |
| `shared/identity/` | `modules/identity/` (reubicación completa, sin cambios de contenido) |
| `initiative/` | `modules/initiative/` (hoy solo entidades ORM) + tablas `iniciativa`/`etapa_iniciativa` |
| `diagnosis/` | `modules/diagnostic/` + `modules/questionnaire/` + `modules/maturity-profile/` + `modules/consent/` + la parte de `irl-catalog` que define `statement` |
| `routing/` | `modules/portfolio-routing/`, sin el esquema de versionado (ver 5.6 del backlog) + `irl_catalog.servicio_portafolio`, hoy registrada desde `modules/portfolio-routing/` pero evaluada en una versión anterior de este mapa como módulo `service-catalog/` propio (repliegue explicado en 1.1) |
| `roadmap/` | `modules/scaling-roadmap/`, sin `dependencia_dimension.activa` |
| `reporting/` | Nada — módulo nuevo |

### 1.3 Revisión respecto a resoluciones anteriores de este documento

Este mapa cambia tres decisiones que una versión anterior de este documento ya había resuelto. Se documentan explícitamente para que no se lean como contradicciones:

1. **`initiative` deja de ser un sub-concepto de `diagnostic` y pasa a ser su propio módulo Supporting.** La resolución anterior lo fundía dentro del flujo de `diagnostic` junto con `consent`. Esta decisión de producto lo separa, apoyada en que la iniciativa es una extensión de un concepto que vive en Core (`company`) y tiene ciclo de vida propio más allá de un solo diagnóstico (el historial de diagnósticos, que ahora es capacidad de `initiative/`, no de `diagnosis/`).
2. **`report` y `notifications` se funden en un único módulo `reporting/`.** La resolución anterior los separaba en dos bounded contexts con puertos propios. Esta decisión de producto los trata como dos sub-conceptos de una misma responsabilidad ("reportar a INNLAB"), coherente con que ninguno de los dos tiene código real todavía — no hay costo de deshacer una separación que nunca se construyó.
3. **`identity` se confirma (no se decide de nuevo) como Anticorruption Layer, y se ubica físicamente en `shared/`.** La resolución anterior ya lo trataba como infraestructura de integración, no como dominio; lo que este mapa añade es la confirmación explícita, contra el código real, de que la integración con Core **ya existe y ya es correcta** — no es una suposición a validar en una fase futura, es un hecho verificado (ver 1.1).

**Frontera de `consent` — resuelta: vive en `initiative/`.** La resolución anterior ubicaba el consentimiento como paso previo al registro de la iniciativa, ambos dentro del flujo de `diagnostic`. Con `initiative` promovida a su propio módulo, la pregunta era si el consentimiento se quedaba en `diagnosis/` (como gate de entrada al cuestionario) o se trasladaba a `initiative/`. **Decisión: se traslada a `initiative/`**, como parte del perfil de la iniciativa — la Ley 1581 liga el consentimiento a los datos que se van a tratar, y buena parte de esos datos son los de la iniciativa. Consecuencias, ya implementadas en la Fase 4:

- `modules/initiative/` es dueño de la entidad `Consent`, su puerto de repositorio, `RecordConsentUseCase`/`GetConsentUseCase`, el controlador `diagnostics/:id/consent` y la tabla `irl_diagnostic.consent`. `diagnosis/` no contiene lógica de consentimiento.
- **El estado del diagnóstico sigue siendo de `diagnosis/`.** `initiative/` no lo modifica: publica `ConsentRecordedEvent` (en `shared/kernel/events/`, ver la subsección de eventos de dominio) y `diagnosis/` reacciona con `ApplyConsentToDiagnosisUseCase`. Por eso `WITH_CONSENT` sigue existiendo en la máquina de estados de `diagnosis/` aunque el consentimiento viva en otro módulo.
- **Verificación de propiedad antes de escribir.** `RecordConsentUseCase` y `RegisterInitiativeUseCase` comprueban, por `DiagnosticOwnershipPort`, que el `diagnosticId` existe (`NotFoundError`) y pertenece al usuario autenticado (`ForbiddenError`) antes de continuar. `initiative/` obtiene esa respuesta del puerto exportado de `diagnosis/` (caso (b) de la regla de composición) sin recibir la entidad.
- **Pendiente:** `RegisterInitiativeUseCase` aún no avanza el diagnóstico a `WITH_INITIATIVE` (`backlog-deuda-tecnica.md` 14.1), y el resto de endpoints por diagnóstico aún no verifican propiedad (14.2).

*Esta edición se hizo in situ, y no como ADR, porque resuelve una pregunta que este propio documento había dejado abierta; no cambia el mapa de contextos de la tabla 1.1.*

**Acceso directo de `routing/`/`roadmap/` a `DimensionOrm` — resuelto.** `routing/` y `roadmap/` hoy leen `DimensionOrm` directamente en vez de pasar por el puerto de `shared/irl-taxonomy/` (antes `IrlCatalogRepositoryPort`), duplicando el mismo mapeo id→código en los dos módulos (`backlog-deuda-tecnica.md`, hallazgos 1.3 y 3.2). Esto no era una decisión de negocio pendiente — era una aplicación directa de la "regla de composición" que la sección 1.1 ya fija (ningún contexto Core/Supporting llama directamente a otro), que este documento no había aplicado consistentemente a este caso. Queda resuelto así: `routing/` y `roadmap/` deben consumir `shared/irl-taxonomy/` **únicamente** a través de su puerto — el acceso directo a `DimensionOrm` **no se acepta como excepción documentada**, queda registrado como deuda a corregir durante la fase estructural (sección 2, nota de migración), al mismo tiempo que ambos módulos se separan de `portfolio-routing`/`scaling-roadmap` hacia su forma final.

---

## 2. Estructura interna de un módulo

Patrón único para los siete módulos de la tabla 1.1 (`shared/irl-taxonomy`, `shared/identity`, `initiative`, `diagnosis`, `routing`, `roadmap`, `reporting`) — los dos `shared/` siguen la misma organización de cuatro capas que los Core/Supporting porque también son bounded contexts (Shared Kernel y Anticorruption Layer respectivamente), solo que de un tipo distinto. `audit`, al ser un servicio transversal sin bounded context propio (ver 1.1), no sigue este patrón — vive en `shared/kernel/` o como interceptor global.

```
apps/api/src/modules/<contexto>/
├── <contexto>.module.ts     # forFeature([...]) + binding { provide: SYMBOL, useClass: Adapter }
├── domain/
│   ├── entities/            # agregados raíz — factory estático create() + fromPersistence()/toPersistence()
│   ├── value-objects/       # constructor privado + static create() que valida el invariante
│   ├── events/               # solo eventos que NINGÚN otro módulo escucha — ver regla de ubicación en la subsección de eventos de dominio
│   ├── exceptions/            # subclases de DomainError que se lanzan dentro del dominio mismo — alcance reducido, ver la subsección de Result<T,E>
│   ├── services/              # servicios de dominio puros — sin IO, sin decoradores de ningún framework
│   └── repositories/          # contratos que el DOMINIO necesita para expresar sus propias invariantes — ver la regla de dónde va cada puerto, más abajo
├── application/
│   ├── use-cases/            # una clase por caso de uso, un método público execute(command)
│   ├── dtos/                  # derivados con z.infer de @innlab/contracts cuando exista un schema Zod equivalente — nunca redefinidos a mano si ya existe
│   └── ports/                 # contratos que solo la ORQUESTACIÓN necesita — ver la regla de dónde va cada puerto, más abajo
├── infrastructure/
│   ├── database/
│   │   ├── orm-entities/      # @Entity({ schema, name }), columnas explícitas
│   │   ├── mappers/           # fromPersistence/toPersistence, separados de la entidad ORM y del repositorio
│   │   └── repositories/      # implementa el port; usa los mappers de arriba
│   ├── messaging/              # listeners @OnEvent que traducen el evento a un caso de uso
│   └── integrations/           # clientes hacia servicios externos (ej. InnlabCoreHttpClient)
└── presentation/
    └── controllers/            # traduce HTTP↔comando, sin lógica de negocio — los DTO de application/ sirven de forma de respuesta; presentation/view-models/ solo si una pantalla combina la salida de más de un caso de uso
```

La ruta base es `apps/api/src/modules/<contexto>/` para los cinco módulos Core/Supporting (`initiative`, `diagnosis`, `routing`, `roadmap`, `reporting`); para los dos módulos `shared/` de la tabla 1.1 la ruta base es `apps/api/src/shared/<contexto>/` (`shared/irl-taxonomy/`, `shared/identity/`) — misma estructura interna de cuatro capas, distinta carpeta raíz, para que la categoría DDD (genérico/anticorrupción vs. Core/Supporting) sea visible en el árbol de archivos sin tener que leer este documento.

**Reglas de la estructura, con su criterio, no solo el nombre de la carpeta:**

- **Creación bajo demanda.** Ninguna de las subcarpetas del árbol de arriba es andamiaje obligatorio. Un módulo de solo catálogo (como `shared/irl-taxonomy/`) no necesita `domain/events/`, `domain/exceptions/` ni `domain/services/` — se crean cuando hay contenido real que ponerles, nunca como carpetas vacías a la espera de que algún día se use algo ahí. Una carpeta vacía en el árbol no comunica "todavía no hace falta"; comunica falsamente que ya hay algo que mirar.
- **`domain/repositories/` vs. `application/ports/` — el mismo tipo de contrato (un puerto por Symbol), dos lugares posibles según quién lo necesita.** Si el propio dominio necesita el contrato para expresar una invariante suya (por ejemplo, un agregado que debe verificar unicidad contra el repositorio antes de completarse), el puerto vive en `domain/repositories/`. Si el contrato solo lo necesita la orquestación — leer datos para decidir qué caso de uso ejecutar, persistir el resultado al final de un flujo — vive en `application/ports/`. La pregunta que decide no es "qué tan técnico suena el contrato", es "¿el dominio se rompe sin este contrato, o solo la orquestación pierde un dato que necesita?".
- **Comportamiento en una entidad vs. `domain/services/` — no es una elección estética.** Un comportamiento va en un método de la entidad si pertenece naturalmente a una sola (ej. `Diagnosis.transitionTo()` sobre el propio agregado). Pasa a un servicio de dominio solo cuando cruza varias entidades del mismo agregado o módulo (ej. `ImbalanceEvaluatorService`, que compara niveles de más de una dimensión). Un servicio de dominio **no es el destino por defecto** de lógica nueva — tratarlo como tal deriva en entidades anémicas, que es exactamente la categoría 1 del backlog de deuda técnica: entidades que no protegen ningún invariante propio porque toda la lógica vive afuera, en servicios que terminan siendo la aplicación disfrazada de dominio.

**Regla no negociable de capas** (equivalente a la ya declarada en `apps/api/eslint.config.mjs` y en `CLAUDE.md`, con la nomenclatura de esta sección — el ESLint de capas deberá actualizarse para que sus rutas coincidan, ver nota de migración al final de esta sección):

```
presentation → application → domain ← infrastructure
```

`presentation/` solo importa de `application/` — nunca directamente de `domain/` ni de `infrastructure/`; es el propio `eslint-plugin-boundaries` el que debe impedirlo, no solo la disciplina de revisión de código. `domain/` y `application/` no importan `@nestjs/*`, `typeorm`, `axios`, ni ningún otro paquete de IO. Si una clase de `application/` necesita el ciclo de vida de Nest (inyección de dependencias), el binding se hace con `useFactory` en el `.module.ts`, no anotando la clase con `@Injectable()` — el mismo patrón que ya usa `GetQuestionnaireStructureQuery` (hoy en `irl-catalog`, pasa a `shared/irl-taxonomy/`) y `ResolveUserContextUseCase` (hoy en `identity`, pasa a `shared/identity/`). Ese es el ejemplo a replicar, no la excepción a tolerar.

#### Adopción de `Result<T, E>`

- **Vive en `shared/kernel/result.ts`** — el tipo `Result<T, E>` genérico que ya existe en el código (`shared-kernel/domain/result.ts`), sin uso hasta esta fase (`backlog-deuda-tecnica.md` 3.1), pasa a tener un alcance de adopción explícito en vez de quedar indefinidamente como código muerto.
- **Alcance — no es un cambio uniforme a todo el dominio.** Las validaciones de invariante en constructores de entidades/VOs siguen lanzando `DomainError` directamente, sin envolver — un `static create()` que recibe un valor inválido sigue lanzando, no devolviendo un `Result.err(...)`. Lo que cambia es la salida de los **casos de uso** (`application/use-cases/`): retornan `Result<T, DomainError>` cuando el fallo es una salida de negocio legítima y anticipable (no encontrado, conflicto de estado, regla incumplida) — el llamador debe poder manejar ese resultado sin un `try/catch`, porque no es una condición excepcional, es una de las salidas normales del caso de uso. Dejan propagar una excepción sin envolver cuando el fallo es de infraestructura o un bug (una conexión a base de datos caída, un `null` donde el tipo garantiza que no debería llegar) — esos no son salidas de negocio, son fallos del sistema, y `Result` no es el vehículo correcto para ellos.
- **`domain/exceptions/` reduce su alcance.** Antes de esta decisión, el filtro global de excepciones (`DomainExceptionFilter`) mapeaba a HTTP cualquier excepción que escapara de un caso de uso, así que `domain/exceptions/` funcionaba en la práctica como "todo lo que puede salir mal en cualquier capa". Con `Result<T, DomainError>` como salida explícita de los casos de uso, `domain/exceptions/` vuelve a su alcance real: las excepciones que se lanzan **dentro del dominio mismo** (constructores de entidades/VOs, invariantes de agregado), no lo que el caso de uso decide envolver en un `Result` antes de devolverlo.
- **`presentation/` desempaqueta el `Result` explícitamente.** El controlador (o un interceptor compartido, si el mapeo se repite igual en varios controladores) desempaqueta cada `Result` y mapea cada subtipo de `DomainError` al código HTTP correspondiente de forma explícita (404, 409, 422, según el caso) — no hay un mapeo genérico automático desde un `Result.err`. `DomainExceptionFilter` queda reducido a capturar lo verdaderamente no manejado (mapeo a 500 — un bug real, no una salida de negocio prevista) y cualquier `DomainError` que escape sin envolver por descuido de un caso de uso que debería haberlo hecho.
- **Implementación (Fase 4).** Se adoptó un helper compartido en lugar de que cada controlador mapee a mano: `unwrapResult()` (`shared/kernel/application/unwrap-result.ts`) devuelve el valor de un `Result.ok` y, ante un `Result.err`, relanza su `DomainError` para que `DomainExceptionFilter` lo mapee al mismo código HTTP y al mismo cuerpo RFC 7807 que antes. El formato de respuesta no cambia. Se convirtieron a `Result` los casos de uso cuyo fallo es un resultado de negocio previsible; `ComputeMaturityProfileUseCase` (fallo de clase 500), el chequeo `RoadmapCalculationError` y las consultas sin error posible se dejaron sin convertir, con el motivo en su docblock.
- **Esto no es un refactor mecánico.** Cambia el comportamiento observable de cada caso de uso existente: hoy, un caso de uso que hoy lanza una excepción de negocio pasa a devolver un `Result.err(...)`, y su(s) llamador(es) — el controlador, y cualquier otro caso de uso que lo invoque internamente — deben adaptarse a leer ese resultado en vez de depender de un `catch`. La fase que ejecute esta adopción debe tratarla como el cambio de comportamiento que es: revisión de diseño, no un `sed` de identificadores.

**Versionado de la API: vive a nivel global, no por módulo — confirmado contra el código real.** `main.ts` fija el prefijo `api/v1` una sola vez con `app.setGlobalPrefix('api/v1')`; `apps/api/src/api.module.ts` (`ApiModule`) es el único punto de composición que monta los controladores de todos los módulos bajo ese prefijo, e `app.module.ts` importa ese módulo compuesto. Ningún módulo individual declara su propia versión ni su propio prefijo. Esto no cambia con la reestructuración de esta sección: `presentation/controllers/` de cada módulo sigue exponiéndose a través del mismo punto de composición global, que se renombró en la Fase 4 (`ApiV1Module` → `ApiModule`, de `interfaces/http/api-v1.module.ts` a `src/api.module.ts`): el sistema no versiona su API, solo fija un prefijo global, y el nombre anterior sugería un versionado que no existe. No forma parte de ningún `<contexto>/`.

**Nota de migración — ejecutada en la Fase 4 (2026-09-19):** las siete oleadas se completaron y el código ya usa `domain/`, `application/`, `infrastructure/`, `presentation/`; la nota se conserva como registro de por qué el renombrado no fue un pase mecánico. Texto original: el código actual, tras la Fase 3 de este refactor (normalización mecánica de idioma y capas, ya ejecutada), organiza estas capas como `domain/`, `usecase/` (casos de uso) y `application/http/` (controladores) — nomenclatura intermedia, alineada en su momento con una referencia externa (`andrea-acampora.github.io/nestjs-ddd-devops`, sección 2.2), que esta sección ahora reemplaza por `domain/`, `application/` (casos de uso) e `presentation/` (controladores). El renombrado de capas que esta nueva estructura exige (`usecase/` → `application/`, `application/http/` → `presentation/`) **no se ejecuta como pase mecánico aparte**: se pliega dentro de la fase estructural que de todas formas mueve estos archivos hacia el árbol de contextos de la sección 1 — fusionar módulos completos (`diagnostic`+`questionnaire`+`maturity-profile`+`consent` → `diagnosis/`), separar uno en dos (`irl-catalog` → `shared/irl-taxonomy/` + la parte de `statement` que se va a `diagnosis/`), promover uno (`initiative`), replegar uno dentro de otro (`service-catalog` dentro de `routing/`, ver 1.1), y retirar código de dos (`routing/`/`roadmap/` pierden el esquema de versionado, backlog 5.6) es, en todos los casos, trabajo de diseño y migración que exige revisión y no se puede verificar solo con que el código compile — el renombrado de capas viaja en el mismo movimiento porque separarlo de nuevo en un pase mecánico previo no evitaría una segunda revisión de diseño, solo la duplicaría.

### 2.1 Ejemplo aplicado a un módulo existente: `diagnosis`

Este ejemplo ya refleja la política de idioma resuelta en la sección 3 (inglés en todo, sin excepción para dominio) y la fusión de `diagnostic`+`questionnaire`+`maturity-profile` en un solo módulo (sección 1.1) — por eso los nombres difieren de los que existen hoy en el código (`Diagnostico`, `diagnostico.orm-entity.ts`, y los tres módulos separados), que quedan como objetivo de migración, no como referencia a imitar tal cual. `consent` se muestra absorbido aquí porque es la resolución vigente, pero su frontera final depende de la pregunta abierta en 1.3 — `initiative`, en cambio, **no** aparece en este ejemplo: se promovió a su propio módulo y no debe fundirse aquí:

```
apps/api/src/modules/diagnosis/
├── diagnosis.module.ts
├── domain/
│   ├── entities/
│   │   ├── diagnosis.aggregate.ts          # Diagnosis.start(userId, now); transitionTo(); canTransitionTo()
│   │   ├── consent.entity.ts               # sub-concepto: aceptación de política de privacidad, paso previo — ver pregunta abierta 1.3
│   │   ├── answer-sheet.aggregate.ts        # las 48 respuestas — hoy vive en questionnaire/
│   │   └── maturity-profile.aggregate.ts    # el perfil calculado — hoy vive en maturity-profile/
│   ├── services/
│   │   ├── irl-calculator.service.ts        # hoy en maturity-profile/domain/services/
│   │   └── imbalance-evaluator.service.ts   # hoy en maturity-profile/domain/services/
│   ├── diagnosis-state.vo.ts                # estados + tabla de adyacencia válida (incluye el paso de consent)
│   └── repositories/
│       ├── diagnosis.repository.port.ts     # DIAGNOSIS_REPOSITORY symbol; findById, findAllByUserId, save
│       └── answer-sheet.repository.port.ts  # hoy en questionnaire/domain/ports/
├── application/
│   └── use-cases/
│       ├── record-consent.use-case.ts                 # [nuevo] registra la aceptación de la política de privacidad
│       ├── submit-questionnaire.use-case.ts            # hoy en questionnaire/application/use-cases/
│       ├── compute-maturity-profile.use-case.ts        # hoy en maturity-profile/application/use-cases/
│       ├── finalize-initial-diagnosis.use-case.ts      # orquesta submit + compute; hoy es finalize-initial-diagnostic.use-case.ts
│       ├── start-diagnosis.use-case.ts                 # [pendiente — ver backlog 11.4] Diagnosis.start() ya existe como Diagnostico.start(), falta el caso de uso
│       └── list-my-diagnoses.use-case.ts               # [pendiente — ver backlog 11.3] usa findAllByUserId, ya declarado en el puerto
├── infrastructure/
│   └── database/
│       ├── orm-entities/
│       │   ├── diagnosis.orm-entity.ts
│       │   ├── answer.orm-entity.ts           # hoy en questionnaire/infrastructure/persistence/
│       │   └── dimension-result.orm-entity.ts  # hoy resultado-dimension.orm-entity.ts en maturity-profile/
│       └── repositories/
│           └── typeorm-diagnosis.repository.ts
└── presentation/
    └── controllers/
        ├── diagnosis.controller.ts       # POST /diagnoses, GET /diagnoses, GET /diagnoses/:id, POST /diagnoses/:id/finalize-initial
        └── questionnaire.controller.ts    # hoy questionnaire.controller.ts en su propio módulo
```

Este ejemplo usa deliberadamente un conjunto de módulos que **ya existen pero están incompletos e ilustra tanto la fusión estructural como el trabajo mecánico de idioma** (documentados como huecos en `backlog-deuda-tecnica.md` 11.3/11.4) para mostrar que completar/fusionar módulos existentes sigue exactamente el mismo patrón de cuatro capas que crear uno nuevo — no hace falta una plantilla distinta para "terminar", "fusionar" o "empezar" un contexto.

### 2.2 Patrones de dominio complementarios

Esta sección incorpora prácticas de un catálogo externo de convenciones DDD para NestJS (`andrea-acampora.github.io/nestjs-ddd-devops`), adaptadas al stack y a las decisiones ya tomadas en este proyecto (Fastify, TypeORM, comunicación por puerto/Symbol, un caso de uso por clase). No se adopta el catálogo completo — al final de esta sección se listan explícitamente las partes que se evaluaron y se descartaron, y por qué, para que no se reintroduzcan sin una decisión consciente.

**Value objects: base compartida.** Todos los VOs del dominio (`LikertValue`, `IrlLevel`, `DimensionCode`, `Uuid` en `shared-kernel`, y los que se agreguen en módulos nuevos) deben construirse sobre una clase base común en `shared-kernel/domain/value-objects/value-object.base.ts`, en vez de reimplementar la igualdad por atributos en cada VO como ocurre hoy:

```ts
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(other?: ValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
```

Cada VO concreto conserva su propio `static create()` con las validaciones del invariante (esa parte ya es correcta en el código actual); lo que cambia es que la igualdad por valor deja de reimplementarse módulo por módulo.

**Servicios de dominio vs. casos de uso — distinción explícita.** El proyecto ya separa `domain/services/` de `application/use-cases/<caso-de-uso>.use-case.ts`, pero conviene fijar la forma de cada uno para que un desarrollador nuevo no dude dónde va una pieza de lógica nueva:

- *Servicio de dominio* (`domain/services/*.service.ts`): opera exclusivamente sobre entidades y value objects del propio módulo, sin IO, sin conocer DTOs ni la forma de la petición HTTP. Encapsula una regla que no pertenece naturalmente a una sola entidad (ej. `IrlCalculatorService`, `ImbalanceEvaluatorService`, `AffinityScorerService`).
- *Caso de uso* (`application/use-cases/<x>.use-case.ts`): orquesta uno o más servicios/repositorios de dominio para cumplir una operación completa iniciada desde el exterior, y es el único punto que conoce los puertos por Symbol. No contiene reglas de negocio propias — si detecta que está calculando algo en vez de coordinar, esa lógica pertenece a un servicio de dominio, no al caso de uso.

**Repositorios: puertos específicos del agregado, no una interfaz genérica.** Se evaluó adoptar una interfaz `Repository<T>` genérica (`findById`, `findAll`, `save`, `update`, `delete`) común a todos los módulos, y se descarta deliberadamente: una interfaz CRUD genérica termina exponiendo operaciones que no tienen sentido para el agregado (por ejemplo, `AnswerSheet` no se "actualiza" parcialmente, se reemplaza por completo dentro de una transacción) u obliga a inflar el puerto con métodos irrelevantes. Se mantiene la convención ya vigente: un puerto por agregado, con métodos nombrados según el caso de uso real (`findByDiagnosticId`, `findAllByUserId`), como ya hacen `AnswerSheetRepositoryPort` y `DiagnosticRepositoryPort`.

**Comunicación entre módulos: dos mecanismos, no uno solo.** El mecanismo por defecto sigue siendo la orquestación síncrona (llamar a un puerto de otro módulo dentro de un caso de uso), para flujos que el usuario espera ver completarse en la misma petición (por ejemplo, cuestionario → cálculo de perfil, dentro de `diagnosis/`). Para flujos donde un módulo debe reaccionar a que otro terminó, sin que el que dispara el evento necesite saber quién reacciona, se adopta un segundo mecanismo — eventos de dominio, ya decididos y especificados en la sección 1.1 (mecanismo, regla de ubicación y los cuatro eventos concretos de esta fase) — en vez de seguir creciendo la lista de dependencias síncronas del orquestador. Esta subsección solo documenta el patrón de código de la clase base:

```ts
// shared/kernel/events/domain-event.base.ts
export abstract class DomainEvent<T> {
  abstract readonly name: string;
  readonly occurredAt: Date = new Date();
  constructor(public readonly payload: T) {}
}
```

Publicados vía `@nestjs/event-emitter` desde la capa de aplicación (nunca desde `domain/`, que sigue sin conocer el framework) después de que la transacción que originó el evento se confirmó — ver 1.1 para el mecanismo completo y los cinco eventos de esta fase (`DeepAnalysisRequestedEvent`, `ConsentRecordedEvent`, `InitiativeRegisteredEvent`, `PortfolioRecommendationCalculatedEvent`, `ScalingRoadmapCalculatedEvent`) y para el diseño de `reporting/` como consumidor futuro de los dos últimos.

**Qué se evaluó de la fuente externa y se descarta explícitamente, con motivo:**

| Práctica del catálogo externo | Por qué no se adopta aquí |
|---|---|
| MikroORM como ORM de referencia | El proyecto ya tiene una decisión tomada y en uso: TypeORM. Cambiar de ORM no es una convención, es una migración de infraestructura sin justificación planteada. |
| CQRS con `@nestjs/cqrs` (bus de comandos/queries) | El patrón actual (una clase de caso de uso, un método `execute()`, inyectado directamente en el controlador) ya cumple la misma separación de intención sin la complejidad adicional de un bus y handlers registrados por reflexión. Reevaluar solo si aparece una necesidad real de proyecciones de lectura separadas del modelo de escritura — no hay evidencia de esa necesidad hoy. |
| GraphQL code-first | El proyecto es REST con Swagger; no hay ningún indicio de que GraphQL esté en el roadmap. |
| Effect-TS y programación funcional con `Option`/`Either` | Cambiaría el estilo de todo el dominio existente sin que haya una razón concreta para el cambio. El proyecto ya adopta `Result<T, E>` para la salida de casos de uso (ver la subsección dedicada más abajo) usando el tipo propio que ya vive en `shared-kernel/domain/result.ts` — hasta esta fase sin uso en el código (`backlog-deuda-tecnica.md` 3.1), ahora con un alcance de adopción explícito. Introducir Effect-TS encima de esa decisión sería adoptar dos vocabularios distintos para el mismo problema (`Result<T,E>` propio vs. `Either` de Effect-TS) en vez de uno solo. |
| Rate limiting, versionado de API por URI, caché con `cache-manager`, CI/CD y flujo de ramas del catálogo externo | Son decisiones de infraestructura/DevOps independientes de las convenciones DDD que pidió este documento; el proyecto ya tiene sus propias convenciones de ramas y commits en `docs/conventions/`. |

### 2.3 Frontend: estructura de feature

```
apps/web/src/features/<nombre>/
├── api/          # funciones que llaman a shared/api/http y parsean con Zod de @innlab/contracts
├── components/   # componentes privados de la feature
├── hooks/        # hooks privados (useQuery/useMutation envueltos)
├── store/        # solo si el estado cruza ≥3 componentes (Zustand) — nunca para estado de servidor
├── utils/        # helpers puros, sin acceso a red
└── index.ts      # barrel — superficie pública; todo lo no exportado aquí es privado a la feature
```

Regla que hoy se respeta a nivel de ESLint pero no siempre a nivel de disciplina de barrel (ver `backlog-deuda-tecnica.md` 2.4): el resto de la aplicación (`pages/`, otras features) solo puede importar lo que `index.ts` re-exporta explícitamente. Importar una ruta interna de otra feature saltándose el barrel (`@features/x/hooks/algo` en vez de `@features/x`) es una violación aunque el linter de `boundaries` no la capture — debe tratarse como tal en revisión de código.

---

## 3. Política de idioma

**Decisión de producto — reemplaza la política bilingüe descrita hoy en `CLAUDE.md`:**

Todo el código, nombres y documentación deben estar en inglés, sin excepción de capa ni de tipo de identificador. Esto incluye explícitamente:

- Entidades y agregados de dominio (`Diagnostic`, no `Diagnostico`; `Recommendation`, no `Recomendacion`; `CalibrationScale`, no `EscalaCalibracion`).
- Tablas y columnas de base de datos (`diagnostic`, no `diagnostico`; `statement`, no `afirmacion`; `dimension_result`, no `resultado_dimension`).
- Segmentos de rutas REST (`/diagnostics`, no `/diagnosticos`; `/catalog/questionnaire`, no `/catalogo/cuestionario`).
- Construcciones de infraestructura y framework (`Repository`, `UseCase`, `Controller`, `Port`, `Adapter`) — sin cambio, ya estaban en inglés.
- Comentarios y docstrings en **todas** las capas, sin excepción — ya era la regla y sigue siéndolo; el hallazgo 9.1 del backlog (comentarios en español en `portfolio-routing`/`scaling-roadmap`) sigue siendo deuda bajo esta política, no una variante aceptable.
- Nombres de caso de uso: quedan en inglés de forma consistente con el resto (`GenerateRecommendationUseCase`), sin la disonancia previa entre capas — con esta política ya no hay dos lecturas posibles, porque el dominio también pasa a inglés.

**Esta decisión reemplaza, no complementa, la regla de "español para dominio / inglés para infraestructura" que hoy describe la raíz `CLAUDE.md`.** Ese archivo (y `CLAUDE.api.md`, `CLAUDE.web.md`, y los ejemplos de `docs/conventions/code-style.md`) deberán actualizarse para reflejar este cambio en una fase posterior — está fuera del alcance de esta fase, que es solo de análisis y no modifica archivos existentes del repositorio.

**Alcance de la migración:** bajo esta política, prácticamente todo el vocabulario de dominio actual en español (agregados, VOs, tablas, columnas, rutas REST) queda identificado como objetivo de renombrado, en el código tal como existe hoy repartido entre `irl-catalog`, `questionnaire`, `maturity-profile`, `diagnostic`, `portfolio-routing`, `scaling-roadmap` — que es el mismo código que, tras la reestructuración de la sección 1, pasa a vivir en `shared/irl-taxonomy/`, `diagnosis/`, `routing/` y `roadmap/`. No se enumera aquí archivo por archivo — ese inventario, y la decisión de en qué fase del refactor se aborda, corresponde al backlog de deuda técnica (ver su nota añadida en la sección 9 y en la priorización).

**Excepción — strings visibles al usuario final:** el texto que ve el usuario final (copy de la interfaz, mensajes de error mostrados en pantalla, textos del cuestionario, nombres de dimensión mostrados al usuario) sigue rigiéndose por el idioma del producto (español, dado el público de INNLAB/Icesi) y **no** está sujeto a esta política de código — es una decisión de producto, no de ingeniería, y no fue parte de lo decidido aquí. La política de esta sección aplica exclusivamente a identificadores, nombres de archivo/tabla/columna/ruta y comentarios; nunca a contenido i18n ni a los valores de datos (`name_es`/`description` una vez traducidos de sus columnas actuales) que existen correctamente en español como datos de catálogo, no como código.

---

## 4. Estándares de documentación

### 4.1 Principio rector

Si algo puede derivarse del código con una herramienta automática (lista de endpoints, estructura de módulos, esquema de base de datos, árbol de componentes), **no se documenta a mano en un archivo aparte**. Duplicar esa información en Markdown es exactamente el mecanismo que produjo los ~16 hallazgos de documentación desactualizada de `backlog-deuda-tecnica.md` sección 6 — cada `MODULES.md` que describía módulos con detalle manual quedó obsoleto en cuanto el código cambió, porque nada obligaba a mantenerlo sincronizado.

### 4.2 Qué se documenta, dónde, y con qué nivel de detalle

| Qué | Dónde | Nivel de detalle | Por qué así |
|---|---|---|---|
| Lista de endpoints, esquemas de request/response | Swagger/OpenAPI generado desde los DTOs y decoradores del código (`@nestjs/swagger`, ya instalado y montado en `/api/docs`) | Automático, no manual | Un `MODULES.md` con una tabla de endpoints escrita a mano se desincroniza en el primer PR que cambie una ruta — ya ocurrió (ver hallazgos 6.x). Swagger no puede desincronizarse porque se genera del propio código. |
| Estructura de módulos y capas | Este documento (regla general, sección 2) + el propio árbol de carpetas del repositorio | Regla general una sola vez; no una tabla por módulo que liste clases una por una | Una lista manual de "estas son las clases del módulo X" (lo que hacía `apps/api/docs/MODULES.md`) es la forma más rápida de generar el hallazgo 6.1/6.2/6.3 de nuevo. La regla de la sección 2 de este documento, aplicada de forma consistente, hace que "cómo está organizado un módulo" sea predecible sin necesitar un inventario por módulo. |
| Por qué se tomó una decisión de diseño no obvia | Un ADR (`docs/architecture/decisions/NNNN-titulo.md`, formato corto: contexto, decisión, consecuencias) | Uno por decisión, inmutable una vez aceptado (no se edita para reflejar cambios futuros — se supera con un ADR nuevo que lo referencia) | El "por qué" no se puede derivar del código; por eso sí vale la pena escribirlo, pero solo una vez y sin intención de mantenerlo sincronizado con cambios posteriores — un ADR superado sigue siendo válido como registro histórico. Esto también resuelve la ausencia hoy de `docs/architecture/` que varios documentos citan sin que exista. |
| Invariantes de dominio no obvios (por qué una regla es así) | Un comentario corto junto al invariante en el propio código (`domain/`), no un documento aparte | Una o dos líneas, en inglés, junto a la validación | Es la única documentación que es físicamente imposible de desincronizar del código que describe, porque vive en el mismo archivo. Ejemplo correcto ya presente: los comentarios de `predicate-compiler.service.ts` explicando por qué ciertos campos son de colección. |
| Convenciones de proyecto (idioma, nombres, capas) | `CLAUDE.md` y los `docs/conventions/*.md` ya existentes — un solo lugar por tipo de convención | Regla + un ejemplo correcto + un ejemplo incorrecto, como ya hace `CLAUDE.md` | Múltiples copias de la misma convención (por ejemplo, en `MODULES.md` y en `CLAUDE.md` a la vez) son las que hoy se contradicen entre sí (ver hallazgo B-3/B-5 de la auditoría previa, y 6.x de esta). |
| README de módulo (`apps/api/src/modules/<x>/README.md`, o `apps/api/src/shared/<x>/README.md` para los dos módulos `shared/`) | **Obligatorio para los siete módulos de la tabla 1.1**, no opcional — ver la plantilla fija en 4.4. Esto reemplaza la regla anterior de este documento ("solo si el módulo tiene algo no obvio"). | Sigue exactamente la plantilla de 4.4, sección por sección. Nunca prosa libre ni inventario de clases fuera de esas secciones. | La versión anterior de esta regla prohibía mencionar el nivel de avance porque el README de cada módulo lo hacía con frases sueltas ("Stage 1", "empty module") que nadie actualizaba (hallazgo 6.5). La plantilla de 4.4 no elimina esa información — la estructura en una sección fija (`## Nivel de completitud`) que forma parte de la definición de "hecho" de cualquier cambio al módulo (ver 4.5), en vez de ser una frase suelta en la introducción que nadie recuerda revisar. |

### 4.3 Regla operativa para que esto no se repita

Cualquier documento que describa "qué existe" (lista de módulos, lista de endpoints, lista de clases) debe poder generarse o verificarse automáticamente, o no debe escribirse. Cualquier documento que describa "por qué existe" o "qué invariante protege" puede y debe escribirse a mano, porque eso no lo puede generar una herramienta — y precisamente porque es la única categoría que vale la pena mantener, debe mantenerse pequeña y cerca del código que explica.

### 4.4 Plantilla obligatoria del README de módulo

Cada uno de los siete módulos de la tabla 1.1 tiene un `README.md` en su raíz con exactamente estas secciones, en este orden. Ninguna sección es prosa libre — cada una tiene un propósito específico y una razón para no fusionarse con otra:

```markdown
# <nombre del módulo>

## Alcance
Una o dos frases: qué responsabilidad de negocio cubre este módulo y,
explícitamente, qué NO cubre (el límite con los módulos vecinos —
remite a la tabla 1.1 de `convenciones-objetivo.md`, no la repite).

## Reglas que deben respetarse
Los invariantes de negocio y las restricciones de arquitectura que un
cambio en este módulo no puede romper sin que sea una decisión
consciente (ej.: "el motor de recomendación no lee versiones históricas
— routing/ perdió esa capacidad deliberadamente, ver backlog 5.6").
No repite las reglas genéricas de este documento (capas, idioma) —
solo las específicas de este módulo.

## Nivel de completitud
Qué parte del alcance declarado arriba está implementada hoy y qué
falta, en referencia a las historias de usuario o hallazgos del
backlog que lo explican (nunca una frase suelta sin esa referencia,
tipo "Stage 1"). Se actualiza como parte de la definición de "hecho"
de cualquier PR que toque este módulo — ver 4.5.

## Responsabilidad (lenguaje ubicuo)
Qué capacidad de negocio encapsula este módulo, dicho en los mismos
términos que usaría alguien de INNLAB — no en términos técnicos.

## Conceptos de dominio
Los agregados, entidades y value objects que este módulo posee y de
los que es la única fuente de verdad.

## Qué expone hacia afuera
Los puertos, eventos de dominio y endpoints HTTP que otros módulos o
el frontend pueden consumir. Todo lo que no está en esta lista es
interno y no debe importarse desde fuera del módulo.

## De qué depende
Los puertos de otros módulos que este módulo consume (nunca
entidades ORM ni tipos internos de otro módulo — ver la nota técnica
pendiente en 1.3 sobre `DimensionOrm`, que es justo la violación que
esta sección debe hacer visible si existe).

## Datos que posee
Las tablas/columnas de base de datos de las que este módulo es dueño
(quién puede escribirlas) — no basta con "de qué schema lee".

## Cobertura de pruebas
Qué hay hoy por nivel (unitaria/integración/e2e), siguiendo la
clasificación de la sección 5 de este documento, y qué falta
explícitamente — no una afirmación genérica de "está probado".
```

### 4.5 Mantenimiento de `CLAUDE.md` y vigencia de la documentación

Dos reglas que cierran el ciclo de vida de la documentación descrita en esta sección, para que no vuelva a desactualizarse como ya ocurrió (backlog, sección 6):

- **`CLAUDE.md` (raíz) y los `CLAUDE.<app>.md` de cada paquete se actualizan al final de cada fase de refactor**, no solo al principio del proyecto. Cuando una fase de refactor cambia el mapa de módulos, la política de idioma, la estructura de capas o cualquier otra convención descrita en este documento, `CLAUDE.md` debe reflejar el estado resultante — nunca el estado anterior a esa fase. Además, `CLAUDE.md` debe indicar explícitamente, en un lugar visible cerca del principio, qué documentos hay que leer antes de implementar un cambio nuevo: como mínimo, este documento (`convenciones-objetivo.md`) para la arquitectura objetivo, y el `README.md` del módulo específico que se va a tocar (sección 4.4) para su alcance y reglas puntuales.
- **Ninguna fase de refactor se considera terminada si dejó documentación desactualizada.** Esto aplica en particular a los siete READMEs de módulo (4.4) y a `CLAUDE.md` — un cambio que mueve código de un módulo a otro, o que retira una capacidad (como el versionado de `routing/`/`roadmap/`, backlog 5.6), actualiza en el mismo cambio el README del módulo afectado y, si corresponde, `CLAUDE.md`. Es la misma lógica que ya aplica esta sección a Swagger/OpenAPI (4.2): documentación que no se actualiza junto con el código que describe es la causa raíz de los ~16 hallazgos de documentación desactualizada del backlog — no un problema distinto que necesite una regla nueva, es la misma regla aplicada a estos dos artefactos específicos.

---

## 5. Estándares de pruebas

### 5.1 Qué tipo de prueba corresponde a qué tipo de lógica

| Tipo de lógica | Tipo de prueba | Dónde vive | Ejemplo ya correcto en el código |
|---|---|---|---|
| Reglas de dominio puras (cálculos, invariantes, VOs, agregados, servicios de dominio) | **Unitaria**, síncrona, sin mocks más allá de stubs de puertos | `apps/api/test/unit/modules/<contexto>/domain/` | `irl-calculator.service.spec.ts` (incluye pruebas basadas en propiedades con `fast-check`); `dependency-graph.vo.spec.ts` |
| Casos de uso (orquestación de puertos) | **Unitaria**, con stubs de los puertos inyectados — nunca contra un repositorio real | `apps/api/test/unit/modules/<contexto>/application/use-cases/` | Ausente hoy para los casos de uso orquestadores de `portfolio-routing`/`scaling-roadmap` (ver backlog 12.1) — este es el hueco a cerrar, no un patrón a inventar: el patrón ya existe en `finalize-initial-diagnostic.use-case.spec.ts`. |
| Adaptadores de persistencia (repositorios TypeORM) | **Integración**, contra una base de datos real (Testcontainers) | `apps/api/test/integration/database/` | `recomendacion-repository.spec.ts`, `roadmap-graph-seed.spec.ts` — extender este patrón a `typeorm-answer-sheet.repository.ts` y `typeorm-maturity-profile.repository.ts`, hoy sin cobertura (backlog 12.1). |
| Flujos HTTP completos de un endpoint | **E2E**, `supertest` contra la aplicación real, con JWKS/Cognito simulado (ver el helper ya existente `test/e2e/support/authenticated-app.ts`) | `apps/api/test/e2e/modules/<contexto>/` | `generate-recommendation.e2e-spec.ts`, `scaling-roadmap.e2e-spec.ts`, `cognito-jwt-guard.e2e-spec.ts` |
| Componentes de React con lógica de presentación | **Component test**, Testing Library, consultas por rol/label | `apps/web/src/features/<x>/components/__tests__/` | `LikertScale.test.tsx`, `LayerTracePanel.test.tsx` |
| Hooks de React (`useQuery`/`useMutation` envueltos) | **Component/integración de frontend**, con MSW interceptando red (nunca mockeando `axios` directamente) | `apps/web/src/features/<x>/hooks/__tests__/` | `useAnswerForStatement.test.tsx`, `useSsoExchange.test.tsx` |
| Flujos completos de usuario en el navegador | **E2E de frontend**, Playwright, un spec por historia de usuario (HU-xx), con el flujo de sesión simulado a nivel de fixture, sin Cognito real | `apps/web/tests/e2e/` | **Ninguno hoy** — la carpeta no existe pese a que `playwright.config.ts` la declara (backlog 12.1); es el hueco más visible de todo el inventario de pruebas. |

### 5.2 Criterio mínimo de cobertura de aquí en adelante

No se propone un porcentaje global — el proyecto ya usa umbrales por carpeta en `apps/api/jest.config.js` (95% para `modules/maturity-profile/domain/`, 90% para `modules/questionnaire/domain/`) y ese es el patrón correcto a extender, no a reemplazar por un número único:

- **Todo `domain/` nuevo** (servicios de dominio, agregados, VOs) entra a `apps/api/jest.config.js` con un umbral explícito por carpeta, igual que los dos módulos que ya lo tienen. Un módulo de dominio sin umbral declarado es, en la práctica, un módulo sin garantía de cobertura — extender el umbral debe ser parte de la definición de "terminado" de cualquier módulo nuevo, no un paso opcional posterior.
- **Todo caso de uso de `application/use-cases/`** que orqueste dos o más puertos debe tener al menos una prueba unitaria con stubs, además de la cobertura indirecta que le dé un e2e. La ausencia de esto en `portfolio-routing`/`scaling-roadmap` (backlog 12.1) no debe repetirse: un e2e prueba que el flujo funciona en conjunto, pero no aísla qué pieza falló si se rompe, ni cubre las ramas de error que son costosas de forzar por HTTP (timeouts, puertos que lanzan, condiciones de carrera).
- **Todo repositorio TypeORM** que implemente un puerto debe tener al menos una prueba de integración con Testcontainers que verifique el mapeo `toDomain`/`toPersistence` en ambas direcciones y cualquier upsert/transacción que declare. El bug ya documentado de `es_cuello_botella` (columna omitida del `.orUpdate`, backlog categoría 8) es exactamente el tipo de error que una prueba de integración habría atrapado y una prueba unitaria con mocks no.
- **Todo endpoint HTTP nuevo** debe tener al menos un e2e feliz y un e2e de cada código de error de dominio que pueda producir (404/409/422 según el mapeo de `DomainExceptionFilter`) — no solo el camino feliz.
- **Frontend:** ningún componente que renderice datos del servidor (no solo estado local) se considera terminado sin al menos una prueba de component test con MSW simulando la respuesta real del contrato Zod correspondiente. El hueco actual más notorio (`RecommendationSummary.tsx`, backlog 12.2) es precisamente un componente de datos de servidor sin ninguna prueba.
- **Un Playwright spec por historia de usuario completada** (regla ya declarada en `CLAUDE.web.md`, nunca cumplida hasta ahora) — al cerrar cada historia de usuario nueva, el spec correspondiente es parte de la definición de "hecho", no una tarea de limpieza posterior. La carpeta `apps/web/tests/e2e/` debe crearse con el primer spec real, no quedar como una declaración de configuración sin contenido.

---

## 6. Política de migraciones de base de datos

**Al finalizar una fase de refactor que reestructura el esquema (como la de la sección 1), debe existir un único script de migración**, no la cadena incremental de migraciones que produjo ese estado. Esto es una excepción deliberada a la práctica normal de TypeORM (migraciones inmutables, aditivas, nunca editadas una vez aplicadas) y aplica solo bajo esta condición explícita:

- **Cuándo aplica:** el proyecto todavía no tiene un entorno desplegado con datos reales que dependa del historial incremental de migraciones — toda la base de datos hoy se reconstruye desde cero con `db:migration:run` + `db:seed` (ver `docs/workflows/LOCAL-SETUP.md`). Mientras eso siga siendo cierto, el historial de 14+ migraciones incrementales no es una bitácora de producción que haya que preservar — es artefacto de cómo se construyó el sistema durante el desarrollo, no un requisito operativo.
- **Qué significa "un único script":** una sola migración (`0001-InitialSchema.ts` o el nombre que se acuerde) que crea el esquema completo tal como queda descrito en la sección 1 de este documento — los siete módulos, sus tablas, sin el esquema de versionado retirado de `routing/`/`roadmap/` (backlog 5.6), con nombres en inglés (sección 3). Las migraciones incrementales actuales (`20260518001` a `20260518014` y las que se agreguen durante la reestructuración) se consolidan en esa única migración; no se conservan como historial.
- **Estado (2026-09-19): ejecutada.** El esquema vive en `apps/api/src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.ts` y una prueba unitaria (`single-migration.spec.ts`) falla si aparece un segundo archivo. Para cambiar el esquema: editar `up()` (y `down()` si hace falta) y reconstruir la base (`db:migration:run` sobre una base vacía, luego `db:seed`).
- **Cuándo deja de aplicar esta regla:** en el momento en que exista un entorno con datos reales corriendo contra el esquema actual (staging o producción), esta política se invierte — a partir de ahí, todo cambio de esquema es una migración incremental nueva sobre la base existente, nunca una edición del script único ni una reconstrucción del historial. Esa transición es una decisión de producto (cuándo se considera que el sistema "ya tiene datos que importan"), no una decisión técnica — si llega el momento de evaluarla, se confirma antes de asumir que ya ocurrió.
- **Qué no cambia:** la convención ya vigente de que las migraciones son el único mecanismo para modificar el esquema (nunca `synchronize: true`, nunca un `ALTER` a mano) sigue igual — esta sección solo dice cuántos archivos de migración deben existir al final de la reestructuración, no cómo se aplican.

---

## 7. Gobernanza de este documento

Esta versión reemplazó por completo una versión anterior de sí misma (sección 1.3) — ese patrón no debe repetirse indefinidamente, porque un documento de convenciones que se reescribe entero cada vez que cambia una decisión deja de ser una referencia estable contra la cual medir el código, tal como advierte la línea 4 de este mismo documento.

**A partir de esta versión, ningún cambio futuro al mapa de contextos de la sección 1 se hace editando este archivo de nuevo.** Se documenta como un ADR nuevo, siguiendo el formato ya definido en 4.2 (`docs/architecture/decisions/NNNN-titulo.md`: contexto, decisión, consecuencias — corto, inmutable una vez aceptado), que referencia explícitamente qué parte de la sección 1 supera. Este documento queda fijo como la fotografía de la arquitectura objetivo vigente a su fecha (ver la fecha al inicio del documento); no se actualiza para reflejar decisiones posteriores al mapa de contextos — esas viven en sus propios ADRs.

**Nota de aplicación de esta regla a la propia edición que la introdujo:** la fusión de `shared/`+`shared-kernel/` en un único `shared/` de tres subcarpetas y el repliegue de `service-catalog/` dentro de `routing/` (ambos en la sección 1.1) son, por definición, cambios al mapa de contextos — exactamente el tipo de cambio que este párrafo dice que no se vuelve a editar en el archivo. Se editaron aquí, en situ, deliberadamente y por última vez: este documento seguía sin comprometerse a control de versiones al momento de tomar esas dos decisiones, así que el régimen de ADR de este párrafo aún no había entrado en vigor sobre una versión ya publicada del mapa. Cualquier cambio al mapa de contextos **posterior** a esta edición — incluida una eventual reversión de `service-catalog/` bajo la condición ya declarada en 1.1 — sigue el régimen de ADR sin excepción.

Esta regla aplica específicamente al **mapa de contextos** (sección 1). El resto del documento (estructura interna de módulo, política de idioma, estándares de documentación y de pruebas, política de migraciones) sigue siendo una referencia viva que se actualiza in situ cuando cambian esas convenciones — la razón para tratar la sección 1 distinto es que un cambio al mapa de contextos es, por definición, una decisión de diseño puntual con fecha y motivo propios (el tipo de cosa que un ADR existe para registrar), mientras que una convención de idioma o de capas es una regla continua sin ese mismo carácter de evento.

`CLAUDE.md` (sección 4.5) es responsable de señalar, junto a este documento, cualquier ADR posterior que haya superado parte de la sección 1 — quien vaya a implementar un cambio nuevo debe poder confiar en `CLAUDE.md` para saber si el mapa de contextos que está leyendo aquí sigue vigente o fue superado.

---

## 8. Estado de la implementación (2026-09-19)

Registro de en qué punto está la reestructuración que este documento describe; se actualiza al cerrar cada fase.

| Elemento | Estado |
|---|---|
| Estructura de siete oleadas de la Fase 4 (`shared/`, `diagnosis/`, `initiative/`, `routing/`, `roadmap/`, `Result<T,E>`, eventos de dominio) | **Hecho** y verificado con la suite unitaria, de integración y e2e. |
| Carpetas técnicas de la raíz de `api/src` (`infrastructure/`, `interfaces/`) | **Eliminadas**; su contenido vive en `shared/kernel/{infrastructure,presentation}`. |
| Frontera de `consent` | **Resuelta** (§1.3): vive en `initiative/`; el estado se mueve por `ConsentRecordedEvent`. |
| Regla de capas por ESLint (`presentation/` solo importa de `application/`) | **Activa** desde el cierre de la Fase 4 (antes no se aplicaba). |
| READMEs de módulo (§4.4) | Hechos para los seis módulos existentes; `reporting/` no existe todavía. |
| Consolidación de migraciones en un único script (§6) | **Hecha al cierre de la Fase 6 (2026-09-19).** Una sola migración, `20260518001-InitialSchema.ts`, reemplazó las 25 incrementales. Todo cambio de esquema posterior se hace **editando ese mismo archivo**, sin crear otro, mientras no exista un entorno con datos reales; ya se hizo así al retirar `dimension_result.is_bottleneck`. |
| `reporting/` (y con él `notifications`, `report`, `audit`) | Pendiente; sus eventos de entrada ya existen. |
| Transiciones `WITH_INITIATIVE` / `QUESTIONNAIRE_IN_PROGRESS`, propiedad del recurso en el resto de endpoints | Pendientes — `backlog-deuda-tecnica.md` 14.1 y 14.2. |

---

*Fin del documento de convenciones objetivo. Las preguntas de negocio que motivaron este documento (identidad como contexto de negocio o infraestructura; frontera de iniciativa; frontera de consentimiento; reporte y notificaciones como uno o dos contextos; auditoría como contexto o servicio transversal; alcance de la política de idioma) ya fueron resueltas y están incorporadas en las secciones 1 y 3, incluida la frontera de `consent` (vive en `initiative/`; ver 1.3 y la sección 8): **no queda ninguna pregunta de negocio abierta** en este documento. El acceso cruzado de `routing/`/`roadmap/` a la entidad ORM de `shared/irl-taxonomy/` ya no es una pregunta abierta — quedó resuelto en la sección 1.3 como deuda a corregir, no como excepción aceptada. A partir de esta versión, cualquier cambio futuro al mapa de contextos se documenta como ADR (sección 7), no editando este archivo.*
