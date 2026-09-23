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
// in @innlab/api
import { submitQuestionnaireSchema, type SubmitQuestionnaireCommand } from '@innlab/contracts';
const parsed = submitQuestionnaireSchema.parse(req.body);

// in @innlab/web
import { submitQuestionnaireSchema, type SubmitQuestionnaireCommand } from '@innlab/contracts';
const form = useForm<SubmitQuestionnaireCommand>({
  resolver: zodResolver(submitQuestionnaireSchema),
});
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
│   │                                  #   gaps, asymmetry, imbalance, profile-response
│   ├── initiative/                    # modules/initiative
│   │   ├── initiative.schema.ts
│   │   └── consent.schema.ts
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
6. Note the change in the commit message scope: `feat: add submit questionnaire schema`.

## Versioning

This package is **`private: true`** and never published to npm. It's consumed via the `workspace:*` protocol. There's no semver dance.

If a schema change is breaking (renamed field, removed field, narrower type), flag it in the commit body:

```
breaking: renamed `answers` to `respuestas` in submitQuestionnaireSchema
```

The CHANGELOG entry will surface it for the team.

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

The backend uses class-validator decorators on its HTTP DTOs because NestJS's OpenAPI generator reads them. The frontend uses Zod via `@hookform/resolvers/zod` for forms. Without a shared definition, the two diverge silently — the backend accepts what the frontend forgot to send.

This package is the source of truth. The class-validator DTO is **mechanical translation** of the Zod schema (often verifiable by a test that round-trips a valid example through both). The Zod schema is consulted at the backend boundary via `ZodValidationPipe` for the cross-tier rules.
