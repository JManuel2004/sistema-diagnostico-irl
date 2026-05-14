# Pull Requests

How to open a PR, what reviewers look for, and how merges land.

## Before opening a PR

Run these locally first. The CI will check them anyway; doing it locally saves a round trip:

```bash
pnpm typecheck        # no type errors anywhere
pnpm lint             # no eslint errors
pnpm test:unit        # fast tests pass
pnpm format:check     # prettier is happy
```

If you changed a contract in `@innlab/contracts`, also build it so the consumers compile:

```bash
pnpm --filter @innlab/contracts build
```

## Opening the PR

### 1. Push your branch

```bash
git push -u origin IRL-10-verify-completeness-before-submit
```

### 2. Open the PR on GitHub

Target branch: **`dev`**, never `main`. The repo settings reject PRs into `main` from anywhere except `dev` and `hotfix/*` branches.

### 3. Fill the PR template

The template is enforced. Every section matters:

```markdown
## Linked ticket

Closes IRL-10

## Type of change

- [x] feat — new capability
- [ ] fix — bug fix
- [ ] enhance — improvement of existing behavior
- [ ] doc — documentation
- [ ] test — tests only

## Summary

Adds server-side completeness verification (RF-06). Submitting a questionnaire
with missing answers now returns HTTP 422 with the QUESTIONNAIRE_INCOMPLETE
code and a `missing` array listing the gaps grouped by dimension. The
frontend already showed missing items locally; this closes the trust
boundary.

## Test evidence

- `test:unit` — new spec `submit-questionnaire.use-case.spec.ts` covers
  incomplete and complete submissions.
- `test:e2e` — `submit-questionnaire.e2e-spec.ts` adds the HU-10
  acceptance scenarios.
- curl example in PR comment.

## Checklist

- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes
- [x] Tests added or updated
- [x] Docs updated if behavior or contracts changed
- [x] No `console.log` left in production code
- [x] No `synchronize: true` in TypeORM configuration
```

### 4. Title format

Use the same prefix as the squashed commit will use:

```
feat: add + [questionnaire] - [verify completeness on submission (RF-06)]
```

GitHub doesn't enforce this with the PR title, but the reviewer will. When you click "Squash and merge," GitHub pre-fills the merge commit message from the PR title — using the convention here means the squashed commit lands clean.

## What reviewers check

A reviewer reads the PR and asks, in this order:

### Does it do what the ticket says?

The linked HU-xx ticket has acceptance criteria (Gherkin scenarios). Every scenario should either be covered by a test in this PR or be explicitly out of scope (mention it in the PR description).

### Does it follow the architecture?

- Domain code imports no framework code.
- Use cases have one `execute(command)` method.
- Repositories implement ports declared in `domain/ports/`.
- Frontend features don't import from other features.
- The bilingual rule is respected.

ESLint catches most of these. The reviewer catches the rest.

### Does the test pyramid match the change?

| Type of change      | Expected tests                                          |
| ------------------- | ------------------------------------------------------- |
| New domain logic    | Unit tests, possibly property-based                     |
| New endpoint        | Unit (use case) + integration (repository) + E2E (HTTP) |
| New React component | Component test for behavior                             |
| New form            | RHF + Zod tests, validation behavior                    |
| Bug fix             | A test that reproduces the bug; that test now passes    |
| Pure refactor       | No new tests; existing tests still pass                 |

A PR without tests for non-trivial logic is a red flag. A pure refactor with `tests passing` is fine.

### Are the contracts in sync?

If the PR changes a schema in `@innlab/contracts`:

- The schema is updated.
- The backend DTO is updated to match.
- The frontend form/parser is updated to match.
- All three live in the same PR.

Contract drift is the single bug class this rule prevents.

### Is documentation in sync?

If the PR changes:

| Change                                | Update                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| An endpoint shape, URL, or error code | `docs/conventions/api-design.md` examples and `apps/api/docs/error-codes.md` |
| A module's responsibility             | `apps/api/docs/modules.md`                                                   |
| A feature's surface                   | `apps/web/docs/features.md`                                                  |
| A state-management decision           | `apps/web/docs/state-management.md`                                          |
| A workflow step                       | The relevant doc in `docs/workflows/`                                        |
| A coding rule                         | `docs/conventions/code-style.md`                                             |

The principle: **fix the doc in the same PR that exposed the gap.** Don't defer.

### Is the commit history clean (if not squashing)?

We default to **squash and merge**, so feature-branch commits are subsumed. But the reviewer may scan them to understand the flow of the change. If the commits read like a story (`feat: add the use case`, `test: cover the happy path`, `test: cover the incomplete case`, `enhance: improve the error message`), it's easier to review than 18 commits titled `wip`.

You're free to `git rebase -i` on your branch before the review starts. After review begins, prefer fix-up commits over rewriting history.

## Responding to review

### Address every comment

A reviewer's comment is either:

- A request for change → fix the code, reply with the commit SHA.
- A question → answer it in the thread.
- A suggestion → either apply it or reply with the rationale for not applying.

Don't resolve a thread the reviewer opened. Let them resolve it when they're satisfied.

### Re-request review when ready

After pushing fixes, click **Re-request review** in the GitHub sidebar. Don't leave the reviewer guessing.

### Disagreement is fine

If you disagree with a request, say so. A good reviewer would rather discuss than rubber-stamp. Cite the convention doc, the SRS, or the ADR that supports your position. If a real disagreement persists, escalate to the team — don't merge over the reviewer's objection.

## Merging

### When the PR is approved

- All required CI checks pass (lint, typecheck, unit, integration; E2E on merge).
- At least one approval from a teammate. For phase-1 phase work, one approval is enough; for changes to the shared kernel or contracts, prefer two.
- No unresolved review comments.
- The branch is up to date with `dev` (use **Update branch** if not).

### How to merge

**Squash and merge** is the default. The squashed commit message must follow the [commit standard](./STANDARD-COMMIT.md):

```
feat: add + [questionnaire] - [verify completeness on submission (RF-06)]

implements rf-06. submitting a questionnaire with missing answers now
returns http 422 with the questionnaire_incomplete code and a missing
array listing the gaps grouped by dimension.

refs: IRL-10
docs: docs/conventions/api-design.md
```

The PR title becomes the subject line; the PR body becomes the commit body. Write both with that in mind.

### What about merge commits or rebase?

- **Merge commits** for `dev → main` release PRs. The merge commit preserves the integration point for releases.
- **Rebase** is allowed on your feature branch before opening the PR. After opening, prefer fix-ups + squash.

### After merging

- **Delete your branch.** GitHub offers the button automatically; click it.
- **Update your local `dev`**:

```bash
git checkout dev && git pull
git branch -d IRL-10-verify-completeness-before-submit  # local cleanup
```

## Special PR types

### Hotfix

For production-affecting bugs:

- Branch from `main`, not `dev`.
- Name: `hotfix/<short-summary>`.
- PR targets `main`. After merge, a second PR back-merges into `dev`.
- CI requires the full E2E suite to pass.

### Documentation-only

- Use the `doc:` commit prefix.
- Lint and typecheck still run (markdown linters, link checkers).
- One reviewer's approval is enough.
- May skip test runs in CI (the doc-only label triggers a slimmer pipeline).

### Dependency bump

- Use the `enhance:` prefix when the bump is a minor/patch.
- Use the `feat:` prefix if you're adopting a new feature the bump enabled.
- Use the `fix:` prefix if you're bumping to fix a known bug.
- Always run the full test suite locally before opening — dependency updates have caused entire test classes to fail silently in the ecosystem.

## What not to do

- **Don't push directly to `dev` or `main`.** Both are protected.
- **Don't merge your own PR** without a second pair of eyes. The team is small; this isn't a rubber-stamp.
- **Don't bundle unrelated changes** into one PR. "While I was there I also fixed..." → that's a second PR.
- **Don't open a PR for code you wouldn't deploy.** WIP code stays on your machine or in a draft PR explicitly marked as such.
- **Don't update `pnpm-lock.yaml` casually.** It's a real source of bugs. Lockfile changes should be intentional, ideally in their own PR.
