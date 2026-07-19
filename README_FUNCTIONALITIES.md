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

> **This is one of the core architectural decisions of the project.**

### The Problem — Inconsistent API Behaviour

The **MeraDoc API** (`apidev.meradoc.com`) does send `Access-Control-Allow-Origin` (origin) headers, which means direct browser requests are technically permitted. However, the behaviour is **inconsistent across different endpoints** — some APIs work fine from the browser while others fail unpredictably, causing broken flows across features like doctor booking, medicine search, and lab test lookup.

Rather than patching each failing endpoint individually, a **single server-side proxy** was built to route all MeraDoc communication through the Next.js server — making the integration reliable and uniform across every API call.

### The Solution — A Custom Server-Side Proxy

Rather than asking MeraDoc to fix their CORS headers, a **Next.js API Route Proxy** was built into this application. It sits between the browser and MeraDoc:

```
Browser (React)
    │
    │  calls   /api/meradoc-proxy/*  (same origin — no CORS issue)
    ▼
Next.js Server  ◄── app/api/meradoc-proxy/route.js
    │
    │  forwards request to   https://apidev.meradoc.com/*
    │  injects: x-api-id, x-api-token, originToken, Authorization
    ▼
MeraDoc API
```

### What the Proxy Does

1. **Receives** any request from the browser at `/api/meradoc-proxy/{path}`.
2. **Strips** the `/api/meradoc-proxy` prefix and reconstructs the full MeraDoc URL.
3. **Injects** the required MeraDoc credentials server-side:
   - `x-api-id` — static tenant API ID
   - `x-api-token` — static tenant API token
   - `originToken` — static origin identity token
   - `Authorization: Bearer <JWT>` — per-user session token from `localStorage` (passed from browser)
4. **Forwards** the response back to the browser transparently.

### Auto Token Refresh

The `lib/api.js` Axios instance that all service files use includes a **response interceptor** that:
- Detects a `401 Unauthorized` response (expired session token)
- Automatically calls `/api/meradoc-proxy/user/api/v1/sso/tenant` to get a fresh JWT
- Retries the original failed request with the new token — **without the user ever seeing an error**

It also retries once automatically on `5xx` server errors (1-second delay).

### Key Files

| File | Role |
|------|------|
| `app/api/meradoc-proxy/route.js` | The proxy server entry point — catches all `/*` paths and forwards to MeraDoc |
| `lib/api.js` | Axios client configured to send all requests through the proxy; handles token refresh |
| `lib/meradoc-proxy.js` | Shared helper — builds MeraDoc auth headers for use in server-side routes and webhooks |

### Why This Matters

- ✅ **Security** — API credentials (`x-api-id`, `x-api-token`) are never exposed to the browser
- ✅ **CORS-free** — Browser always talks to its own domain; no browser policy violations  
- ✅ **Resilience** — Auto-retry on 5xx and auto-refresh on 401 keeps the UX seamless  
- ✅ **Centralised auth** — All third-party auth is managed in one place on the server, not scattered across frontend code

---

## 2. Application Pages

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
| `app/login/page.js` | `/login` | **Login / Sign-up page** — Google OAuth / phone OTP via MeraDoc SSO; stores `accessToken` and `userEmail` in `localStorage` |

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
| `app/consultancy/concerns/page.js` | `/consultancy/concerns` | **Health concerns selector** — pick a concern to filter specialties |
| `app/consultancy/book-consultation/page.js` | `/consultancy/book-consultation` | **Booking flow** — pick slot, enter patient details, upload documents, confirm booking |
| `app/consultancy/appointment/page.js` | `/consultancy/appointment` | **Appointment details** — view booked appointment info and status |

#### Lab Tests (Diagnostics)

| File | Path | Description |
|------|------|-------------|
| `app/consultancy/lab-tests/page.js` | `/consultancy/lab-tests` | **Lab test booking** — enter pincode, search tests, pick phlebotomist slots, checkout |
| `app/consultancy/lab-tests/lab-tests.css` | — | Dedicated CSS for lab-test booking UI |

#### Medicines

| File | Path | Description |
|------|------|-------------|
| `app/consultancy/medicines/page.js` | `/consultancy/medicines` | **Medicine search** — search by name/ucode, check pincode availability, add to cart |
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

### Medicine

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/medicine/search/route.js` | `GET` | `/api/medicine/search?q=&pincode=` | Search medicines by keyword via MeraDoc drug API |
| `app/api/medicine/availability/route.js` | `POST` | `/api/medicine/availability` | Check availability of medicine ucodes at a pincode |
| `app/api/medicine/order/route.js` | `POST` | `/api/medicine/order` | Place a medicine order (cart checkout) via PharmEasy/MeraDoc |

---

### Diagnostic (Lab Tests)

| Route File | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| `app/api/diagnostic/serviceability/route.js` | `GET` | `/api/diagnostic/serviceability?zipcode=&lat=&long=` | Check if lab test home-visit is available at a location |
| `app/api/diagnostic/search/route.js` | `GET` | `/api/diagnostic/search?q=&zipcode=` | Search diagnostic test packages |
| `app/api/diagnostic/slots/route.js` | `POST` | `/api/diagnostic/slots` | Get phlebotomist availability slots for a date + test list |
| `app/api/diagnostic/book/route.js` | `POST` | `/api/diagnostic/book` | Book a lab test with selected slot and address |
| `app/api/diagnostic/order/route.js` | `GET` | `/api/diagnostic/order/:orderId` | Get lab test order details |
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
| `app/api/pincode/route.js` | `GET` | `/api/pincode?lat=&lon=` | Reverse geocoding: coordinates → address + pincode |
| `app/api/meradoc-proxy/route.js` | ALL | `/api/meradoc-proxy/*` | **Server-side CORS proxy** — forwards all MeraDoc API calls, injecting auth headers |

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
