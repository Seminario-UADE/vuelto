---
name: ai-project-setup
description: >
  Retro-documents an existing project by generating the standard AI-assisted
  development structure: CLAUDE.md (or equivalent), docs/ with architecture,
  decisions, and runbooks, tools/scripts/, and .claude/skills/. Use this skill
  whenever the user wants to "set up AI context for my project", "add docs for
  Claude", "retro-document this repo", "structure this project for AI", or says
  the project has no CLAUDE.md / AGENTS.md yet. Also trigger when the user
  pastes a codebase structure and asks how to organize it for AI agents.
---

# AI Project Setup (Retro-Documentation)

This skill walks through adding the standard AI-assisted development structure
to an **existing** project. The goal is to give any AI agent enough context to
work effectively without the developer having to re-explain things every session.

The process is **interactive**: propose each section, wait for approval or
adjustments, then generate. Never dump everything at once.

---

## Why this structure exists

AI agents have no persistent memory between sessions. Without explicit context
files, the agent guesses at stack, conventions, and decisions — leading to
inconsistent output. The structure below solves this by externalizing context
into files the agent reads on startup or on demand.

The four concerns are:
1. **Identity** — what is this project? (`CLAUDE.md` / `AGENTS.md`)
2. **Architecture** — how is it built? (`docs/architecture/`)
3. **Decisions** — why was it built this way? (`docs/decisions/`)
4. **Runbooks** — how do we operate it? (`docs/runbooks/`)
5. **Scripts** — repeatable tasks (`tools/scripts/`)
6. **Skills** — reusable AI commands (`.claude/skills/`)

---

## Step-by-step process

### Step 0 — Scan the project first

Before proposing anything, read or ask for:
- The directory tree (run `find . -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/.git/*'` if on filesystem)
- The main `package.json`, `pyproject.toml`, or equivalent
- Any existing README

This prevents generating docs that contradict what's already there.

---

### Step 1 — CLAUDE.md (project identity file)

**Propose** a draft covering:
- Project name and one-line purpose
- Tech stack with versions
- Key commands (`dev`, `build`, `test`, `deploy`)
- Architectural patterns in use (e.g. server components, repository pattern)
- Data models summary (tables, main entities)
- Rules section (behaviors the AI should always follow in this project)

**Wait for approval.** Common things to adjust: removing patterns the dev
doesn't use (e.g. server actions), updating versions, adding custom rules.

> The rules section is high-value. Ask the user: "Are there things you always
> have to tell Claude to do or not do in this project?" — those belong here.

Name the file based on the tool: `CLAUDE.md` for Claude Code, `AGENTS.md` for
OpenAI Codex/generic agents, `.cursorrules` for Cursor. For tool-agnostic
projects, use `AGENTS.md` and note the equivalents.

---

### Step 2 — docs/architecture/

**Propose** splitting architecture into numbered files:
```
docs/architecture/
  00-overview.md       — stack, top-level diagram, entry points
  01-data-models.md    — entities, relationships, schema summary
  02-api-routes.md     — endpoints or tRPC/GraphQL structure
  03-frontend.md       — component patterns, state management, routing
  04-infrastructure.md — deployment, env vars, external services
```

Only include files that are relevant to the project. A pure frontend project
doesn't need `02-api-routes.md`. Ask which sections apply before generating.

**Wait for approval of the file list, then generate one file at a time.**

Each file should be a concise reference, not a tutorial. Think: "what would
a new dev need to understand this part in 2 minutes?"

---

### Step 3 — docs/decisions/

Architectural Decision Records (ADRs) — short files explaining *why* a choice
was made. Format each as:

```markdown
# ADR-001: [Technology or Pattern Name]

## Context
What problem were we solving?

## Decision
What did we choose?

## Rationale
Why this option over alternatives?

## Consequences
What trade-offs does this introduce?
```

**Ask the user:** "What are 3–5 decisions in this project that a future dev
(or AI) might question?" Examples: why this DB, why this auth strategy, why
this folder structure, why this deployment platform.

Generate one ADR per decision. These don't need to be exhaustive — even 2–3
good ones are valuable.

---

### Step 4 — docs/runbooks/

How-to guides for operational tasks. Unlike ADRs (why), runbooks are about
*how*. Examples:
- `deployment.md` — how to deploy to production
- `db-migrations.md` — how to run and write migrations
- `local-setup.md` — how to set up the project from scratch
- `seed-data.md` — how to populate dev data

**Ask the user:** "What are the tasks you always have to look up or explain
to someone new?" Those are your runbooks.

---

### Step 5 — tools/scripts/

Scripts that the AI (or devs) can call directly instead of recreating. Common
candidates:
- `create-user.ts/py` — create a user with roles via CLI
- `seed.ts/py` — populate dev database
- `reset-db.ts/py` — tear down and recreate local DB

**Propose** based on the project type. For a web app with auth, suggest a
user-creation script. For a data project, suggest a seed/reset script.

These scripts should be self-contained and runnable with a single command.

---

### Step 6 — .claude/skills/ (optional, high-value)

Skills are reusable AI command shortcuts. Only suggest these if the user is
using Claude Code specifically.

Propose 2–3 skills based on what the project needs. Common patterns:
- `/test-ui` — open browser, navigate to changed route, verify visually
- `/deploy` — build → check errors → commit → push
- `/review` — run linter + tests + summarize what changed

Each skill is a folder with a `SKILL.md` inside:
```
.claude/skills/
  deploy/SKILL.md
  test-ui/SKILL.md
```

Format of each SKILL.md:
```markdown
---
name: deploy
description: Build, verify, commit and push the project.
---

Steps:
1. Run `npm run build` (or equivalent)
2. If build fails, fix errors and retry
3. If build passes, run `git commit -am "[describe changes]"`
4. Run `git push`
```

---

## Interaction principles

- **One section at a time.** Don't generate all 6 steps in one response.
- **Show a preview before writing files.** For each section, show what you're
  about to create and ask "Does this look right, or should I adjust anything?"
- **Be direct about gaps.** If the project doesn't have enough info to fill a
  section, say so and ask the specific questions needed.
- **Don't over-document.** A 3-line architecture overview that's accurate is
  better than a 200-line one that's half-guessed.
- **Remind the user that docs rot.** Suggest they update the relevant file
  whenever they make a significant architectural change — or ask Claude to do
  it as part of the task.

---

## Reference

See `references/project-structure-template.md` for the complete file tree and
content templates used in Steps 1–6.
