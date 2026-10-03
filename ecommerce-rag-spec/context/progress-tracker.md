# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Website

## Current Goal

- P1-04 Auth API.

## Completed

- P1-01 Monorepo scaffold and health checks. Vite client and Express server start. `GET /api/health` returns `{ data: { status: 'ok' } }` on port 5000 and through the Vite proxy. ESLint passes in both apps. `npm run build` passes in `client/`.
- P1-02 Spark tokens and UI kit. CSS variables in `client/src/styles/tokens.css`, Tailwind maps them, Plus Jakarta Sans and Bootstrap Icons load, and `/dev/ui` renders the base kit (buttons, forms, badges, table, modal, drawer, dropdown, toast, pagination, skeleton, empty state, spinner). No API calls. ESLint and `npm run build` pass. No hex colors in `client/src/components`.
- P1-03 Server foundation and models. Server connects to MongoDB database `spark-commerce`, logs listen with pino, and unknown routes return `{ error: { code: 'NOT_FOUND', message } }`. Zod `validate` returns 422 `{ error: { code: 'VALIDATION_ERROR', details } }`. Models: User, Category, Product, Cart, Order. Indexes: unique email, unique slugs, Product text index (`title`, `description`, `tags`, `brand`), unique cart user, order user. ESLint passes. ChatSession stays in P2-08.

## In Progress

- None.

## Next Up

- P1-04 Auth API (`context/specs/phase-1-website.md`).

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
- Money is integer paise. Shipping is free when the subtotal is above 999 INR; otherwise it is 49 INR (`server/src/config/commerce.js`).
- `MONGO_URI` may omit a database path. The server always connects to database `spark-commerce`.

## Session Notes

- P1-01 verified: both `npm run dev` processes stay up; the landing page shows “Spark Commerce” on canvas `#F4F6F5`; `/api/health` works directly and via the Vite proxy.
- P1-02 verified in the browser: `/` still shows “Spark Commerce” on canvas `#F4F6F5`. `/dev/ui` shows the kit. Primary button computes to forest-medium (`rgb(7, 47, 31)`) with 14px radius. Modal confirm, dropdown delete, pagination, toast dismiss, and the drawer open and close. Cards stack on a 390px-wide viewport. No Vite error overlay.
- `react-router-dom` now serves `/` and `/dev/ui`. Full storefront and admin routing stays in P1-08. JWT and Cloudinary env names are in `server/.env.example`; those integrations start in later units.
- P1-03 verified: MongoDB connected to `spark-commerce`; `GET /api/health` still returns `{ data: { status: 'ok' } }`; `GET /api/does-not-exist` returns HTTP 404 `{ error: { code: 'NOT_FOUND', message: 'Cannot GET /api/does-not-exist' } }`. A request that fails zod returns HTTP 422 with `details` for each field. Index list includes `email_1` (unique), Category and Product `slug_1` (unique), `ProductTextIndex`, Cart `user_1` (unique), Order `user_1`. Slug helper turns "Noise Cancelling Headphones" into `noise-cancelling-headphones`. Pino logs `Server listening`. Morgan still logs requests. The verification server was stopped after the checks.
- After each verified unit, print git add / commit / push commands and do not run them (`.cursor/rules/after-unit-git.mdc`).
- Each unit is its own GitHub branch `feat/<unit-id>-<slug>`, created from latest `main` when that unit is verified. Names are in `context/specs/00-build-plan.md`. Branches are not created ahead of time, because later units depend on earlier ones merged to `main`.
