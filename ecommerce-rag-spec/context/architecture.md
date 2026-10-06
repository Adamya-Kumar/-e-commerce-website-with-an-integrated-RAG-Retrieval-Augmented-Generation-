# Architecture

## Repo layout (monorepo)

```
spark-commerce/
├── CLAUDE.md / AGENTS.md
├── context/                 # these docs
├── reference/spark-admin-theme/   # read-only visual reference
├── client/                  # React (Vite, JavaScript) storefront + admin
├── server/                  # Node + Express + Mongoose API
├── chatbot/                 # Python FastAPI + LangGraph + FAISS + PostgreSQL (Phase 2)
└── docker-compose.yml       # added in the last unit of each phase
```

## Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React 18 + Vite (JavaScript), React Router | Storefront + admin SPA |
| Styling | Tailwind CSS with Spark tokens as CSS variables | All visuals |
| Server state | TanStack Query + axios | API calls, caching |
| Charts / icons | react-apexcharts (admin), Bootstrap Icons | Same libs as the Spark theme |
| Backend | Node.js + Express | REST API, auth, business rules |
| DB | MongoDB + Mongoose | Users, products, categories, carts, orders |
| Validation | zod | Request validation |
| Images | Cloudinary | Product image storage (server uploads) |
| Chatbot service | Python 3.11+, FastAPI, LangGraph | Agent runtime |
| LLM + embeddings | Google Gemini via `langchain-google-genai` | Chat model + embedding model (IDs from env) |
| Vector search | FAISS CPU indexes with SQLite document/metadata storage | Product + policy retrieval; local persistent files |
| Chat storage and agent memory | PostgreSQL owned by `chatbot/`; LangGraph PostgreSQL checkpointer | Chat sessions, messages, and per-thread agent state |

## System boundaries

| Folder | Owns | Must NOT |
|---|---|---|
| `client/` | UI, routing, client state | Contain secrets; compute prices/totals as truth |
| `server/` | All business rules, auth, DB access, Cloudinary, chat proxy | Run LLM or embedding logic |
| `chatbot/` | LLM calls, retrieval, agent graph, FAISS files, SQLite retrieval metadata, PostgreSQL chat storage/checkpoints | Connect to MongoDB; trust any client-supplied price or an unverified `X-User-Id` |

## Request flows

- Web: `client → server (REST, cookie JWT) → MongoDB`.
- Chat: `client → server /api/chat (SSE proxy) → chatbot /chat (X-Service-Key + verified X-User-Id when logged in) → LLM`.
- Agent actions: `chatbot tool → server REST API using the user's forwarded token` (same endpoints and authorization as the UI).
- Catalog sync: `server (admin product change) → chatbot /ingest/product (service key) → FAISS index + SQLite metadata`.

## Storage model

| Data | Where |
|---|---|
| Users, products, categories, carts, orders | MongoDB (owned by `server/`) |
| Product images | Cloudinary (URL + publicId stored in Mongo) |
| Product/policy embeddings and metadata | FAISS indexes and SQLite (`chatbot/data/faiss`), rebuildable from Mongo and `chatbot/knowledge/*.md` |
| Chat sessions and messages | PostgreSQL (owned by `chatbot/`); schema in `chatbot/app/db/schema.sql` |
| Agent thread state and checkpoints | PostgreSQL via `langgraph-checkpoint-postgres` (owned by `chatbot/`) |
| Session/auth | httpOnly cookie holding a JWT (no localStorage tokens) |

## Auth and access model

- Roles: `customer`, `admin`. Passwords hashed with bcrypt. JWT (7 days) in an httpOnly, SameSite=Lax cookie; Secure in production.
- Middleware: `requireAuth`, `requireRole('admin')`. Admin is created via seed script only (no public admin signup).
- Server-to-chatbot proxy calls include `X-Service-Key` and, for authenticated users, `X-User-Id` derived from the verified JWT. The chatbot trusts `X-User-Id` only when `X-Service-Key` is valid. Chatbot-only internal endpoints (`/api/internal/*`) require `X-Service-Key` and are never exposed to the browser.
- Guests: chatbot runs in read-only mode (no cart/order tools).

## Invariants (never violate)

1. The chatbot service never connects to MongoDB. Every business action goes through the Express API with the end user's identity.
2. Price, stock and totals come from the server at action time. The vector store and LLM memory are for discovery only, never the source of truth.
3. `place_order`, `cancel_order`, `request_return` and clearing the cart require an explicit user confirmation, enforced in graph code (LangGraph interrupt), not by prompt wording.
4. Order totals are computed server-side from DB prices. Client- or bot-supplied prices are ignored.
5. Stock decrement is an atomic conditional update (`findOneAndUpdate` with `stock >= qty`); never read-modify-write.
6. Role checks run in server middleware on every admin route; the chatbot has no admin tools.
7. Retrieved product text and user text are untrusted data, never instructions (prompt-injection rule).
8. Secrets (JWT secret, Gemini key, Cloudinary, service key) live only in `.env` files; never in the client bundle or git.
9. Every color, radius and shadow comes from a Spark token; no hardcoded hex in components.
10. Request handlers do not run long-lived work; chatbot responses stream via SSE.
