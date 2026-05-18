# `features/questionnaire`

Capacidad de UI con frontera propia que cubre el cuestionario IRL de 48
afirmaciones.

## Stage 1 — qué existe

- La estructura de carpetas documentada en `apps/web/docs/MODULES.md`:

  ```
  features/questionnaire/
  ├── api/           # API client functions
  ├── components/    # React components privados del feature
  ├── hooks/         # hooks privados del feature
  ├── store/         # store Zustand (draft del cuestionario)
  ├── utils/         # helpers puros
  └── index.ts       # superficie pública — actualmente vacía
  ```

- Un `index.ts` que no exporta nada. El feature **no es importable**
  como caja negra en Stage 1; `QuestionnairePage` renderiza solo un
  placeholder.

## Stage 2 — qué llega

Las tres historias objetivo de Stage 2 (HU-07, HU-08, HU-09) aterrizan
todas aquí.

| Capa          | Archivo                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/`        | `questionnaire.api.ts` — GET estructura del catálogo, POST/PUT respuestas                                                                                                             |
| `components/` | `QuestionnaireForm.tsx`, `DimensionTabs.tsx`, `DimensionPanel.tsx`, `StatementCard.tsx`, `LikertScale.tsx`, `ProgressIndicator.tsx`, `SubmitButton.tsx`, `IncompleteSubmitDialog.tsx` |
| `hooks/`      | `useQuestionnaireStructure.ts`, `useQuestionnaireDraft.ts`, `useSubmitQuestionnaire.ts`, `useResumeDraft.ts`                                                                          |
| `store/`      | `questionnaire-draft.store.ts` — Zustand store con `persist` middleware → `sessionStorage`. Ver STATE_MANAGEMENT.md                                                                   |
| `utils/`      | `group-by-dimension.ts`, `compute-progress.ts`                                                                                                                                        |
| Public API    | `QuestionnaireForm` + `useQuestionnaireDraft`                                                                                                                                         |

## Fronteras (forzadas por ESLint)

- **Un feature no puede importar de otro feature.** El plugin
  `eslint-plugin-boundaries` lo bloquea en `apps/web/eslint.config.mjs`.
  Cualquier reutilización entre features pasa por `shared/`.
- Dentro del feature, el barrel `index.ts` es el único archivo que
  los consumidores deben importar.
- Los schemas vienen de `@innlab/contracts` (ya disponibles:
  `dimensionCodeSchema`, `statementSchema`,
  `questionnaireStructureSchema`, `answerItemSchema`,
  `submitQuestionnaireSchema`).
- Los componentes UI vienen de `@/shared/ui` (shadcn) — no se usan
  primitivos ad-hoc en el feature; si falta uno, se agrega a
  `shared/ui/` siguiendo el patrón shadcn.

## State management

Este es el **único feature en phase 1 que es dueño de un store
Zustand**. El shape exacto (estado, acciones, configuración de
`persist`, `partialize`) está fijado en
`apps/web/docs/STATE_MANAGEMENT.md` §"Store shape — the questionnaire
draft". No se inventa un shape nuevo; se copia.

## Fuera de scope

- Persistencia cross-session del draft (guardado server-side cada N
  segundos). Candidato a phase 2. Hasta entonces, `sessionStorage`
  sobrevive a la navegación dentro de la pestaña; cerrar la pestaña
  descarta el draft, por diseño.
- HU-10 ("Verificar completitud antes del cálculo") **no** está en las
  tres historias objetivo. El check de completitud lo hace el frontend
  leyendo el store Zustand; la re-validación server-side (RF-06) y el
  endpoint `POST /diagnosticos/:id/cuestionario` llegan con HU-10.
