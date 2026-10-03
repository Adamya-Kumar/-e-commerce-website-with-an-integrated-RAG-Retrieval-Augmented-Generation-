# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Website (not started)

## Current Goal

- Scaffold the monorepo and Spark tokens (unit P1-01).

## Completed

- None yet.

## In Progress

- None yet.

## Next Up

- P1-01 Monorepo scaffold and health checks (see `context/specs/phase-1-website.md`).

## Open Questions

- Product/brand name (working title "Spark Commerce").
- Agent checkpointer for production: SQLite file is fine for local; decide persistence before deploy (P2-11).
- Hosting targets for client, server, chatbot.

## Architecture Decisions

- Spark look is applied to the whole site (storefront + admin + chat), via Tailwind with Spark tokens as CSS variables.
- JavaScript (no TypeScript); Vite + React; Express + Mongoose.
- Chatbot is a separate Python service (FastAPI + LangGraph); Chroma for retrieval; Gemini for chat + embeddings.
- Chatbot acts only through the Express API using the user's token; no direct DB access.
- Confirmation interrupt required for place order, cancel, return, clear cart.
- Payments: Cash on Delivery only in v1. Images: Cloudinary.

## Session Notes

- Folder skeleton created at the workspace root (`client/`, `server/`, `chatbot/` plus `.gitignore` and `.editorconfig`). No packages, apps, routes, or unit code. P1-01 is still the next unit.
- After each verified unit, print git add / commit / push commands and do not run them (`.cursor/rules/after-unit-git.mdc`).
