# UI/UX Polish & Animation Layer — Design

**Date:** 2026-07-07
**Status:** Approved
**Scope:** Entire app (all routes). Visual/animation only — zero functional change.

## Goal

Modernize the interface and add tasteful motion while preserving the current
design language, palette, typography, branding, and every piece of existing
behavior. No changes to business logic, API calls, routing, state management,
application flow, or features.

## Hard Constraints

- Design tokens stay byte-identical: navy `#1a1f36`, blue `#1a4fd4`, green
  `#0f9b4f`, lime `#c8e64a`, `--gradient-hero`, `--gradient-cta`, Inter font.
- JSX edits limited to: adding classNames, wrapping existing markup in motion
  wrapper components, and swapping plain loading text for skeleton markup
  rendered under the **same** conditions. No changes to handlers, hooks,
  effects, API calls, or conditional logic.
- No new toast system (none exists); existing inline success/error messages
  get motion styling in place.
- All motion respects `prefers-reduced-motion` (CSS kill switch + framer's
  `useReducedMotion`).
- Animations subtle and professional; 60fps (transform/opacity only, no
  layout-thrashing properties).

## Approach (chosen)

CSS-first polish in the existing co-located CSS files, plus a small Framer
Motion wrapper layer. Rejected alternatives: full motion.* conversion (too
much JSX churn, regression risk) and pure-CSS-only (no page transitions or
proper stagger/exit animations).

## 1. Foundation — `app/globals.css`

Extend `:root` (add, never change existing tokens):

- Shadow scale: `--shadow-sm`, `--shadow-md`, `--shadow-lg` (soft, low-alpha
  navy-tinted shadows).
- Easing: `--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)`,
  `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`; durations
  `--dur-fast: 150ms`, `--dur-med: 250ms`.
- Focus ring: `--focus-ring: 0 0 0 3px rgba(26, 79, 212, 0.25)`.
- Radius scale documenting existing values: `--radius-sm: 12px`,
  `--radius-md: 16px`, `--radius-lg: 20px`.

Global additions:

- `:focus-visible` outline/ring using `--focus-ring`.
- Styled thin scrollbar (navy-tinted thumb).
- `::selection` in lime.
- Shimmer skeleton utility classes (`.skeleton`, `.skeleton-text`, etc.) with
  keyframe animation.
- Reduced-motion kill switch:
  `@media (prefers-reduced-motion: reduce) { *, *::before, *::after {
  animation-duration: 0.01ms !important; animation-iteration-count: 1
  !important; transition-duration: 0.01ms !important; scroll-behavior: auto
  !important; } }`

## 2. Motion layer — new `components/motion/` folder

Dependency: `framer-motion` (latest). Use `LazyMotion` + `m.*` components with
lazy-loaded `domAnimation` features to keep the bundle ~5kb.

| Component | Purpose | Behavior |
|---|---|---|
| `MotionProvider` | Mounts `LazyMotion` once | Wrapped inside `app/providers.js` around children |
| `PageTransition` | Route-change transition | Used by new `app/template.js`; 200ms fade + 4px rise on mount |
| `Reveal` | Scroll fade-in | `whileInView`, fires once, fade + 12px rise |
| `Stagger` / `StaggerItem` | Card grid / list entrances | Parent orchestrates 40–60ms stagger of fade+rise children |
| `AnimatedNumber` | Count-up for totals/prices | Animates displayed value; renders plain value under reduced motion |

All components: plain-JS `.js` files, respect `useReducedMotion` (render
static equivalents), pure presentational wrappers accepting `children` +
optional `className`/`delay` props.

`app/template.js` is new; App Router remounts templates per navigation, which
is safe here because state lives in localStorage and the React Query cache.

## 3. Per-page polish passes

Order: landing (`globals.css`) → login wizard (`login/`, `verify/`,
`services/`, `notifications/`, `about/`, `success/`) → dashboard → doctors +
`[doctorId]` → meradoc-register → consultancy area (layout/nav,
hub, book-consultation, doctors/book, appointment/[id], lab-tests +
address, medicines + prescription, cart, profile).

Shared vocabulary applied in each pass (in that page's own CSS file):

- Cards: consistent radius from scale, `--shadow-sm` at rest, hover lift
  (`translateY(-2..4px)` + `--shadow-md`), border-color shift.
- Buttons: hover lift + shadow already common — normalize; add active/press
  state (`transform: scale(0.98)`), consistent focus ring.
- Inputs/selects/textareas: consistent padding, border, focus ring token.
- Modals (where they already exist, e.g. lab-tests/cart/profile): backdrop
  fade + panel scale/rise transition via CSS classes.
- Loading states: replace plain "Loading…" text/spinners with shimmer
  skeletons shaped like the content, rendered under identical conditions.
- Empty states: better typography/spacing; no copy changes.
- Inline success/error banners: slide-in + fade CSS animation.
- Glassmorphism: only where theme already uses it (navbar, hero cards);
  may extend to sticky nav/cart-bar surfaces that are already translucent.
- Responsive: fix genuinely broken/cramped layouts at ≤768px; no layout
  redesigns.
- Remove redundant/dead CSS rules encountered during each pass.
- Motion wrappers: `Reveal` on page sections, `Stagger` on card grids/lists,
  `AnimatedNumber` on cart/fee totals.

## 4. Verification & commit strategy

- `npm run build` must pass after every area pass.
- Dev-server click-through of main flows after completion: login wizard,
  doctor browse/book, lab-test search→cart→address, medicine search→cart,
  profile. Behavior must be identical.
- Commits: foundation + motion layer first, then one commit per area, each
  independently revertable.

## Out of scope

- New features, new toast system, copy changes, dark mode, TypeScript
  conversion, refactoring page logic, changing any API/route behavior.
