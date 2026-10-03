# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1: Website

## Current Goal

- P1-09 Storefront UI shell with placeholder data.

## Completed

- P1-01 Monorepo scaffold and health checks. Vite client and Express server start. `GET /api/health` returns `{ data: { status: 'ok' } }` on port 5000 and through the Vite proxy. ESLint passes in both apps. `npm run build` passes in `client/`.
- P1-02 Spark tokens and UI kit. CSS variables in `client/src/styles/tokens.css`, Tailwind maps them, Plus Jakarta Sans and Bootstrap Icons load, and `/dev/ui` renders the base kit (buttons, forms, badges, table, modal, drawer, dropdown, toast, pagination, skeleton, empty state, spinner). No API calls. ESLint and `npm run build` pass. No hex colors in `client/src/components`.
- P1-03 Server foundation and models. Server connects to MongoDB database `spark-commerce`, logs listen with pino, and unknown routes return `{ error: { code: 'NOT_FOUND', message } }`. Zod `validate` returns 422 `{ error: { code: 'VALIDATION_ERROR', details } }`. Models: User, Category, Product, Cart, Order. Indexes: unique email, unique slugs, Product text index (`title`, `description`, `tags`, `brand`), unique cart user, order user. ESLint passes. ChatSession stays in P2-08.
- P1-04 Auth API. `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`. JWT (7d) is an httpOnly `token` cookie (`SameSite=Lax`, `Secure` in production). `requireAuth` also accepts `Authorization: Bearer`. Public register always creates `customer`. `requireRole` guards `GET /api/admin/ping` until P1-07. Login and register are rate limited (10 per 15 minutes per IP; skipped when `NODE_ENV=test`). `npm run seed:admin` upserts an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Responses omit `passwordHash`. Jest + Supertest: 8 passed. ESLint passes.
- P1-05 Catalog API and seed data. `GET /api/categories`, `GET /api/products` (`q`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `sort`, `page`, `limit`), and `GET /api/products/:slug`. Public lists return only `isActive` records. Search uses the product text index. Sort values: `relevance`, `price_asc`, `price_desc`, `newest`. List responses include `meta` (`page`, `limit`, `total`, `totalPages`). `npm run seed:catalog` upserts 6 categories and 60 products by slug (placeholder image URLs). Jest + Supertest: 13 passed. ESLint passes.
- P1-06 Cart and Order API (COD). Authenticated `GET/POST /api/addresses`, `PUT/DELETE /api/addresses/:id` (embedded on User; one default). Cart: `GET /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:productId`, `DELETE /api/cart`. Quantities below 1 are 422; quantities above stock are 409. Cart GET uses live catalog prices after `discountPercent`, plus line totals, subtotal, shipping fee, and total. `POST /api/orders` accepts `{ addressId }` only, snapshots the cart, decrements stock with `findOneAndUpdate` (`stock >= qty`), restores stock and the cart on failure (409 with the offending product), clears the cart on success, and sets status `placed` with a timeline entry. Cancel is owner-only in placed/confirmed/packed and restores stock. Return is owner-only within 7 days of `delivered`. Another customer's order reads as 404. Jest + Supertest: 19 passed. ESLint passes.
- P1-07 Admin API and Cloudinary uploads. Every `/api/admin/*` route uses `requireAuth` and `requireRole('admin')`. Product and category CRUD (admin lists include inactive products). `POST /api/admin/uploads/image` uses multer memory storage, a 5 MB limit, and jpeg/png/webp only, then stores the file in Cloudinary folder `spark-commerce/products` and returns `{ url, publicId }`. Removing an image from a product, or deleting the product, deletes that Cloudinary asset. `PATCH /api/admin/orders/:id/status` allows one forward step (`placed → confirmed → packed → shipped → out_for_delivery → delivered`, and `return_requested → returned`) plus cancel from placed/confirmed/packed (stock restored). Skipping, moving backward, and any edit of `cancelled` or `returned` return 409. `GET /api/admin/stats` returns revenue excluding cancelled and returned, order count, new customers and revenue by day for the last 14 UTC days, orders by status, and active products with stock at or below 5. Product create, update, and delete call `onProductChanged(product)` (no-op; a thrown hook is logged and does not fail the request). Jest + Supertest: 25 passed. ESLint passes.
- P1-08 Client shell and auth. Storefront and admin layouts, lazy routes, `ProtectedRoute` and `AdminRoute`, `AuthContext` (`login`, `register`, `logout`, `me`) on axios `withCredentials`, and login/register pages. Shop, cart, checkout, account, and admin screens are stubs. Sidebar collapse is stored in `localStorage`. ESLint and `npm run build` pass in `client/`.

## In Progress

- None.

## Next Up

- P1-09 Storefront UI shell with placeholder data (`context/specs/phase-1-website.md`).

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
- `MONGO_URI` may omit a database path. The server connects to database `spark-commerce` unless `MONGO_DB_NAME` is set. Auth tests set `MONGO_DB_NAME=spark-commerce-test`.

## Session Notes

- P1-01 verified: both `npm run dev` processes stay up; the landing page shows “Spark Commerce” on canvas `#F4F6F5`; `/api/health` works directly and via the Vite proxy.
- P1-02 verified in the browser: `/` still shows “Spark Commerce” on canvas `#F4F6F5`. `/dev/ui` shows the kit. Primary button computes to forest-medium (`rgb(7, 47, 31)`) with 14px radius. Modal confirm, dropdown delete, pagination, toast dismiss, and the drawer open and close. Cards stack on a 390px-wide viewport. No Vite error overlay.
- `react-router-dom` now serves `/` and `/dev/ui`. Full storefront and admin routing stays in P1-08. JWT and Cloudinary env names are in `server/.env.example`; those integrations start in later units.
- P1-03 verified: MongoDB connected to `spark-commerce`; `GET /api/health` still returns `{ data: { status: 'ok' } }`; `GET /api/does-not-exist` returns HTTP 404 `{ error: { code: 'NOT_FOUND', message: 'Cannot GET /api/does-not-exist' } }`. A request that fails zod returns HTTP 422 with `details` for each field. Index list includes `email_1` (unique), Category and Product `slug_1` (unique), `ProductTextIndex`, Cart `user_1` (unique), Order `user_1`. Slug helper turns "Noise Cancelling Headphones" into `noise-cancelling-headphones`. Pino logs `Server listening`. Morgan still logs requests. The verification server was stopped after the checks.
- P1-04 verified with `npm test` in `server/` (8 passed) against `spark-commerce-test`, plus `npm run lint`. Covered: register/login/logout/me, duplicate email 409, wrong password 401, customer 403 on `GET /api/admin/ping`, bearer token, no `passwordHash` in JSON, Secure cookie when `NODE_ENV=production`, and 429 after the auth attempt cap. `npm run seed:admin` run twice on `spark-commerce-test` kept the same user id. Test users matching `@auth.test` were deleted afterward.
- P1-05 verified with `npm test` in `server/` (13 passed, including the auth suite) against `spark-commerce-test`, plus `npm run lint`. `GET /api/products?q=laptop&maxPrice=6000000&sort=price_asc` returns the six laptops at or under ₹60,000, cheapest first, with `meta`. `GET /api/products/missing-product` returns HTTP 404 `{ error: { code: 'NOT_FOUND', message: 'Product not found' } }`. An inactive product is omitted from search and detail. `npm run seed:catalog` run twice on `spark-commerce-test` kept 6 categories and 60 products. That seed data is still in `spark-commerce-test`. Run `npm run seed:catalog` without `MONGO_DB_NAME` to load the same catalog into `spark-commerce`.
- P1-06 verified with `npm test` in `server/` (19 passed, including auth and catalog) against `spark-commerce-test`, plus `npm run lint`. Covered: live cart prices after a catalog price change, qty 0 → 422, qty above stock → 409, client `total`/`unitPrice` ignored, subtotal ₹999 charges ₹49 shipping and ₹1,000 ships free, two concurrent orders for the last unit (one 201, one 409, stock ends at 0, loser keeps the cart line), cancel restores stock, cancel after `shipped` is 409 and does not restore stock, another user's order is 404, return before delivery and after 7 days is 409, return inside the window sets `return_requested` without changing stock, address default moves when a new default is saved and when the default is deleted. Cart-order test users (`@cart.test`) and `cart-order-*` products were deleted afterward.
- P1-07 verified with `npm test` in `server/` (25 passed, including auth, catalog, and cart/order) against `spark-commerce-test`, plus `npm run lint`. Cloudinary is mocked in the admin suite. Covered: customer 403 on every `/api/admin/*` route, product create/update/delete with image upload, Cloudinary `destroy` when an image is removed and not when a placeholder has no `publicId`, a thrown `onProductChanged` still returns 201, duplicate slug 409, gif and oversize uploads 400, jpeg and webp accepted, `placed → shipped` 409, backward 409, cancel restores stock, a second change after `cancelled` or `returned` is 409 and does not restore stock again, category delete 409 while a product references it, stats revenue ignores cancelled and returned orders and ignores a 30-day-old order in today's revenue bucket, and a product with stock 5 is low-stock while stock 6 is not. Admin test users (`@admin.test`) and `admin-*` products/categories were deleted afterward. Live uploads need `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- P1-08 verified in the browser against the live API. Register creates a customer and lands on `/account`; refresh keeps the session via `GET /api/auth/me`. Logout returns to the storefront. Login works, and a wrong password shows an error toast. Guests who open `/account` go to `/login?redirect=%2Faccount`. A customer who opens `/admin` is sent to `/`. On a 1280px viewport the admin sidebar is 280px, collapses to 80px, and the choice stays in `localStorage` after refresh. Below 992px the sidebar starts off-canvas and opens over the page. Shop, cart, checkout, account, and admin pages are stubs. The temporary `@auth.test` user was deleted afterward. ESLint and `npm run build` pass in `client/`.
- After each verified unit, print git add / commit / push commands and do not run them (`.cursor/rules/after-unit-git.mdc`).
- Each unit is its own GitHub branch `feat/<unit-id>-<slug>`, created from latest `main` when that unit is verified. Names are in `context/specs/00-build-plan.md`. Branches are not created ahead of time, because later units depend on earlier ones merged to `main`.
