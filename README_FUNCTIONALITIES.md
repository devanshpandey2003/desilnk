# Desilink — Functionality Reference

> **Tech Stack:** Next.js 16.1.6 · React 19 · NeonDB (Postgres) · MeraDoc API · PharmEasy (via MeraDoc) · Framer Motion · TanStack React Query · Resend · Axios

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Proxy Server Architecture](#2-proxy-server-architecture)
3. [Application Pages](#3-application-pages)
4. [API Routes](#4-api-routes)
5. [Webhook Handlers](#5-webhook-handlers)
6. [Service Layer](#6-service-layer)
7. [Library Utilities](#7-library-utilities)
8. [External Integrations](#8-external-integrations)
9. [Environment Variables](#9-environment-variables)
10. [Running the Project](#10-running-the-project)

---

## 1. Project Overview

**Desilink** is a healthcare consultancy platform that lets users:

- Book doctor consultations powered by the **MeraDoc** telemedicine API
- Order medicines online via the **PharmEasy** pharmacy network (routed through MeraDoc)
- Book diagnostic / lab tests with phlebotomist home-visits
- Manage family members, saved addresses, and a personal health profile
- Track appointment statuses, prescriptions, and lab-test orders in real time

---

## 2. Proxy Server Architecture

> **This is the single most important architectural decision in the project. Read this before touching any MeraDoc integration.**

### The Problem — MeraDoc sends NO CORS headers

The **MeraDoc API** (`apidev.meradoc.com`) returns **zero `Access-Control-*` headers** on every endpoint (verified by inspecting `/user/api/v1/sso/tenant` and `/doctor/listSpecialities`). It is a **server-to-server API**. Any call made **directly from the browser** with the custom `x-api-id` / `x-api-token` headers triggers a CORS preflight (`OPTIONS`) that MeraDoc answers `204` **without** `Access-Control-Allow-Origin` / `-Allow-Headers` — so the browser **silently blocks the request** before it is ever sent. In DevTools this shows as a failed request with the warning *"Provisional headers are shown."*

**Consequence:** every browser → MeraDoc call must go through a same-origin server route. Nothing may call `apidev.meradoc.com` directly from client code.

### The Solution — A Same-Origin Reverse Proxy

All MeraDoc traffic is routed through Next.js API routes on the app's own origin, which forward server-side (where CORS does not apply) and inject the secret credentials:

```
Browser (React / axios)
    │  calls  /api/mera/<meradoc-path>   (same origin — no CORS)
    ▼
Next.js Server  ◄── app/api/mera/[...path]/route.js   (generic reverse proxy)
    │  forwards to  https://apidev.meradoc.com/<meradoc-path>
    │  injects server-side: x-api-id, x-api-token, originToken
    │  forwards from client: Authorization (Bearer), X-Idempotency-Key
    ▼
MeraDoc API
```

### Two proxy entry points (both exist — know the difference)

| Route | Used by | Notes |
|-------|---------|-------|
| **`app/api/mera/[...path]/route.js`** | `lib/api.js` axios client (`baseURL: "/api/mera"`) — **the active one** | Generic catch-all. Forwards `Authorization` **and** `X-Idempotency-Key` (needed by appointment booking). Every `DoctorService` / `AppointmentService` / `UserService` call flows through here. |
| `app/api/meradoc-proxy/[...path]/route.js` | (legacy, from the ui-polish branch) | Functionally similar but does **not** forward `X-Idempotency-Key`. Kept for compatibility; `lib/api.js` points at `/api/mera`. |

There are also **purpose-built server routes** that call MeraDoc directly (server-side, so no CORS) instead of via the generic proxy — used when extra logic is needed (credential injection + DB writes + response reshaping): everything under `app/api/medicine/*`, `app/api/diagnostic/*`, `app/api/meradoc/*`, `app/api/token`, and the webhooks. These use the helpers in `lib/meradoc-proxy.js`.

### The tenant token (`/api/token`)

MeraDoc auth is a **tenant-level JWT** minted from static credentials at `POST /user/api/v1/sso/tenant`. Because that call is also CORS-blocked from the browser, it is proxied by **`app/api/token/route.js`** (which calls `getServerToken()` server-side and returns `{ data: { token } }`). The client stores the JWT in `localStorage.accessToken`.

- Client token generation: `UserService.generateToken()` → `POST /api/token`.
- Auto-refresh: `lib/api.js` has an axios **response interceptor** that, on `401`, calls `/api/token`, stores the fresh JWT, and retries the original request once. It also retries once on `5xx` (1s delay).
- The JWT decodes to `{ type: "TENANT", clientId: "PVMD-01", … }` — it identifies the **tenant**, not an individual patient, which is why user-scoped MeraDoc endpoints need `patientId`/`userId` passed explicitly (see §11).

### Why this matters

- ✅ **Works at all** — direct browser calls are physically blocked by CORS; the proxy is mandatory, not optional.
- ✅ **Security** — `x-api-token` / `originToken` are injected server-side and never shipped in the client bundle.
- ✅ **Resilience** — auto-refresh on 401 and retry on 5xx keep the UX seamless.

### Key Files

| File | Role |
|------|------|
| `app/api/mera/[...path]/route.js` | **Active** generic reverse proxy for all axios MeraDoc calls |
| `app/api/meradoc-proxy/[...path]/route.js` | Legacy generic proxy (no idempotency-key forwarding) |
| `app/api/token/route.js` | Mints the tenant JWT server-side (`/sso/tenant` is CORS-blocked) |
| `lib/api.js` | Axios client (`baseURL: /api/mera`); Bearer injection, 401 auto-refresh, 5xx retry |
| `lib/meradoc-proxy.js` | Server-side helpers: `getServerToken`, `meradocHeaders`, `meradocHeadersWithToken`, `PHARMACY_BASE` |

---

## 3. Application Pages

### Root & Layout

| File | Path | Description |
|------|------|-------------|
| `app/layout.js` | `/` (shell) | Root layout — sets metadata, wraps app in Providers |
| `app/template.js` | `/` (shell) | Page transition template using Framer Motion |
| `app/providers.js` | `/` (shell) | TanStack Query client + global session providers |
| `app/page.js` | `/` | **Landing page** — hero section, features, CTA |
| `app/globals.css` | — | Global CSS design tokens and base styles |

---

### Authentication

| File | Path | Description |
|------|------|-------------|
| `app/login/page.js` | `/login` | **Login / Sign-up** — checks `/api/users` by email; existing user → dashboard, new user → phone + OTP verify. Runs `activateUser()` on success (§11.7). |
| `app/login/verify/page.js` | `/login/verify` | **OTP verification** step for new registrations |
| `app/login/services/page.js` | `/login/services` | Onboarding: services overview |
| `app/login/about/page.js` | `/login/about` | Onboarding: about / info |
| `app/login/notifications/page.js` | `/login/notifications` | Onboarding: notification opt-in |
| `app/login/success/page.js` | `/login/success` | Onboarding: success / completion |

---

### Consultancy Hub

All consultancy pages share the layout defined in `app/consultancy/layout.js`, which renders the sidebar navigation and common header.

| File | Path | Description |
|------|------|-------------|
| `app/consultancy/layout.js` | `/consultancy` | Shared layout with sidebar, user session guard |
| `app/consultancy/page.js` | `/consultancy` | **Dashboard** — quick-action cards for Consult, Lab Test, Medicines |
| `app/consultancy/consultancy.css` | — | Shared CSS for all consultancy sub-pages |

#### Doctor Consultation

| File | Path | Description |
|------|------|-------------|
| `app/consultancy/doctors/page.js` | `/consultancy/doctors` | **Doctor listing** — browse/filter doctors by specialty |
| `app/consultancy/doctors/[specialty]/page.js` | `/consultancy/doctors/:specialty` | Doctors filtered by a chosen specialty |
| `app/consultancy/doctors/book/page.js` | `/consultancy/doctors/book` | Slot picking + booking for a selected doctor |
| `app/consultancy/concerns/page.js` | `/consultancy/concerns` | **Health concerns selector** — pick a concern to filter specialties |
| `app/consultancy/book-consultation/page.js` | `/consultancy/book-consultation` | **Booking flow** — pick slot, enter patient details, upload documents, confirm booking |
| `app/consultancy/appointment/[id]/page.js` | `/consultancy/appointment/:id` | **Appointment details** — view booked appointment info + live status |

#### Lab Tests (Diagnostics)

| File | Path | Description |
|------|------|-------------|
| `app/consultancy/lab-tests/page.js` | `/consultancy/lab-tests` | **Lab test booking** — enter pincode, search tests, pick phlebotomist slots, checkout |
| `app/consultancy/lab-tests/address/page.js` | `/consultancy/lab-tests/address` | **Delivery address entry** — GPS/manual pincode, runs lab + medicine serviceability, saves the location (used by both lab & medicine flows via `?for=` / `?from=nav`) |
| `app/consultancy/lab-tests/lab-tests.css` | — | Dedicated CSS for lab-test booking UI |

#### Medicines

| File | Path | Description |
|------|------|-------------|
| `app/consultancy/medicines/page.js` | `/consultancy/medicines` | **Medicine search** — search by **name** (not ucode), check pincode availability, add to cart |
| `app/consultancy/medicines/prescription/page.js` | `/consultancy/medicines/prescription` | **Prescription upload** — for Rx-required medicines before checkout |
| `app/consultancy/cart/page.js` | `/consultancy/cart` | **Medicine cart & checkout** — view cart items, enter delivery address, place order, save order ID |

#### User Profile

| File | Path | Description |
|------|------|-------------|
| `app/consultancy/profile/page.js` | `/consultancy/profile` | **My Profile** — tabbed view: Personal Info, Family Members, Medicine Orders, Prescriptions |
| `app/consultancy/address/page.js` | `/consultancy/address` | **Address management** — add/edit saved delivery addresses |
| `app/consultancy/about/page.js` | `/consultancy/about` | **About / Help** page |

---

### MeraDoc Registration

| File | Path | Description |
|------|------|-------------|
| `app/meradoc-register/page.js` | `/meradoc-register` | **Patient registration wizard** — collects name, DOB, gender, phone; registers patient with MeraDoc, saves `patientId` to DB and `localStorage` |
| `app/meradoc-register/meradoc-register.css` | — | CSS for registration flow |

---

### Doctors (Public)

| File | Path | Description |
|------|------|-------------|
| `app/doctors/page.js` | `/doctors` | **Public doctor directory** — browsable without login |
| `app/doctors/[doctorId]/page.js` | `/doctors/:doctorId` | Public doctor profile / detail page |

---

### Dashboard

| File | Path | Description |
|------|------|-------------|
| `app/dashboard/page.js` | `/dashboard` | **Admin/stats dashboard** (internal) |

---

## 3. API Routes

### Users

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/users/route.js` | `GET` | `/api/users?email=` | Fetch user profile (email, phone, name, country, dob, gender) |
| `app/api/users/route.js` | `PATCH` | `/api/users` | Update user profile fields (name, country, dob, bloodGroup, gender) |
| `app/api/users/route.js` | `POST` | `/api/users` | Create or upsert user record on first login |

---

### Family Members

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/family-members/route.js` | `GET` | `/api/family-members?patientId=` | List all family members for a patient |
| `app/api/family-members/route.js` | `POST` | `/api/family-members` | Add a new family member (name, DOB, gender, relationship, phone) |
| `app/api/family-members/route.js` | `DELETE` | `/api/family-members?id=` | Remove a family member by row ID |

---

### Medicine  (provider: PharmEasy = `PEMD-01`, via MeraDoc)

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/medicine/search/route.js` | `GET` | `/api/medicine/search?search=&pincode=&page=&size=` | Name/keyword search via MeraDoc drug API. **Text search only — a `ucode` as the term does NOT match** (returns unrelated products). Results include `productId`, `ucode`, `name`, `pricingInfo`, `fulfilability`. |
| `app/api/medicine/availability/route.js` | `POST` | `/api/medicine/availability` | Body `{ pincode, ucodes[] }`. Requires a Bearer token (401 without). Returns `{ availability: { [ucode]: bool }, providerUnavailable? }`. When the PharmEasy provider can't verify a ucode it is treated as **orderable** (not out-of-stock) and flagged — see §11. |
| `app/api/medicine/order/route.js` | `POST` | `/api/medicine/order` | Place an order. Resolves `patientId` (body → `x-patient-id` header → DB), forwards to `/go/api/v1/pharmacy/orders`, retries once on 401, returns **source-attributed** errors (`source: desilink \| meradoc \| external`), and **persists** the order into `medicine_orders`. See the order contract in §11. |
| `app/api/medicine/orders/route.js` | `GET` | `/api/medicine/orders?email=` | Lists a user's medicine orders from `medicine_orders` (newest first), with best-effort live status per order. |
| `app/api/medicine/order/status/route.js` | `GET` | `/api/medicine/order/status?orderId=` | Single order status via `GET /go/api/v1/pharmacy/orders/{id}` (note the `/go` prefix — the plain `/api/v1/...` path 404s). |

---

### Diagnostic (Lab Tests)

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/diagnostic/serviceability/route.js` | `GET` | `/api/diagnostic/serviceability?zipcode=&lat=&long=` | Check if lab test home-visit is available at a location |
| `app/api/diagnostic/search/route.js` | `GET` | `/api/diagnostic/search?q=&zipcode=` | Search diagnostic test packages |
| `app/api/diagnostic/slots/route.js` | `POST` | `/api/diagnostic/slots` | Get phlebotomist availability slots for a date + test list |
| `app/api/diagnostic/book/route.js` | `POST` | `/api/diagnostic/book` | Book a lab test with selected slot and address |
| `app/api/diagnostic/order/[orderId]/route.js` | `GET` | `/api/diagnostic/order/:orderId` | Get lab test order details |
| `app/api/diagnostic/cancel/route.js` | `POST` | `/api/diagnostic/cancel` | Cancel a booked lab test order |
| `app/api/diagnostic/reschedule/route.js` | `POST` | `/api/diagnostic/reschedule` | Reschedule a booked lab test order |

---

### MeraDoc Patient

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/meradoc/patient/route.js` | `GET` | `/api/meradoc/patient?email=` | Look up MeraDoc `patientId` from DB by email |
| `app/api/meradoc/address/route.js` | `GET/POST` | `/api/meradoc/address` | Get or save MeraDoc address ID for the patient |

---

### Status & History

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/appointment-status/route.js` | `GET` | `/api/appointment-status?appointmentId=` | Get latest appointment status from DB (populated by webhook) |
| `app/api/lab-test-status/route.js` | `GET` | `/api/lab-test-status?email=` | List all lab test orders for a user with live status from MeraDoc |
| `app/api/prescriptions/route.js` | `GET` | `/api/prescriptions?appointmentId=` or `?patientId=` | Retrieve prescriptions from DB (populated by webhook) |
| `app/api/lab-test-address/route.js` | `GET` | `/api/lab-test-address?email=` | Retrieve saved lab-test delivery location for user |
| `app/api/lab-test-address/route.js` | `POST` | `/api/lab-test-address` | Save/update lab-test delivery location for user |

---

### Utility

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/pincode/route.js` | `GET` | `/api/pincode?pincode=` | Pincode → city/state/lat/lon lookup (India Post + Nominatim) |
| `app/api/pincode/route.js` | `GET` | `/api/pincode?lat=&lon=` | Reverse geocoding: coordinates → address + pincode (Nominatim) |
| `app/api/token/route.js` | `POST` | `/api/token` | Mints the tenant JWT server-side (proxies the CORS-blocked `/sso/tenant`) |
| `app/api/mera/[...path]/route.js` | ALL | `/api/mera/*` | **Active generic reverse proxy** — forwards all axios MeraDoc calls, injecting `x-api-id`/`x-api-token`/`originToken` and forwarding `Authorization` + `X-Idempotency-Key` |
| `app/api/meradoc-proxy/[...path]/route.js` | ALL | `/api/meradoc-proxy/*` | Legacy generic proxy (no idempotency-key forwarding) |

---

## 4. Webhook Handlers

Webhooks are called by MeraDoc to push real-time updates into the Desilink database.

| Route File | Method | Endpoint | Trigger | Action |
|------------|--------|----------|---------|--------|
| `app/api/webhooks/update-status/route.js` | `POST` | `/api/webhooks/update-status` | Appointment status change | Inserts row into `appointment_status_updates` table |
| `app/api/webhooks/update-prescription/route.js` | `POST` | `/api/webhooks/update-prescription` | Doctor uploads prescription | Inserts row into `prescriptions` table with URL + metadata |
| `app/api/webhooks/lab-test-status/route.js` | `POST` | `/api/webhooks/lab-test-status` | Lab test order update | Upserts row in `lab_test_orders`; fetches full order from MeraDoc for enrichment |

> All webhook handlers auto-create the target table if it doesn't exist (idempotent `CREATE TABLE IF NOT EXISTS`).

---

## 5. Service Layer

Service files abstract external API calls and can be reused across pages.

| File | Exported Object | Key Methods |
|------|-----------------|-------------|
| `services/appointment.service.js` | `AppointmentService` | `getConcerns`, `getSlots`, `bookConsultation`, `updateConsultation`, `rescheduleConsultation`, `cancelConsultation`, `blockSlot`, `uploadDocuments`, `getAppointmentDetails`, `getPrescription` |
| `services/diagnostic.service.js` | `DiagnosticService` | `checkServiceability`, `searchTests`, `getPhleboSlots`, `bookLabTest`, `getOrder`, `cancelOrder`, `rescheduleOrder` |
| `services/doctor.service.js` | `DoctorService` | Doctor search and filtering |
| `services/user.service.js` | `UserService` | `generateToken`, `registerPatient`, `updatePatient`, `addMeraDocAddress`, `getMeraDocAddresses`, `addFamilyMember`, `removeFamilyMember`, `updateFamilyMember` |

---

## 6. Library Utilities

| File | Exports | Description |
|------|---------|-------------|
| `lib/db.js` | `sql` (default) | Neon serverless SQL client; reads `DATABASE_URL` from env |
| `lib/api.js` | `api`, `UserAPI` | Axios instance pre-configured for MeraDoc proxy; handles Bearer token injection, auto-refresh on 401, and retry on 5xx |
| `lib/meradoc-proxy.js` | `PHARMACY_BASE`, `getServerToken`, `meradocHeaders`, `meradocHeadersWithToken` | Shared MeraDoc auth helpers used by server-side routes and webhooks |
| `lib/getPatientId.js` | `getPatientId()` | Client-side helper that resolves the MeraDoc `patientId` from `localStorage` cache or DB fallback |

---

## 7. External Integrations

| Integration | Purpose | Auth |
|-------------|---------|------|
| **MeraDoc API** (`apidev.meradoc.com`) | Doctor booking, SSO, patient management, pharma orders, diagnostic orders | `x-api-id`, `x-api-token`, `originToken` + per-user Bearer JWT |
| **PharmEasy** (via MeraDoc) | Medicine order fulfilment routed through MeraDoc's pharmacy API | Same as MeraDoc |
| **NeonDB** | Serverless PostgreSQL; stores users, family members, prescriptions, appointment statuses, lab test orders | `DATABASE_URL` connection string |
| **India Post Pincode API** | Pincode → city/state lookup | Public, no key required |
| **Nominatim (OpenStreetMap)** | Reverse geocoding and coordinate lookup | Public, `User-Agent` header required |
| **Resend** | Transactional email (e.g., booking confirmations) | `RESEND_API_KEY` |

---

## 8. Environment Variables

Create a `.env.local` file in the project root with:

```env
# NeonDB (PostgreSQL)
DATABASE_URL=postgres://...

# MeraDoc API credentials (already hardcoded in proxy for dev; move to env for production)
MERADOC_API_ID=PVMD-01
MERADOC_API_TOKEN=...
MERADOC_ORIGIN_TOKEN=...

# Resend (email)
RESEND_API_KEY=re_...
```

---

## 9. Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

> **Default dev server:** [http://localhost:3000](http://localhost:3000)

---

## 11. Critical Behaviors, API Contracts & Known Constraints (READ THIS)

This section captures non-obvious rules that are **not visible from reading the code casually**. A new maintainer needs these to avoid re-discovering them the hard way.

### 11.1 MeraDoc has no CORS — never call it from the browser
See §2. Every MeraDoc call must go through a same-origin `/api/*` route. If you add a new MeraDoc feature, add a server route (or use `/api/mera/...`); do **not** `fetch("https://apidev.meradoc.com/...")` from a component — the browser blocks it and you'll see a misleading "provisional headers" failure.

### 11.2 The tenant token is not a patient
The JWT from `/sso/tenant` is `type: TENANT` (identifies client `PVMD-01`, not a person). So any **user-scoped** MeraDoc write must pass the patient explicitly. Two forms are used:

- **Query param** — `address/create` and `address/update/:id` read `userId` from the **URL query string** (`?userId=<patientId>`), NOT the body. Body-only → `400 "User Id is required"`. (`app/api/meradoc/address/route.js`.)
- **Body field** — the pharmacy order requires `patientId` in the JSON body (see §11.3).

If a MeraDoc endpoint returns "User Id is required" / "patientId is required", try passing it as a **query param** first, then as a body field.

### 11.3 Medicine order contract (`POST /go/api/v1/pharmacy/orders`)
MeraDoc validates the body in stages — each missing field is a fresh `400`. A valid order needs **all** of:

1. `patientId` in the body (resolved server-side from `meradoc_patients` by email, or `x-patient-id` header).
2. `items[].name` on every item (the cart must send `i.product.name`).
3. `items[].productId` = the product's **search `productId`** (e.g. NICIP PLUS = `6216`), **not** its `ucode` (`122665`) and not a stale id → otherwise `Medicine "<name>" was not found`.
4. Order total **≥ ₹300** → else `Minimum order amount should be 300`.

On success the route persists the order into `medicine_orders` so it appears in **Profile → Medicine Orders**.

### 11.4 Medicine order status is effectively always `PENDING` on dev
Orders are created in MeraDoc as `PENDING`, but the PharmEasy provider (`PEMD-01`) does not create the partner order on the dev environment (`partnerOrderId` comes back empty). Three consequences, all dead on dev:
- Provider never fulfils → status stays `PENDING`.
- The live lookup `GET /go/api/v1/pharmacy/orders/{mongoId}` returns `"Order Not Found"` even for a just-placed order.
- There is **no medicine-order status webhook** (only lab-test / appointment / prescription webhooks exist).
So `/api/medicine/orders` always falls back to the stored status. In production (working provider) the live-status path lights up automatically.

### 11.5 Medicine availability — "provider unavailable" ≠ out of stock
`/drugs/availability` genuinely fails (HTTP 502 `provider unavailable`) for many products even though search lists them `IN_STOCK`. The route therefore treats any ucode it **couldn't verify** as **available/orderable** (with a `providerUnavailable: true` flag) rather than blocking the user; only an explicit `availability:false` from MeraDoc marks a product unavailable. The response deliberately does **not** forward MeraDoc's raw 502 body.

### 11.6 Address / geocoding fragility
- `POST /api/meradoc/address` requires **non-empty `district`, `city`, and `mobileNumber`**. `district`/`city` fall back `city → district → state → "N/A"` because geocoding can return an empty city. `mobileNumber` comes from `userPhone`.
- The pincode lookup (`/api/pincode`) uses **India Post first, Nominatim as fallback**. India Post is flaky; when it's down the Nominatim fallback derives the city from `state_district` / `city_district` / `municipality`. Both are external, unauthenticated APIs.

### 11.7 Per-user data isolation (localStorage)
Auth state lives in `localStorage`. The address is stored **per email** (`ltLocation_<email>`) and server-side (`user_lt_locations`, via `/api/lab-test-address`). On every login/registration, **`lib/session.js` → `activateUser(email)`** runs: it clears the global/leaky keys (`ltCart`, legacy `ltLocation`, `ltDeliveryCity`) so a new user can't inherit the previous user's cart/city, then re-hydrates `ltLocation_<email>` from the server. The nav header derives the "Deliver to" city from the **active user's** `ltLocation_<email>`, never a shared key. Logout ([profile] handler and the dashboard sidebar button) clears auth + per-user keys and routes to `/login`.

### 11.9 Dev-only double requests (React StrictMode)
In `npm run dev`, Next.js enables React StrictMode, which **double-invokes effects** — so mount-effect `fetch`es (e.g. the cart page's users/patient/lab-test-address loads) fire **twice**. This is dev-only; a production build runs them once. It is not a bug. (Migrating those raw `fetch`es to the already-configured TanStack Query would dedupe them if desired.)

### 11.10 Key localStorage keys

| Key | Scope | Purpose |
|-----|-------|---------|
| `accessToken` | global | Tenant JWT (Bearer) |
| `userEmail` / `userName` / `userPhone` / `userCountry` / `userGender` | global | Session identity |
| `meradocPatientId_<email>` | per-user | MeraDoc patient id |
| `meradocAppointmentId_<email>` | per-user | Active appointment id |
| `ltLocation_<email>` | per-user | Saved delivery address (mirrors `user_lt_locations`) |
| `ltCart` / `medCart` | global | Lab-test / medicine carts (cleared on user switch) |
| `medOrders_<email>` / `ltPendingOrders_<email>` | per-user | Optimistic order caches |

> Legacy global keys `ltLocation` and `ltDeliveryCity` are deprecated and cleared on login; do not reintroduce reads of them.
