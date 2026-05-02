# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
```

No test runner is configured.

## Architecture

**Desilink** is a Next.js 16 App Router application for NRIs to manage healthcare services back home. It connects users with doctors via the MeraDoc API (`https://apidev.meradoc.com`).

### Layer Structure

```
services/       → Raw API calls (axios)
hooks/useApi.js → React Query wrappers around services
app/            → Next.js pages consuming hooks
lib/api.js      → Axios instance with token injection & auto-refresh
```

### API & Auth

- Axios instance in [lib/api.js](lib/api.js) sets `Authorization: Bearer <token>` from `localStorage`
- On 401, it queues pending requests, refreshes the token, then retries the queue
- Env var `NEXT_PUBLIC_API_BASE_URL` overrides the default base URL
- Static API credentials: `x-api-id: "PEMD-01"` and `x-api-token` are hardcoded in `lib/api.js`
- `useGenerateToken()` in `hooks/useApi.js` fetches an initial access token; called on the doctors listing page load

### State Management

React Query (TanStack Query v5) is the only state management. The `QueryClient` is configured in [app/providers.js](app/providers.js) with `staleTime: 60s` and `retry: 1`. All data fetching goes through hooks in [hooks/useApi.js](hooks/useApi.js).

### Routing

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login` → `/login/success` | 7-step onboarding wizard |
| `/dashboard` | Authenticated home with service cards |
| `/doctors` | Doctor list with client-side search/filter |
| `/doctors/[doctorId]` | Doctor detail |
| `/consultancy` | Service hub |
| `/consultancy/concerns` | Pre-booking concern selection |
| `/consultancy/book-consultation` | Appointment booking |

### Styling

- No CSS framework — all custom CSS with CSS variables defined in [app/globals.css](app/globals.css)
- Each route folder has a co-located `.css` file (e.g. `login/login.css`, `dashboard/dashboard.css`)
- Design tokens: Navy `#1a1f36`, Blue `#1a4fd4`, Green `#0f9b4f`, Lime `#c8e64a`
- Path alias `@/*` maps to the project root (see [jsconfig.json](jsconfig.json))

### Key Patterns

- **Client-side filtering**: Doctors list is fetched once (up to 50 records) and filtered in React state — no search API calls
- **Idempotency**: Appointment creation uses a `crypto`-generated UUID to prevent duplicate bookings
- **Token storage**: `accessToken` and `originToken` stored in `localStorage`; no cookie-based sessions
- **JS-first**: Files use `.js` extension; TypeScript support exists (`strict: false`) but is not enforced
