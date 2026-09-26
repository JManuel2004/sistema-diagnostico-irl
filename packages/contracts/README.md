# @innlab/contracts

Shared **Zod schemas** and TypeScript types that flow between the backend and the frontend. This package is the single source of truth for request and response shapes — both apps import from here so a contract change becomes a TypeScript error on the side that hasn't been updated.

## What lives here

- **Zod schemas** for every cross-tier payload (e.g. `submitQuestionnaireSchema`, `maturityProfileResponseSchema`, `answerItemSchema`).
- **TypeScript types** derived from those schemas via `z.infer<>` (e.g. `SubmitQuestionnaireCommand`, `MaturityProfileResponse`).
- **Enums and constants** that both sides need to agree on (e.g. `DIMENSION_CODES`, `IMBALANCE_PAIRS`).

What does **not** belong here:

- Business logic. Schemas describe shape; logic lives in the apps.
- React components, NestJS providers, or any framework code.
- Database concerns. Those live in each backend module's `infrastructure/database/orm-entities/`.

## How it's consumed

```ts
// in @innlab/web — every response is parsed at the boundary
import { roadmapResponseSchema, type RoadmapResponse } from '@innlab/contracts';
return getParsed(`/diagnostics/${id}/roadmap`, roadmapResponseSchema);

// in @innlab/web — the initiative form validates with the contract's schema
const form = useForm({ resolver: zodResolver(initiativeFormSchema) }); // built on registerInitiativeSchema

// in @innlab/api — response DTOs implement the contract type, so a drift is a compile error
export class RoadmapResponseDto implements RoadmapResponse { /* @ApiProperty() fields */ }
```

Both apps import the **compiled output** from `dist/`. The package is built before the apps:

```bash
pnpm --filter @innlab/contracts build
```

## Folder structure

Folders mirror the backend's bounded contexts (`apps/api/docs/MODULES.md`), named in English like everything else. The barrel `src/index.ts` is the only public surface — no consumer imports a folder path.

```
packages/contracts/
├── src/
│   ├── common/                        # cross-cutting
│   │   ├── problem-details.schema.ts  # RFC 7807
│   │   └── uuid.schema.ts
│   ├── identity/                      # shared/identity
│   │   └── core-session.schema.ts     # the session returned by the INNLAB SSO exchange
│   ├── irl-taxonomy/                  # shared/irl-taxonomy
│   │   └── dimension.schema.ts        # DIMENSION_CODES, dimension shape
│   ├── diagnosis/                     # modules/diagnosis
│   │   ├── diagnostic.schema.ts       # diagnostic + state machine, deep-analysis acceptance
│   │   ├── questionnaire-structure.schema.ts
│   │   ├── likert.schema.ts           # LikertValue (1..5)
│   │   ├── statement.schema.ts
│   │   ├── answer.schema.ts
│   │   ├── submission.schema.ts
│   │   └── …                          # maturity profile: dimension-result, bottleneck,
│   │                                  #   gaps, asymmetry, imbalance, critical-state, profile-response
│   ├── initiative/                    # modules/initiative
│   │   ├── initiative.schema.ts       # initiatives (summary), the profile of a diagnostic
│   │   └── consent.schema.ts          # consent texts, an acceptance of an initiative
│   ├── routing/                       # modules/routing
│   │   └── …                          # predicate, diagnostic-facts,
│   │                                  #   recommendation-response, layer-trace
│   ├── roadmap/                       # modules/roadmap
│   │   └── roadmap-response.schema.ts
│   └── index.ts                       # barrel — public exports only
├── package.json
├── tsconfig.json
└── README.md                          # this file
```

## Adding or changing a schema

1. Edit or add the schema file under `src/`.
2. Re-export from `src/index.ts` if it's part of the public surface.
3. Run `pnpm --filter @innlab/contracts build`.
4. **Update both apps in the same PR.** A contract change is a coordinated change, by design. If you ship the contract change alone, the apps stop typechecking.
5. Add or update tests in the affected app.
6. Use `contracts` as the commit scope: `feat: add + [contracts] - submit questionnaire schema`.

## Versioning

This package is **`private: true`** and never published to npm. It is consumed through the `workspace:*` protocol, so there is no semver: a breaking change (renamed or removed field, narrower type) is a coordinated change in the same commit as both apps, flagged in the commit body.

## Naming conventions

- Schemas: `<name>Schema` (camelCase, suffix `Schema`).
- Derived types: PascalCase, the noun (`SubmitQuestionnaireCommand`, not `SubmitQuestionnaireCommandType`).
- Files: kebab-case, suffix `.schema.ts`.

```ts
export const answerItemSchema = z.object({
  statementId: uuidSchema,
  value: likertValueSchema,
});

export type AnswerItem = z.infer<typeof answerItemSchema>;
```

## Why both Zod and class-validator?

The backend validates request bodies with class-validator DTOs, because Nest's validation pipe and the Swagger generator read their decorators ([ADR 0006](../../docs/architecture/decisions/0006-validation-at-the-http-boundary.md)); the frontend validates with Zod. This package stays the source of truth for the shapes:

- **Responses:** each backend response DTO `implements` the contract type it documents, so a field the contract adds or renames breaks the backend build.
- **Requests:** the DTO `implements` the contract's command type where it can (consent, initiative) and mirrors the contract schema field by field (lengths and ranges come from the contract's constants, such as `INITIATIVE_TEXT_MAX` and `ANSWER_JUSTIFICATION_MAX`), and the backend e2e suites parse what the API answers with the contract's schemas.
- **Business invariants** (48 answers, a non-blank justification, a current consent of the initiative) are not in either: they live in the backend domain.
