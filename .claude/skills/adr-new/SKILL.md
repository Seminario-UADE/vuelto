---
name: adr-new
description: Scaffold a new numbered ADR in docs/decisions/ following this repo's format
disable-model-invocation: true
---

# adr-new

Create a new architecture decision record in `docs/decisions/`, matching
the existing ones exactly.

## Steps

1. List `docs/decisions/` and find the highest existing number
   (`NNN-slug.md`). The new ADR is `NNN+1`.
2. Ask the user (if not already clear from context) for: the decision
   title, and enough of the reasoning to fill Context/Decision/Rationale/
   Consequences.
3. Create `docs/decisions/NNN-kebab-slug.md` with exactly these sections,
   in this order (see any existing ADR, e.g. `006-registro-de-compras-por-ticket.md`,
   for tone and level of detail):

   ```markdown
   # ADR-NNN: <Title>

   ## Context

   <the problem/constraint that forced a decision>

   ## Decision

   <what was decided, stated plainly>

   ## Rationale

   - <why, as bullet points>

   ## Consequences

   - <what this commits us to, what's now out, what's left open>
   ```

4. Write in Spanish, matching the register of the existing ADRs (direct,
   no filler, references other docs with relative links like
   `` `../product/alcance-mvp.md` `` where relevant).
5. If the decision reverses or supersedes an earlier ADR, note that
   explicitly in Context and cross-reference the old ADR by number.
