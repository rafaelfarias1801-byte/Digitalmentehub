# Digitalmente HUB - Agency Website

## Overview

This is a premium single-page marketing website for **Digitalmente HUB**, a Brazilian digital marketing agency based in Curitiba, PR. The site serves as a lead generation tool, showcasing the agency's services, content packs, and partner network. The agency positions itself as a marketing hub that centralizes strategy and coordinates execution through a network of specialized partners, with a strategic focus on the Food & Beverage (Alimentos & Bebidas) segment while remaining a multi-niche agency.

The site is built as a full-stack application with a React frontend and Express backend, using PostgreSQL for data persistence (lead capture form submissions).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight client-side router) — currently a single-page site with Home and 404 routes
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Animations**: Framer Motion for scroll-triggered animations and micro-interactions
- **Forms**: React Hook Form with Zod validation (shared schemas with backend)
- **Data Fetching**: TanStack React Query (configured but primarily used for the lead form POST)
- **Styling**: Tailwind CSS with custom brand colors defined as CSS variables and custom font families
- **Structure**: Component-based architecture where the Home page composes multiple section components (Navbar, Hero, About, Segments, Laboratory, Services, HowItWorks, Packs, Partners, FAQ, Contact, Footer, WhatsAppFloat)

### Brand Identity
- **Colors**: Navy (#152256) as primary background, orange (#e4552d) for CTAs/accents, purple (#671f75), pink (#c80180) for badges, blue (#7ba4da) for support
- **Fonts**: Two custom fonts loaded via @font-face — "Baou Display" (display/accent) and "Navycula" (body/headings)
- **Language**: All content is in Brazilian Portuguese (pt-BR)

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, compiled via tsx (dev) and esbuild (production)
- **API**: Single REST endpoint `POST /api/lead` for contact form submissions
- **Storage**: Currently uses in-memory storage (MemStorage class) with an interface (IStorage) ready for database implementation
- **Static Serving**: In production, serves the Vite-built frontend from `dist/public`; in development, uses Vite dev server middleware with HMR

### Data Storage
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Defined in `shared/schema.ts` with two tables:
  - `users` — id, username, password (basic auth scaffold, not yet wired up)
  - `leads` — id, name, phone, company, email, contactType, message
- **Validation**: Zod schemas auto-generated from Drizzle schemas via drizzle-zod, shared between client and server
- **Current State**: The app uses MemStorage by default. The Drizzle config expects a `DATABASE_URL` environment variable for PostgreSQL. When a Postgres database is provisioned, the storage layer should be switched from MemStorage to a DatabaseStorage implementation using Drizzle.
- **Migrations**: Use `npm run db:push` (drizzle-kit push) to sync schema to database

### Build System
- **Development**: `npm run dev` runs tsx to start the Express server with Vite middleware for HMR
- **Production Build**: `npm run build` runs a custom build script that: (1) builds the frontend with Vite, (2) bundles the server with esbuild, outputting to `dist/`
- **Production Start**: `npm start` runs the built server from `dist/index.cjs`

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets` → `./attached_assets/`

## External Dependencies

### Database
- **PostgreSQL** — Required for persistent storage. Connection via `DATABASE_URL` environment variable. Currently the app falls back to in-memory storage but is fully configured for Postgres via Drizzle ORM.

### Key NPM Packages
- **express** (v5) — HTTP server
- **drizzle-orm** + **drizzle-kit** — ORM and migration tooling for PostgreSQL
- **drizzle-zod** — Auto-generates Zod validation schemas from Drizzle table definitions
- **@tanstack/react-query** — Server state management on the client
- **react-hook-form** + **@hookform/resolvers** — Form handling with Zod integration
- **framer-motion** — Animation library
- **wouter** — Lightweight client-side routing
- **react-icons** — Social media icons (WhatsApp, Instagram)
- **lucide-react** — Icon library
- **shadcn/ui** (via Radix UI primitives) — Full component library including accordion, dialog, form, toast, tabs, select, etc.
- **connect-pg-simple** — PostgreSQL session store (available but not yet implemented)

### External Services
- **WhatsApp Business** — Floating button and CTA links point to `wa.me/5541987907321`
- **Instagram** — Links to `instagram.com/digital.mentte`
- **Email** — Contact via `digitalmente.oficial.mkt@gmail.com`

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` — Error overlay in development
- `@replit/vite-plugin-cartographer` — Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner` — Dev banner (dev only)