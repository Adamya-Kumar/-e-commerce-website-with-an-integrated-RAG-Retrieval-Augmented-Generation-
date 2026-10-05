# Project Overview

Working title: **Spark Commerce** (rename freely; see Open Questions).

## What it is

A multi-category ecommerce website (electronics, fashion, home) with an
integrated shopping assistant, similar in spirit to Shopify's assistant.
Customers browse and buy normally. They can also open a chat drawer, ask
natural questions ("a laptop under 60k for coding"), get grounded product
suggestions, and have the assistant act for them: manage the cart, place
orders, track orders, cancel or return. The whole UI follows the Spark Admin
theme (forest green + lime, Plus Jakarta Sans, large rounded white cards).

## Delivery model

- **Phase 1: Website** (React, Node, Express, MongoDB). Fully usable without
  the chatbot.
- **Phase 2: Chatbot** (Python FastAPI, LangGraph, FAISS + SQLite, Gemini). Added
  after Phase 1 is complete; it uses only the public/internal APIs of Phase 1.

## Users

| Role | Needs |
|---|---|
| Customer | Find products, compare, buy with Cash on Delivery, track/cancel/return orders, get help from the assistant |
| Admin | Manage products, categories, images, and orders; see sales stats |
| Guest | Browse and chat (recommendations only); must log in to cart/order |

## Goals (measurable)

1. A customer can register, browse, search/filter, add to cart, check out with COD, and see the order in "My Orders".
2. An admin can create/edit/delete a product with images (Cloudinary) and move an order through its statuses.
3. Every screen visibly uses Spark tokens (zero hardcoded hex in components).
4. The assistant answers product questions using only catalog/policy data and links to real products.
5. The assistant can add/update/remove cart items, place an order, check status, cancel, and request a return for the logged-in user.
6. Place/cancel/return never execute without an explicit user confirmation click.
7. Assistant tool-call accuracy of at least 90% on the golden test set (Phase 2, unit P2-10).

## Core user flows

**Shopping:** Home → listing (search/filter/sort) → product detail → add to cart → cart → checkout (address + COD review) → order success → My Orders.

**Assistant:** Open bubble → drawer shows page-aware suggested prompts → user asks → assistant retrieves products (RAG) → shows product cards → "add the second one" → cart updated (card shown) → "order it to my home address" → confirmation card (items, total, address, COD) → user clicks Confirm → order placed → card with order ID.

**Admin:** Login → dashboard (stat cards, charts) → Products (table, create/edit with images) → Orders (table, update status).

## Features v1

**Website:** auth (customer/admin), catalog with search/filter/sort/pagination, product detail, cart, COD checkout, address book, order history with cancel/return, admin dashboard/products/orders/categories.
**Chatbot:** RAG product Q&A, recommendations, cart management, order placement/tracking/cancel/return, policy/FAQ answers, page-aware suggestions, streaming responses, side-drawer UI.

## Out of scope for v1

Online payments (Razorpay/Stripe), multi-vendor/seller accounts, guest cart, reviews/ratings submission, coupons, wishlists, email/SMS notifications, inventory warehouses, shipping-carrier integration, i18n, dark mode, admin tasks via chatbot, voice input, mobile app.

## Success criteria

- `npm run build` passes for client and server; chatbot passes `pytest`.
- All Phase 1 verify checklists pass; then all Phase 2 checklists pass.
- Demo script works end to end: guest asks for a product → logs in → assistant adds to cart → confirms an order → admin sees the order.
