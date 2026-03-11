# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `laveina-platform/`.

```bash
# Development
npm run dev                # Next.js dev server (Turbopack)
npm run build              # Production build
npm run start              # Start production server

# Code quality
npm run lint               # ESLint
npm run lint:fix           # ESLint with auto-fix
npm run format             # Prettier format
npm run format:check       # Check formatting
npm run type-check         # TypeScript type checking

# Testing
npm run test               # Vitest watch mode
npm run test:run           # Vitest single run
npm run test:e2e           # Playwright E2E tests

# Database
npm run db:gen-types       # Regenerate Supabase TypeScript types
npm run db:migrate         # Push migrations to Supabase
npm run db:reset           # Reset database
```

## Architecture

**Stack**: Next.js 15 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres + Storage) · Stripe · next-intl

**Lavenia** is a logistics platform for parcel shipments between pickup points. Three user roles: `admin`, `pickup_point`, `customer`.

### Routing

Routes live under `src/app/[locale]/` with two route groups:
- `(public)/` — unauthenticated: `auth/`, `book/`, `pricing/`, `tracking/`, `pickup-points/`
- `(dashboard)/` — authenticated, role-gated: `admin/`, `customer/`, `pickup-point/`

API routes are at `src/app/api/` (outside locale routing): `shipments/`, `scan/`, `otp/`, `pickup-points/`, `webhooks/stripe/`

### Supabase 3-Client Pattern

- **Browser client** (`src/lib/supabase/client.ts`) — anon key, respects RLS
- **Server client** (`src/lib/supabase/server.ts`) — anon key + cookies, for server components/actions
- **Admin client** (`src/lib/supabase/admin.ts`) — service_role key, bypasses RLS, server-only

### Service Layer

`src/services/` contains business logic between API routes and the database. Each service validates with Zod schemas from `src/validations/` and returns `ApiResponse<T>`. Many service functions are currently stubbed with TODO comments.

### Middleware

`src/middleware.ts` handles session refresh, locale prefix routing (next-intl), and role-based access control in a single pass. Public paths are allowlisted; dashboard paths require matching role.

### Internationalization

Three locales: `es` (default), `ca`, `en`. Translation files in `src/i18n/messages/`. Locale config in `src/i18n/routing.ts`. Use `next-intl` APIs (`useTranslations`, `getTranslations`) for all user-facing strings.

### Key Conventions

- Path alias: `@/*` maps to `src/*`
- UI components: shadcn/ui (New York style) in `src/components/ui/`, Radix primitives, Lucide icons
- State: Zustand for booking form (`src/hooks/use-booking-store.ts`), TanStack Query for server state
- Validation: Zod schemas in `src/validations/`
- Environment variables: validated via `@t3-oss/env-nextjs` in `src/env.ts`; set `SKIP_ENV_VALIDATION=1` to bypass
- Styling: Tailwind v4 with `@theme` CSS variables in `globals.css`; use `cn()` from `src/lib/utils.ts` for conditional classes
- Shipment status flow: `payment_confirmed → waiting_at_origin → received_at_origin → in_transit → arrived_at_destination → ready_for_pickup → delivered` (transitions defined in `src/constants/status-transitions.ts`)

### Database

Supabase Postgres with migrations in `supabase/migrations/`. Core tables: `profiles`, `postcodes`, `pickup_points`, `pricing_rules`, `shipments`, `scan_logs`, `otp_verifications`. RLS policies enforced. Generated types in `src/types/database.types.ts` — regenerate with `npm run db:gen-types` after schema changes.

### Formatting Rules

- Prettier: 100 char width, 2-space indent, double quotes, ES5 trailing commas, tailwindcss plugin
- ESLint: flat config (v9), extends next/core-web-vitals + next/typescript + prettier
