# Standard Commit Convention

All commits in this repository follow a strict, consistent format. The
format is mechanically enforced by `commitlint` on a pre-commit hook;
commits that don't match are rejected.

## Universal rules

1. **English only.** No Spanish in commit messages, even when the code
   itself uses Spanish for domain terms.
2. **All lowercase**, including the type prefix. No capitalized first
   letters in the subject line.
3. **No trailing period** in the subject line.
4. **One concern per commit.** If you can't describe the change in one
   subject line, split the commit.
5. **Imperative mood** when possible: "add radar chart", not "added
   radar chart" or "adds radar chart".

## Format

    <type>: <action> + [<scope>] - [<short description>]

The structure follows the team convention shown in the project's
internal documentation. Each piece is mandatory.

- **`<type>`** is one of: `feat`, `fix`, `enhance`, `doc`, `test`.
- **`<action>`** is the specific verb the type expects (see below).
- **`<scope>`** in brackets identifies the affected feature, module, or
  document.
- **`<short description>`** in brackets describes the change. Keep the
  whole line under 100 characters.

## Commit types

### `feat: add` — new feature

Used when adding a new feature, endpoint, component, or capability.

    feat: add + [<feature>] - [<short description, starting with infinitive verb>]

Examples:

    feat: add + [questionnaire] - [render dimension tabs with progress indicator]
    feat: add + [maturity-profile] - [compute irl levels from likert answers]
    feat: add + [auth] - [validate jwt against keycloak jwks]
    feat: add + [contracts] - [export submit-questionnaire zod schema]

### `fix: correct` — bug fix

Used when correcting an error in existing behavior.

    fix: correct + [<what was broken>] - [<short description of the problem solved>]

Examples:

    fix: correct + [likert-scale] - [keyboard arrow navigation skipping value 3]
    fix: correct + [irl-calculator] - [boundary value 4.40 mapped to level 8 instead of 9]
    fix: correct + [diagnostic-guard] - [redirect loop when profile already exists]

### `enhance: improve` — improvement to existing feature

Used when refining or improving something that already works.

    enhance: improve + [<existing feature>] - [<short description, starting with infinitive verb>]

Examples:

    enhance: improve + [radar-chart] - [increase tick density for better readability]
    enhance: improve + [questionnaire-store] - [debounce session-storage writes by 300ms]
    enhance: improve + [error-filter] - [add correlation id to all problem responses]

### `doc: add` / `doc: update` — documentation

Used for documentation changes only. No code changes in the same commit.

    doc: add + [<document name>] - [<short description of contents>]
    doc: update + [<document name>] - [<what changed and why>]

Examples:

    doc: add + [error-codes.md] - [catalog backend error codes with http mapping]
    doc: update + [local-setup.md] - [add windows-specific keycloak docker note]
    doc: update + [domain-model.md] - [clarify bottleneck rule for tied minimum levels]

### `test: add` — tests

Used when adding tests. Bug-fixing tests should ride with the `fix:`
commit; this prefix is for net-new test coverage.

    test: add + [<test name or target>] - [<short purpose>]

Examples:

    test: add + [irl-calculator] - [property-based test for full likert range]
    test: add + [submit-questionnaire-e2e] - [verify incomplete payload returns 422]
    test: add + [radar-chart] - [snapshot test for six-axis rendering]

## Optional commit body and footers

For commits that need more context, you may add a body and footers
after the subject line, separated by blank lines:

    feat: add + [maturity-profile] - [compute irl levels from likert answers]

    implements rf-07. the calculator is a pure function over the
    conversion table from the marco kth irl, so the table can be
    replaced without touching call sites.

    refs: IRL-11
    docs: docs/architecture/domain-model.md

Footer conventions:

- `refs: IRL-<id>` — link to Jira. Add this when the branch name isn't
  enough context (rare, but useful for follow-up commits on the same branch).
- `docs: <path>` — point to the documentation that supports this change.
- `breaking:` — flag a breaking contract change. Followed by a short
  explanation. Triggers a CHANGELOG entry under "breaking changes".

## Invalid commits — and why

| Commit message                                                                                  | Problem                                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Add radar chart`                                                                               | Missing type prefix. Also capitalized.                                   |
| `FEAT: ADD + [profile] - [render chart]`                                                        | Must be all lowercase.                                                   |
| `feat: agregar + [perfil] - [renderizar grafico radar]`                                         | Must be English.                                                         |
| `feat: add radar chart`                                                                         | Missing the `+ [scope] - [description]` structure.                       |
| `feat: add + [profile] - [render chart].`                                                       | Trailing period. Remove it.                                              |
| `feat: add + [profile] render chart`                                                            | Missing the `- [...]` bracket structure.                                 |
| `feat: add + [profile] - [render chart and also fix the bug in the calculator and update docs]` | Multiple concerns. Split into three commits: feat, fix, doc.             |
| `update stuff`                                                                                  | No type, no scope, no description. Rejected by commitlint.               |
| `feat: add + [questionnaire] - [add stuff]`                                                     | Description too vague. Be specific.                                      |
| `wip`                                                                                           | Never commit "wip" to a shared branch. Use local commits or `git stash`. |

## Squashing and rewriting

- Inside a feature branch, you may rewrite history freely (`git rebase
-i`, amend, force-push) to keep your commits clean before review.
- After a PR is opened and reviewed, do not rewrite shared history
  without coordinating with the reviewer. Add fix-up commits instead;
  squash on merge if needed.
- Merge into `dev` uses **squash and merge** by default. The squashed
  commit message must still follow this convention — write it
  carefully in the GitHub UI before merging.

## Quick reference

| Prefix             | When to use              | Action verb |
| ------------------ | ------------------------ | ----------- |
| `feat: add`        | New capability           | `add`       |
| `fix: correct`     | Bug fix                  | `correct`   |
| `enhance: improve` | Refinement of existing   | `improve`   |
| `doc: add`         | New document             | `add`       |
| `doc: update`      | Existing document change | `update`    |
| `test: add`        | New test coverage        | `add`       |
