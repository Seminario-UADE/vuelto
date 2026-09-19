# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo uses a custom layout instead of the generic `CONTEXT.md` + `docs/adr/` convention — it predates this skill and already covers the same ground:

## Before exploring, read these

- **`docs/product/`** — product context: what Vuelto is, the problem it solves, scope and out-of-scope. Read this in place of `CONTEXT.md`.
- **`docs/architecture/`** — technical architecture.
- **`docs/decisions/`** — decisions and their reasoning. Read this in place of `docs/adr/`.
- **`CLAUDE.md`** at the repo root — canonical rules the AI must always follow in this project (determinism boundary between the rules engine and the LLM, schema constraints, RLS timing, etc.). Treat these as non-negotiable constraints, not suggestions.
- **`docs/bitacora-prompts.md`** — log of AI work sessions, kept for the university seminar (cátedra). Not a source of domain truth, but useful for "why was this done this way" history.

If any of these don't exist yet, proceed silently — don't flag their absence.

## File structure

Single-context repo:

```
/
├── CLAUDE.md
└── docs/
    ├── product/        ← domain context (replaces CONTEXT.md)
    ├── architecture/    ← technical architecture
    ├── decisions/       ← decisions and reasoning (replaces docs/adr/)
    └── bitacora-prompts.md
```

There are no monorepo signals in this repo (no `package.json` yet, no `packages/*`), so this stays single-context. Re-run `setup-matt-pocock-skills` if that changes.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/product/`. Don't drift to synonyms the docs explicitly avoid — e.g. this project is emphatic that it is not "mostrar promociones" (see `CLAUDE.md`'s "Regla de oro").

If the concept you need isn't documented yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for whoever owns `docs/product/`).

## Flag decision conflicts

If your output contradicts an existing entry in `docs/decisions/`, or a rule in `CLAUDE.md`, surface it explicitly rather than silently overriding:

> _Contradicts docs/decisions/000X-foo.md, but worth reopening because…_
