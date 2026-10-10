# Brief

Brief brings planning, implementation, review, and project memory into one CLI and agent workflow.
It stores stories, tasks, decisions, and learning as files in your repository, so the context travels
with the code. Workflow guidance supports Claude, Codex, and Gemini.

- Turn requirements into stories and tasks with explicit acceptance checks.
- Choose how much oversight each story needs: strict, selective, or auto.
- Review new code and capture learning before publication, with user approval for push and merge.
- Share pinned project skills through Git and keep independent agents off shared tracker/log files.

The product is **Brief**. Install the **getbrief** npm package and use the **`brief`** command.
The GitHub repository is also named **getbrief**; the skill remains **`brief`**.

## Requirements

- Node.js and npm; Node.js 24 is recommended.
- Git and Python 3 available on `PATH`. Python generates provider registrations during installation.
- A supported coding-agent environment to use the skills. The CLI also works directly in a terminal.

Brief uses local files and CLI commands; it does not require an MCP server or a project database.
Codegraph powers optional code indexing/query features; document tracking and memory use repository files.

## Install

Install the CLI from npm after the release is published:

```bash
npm install --global getbrief
brief --help
```

For an unpublished checkout, use the [local development](#local-development) instructions instead.
Installing the npm package supplies the CLI; it does not automatically modify your agent configuration.

Preview the machine workflow installation:

```bash
brief install --dry-run
```

Review the proposed files and any conflicts, then install:

```bash
brief install
```

This creates `~/.brief/workflow/` and registers its skills, rules, and agents. Existing custom files
are preserved; ownership conflicts require reconciliation. Repeated installation keeps the installed
package pinned. To test a newer version on a machine already set up, follow [updates](#updates).

## Set up a project

From the root of a Git project:

```bash
brief init --scope=local
brief doctor
brief status
```

Local scope is recommended for teams. Commit the workflow files and registrations with the project
so teammates, servers, and fresh clones receive the same instructions. Each machine still needs the CLI.

| Scope | Workflow location | What travels with Git |
| --- | --- | --- |
| `local` | `.brief/workflow/` in the project | Pinned skills, rules, agents, and relative registrations |
| `global` | `~/.brief/workflow/` on each machine | Project scope selection and instruction integration |

Use `brief init --scope=global` to select the machine package instead. Existing scope/version choices
are retained on repeat init; changing scope requires an explicit migration, not another init flag.

New projects start with canonical record files and ignored tracker views. Existing projects retain
their legacy tracker until you explicitly migrate it using the steps below.

## Pilot an existing project

Start with one project. Save unrelated work and pause other writers in that project during migration.

### 1. Create a branch and install the project workflow

```bash
cd /path/to/project
git status --short
git switch -c chore/brief-adoption
brief init --scope=local
brief doctor
```

If a local package is already installed, init keeps it pinned. Review `brief update --dry-run` and
apply the update with `brief update --apply` when you want to test the newer available workflow.

### 2. Preview the record migration

```bash
brief tracker migrate-authority --dry-run
```

The report lists every record and affected file. Resolve reported conflicts against the project's
recorded decisions before continuing. Do not rebuild the legacy tracker merely to silence a conflict.
For example, a documented `deferred` item should not become `active` because of an old scanner result.

### 3. Apply and verify

After reviewing the preview:

```bash
brief tracker migrate-authority --apply
git rm --cached --ignore-unmatch documentation/tracker.yaml documentation/PROJECT-TRACKER.md
brief tracker generate --markdown
brief verify-records --base=HEAD
brief status
brief doctor
```

`git rm --cached` removes the two generated views from Git tracking while keeping local files.
Existing record IDs, unknown metadata, and historical log bytes are preserved. Each record now owns
its state; generated tracker files are local views rather than shared write targets.

### 4. Review and commit the migration

```bash
git status --short
git diff --stat
git diff
git diff --cached
```

Stage only the installation/migration changes, including newly created files, then commit them.
Inspect these artifacts:

- `.brief/workflow/`, `.brief/records.json`, and the relevant ignore rules.
- Provider registrations in `.agents/`, `.claude/`, and `.codex/`, plus managed instruction changes.
- Canonical Markdown records in `documentation/` and the removal of tracked aggregate views.

Custom project instructions should remain intact. Historical logs should have no changes.

### 5. Observe the skills on one small, real change

Start a fresh agent session in the project so it discovers the installed skills. Use `/brief` or the
equivalent skill invocation in your agent. For example:

```text
Use the project's Brief workflow for this change: <describe a small real task>.
Read the local workflow, project rules, and relevant decisions first.
Plan the work, recommend an execution mode, and let me choose it.
Ask about unresolved requirements. Complete review and retro before publication.
Keep this pilot local; do not push or open a PR.
```

Check the behaviour, not just whether the CLI exits successfully:

- Planning applies relevant rules and saved choices, and asks about genuine ambiguity.
- Implementation follows the mode you selected and runs the project's required checks.
- New stories use feature-scoped IDs; task/status changes update individual records.
- Logs are new standalone files. Existing logs and generated tracker views are not routinely edited.
- Review resolves all introduced/worsened findings; retro captures scoped learning before publication.
- Push/PR and merge remain separate user-controlled steps.

Use `brief verify-records --base=<pilot-migration-commit>` when reviewing the pilot change. A fresh
session should be able to retrieve its new learning through `brief memory list` and `brief memory show`.
Observe this in one project before rolling out to others.

## Workflow and execution modes

```text
discover → PRD → TRD → plan → implement → review/fix → retro
  → final checks → approved push/PR → user testing → approved merge
```

The [router](skills/brief/SKILL.md) owns phase order. Planning explicitly reads relevant project
rules, decisions, and agent guidance. Requirements and technical choices are settled before execution.

| Mode | Local commits | Human checkpoints |
| --- | --- | --- |
| strict | Ask before each commit | Every commit, plus publication |
| selective | Commit verified routine work | Critical changes, planned manual/browser checks, publication |
| auto | Complete authorized local story work | End-of-story publication gate |

The agent recommends selective for critical/manual work and auto for clear work covered by automated
checks; the user chooses. Every mode asks about unresolved ambiguity and preserves protected-operation
approvals. A mode does not authorize deployment, data migration, push, or merge.

[Review](skills/brief/pr-review/SKILL.md) fixes confirmed introduced/worsened issues at every severity.
Existing debt remains the user's fix/defer choice. [Retro](skills/brief/retro/SKILL.md) and authorized
guidance improvements finish before publication by default. Explicit urgency can defer retro with a
recorded owner and completion trigger. Later changes receive incremental review and affected checks.

## Records, logs, and memory

Canonical Markdown authority is selected by `.brief/records.json`. The reserved `_brief` metadata
preserves record identity and fields. Use the CLI for mutations and retain that metadata when editing prose.

New story IDs are feature-scoped, such as `checkout/S-001`; tasks use `checkout/S-001-T1`. Existing IDs
remain valid. Different features can reuse their story numbers. Concurrent edits to the same record,
or separate allocations within the same feature, still need coordination.

```bash
brief story create "Checkout improvements" --feature=checkout
brief story task create checkout/S-001 "Validate inputs" --body="Acceptance checks..."
brief story task update checkout/S-001-T1 status=done
brief log add "Validation complete" --session=checkout-session --agent=codex --story=checkout/S-001
brief verify-records --base=HEAD
```

Use the IDs returned by the CLI; the example assumes the first story/task in a new feature.
Every log entry is a separate immutable file. Keep historical `log.md`, `logs.md`, and previous entries intact.

Project memory lives in `documentation/memory/`, indexed by `MEMORY.md`. Explicit user choices are
captured with their source and scope; broader promotion needs user agreement. Planning consumes that
knowledge so implementation can reuse settled decisions.

```bash
brief memory list
brief memory show your-memory-slug
brief search "database design"
brief query "handleSubmit"
brief help
```

See the [CLI guide](rules/brief.md), [memory contract](skills/brief/memory/SKILL.md), and
[record/install contract](skills/brief/references/records-and-installation.md) for details.

## Updates

Update the CLI through npm, then review the available machine workflow update:

```bash
npm install --global getbrief@latest
brief update --dry-run --global
```

After reviewing the changes:

```bash
brief update --apply --global
```

Inside each project with a local package:

```bash
brief update --check
brief update --dry-run
```

Apply the reviewed project update with `brief update --apply`, run `brief doctor`, and commit its diff.
Global updates do not silently replace pinned project copies. A global-scope project instead uses
the updated machine package. Reload agent sessions after changing installed instructions.

No `--source` is required for normal npm or npm-linked use. Project init/update checks the home package,
then installed CLI assets. Global install/update uses CLI assets. To test a local checkout, unpacked
package, or directory symlink, explicitly pass `--source=/path/to/getbrief`. Remote URLs are not fetched.

Update notices support `brief update --notice=on`, `off`, or `snooze` (one day). These checks compare
available local packages; they do not poll npm or automatically download releases.

## Recovery

- An interrupted workflow installation/update blocks further writes. Use `brief update --recover`
  for a project, or add `--global` for the machine package. Recovery refuses to overwrite later edits.
- Record migration rollback is `brief tracker rollback-authority --apply`. It restores original inputs
  only when no later edits or new records would be lost. Inspect Git staging afterward; re-stage restored
  tracker files if you previously untracked them.
- Customized or unowned files are preserved. Inspect reported conflicts and reconcile their intended
  content; do not delete directories or historical logs to make installation pass.

## Local development

Before the npm release, or when working on Brief itself:

```bash
git clone https://github.com/bansaldeepak/getbrief.git
cd getbrief
npm ci
npm link
brief --help
```

The linked `brief` command reads this checkout. Workflow copies remain pinned until explicitly updated.
Use `brief install --dry-run` for first setup, or `brief update --dry-run --global` for an existing home
package, before applying the corresponding operation.

```bash
npm test
npm run check:skills
npm pack --dry-run
```

Tests cover CLI behaviour, record integrity, ownership/recovery, concurrent work, and portable packages.
They do not replace the real-agent pilot above. [Implementation evidence](documentation/stories/portable-concurrent-workflows/S-018/summary.md)
records the tested revisions and remaining publication boundaries.

For maintainers who intentionally need live workflow links to a checkout, `build.sh` remains available.
Keep this separate from the pinned npm installation flow. Its `--adopt-existing` option is only for
reviewed legacy ownership conflicts, with backups; it is not a general overwrite flag.
Test that installer without touching the real home configuration:

```bash
brief_test_home=$(mktemp -d)
./build.sh --home-dir "$brief_test_home" --dry-run
./build.sh --home-dir "$brief_test_home"
./check.sh --home-dir "$brief_test_home"
```
