# Desilink — Database Reference

> **Database Provider:** [Neon](https://neon.tech) — Serverless PostgreSQL  
> **Client Library:** `@neondatabase/serverless` v1.1.0  
> **Connection:** Configured via `DATABASE_URL` environment variable in `.env.local`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Table: `users`](#2-table-users)
3. [Table: `family_members`](#3-table-family_members)
4. [Table: `meradoc_patients`](#4-table-meradoc_patients)
5. [Table: `prescriptions`](#5-table-prescriptions)
6. [Table: `appointment_status_updates`](#6-table-appointment_status_updates)
7. [Table: `lab_test_orders`](#7-table-lab_test_orders)
8. [Table: `user_lt_locations`](#8-table-user_lt_locations)
9. [Entity Relationship Overview](#9-entity-relationship-overview)
10. [Notes on Schema Management](#10-notes-on-schema-management)

---

## 1. Overview

Desilink uses **7 tables** in a single Neon PostgreSQL database. The database stores user profiles, family relationships, MeraDoc external patient IDs, and all health-service records (prescriptions, appointment statuses, lab test orders, saved addresses). External data (real-time appointment details, live lab-test status, doctor info) is fetched on demand from the **MeraDoc API** and is not persisted long-term.

---

## 2. Table: `users`

**Managed by:** `app/api/users/route.js`  
**Purpose:** Stores the core profile for every registered Desilink user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `email` | `TEXT` | `PRIMARY KEY` (implicit via `ON CONFLICT`) | User's email — used as unique identifier across the app |
| `phone` | `TEXT` | NOT NULL | User's phone number |
| `name` | `TEXT` | NOT NULL | Full display name |
| `country` | `TEXT` | NOT NULL | Country of residence |
| `dob` | `TEXT` | Optional | Date of birth (format: `YYYY-MM-DD`) |
| `blood_group` | `TEXT` | Optional | Blood group (e.g., `O+`, `AB-`) |
| `gender` | `TEXT` | Optional | Gender (`Male` / `Female` / `Other`) |

**Operations:**
- `POST /api/users` — Create or upsert (on email conflict, updates phone/name/country)
- `GET /api/users?email=` — Fetch profile
- `PATCH /api/users` — Update optional fields (dob, blood_group, gender)

> **Note:** `dob`, `blood_group`, and `gender` columns are added dynamically with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on PATCH — they may not exist on older DB instances until the first PATCH is called.

---

## 3. Table: `family_members`

**Managed by:** `app/api/family-members/route.js`  
**Purpose:** Stores family members linked to a patient's account for booking consultations / lab tests on their behalf.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing row ID |
| `patient_id` | `TEXT` | NOT NULL | MeraDoc patient ID of the primary account holder |
| `member_account_id` | `TEXT` | Nullable | MeraDoc account ID of the family member (if registered separately in MeraDoc) |
| `name` | `TEXT` | Nullable | Family member's full name |
| `phone_number` | `TEXT` | Nullable | Family member's phone number |
| `age` | `INTEGER` | Nullable | Age in years |
| `dob` | `TEXT` | Nullable | Date of birth |
| `gender` | `TEXT` | Nullable | Gender |
| `relationship` | `TEXT` | Nullable | Relationship to primary user (e.g., `Spouse`, `Child`, `Parent`) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Record creation timestamp |

**Operations:**
- `GET /api/family-members?patientId=` — List all members (ordered newest first)
- `POST /api/family-members` — Add a new family member
- `DELETE /api/family-members?id=` — Remove a member by row ID

---

## 4. Table: `meradoc_patients`

**Managed by:** `app/api/meradoc/patient/route.js`, `lib/getPatientId.js`  
**Purpose:** Maps a Desilink user's email to their MeraDoc `patientId`. This ID is required for all MeraDoc booking and order APIs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `email` | `TEXT` | `PRIMARY KEY` (unique) | Desilink user email |
| `patient_id` | `TEXT` | NOT NULL | MeraDoc-assigned patient UUID |

**Operations:**
- `GET /api/meradoc/patient?email=` — Look up `patientId` by email
- Upserted during MeraDoc patient registration flow (`/meradoc-register`)

---

## 5. Table: `prescriptions`

**Managed by:** `app/api/webhooks/update-prescription/route.js` (write), `app/api/prescriptions/route.js` (read)  
**Purpose:** Stores prescriptions issued by doctors after a consultation. Populated automatically via MeraDoc webhook when a doctor uploads a prescription.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing row ID |
| `appointment_mongo_id` | `TEXT` | Nullable | MeraDoc MongoDB ObjectId of the appointment |
| `appointment_display_id` | `TEXT` | Nullable | Human-readable appointment display ID (e.g., `APPT-1234`) |
| `patient_id` | `TEXT` | Nullable | MeraDoc patient ID |
| `prescription_url` | `TEXT` | Nullable | URL to the first prescription image uploaded by the doctor |
| `raw_data` | `JSONB` | NOT NULL | Full webhook payload from MeraDoc (includes all prescription image URLs) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Timestamp when prescription was received |

**Operations:**
- `POST /api/webhooks/update-prescription` — Insert (called by MeraDoc webhook)
- `GET /api/prescriptions?appointmentId=` — Fetch by MongoDB ID or display ID
- `GET /api/prescriptions?patientId=` — Fetch all prescriptions for a patient

---

## 6. Table: `appointment_status_updates`

**Managed by:** `app/api/webhooks/update-status/route.js` (write), `app/api/appointment-status/route.js` (read)  
**Purpose:** Stores real-time appointment status updates pushed in by MeraDoc webhooks. Each row is one status event for an appointment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing row ID |
| `appointment_mongo_id` | `TEXT` | Nullable | MeraDoc MongoDB ObjectId of the appointment |
| `status` | `TEXT` | Nullable | Primary appointment status (e.g., `CONFIRMED`, `COMPLETED`, `CANCELLED`) |
| `sub_status` | `TEXT` | Nullable | Granular sub-status detail provided by MeraDoc |
| `other_details` | `TEXT` | Nullable | Any additional details from the webhook payload |
| `raw_data` | `JSONB` | NOT NULL | Full raw webhook payload |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | When this status update was received |

**Operations:**
- `POST /api/webhooks/update-status` — Insert (called by MeraDoc webhook)
- `GET /api/appointment-status?appointmentId=` — Fetch the most recent status for an appointment (`LIMIT 1 ORDER BY created_at DESC`)

---

## 7. Table: `lab_test_orders`

**Managed by:** `app/api/webhooks/lab-test-status/route.js` (write), `app/api/lab-test-status/route.js` (read)  
**Purpose:** Stores lab test (diagnostic) orders per user. Initially seeded by a webhook from MeraDoc when an order is created; status is fetched live from MeraDoc when displayed.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `order_id` | `TEXT` | `PRIMARY KEY` / UNIQUE | MeraDoc lab test order ID (bookingId / orderId) |
| `email` | `TEXT` | Nullable | User's email — used to query orders per user |
| `raw_data` | `JSONB` | NOT NULL | Full MeraDoc order object (includes orderStatus, patient details, test info) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last time this row was upserted (reflects most recent webhook) |

**Operations:**
- `POST /api/webhooks/lab-test-status` — Upsert (called by MeraDoc webhook on every order status change)
- `GET /api/lab-test-status?email=` — Fetch all orders for a user; status is enriched live by calling MeraDoc

> **Status is not stored:** `orderStatus` is not a direct column; it is derived from `raw_data->>'orderStatus'` or fetched live from the MeraDoc `/order/:id` endpoint.

---

## 8. Table: `user_lt_locations`

**Managed by:** `app/api/lab-test-address/route.js`  
**Purpose:** Saves the last-used delivery location for lab test home-visit bookings, so users don't have to re-enter their address every time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `email` | `TEXT` | UNIQUE (conflict key) | User's email — one record per user |
| `location` | `JSONB` | NOT NULL | Saved address object (addressLine1, city, state, pincode, lat, long, etc.) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last update timestamp |

**Operations:**
- `GET /api/lab-test-address?email=` — Retrieve saved location
- `POST /api/lab-test-address` — Save or update location (upsert on email conflict)

---

## 9. Entity Relationship Overview

```
users (email PK)
  │
  ├─── meradoc_patients (email → patient_id)
  │         │
  │         ├─── family_members (patient_id FK)
  │         ├─── prescriptions (patient_id FK)
  │         └─── appointment_status_updates (appointment_mongo_id)
  │
  ├─── lab_test_orders (email FK)
  └─── user_lt_locations (email FK)
```

- `email` is the universal linking key used across all tables.
- `patient_id` (MeraDoc UUID) links `meradoc_patients` → `family_members` and `prescriptions`.
- `appointment_mongo_id` links `appointment_status_updates` and `prescriptions` to MeraDoc appointment records.

---

## 10. Notes on Schema Management

- **No migration framework** is used. Tables are created with `CREATE TABLE IF NOT EXISTS` in the API and webhook route files themselves (self-bootstrapping).
- **Optional columns** (`dob`, `blood_group`, `gender` on `users`) are added with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on the first PATCH request — they will be absent until then.
- **NeonDB** auto-scales to zero when idle, so the first request after idle may have a ~1s cold-start delay.
- All timestamps are stored as `TIMESTAMPTZ` (timezone-aware) in UTC.
- `JSONB` columns (`raw_data`, `location`) store full API response payloads for auditability and future feature expansion without requiring schema migrations.
