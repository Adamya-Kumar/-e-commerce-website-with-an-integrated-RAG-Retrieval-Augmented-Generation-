# Spark Commerce

Multi-category ecommerce site (electronics, fashion, home) with a shopping assistant. Spec source of truth: [`ecommerce-rag-spec/`](ecommerce-rag-spec/README.md).

P1-01 is the running scaffold: a Vite client and an Express server with `GET /api/health`. No storefront features yet. Phase 2 does not start until every Phase 1 unit is complete.

## Run locally

Use two terminals. Copy `server/.env.example` to `server/.env` before the first server start and replace the placeholder values with your local settings.

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | Yes | Express port for the API server. |
| `MONGO_URI` | Yes | MongoDB connection string for the app database. |
| `JWT_SECRET` | Yes | Secret used to sign the auth JWT and keep customer sessions secure. |
| `CLIENT_ORIGIN` | Yes | Allowed frontend origin for CORS. |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name for image storage. |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret. |
| `ADMIN_EMAIL` | Yes for admin seeding | Email for the seeded admin account. |
| `ADMIN_PASSWORD` | Yes for admin seeding | Password for the seeded admin account. |

```powershell
cd server
npm install
npm run dev
```

```powershell
cd client
npm install
npm run dev
```

- Client: http://localhost:5173
- Health, direct: http://localhost:5000/api/health
- Health, through the Vite proxy: http://localhost:5173/api/health

Both return `{ "data": { "status": "ok" } }`.

## Chatbot

The shopping assistant is a third service (`chatbot/`). The browser talks only to Express `POST /api/chat` (SSE). Express forwards `X-Service-Key` and, when the cookie JWT is valid, `X-User-Id`. Chat sessions live in PostgreSQL owned by the chatbot. Catalog vectors stay in FAISS + SQLite. Price, stock, and images shown in chat always come from `GET /api/products/:slug`, never from FAISS or the LLM.

### Environment

**`chatbot/.env`** (copy `chatbot/.env.example`):

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Primary chat model (Groq) |
| `GROQ_CHAT_MODEL` | Groq model id, default `llama-3.3-70b-versatile` |
| `GOOGLE_API_KEY` | Gemini fallback chat and catalog embeddings |
| `GEMINI_CHAT_MODEL` | Fallback chat model, default `gemini-2.0-flash` |
| `GEMINI_EMBED_MODEL` | Embedding model id |
| `EXPRESS_BASE_URL` | Express origin, e.g. `http://localhost:5000` |
| `SERVICE_KEY` | Shared with Express |
| `POSTGRES_URL` | Chat sessions and LangGraph checkpoints |
| `RETRIEVE_K` | FAISS candidate count (default `20`) |
| `RERANK_ENABLED` | Default `true` |
| `RERANK_MIN_SCORE` | Default `0.4` |

**`server/.env`:** `CHATBOT_URL=http://localhost:8000`, `SERVICE_KEY` (same value as the chatbot).

**`client/.env`:** `VITE_CHATBOT_ENABLED=true` to render the chat FAB and drawer.

### Run the three services locally

PostgreSQL must be up with database `spark_chatbot`. Then three terminals:

```powershell
cd server
npm install
npm run dev
```

```powershell
cd client
copy .env.example .env
npm install
npm run dev
```

```powershell
cd chatbot
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Ingest the catalog once (Express and Gemini must be available):

```powershell
cd chatbot
python -m app.rag.ingest --full
```

### Manual test

1. Open the storefront, click the chat button, and confirm the greeting uses your first name (or “Hi there!” when logged out).
2. Ask: `best laptop under 60000 for coding`
3. Follow up: `show cheaper ones`
4. Ask: `what is your return policy`
5. Ask for a product that does not exist and confirm the bot says it could not find a match.

### Optional local container setup

A dev convenience stack is available at the repo root in `docker-compose.yml` for MongoDB, the API server, and the Vite client. It keeps the same env file pattern as the local setup and is intended for quick local bootstrapping rather than production deployment.

## What the product is

| Role | Can do |
|---|---|
| Guest | Browse the catalog; chat for recommendations only |
| Customer | Cart, Cash on Delivery checkout, track / cancel / return, assistant actions |
| Admin | Products, categories, images, order status, sales stats (seed-created account only) |

Out of v1: online payments, guest cart, reviews, coupons, wishlists, notifications, dark mode, admin actions through the chatbot.

## Boundaries

| Folder | Owns | Must not |
|---|---|---|
| `client/` | React UI, routing, client state | Secrets; prices or totals as the source of truth |
| `server/` | Business rules, auth, MongoDB, Cloudinary, chat proxy | LLM or embedding logic |
| `chatbot/` | Gemini, retrieval, LangGraph, FAISS + SQLite | MongoDB; trusting a client-supplied price |

Request paths:

- Web: `client → server (cookie JWT) → MongoDB`
- Chat: `client → server /api/chat (SSE) → chatbot → Express API with the user's token`
- Catalog sync: admin product change → chatbot ingest → FAISS index + SQLite metadata

## Layout

```
client/src/
  components/ui|shop|admin|chat
  layouts/
  pages/shop|account|admin|auth
  hooks/  api/  context/  styles/
server/src/
  config/  models/  routes/  controllers/
  services/  middleware/  validators/  utils/  scripts/
chatbot/
  app/api|agent|tools|rag|clients
  tests/  knowledge/  eval/  scripts/  data/
ecommerce-rag-spec/          # spec pack (do not treat as app code)
  context/                   # overview, architecture, standards, specs
  reference/spark-admin-theme/  # read-only visual source
```

`docker-compose.yml` is added in the last unit of each phase (P1-14, P2-11), not now.

## Stack (when units are built)

- Client: React 18, Vite, JavaScript, Tailwind (Spark tokens), React Router, TanStack Query
- Server: Node, Express, Mongoose, zod, JWT in an httpOnly cookie
- Chatbot: Python 3.11, FastAPI, LangGraph, FAISS, SQLite, Gemini
- Money: integer paise. Shipping: free above 999 INR, otherwise 49 INR. Payments: COD only.

## Build order

Phase 1 (website): P1-01 scaffold → P1-02 Spark UI kit → P1-03 models → P1-04 auth → P1-05 catalog → P1-06 cart/orders → P1-07 admin API → P1-08 client shell → P1-09 storefront shell → P1-10 wire catalog → P1-11 checkout → P1-12 account → P1-13 admin UI → P1-14 hardening.

Phase 2 (assistant): P2-01 through P2-11 in [`ecommerce-rag-spec/context/specs/00-build-plan.md`](ecommerce-rag-spec/context/specs/00-build-plan.md).

Work one unit per session. Track status in [`ecommerce-rag-spec/context/progress-tracker.md`](ecommerce-rag-spec/context/progress-tracker.md).
