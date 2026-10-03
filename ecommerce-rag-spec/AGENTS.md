## Application Building Context

Read the following files in order before implementing
or making any architectural decision:

1. `context/project-overview.md` — product definition,
   goals, features, and scope
2. `context/architecture.md` — system structure,
   boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography,
   and component conventions
4. `context/code-standards.md` — implementation rules
   and conventions
5. `context/ai-workflow-rules.md` — development workflow,
   scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase,
   completed work, open questions, and next steps

Update `context/progress-tracker.md` after each
meaningful implementation change.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.

## Project-specific additions

- Specs live in `context/specs/`. Read `00-build-plan.md` first, then the
  phase spec for the unit you are building:
  `phase-1-website.md` (Phase 1) or `phase-2-chatbot.md` (Phase 2).
- Phase 2 does not start until every Phase 1 unit is marked complete in
  `context/progress-tracker.md`.
- The visual source of truth is the Spark Admin theme in
  `reference/spark-admin-theme/` (read `assets/css/main.css` and the HTML
  pages). Port its look; never invent new colors, radii or fonts.
- Work on exactly one unit per session. Do not exceed the unit's scope.
- When a unit is verified, do not run git. End the reply with copy-paste
  PowerShell `git add`, `git commit -m "Feature: <unit id> <short name>: pass"`,
  and `git push -u origin HEAD`. See `.cursor/rules/after-unit-git.mdc`.
