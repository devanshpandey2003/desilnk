# Medicine Orders Tab — Design Spec

**Date:** 2026-07-20
**Status:** Approved
**Scope:** View-only list of a user's medicine orders, shown in a new "Medicines" tab in the consultancy profile.

## Problem

Users can place medicine orders but there is no way to see past orders. MeraDoc exposes
`GET /go/api/v1/pharmacy/orders/{orderId}` (single order by ObjectId), but:

- There is **no list endpoint** (`GET /go/api/v1/pharmacy/orders` → 405).
- Medicine orders are **not persisted** anywhere today (the order route places the order and returns it, but stores nothing).
- The live by-id lookup is **unreliable on MeraDoc's dev env** — it returns `"Order Not Found"` even for freshly-created orders, because the PharmEasy provider (`PEMD-01`) fails to create the partner order (`partnerOrderId` comes back empty).

Therefore we must store orders ourselves and treat the live lookup as best-effort — mirroring the
existing `lab_test_orders` + `lab-test-status` pattern.

## Architecture

Four units, each following an existing counterpart in the lab-tests flow:

### 1. Persistence — `medicine_orders` table
Written from `app/api/medicine/order/route.js` on a successful (200) order.

```
medicine_orders(
  id         SERIAL PRIMARY KEY,
  order_id   TEXT UNIQUE NOT NULL,   -- MDM-xxxx (display id)
  mongo_id   TEXT,                    -- ObjectId _id (used for the live lookup)
  email      TEXT,
  patient_id TEXT,
  raw_data   JSONB NOT NULL,          -- full MeraDoc order response
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```
Table auto-created on first write (`CREATE TABLE IF NOT EXISTS`), upserted `ON CONFLICT (order_id) DO UPDATE` — same convention as `lab_test_orders`.

### 2. List route — `GET /api/medicine/orders?email=`
- Reads stored `medicine_orders` for the email, newest first.
- For each order, **best-effort** live status via `GET /go/api/v1/pharmacy/orders/{mongo_id}` using a server token; on any failure or "Order Not Found", falls back to the stored `raw_data`.
- Returns `{ orders: [...] }` (each row + resolved `status`).
- Behaves exactly like `GET /api/lab-test-status`.

### 3. By-id route — fix `GET /api/medicine/order/status`
The existing route calls `${MERADOC_BASE}/api/v1/pharmacy/orders/{id}` which **404s**. Correct it to the
`/go/api/v1/pharmacy/orders/{id}` path. The list route reuses this lookup.

### 4. UI — "Medicines" tab in `app/consultancy/profile/page.js`
- Add a `medicines` entry to the `activeTab` menu (button after "Lab Tests") and a matching conditional panel.
- New `MedicineOrdersPanel` component mirroring `LabTestsPanel`: loading / empty / refresh states, one card per order.
- Each card shows: **orderId (MDM-xxxx), item names + quantities, total price, status badge, order date** — all from stored data so it renders even while the live lookup is down.

## Data flow

```
place order → order route stores in medicine_orders (email → order)
profile "Medicines" tab → GET /api/medicine/orders?email=
  → read stored orders
  → per order: try live GET /go/.../orders/{mongo_id} (best-effort)
  → render cards (live status if available, else stored status)
```

## Error handling
- List route: if table doesn't exist yet or email has no orders → `{ orders: [] }` (empty state in UI).
- Live lookup failure ("Order Not Found", network) → silently fall back to stored `raw_data`; never fails the list.
- Panel: loading spinner, empty state with note, error state with retry — copied from `LabTestsPanel`.

## Out of scope (YAGNI)
- Cancel / reorder / reschedule actions (view-only).
- Prescription re-display.
- Backfilling orders placed before this ships (nothing was stored for them).

## Testing
- Place an order → confirm a row lands in `medicine_orders`.
- `GET /api/medicine/orders?email=` returns the order with items/total/status.
- Live lookup down → list still returns stored data (no 500).
- Profile "Medicines" tab renders the order card; empty state when none.
