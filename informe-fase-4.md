# Informe de cierre — Fase 4 (reestructuración DDD)

> **Instantánea previa al cierre.** Este informe describe el estado a 2026-09-19 *antes* de cerrar los pendientes. Los pendientes de §1 (documentos, e2e, cableado de consentimiento, eventos, ESLint, glob de entidades, propiedad del recurso) se resolvieron después; el estado vigente está en `backlog-deuda-tecnica.md` (sección 14) y `convenciones-objetivo.md` (§8). Se conserva como registro, no como estado actual.

Fecha: 2026-09-19. Ramas/commits: `c9a5eed` … `0869dbf` (8 commits, sin push).

## 1. ¿Terminó completa?

**La reestructuración de código (las 7 oleadas) sí terminó. La fase, como conjunto de entregables, no está completa del todo.**

| Pendiente | Detalle |
|---|---|
| Consolidación de migraciones (`convenciones-objetivo.md` §6) | No se hizo. Siguen las 22 migraciones incrementales. Se dejó para después de la fase estructural y no se ejecuta sin confirmación. |
| Documentos | **No están actualizados** (ver §5). |
| e2e | Nunca pudieron ejecutarse en este entorno (Node 22 vs. `jose`/`jwks-rsa`, que requiere Node ≥ 24.9). El arranque real de `AppModule` con los listeners de eventos nunca se probó de punta a punta. |
| Cableado de estado por consentimiento | Ver §2. |
| Carpetas vestigiales | `modules/audit`, `modules/notifications`, `modules/report` siguen siendo carpetas con una sola entidad ORM (`infrastructure/persistence/`). Fuera de alcance (`reporting/` no se construía en esta fase). |

## 2. La frontera de `consent`

**Decisión (confirmada por producto):** `consent` **se traslada a `initiative/`**, no se queda en `diagnosis/`. Razón: la Ley 1581 liga el consentimiento a los datos que se tratan, y buena parte son los de la iniciativa.

**Cómo quedó en el código (Oleada 3, `9fe9c0f`):**
- `modules/initiative/` tiene entidad `Consent`, puerto `ConsentRepositoryPort`, `RecordConsentUseCase` / `GetConsentUseCase`, `ConsentController` y su ORM entity. La tabla se renombró `consentimiento` → `consent`.
- El texto de términos vive como constante del backend (`CURRENT_TERMS_VERSION = 'v1'`); una versión desactualizada devuelve `ConflictError` (vía `Result`, Oleada 6).
- `modules/consent/` ya no existe. `diagnosis/` no contiene lógica de consentimiento.

**Lo que NO quedó resuelto — dos huecos:**
1. `RecordConsentUseCase` guarda el consentimiento pero **no avanza el estado del diagnóstico** (`STARTED → WITH_CONSENT`). La máquina de estados de `diagnosis/` conserva `WITH_CONSENT` y `WITH_INITIATIVE`, pero nada las dispara. No es una regresión: ese endpoint no existía antes (se construyó desde cero) y las transiciones nunca estuvieron cableadas. La vía natural es un evento (`ConsentRecordedEvent`, escuchado por `diagnosis/`, por tanto en `shared/kernel/events/`), pero no se implementó.
2. Ni `RecordConsentUseCase` ni `RegisterInitiativeUseCase` verifican que el `diagnosticId` exista ni que pertenezca al usuario. Está anotado en el docblock de `InitiativeModule` como diferido.

## 3. Qué se movió, y pruebas por oleada

Pruebas = `apps/api` unit + integración (Testcontainers), que es lo único ejecutable. En **todas** hay 1 suite que no carga (`cognito-jwt.strategy.spec.ts`, problema de Node 22), ya existente antes de la fase. Cifras reconstruidas del registro de la sesión (última corrida completa antes de cada commit), no re-ejecutadas commit por commit.

| # | Commit | Qué se movió / cambió | API | Web |
|---|---|---|---|---|
| 1 | `c9a5eed` | `shared-kernel/` + `identity/` + `irl-catalog` (taxonomía) → `shared/{kernel,identity,irl-taxonomy}` | 467 ✔ | 202 ✔ |
| 2 | `4e66335` | `diagnostic` + `questionnaire` + `maturity-profile` + `statement` → `modules/diagnosis/` | 467 ✔ | 202 ✔ |
| 3 | `9fe9c0f` | `initiative` promovido a módulo con dominio propio; `consent` absorbido; migración de nombres en inglés | 470 ✔ | 202 ✔ |
| 4 | `3f2e2f8` | `portfolio-routing` → `routing/`; se retira el versionado de configuración (singleton `scoring_parameters`, migración 021); catálogo por puerto en vez de `DimensionOrm` | 485 ✔ | 202 ✔ |
| 5 | `8960e4b` | `scaling-roadmap` → `roadmap/`; se retira `dimension_dependency.is_active` (migración 022); ESLint queda con una sola nomenclatura | 485 ✔ | 202 ✔ |
| 6 | `dddb20a` | `Result<T,E>` en 11 casos de uso; `unwrapResult()` mantiene idéntico el formato RFC-7807 | 490 ✔ | 202 ✔ |
| 7 | `5929eab` | Eventos de dominio (`@nestjs/event-emitter`): `DeepAnalysisRequestedEvent` en `shared/kernel/events/`; listeners independientes en `routing/` y `roadmap/`; el frontend acepta el análisis en vez de llamar a routing | 507 ✔ | 204 ✔ |
| — | `0869dbf` | (Post-fase) `infrastructure/` e `interfaces/` eliminados de `src/`: migraciones, seeds, filtros HTTP y `health.controller` → `shared/kernel/{infrastructure,presentation}`; `ApiV1Module` → `ApiModule` (`src/api.module.ts`) | 507 ✔ | — |

Además de las pruebas: `tsc` limpio en api y web al cierre de cada oleada; ESLint de api sin errores nuevos.

**Verificación que sí falta:** e2e (ver §1) y ESLint de `apps/web` (no resuelve `eslint-plugin-boundaries`; falla igual sin los cambios de la fase).

## 4. Decisiones de diseño a tener presentes

- **Eventos:** un evento vive en `shared/kernel/events/` solo si otro módulo lo escucha; los dos eventos "calculado" (`routing/`, `roadmap/`) están en su módulo hasta que `reporting/` los escuche.
- **Repetir `POST /diagnostics/:id/deep-analysis`** no cambia el estado pero **vuelve a publicar el evento**, para que un cálculo fallido pueda reintentarse.
- **UX:** el mensaje específico "no hay configuración de enrutamiento activa" ya no llega a `RecommendationPage`; el fallo del listener solo se registra en el servidor y la página muestra un mensaje genérico.
- **Prefijo `api/v1`:** sigue fijado en `main.ts`; solo se renombró el módulo.

## 5. Estado de los documentos — pendientes de actualizar

Ninguno se actualizó como parte de la Fase 4 salvo rutas puntuales.

| Documento | Estado |
|---|---|
| `convenciones-objetivo.md` (sin commit) | Desactualizado: §1.3 aún marca `consent` como **[PREGUNTA ABIERTA]**; §2 dice que `api-v1.module.ts` vive en `interfaces/http/`; menciona `shared-kernel/` y rutas previas. |
| `backlog-deuda-tecnica.md` (sin commit) | Sin marcar como resueltos: 5.6 (versionado), 1.3/3.2 en `routing`/`roadmap` (acceso a `DimensionOrm`), 3.1 (`Result` ya adoptado), 1.5 (`initiative`/`consent` ya con dominio). Sigue abierto en `diagnosis/`: acceso directo a `DimensionOrm`. |
| `apps/api/docs/MODULES.md` | Muy desactualizado (solo se corrigió una ruta de seeds). |
| `apps/api/README.md` | Solo se actualizó el árbol de `infrastructure/`/`interfaces/`; el resto del árbol de módulos sigue en nomenclatura vieja. |
| `CLAUDE.md` (raíz) y `docs/conventions/` | Contradicen la política vigente: piden dominio en español y `domain/ports/`; el código está en inglés con `domain/repositories/`. |
| `apps/web/docs/MODULES.md` | Sin tocar; documenta features `consent`/`initiative` que no existen (backlog 6.3). |
| `packages/contracts` | Carpetas con nombres viejos (`portfolio-routing/`, `scaling-roadmap/`, `diagnostic/`, …). |

## 6. Otros hallazgos abiertos (no bloquean)

- Ruta backend `finalizar-inicial` vs. `finalize-initial` en el frontend (`diagnostic.api.ts`), previa a la fase.
- `ormconfig.factory.ts`: el glob de entidades del CLI (`modules/**/infrastructure/persistence/**`) apunta a una ruta que ya no existe; migraciones y seeds no dependen de él.
- `eslint-plugin-boundaries`: la regla `element-types` no dispara (sintaxis de selector antigua); solo funciona `no-restricted-imports`.
- El endpoint `POST /diagnostics/:id/recommendation` sigue existiendo aunque el frontend ya no lo usa.
