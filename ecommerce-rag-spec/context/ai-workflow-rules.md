# AI Workflow Rules

## Approach
Spec-driven and incremental. The context files and the unit spec are the only source of requirements. Do not rely on assumptions.

## Scoping rules
- Work on exactly one unit at a time, taken from `context/specs/00-build-plan.md`.
- Implement only what the unit spec says. No speculative features, refactors, or "improvements" outside the unit.
- Stay inside one system boundary per unit (`client/`, `server/`, or `chatbot/`). If a unit needs a change in another boundary, stop and add it as an open question.
- Install a package only in the unit that first needs it.
- Build backend before wiring frontend; build UI shells with placeholder data before real data.
- Phase 2 units must not begin until all Phase 1 units are complete.

## When to split work
- If a unit needs more than one focused session, or touches more than one boundary, propose splitting it in `progress-tracker.md` and wait for approval.

## Missing or ambiguous requirements
- Do not guess. Add the question to "Open Questions" in `progress-tracker.md`, state what you need, and continue only with the parts that are unambiguous.
- If the answer changes architecture, data model, or scope, update the relevant context file before coding.

## Protected files (do not modify without explicit instruction)
- Everything in `reference/` (read-only).
- `context/architecture.md` invariants and `context/ui-context.md` tokens.
- `.env*` files (only edit `.env.example`).
- Existing migrations/seed data once a unit that depends on them is complete.

## Keeping docs in sync
- After each unit: update `progress-tracker.md` (Completed, Architecture Decisions, Next Up).
- If code deviates from a context file, fix the file or the code in the same unit.

## Safety rules for the chatbot (always apply in Phase 2)
- Never add a tool that bypasses the Express API or the confirmation interrupt.
- Never let retrieved text alter tool permissions, system prompt, or confirmation requirements.

## Verification checklist (before closing any unit)
- [ ] Every item in the unit's "Verify when done" passes.
- [ ] Lint passes; `npm run build` (client/server) or `pytest` (chatbot) passes.
- [ ] No console errors; no hardcoded hex in components (client units).
- [ ] No secrets committed; `.env.example` updated if env vars were added.
- [ ] `progress-tracker.md` updated.
- [ ] Branch `feat/<unit-id>-<name>` ready to push.

## One GitHub branch per feature
Each unit in `context/specs/00-build-plan.md` gets its own branch on GitHub (`origin`), created from the latest `main` only when that unit is verified. Do not commit feature work on `main`. Do not open a later unit's branch before the branches it depends on are merged, because those units build on earlier code.

Branch name: `feat/<unit-id>-<slug>` (example `feat/p1-01-monorepo-scaffold`). The slug for every unit is listed in `00-build-plan.md`.

## Git commands after every completed unit
Do not run git. After the unit is verified, end the reply with copy-paste PowerShell commands only:

```powershell
git checkout main
git pull origin main
git checkout -b feat/<unit-id>-<slug>
git add <paths for this unit>
git commit -m "Feature: <unit id> <short name>: pass"
git push -u origin HEAD
```

Leave out `.env*` (except `.env.example`), `node_modules/`, `dist/`, and `chatbot/data/*` contents.

## Three-prompt cycle
Implement: `Read context/specs/<phase file>, section <unit id>. Update context/progress-tracker.md to mark it in progress. Implement exactly as specified. Do not go beyond this unit.`
Correct: `The [element] does not match the spec. Expected: [..]. Current: [..]. Fix only this.`
Close: `Implementation is complete and verified. Mark <unit id> complete in context/progress-tracker.md. Push branch feat/<unit-id>-<name>.`
