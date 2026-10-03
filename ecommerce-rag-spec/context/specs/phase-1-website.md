# Phase 1 Spec: Website (React + Node + Express + MongoDB)

Goal: a complete, Spark-styled ecommerce site (storefront + customer account + admin) that works fully without the chatbot. Phase 1 is done when every unit below is complete and the end-to-end demo works (see exit criteria).

Read first: `context/project-overview.md`, `architecture.md`, `ui-context.md`, `code-standards.md`.

## Data model (MongoDB / Mongoose)

| Model | Fields |
|---|---|
| User | name, email (unique), passwordHash, role (`customer`/`admin`), addresses[{label, fullName, phone, line1, line2, city, state, pincode, isDefault}], timestamps |
| Category | name, slug (unique), image?, isActive |
| Product | title, slug (unique), description, category (ref), brand, price (paise), discountPercent, stock, images[{url, publicId}], tags[], attributes (Map: color, size, specs), isActive, timestamps. Text index: title, description, tags, brand |
| Cart | user (unique ref), items[{product ref, qty}] (prices are NOT stored; read live) |
| Order | user, items[{product, title, image, unitPrice, qty}] (snapshots), shippingAddress (snapshot), paymentMethod (`COD`), subtotal, shippingFee, total (paise), status, timeline[{status, at, note}], cancelReason?, returnRequest?{reason, requestedAt}, timestamps |
| ChatSession | user, messages[{role, content, at}], (used in Phase 2; model created in P2-08) |

Order status flow: `placed → confirmed → packed → shipped → out_for_delivery → delivered`. Branches: `cancelled` (allowed while status is placed/confirmed/packed), `return_requested → returned` (allowed within 7 days after delivered). Shipping fee: free above 999 INR, else 49 INR (constants in `server/src/config/commerce.js`).

## API surface

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Catalog | `GET /api/categories`, `GET /api/products` (`q, category, brand, minPrice, maxPrice, inStock, sort, page, limit`), `GET /api/products/:slug` |
| Addresses | `GET/POST /api/addresses`, `PUT/DELETE /api/addresses/:id` |
| Cart | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:productId`, `DELETE /api/cart/items/:productId`, `DELETE /api/cart` |
| Orders | `POST /api/orders` (from cart, COD), `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel`, `POST /api/orders/:id/return` |
| Admin | `GET /api/admin/stats`, CRUD `/api/admin/products`, CRUD `/api/admin/categories`, `POST /api/admin/uploads/image`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` |

Every endpoint returns the envelope in `code-standards.md`. Cart GET returns live-priced lines plus totals so any consumer (UI or chatbot) sees the same numbers.

---

## P1-01 Monorepo scaffold and health checks

### Goal
Create `client/` (Vite React JS + Tailwind) and `server/` (Express) that both start, with env handling and a health route. No features.

### Design
Landing page shows only a placeholder text on the canvas color.

### Implementation
- Root: `.gitignore`, `README.md`, `.editorconfig`.
- `server/`: Express app with `GET /api/health` returning `{ data: { status: 'ok' } }`, `dotenv`, `.env.example` (PORT, MONGO_URI, JWT_SECRET, CLIENT_ORIGIN, CLOUDINARY_*), ESLint/Prettier, `npm run dev` with nodemon.
- `client/`: Vite React, Tailwind installed, ESLint/Prettier, proxy `/api` to the server in dev.

### Dependencies
express, dotenv, cors, helmet, morgan, nodemon; react, react-router-dom, tailwindcss, postcss, autoprefixer.

### Verify when done
- [ ] `npm run dev` runs in both folders; client page loads; `/api/health` works through the Vite proxy
- [ ] ESLint passes; `npm run build` passes (client)
- [ ] `.env.example` lists every variable; no secrets committed

## P1-02 Spark tokens and UI kit

### Goal
Implement the Spark design tokens in Tailwind and the base UI kit, plus a `/dev/ui` kitchen-sink page. No API calls.

### Design
Follow `context/ui-context.md` exactly; read `reference/spark-admin-theme/assets/css/main.css` sections 2, 8, 18, 19, 20 before coding.

### Implementation
- `src/styles/tokens.css` with all variables; `tailwind.config.js` maps colors, radii, shadows, font; Plus Jakarta Sans loaded.
- UI components: Button (variants), Card, StatCard, Input/Select/Textarea, Badge/StatusBadge, DataTable, Modal, Drawer, Dropdown, Skeleton, EmptyState, Pagination, Toast, Spinner.
- `/dev/ui` page rendering every component and state (hover, focus, invalid, disabled).

### Dependencies
bootstrap-icons, clsx.

### Verify when done
- [ ] Kitchen-sink visually matches Spark pages (compare side by side with `reference/spark-admin-theme/ui-buttons.html`, `ui-forms.html`, `tables-basic.html`)
- [ ] Zero hardcoded hex in `src/components` (grep check)
- [ ] Responsive at mobile and desktop; no console errors

## P1-03 Server foundation and models

### Goal
MongoDB connection, central config/error handling, zod validation middleware, and all Mongoose models (User, Category, Product, Cart, Order) with indexes.

### Implementation
- `config/db.js`, `config/commerce.js`, `middleware/errorHandler.js`, `middleware/validate.js`, `utils/ApiError.js`, `utils/asyncHandler.js`, logger.
- Models per the data model table; money as integer paise; slug generation helper; text index on Product.

### Dependencies
mongoose, zod, slugify, pino (or winston).

### Verify when done
- [ ] Server boots and connects; bad route returns the standard 404 envelope
- [ ] Validation errors return 422 with details
- [ ] Models load; indexes created (check in Mongo shell/Compass)

## P1-04 Auth API

### Goal
Register, login, logout, me, with roles and middleware.

### Implementation
- bcrypt hashing; JWT (7d) in httpOnly cookie (`SameSite=Lax`, `Secure` in production).
- `requireAuth`, `requireRole`, rate limit on login/register.
- Admin user created by `npm run seed:admin` using env ADMIN_EMAIL/ADMIN_PASSWORD. Public register always creates `customer`.
- Tests: duplicate email 409, wrong password 401, admin route as customer 403.

### Dependencies
bcryptjs, jsonwebtoken, cookie-parser, express-rate-limit, jest, supertest.

### Verify when done
- [ ] Register/login/logout/me work via curl or Supertest
- [ ] passwordHash never appears in responses
- [ ] Customer token gets 403 on an admin-only test route

## P1-05 Catalog API and seed data

### Goal
Read-only catalog endpoints with search, filters, sorting, pagination, plus a seed script with realistic data.

### Implementation
- Endpoints per API table. Search uses the text index; sort: relevance, price asc/desc, newest.
- `npm run seed:catalog`: 6 categories (e.g., Laptops, Mobiles, Audio, Men's Fashion, Women's Fashion, Home & Kitchen), about 60 products with brand, tags, attributes, stock, image URLs (placeholder URLs allowed; Cloudinary comes in P1-07).
- Only `isActive` products are returned publicly.

### Verify when done
- [ ] `GET /api/products?q=laptop&maxPrice=6000000&sort=price_asc` returns filtered, sorted results with `meta`
- [ ] `GET /api/products/:slug` returns 404 envelope for unknown slug
- [ ] Seed script is idempotent

## P1-06 Cart and Order API (COD)

### Goal
Server-side cart and order lifecycle with stock safety.

### Implementation
- Cart endpoints; reject qty above stock or below 1; GET returns live prices, line totals, subtotal, shipping fee, total.
- Addresses endpoints (embedded in User).
- `POST /api/orders`: body `{ addressId }`; builds snapshot from the live cart; atomically decrements stock per item (`findOneAndUpdate` with `stock >= qty`); on any failure, restores already-decremented items and returns 409 with the offending product; clears cart on success; sets status `placed` and timeline entry.
- `POST /api/orders/:id/cancel`: owner only, allowed in placed/confirmed/packed, restores stock.
- `POST /api/orders/:id/return`: owner only, within 7 days of `delivered`.
- Tests: stock race (two concurrent orders for last unit), cancel restores stock, cannot cancel after shipped, cannot read another user's order.

### Verify when done
- [ ] All order rules above pass in Supertest
- [ ] Client-supplied prices are ignored (test)
- [ ] Order totals equal server-computed totals

## P1-07 Admin API and Cloudinary uploads

### Goal
Admin product/category CRUD, image upload, order management, stats.

### Implementation
- All routes behind `requireAuth` + `requireRole('admin')`.
- Image upload: multer memory storage, 5 MB limit, jpeg/png/webp only, upload to Cloudinary folder `spark-commerce/products`, return `{ url, publicId }`. Deleting a product or image removes it from Cloudinary.
- `PATCH /api/admin/orders/:id/status` enforces the status flow (no skipping backward, no edits to cancelled/returned).
- `GET /api/admin/stats`: revenue (excluding cancelled/returned), orders count, new customers, low-stock products, revenue by day (last 14 days), orders by status.
- Product create/update/delete emits a hook function `onProductChanged(product)` (no-op now; Phase 2 wires it to the chatbot).

### Dependencies
multer, cloudinary.

### Verify when done
- [ ] Product CRUD with image upload works; Cloudinary asset deleted on removal
- [ ] Illegal status transitions return 409
- [ ] Customer token gets 403 on every `/api/admin/*` route

## P1-08 Client shell: layouts, routing, auth

### Goal
App shell with StorefrontLayout, AdminLayout, route guards, AuthContext, and login/register pages. Pages are stubs.

### Design
Admin layout = exact Spark sidebar/navbar (`reference/spark-admin-theme/index.html`). Storefront navbar and footer per `ui-context.md`. Login/register follow `page-login.html`.

### Implementation
- React Router with lazy-loaded pages; `ProtectedRoute` and `AdminRoute`.
- `src/api/http.js` (axios, `withCredentials`), `AuthContext` (login, register, logout, me), toasts for errors.
- Sidebar collapse state persisted in localStorage (UI preference only, not auth).

### Dependencies
axios, @tanstack/react-query, zod, react-hook-form (optional).

### Verify when done
- [ ] Register, login, logout work against the real API; refresh keeps the session
- [ ] `/admin` redirects non-admins; `/account` redirects guests to login
- [ ] Sidebar collapses and goes off-canvas below 992px

## P1-09 Storefront UI shell (placeholder data)

### Goal
Home, product listing, and product detail pages built with static placeholder data.

### Design
Hero (forest-medium card, lime badge, accent CTA), category chips, product grid (rounded-xl cards), filter panel, detail page with image gallery, price block, quantity stepper, accent "Add to cart".

### Verify when done
- [ ] Pages render with placeholder data and look like the Spark language
- [ ] Skeleton, empty, and error states exist for listing and detail
- [ ] Responsive at mobile and desktop; no console errors

## P1-10 Wire catalog to the API

### Goal
Replace placeholders with real data: search bar, filters, sort, pagination, product detail by slug.

### Implementation
- TanStack Query hooks in `src/api/products.js`; filters stored in URL query params; debounce search 300 ms.

### Verify when done
- [ ] Filters/sort/pagination reflect in the URL and survive refresh
- [ ] Unknown slug shows a friendly 404 state
- [ ] Prices formatted from paise to INR in the client only

## P1-11 Cart and checkout

### Goal
Cart page, mini-cart badge, address selection/creation, COD review, order success page.

### Implementation
- CartContext backed by `/api/cart` (login required; guests are sent to login with a return URL).
- Checkout: choose or add address, review items/totals from the server, "Place order (Cash on Delivery)", success page with order ID and timeline.
- Handle 409 stock conflict with a clear message and cart refresh.

### Verify when done
- [ ] Full flow works: add to cart, change qty, checkout, success
- [ ] Stock conflict shows an actionable error
- [ ] Cart badge updates immediately

## P1-12 Customer account

### Goal
Orders list/detail with timeline, cancel and return actions, address book, profile.

### Verify when done
- [ ] Cancel visible only when allowed; return visible only within the window
- [ ] Status badges follow the mapping in `ui-context.md`
- [ ] Address CRUD works; default address respected at checkout

## P1-13 Admin UI

### Goal
Admin dashboard, products, categories, and orders screens.

### Design
Exact Spark patterns: stat cards with trend badges, ApexCharts (revenue line, orders by status), `table-custom` tables with `badge-table` status, page headers with action buttons.

### Implementation
- Dashboard from `/api/admin/stats`.
- Products: table with search/pagination, create/edit form (multi-image upload with preview and delete, category select, attributes key/value), activate/deactivate, delete with confirm modal.
- Orders: table with status filter, detail modal, status update dropdown limited to legal next states.

### Dependencies
react-apexcharts, apexcharts.

### Verify when done
- [ ] Admin can create a product with images and see it in the storefront
- [ ] Admin can advance an order and the customer sees the new status
- [ ] Charts render real data; layout matches Spark pages

## P1-14 Hardening and Phase 1 exit

### Goal
Polish and make Phase 1 shippable.

### Implementation
- Accessibility pass (labels, focus rings, keyboard nav), meta tags, 404 page (`page-404.html` style), error boundary.
- Security review of the checklist: cookies, CORS, rate limits, input validation, upload limits.
- README with setup steps and env table; `docker-compose.yml` for Mongo + server + client (optional dev convenience).

### Verify when done
- [ ] All Phase 1 checklists still pass; `npm run build` passes in both folders; tests pass
- [ ] Lighthouse accessibility score at least 90 on home and product pages
- [ ] Demo script passes: register, buy with COD, admin advances status, customer cancels another order

## Phase 1 exit criteria
All units P1-01 to P1-14 complete; demo script passes; `progress-tracker.md` shows Phase 1 complete and "Phase 2" as current phase.
