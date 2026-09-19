# Testing

The testing philosophy, conventions, and what we expect at each tier.

## Philosophy

Three principles guide every test we write:

1. **Test behavior, not implementation.** A test that breaks when you rename an internal helper is a bad test. A test that breaks when you change what the system _does_ is a good test.
2. **Test the boundary that matters.** Domain logic gets unit tests; HTTP behavior gets integration/e2e tests. Don't test the same boundary twice.
3. **Coverage thresholds exist where business risk lives.** The IRL calculator is at 95% because a wrong number is wrong; React layout components at 0% is fine because the eye catches layout issues.

## Backend testing tiers

| Tier            | Location                     | Tools                            | What it tests                                                           | Speed budget      |
| --------------- | ---------------------------- | -------------------------------- | ----------------------------------------------------------------------- | ----------------- |
| **Unit**        | `apps/api/test/unit/`        | Jest + fast-check                | Domain logic, application use cases with port stubs                     | Full suite < 5s   |
| **Integration** | `apps/api/test/integration/` | Jest + Testcontainers (Postgres) | Repositories, use cases with real DB                                    | Full suite < 60s  |
| **E2E**         | `apps/api/test/e2e/`         | Jest + supertest + nock          | Full HTTP cycle, one spec per user story, self-signed JWT + mocked JWKS | Full suite < 3min |

### Running the tiers

- **Node ≥ 24.9** is required (`.nvmrc`, `engines`): `jose`/`jwks-rsa` load ESM through `require()`, which Jest supports only from that version. On older Node the identity unit suite and every e2e suite fail to load.
- **Unit** needs nothing else. **Integration** needs Docker (Testcontainers starts Postgres).
- **E2E** boots the real `AppModule` against the database in `DATABASE_URL`, which must be migrated and seeded first (`docker compose up -d postgres`, then `pnpm --filter @innlab/api db:migration:run && db:seed`). Each suite creates its own rows with random ids and deletes them afterwards, because suites share the database and run in parallel.
- Repository adapters that only unit tests exercise with in-memory doubles can hide schema drift (a renamed column mapped under its old name passes every unit test). Persistence adapters need an integration test against a real database.

### Coverage thresholds (enforced in CI)

```js
// jest.config.js
coverageThreshold: {
  './src/modules/diagnosis/domain/': { branches: 87, functions: 92, lines: 93 },
  './src/modules/routing/domain/':   { branches: 90, functions: 95, lines: 95, statements: 95 },
  './src/modules/roadmap/domain/':   { branches: 90, functions: 95, lines: 95, statements: 95 },
}
```

(Illustrative; the authoritative values, and why each is set where it is, are in `apps/api/jest.config.js`.) The whole codebase isn't gated. The domains that carry business risk — the IRL calculator and questionnaire invariants in `diagnosis`, the recommendation engine, the roadmap — are gated.

### Unit tests — what to write

For **domain services and value objects**:

```ts
// test/unit/modules/diagnosis/domain/services/irl-calculator.service.spec.ts
import { IrlCalculatorService } from '../../../../../src/modules/diagnosis/domain/services/irl-calculator.service.js';
import { fc, it as itProp } from 'fast-check-jest';

describe('IrlCalculatorService', () => {
  const calculator = new IrlCalculatorService();

  it('maps an average of 2.20 to IRL level 4', () => {
    const result = calculator.computeLevelFromAverage(2.2);
    expect(result.value).toBe(4);
  });

  it('handles the upper boundary of the highest band', () => {
    const result = calculator.computeLevelFromAverage(5.0);
    expect(result.value).toBe(9);
  });

  // Property-based test — the highest-value test in the whole project
  itProp.prop([fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 48, maxLength: 48 })])(
    'produces 6 levels in 1..9 for any 48 valid Likert answers',
    (answers) => {
      const results = calculator.compute(asGroupedByDimension(answers));
      expect(results).toHaveLength(6);
      results.forEach((r) => {
        expect(r.irlLevel.value).toBeGreaterThanOrEqual(1);
        expect(r.irlLevel.value).toBeLessThanOrEqual(9);
      });
    },
  );
});
```

For **application use cases** with port stubs:

```ts
// test/unit/modules/diagnosis/application/submit-questionnaire.use-case.spec.ts
describe('SubmitQuestionnaireUseCase', () => {
  let repository: AnswerSheetRepositoryPort;
  let useCase: SubmitQuestionnaireUseCase;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByDiagnosticId: jest.fn().mockResolvedValue(null),
    };
    useCase = new SubmitQuestionnaireUseCase(repository, new CompletenessChecker());
  });

  it('saves the answer sheet when 48 answers are provided', async () => {
    await useCase.execute({ diagnosticId: 'abc', answers: validForty8Answers() });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('throws QuestionnaireIncompleteError when answers are missing', async () => {
    await expect(
      useCase.execute({ diagnosticId: 'abc', answers: incompleteAnswers() }),
    ).rejects.toThrow(QuestionnaireIncompleteError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
```

**Don't mock the domain.** Unit tests construct real value objects and real aggregates with real domain services. Mocks are only for ports.

### Integration tests — what to write

For **repositories** against a real database:

```ts
// test/integration/database/typeorm-answer-sheet.repository.spec.ts
import { TypeOrmAnswerSheetRepository } from '...';
import { setupTestDatabase, teardownTestDatabase, truncateAllTables } from '../setup.js';

describe('TypeOrmAnswerSheetRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmAnswerSheetRepository;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
    repository = new TypeOrmAnswerSheetRepository(dataSource.getRepository(RespuestaOrm));
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedCatalogs(dataSource);
  });

  it('persists 48 answers and reads them back', async () => {
    const sheet = AnswerSheet.create('diag-1', validForty8Answers());
    await repository.save(sheet);

    const loaded = await repository.findByDiagnosticId('diag-1');
    expect(loaded?.answers).toHaveLength(48);
  });

  it('replaces existing answers atomically when re-submitted', async () => {
    await repository.save(AnswerSheet.create('diag-1', validForty8Answers()));
    await repository.save(AnswerSheet.create('diag-1', differentValidForty8Answers()));

    const loaded = await repository.findByDiagnosticId('diag-1');
    expect(loaded?.answers).toHaveLength(48);
    // assert content matches the second submission
  });
});
```

Integration tests **truncate tables in `beforeEach`**, then **seed catalogs** if needed. Don't leak data between tests.

### E2E tests — what to write

One spec per user story. The spec mirrors the Gherkin scenarios from the backlog.

`JwtAuthGuard` is registered as an `APP_GUARD`, so **every** e2e request needs a
token — a suite that forgets one gets 401 on every assertion. Do not try to
substitute the guard: neither `overrideGuard(JwtAuthGuard)` nor
`overrideProvider(APP_GUARD)` reaches the instance Nest mounts in the global
pipeline. Go **through** authentication instead, with
`test/e2e/support/authenticated-app.ts`: it signs its own RS256 token and serves
the matching JWKS with `nock`, reading the issuer and JWKS URI from the config
the app already loaded, so it works with real Cognito credentials and with the
placeholders in `.env.example` alike.

```ts
// test/e2e/modules/diagnosis/submit-questionnaire.e2e-spec.ts
import { authenticateAgainst } from '../../support/authenticated-app.js';

describe('HU-10: Verify completeness before calculation', () => {
  let app: NestFastifyApplication;
  // Agent carrying the Authorization header by default.
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    agent = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app));
  });

  afterAll(async () => {
    nock.cleanAll();
    await app.close();
  });

  it('blocks the submission when answers are missing', async () => {
    const diagnostic = await seedDiagnosticReadyForQuestionnaire(app, 'user-1');

    const res = await agent
      .post(`/api/v1/diagnostics/${diagnostic.id}/questionnaire`)
      .send({ answers: incompleteAnswers() });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('QUESTIONNAIRE_INCOMPLETE');
    expect(res.body.missing).toBeDefined();
  });
```

The guard itself is not this suite's job — `shared/identity/cognito-jwt-guard.e2e-spec.ts`
covers signature, issuer, algorithm, `kid` lookup, `token_use` and `@Public()`
routes on its own.

## Frontend testing tiers

| Tier                 | Location                                 | Tools                          | What it tests                                         |
| -------------------- | ---------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| **Unit / component** | `apps/web/src/**/*.{spec,test}.{ts,tsx}` | Vitest + Testing Library       | Components in isolation, custom hooks, Zustand stores |
| **Integration**      | `apps/web/src/**/*.test.tsx` with MSW    | Vitest + Testing Library + MSW | A feature with mocked HTTP                            |
| **E2E**              | `apps/web/tests/e2e/`                    | Playwright                     | One spec per user story, full SPA with mocked auth    |

### Component tests — what to write

Use Testing Library queries that mirror what users see:

```tsx
// features/questionnaire/components/LikertScale.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LikertScale } from './LikertScale';

describe('LikertScale', () => {
  it('renders five options with accessible labels', () => {
    render(
      <LikertScale
        statementText="Tengo claridad sobre mi cliente objetivo"
        value={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn();
    render(<LikertScale statementText="..." value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /4/ }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('supports arrow-key navigation', async () => {
    const onChange = vi.fn();
    render(<LikertScale statementText="..." value={3} onChange={onChange} />);
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
```

**Prefer `getByRole` and `getByLabelText`.** Avoid `getByTestId` unless nothing else fits.

### Integration tests — MSW handlers

```tsx
// features/questionnaire/QuestionnairePage.test.tsx
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/v1/catalog/questionnaire', () => HttpResponse.json(mockQuestionnaireStructure())),
  http.post('/api/v1/diagnostics/:id/questionnaire', () =>
    HttpResponse.json(mockMaturityProfile()),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('navigates to the profile page after a complete submission', async () => {
  // ... render the page, fill all 48, submit, assert navigation
});
```

MSW intercepts at the network layer; your real HTTP client code runs.

### Playwright E2E

One spec per user story:

```ts
// tests/e2e/submit-questionnaire.spec.ts
import { test, expect } from '@playwright/test';
import { signInAsTestUser } from './fixtures/auth';

test('HU-10: blocks submission and points to missing items', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/diagnosticos/test-diag/cuestionario');

  await page.getByRole('button', { name: /procesar diagnóstico/i }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/faltan/i)).toBeVisible();
});
```

The INNLAB session is stubbed at the fixture level (`signInAsTestUser` writes a session into `localStorage` under `innlab.session.v1`). No real Hub, no real Cognito in E2E.

## Shared testing rules

### What to test

- Domain invariants (a `LikertValue` cannot be 6).
- Conversion rules (the calculator's mapping table).
- State transitions (the diagnostic state machine).
- HTTP contract behavior (status codes, error codes, body shapes).
- User-facing behavior (form validation, navigation flow).

### What not to test

- Framework code. Don't write a test that verifies NestJS injects a dependency.
- Implementation details. Don't snapshot internal data structures.
- Trivial getters. Don't test that `diagnostic.id` returns `id`.

### Test naming

Test names describe **behavior in present tense**:

```ts
// ✓
it('blocks submission when answers are missing', ...)
it('returns 6 dimension results for any valid submission', ...)

// ✗
it('should block submission', ...)         // "should" adds nothing
it('test submission blocking', ...)         // not present tense
it('works correctly', ...)                  // says nothing
```

Test files use `describe('<ClassOrFeature>')` at the top level, with nested `describe` blocks for sub-behaviors.

### Test data

Use **factory functions**, not fixtures with magic constants:

```ts
// helpers/factories.ts
export function aValidAnswerSheet(overrides?: Partial<AnswerSheetProps>): AnswerSheet {
  return AnswerSheet.create('diag-' + nanoid(), {
    answers: range(48).map((i) => ({ statementId: `stmt-${i}`, value: 3 })),
    ...overrides,
  });
}

// in the test
const sheet = aValidAnswerSheet({
  answers: [
    /* custom */
  ],
});
```

A single shared `helpers/factories.ts` per module beats scattered ad-hoc fixtures.

### When a test fails locally but passes in CI (or vice versa)

This is always a real problem, never a flake. Common causes:

- Time-of-day dependency (use `vi.setSystemTime` or pass dates explicitly).
- Locale-dependent number formatting (use `Intl.NumberFormat` explicitly with `'es-CO'`).
- Timezone-dependent date parsing (use UTC in tests).
- Database state leaking between tests (truncate properly).
- Test order dependency (don't `--runInBand` your way out of it; fix the test).

## CI fan-out

| Trigger                   | Tests run                                                                 |
| ------------------------- | ------------------------------------------------------------------------- |
| PR opened or pushed       | Unit + integration on both apps; component tests on web; lint + typecheck |
| Merge to `dev`            | All of the above + E2E (backend e2e + Playwright)                         |
| Merge to `main` (release) | Full suite + smoke tests against staging                                  |

If you find yourself wanting to skip a test for CI, talk to the team first. Skipped tests rot.
