# Spark Commerce

Multi-category ecommerce site (electronics, fashion, home) with a shopping assistant. Spec source of truth: [`ecommerce-rag-spec/`](ecommerce-rag-spec/README.md).

P1-01 is the running scaffold: a Vite client and an Express server with `GET /api/health`. No storefront features yet. Phase 2 does not start until every Phase 1 unit is complete.

## Run locally

Use two terminals. Copy `server/.env.example` to `server/.env` before the first server start (values are placeholders; Mongo and Cloudinary are unused until later units).

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

- Client: http://localhost:5173 (placeholder text on the canvas color)
- Health, direct: http://localhost:5000/api/health
- Health, through the Vite proxy: http://localhost:5173/api/health

Both return `{ "data": { "status": "ok" } }`.

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
| `chatbot/` | Gemini, retrieval, LangGraph, Chroma | MongoDB; trusting a client-supplied price |

Request paths:

- Web: `client → server (cookie JWT) → MongoDB`
- Chat: `client → server /api/chat (SSE) → chatbot → Express API with the user's token`
- Catalog sync: admin product change → chatbot ingest → Chroma

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
- Chatbot: Python 3.11, FastAPI, LangGraph, ChromaDB, Gemini
- Money: integer paise. Shipping: free above 999 INR, otherwise 49 INR. Payments: COD only.

## Build order

Phase 1 (website): P1-01 scaffold → P1-02 Spark UI kit → P1-03 models → P1-04 auth → P1-05 catalog → P1-06 cart/orders → P1-07 admin API → P1-08 client shell → P1-09 storefront shell → P1-10 wire catalog → P1-11 checkout → P1-12 account → P1-13 admin UI → P1-14 hardening.

Phase 2 (assistant): P2-01 through P2-11 in [`ecommerce-rag-spec/context/specs/00-build-plan.md`](ecommerce-rag-spec/context/specs/00-build-plan.md).

Work one unit per session. Track status in [`ecommerce-rag-spec/context/progress-tracker.md`](ecommerce-rag-spec/context/progress-tracker.md).
