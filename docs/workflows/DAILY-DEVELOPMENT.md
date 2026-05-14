# Daily Development

The end-to-end flow from "I picked up a ticket" to "my code is in `dev`." Internalize this; it's the heartbeat of the project.

This document doesn't repeat the _rules_ — those live in [`BRANCH-NOTATION.md`](../conventions/BRANCH-NOTATION.md), [`STANDARD-COMMIT.md`](../conventions/STANDARD-COMMIT.md), and [`pull-requests.md`](../conventions/pull-requests.md). It describes the _flow_ that ties them together.

## TL;DR

```
Jira (HU) → Create branch → Pull dev → Develop → Test locally
        → Commit → Push → Open PR → Address review → Squash + merge
        → Delete branch → Pull dev → Repeat
```

## Step 1 — Pick a ticket

Tickets in Jira are tagged with the epic (`E-01` through `E-08`) and a priority. For phase 1 work, the priorities you'll see are `Highest` and `High` from epics E-01 through E-04. Pick one assigned to you. If nothing's assigned, take the highest-priority unassigned one from your area.

Before you start, **read the Gherkin scenarios** in the ticket. They're the acceptance criteria. If a scenario isn't clear, ask before coding — clarification at the start costs less than a rewrite at PR review.

If the ticket is missing information (e.g. an ambiguous error message), comment on the ticket asking. Don't invent the answer.

## Step 2 — Create the branch

Use Jira's **Create branch** automation:

1. Open the HU in Jira.
2. In the **Development** panel on the right, click **Create branch**.
3. Repository: `diagnostico-irl`.
4. Branch type: `Custom`.
5. Branch from: **`dev`** (never `main`).
6. Branch name: accept Jira's default (`IRL-<id>-<short-summary>`). Edit only if the summary is unclear.
7. Click **Create branch**.

If for some reason you create the branch manually, follow the exact format:

```bash
git checkout dev && git pull
git checkout -b IRL-10-verify-completeness-before-submit
```

See [`BRANCH-NOTATION.md`](../conventions/BRANCH-NOTATION.md) for the full rules and invalid examples.

## Step 3 — Sync your local environment

Even if you pulled `dev` this morning, dependencies may have changed:

```bash
git checkout dev && git pull
pnpm install                                  # picks up new packages if package.json changed
pnpm --filter @innlab/contracts build         # if contracts changed
pnpm --filter @innlab/api db:migration:run    # if migrations are pending
pnpm --filter @innlab/api db:seed             # if seeds changed
git checkout IRL-10-verify-completeness-before-submit
```

If any of these fail, fix them before writing a single line of feature code. Don't accumulate environment drift.

## Step 4 — Develop

### Where the code goes

The ticket tells you which epic, the epic maps to one or two modules/features:

| Epic                      | Backend module                                   | Frontend feature                          |
| ------------------------- | ------------------------------------------------ | ----------------------------------------- |
| E-01 Access & identity    | `modules/identity`                               | `features/auth`, `features/diagnostic`    |
| E-02 Consent & initiative | `modules/consent`, `modules/initiative`          | `features/consent`, `features/initiative` |
| E-03 Questionnaire        | `modules/questionnaire`, `modules/irl-catalog`   | `features/questionnaire`                  |
| E-04 Initial maturity     | `modules/maturity-profile`, `modules/diagnostic` | `features/maturity-profile`               |

For the full map: [`apps/api/docs/modules.md`](../../apps/api/docs/modules.md) and [`apps/web/docs/modules.md`](../../apps/web/docs/modules.md).

### Architecture rules to keep in mind

These are the most common mistakes the team catches in review:

- **No framework imports in `domain/`.** No `@nestjs/common`, no `typeorm`, no `axios`. Domain code is plain TypeScript. (See [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md).)
- **One use case per class, one `execute(command)` method.** Don't create helper methods on the use case class.
- **Features can't import from other features** (frontend). Use `shared/` for cross-feature primitives. (See [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md).)
- **Spanish for domain, English for infrastructure.** `Diagnostico`, `Iniciativa`, `Afirmacion` (Spanish) vs `Repository`, `UseCase`, `Controller` (English).
- **No `synchronize: true` in TypeORM.** Schema changes go through migrations.

ESLint catches most of these at save time. If you see a red squiggle, fix it then — not at PR time.

### Run the dev stack

```bash
pnpm dev   # backend + frontend with hot reload
```

If you only need one side:

```bash
pnpm --filter @innlab/api dev
pnpm --filter @innlab/web dev
```

### Write tests alongside the code

Don't defer testing until "after the feature works." Tests force you to define the contract; that contract usually reveals design issues earlier. The rule of thumb:

- New domain logic → unit test before or alongside.
- New endpoint → use case unit test + integration test for the repository + one E2E for the user story.
- New React component → component test for the behavior the user sees.
- Bug fix → a test that reproduces the bug; the test now passes.

See [`docs/conventions/testing.md`](../conventions/testing.md) for what each tier should cover.

### Run tests locally as you go

Tight feedback loops beat long ones. Use watch mode:

```bash
pnpm --filter @innlab/api test:watch
pnpm --filter @innlab/web test:watch
```

## Step 5 — Commit

Commits follow the [standard format](../conventions/STANDARD-COMMIT.md):

```
<type>: <action> + [<scope>] - [<short description>]
```

Examples for a typical day's work:

```bash
git add src/modules/questionnaire/domain/services/completeness-checker.service.ts
git commit -m "feat: add + [questionnaire] - [add completeness checker domain service]"

git add test/unit/modules/questionnaire/completeness-checker.service.spec.ts
git commit -m "test: add + [completeness-checker] - [cover incomplete and complete sheets]"

git add src/modules/questionnaire/application/use-cases/submit-questionnaire.use-case.ts
git commit -m "feat: add + [questionnaire] - [wire submit use case to completeness checker]"

git add src/modules/questionnaire/interfaces/http/questionnaire.controller.ts
git commit -m "feat: add + [questionnaire] - [expose post envio endpoint with rfc 7807 errors]"
```

The pre-commit hook runs ESLint and Prettier on staged files. The commit-msg hook validates the message format. If either rejects you, fix and try again — don't bypass with `--no-verify`.

### Commit granularity

A commit should be:

- **Atomic** — it does one thing.
- **Buildable** — `pnpm typecheck` passes after this commit.
- **Reversible** — if you `git revert` it, the system is still coherent.

Five commits that each move the system forward beat one giant commit at the end. The squash-merge at PR time consolidates them; what matters is the integrity of the branch's history during review.

### When to amend vs new commit

- Fixing a typo you just made → `git commit --amend`.
- Adding something you forgot in the last commit → `git commit --amend --no-edit` after `git add`.
- Adding something that's a logically separate step → new commit.

Once you've pushed, prefer new commits over `--amend` — `--amend` rewrites history and forces a `--force-with-lease` push, which is fine on your own branch but disruptive once a reviewer is on it.

## Step 6 — Push and open the PR

```bash
git push -u origin IRL-10-verify-completeness-before-submit
```

Go to GitHub, open a PR targeting **`dev`** (not `main`). Fill the PR template:

- Link the Jira ticket (`Closes IRL-10`).
- Check the change type.
- Write a 2–3 sentence summary.
- List the test evidence.
- Tick the checklist (all items must be true).

The PR title should match the commit you intend to land. GitHub pre-fills the squash-merge message from the title, so write it carefully:

```
feat: add + [questionnaire] - [verify completeness on submission (RF-06)]
```

Detailed PR conventions: [`docs/conventions/pull-requests.md`](../conventions/pull-requests.md).

## Step 7 — CI

GitHub Actions runs automatically on every push:

- Lint (`pnpm lint`)
- Typecheck (`pnpm typecheck`)
- Unit tests (`pnpm test:unit`)
- Integration tests (`pnpm test:integration`)
- Build (`pnpm build`)

If any check fails, fix it on your branch. CI is not a suggestion.

E2E tests run on merge to `dev`, not on every PR push, because they're slow. Make sure you ran E2E locally for the user story you're implementing:

```bash
pnpm --filter @innlab/api test:e2e
pnpm --filter @innlab/web test:e2e
```

## Step 8 — Review

You'll get feedback. Treat every comment as either:

- An action → fix and reply with the commit SHA.
- A question → answer it.
- A suggestion → apply it or reply with the reason for not applying.

After fixes, **click "Re-request review"** in the GitHub sidebar. Reviewers don't auto-watch updates.

Reasonable disagreement is fine — cite the convention doc, the SRS, or the ADR. If a real disagreement persists, escalate to the team in the project chat; don't merge over the reviewer's objection.

## Step 9 — Merge

When the PR is approved and CI is green:

1. Click **Squash and merge**.
2. **Edit the squash commit message** to match the commit standard. GitHub pre-fills it from the PR title and body; tidy it up if needed.
3. Confirm.
4. **Delete the branch** — GitHub offers the button right after merge. Click it.

## Step 10 — Update your local

```bash
git checkout dev
git pull
git branch -d IRL-10-verify-completeness-before-submit   # local cleanup
```

If the local delete fails with "branch not fully merged," that's git being cautious because the branch never had its squashed commit locally. It's safe to force:

```bash
git branch -D IRL-10-verify-completeness-before-submit
```

Now you're ready for the next ticket. Loop back to Step 1.

## When something deviates

### "I need to work on top of someone else's unmerged branch"

It happens — you need their changes before yours can compile. Two options:

**Option A (preferred)**: ask the teammate to merge their PR first, even partially (open a first PR with the minimum needed).

**Option B**: branch from their branch, document the dependency in your PR description. When their PR merges, rebase yours onto `dev`:

```bash
git checkout IRL-11-compute-irl-levels
git fetch origin
git rebase origin/dev
```

### "Dev moved and now I have merge conflicts"

Rebase or use GitHub's **Update branch** button. Don't merge `dev` into your branch — it creates noise commits that survive the squash.

```bash
git checkout IRL-10-verify-completeness-before-submit
git fetch origin
git rebase origin/dev
# resolve conflicts file by file
git rebase --continue
git push --force-with-lease   # required after rebase
```

### "I committed to the wrong branch"

Reset and replay:

```bash
git log --oneline    # find the commit SHAs you want to move
git checkout <correct-branch>
git cherry-pick <sha-1> <sha-2>
git checkout <wrong-branch>
git reset --hard origin/<wrong-branch>   # back to remote state
```

### "I need to abandon the work"

```bash
git checkout dev
git branch -D IRL-10-verify-completeness-before-submit
git push origin --delete IRL-10-verify-completeness-before-submit
```

Update the Jira ticket so the team knows.

## Anti-patterns

- **Working on `dev` directly.** Pushes to `dev` are rejected by GitHub branch protection. If you've been committing locally to `dev`, branch off from your current HEAD before pushing.
- **Long-lived feature branches.** A branch that lives more than a week is a smell. Either ship something (a stub, a test-only PR) or split the work.
- **Skipping the pre-commit hook with `--no-verify`.** Don't. The hook catches what review will catch anyway, just earlier.
- **Bundling unrelated changes.** "While I was there, I also..." — that's a second PR.
- **Force-pushing after review starts.** Reviewers lose track of what's new. Add fix-up commits and rely on squash-merge to clean up.
