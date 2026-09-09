# Reporte de estado real y verificado — Sistema de Diagnóstico IRL (SEMI)

**Fecha de auditoría:** 2026-09-06
**Método:** lectura directa del código fuente, migraciones, seeds, manifiestos de dependencias y `node_modules`, más ejecución real de `lint`, `typecheck` y las suites de pruebas. La documentación de ambos repositorios se usó solo como hipótesis a contrastar, nunca como fuente de hechos.

**Repositorios auditados:**

| Repo | Rama actual | HEAD |
| --- | --- | --- |
| `sistema-diagnostico-irl/` (código) | `refactor/restore-diagnostic-orchestrator` | `3eda2e2` |
| `sistema-diagnostico-irl-docs/` (documentación) | `refactor/epic-user-stories-refinement` | `aca9bfc` |

**Convención de este reporte:** todo lo afirmado en las secciones 1–7 fue verificado contra el código. Cuando algo no pudo verificarse se marca explícitamente como **[INCIERTO]**. Las secciones 8 y 9 reportan contradicciones y vacíos sin resolverlos.

---

## 1. Resumen general

### 1.1 Propósito del sistema

Aplicación web para el centro INNLAB de la Universidad Icesi. Un "Líder de Iniciativa" responde un cuestionario de 48 afirmaciones (6 dimensiones × 8 afirmaciones) en escala Likert 1–5; el sistema convierte los promedios por dimensión a un nivel IRL 1–9 usando la tabla de conversión del marco KTH Innovation Readiness Level™, y devuelve un perfil de madurez con cuello de botella, fortaleza, asimetría, brechas y desequilibrios por pares.

### 1.2 Stack real (versiones tomadas de `node_modules`, no de la documentación)

**Monorepo (raíz)**

| Elemento | Valor real |
| --- | --- |
| Gestor de paquetes | pnpm 9.12.0 (`packageManager`) |
| Workspaces | `apps/*`, `packages/*` (`pnpm-workspace.yaml`) |
| Node requerido | `>=22.0.0` (`engines`) |
| TypeScript (raíz) | 5.6.3 |
| Tooling | ESLint 9 (flat config) + typescript-eslint 8, Prettier 3, Husky 9, commitlint 19, lint-staged 15 |

**Backend — `apps/api` (`@innlab/api`, v0.0.1, ESM `"type": "module"`)**

| Paquete | Versión instalada |
| --- | --- |
| `@nestjs/core` / `@nestjs/common` | 11.1.19 |
| `fastify` (vía `@nestjs/platform-fastify`) | 5.8.4 |
| `typeorm` | 0.3.29 |
| `pg` | 8.20.0 |
| `zod` (vía contracts) | 3.25.76 |
| `jest` | 30.4.2 |

Otras dependencias declaradas y **efectivamente usadas**: `@nestjs/config`, `@nestjs/typeorm`, `@nestjs/terminus`, `@nestjs/swagger`, `@fastify/helmet`, `joi`, `nestjs-pino` + `pino`, `nestjs-cls`, `reflect-metadata`, `class-validator`/`class-transformer` (solo el `ValidationPipe` global; ningún DTO los usa), `dotenv`, `tsx`.

Dependencias declaradas y **sin una sola referencia en `src/`** (verificado por grep): `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa`, `@nestjs/cache-manager`, `cache-manager`, `nodemailer`, `undici`, `uuid` (el código usa `node:crypto.randomUUID`).

**Frontend — `apps/web` (`@innlab/web`, ESM)**

| Paquete | Versión instalada |
| --- | --- |
| `react` / `react-dom` | 19.2.6 |
| `vite` | 5.4.21 |
| `react-router-dom` | 7.15.0 |
| `@tanstack/react-query` | 5.100.10 |
| `zustand` | 5.0.13 |
| `recharts` | 3.8.1 |
| `axios` | 1.16.1 |
| `tailwindcss` | 3.4.19 |
| `typescript` | 5.6.3 |
| `vitest` | 3.2.4 |

Instaladas y **no referenciadas en `src/`**: `oidc-client-ts` 3.5.0, `react-oidc-context` 3.3.1, `react-hook-form`, `@hookform/resolvers`, `immer`, `date-fns`. UI: Radix (dialog, radio-group, tabs) + patrón shadcn/ui, `lucide-react`, `sonner`, `class-variance-authority`, `clsx`, `tailwind-merge`.

**Contratos — `packages/contracts` (`@innlab/contracts` v1.0.0)**
Solo `zod ^3.23.0`. Se compila con `tsc` a `dist/`; el backend lo consume vía `main`/`exports` apuntando a `dist`, el frontend vía alias de Vite apuntando a `src`. **Esta asimetría es la causa de un fallo real de build descrito en §8.**

### 1.3 Estructura del monorepo (primer nivel)

```
sistema-diagnostico-irl/
├── apps/
│   ├── api/            Backend NestJS + Fastify + TypeORM
│   └── web/            SPA React + Vite
├── packages/
│   └── contracts/      Esquemas Zod compartidos (frontera de tipos)
├── docs/
│   ├── conventions/    API, branches, code style, PRs, commits, testing
│   └── workflows/      Daily development, local setup
├── .docker/            (montaje de realm de Keycloak; el servicio está comentado)
├── .husky/             Hooks commit-msg y pre-commit
├── docker-compose.yml  Solo Postgres 16 activo; Keycloak y Mailpit COMENTADOS
├── commitlint.config.mjs, eslint.config.mjs, tsconfig.base.json, .nvmrc
```

**No existe** `docs/architecture/` (ni `overview.md`, ni `domain-model.md`, ni `decisions/`), pese a estar referenciado como fuente de verdad en `CLAUDE.md`.

---

## 2. Arquitectura real del backend

### 2.1 Framework y patrón

NestJS 11.1.19 sobre adaptador **Fastify** (no Express). Monolito modular con DDD-lite y hexagonal por módulo. Cada módulo de dominio implementa la partición de cuatro capas:

```
src/modules/<contexto>/
├── domain/            Entidades, VOs, servicios de dominio puros, ports (Symbol + interface)
├── application/       Casos de uso: una clase, un método público execute(command)
├── infrastructure/    ORM entities + adaptadores TypeORM que implementan los ports
└── interfaces/http/   Controladores NestJS + DTOs de Swagger
```

La dirección de dependencias está codificada en `apps/api/eslint.config.mjs` con `eslint-plugin-boundaries` (`interfaces → application → domain ← infrastructure`) y con `no-restricted-imports` que prohíbe `@nestjs/*`, `typeorm`, `axios`, `undici`, `nodemailer`, `pino*`, `fs`, `http`, `net` dentro de `domain/` y `application/`. **Esta regla está violada hoy en 5 archivos (ver §8).**

### 2.2 Estructura de carpetas real de `apps/api/src`

| Carpeta | Contenido real |
| --- | --- |
| `main.ts` | Bootstrap: Fastify, helmet (CSP off), CORS, `ValidationPipe` global, 3 filtros globales, prefijo `api/v1`, Swagger en `api/docs`, listen en `0.0.0.0:APP_PORT` |
| `app.module.ts` | Composition root: `ConfigModule` (global, Joi) → `ClsModule` (correlation id) → `LoggerModule` (pino) → `TypeOrmModule.forRootAsync` → `ApiV1Module` |
| `config/` | `configuration.ts` (único punto que lee `process.env`), `env.validation.ts` (Joi), `ormconfig.factory.ts` (fábrica compartida runtime/CLI) |
| `infrastructure/database/` | `data-source.ts` (DataSource CLI), `migrations/` (4 archivos), `seeds/` (runner + `data/`) |
| `infrastructure/http/` | `problem-details.ts` + 3 filtros: `DomainExceptionFilter`, `ValidationExceptionFilter`, `GlobalExceptionFilter` |
| `interfaces/http/` | `api-v1.module.ts` (composición de la superficie v1), `health.controller.ts` |
| `shared-kernel/` | `domain/value-objects/` (`Uuid`, `LikertValue`, `IrlLevel`, `DimensionCode`), `domain/errors/` (jerarquía `DomainError`), `domain/result.ts` (`Result<T,E>`, **no usado por ningún caso de uso**), `application/use-case.interface.ts` (**no implementado por ninguna clase**) |
| `modules/` | 11 carpetas — ver tabla siguiente |

### 2.3 Estado real de cada módulo

| Carpeta en `src/modules/` | Qué contiene realmente | ¿Registrado en `ApiV1Module`? |
| --- | --- | --- |
| `irl-catalog` | Completo: 4 clases de dominio, port, query, repo TypeORM, controlador, 5 ORM entities | **Sí** |
| `questionnaire` | Completo: agregado `AnswerSheet`, `Answer`, `CompletenessReport` (sin uso), port, caso de uso, repo, controlador | **Sí** |
| `maturity-profile` | Completo: agregado, 2 servicios de dominio, 2 VOs, 2 ports, 2 repos, 2 casos de uso, mapper, controlador | **Sí** |
| `diagnostic` | Parcial: agregado `Diagnostico`, VO `DiagnosticState`, port, repo, 1 caso de uso, controlador | **Sí** |
| `consent` | **Solo** `consentimiento.orm-entity.ts` | No |
| `initiative` | **Solo** `iniciativa.orm-entity.ts` y `sector.orm-entity.ts` | No |
| `audit` | **Solo** `evento-auditoria.orm-entity.ts` | No |
| `notifications` | **Solo** `notificacion.orm-entity.ts` | No |
| `report` | **Solo** `descarga-reporte.orm-entity.ts` | No |
| `portfolio-routing` | **Solo** 3 ORM entities: `regla-enrutamiento`, `servicio-portafolio`, `recomendacion-portafolio` | No |
| *(no existe)* `identity` | **La carpeta no existe** | — |
| *(no existe)* `deep-analysis` | **La carpeta no existe** | — |

Los seis módulos "solo ORM" no tienen `*.module.ts`, ni dominio, ni casos de uso, ni controladores. Sus entidades **no se cargan en runtime**: `buildOrmModuleOptions` usa `autoLoadEntities: true`, que solo registra entidades declaradas en algún `TypeOrmModule.forFeature()`. Sí se cargan por glob en el `DataSource` de CLI (`buildOrmDataSourceOptions`), lo que permite `migration:generate` pero no acceso en runtime.

### 2.4 Cómo arranca la aplicación

`main.ts` → `NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger:false }), { bufferLogs:true })`. Orden fijo y relevante:

1. `app.useLogger(app.get(Logger))` — pino toma el control del logging.
2. `helmet` con `contentSecurityPolicy:false` (justificado por Swagger UI).
3. Lectura **única** de configuración: `ConfigService.getOrThrow<AppConfig>('app')`.
4. CORS con `origin: cfg.webOrigin`, `credentials:true`.
5. `ValidationPipe` global `{ whitelist, forbidNonWhitelisted, transform }`.
6. Tres filtros globales en orden `Global → Validation → Domain`.
7. `app.setGlobalPrefix('api/v1')`.
8. Swagger montado en **`api/docs`** (no bajo el prefijo v1), **sin guardar por entorno**.
9. `app.listen(cfg.appPort, '0.0.0.0')`.

`ClsModule` monta un middleware que genera/propaga `x-correlation-id`; ese id se inyecta en cada línea de log y en cada respuesta de error RFC 7807.

`migrationsRun: false` y `synchronize: false` en ambas fábricas — las migraciones se aplican solo por CLI (`pnpm --filter @innlab/api db:migration:run`).

### 2.5 Gestión de configuración

Contrato estricto y **efectivamente respetado**: `src/config/configuration.ts` es el único archivo que menciona nombres de variables de entorno; el resto del código consume el objeto tipado `AppConfig` bajo el namespace `'app'`. Doble validación:

- **Joi** (`env.validation.ts`) en `ConfigModule.forRoot`, con `abortEarly:false`.
- **`requireString`** en `loadAppConfig`, como red de seguridad para las herramientas CLI que no arrancan Nest.

`envFilePath: ['.env.local', '.env']`. Variables requeridas hoy: `WEB_ORIGIN`, `DATABASE_URL`, `KEYCLOAK_ISSUER_URL`, `KEYCLOAK_JWKS_URI`, `KEYCLOAK_AUDIENCE`, `INNLAB_CORE_BASE_URL`, `INNLAB_CORE_CLIENT_ID`, `INNLAB_CORE_CLIENT_SECRET`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Con defaults: `NODE_ENV`, `APP_PORT` (3000), `DATABASE_SCHEMA_DIAGNOSTIC` (`irl_diagnostic`), `DATABASE_SCHEMA_CATALOG` (`irl_catalog`), `SMTP_PORT` (587), `LOG_LEVEL` (`info`).

> **Hecho relevante:** las secciones `keycloak`, `innlabCore` y `smtp` de `AppConfig` son **obligatorias para arrancar** pero **ningún código las consume**. `DATABASE_SCHEMA_*` tampoco se lee en ningún lado: el esquema se fija por entidad con `@Entity({ schema: '...' })`.

`docker-compose.yml` levanta **solo Postgres 16-alpine** en el puerto host **5433**. Keycloak y Mailpit están comentados, aunque `package.json` define `pnpm keycloak:up`.

---

## 3. Arquitectura real del frontend

### 3.1 Framework y composición

React 19.2.6 + Vite 5.4.21, TypeScript estricto, Tailwind 3.4 con tokens CSS propios (`src/styles/globals.css`) y primitivos shadcn/ui sobre Radix.

`main.tsx` monta `<App/>` en `#root`. `App.tsx` compone los providers en orden explícito:

```
ErrorBoundary → QueryProvider → ToastProvider → BrowserRouter → AppRoutes
```

### 3.2 Estructura de carpetas real de `apps/web/src`

| Carpeta | Contenido real |
| --- | --- |
| `app/` | `App.tsx`, `providers/` (`ErrorBoundary`, `QueryProvider`, `ToastProvider`), `router/` (`routes.tsx`, `ProtectedRoute.tsx`) |
| `features/questionnaire/` | `api/`, `components/` (8), `hooks/` (2), `store/` (1 store Zustand), `index.ts` |
| `features/maturity-profile/` | `api/`, `components/` (3), `hooks/` (1), `utils/` (2), `index.ts` |
| `pages/` | `HomePage`, `QuestionnairePage`, `MaturityProfilePage`, `InProgressPage`, `NotFoundPage` |
| `shared/` | `api/` (`http.ts`, `query-client.ts`, `query-keys.ts`, `diagnostic.api.ts`), `lib/` (`dimensions.ts`, `utils.ts`), `ui/` (primitivos) |
| `styles/`, `test/` | Tokens globales; helpers de test |

Solo existen **dos** features (`questionnaire` y `maturity-profile`). No hay `features/auth`, `features/diagnostic`, `features/consent`, `features/initiative`, `features/report`.

El aislamiento por feature está aplicado con `eslint-plugin-boundaries` en `apps/web/eslint.config.mjs`: `app → {app,pages,feature,shared,styles}`, `pages → {feature,shared}`, `feature → {mismo feature, shared}`, `shared → shared`.

Alias de Vite: `@innlab/contracts` → `packages/contracts/src/index.ts` (**source, no dist**), `@`, `@app`, `@features`, `@pages`, `@shared`.

### 3.3 Manejo de estado

Separación estricta y respetada en el código:

- **Estado de servidor → TanStack Query.** `queryClient` singleton en `shared/api/query-client.ts`: sin reintento en 4xx, un reintento en el resto, `refetchOnWindowFocus:false`, mutaciones sin reintento. Claves centralizadas en `shared/api/query-keys.ts` (incluye claves para `catalog.sectors`, `diagnostic.list`, `diagnostic.detail`, `diagnostic.progress` que **hoy nadie consume**).
  - `useQuestionnaireStructure` → `staleTime: Infinity`, `gcTime: Infinity`.
  - `useMaturityProfile` → `staleTime: 5 min`, `enabled: Boolean(diagnosticId)`.
- **Estado de borrador/UI → Zustand.** Un único store: `questionnaire-draft.store.ts`, con middleware `persist` sobre **`sessionStorage`** (clave `innlab.questionnaire-draft.v1`, `version: 1`). Slices: `diagnosticId`, `answers` (`Record<statementId, 1..5>`), `activeTab`, `dirty`. `partialize` excluye `dirty`. `initialize(id)` es idempotente y **borra el borrador cuando cambia el `diagnosticId`** (aislamiento entre diagnósticos en la misma pestaña). Selectores estables definidos a nivel de módulo.

### 3.4 Enrutamiento

`react-router-dom` v7 en modo `BrowserRouter`, tabla declarativa en `app/router/routes.tsx`:

| Ruta | Elemento real |
| --- | --- |
| `/` | `<Navigate to="/diagnosticos" replace />` |
| `/diagnosticos` | `HomePage` (landing institucional) |
| `/diagnosticos/nuevo` | `InProgressPage` — stub, "HU-04 / RF-02" |
| `/diagnosticos/:id/consentimiento` | `InProgressPage` — stub, "HU-05 / RF-03" |
| `/diagnosticos/:id/iniciativa` | `InProgressPage` — stub, "HU-06 / RF-04" |
| `/diagnosticos/:id/cuestionario` | `QuestionnairePage` — **implementación real** |
| `/diagnosticos/:id/perfil` | `MaturityProfilePage` — **implementación real** |
| `/auth/callback` | `InProgressPage` — stub, "HU-01 / RF-00" |
| `*` | `NotFoundPage` |

Todas las rutas autenticadas están envueltas en `<ProtectedRoute>`, que hoy es un **no-op declarado**: `return <>{children}</>`. No hay integración OIDC en ningún punto del árbol.

El CTA principal de `HomePage` apunta a una URL con UUID **hardcodeado**: `/diagnosticos/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/cuestionario` — exactamente el `id_diagnostico` del diagnóstico demo que inserta el seed. No existe forma en la UI de crear un diagnóstico nuevo.

### 3.5 Comunicación con el backend

Cliente único: `shared/api/http.ts` — instancia de `axios` con `baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1'` y `timeout: 30_000`.

- **Interceptor de request:** añade `X-Correlation-Id` generado con `nanoid()` en cada petición.
- **Interceptor de response (error):** normaliza a `Error`. **Descarta el cuerpo Problem Details**: si `response.data` es un objeto (el caso normal de RFC 7807) cae en la rama final y rechaza con `new Error(error.message)` — el mensaje genérico de axios. El `code` estable del backend **nunca llega al componente**, y `queryClient` nunca puede leer `error.status` (su helper `isHttpError` busca `status` en el error, que aquí no existe → los 4xx se reintentan igual que los 5xx).

Capa de servicios (tres funciones, todas validan la respuesta con Zod antes de devolverla):

| Archivo | Función | Llamada |
| --- | --- | --- |
| `features/questionnaire/api/questionnaire-catalog.api.ts` | `getQuestionnaireStructure()` | `GET /catalogo/cuestionario` |
| `features/maturity-profile/api/maturity-profile.api.ts` | `getMaturityProfile(id)` | `GET /diagnosticos/:id/perfil` |
| `shared/api/diagnostic.api.ts` | `finalizeInitialDiagnostic(id, answers)` | `POST /diagnosticos/:id/finalizar-inicial` |

`vite.config.ts` proxya `/api` a `http://localhost:3000` en dev. `.env.example` define `VITE_API_BASE_URL=http://localhost:3000/api/v1` más tres variables OIDC (`VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_REDIRECT_URI`) que **ningún archivo lee**.

---

## 4. Modelo de datos real

**Motor:** PostgreSQL 16 (imagen `postgres:16-alpine`).
**ORM:** TypeORM 0.3.29, `synchronize: false` en runtime y en CLI. Migraciones en tabla `typeorm_migrations`.
**Dos esquemas**, fijados por entidad con `@Entity({ schema })`: `irl_catalog` (referencia, solo lectura en runtime) e `irl_diagnostic` (transaccional).

Todas las tablas a continuación fueron leídas del DDL literal en `apps/api/src/infrastructure/database/migrations/`. Se marca con ⚠️ toda tabla que **existe en la BD pero no tiene entidad ORM cargada en runtime**.

### 4.1 Esquema `irl_catalog`

#### `dimension` — migración 001

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_dimension` | `integer GENERATED ALWAYS AS IDENTITY` | **PK** |
| `codigo` | `varchar(8) NOT NULL` | `UNIQUE`; `CHECK IN ('TRL','CRL','BRL','IPRL','TmRL','FRL')` |
| `nombre_es` | `varchar(80) NOT NULL` | |
| `nombre_en` | `varchar(80) NOT NULL` | |
| `descripcion` | `varchar(500) NOT NULL` | |
| `es_dimension_critica` | `boolean NOT NULL DEFAULT false` | **El seed la deja en `false` para las 6 dimensiones** |
| `orden` | `integer NOT NULL` | `UNIQUE`; `CHECK BETWEEN 1 AND 6` |

ORM: `DimensionOrm` (`irl-catalog`), con `@OneToMany` a `AfirmacionOrm`. Cargada en runtime.

#### `afirmacion` — migración 001

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_afirmacion` | `bigint GENERATED ALWAYS AS IDENTITY` | **PK** — TypeORM lo devuelve como **string** |
| `id_dimension` | `integer NOT NULL` | FK → `dimension` |
| `numero_en_dimension` | `integer NOT NULL` | `CHECK BETWEEN 1 AND 8` |
| `texto_es` | `varchar(500) NOT NULL` | |

`UNIQUE (id_dimension, numero_en_dimension)`; índice `ix_afirmacion_dimension`. ORM: `AfirmacionOrm` con `@ManyToOne` a `DimensionOrm`. Cargada.

#### `rango_conversion` — migración 002

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `nivel_irl` | `smallint` | **PK natural** (sin surrogate); `CHECK BETWEEN 1 AND 9` |
| `avg_min` | `numeric(3,2) NOT NULL` | `CHECK` en `[1,5]` |
| `avg_max` | `numeric(3,2) NOT NULL` | `CHECK` en `[1,5]` y `avg_min <= avg_max` |

ORM: `RangoConversionOrm`, con `transformer` numérico (Postgres devuelve `numeric` como string). Cargada.
Datos sembrados (9 filas, contiguas, cubren `[1.00, 5.00]`): 1.00–1.39→1, 1.40–1.79→2, 1.80–2.19→3, 2.20–2.59→4, 2.60–2.99→5, 3.00–3.39→6, 3.40–3.79→7, 3.80–4.39→8, 4.40–5.00→9.

#### `par_dimension` — migración 002

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_par` | `integer GENERATED ALWAYS AS IDENTITY` | **PK** |
| `id_dimension_a` | `integer NOT NULL` | FK → `dimension` |
| `id_dimension_b` | `integer NOT NULL` | FK → `dimension` |
| `codigo_par` | `varchar(16) NOT NULL` | `UNIQUE` |

`UNIQUE (id_dimension_a, id_dimension_b)`, `CHECK (a <> b)`. ORM: `ParDimensionOrm`. Cargada.
Sembrados exactamente 6 pares, con `codigo_par` en formato **`"A-B"` separado por guion**: `TRL-CRL`, `TRL-BRL`, `CRL-BRL`, `TmRL-FRL`, `BRL-IPRL`, `TRL-IPRL`. **Los repositorios reconstruyen los códigos con `codigoPar.split('-')`** — dependencia frágil pero funcional porque ningún código de dimensión contiene guion.

#### `texto_roadmap` — migración 003 ⚠️

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_texto_roadmap` | `bigint GENERATED ALWAYS AS IDENTITY` | **PK** |
| `id_dimension` | `integer NOT NULL` | FK → `dimension` |
| `nivel_irl` | `integer NOT NULL` | `CHECK BETWEEN 1 AND 9` |
| `texto_orientacion` | `varchar(1000) NOT NULL` | |

`UNIQUE (id_dimension, nivel_irl)`. Existe `TextoRoadmapOrm` en `irl-catalog/infrastructure/persistence/entities/`, **pero no está registrada en `IrlCatalogModule.forFeature()`** → no se carga en runtime. **Tabla vacía: no hay seed.** Capacidad máxima por diseño: 6 × 9 = 54 filas.

#### `sector` — migración 003 ⚠️

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_sector` | `bigint GENERATED ALWAYS AS IDENTITY` | **PK** |
| `nombre` | `varchar(120) NOT NULL` | `UNIQUE` |
| `activo` | `boolean NOT NULL DEFAULT true` | |

ORM `SectorOrm` vive en `modules/initiative/`, no en `irl-catalog`. No registrada. **Tabla vacía: no hay seed.**

#### `servicio_portafolio` — migración 003 ⚠️ **(clave para el motor de enrutamiento)**

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_servicio` | `integer GENERATED ALWAYS AS IDENTITY` | **PK** |
| `nombre` | `varchar(80) NOT NULL` | `UNIQUE` |
| `descripcion` | `varchar(500) NULL` | |
| `activo` | `boolean NOT NULL DEFAULT true` | |

ORM `ServicioPortafolioOrm` en `modules/portfolio-routing/`. No registrada. **Tabla vacía: no hay seed.**

#### `regla_enrutamiento` — migración 003 ⚠️ **(clave para el motor de enrutamiento)**

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_regla` | `bigint GENERATED ALWAYS AS IDENTITY` | **PK** |
| `id_servicio` | `integer NOT NULL` | FK → `servicio_portafolio` |
| `condicion` | `varchar(2000) NOT NULL` | **Sin formato definido en ninguna parte del código ni de la documentación** |
| `prioridad` | `integer NOT NULL` | Sin `UNIQUE`: permite empates de prioridad |
| `descripcion` | `varchar(500) NULL` | |
| `activa` | `boolean NOT NULL DEFAULT true` | |

ORM `ReglaEnrutamientoOrm`. No registrada. **Tabla vacía: no hay seed.**

### 4.2 Esquema `irl_diagnostic`

#### `diagnostico` — migración 001 (raíz de todo el modelo transaccional)

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_diagnostico` | `uuid` | **PK — generado por la aplicación**, no por Postgres |
| `keycloak_user_id` | `varchar(64) NOT NULL` | índice `ix_diagnostico_keycloak` |
| `fecha_inicio` | `timestamptz NOT NULL DEFAULT now()` | |
| `fecha_fin_fase_1` | `timestamptz NULL` | Escrita solo al pasar a `PERFIL_GENERADO` |
| `fecha_fin_fase_2` | `timestamptz NULL` | **Nunca escrita por el código actual** |
| `estado` | `varchar(24) NOT NULL` | `CHECK IN (...)` — **solo 6 valores, ver §8** |
| `version_marco_irl` | `varchar(16) NOT NULL DEFAULT 'KTH-IRL-1.0'` | Nunca escrita explícitamente |

`CHECK ck_diagnostico_estado` acepta exactamente: `INICIADO`, `CON_CONSENTIMIENTO`, `CON_INICIATIVA`, `CUESTIONARIO_EN_CURSO`, `CUESTIONARIO_COMPLETO`, `PERFIL_GENERADO`.

ORM: `DiagnosticoOrm`. Repositorio: `TypeOrmDiagnosticRepository` (upsert manual: `findOne` + `save`).

**Nota de mapeo relevante:** el agregado `Diagnostico` expone `createdAt`/`updatedAt`, pero la tabla **no tiene columna `updated_at`**. `toDomain()` asigna `updatedAt = row.fecha_inicio`. El agregado tampoco tiene `initiativeId`, `consentId` ni `version`.

#### `respuesta` — migración 001

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_respuesta` | `bigint GENERATED ALWAYS AS IDENTITY` | **PK** |
| `id_diagnostico` | `uuid NOT NULL` | FK → `diagnostico` **ON DELETE CASCADE**; índice |
| `id_afirmacion` | `bigint NOT NULL` | FK → `irl_catalog.afirmacion` (cross-schema) |
| `valor_likert` | `integer NOT NULL` | `CHECK BETWEEN 1 AND 5` |
| `fecha_respuesta` | `timestamptz NOT NULL DEFAULT now()` | |

`UNIQUE (id_diagnostico, id_afirmacion)`. Estrategia de escritura real (`TypeOrmAnswerSheetRepository.save`): **DELETE de todas las filas del diagnóstico + INSERT masivo, dentro de una transacción** (`orm.manager.transaction`). Es la única escritura del sistema que sí usa una transacción explícita.

#### `resultado_dimension` — migración 004 **(la tabla que consumirán los dos módulos nuevos)**

| Columna | Tipo | Restricciones | Cómo se llena hoy |
| --- | --- | --- | --- |
| `id_resultado` | `bigint IDENTITY` | **PK** | DB |
| `id_diagnostico` | `uuid NOT NULL` | FK → `diagnostico` CASCADE | |
| `id_dimension` | `integer NOT NULL` | FK → `irl_catalog.dimension` | Resuelto por lookup `codigo → id_dimension` |
| `promedio_likert` | `numeric(4,3) NOT NULL` | `CHECK BETWEEN 1 AND 5` | Suma/8, precisión completa |
| `nivel_irl` | `integer NOT NULL` | `CHECK BETWEEN 1 AND 9` | Tabla de conversión |
| `en_estado_critico` | `boolean NOT NULL` | | **`nivel_irl <= 3` para CUALQUIER dimensión** (ver §8) |
| `es_cuello_botella` | `boolean NOT NULL` | | **Siempre `false` — hardcodeado** (ver §8) |
| `fecha_calculo` | `timestamptz NOT NULL` | | `computedAt` del agregado |

`UNIQUE (id_diagnostico, id_dimension)`. Escritura: `INSERT ... ON CONFLICT (id_diagnostico, id_dimension) DO UPDATE` vía QueryBuilder `.orUpdate([...])`, **actualizando solo** `promedio_likert`, `nivel_irl`, `en_estado_critico`, `fecha_calculo` — `es_cuello_botella` **no está en la lista de columnas actualizables**.

#### `analisis_desequilibrio` — migración 004

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_desequilibrio` | `bigint IDENTITY` | **PK** |
| `id_diagnostico` | `uuid NOT NULL` | FK → `diagnostico` CASCADE |
| `id_par` | `integer NOT NULL` | FK → `irl_catalog.par_dimension` |
| `diferencia_niveles` | `integer NOT NULL` | |
| `clasificacion` | `varchar(16) NOT NULL` | `CHECK IN ('CRITICO','MODERADO','ACEPTABLE')` |

`UNIQUE (id_diagnostico, id_par)`. Escritura por upsert `ON CONFLICT`. Nótese que la BD guarda los valores **en español y mayúsculas**; el contrato HTTP los expone en **inglés y minúsculas** (`critical`/`moderate`/`acceptable`) — la traducción vive en `map-maturity-profile-response.ts`.

#### `consentimiento` — migración 004 ⚠️

`id_consentimiento uuid PK`, `id_diagnostico uuid NOT NULL UNIQUE` (FK CASCADE), `keycloak_user_id varchar(64)`, `aceptado boolean`, `timestamp_aceptacion timestamptz`, `version_terminos varchar(16)`. Relación 1:1 con `diagnostico`. ORM existe, no cargada, sin escritor.

#### `iniciativa` — migración 004 ⚠️

`id_iniciativa uuid PK`, `id_diagnostico uuid NOT NULL UNIQUE` (FK CASCADE), `id_sector bigint NOT NULL` (FK → `irl_catalog.sector`), `nombre varchar(200) NOT NULL`, `descripcion_breve varchar(1000) NOT NULL`. **`descripcion_breve` es NOT NULL en la BD pero opcional en el contrato Zod** (ver §8). ORM existe, no cargada, sin escritor.

#### `notificacion` — migración 004 ⚠️

`id_notificacion bigint IDENTITY PK`, `id_diagnostico uuid` (FK CASCADE), `tipo varchar(16)`, `destinatario varchar(200)`, `timestamp_envio timestamptz`, `estado_envio varchar(16)`, `mensaje_error varchar(500) NULL`, `numero_intentos integer DEFAULT 0`. `UNIQUE (id_diagnostico, tipo)`. Sin escritor.

#### `recomendacion_portafolio` — migración 004 ⚠️ **(destino del motor de enrutamiento)**

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id_recomendacion` | `bigint IDENTITY` | **PK** |
| `id_diagnostico` | `uuid NOT NULL` | **`UNIQUE`** → **una sola recomendación por diagnóstico**, impuesto por la BD |
| `id_regla` | `bigint NOT NULL` | FK → `irl_catalog.regla_enrutamiento` — **NOT NULL: toda recomendación debe venir de una regla** |
| `servicio_snapshot` | `varchar(80) NOT NULL` | Copia del nombre del servicio al momento de generar |
| `justificacion_criterio` | `varchar(1000) NOT NULL` | |
| `fecha_generacion` | `timestamptz NOT NULL` | |

Sin escritor. Sin caso de uso. Sin endpoint.

#### `descarga_reporte` — migración 004 ⚠️

`id_descarga bigint IDENTITY PK`, `id_diagnostico uuid` (FK CASCADE), `keycloak_user_id varchar(64)`, `timestamp_descarga timestamptz`, `formato varchar(8)`, `tamano_bytes integer NULL`, `incluye_atribucion boolean NOT NULL`. Sin escritor.

#### `evento_auditoria` — migración 004 ⚠️

`id_evento bigint IDENTITY PK`, `id_diagnostico uuid` (FK CASCADE), `tipo_evento varchar(40)`, `keycloak_user_id varchar(64) NULL`, `timestamp_evento timestamptz`, `metadata varchar(4000) NULL`. Sin escritor.

### 4.3 Estado real de los seeds

`pnpm --filter @innlab/api db:seed` ejecuta `src/infrastructure/database/seeds/index.ts`, todo dentro de **una transacción** y con upserts idempotentes sobre claves naturales. Puebla exactamente:

| Tabla | Filas | Estrategia |
| --- | --- | --- |
| `irl_catalog.dimension` | 6 | `ON CONFLICT (codigo) DO UPDATE` |
| `irl_catalog.afirmacion` | 48 | `ON CONFLICT (id_dimension, numero_en_dimension) DO UPDATE`; FK resuelta por subconsulta sobre `codigo` |
| `irl_catalog.rango_conversion` | 9 | `ON CONFLICT (nivel_irl) DO UPDATE` |
| `irl_catalog.par_dimension` | 6 | `ON CONFLICT (codigo_par) DO NOTHING` |
| `irl_diagnostic.diagnostico` | **1 fila demo** | `id = a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`, `keycloak_user_id = 'usuario-demo'`, `estado = 'CUESTIONARIO_EN_CURSO'` |

**No hay seed** para `sector`, `texto_roadmap`, `servicio_portafolio` ni `regla_enrutamiento`. Los textos de las 48 afirmaciones están declarados en el propio código (`seeds/data/statements.ts`) y su comentario los marca como **texto provisional pendiente de aprobación de stakeholders**. `statements.ts` valida en tiempo de import que haya 8 textos por dimensión y 48 en total; lanza si no.

---

## 5. Endpoints y contratos de API reales

Prefijo global `api/v1`. **Ningún endpoint tiene guard, decorador de roles ni verificación de propiedad.** Todos son públicos.

### 5.1 Rutas implementadas (lista exhaustiva)

| Método | Ruta | Controlador | Propósito |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health/live` | `HealthController` | Liveness — `health.check([])`, sin sondas |
| `GET` | `/api/v1/health/ready` | `HealthController` | Readiness — `pingCheck('database')` |
| `GET` | `/api/v1/catalogo/cuestionario` | `IrlCatalogController` | Estructura 6×8 del cuestionario |
| `POST` | `/api/v1/diagnosticos/:id/cuestionario` | `QuestionnaireController` | Persistir las 48 respuestas |
| `POST` | `/api/v1/diagnosticos/:id/finalizar-inicial` | `DiagnosticController` | **Orquestación**: envía + calcula + transiciona + devuelve perfil |
| `GET` | `/api/v1/diagnosticos/:id/perfil` | `MaturityProfileController` | Leer el perfil persistido |

Adicionalmente Swagger UI en **`/api/docs`** (fuera del prefijo `api/v1`), montado sin condicionar por `NODE_ENV`.

### 5.2 Formas de petición/respuesta reales

**`GET /catalogo/cuestionario`** → `200` `QuestionnaireStructure`:

```jsonc
{
  "versionMarco": "KTH-IRL-1.0",           // constante hardcodeada en la query
  "dimensions": [                            // 6, ordenadas por dimension.orden ASC
    {
      "code": "TRL", "name": "<nombre_es>", "description": "<descripcion>", "sequence": 1,
      "statements": [                        // 8, ordenadas por numero_en_dimension ASC
        { "id": "1", "dimensionCode": "TRL", "sequence": 1, "text": "..." }
      ]
    }
  ]
}
```

`id` es el **bigint como string**, no un UUID.

**`POST /diagnosticos/:id/cuestionario`** — body **sin DTO de clase**, tipado inline como `{ answers: Array<{ statementId: string; value: number }> }`. Consecuencia verificable: el `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`) **no valida nada** porque no hay metatype de clase. La validación real ocurre en el dominio (`LikertValue.create` y el guard `answeredCount !== 48`).
→ `201` `{ diagnosticId, answersRecorded: 48, state: "CUESTIONARIO_COMPLETO" }`.
Errores: `InvariantViolationError` → **422**.

**`POST /diagnosticos/:id/finalizar-inicial`** — mismo body inline, misma ausencia de validación de frontera.
Secuencia real en `FinalizeInitialDiagnosticUseCase.execute`:
1. `diagnostics.findById(id)` → si no existe: `NotFoundError` (404).
2. Verifica que el estado esté en `FINALIZABLE_STATES` → si no: `ConflictError` (409).
3. `submitQuestionnaire.execute(...)` (persiste `respuesta`).
4. **Relee** la hoja desde la BD (`answerSheets.findByDiagnosticId`).
5. `computeProfile.execute(...)` con las respuestas releídas.
6. `transitionTo('CUESTIONARIO_COMPLETO')` y `transitionTo('PERFIL_GENERADO')`, cada una condicionada por `canTransitionTo` (no lanza si no es posible).
7. `diagnostics.save(...)`.
→ `201` con el mismo `MaturityProfileResponse` del `GET`.

**`GET /diagnosticos/:id/perfil`** → `200` `MaturityProfileResponse`. Si no hay perfil calculado: `ConflictError('PROFILE_NOT_YET_COMPUTED')` → **409** (no 404).

```jsonc
{
  "diagnosticId": "uuid",
  "computedAt": "ISO-8601",
  "dimensionResults": [                       // exactamente 6, en orden canónico TRL,CRL,BRL,IPRL,TmRL,FRL
    { "dimensionCode": "TRL", "name": "TRL",  // ⚠ `name` = el CÓDIGO, no el nombre en español
      "averageLikert": 3.375, "irlLevel": 7 }
  ],
  "bottleneck": { "dimensions": ["FRL"], "level": 2 },     // array: maneja empates
  "strength":   { "dimensions": ["TRL"], "level": 7 },
  "asymmetry":  { "difference": 5, "classification": "critical" },
  "gaps":       { "dimensions": ["FRL","CRL"], "threshold": 3 },  // puede ir vacío
  "imbalances": [ { "left":"TRL","right":"CRL","difference":3,"classification":"moderate" } ]
  // `imbalances` se omite (undefined) si el repositorio no devuelve exactamente 6 filas
}
```

### 5.3 Contrato de errores

RFC 7807 con extensión `code`, `Content-Type: application/problem+json`, más `correlationId` propagado por `nestjs-cls`. Mapeo real en `DomainExceptionFilter`:

| Error de dominio | HTTP |
| --- | --- |
| `InvariantViolationError` | 422 |
| `NotFoundError` | 404 |
| `ForbiddenError` | 403 (nunca lanzado hoy) |
| `ConflictError` | 409 |
| `MaturityProfileCalculationError` | 500 |
| Cualquier otro `DomainError` | 400 |

`type` se construye como `https://errors.innlab.icesi.edu.co/<code en minúsculas>`.

---

## 6. Lógica de negocio implementada

### 6.1 Flujo completo del cálculo del perfil IRL (verificado línea por línea)

**Entrada.** `ComputeMaturityProfileUseCase.execute({ diagnosticId, answers })`:

1. Valida `answers.length === 48` → si no, `MaturityProfileCalculationError` (500).
2. Carga en paralelo del catálogo: `findAllStatements()`, `findAllConversionRanges()`, `findAllDimensionPairs()`.
3. Construye `Map<statementId → DimensionCode>` y agrupa las respuestas por dimensión. Si una respuesta apunta a un `statementId` desconocido → error.
4. `IrlCalculatorService.calculate(answersByDimension, conversionTable)` — **servicio de dominio puro, sin IO ni decoradores**:
   - Exige tabla de conversión no vacía, exactamente 6 dimensiones y exactamente 8 respuestas por dimensión.
   - `average = suma / 8`, con validación defensiva de que caiga en `[1,5]`.
   - Busca el `ConversionRange` cuyo `[avgMin, avgMax]` **inclusivo en ambos extremos** contenga el promedio. Si ninguno lo cubre → error explícito.
   - Devuelve 6 `DimensionResult { dimensionCode, averageLikert, irlLevel }`.
5. `MaturityProfile.create(...)` — el agregado valida al construir: exactamente 6 resultados, los 6 códigos presentes, sin duplicados, y **ordena canónicamente** según `DIMENSION_CODES`.
6. `ImbalanceEvaluatorService.evaluate(levelByCode, pairs)` — clasifica cada par: `>3 → CRITICO`, `>=2 → MODERADO`, resto `ACEPTABLE`. Si falta un nivel usa `0` como fallback (`?? 0`).
7. **Persistencia:** `await Promise.all([ profiles.save(profile), imbalanceRepo.save(...) ])`. **Son dos upserts independientes, sin transacción que los abarque** — pese a que el docstring del port promete atomicidad (ver §8).

**Señales derivadas.** Son métodos del agregado `MaturityProfile`, no servicios separados:

| Método | Regla implementada |
| --- | --- |
| `bottleneck()` | `min(irlLevel)`; devuelve **todas** las dimensiones empatadas en ese mínimo (RF-08 cumplido) |
| `strength()` | `max(irlLevel)`; también devuelve empates |
| `asymmetry()` | `max − min`, clasificado con los mismos umbrales KTH (`>3`/`>=2`/resto) |
| `gaps()` | `irlLevel <= CRITICAL_IRL_THRESHOLD` (constante `3` en `@innlab/contracts`), aplicado a **las seis dimensiones sin distinción** |

**Lectura.** `GetMaturityProfileUseCase` lee `resultado_dimension` (reconstruyendo `codigo` desde `id_dimension`) y `analisis_desequilibrio`, y los pasa por `toMaturityProfileResponse`, que traduce `CRITICO/MODERADO/ACEPTABLE` → `critical/moderate/acceptable` y sustituye `name` por el código de dimensión.

### 6.2 Máquina de estados del diagnóstico

`DiagnosticState` (VO inmutable) define **9 estados** y una adyacencia lineal con una sola bifurcación:

```
INICIADO → CON_CONSENTIMIENTO → CON_INICIATIVA → CUESTIONARIO_EN_CURSO
        → CUESTIONARIO_COMPLETO → PERFIL_GENERADO
        → { ANALISIS_PROFUNDO_DECLINADO | ANALISIS_PROFUNDO_EN_CURSO → ANALISIS_PROFUNDO_COMPLETO }
```

`FINALIZABLE_STATES` en el orquestador acepta: `CUESTIONARIO_EN_CURSO`, `CUESTIONARIO_COMPLETO`, `PERFIL_GENERADO`, `ANALISIS_PROFUNDO_DECLINADO`, `ANALISIS_PROFUNDO_EN_CURSO`, `ANALISIS_PROFUNDO_COMPLETO` — es decir, **el endpoint de finalización es re-ejecutable** (recalcula y sobrescribe el perfil).

Casos de uso **inexistentes**: crear diagnóstico, registrar consentimiento, registrar iniciativa, listar diagnósticos, obtener detalle. Ningún código transiciona jamás a `CON_CONSENTIMIENTO` ni a `CON_INICIATIVA`.

### 6.3 Rastro de lógica de enrutamiento o roadmap — hallazgo central de esta auditoría

Se ejecutó un grep exhaustivo sobre `apps/` y `packages/` para `roadmap`, `enrutamiento`, `routing`, `portafolio`, `portfolio`, `recomendacion`, `recommend`, `escalamiento`, `SEMI`. Resultado verificado:

**Existe (infraestructura muerta, sin comportamiento):**

| Artefacto | Ubicación | Estado |
| --- | --- | --- |
| Tabla `irl_catalog.texto_roadmap` | migración 003 | Creada, **vacía**, sin seed |
| Tabla `irl_catalog.servicio_portafolio` | migración 003 | Creada, **vacía**, sin seed |
| Tabla `irl_catalog.regla_enrutamiento` | migración 003 | Creada, **vacía**, sin seed |
| Tabla `irl_diagnostic.recomendacion_portafolio` | migración 004 | Creada, **vacía** |
| `TextoRoadmapOrm` | `modules/irl-catalog/infrastructure/persistence/entities/` | Clase definida, **no registrada en ningún módulo** |
| `ServicioPortafolioOrm`, `ReglaEnrutamientoOrm`, `RecomendacionPortafolioOrm` | `modules/portfolio-routing/infrastructure/persistence/` | Clases definidas, **no registradas** |
| Carpeta `modules/portfolio-routing/` | — | Contiene **solo** las 3 ORM entities: sin `.module.ts`, sin `domain/`, sin `application/`, sin `interfaces/` |
| Copy de UI | `apps/web/src/pages/HomePage.tsx:79,152-153` | Textos de marketing que prometen roadmap y recomendaciones del portafolio |

**No existe absolutamente nada de:**

- Ningún servicio, caso de uso, port, evaluador de reglas, parser de `condicion`, DTO, endpoint, esquema Zod ni componente React relacionado con enrutamiento o roadmap.
- Ninguna carpeta `deep-analysis` (RF-12/13/14).
- Ningún formato definido, documentado o inferible para el campo `regla_enrutamiento.condicion` (`varchar(2000)`). **Es una decisión de diseño completamente abierta.**
- Ningún dato de la "tabla de enrutamiento" prometida por INNLAB. El SRS (SA-03) la declara **pendiente de entrega y bloqueante**.

**Conclusión: no hay trabajo previo que duplicar. Los dos módulos nuevos arrancan sobre un modelo de datos ya migrado, pero con cero lógica y cero datos.**

### 6.4 Código muerto y groundwork sin uso (relevante para no reinventarlo ni confiar en ello)

| Artefacto | Situación |
| --- | --- |
| `apps/web/src/features/maturity-profile/utils/profile-insights.ts` | Recalcula en el cliente cuello de botella, asimetría y los 6 desequilibrios. **Solo lo importan sus propios tests.** Ningún componente lo usa. Duplica la lógica del backend y contradice el contrato, que exige no recalcular en cliente |
| `modules/questionnaire/domain/value-objects/completeness-report.vo.ts` | `CompletenessReport` definido, **nunca instanciado**. No existe `CompletenessChecker` |
| `shared-kernel/domain/result.ts` | `Result<T,E>` definido, **cero usos** |
| `shared-kernel/application/use-case.interface.ts` | `UseCase`/`Query` definidos, **ninguna clase los implementa** |
| `IrlLevel.diff()` | Método definido para el evaluador de desequilibrios; el evaluador usa `Math.abs` sobre números crudos |
| `queryKeys.catalog.sectors`, `.diagnostic.list`, `.detail`, `.progress` | Claves declaradas sin consumidor |
| `apps/api/src/modules/questionnaire/domain/entities/answer.entity.ts:1` | Importa `Uuid` sin usarlo (lo reporta ESLint) |

---

## 7. Patrones y puntos de extensión existentes

### 7.1 Patrón canónico para un módulo de dominio nuevo (backend)

El patrón está establecido y es consistente en los tres módulos completos (`irl-catalog`, `questionnaire`, `maturity-profile`). Un módulo nuevo se construye así:

```
src/modules/<contexto>/
├── domain/
│   ├── entities/ | <agregado>.aggregate.ts     // factory estático create() + fromPersistence() + toPersistence()
│   ├── value-objects/*.vo.ts                    // constructor privado + static create() que valida
│   ├── services/*.service.ts                    // servicios puros, sin IO ni decoradores
│   ├── errors/*.error.ts                        // extiende DomainError con `code` estable
│   └── ports/<x>.repository.port.ts             // export const X_REPOSITORY = Symbol('X'); export interface XPort
├── application/<caso-de-uso>.use-case.ts        // @Injectable, ports por @Inject(SYMBOL), un solo execute()
├── infrastructure/persistence/
│   ├── <tabla>.orm-entity.ts                    // @Entity({ schema, name }), columnas snake_case explícitas
│   └── typeorm-<x>.repository.ts                // @Injectable + @InjectRepository; mapea con fromPersistence
├── interfaces/http/<x>.controller.ts            // @ApiTags, @Controller('<recurso en español>')
└── <contexto>.module.ts                         // forFeature([...]) + binding { provide: SYMBOL, useClass: Adapter }
```

Y luego **registrar el módulo en `src/interfaces/http/api-v1.module.ts`** (paso obligatorio y fácil de olvidar: `maturity-profile` existió sin registrar durante un tiempo).

Dos variantes de binding coexisten en el código:
- `{ provide: SYMBOL, useClass: Adapter }` — la mayoritaria.
- `useFactory` + `inject: [SYMBOL]` para mantener una clase de aplicación **sin decoradores NestJS** (`GetQuestionnaireStructureQuery` en `IrlCatalogModule`). Es el único caso que respeta literalmente la regla de "application sin framework".

**Regla de composición inter-módulos, respetada hoy:** solo `DiagnosticModule` importa otros módulos de dominio (`QuestionnaireModule`, `MaturityProfileModule`). `MaturityProfileModule` importa `IrlCatalogModule` para leer catálogo por port. Los módulos exportan **símbolos de port**, no adaptadores.

### 7.2 Convención lingüística (verificada como cumplida)

Español para dominio, tablas, columnas y URLs (`Diagnostico`, `diagnostico`, `afirmacion`, `/diagnosticos`, `/catalogo`). Inglés para infraestructura y construcciones de framework (`Repository`, `UseCase`, `Port`, `Controller`, `MaturityProfile`, `AnswerSheet`). Los ORM entities usan el sufijo `Orm` y nombre en español (`RecomendacionPortafolioOrm`). Comentarios y docstrings están mezclados (mayoría en inglés, algunos bloques en español).

### 7.3 Configuración editable en tiempo de ejecución

**No existe ninguna.** Verificado:

- **Sin panel de administración**, ni backend ni frontend.
- **Sin feature flags** de ningún tipo.
- **Sin tablas de configuración** consultables/escribibles en runtime.
- Los catálogos (`irl_catalog`) son de solo lectura por diseño: el port `IrlCatalogRepositoryPort` **no declara ningún método de escritura**, y el adaptador tampoco los implementa. Cambiar catálogo = editar `seeds/data/` + `db:seed`.
- El único mecanismo de configuración es el conjunto de variables de entorno, leído **una vez al arranque**.

Esto es coherente con RF-15 del SRS ("Esa tabla es un catálogo fijo del sistema y no puede modificarse desde la interfaz") — pero implica que **cargar las reglas de enrutamiento y los textos de roadmap requiere escribir seeds nuevos y re-desplegar**, no una pantalla de gestión.

### 7.4 Autenticación y autorización — estado real

**No hay ninguna implementada.** Verificado por grep exhaustivo sobre `apps/api/src` y `apps/web/src`:

| Elemento | Estado real |
| --- | --- |
| Guard de Keycloak / `@UseGuards` | **Ninguna ocurrencia en el código** |
| Estrategia `passport-jwt` | No existe |
| Descarga/validación de JWKS | No existe |
| Decorador `@CurrentUser()` | No existe |
| Cliente de InnLab Core / `client_credentials` | No existe |
| Verificación de propiedad del diagnóstico | No existe |
| OIDC en el frontend | `ProtectedRoute` es un `return <>{children}</>` explícito |

Lo que **sí** existe es la **forma** de la autorización futura: la columna `keycloak_user_id` en 4 tablas, el campo `userId` del agregado `Diagnostico`, `findLatestByUserId`/`findAllByUserId` en el port, `ForbiddenError` (→403) en el shared kernel, y las variables de entorno de Keycloak como obligatorias para arrancar.

**Consecuencia operativa:** hoy cualquier cliente puede leer o sobrescribir el perfil de cualquier `diagnosticId` conocido.

### 7.5 Framework y patrón de pruebas

**Backend — Jest 30.4.2**, tres proyectos declarados en `apps/api/jest.config.js` (`unit`, `integration`, `e2e`), preset `ts-jest/presets/default-esm`, con `moduleNameMapper` que resuelve los sufijos `.js` de los imports ESM. Umbrales de cobertura por carpeta: `modules/maturity-profile/domain/` 95%, `modules/questionnaire/domain/` 90%.

- `test/unit/` — 25 suites. Espeja la estructura de `src/`. Dobles como objetos literales con `jest.fn()`. Property-based con **`fast-check`** en un solo archivo: `irl-calculator.service.spec.ts`.
- `test/integration/` — **una sola suite**: `database/seed.spec.ts`, con `@testcontainers/postgresql`.
- `test/e2e/` — **una sola suite**: `get-questionnaire-structure.e2e-spec.ts`, con `supertest` sobre el `AppModule` real. **Requiere una base de datos real ya poblada** (no usa Testcontainers), según su propio comentario.

**Frontend — Vitest 3.2.4** + Testing Library + jsdom; **MSW 2** para interceptar HTTP en dos suites de integración. Playwright 1.60 está configurado con `testDir: './tests/e2e'`, pero **esa carpeta no existe** → `test:e2e` no ejecuta ninguna spec.

**Resultados reales de ejecución (2026-09-06, en el árbol tal como está):**

| Comando | Resultado verificado |
| --- | --- |
| `apps/api` — `eslint "src/**/*.ts"` | ❌ **13 errores** |
| `apps/api` — `tsc --noEmit` | ❌ **10 errores** |
| `apps/api` — `jest --selectProjects unit` | ⚠️ **20 suites OK (226 tests), 5 suites no arrancan** |
| `apps/web` — `tsc --noEmit` | ✅ sin errores |
| `apps/web` — `vitest run` | ✅ **16 archivos, 137 tests, todos pasan** |

El detalle y la causa raíz están en §8.

---

## 8. Contradicciones detectadas

Se reportan tal como están, sin decidir cuál fuente tiene razón.

### A. Contradicciones internas del código (verificadas por ejecución)

**A-1. `pnpm typecheck` y 5 suites de test fallan por un `dist` desactualizado de `@innlab/contracts`.**
`packages/contracts/src/index.ts` exporta `./maturity-profile/gaps.schema.js` y `./maturity-profile/asymmetry.schema.js`, pero `packages/contracts/dist/maturity-profile/` **solo contiene** `bottleneck`, `dimension-result`, `imbalance` y `profile-response`. `grep -c CRITICAL_IRL_THRESHOLD dist/index.d.ts` = **0**.
El backend resuelve `@innlab/contracts` por `main`/`exports` → `dist`; el frontend por alias de Vite → `src`. De ahí que el frontend compile y el backend no.
Errores concretos: `maturity-profile.aggregate.ts:1` → `TS2305: Module '@innlab/contracts' has no exported member 'CRITICAL_IRL_THRESHOLD'`; `map-maturity-profile-response.ts:33` → `TS2353: 'strength' does not exist in type ...`. Y en Jest: `SyntaxError: The requested module '@innlab/contracts' does not provide an export named 'CRITICAL_IRL_THRESHOLD'` en 5 suites (`map-maturity-profile-response`, `get-maturity-profile.use-case`, `finalize-initial-diagnostic.use-case`, `diagnostic.controller`, y una más).
El README documenta `pnpm --filter @innlab/contracts build` como paso previo, pero **no hay `prebuild`/`predev` ni dependencia de tarea que lo garantice**.

**A-2. La capa `domain` importa NestJS, violando `CLAUDE.md` y el propio ESLint del repo.**
`apps/api/src/modules/maturity-profile/domain/services/imbalance-evaluator.service.ts:1` → `import { Injectable } from '@nestjs/common'`. Es la única violación en `domain/`, pero además `no-restricted-imports` prohíbe `@nestjs/*` en **`application/`**, y los 4 casos de uso lo importan:
`maturity-profile/application/compute-maturity-profile.use-case.ts:1`, `maturity-profile/application/get-maturity-profile.use-case.ts:1`, `questionnaire/application/submit-questionnaire.use-case.ts:1`, `diagnostic/application/finalize-initial-diagnostic.use-case.ts:1`.
`pnpm lint` en `apps/api` falla con 13 errores: 5 de `no-restricted-imports`, 6 de `@typescript-eslint/array-type`, 1 de `no-unsafe-assignment` (`maturity-profile.aggregate.ts:140`), 1 de `no-unused-vars` (`answer.entity.ts:1`, `Uuid`).

**A-3. La máquina de estados admite 9 estados; el `CHECK` de la base de datos solo admite 6.**
`migrations/20260518001-InitialSchema.ts` (`ck_diagnostico_estado`) enumera 6 valores, terminando en `PERFIL_GENERADO`. Ninguna migración posterior lo altera.
`modules/diagnostic/domain/diagnostic-state.vo.ts` y `packages/contracts/src/diagnostic/diagnostic.schema.ts` declaran **9** estados, incluyendo `ANALISIS_PROFUNDO_DECLINADO`, `ANALISIS_PROFUNDO_EN_CURSO` y `ANALISIS_PROFUNDO_COMPLETO`.
`finalize-initial-diagnostic.use-case.ts` incluye esos tres en `FINALIZABLE_STATES`, y `diagnostic.schema.ts` afirma explícitamente que "la lista de aquí debe coincidir exactamente con la de la BD". Un `save()` con cualquiera de esos tres estados violaría el `CHECK`.

**A-4. La atomicidad prometida no está implementada.**
`maturity-profile/domain/ports/maturity-profile.repository.port.ts` documenta: *"`save(profile)` MUST persist all six `resultado_dimension` rows inside a single database transaction"*. El adaptador `typeorm-maturity-profile.repository.ts` usa un solo `INSERT ... ON CONFLICT`, que es atómico para las 6 filas — pero `compute-maturity-profile.use-case.ts` ejecuta `await Promise.all([ profiles.save(...), imbalanceRepo.save(...) ])`: **dos operaciones sin transacción envolvente**. Si la segunda falla, la primera queda persistida. Esto contradice el criterio de aceptación de HU-11 ("no guarda resultados parciales") citado literalmente en los docstrings de `maturity-profile-calculation.error.ts` y `maturity-profile.aggregate.ts`.

**A-5. `es_cuello_botella` se escribe siempre en `false`.**
`typeorm-maturity-profile.repository.ts` fija `esCuelloBotella: false` en cada fila y **omite esa columna de la lista `.orUpdate([...])`**. El agregado sí calcula el cuello de botella (`MaturityProfile.bottleneck()`), y la API lo expone correctamente, pero la columna de la BD nunca refleja el valor. El docstring del port lo admite ("`es_cuello_botella` remains derived in the aggregate until a dedicated persist lands"), lo que contradice el MR y la existencia misma de la columna.

**A-6. `en_estado_critico` implementa una regla distinta a la del SRS.**
El repositorio escribe `enEstadoCritico: gapCodes.has(código)`, donde `gaps()` marca **cualquier** dimensión con `irlLevel <= 3`. El SRS RF-13 (`01-requirements/srs.tex`, línea ~617) restringe el "estado crítico" **exclusivamente a CRL, BRL y TmRL**, y dice: *"Las demás dimensiones (TRL, IPRL, FRL) no reciben esta alerta independientemente de su nivel"*. Además `dimension.es_dimension_critica` existe en la tabla para expresar justamente eso, pero `seeds/data/dimensions.ts` la deja en **`false` para las seis**.

**A-7. El campo `name` de `dimensionResults` devuelve el código, no el nombre.**
`map-maturity-profile-response.ts:26` emite `name: r.dimensionCode.value`. El contrato `dimension-result.schema.ts` describe `name` como *"Nombre completo de la dimensión en español"* y el `.min(1)` de Zod pasa igual porque `"TRL"` no está vacío. Consecuencia en cascada: `MaturityProfileSummary.tsx:12-19` **hardcodea su propio mapa** `DIMENSION_NAME_ES` (`TRL: 'Tecnología'`, …) y `HomePage.tsx` hardcodea un tercer juego de nombres (`TRL: 'Madurez Tecnológica'`, …), mientras que `shared/lib/dimensions.ts` documenta que los nombres "vienen del catálogo". Hay **tres fuentes distintas** de nombres de dimensión en el repositorio, más el `nombre_es` sembrado en la BD (`'Nivel de Madurez Tecnológica'`) — cuatro variantes en total.

**A-8. El interceptor HTTP del frontend descarta el Problem Details.**
`apps/web/src/shared/api/http.ts` rechaza con `new Error(error.message)` cuando `response.data` es un objeto — el caso normal. El `code` estable que el backend garantiza nunca llega a la UI. Contradice `packages/contracts/src/common/problem-details.schema.ts`, que documenta *"El frontend matchea sobre `code`, nunca sobre `title` o `detail`"*. Como efecto secundario, `query-client.ts::isHttpError` nunca encuentra `status` en el error, de modo que la política documentada "no reintentar 4xx" no se aplica jamás.

**A-9. `sectorId` es UUID en el contrato y `bigint` en la base de datos.**
`packages/contracts/src/initiative/initiative.schema.ts` define `sectorSchema.id: uuidSchema` y `registerInitiativeSchema.sectorId: uuidSchema`. La tabla `irl_catalog.sector.id_sector` es `bigint GENERATED ALWAYS AS IDENTITY` y `SectorOrm` lo mapea como `bigint`. Además ese mismo archivo afirma que los sectores "se gestionan por seed (`005-sectors.seed.ts`)" — **ese archivo no existe**.

**A-10. `missingStatementSchema.statementId` es UUID; el resto del contrato dice bigint-as-string.**
`packages/contracts/src/questionnaire/submission.schema.ts` usa `uuidSchema` para `statementId`, mientras `statement.schema.ts` y `answer.schema.ts` documentan y validan explícitamente lo contrario ("bigint como string, NO es un UUID"). Contradicción **interna al mismo paquete**. Lo mismo ocurre con `dimensionMetadataSchema.id: uuidSchema` (`catalog/dimension.schema.ts`) frente a `dimension.id_dimension integer`.

**A-11. `descripcion` de la iniciativa: opcional en el contrato, `NOT NULL` en la BD.**
`registerInitiativeSchema.descripcion` es `.optional()`; `iniciativa.descripcion_breve` es `varchar(1000) NOT NULL`.

**A-12. `bottleneck` es obligatorio en el esquema y opcional según su propio docstring.**
`profile-response.schema.ts` documenta *"Por eso `bottleneck` e `imbalances` son `.optional()` aquí"*, pero solo `imbalances` lleva `.optional()`; `bottleneck`, `strength`, `asymmetry` y `gaps` son requeridos.

**A-13. `submitQuestionnaireSchema` incluye `diagnosticId` en el body; el endpoint lo toma de la URL.**
El esquema exige `{ diagnosticId, answers }`, mientras `QuestionnaireController` lee el id de `@Param('id')` y el body solo de `{ answers }`. Ninguno de los dos esquemas Zod de envío (`submitQuestionnaireSchema`, `finalizeInitialDiagnosticRequestSchema`) se usa en el backend: los controladores tipan el body inline y **no hay validación de frontera efectiva**.

**A-14. Las ramas y algunos commits no siguen las convenciones documentadas.**
`docs/conventions/BRANCH-NOTATION.md` y `CLAUDE.md` exigen `IRL-<jira-id>-<short-summary>` desde `dev`. La rama real del repo de código es `refactor/restore-diagnostic-orchestrator` y la del repo de docs `refactor/epic-user-stories-refinement`. El commit `ada8ac3` (`fix: correct questionnaire adding 48-answer completeness guard before persisting`) no usa el formato `+ [scope] - [description]` obligatorio; los commits del repo de docs tampoco.

### B. Contradicciones entre la documentación interna del monorepo y el código

**B-1. `apps/api/docs/MODULES.md` describe un módulo `identity` completo que no existe.**
Líneas 27–61: `UserContext`, `UserContextPort`, `ResolveUserContextUseCase`, `JwksProvider`, `KeycloakStrategy`, `KeycloakGuard`, `InnlabCoreHttpClient`, `ServiceTokenProvider`, `UserContextCache`, `@CurrentUser()`, y el estado *"Walking skeleton. The guard and user context resolution work end-to-end."* **La carpeta `src/modules/identity/` no existe** y ninguno de esos identificadores aparece en el código.

**B-2. `apps/api/docs/MODULES.md` describe `portfolio-routing` como "empty folder" con reglas "already seeded".**
Realidad: la carpeta contiene 3 ORM entities, y `regla_enrutamiento`/`servicio_portafolio` **no tienen seed alguno**. Lo mismo para `report` ("empty folder", pero contiene `DescargaReporteOrm`) y `deep-analysis` ("empty folder": **la carpeta no existe**).

**B-3. `apps/api/docs/MODULES.md` atribuye a `irl-catalog` elementos inexistentes.**
Declara el dominio `Sector`, el método de port `getSectors()`, la query `GetConversionTableQuery`, el endpoint `GET /api/v1/catalogo/sectores` y un *"read-through in-memory cache"*. Nada de eso existe: el port solo tiene 5 métodos de lectura sin sectores, no hay caché, y `SectorOrm` vive en `modules/initiative/`. También nombra el código de par como `"TRL_CRL"` (guion bajo) cuando el seed y los repositorios usan `"TRL-CRL"` (guion medio).

**B-4. Endpoints documentados que no existen o difieren.**

| Documentado | Fuente | Real |
| --- | --- | --- |
| `POST /diagnosticos/:id/cuestionario/envio` | `docs/conventions/API-CONVENTIONS.md:33,44,74,138,235`; `apps/api/docs/MODULES.md` | `POST /diagnosticos/:id/cuestionario` |
| `GET /diagnosticos/:id/cuestionario` (progreso) | `apps/api/docs/MODULES.md` | No existe |
| `POST /diagnosticos` · `GET /diagnosticos` · `GET /diagnosticos/:id` | `apps/api/docs/MODULES.md`; `API-CONVENTIONS.md:20,107,179` | No existen |
| `GET /catalogo/sectores` · `GET /catalogo/tabla-conversion` | `MODULES.md`; comentario en `irl-catalog.controller.ts:14` | No existen |
| `POST /diagnosticos/:id/perfil/calculo` | `API-CONVENTIONS.md:45` | No existe |
| `POST /diagnosticos/:id/finalizar-inicial` | — | **Existe pero no está documentado en ninguna convención** |
| Swagger en `/api/v1/docs` | `README.md`, `apps/api/README.md:48`, `API-CONVENTIONS.md:216` | `/api/docs` |
| Swagger *"non-production only"* | `API-CONVENTIONS.md:216`, `apps/api/README.md:48` | Montado **incondicionalmente** en `main.ts:76` |

**B-5. `apps/api/docs/MODULES.md` inventa clases del módulo `maturity-profile` y del orquestador.**
Nombra `BottleneckDetectorService` (no existe: la lógica es un método del agregado), `Bottleneck` e `ImbalancePair` como VOs (los reales son `ImbalanceResult` y una función del agregado), `CalculationError` (el real es `MaturityProfileCalculationError`), y en `diagnostic` los casos de uso `StartDiagnosticUseCase`, `AdvanceToQuestionnaireUseCase`, `ListMyDiagnosticsUseCase`, `GetDiagnosticDetailUseCase`, además de `InitialProfileGeneratedEvent` — **no existe sistema de eventos de dominio en el código**.

**B-6. Los `README.md` por módulo describen un "Stage 1" ya superado.**
`src/modules/diagnostic/README.md` afirma *"`diagnostic.module.ts` — empty `@Module({})`"*; `src/modules/irl-catalog/README.md` afirma *"No domain entities, no use cases, no repositories, no controllers"*; `src/modules/maturity-profile/README.md` afirma *"`maturity-profile.module.ts` — empty `@Module({})`, intentionally NOT imported by `ApiV1Module`"*. Los tres módulos están hoy completamente implementados y registrados. Estos README también referencian una historia **"HU-34"** y archivos `IMPLEMENTATION.md` y `PROJECT-SUMMARY.md` que **no existen en ninguno de los dos repositorios**.

**B-7. `apps/web/docs/MODULES.md` describe cuatro features y un árbol de componentes inexistentes.**
Documenta `features/auth`, `features/diagnostic`, `features/consent`, `features/initiative` — **ninguna existe**. Para `maturity-profile` lista `MaturityProfileView`, `RadarChart`, `DimensionResultCard`, `DimensionResultGrid`, `BottleneckCallout`, `ImbalanceList`, `ImbalanceItem`, `KthAttributionFooter`, `irl-level-color.ts`, `radar-data-shape.ts`. Los archivos reales son `MaturityProfilePanel`, `MaturityRadarChart`, `MaturityProfileSummary`, `radar-helpers.ts`, `profile-insights.ts`. **Cero coincidencias.** Además atribuye a ese feature la historia HU-11 y el "RF-11", cuando RF-11 es la oferta de análisis profundo.

**B-8. `docs/conventions/TESTING-CONVENTIONS.md` describe herramientas y rutas que no existen.**
Línea 40: `import { fc, it as itProp } from 'fast-check-jest'` — el paquete instalado es `fast-check`, no `fast-check-jest`. Línea 202: E2E en `apps/web/tests/e2e/` — **esa carpeta no existe**, aunque `playwright.config.ts` la declara como `testDir`.

**B-9. Enlaces documentales rotos o a archivos inexistentes.**
`README.md` → `docs/workflows/local-setup.md` (el real es `LOCAL-SETUP.md`). `apps/api/README.md` → `docs/error-codes.md`, `docs/testing-recipes.md`, `docs/workflows/debugging-keycloak.md`, `docs/conventions/api-design.md`, `docs/environments/env-variables.md` — **ninguno existe**. `CLAUDE.md` → `docs/architecture/domain-model.md`, `docs/architecture/overview.md`, `docs/architecture/decisions/`, `docs/conventions/code-style.md`, `apps/web/docs/state-management.md` — **la carpeta `docs/architecture/` no existe** y los dos últimos difieren en mayúsculas. `packages/contracts/src/common/problem-details.schema.ts` y `API-CONVENTIONS.md` → `apps/api/docs/error-codes.md` (inexistente). `apps/web/docs/MODULES.md:5` → `apps/api/docs/modules.md` (minúsculas). El `README.md` raíz además contiene una **frase truncada**: *"This documentation is based on ho"*.

**B-10. `shared-kernel/domain/value-objects/dimension-code.ts` cita como fuente autoritativa un archivo vacío.**
Su docstring dice *"Authoritative source: schema.sql in the docs repository"*. `sistema-diagnostico-irl-docs/03-data-model/scripts/schema.sql` tiene **0 bytes**.

**B-11. `docker-compose.yml` no soporta lo que el README promete.**
El README instruye `pnpm keycloak:up` y anuncia Keycloak en `:8080` y Mailpit en `:8025`; ambos servicios están **comentados** en `docker-compose.yml`. Postgres está expuesto en el puerto host **5433**, no 5432.

**B-12. `apps/web/docs/STATE_MANAGEMENT.md:147` invoca "SA-06" para justificar la inmutabilidad de catálogos.**
SA-06 en el SRS es *"Marco IRL estable durante el MVP"*; la inmutabilidad de catálogos no es una suposición numerada del SRS.

### C. Contradicciones entre las dos fuentes de documentación

**C-1. Numeración de épicas incompatible.**
`CLAUDE.md`, `README.md`, `apps/api/docs/MODULES.md:5` y `apps/web/docs/MODULES.md:9` afirman todos: *"Phase 1 implements user stories from epics **E-03 (Cuestionario IRL)** and **E-04 (Diagnóstico inicial de madurez)**"*.
`sistema-diagnostico-irl-docs/01-requirements/backlog.md` numera: **E-02** = Cuestionario IRL (líneas 179+), **E-03** = Diagnóstico inicial de madurez (274+), **E-04** = **Análisis profundo, roadmap y recomendación** (413+). Con la numeración del backlog, la frase del monorepo diría que la fase 1 implementa el roadmap y el enrutamiento — que es exactamente lo que **no** está implementado.
Consecuencia derivada: `apps/api/docs/MODULES.md` habla de épicas **E-06** y **E-07** que no existen en el backlog (que termina en E-05).

**C-2. La tabla de conversión se atribuye a "SA-06" en todo el código, y el SRS la ubica en otro sitio.**
`CLAUDE.md` dice *"Conversion table is fixed (SA-06)"*, y las cadenas "SA-06 conversion table" aparecen en `migrations/002`, `conversion-range.ts`, `irl-catalog/README.md`, `irl-calculator.service.ts`, `dimension-result.schema.ts`, `seeds/data/conversion-ranges.ts`.
En el SRS: **SA-06** es *"Marco IRL estable durante el MVP"*. La suposición sobre la escala Likert es **SA-01**, que remite la tabla de conversión a **"RF-06"**. Y la tabla real (idéntica en valores a la implementada) está en **RF-07** (`srs.tex` líneas 503–535). Es decir: SRS internamente inconsistente (SA-01 apunta a RF-06 en lugar de RF-07) **y** desalineado con la etiqueta que usa todo el código.

**C-3. El C4 Nivel 2 modela los catálogos como archivos estáticos; el modelo de datos y el código los ponen en Postgres.**
`02-sytstem-design/architecture-diagrams/NIVEL2.pdf` declara un contenedor *"Catálogos IRL — [Container: Archivos de configuración estática]"* con acceso *"[Lectura local]"*, separado de `diagnostico_irl_db`. El MR (`03-data-model/diagrams/mr.pdf`) y las migraciones implementan el esquema `irl_catalog` **dentro de la misma base Postgres**.

**C-4. Referencias cruzadas rotas dentro del backlog.**
HU-22 dice *"el motor de reglas (HU-20) generó una recomendación"* y *"la recomendación queda disponible para el reporte completo (HU-21)"*. Según el propio backlog, HU-20 es la diferenciación visual del roadmap, HU-21 es el motor de enrutamiento, y el reporte completo es HU-23/HU-24.

**C-5. Existe un "RF-18" en documentos que el SRS no define.**
`apps/api/docs/MODULES.md` (sección `notifications`) menciona *"phase 2 (RF-18)"* y el C4 Nivel 3 rotula un flujo *"5, 10 · Notifica [RF-17, 18]"*. El SRS termina en **RF-17**.

**C-6. Estados de historias del backlog vs. código.**
El backlog marca `Completada` las HU-07 a HU-15. Verificable: HU-07/08/09/10 (cuestionario) y HU-11/12/13/14/15 (perfil) sí tienen implementación funcional. Pero HU-13 ("gráfico radar") y HU-14 exigen que *"los nombres de las dimensiones son visibles en el gráfico"*; la API devuelve el código en `name` y el frontend usa nombres hardcodeados propios (ver A-7). **[INCIERTO]** si eso se considera cumplimiento del criterio.

**C-7. El SRS declara la tabla de enrutamiento como bloqueante y no entregada.**
SA-03: *"La tabla que define qué combinación de niveles dimensionales corresponde a cada servicio del portafolio **debe ser entregada por INNLAB antes del inicio de la implementación de RF-15**. […] Esta tabla es un insumo indispensable y su ausencia bloquea ese módulo."* El historial de versiones del SRS (v1.3) registra *"actualización de SA-03 sobre el estado pendiente de la tabla de enrutamiento"*. En cambio, `apps/api/docs/MODULES.md` afirma que las reglas están *"already seeded"* — no lo están.

---

## 9. Vacíos identificados

### 9.1 Documentado (en cualquiera de las dos fuentes) pero sin ningún rastro en el código

| Elemento | Dónde está documentado |
| --- | --- |
| **Toda la autenticación/autorización**: guard Keycloak, validación JWT, JWKS, `@CurrentUser`, cliente InnLab Core con `client_credentials`, caché de contexto de usuario, verificación de propiedad | SRS RF-00/RF-01, RNF-03/04/05; C4 N1/N2/N3; `apps/api/docs/MODULES.md`; `apps/api/README.md`; `CLAUDE.md` |
| **Integración OIDC en el frontend** | `apps/web/docs/MODULES.md` (`features/auth`); `.env.example`; deps instaladas |
| **Consentimiento Ley 1581** (RF-03): dominio, caso de uso, endpoint, pantalla | SRS RF-03, HU-05; MODULES.md; contrato `consent.schema.ts` |
| **Registro de iniciativa** (RF-04): dominio, caso de uso, endpoint, pantalla, catálogo de sectores | SRS RF-04, HU-06, SA-08; contrato `initiative.schema.ts` |
| **Ciclo de vida del diagnóstico** (RF-02): crear, listar, obtener detalle | SRS RF-02, HU-03/HU-04 |
| **`CompletenessChecker`** y `QuestionnaireIncompleteError` con reporte de faltantes | `apps/api/docs/MODULES.md`; `submission.schema.ts`; RF-06 |
| **Análisis profundo** (RF-11/12/13): bifurcación, clasificación de brechas, alertas CRL/BRL/TmRL ≤3 | SRS RF-11–13; HU-16/17/18; C4 N3 "Módulo de Análisis Profundo" |
| **Roadmap de escalamiento** (RF-14): generación, catálogo de textos poblado, diferenciación visual | SRS RF-14; HU-19/HU-20; tabla `texto_roadmap` |
| **Enrutamiento al portafolio** (RF-15): motor de reglas, formato de `condicion`, datos de servicios y reglas | SRS RF-15/SA-02/SA-03; HU-21/HU-22; C4 N3 "Módulo de Enrutamiento" |
| **Reporte y descarga PDF** (RF-16) | SRS RF-16; HU-23/HU-24 |
| **Notificaciones por correo** (RF-17): `MailerPort`, adaptador nodemailer, envío | SRS RF-17/SA-09; HU-25 |
| **Auditoría**: `RecordAuditEventUseCase`, escritura de `evento_auditoria` | `apps/api/docs/MODULES.md`; tabla creada |
| **Sistema de eventos de dominio** (`AnswersSubmittedEvent`, `InitialProfileGeneratedEvent`) | `apps/api/docs/MODULES.md` |
| **Caché de catálogo** read-through | `apps/api/docs/MODULES.md`; `irl-catalog.repository.port.ts` |
| **E2E Playwright** (una spec por historia) | `TESTING-CONVENTIONS.md`; `playwright.config.ts` |
| **`docs/architecture/`** completo: `overview.md`, `domain-model.md`, ADRs | `CLAUDE.md` (los declara fuente autoritativa) |
| **`schema.sql`** del repo de docs | Existe como archivo de **0 bytes**; citado como fuente autoritativa por el código |

### 9.2 Implementado en el código pero sin documentar en ninguna parte

| Elemento | Ubicación |
| --- | --- |
| **`POST /api/v1/diagnosticos/:id/finalizar-inicial`** — el endpoint central del flujo actual: no aparece en `API-CONVENTIONS.md`, ni en `MODULES.md`, ni en el SRS, ni en el backlog | `diagnostic.controller.ts` |
| **`strength()`, `asymmetry()`, `gaps()`** en el agregado y en el response del perfil — no corresponden a ningún RF ni HU | `maturity-profile.aggregate.ts`; `profile-response.schema.ts` |
| **`CRITICAL_IRL_THRESHOLD = 3`** como constante de contrato | `packages/contracts/src/maturity-profile/gaps.schema.ts` |
| **Endpoints de salud** `/health/live` y `/health/ready` | `health.controller.ts` |
| **Correlation ID** (`x-correlation-id` entrante, `X-Correlation-Id` saliente desde el SPA) y su propagación a logs y errores | `app.module.ts`, `http.ts` |
| **Diagnóstico demo sembrado** (`a0eebc99-…-380a11`, `usuario-demo`) y su UUID **hardcodeado en el CTA del landing** | `seeds/index.ts`; `HomePage.tsx:83` |
| **`InProgressPage`** como patrón de stub de ruta | `pages/InProgressPage.tsx` |
| **Aislamiento de borrador por `diagnosticId`** en el store Zustand | `questionnaire-draft.store.ts` |
| **`profile-insights.ts`** — motor de insights cliente completo, con tests, sin consumidores | `features/maturity-profile/utils/` |
| **Idempotencia del seed** vía `ON CONFLICT` sobre claves naturales, y la validación en tiempo de import de "48 afirmaciones / 8 por dimensión" | `seeds/index.ts`, `seeds/data/statements.ts` |
| **Los 48 textos de afirmaciones** están en el código, marcados como provisionales, y **no existen en el repo de documentación** | `seeds/data/statements.ts` |
| **`buildOrmDataSourceOptions` vs `buildOrmModuleOptions`** — dos conjuntos de entidades distintos (glob para CLI, `autoLoadEntities` para runtime) | `ormconfig.factory.ts` |

### 9.3 Vacíos que bloquean directamente los dos módulos nuevos

1. **No existe la tabla de enrutamiento de INNLAB.** SA-03 la declara indispensable y pendiente. `regla_enrutamiento` está vacía.
2. **No existe el formato del campo `condicion`** (`varchar(2000)`). Ni el código, ni el SRS, ni el MR, ni ningún doc definen si es DSL, JSON, SQL, expresión booleana o texto. Es una decisión abierta de diseño.
3. **No existen los 54 textos de roadmap** (6 dimensiones × 9 niveles). `texto_roadmap` está vacía y HU-19 exige fallar en bloque si falta alguna combinación.
4. **No existe el catálogo de servicios del portafolio.** El SRS SA-02 los nombra en prosa (formación, mentoría, consultoría, retos en el aula, proyectos integradores, proyectos de grado — SA-03 omite "retos en el aula"), pero `servicio_portafolio` está vacía.
5. **No hay identidad de usuario en runtime.** Sin ella, no hay forma de asociar recomendaciones a un usuario ni de autorizar su lectura.
6. **No hay forma de crear un diagnóstico.** El único existente es el sembrado por el seed.

---

## 10. Observaciones para los módulos nuevos

Esto no es un diseño. Son las restricciones y hechos verificados que cualquier plan de implementación debe respetar o contradecir conscientemente.

### 10.1 El modelo de datos ya está migrado — no lo re-migre

Las cuatro tablas que necesitan ambos módulos (`texto_roadmap`, `servicio_portafolio`, `regla_enrutamiento`, `recomendacion_portafolio`) **ya existen en la base de datos** con sus FKs y restricciones, y sus ORM entities ya están escritas. Lo que falta es: registrarlas en un `TypeOrmModule.forFeature()`, poblarlas por seed, y escribir dominio/aplicación/interfaces. Crear migraciones nuevas para estas tablas duplicaría el esquema.

Restricciones de BD que condicionan el diseño y que **no se pueden ignorar sin una migración**:

- `recomendacion_portafolio.id_diagnostico` es **`UNIQUE`** → una y solo una recomendación por diagnóstico, coherente con RF-15 ("exactamente una recomendación, no una lista ordenada").
- `recomendacion_portafolio.id_regla` es **`NOT NULL` con FK** → toda recomendación **debe** provenir de una regla persistida. No hay lugar para una recomendación por defecto sin regla asociada. El "escenario de error" de HU-21 (ninguna regla coincide) obliga a fallar, no a insertar una fila vacía.
- `servicio_snapshot varchar(80)` y `justificacion_criterio varchar(1000)` son `NOT NULL` → el snapshot del nombre y la justificación son obligatorios en el momento de generar.
- `texto_roadmap` tiene `UNIQUE (id_dimension, nivel_irl)` y `CHECK nivel_irl BETWEEN 1 AND 9` → el catálogo completo son exactamente 54 filas.
- `regla_enrutamiento.prioridad` **no es única** → hay que definir el desempate.

### 10.2 De dónde leer el perfil

La fuente persistida es `irl_diagnostic.resultado_dimension` (6 filas por diagnóstico), más `analisis_desequilibrio` (6 filas). Advertencias verificadas:

- **`es_cuello_botella` está siempre en `false` en la BD** (A-5). Si el motor de roadmap necesita el cuello de botella, debe derivarlo del mínimo de `nivel_irl`, o llamar a `GetMaturityProfileUseCase` / `MaturityProfile.bottleneck()`, no leer esa columna.
- **`en_estado_critico` implementa "IRL ≤ 3 en cualquier dimensión"**, no la regla RF-13 restringida a CRL/BRL/TmRL (A-6). RF-13 es precisamente insumo del roadmap (RF-14 exige diferenciar visualmente las dimensiones críticas). Hay que decidir si se corrige la semántica de la columna, se añade otra, o se calcula aparte.
- **`dimension.es_dimension_critica` está en `false` para las seis dimensiones** en el seed. Si se quiere usar como fuente de la regla RF-13, hay que sembrarla con `true` para CRL, BRL y TmRL.
- La clasificación se guarda en español/mayúsculas en la BD (`CRITICO`/`MODERADO`/`ACEPTABLE`) y se expone en inglés/minúsculas en HTTP. La traducción vive en un único mapper.

### 10.3 Convenciones que hay que respetar

- **Idioma:** dominio, tablas, columnas y URLs en español (`RecomendacionPortafolio`, `/diagnosticos/:id/recomendacion`, `/diagnosticos/:id/roadmap`); infraestructura y framework en inglés (`Repository`, `UseCase`, `Port`).
- **Casos de uso:** una clase, un método `execute(command)`, ports inyectados por `Symbol`.
- **Ports:** `export const X_REPOSITORY = Symbol('X_REPOSITORY')` + interface en `domain/ports/`; binding en el `.module.ts`.
- **Composición inter-módulos:** solo `DiagnosticModule` orquesta. Un módulo de roadmap o de enrutamiento **no debe** invocar directamente a `MaturityProfileModule`; el orquestador compone y pasa IDs. Esto coincide con el C4 Nivel 3 (*"Ningún servicio llama a otro directamente"*).
- **Catálogos de solo lectura:** el port de catálogo no expone escritura por diseño. Las reglas y textos se cargan por seed, no por API ni por panel (coherente con RF-15: *"no puede modificarse desde la interfaz"*). **No existe ningún mecanismo de configuración editable en runtime en el que apoyarse.**
- **Errores:** subclases de `DomainError` con `code` estable; el `DomainExceptionFilter` los traduce. Un `code` nuevo (p. ej. `ROUTING_NO_RULE_MATCHED`, `ROADMAP_TEXT_MISSING`) requiere ampliar el mapeo del filtro si se quiere un status distinto de 400. **El catálogo de códigos de error (`docs/error-codes.md`) que la documentación referencia no existe.**
- **Contratos:** el esquema Zod va en `packages/contracts/src/<contexto>/` y se re-exporta en `src/index.ts`. **Recordar reconstruir el paquete** (ver 10.5).
- **Ramas y commits:** `IRL-<jira-id>-<short-summary>` desde `dev`; commits `<type>: <action> + [<scope>] - [<description>]` en inglés y minúsculas, verificados por commitlint en `commit-msg`.

### 10.4 Decisiones ya tomadas que no conviene contradecir sin razón

1. **La conversión Likert→IRL es una tabla en BD (`rango_conversion`), no constantes en código.** Los rangos son inclusivos en ambos extremos y contiguos con paso 0.01.
2. **Los seis pares de desequilibrio están fijados** en `par_dimension`, con `codigo_par` en formato `"A-B"` (guion medio) y reconstruidos por `split('-')`. Un formato de código distinto rompería los dos repositorios que lo parsean.
3. **Los IDs de agregado son UUID generados por la aplicación** (`Uuid.generate()`), no por Postgres. Los IDs de catálogo y de filas de detalle son `bigint`/`integer` IDENTITY, y TypeORM devuelve los `bigint` como **string**.
4. **El cuello de botella maneja empates y devuelve un array.** Ni el roadmap ni el enrutamiento deben asumir cardinalidad 1.
5. **Los valores `numeric` requieren un `transformer`** para no llegar como string (patrón ya presente en `RangoConversionOrm` y `ResultadoDimensionOrm`).
6. **La escritura de conjuntos usa `INSERT ... ON CONFLICT ... DO UPDATE`** vía QueryBuilder, salvo `respuesta` que usa DELETE+INSERT en transacción. **Ojo:** el patrón `.orUpdate([columnas])` obliga a listar explícitamente las columnas actualizables — omitir una es exactamente el bug A-5.
7. **El estado `ANALISIS_PROFUNDO_*` existe en el tipo pero la BD lo rechaza** (A-3). Cualquier flujo de análisis profundo (que es donde viven RF-14 y RF-15 según el SRS) **requiere primero una migración que amplíe `ck_diagnostico_estado`**.

### 10.5 Limitaciones técnicas que hay que resolver antes o durante

- **El árbol no compila hoy.** `pnpm typecheck` y 5 suites de test del backend fallan por el `dist` desactualizado de `@innlab/contracts` (A-1). `pnpm --filter @innlab/contracts build` es un prerrequisito no automatizado. Cualquier plan que añada esquemas al contrato hereda este problema; conviene automatizar la dependencia de build.
- **`pnpm lint` falla con 13 errores en el backend** (A-2), incluidas 5 violaciones de la regla arquitectónica de "domain/application sin framework". Si un módulo nuevo usa `@Injectable()` en `application/`, replicará la violación; si no lo usa, necesita `useFactory` como `GetQuestionnaireStructureQuery`. **La decisión sobre este punto está abierta y afecta directamente cómo se escriben los casos de uso nuevos.**
- **No hay validación efectiva en la frontera HTTP.** Los controladores tipan el body inline, así que el `ValidationPipe` global no actúa y los esquemas Zod del contrato no se ejecutan en el backend. Endpoints nuevos deben decidir explícitamente su estrategia (DTO con class-validator, o un pipe Zod).
- **No hay transacción envolvente en la orquestación** (A-4). Si el enrutamiento y el roadmap se persisten junto al perfil, el patrón `Promise.all` actual dejará estados parciales — justo lo que HU-19 y HU-21 prohíben en sus escenarios de error.
- **No hay identidad ni autorización.** Los endpoints nuevos serán públicos como los actuales salvo que se implemente primero el guard.
- **El frontend descarta el `code` de los errores** (A-8). Los escenarios de error de HU-19 ("catálogo incompleto") y HU-21 ("ninguna regla coincide") exigen mensajes específicos al usuario, imposibles de distinguir con el interceptor actual.
- **No existe forma de crear un diagnóstico** ni de llegar al estado de análisis profundo por la UI; el único diagnóstico navegable es el UUID demo hardcodeado en el landing.
- **`texto_roadmap` no está registrada en `IrlCatalogModule`**, y las tres entidades de `portfolio-routing` no están registradas en ningún lado: sin `forFeature()` no se cargan en runtime.
- **El proyecto no cumple hoy su propia definición de "done"** (`CLAUDE.md`: typecheck, lint y tests deben pasar). Conviene decidir si eso se sanea antes de construir encima.

### 10.6 Insumos externos que faltan y que no dependen del equipo de desarrollo

Según el SRS, tres entregables de INNLAB son prerrequisito y **no están en ninguno de los dos repositorios**:

| Insumo | Referencia | Bloquea |
| --- | --- | --- |
| Tabla de enrutamiento (combinación de niveles → servicio) | SA-03 — *"su ausencia bloquea ese módulo"* | Motor de enrutamiento (RF-15) |
| Textos de orientación por dimensión y nivel (54 entradas) | RF-14 — *"catálogo fijo […] con una entrada por cada combinación posible"* | Generador de roadmap (RF-14) |
| Catálogo de sectores económicos | SA-08 | RF-04 (dependencia indirecta) |

Además, los 48 textos de afirmaciones actualmente sembrados están marcados en el propio código como **provisionales, pendientes de aprobación de stakeholders**.

---

*Fin del reporte. Todos los hechos de las secciones 1–7 fueron verificados contra el código fuente, las migraciones, los seeds, `node_modules` y la ejecución real de las herramientas de calidad en la fecha indicada. Las secciones 8 y 9 reportan discrepancias sin arbitrarlas.*
