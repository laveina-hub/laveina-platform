# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a monorepo with the actual Next.js application in `laveina-platform/`. All development commands must be run from that subdirectory.

- `laveina-platform/` — Next.js 15 application (the codebase)
- `ReadME/` — Project documentation (see below)
- `Image Assets/`, `Style Guide.png` — Figma exports and visual references

## Documentation Index (`ReadME/`)

| Document                 | Purpose                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `ARCHITECTURE.md`        | Technical architecture: layers, data flow, Supabase pattern, middleware, services, API routes |
| `COMPONENT_GUIDE.md`     | UI component inventory with Atomic Design (atoms, molecules, icons, layout, sections)         |
| `DEVELOPER_GUIDE.md`     | Onboarding, coding conventions, templates for new components/services/pages                   |
| `PROJECT_DESCRIPTION.md` | Business specification: features, pricing, shipment workflow, dashboards                      |
| `TODO.md`                | Development task tracking with completion status                                              |
| `MISSING_PAGES.md`       | Pages needing implementation, design status, build priority                                   |
| `CLIENT_REQUIREMENTS.md` | Pending client data, credentials, and business decisions                                      |
| `CHAT_HISTORY.md`        | Client conversation transcript and key decisions log                                          |
| `CLAUDE_PROMPT_V2.md`    | Original build prompt (pre-development reference)                                             |

## Quick Reference

**Stack**: Next.js 15 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres + Storage) · Stripe · next-intl · Zustand · TanStack Query · Zod

**Three user roles**: `admin`, `pickup_point`, `customer`

**Component system**: Atomic Design — atoms (`src/components/atoms/`), molecules (`src/components/molecules/`), icons, layout, sections

**Key patterns**:

- Supabase 3-client pattern: browser (RLS), server (cookies), admin (service_role)
- Service layer: `src/services/` → validates with Zod → returns `ApiResponse<T>`
- Status state machine: `src/constants/status-transitions.ts`
- i18n: `es` (default), `ca`, `en` — use `useTranslations()` / `getTranslations()`

For full details, read `ReadME/ARCHITECTURE.md` and `ReadME/DEVELOPER_GUIDE.md`.
