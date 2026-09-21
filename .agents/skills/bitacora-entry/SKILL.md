---
name: bitacora-entry
description: Append a formatted session entry to docs/bitacora-prompts.md
disable-model-invocation: true
---

# bitacora-entry

Log the current AI working session in `docs/bitacora-prompts.md`, following
the format the cátedra requires (see the file's own header and existing
entries for the template).

## Steps

1. Read `docs/bitacora-prompts.md` to see the existing entries and confirm
   the exact format (there's a blank `YYYY-MM-DD — Título de la sesión`
   template at the bottom of the file — use it as the section skeleton).
2. Reconstruct this session from the conversation so far:
   - **Fecha**: today's date.
   - **Herramienta**: e.g. "Claude Code (Sonnet 5)".
   - **Objetivo**: one line, what this session was for.
   - **Prompts principales**: the 2-5 key prompts/requests the user actually
     made (paraphrase long ones, quote short ones verbatim).
   - **Resultado**: what actually changed (files created/edited, decisions
     made) — be concrete, not generic.
3. Insert the new entry **above** the blank template section (keep the
   blank template at the bottom for the next session), following the same
   heading level and field order as the existing entries.
4. Do not rewrite or reformat prior entries — only append.
