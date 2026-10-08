# Code Standards

## General
- JavaScript (ES modules) for `client/` and `server/`. No TypeScript. Use JSDoc for non-obvious function shapes.
- Python 3.11+ for `chatbot/`, with type hints, `ruff` for lint/format, `pytest` for tests.
- Prettier + ESLint in `client/` and `server/`. Single quotes, semicolons, 2-space indent.
- No dead code, no commented-out blocks, no `console.log` left behind (use the logger).

## client/ (React)
- Function components + hooks only. One component per file, PascalCase filename.
- Folders: `src/components/ui` (Spark UI kit), `src/components/shop`, `src/components/admin`, `src/components/chat`, `src/layouts`, `src/pages/{shop,account,admin,auth}`, `src/hooks`, `src/api` (axios instance + per-resource modules), `src/context` (AuthContext, CartContext).
- Server data via TanStack Query hooks in `src/api/*`; never `fetch` inside components.
- Forms: controlled inputs + zod schemas; show inline errors using the Spark invalid state.
- Routes: `/`, `/products`, `/products/:slug`, `/cart`, `/checkout`, `/account/*`, `/login`, `/register`, `/admin/*`. Admin routes wrapped in a role guard.
- Every data view has loading (skeleton), empty, and error states.

## Styling rules
- Tailwind utility classes only; theme values come from `tailwind.config.js`, which maps to CSS variables in `src/styles/tokens.css`.
- No hardcoded hex/rgb/px-radius in components. Use token classes (`bg-forest-dark`, `text-muted-green`, `rounded-xxl`, `shadow-spark-md`).
- No inline `style` except dynamic values (chart sizes, progress widths).
- Port component looks from `reference/spark-admin-theme/assets/css/main.css`; do not restyle from memory.

## server/ (Express)
- Folders: `src/config`, `src/models`, `src/routes`, `src/controllers`, `src/services`, `src/middleware`, `src/validators`, `src/utils`, `src/scripts` (seed).
- Routes are thin; business rules live in `services/`. Controllers never touch `req` inside services.
- Validate every body/query/params with zod middleware before the controller.
- API conventions: prefix `/api`; JSON only; success `{ data, meta? }`; error `{ error: { code, message, details? } }`; correct HTTP codes (400/401/403/404/409/422).
- Pagination: `?page=1&limit=12`, response `meta: { page, limit, total, totalPages }`.
- Money stored as integer paise (INR minor units); format only in the client.
- Mongoose: explicit indexes (`slug` unique, text index on title/description/tags, `user` on cart/order). Never return `passwordHash`.
- Central error handler; async handlers wrapped (no unhandled rejections).
- Security: helmet, CORS allow-list from env, rate limit on auth and chat routes, bcrypt cost 10+, sanitize Mongo operators in input.

## chatbot/ (FastAPI + LangGraph)
- Folders: `app/main.py`, `app/config.py`, `app/api/` (routes, SSE), `app/agent/` (graph, state, prompts, guardrails), `app/tools/` (one file per tool group), `app/rag/` (ingest, retrieve, chunking), `app/clients/` (express client), `tests/`, `knowledge/` (policy/FAQ markdown), `eval/`.
- Config only via `pydantic-settings` from env. Groq (`GROQ_CHAT_MODEL`) is the primary chat model. Gemini (`GEMINI_CHAT_MODEL`) is the fallback. Embeddings stay on `GEMINI_EMBED_MODEL`. Never hardcode model ids.
- PostgreSQL connection configuration comes from `POSTGRES_URL`. Keep the chatbot-owned SQL schema in `app/db/schema.sql`; use SQL directly and do not add an ORM.
- Each tool: pydantic input schema, short docstring written for the LLM, returns compact JSON (ids, names, prices, stock), never raw HTML or long text.
- Tools call the Express API only through `app/clients/express.py` (httpx, timeouts, user token forwarded).
- Prompts live in `app/agent/prompts.py` as constants; no prompt strings scattered in code.
- Log every tool call (name, args, latency, status) with the thread id. Never log tokens or full user PII.

## Data and storage rules
- Mongo `_id` exposed to clients as `id`. Slugs for product URLs.
- FAISS stores normalized vectors for cosine search; SQLite stores documents and metadata (`type`, `product_id`, `slug`, `category`, `price_paise`, `in_stock`). Re-ingest on product change.
- PostgreSQL stores chatbot-owned chat sessions, messages, and LangGraph checkpoints. Do not store chat sessions in MongoDB.
- Delete uploads from Cloudinary when a product image is removed.

## Testing
- server: Jest + Supertest for auth, cart, orders (happy path + stock race + forbidden roles).
- client: Vitest + React Testing Library for key components and checkout flow.
- chatbot: pytest for tools, guardrails, graph interrupts; eval script for the golden set.
