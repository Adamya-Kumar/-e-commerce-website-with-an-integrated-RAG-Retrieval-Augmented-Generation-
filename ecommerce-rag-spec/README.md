# Spark Commerce: Spec Pack (Six-File Context System)

Spec pack for an ecommerce website with an integrated RAG/agentic shopping assistant, styled after the Spark Admin theme.

## What is inside

```
CLAUDE.md / AGENTS.md          entry point the coding agent reads every session
context/
  project-overview.md          what, who, flows, scope, success criteria
  architecture.md              stack, boundaries, storage, auth, 10 invariants
  code-standards.md            conventions for client, server, chatbot
  ai-workflow-rules.md         scoping rules, protected files, checklist, 3-prompt cycle
  ui-context.md                Spark tokens, typography, radii, layouts, chatbot UI
  progress-tracker.md          current phase, next unit, open questions
  specs/
    00-build-plan.md           25 ordered units (14 + 11)
    phase-1-website.md         Phase 1 sub-spec: data model, API, units P1-01..14
    phase-2-chatbot.md         Phase 2 sub-spec: agent graph, tools, units P2-01..11
reference/spark-admin-theme/   your uploaded theme (read-only visual reference)
```

## How to use (Claude Code, Cursor, etc.)

1. Create a repo; copy this folder's contents to the repo root. Use `CLAUDE.md` for Claude Code or `AGENTS.md` for other agents (identical content).
2. Start a session with the Implement prompt for the first unit:
   `Read context/specs/phase-1-website.md, section P1-01. Update context/progress-tracker.md to mark it in progress. Implement exactly as specified. Do not go beyond this unit.`
3. If something does not match: use the Correct prompt. When it passes the checklist: use the Close prompt. Then move to the next unit in `00-build-plan.md`.
4. Do not start Phase 2 until Phase 1 exit criteria pass.

## Decisions you made (project constraints)

| Area | Decision |
|---|---|
| UI | Whole site copies Spark's colors, font, look and feel |
| Language | JavaScript (client and server) |
| Styling | Tailwind with Spark colors/radius as tokens |
| Users | Customers + Admin |
| Payments | Cash on Delivery only |
| Store | Generic multi-category (electronics, fashion, home) |
| Images | Cloudinary |
| Chatbot abilities | Recommend (RAG), manage cart, place/track/cancel/return orders (no admin tasks) |
| Chatbot UI | Floating bubble opening a side drawer |
| Chatbot stack | Python FastAPI + LangGraph, ChromaDB, Gemini (chat + embeddings) |

## Defaults I chose (low risk, change any of them)

- Vite + React Router + TanStack Query; zod validation; Jest/Vitest/pytest.
- JWT in httpOnly cookie; admin created by seed script only.
- Guests can chat and get recommendations but need to log in for cart/orders (no guest cart).
- Browser talks to Express; Express proxies to the chatbot (keeps cookies/CORS simple and hides the service key).
- Confirmation required for place order, cancel, return, clear cart. Cart add/update/remove run directly.
- Return window 7 days after delivery; free shipping above 999 INR, else 49 INR.
- Agent memory in a SQLite checkpointer for v1.
- Gemini model IDs are read from env; check the current IDs in Google AI Studio when you reach P2-01.

## Reference links (official docs)

- LangGraph: https://langchain-ai.github.io/langgraph/
- ChromaDB: https://docs.trychroma.com
- Gemini API: https://ai.google.dev/gemini-api/docs
- FastAPI: https://fastapi.tiangolo.com
- Tailwind CSS: https://tailwindcss.com/docs
- Cloudinary: https://cloudinary.com/documentation
- Bootstrap Icons: https://icons.getbootstrap.com
- ApexCharts: https://apexcharts.com/docs
