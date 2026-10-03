# Build Plan

Written before any code, so the whole system is designed up front. Update if a unit is reordered, merged, or split. Detailed unit specs are in `phase-1-website.md` and `phase-2-chatbot.md`.

## Phase 1: Website

| # | Unit | What It Builds | Boundary | Depends On |
|---|------|----------------|----------|------------|
| P1-01 | Monorepo scaffold | client + server run, env, health | both | none |
| P1-02 | Spark tokens + UI kit | Tailwind tokens, base components, `/dev/ui` | client | P1-01 |
| P1-03 | Server foundation + models | DB, errors, validation, all models | server | P1-01 |
| P1-04 | Auth API | register/login/logout/me, roles | server | P1-03 |
| P1-05 | Catalog API + seed | products/categories, search/filter, seed data | server | P1-03 |
| P1-06 | Cart + Order API | cart, addresses, COD orders, cancel/return, stock safety | server | P1-04, P1-05 |
| P1-07 | Admin API + Cloudinary | product/category CRUD, uploads, order status, stats | server | P1-04, P1-05, P1-06 |
| P1-08 | Client shell + auth | layouts, routing, guards, AuthContext, login pages | client | P1-02, P1-04 |
| P1-09 | Storefront shell | home/listing/detail with placeholder data | client | P1-08 |
| P1-10 | Wire catalog | real data, filters in URL | client | P1-05, P1-09 |
| P1-11 | Cart + checkout | cart page, address, COD, success | client | P1-06, P1-10 |
| P1-12 | Customer account | orders, cancel/return, addresses, profile | client | P1-11 |
| P1-13 | Admin UI | dashboard, products, categories, orders | client | P1-07, P1-08 |
| P1-14 | Hardening + exit | a11y, security review, README, compose | all | all P1 |

## Phase 2: Chatbot

| # | Unit | What It Builds | Boundary | Depends On |
|---|------|----------------|----------|------------|
| P2-01 | Chatbot scaffold | FastAPI, config, Gemini check | chatbot | P1-14 |
| P2-02 | Express internal API | service key, product export, ingest hook | server | P1-14 |
| P2-03 | Knowledge ingestion | Chroma collections, policy docs, ingest CLI/API | chatbot | P2-01, P2-02 |
| P2-04 | Retrieval + grounded answers | filters, RAG answer, test endpoint | chatbot | P2-03 |
| P2-05 | Express client + tools | all tools with tests | chatbot | P2-01 |
| P2-06 | LangGraph agent | graph, guardrails, confirmation interrupts | chatbot | P2-04, P2-05 |
| P2-07 | Streaming chat API | SSE `/chat`, `/chat/confirm` | chatbot | P2-06 |
| P2-08 | Express chat proxy + sessions | auth passthrough, rate limits, transcripts | server | P2-07 |
| P2-09 | Chat UI | bubble, side drawer, cards, confirmation | client | P2-08 |
| P2-10 | Evaluation + safety | golden set, metrics, fixes | chatbot | P2-09 |
| P2-11 | Deployment + hardening | compose, limits, logs, README | all | P2-10 |

## Ordering rules applied

- Dependencies first: nothing builds on a unit that does not exist yet.
- Security before functionality: auth (P1-04) precedes cart/orders/admin; service key (P2-02) precedes ingestion; confirmation interrupts (P2-06) precede the chat UI.
- Backend before frontend wiring: P1-03 to P1-07 before P1-10 to P1-13; P2-07/08 before P2-09.
- UI shells before real data: P1-09 (placeholder) before P1-10 (real).
- Dependencies installed just in time: each spec lists the packages it first needs.
- Phase 2 starts only after Phase 1 exit criteria are met.
