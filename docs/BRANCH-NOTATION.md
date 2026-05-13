# Branch Notation

All branches in this repository follow a strict naming convention to keep
the history readable, traceable to Jira, and consistent with the
automated branch creation flow.

## Base rules

1. Every branch is created from `dev`. Never branch from `main` or
   from another feature branch.
2. One branch per User Story (HU). If a story is too large, split it
   into sub-tasks in Jira first, then create one branch per sub-task.
3. Branch names are lowercase and use hyphens. No spaces, no underscores,
   no slashes.
4. The branch lifetime ends when its PR is merged. Delete it after merge.

## Format

    IRL-<jira-id>-<short-summary>

Where:

- **`IRL`** is the project key, fixed for this project.
- **`<jira-id>`** is the numeric Jira issue ID (the number after `IRL-`
  in the ticket). Use the ID Jira already shows.
- **`<short-summary>`** is a 3–6 word kebab-case summary of what the
  branch delivers. Start with a verb in infinitive form when possible.

## Valid examples

| Branch name                                | Maps to                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `IRL-7-show-questionnaire-by-dimensions`   | HU-07 — show questionnaire by IRL dimensions   |
| `IRL-8-respond-likert-statements`          | HU-08 — respond statements with Likert scale   |
| `IRL-10-verify-completeness-before-submit` | HU-10 — verify completeness before calculation |
| `IRL-11-compute-irl-levels-by-dimension`   | HU-11 — compute IRL levels per dimension       |
| `IRL-13-render-radar-chart`                | HU-13 — visualize maturity profile as radar    |

## Invalid examples — and why

| Branch name                                                                         | Problem                                                                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `IRL-07-show-questionnaire-by-dimensions`                                           | Don't pad the ID with leading zeros. Jira uses `IRL-7`, not `IRL-07`.                                          |
| `irl-7-show-questionnaire`                                                          | Project key must be uppercase: `IRL`, not `irl`.                                                               |
| `feature/IRL-7-show-questionnaire`                                                  | No type prefixes. The commit prefix (`feat:`) carries the type; the branch name doesn't repeat it.             |
| `IRL-7_show_questionnaire`                                                          | Use hyphens, not underscores.                                                                                  |
| `IRL-7 show questionnaire`                                                          | No spaces.                                                                                                     |
| `IRL-7-fix-bug`                                                                     | Too vague. The summary must describe the deliverable, not the activity.                                        |
| `IRL-7`                                                                             | Missing the summary. The summary is mandatory — branch names appear in PR lists where the ID alone is useless. |
| `show-questionnaire-by-dimensions`                                                  | Missing the Jira ID. Every branch must trace to a ticket.                                                      |
| `IRL-7-mostrar-cuestionario-por-dimensiones`                                        | English only. Domain code is bilingual, but branches and commits are English (see `STANDARD-COMMIT.md`).       |
| `IRL-7-show-questionnaire-by-dimensions-and-also-add-the-radar-and-fix-some-styles` | Too long. Split into multiple branches if scope exceeds one HU.                                                |

## Creating a branch — recommended flow

Jira automates branch creation. Follow this flow to avoid manual errors:

1. Open the HU in Jira.
2. Scroll to the **Development** panel on the right.
3. Click **Create branch**.
4. In the dialog:
   - **Repository**: `diagnostico-irl` (the monorepo).
   - **Branch type**: `Custom`.
   - **Branch from**: `dev`.
   - **Branch name**: accept the default that Jira proposes. It will
     follow the `IRL-<id>-<summary>` format. Edit only if the auto-
     generated summary is unclear.
5. Click **Create branch**.
6. Pull `dev` locally first, then check out the new branch:

```bash
    git fetch origin
    git checkout dev && git pull
    git checkout IRL-7-show-questionnaire-by-dimensions
```

## Special branches

These exist outside the normal naming rule:

- `main` — production. Protected. Only merged into via release PRs from `dev`.
- `dev` — integration. Protected. All feature branches PR into `dev`.
- `hotfix/<short-summary>` — emergency production fix. Branches from
  `main`, PRs back to both `main` and `dev`. Used only for production
  incidents, not for normal bug fixing.

## What not to do

- Don't push commits directly to `dev` or `main`. Both branches are
  protected; pushes are rejected.
- Don't reuse a branch after its PR is merged. Create a new one for
  the next task.
- Don't rename a branch after pushing it. Delete it, recreate with
  the right name, push again.
