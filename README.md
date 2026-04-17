# Limited-Stock Product Drop System

A full-stack system for handling high-concurrency product reservations, built for the MPC Circle Full-Stack Developer Test.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [How Race Conditions Are Handled](#how-race-conditions-are-handled)
5. [Schema Decisions](#schema-decisions)
6. [API Reference](#api-reference)
7. [Frontend Pages & Components](#frontend-pages--components)
8. [Trade-offs](#trade-offs)
9. [What Would Break at 10k Concurrent Users](#what-would-break-at-10k-concurrent-users)
10. [How to Scale](#how-to-scale)
11. [Quick Start](#quick-start)
12. [Running Tests](#running-tests)

---

## Overview

A **limited-drop e-commerce system** where products have a finite stock and users compete to reserve items in real time. The system enforces strict concurrency controls to guarantee that stock never goes negative, even under extreme parallel load.

**Key design goals:**
- No overselling — stock integrity guaranteed at the database level
- 5-minute reservation hold with automatic expiration and stock restoration
- Real-time stock display (5-second polling)
- Full audit trail of every inventory change
- JWT-authenticated user sessions

---

## Architecture

```
┌──────────────────────────┐     HTTP/REST      ┌──────────────────────────────┐
│  React + TypeScript      │ ←────────────────► │  Express + TypeScript + Zod  │
│  Vite dev server         │                    │  Node.js, port 3001          │
│  port 5173               │                    └──────────────┬───────────────┘
└──────────────────────────┘                                   │ Prisma ORM
                                                               ▼
                                                    ┌──────────────────┐
                                                    │   PostgreSQL DB  │
                                                    └──────────────────┘
                                                               ▲
                                                    ┌──────────────────┐
                                                    │  Cron Job (1min) │
                                                    │  Expire stale    │
                                                    │  reservations +  │
                                                    │  restore stock   │
                                                    └──────────────────┘
```

---

## Features

### Backend Features

#### Authentication
- **JWT-based authentication** — stateless, works across horizontal scaling
- **User registration** with bcrypt password hashing (10 salt rounds)
- **User login** returning a signed JWT (7-day expiry by default)
- **Protected routes** via `requireAuth` middleware that validates Bearer tokens

#### Product Management
- **List all products** with pagination, search, and in-stock filtering
- **Get product by ID** with full details
- **Inventory audit log** per product — every stock change is recorded with reason and metadata
- Products have `stock` (current) and `totalStock` (original) fields for accurate percentage display

#### Reservation System
- **Reserve a product** — atomically deducts stock and creates a timed hold
- **5-minute TTL** — configurable via `RESERVATION_TTL_MINUTES` environment variable
- **Duplicate prevention** — one active reservation per user per product enforced inside the transaction
- **Cancel a reservation** — marks as `CANCELLED` and immediately restores stock to inventory
- **Checkout a reservation** — converts active reservation into a confirmed order
- **List user's reservations** with pagination, status filtering, and sort order
- **Reservation state machine**: `ACTIVE → COMPLETED | EXPIRED | CANCELLED`

#### Race Condition Protection (Three Layers)
1. **`SELECT ... FOR UPDATE`** — row-level lock ensures only one transaction reads and modifies stock at a time
2. **Conditional UPDATE guard** — `WHERE stock >= quantity` ensures the decrement only happens if stock is still sufficient
3. **Serializable isolation** — prevents phantom reads and serialization anomalies at the database level

#### Automatic Expiration
- **Cron job runs every minute** via `node-cron`
- Finds all ACTIVE reservations past their `expiresAt` timestamp
- Marks them `EXPIRED` and restores stock to the product
- Uses `updateMany` with a status guard to safely handle the race between expiration and a simultaneous checkout

#### Validation & Error Handling
- **Zod schemas** validate all incoming request bodies and query parameters
- **Centralized error handler** maps `AppError`, Prisma constraint violations (P2002, P2025), and serialization failures to clean HTTP responses
- **Structured logging** with Winston (JSON format in production)
- **Request logging** via Morgan

#### Security & Reliability
- **Helmet** — sets secure HTTP headers
- **CORS** — configurable allowed origin via `CORS_ORIGIN` env variable
- **Response compression** via `compression`
- **Rate limiting** — global limiter + stricter reservation-specific limiter to prevent abuse
- **Environment validation** — Zod validates all required env variables at startup; server refuses to start if config is missing

#### Observability
- `GET /api/health` — reports server uptime, database connectivity, version
- `GET /api/metrics` — in-memory counters for total requests, errors, and reservation operations

---

### Frontend Features

#### Authentication UI
- **Login / Register modal** — appears automatically when no valid session is found
- **Mode toggle** — switch between Sign In and Create Account without page reload
- **Persistent sessions** — JWT stored in `localStorage`; on revisit the token is decoded and expiry is checked client-side before restoring the session
- **Auto logout** on token expiry

#### The Drop Page (Products Tab)
- **Product grid** — responsive grid layout showing all active drops simultaneously
- **Live stock polling** — stock counts refresh automatically every 5 seconds without a page reload
- **Search bar** — filter products by name in real time
- **Stock filter** — toggle between All / In Stock / Sold Out views
- **Stats bar** — live counts of active drops, total items remaining, and number of products
- **Product badges**:
  - `Limited Drop` — shown on every product
  - `Only X left!` (red) — shown when stock ≤ 3
  - `Low Stock` (orange) — shown when stock is ≤ 30% of total
  - `Sold Out` full-image overlay — shown when stock = 0
- **Price tag overlay** — price displayed directly on the product image
- **Quantity selector** — `−` / number / `+` stepper to choose 1–3 units before reserving
- **Dynamic total price** — updates live as quantity changes
- **Reserve button** — label changes to "Reserve 2 units" etc. when quantity > 1

#### Reservation Flow (per product card)
| State | What the user sees |
|---|---|
| `idle` | Quantity selector + Reserve button |
| `loading` | Spinner with "Please wait…" |
| `reserved` | Countdown timer + "Complete Checkout" + "Cancel reservation" |
| `expired` | Red expired panel + "Try again" button |
| `completed` | Green 🎉 "Order Confirmed" panel with link to My Orders |
| `error` | Red error message + Reserve button re-enabled |

#### Countdown Timer
- Displays remaining hold time in `MM:SS` format
- Color changes: green → orange (last 60 seconds) → red (expired)
- Emoji indicator: ⏱️ → ⚡ → ⏰
- Fires `onExpire` callback when time runs out, resetting the card to idle

#### My Orders Tab
- **Order summary cards** — instant counts of Total / Active / Completed orders
- **Status filter pills** — filter by All / Active / Completed / Expired / Cancelled
- **Refresh button** — manually re-fetch reservation list
- **Active reservation cards** show:
  - Product name, quantity, total price, reservation date
  - Countdown timer with urgency styling
  - "Complete Checkout" button
  - "Cancel" button
- **Past order cards** show status-specific messages:
  - Completed: "Order confirmed — purchase complete" (green)
  - Expired: "Hold expired — stock was released back to inventory" (red)
  - Cancelled: "Reservation cancelled by you" (grey)
- **Toast notifications** — success/error pop-up in the top-right corner after every action (auto-dismisses after 4 seconds)

#### Cancel Reservation
- Calls `DELETE /api/reservations/:id` on the backend
- Stock is immediately restored in the database
- Card returns to idle state with the Reserve button re-enabled
- Shows "Cancelling…" label while the request is in flight

#### Header
- Sticky dark header visible on all tabs
- **Live indicator** — pulsing green dot with last-refresh timestamp
- **User email** display
- **Sign out** button — clears token and returns to login modal

---

## How Race Conditions Are Handled

### The Problem
100 users try to reserve the last unit simultaneously. Without protection, all 100 requests could read `stock = 1`, all pass the check, and all decrement — resulting in `stock = -99`.

### The Solution: Three-Layer Defense

**Layer 1 — PostgreSQL `SELECT ... FOR UPDATE`**

```sql
SELECT id, name, stock, price, "isActive"
FROM "Product"
WHERE id = $1
FOR UPDATE
```

This row-level lock ensures only one transaction can read AND modify the product row at a time. All other transactions queue and wait. Once the first transaction commits (stock decremented), the next one reads the updated stock value.

**Layer 2 — Conditional UPDATE guard**

```sql
UPDATE "Product"
SET stock = stock - $quantity, "updatedAt" = NOW()
WHERE id = $productId AND stock >= $quantity
```

Even if two transactions somehow read the same value, `WHERE stock >= quantity` ensures only one succeeds — `affectedRows = 0` signals a race condition and throws a `409 RACE_CONDITION` error.

**Layer 3 — Serializable Isolation**

```typescript
{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
```

Transactions run at the strictest isolation level, preventing phantom reads and serialization anomalies at the database engine level.

### Expiration Safety

The cron job uses `updateMany` with a status guard to prevent a race between expiration and a concurrent checkout:

```typescript
const updated = await tx.reservation.updateMany({
  where: { id: res.id, status: ReservationStatus.ACTIVE },
  data: { status: ReservationStatus.EXPIRED },
});
// Only restore stock if we actually expired it — not if a checkout beat us
if (updated.count === 0) continue;
```

Without this guard, a user completing checkout between the `findMany` and the `update` would have their `COMPLETED` reservation overwritten to `EXPIRED` and stock incorrectly restored.

### Why Not Optimistic Locking?
Optimistic locking (version field) works but requires retries on the client. Under extreme concurrency (100 simultaneous requests), most would fail and need retry logic, adding client-side complexity. `FOR UPDATE` is deterministic — exactly one transaction proceeds, the rest wait in order.

---

## Schema Decisions

| Decision | Why |
|---|---|
| `stock` separate from `totalStock` | `stock` = current available; `totalStock` = original. Enables percentage-based stock bar without joins |
| `InventoryLog` model | Full audit trail of every stock change with `reason` (`RESERVATION`, `EXPIRATION`, `CANCELLATION`, `EXPIRATION_ON_CHECKOUT`) and `metadata`. Critical for debugging race conditions in production |
| `expiresAt` on `Reservation` | Stored at creation time (now + TTL). The cron job queries `expiresAt < NOW()` — simple and index-friendly |
| `ReservationStatus` enum | `ACTIVE → COMPLETED \| EXPIRED \| CANCELLED`. State machine prevents invalid transitions |
| `reservationId UNIQUE` on `Order` | DB-level constraint: one reservation → one order. Prevents double-checkout even under concurrent requests |
| No soft-deletes | Reservations are never deleted — all states kept for audit purposes |
| Serializable transactions for reserve & checkout | Correctness > performance for stock-critical operations |

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Login and receive a JWT |

**Register body:**
```json
{ "email": "user@example.com", "password": "secret123", "name": "Alice" }
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "id": "...", "email": "...", "name": "..." }
  }
}
```

---

### Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products` | No | List products (paginated, filterable) |
| `GET` | `/api/products/:id` | No | Get product details |
| `GET` | `/api/products/:id/inventory-logs` | No | Full audit trail for a product |

**Query parameters for `GET /api/products`:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `search` | string | — | Filter by name (case-insensitive) |
| `inStock` | boolean | — | If true, return only products with stock > 0 |

---

### Reservations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/reservations` | Yes | Reserve a product (deducts stock) |
| `GET` | `/api/reservations` | Yes | List the authenticated user's reservations |
| `DELETE` | `/api/reservations/:id` | Yes | Cancel a reservation and restore stock |

**Reserve body:**
```json
{ "productId": "product-sneaker-001", "quantity": 1 }
```

**Reserve response (201):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "userId": "...",
    "productId": "...",
    "quantity": 1,
    "status": "ACTIVE",
    "expiresAt": "2026-04-14T19:00:00.000Z",
    "product": { "name": "...", "price": 299.99 }
  }
}
```

**Cancel response (200):**
```json
{ "success": true, "data": null }
```

**Query parameters for `GET /api/reservations`:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `status` | enum | — | Filter by ACTIVE / COMPLETED / EXPIRED / CANCELLED |
| `sortOrder` | asc/desc | desc | Sort by creation date |

---

### Checkout

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/checkout` | Yes | Convert an active reservation into a confirmed order |

**Body:**
```json
{ "reservationId": "..." }
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "userId": "...",
    "productId": "...",
    "reservationId": "...",
    "quantity": 1,
    "totalPrice": 299.99,
    "status": "CONFIRMED"
  }
}
```

---

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server health + database connectivity |
| `GET` | `/api/metrics` | No | In-memory request and operation counters |

**Health response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "uptime": 123.4,
    "timestamp": "2026-04-14T18:30:00.000Z",
    "version": "1.0.0"
  }
}
```

### Error Response Format

All errors follow a consistent shape:
```json
{
  "success": false,
  "error": "You already have an active reservation for this product",
  "code": "DUPLICATE_RESERVATION"
}
```

**Common error codes:**

| Code | HTTP | Description |
|---|---|---|
| `PRODUCT_NOT_FOUND` | 404 | Product ID does not exist |
| `PRODUCT_INACTIVE` | 400 | Product is disabled |
| `INSUFFICIENT_STOCK` | 409 | Not enough stock for requested quantity |
| `DUPLICATE_RESERVATION` | 409 | User already has an active reservation for this product |
| `RACE_CONDITION` | 409 | Stock was taken by a concurrent request |
| `RESERVATION_NOT_FOUND` | 404 | Reservation ID does not exist |
| `RESERVATION_NOT_ACTIVE` | 409 | Reservation is not in ACTIVE state |
| `RESERVATION_EXPIRED` | 410 | Reservation TTL elapsed |
| `FORBIDDEN` | 403 | Reservation belongs to a different user |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |

---

## Frontend Pages & Components

### Pages

| Page | Route | Description |
|---|---|---|
| `DropPage` | `/` | Main page — product grid + My Orders tab |

### Components

| Component | Description |
|---|---|
| `AuthModal` | Login / register overlay. Stores JWT in `localStorage` on success |
| `ProductCard` | Full product display with quantity selector, state-driven reservation flow |
| `ReserveButton` | CTA button with loading spinner and disabled states |
| `StockDisplay` | Animated progress bar showing `stock / totalStock` with color coding |
| `CountdownTimer` | MM:SS countdown with urgency color transitions and `onExpire` callback |
| `ReservationsList` | My Orders panel — summary stats, filter pills, per-reservation cards, toast notifications |

### Hooks

| Hook | Description |
|---|---|
| `useProducts` | Fetches all products, polls every 5 seconds, shows loading only on first load |
| `useProduct` | Fetches a single product by ID with 5-second polling |
| `useReservation` | State machine (idle → loading → reserved → expired/completed/error) with `reserve`, `checkout`, `cancel`, `reset` |
| `useCountdown` | Calculates seconds remaining and `MM:SS` display from an ISO expiry timestamp, updates every second |

---

## Trade-offs

| Trade-off | Choice | Reason |
|---|---|---|
| Serializable vs Read Committed | Serializable | Correctness over performance for stock-critical paths |
| Polling (5s) vs WebSocket | Polling | Simpler to implement and operate; sufficient for 5-second freshness |
| In-memory metrics vs Prometheus | In-memory | Sufficient for demo; Prometheus + Grafana for production |
| JWT vs Sessions | JWT | Stateless, scales horizontally without shared session store |
| node-cron vs external queue | node-cron | Simple in-process scheduler; BullMQ for multi-instance production |
| `FOR UPDATE` vs Optimistic locking | `FOR UPDATE` | Deterministic serialization; no client-side retry logic needed |
| Inline styles vs CSS modules | Inline styles | Zero build config, portable, works out of the box |

---

## What Would Break at 10k Concurrent Users

1. **Single PostgreSQL node** — `FOR UPDATE` creates a serialization bottleneck. All requests for the same product queue behind a single row lock. At 10k RPS, lock wait times spike and timeouts increase.

2. **In-process cron job** — does not scale across multiple backend instances. Two running instances would double-process expirations and could double-restore stock.

3. **In-memory metrics** — each server instance maintains its own counters; they never aggregate.

4. **No connection pooling** — Prisma's default pool (10 connections) is exhausted under high concurrency. Needs PgBouncer or similar.

5. **No Redis cache** — every stock check hits PostgreSQL. A Redis cache with TTL=1s would absorb ~99% of read traffic.

6. **No CDN for images** — product images served from origin under high load.

---

## How to Scale

```
Load Balancer (Nginx / Cloudflare)
        │
   ┌────┴────┬──────────┐
   │  Node 1 │  Node 2  │  ...Node N   ← Horizontal scaling
   └────┬────┴──────────┘
        │
   PgBouncer (connection pooler)
        │
   PostgreSQL Primary + Read Replicas
        │
   Redis (stock cache + SETNX distributed lock)
        │
   BullMQ (distributed job queue for expiration)
```

**Key changes for 10k+ users:**
- Replace `FOR UPDATE` with Redis `SETNX` distributed locks for sub-millisecond locking without DB bottleneck
- Move expiration cron to a BullMQ worker (runs on exactly one node, visible to all)
- Cache product stock in Redis, invalidate on every write
- Route read-heavy endpoints (`GET /products`) to read replicas
- Add a CDN in front of the frontend build and static assets

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts     # Seeds 2 products and 2 demo users
npm run dev                    # Starts on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # Starts on http://localhost:5173
```

### Demo Accounts (after seed)

| Email | Password |
|---|---|
| alice@example.com | password123 |
| bob@example.com | password123 |

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `PORT` | `3001` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | — | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | `7d` | JWT expiry duration |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `RESERVATION_TTL_MINUTES` | `5` | How long a reservation hold lasts |

---

## Running Tests

```bash
# Backend — Jest with in-process mocks (no real DB required)
cd backend && npm test

# Frontend — Vitest + React Testing Library
cd frontend && npm test
```

**Backend test coverage:**
- Reservation creation, duplicate prevention, insufficient stock
- Expiration processing with concurrent-checkout race guard
- Concurrency simulation (multiple simultaneous reserve calls)

**Frontend test coverage:**
- `useCountdown` — formatted time, decrement per second, expiry detection
- `useReservation` — initial state, successful reserve, error handling, expiry detection, reset
