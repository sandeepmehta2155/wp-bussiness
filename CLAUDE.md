# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp Business API server with a **SmartOrder** system — a custom ordering workflow where customers submit orders via WhatsApp, sellers price them, and customers confirm. Built on Node.js/Express 5 with PostgreSQL.

## Commands

```bash
npm run dev                        # Start server (port 3000)
npm run debug                      # Start with --inspect debugger
npm run smartorder:migrate         # Run SmartOrder SQL migration (requires psql CLI)
npm run smartorder:register-flows  # Register WhatsApp Flows with Meta API
npm run studio                     # Open Prisma Studio
```

No test runner or linter is configured.

## Architecture

### Module System & Entry Point

CommonJS (`require`/`module.exports`). Entry point is `app.js` which initializes Express, middleware, PgBoss background jobs, and starts the server.

### Two Database Systems

1. **Prisma** — ORM for general data (config in `schema/`). Scripts: `npm run generate`, `npm run migrate`, `npm run build`.
2. **pg (direct)** — Used by SmartOrder service (`service/smart-order.service.js`) and PgBoss. Connects via `DATABASE_PG_BOSS_URL` env var to the `pgboss_wp` database. Migration SQL lives in `migrations/`.

### Route Mounting

Routes are mounted in `routes/v1/index.js`:

- `/` → `wp.route.js` — WhatsApp webhook verification, message handling, RAG/embedding endpoints
- `/api` → `smart-order.route.js` — SmartOrder CRUD and Flow session endpoints

### Request Flow

`wp.route.js` handles incoming WhatsApp messages directly in its route handlers (not via a controller). SmartOrder routes delegate to `controller/smart-order.controller.js` and `controller/flow-session.controller.js`, which call `service/smart-order.service.js`.

### Background Jobs (PgBoss)

- `pg-boss.js` — Singleton; call `initializePgBoss()` before `getPgBoss()`
- `service/job-registeration.service.js` — Registers scheduled jobs on startup
- `service/smart-order-jobs.js` — SmartOrder-specific jobs (process pending, send notifications, timeout cleanup)
- `service/dynamic-worker.js` — Dynamic worker registration

### SmartOrder State Machine

Orders progress through: `PENDING → DIGITIZED → REVIEWING → PRICING → CONFIRMED → PACKING → PACKED → COMPLETED` (or `CANCELLED`). Each WhatsApp Flow type maps to a status transition (defined in `controller/flow-session.controller.js`).

### WhatsApp Integration

- Uses WhatsApp Business API v22.0 and Flows API v3.0
- `wp.route.js` exports `sendMessage()` and `sendFlowMessage()` — used by other modules to send WhatsApp messages
- Flow JSON definitions live in `flows/` directory
- Flow metadata config in `config/flows.js` (maps flow types to IDs, file paths, webhook URLs)

### Error Handling Pattern

Async route handlers are wrapped with `middleware/catch-async.js`. Errors flow through `middleware/error-converter.js` (normalizes to `ApiError`) then `middleware/error-handler.js`.

### Environment Config

`config/config.js` validates env vars with Joi on startup. Key required vars: `NODE_ENV`, `JWT_SECRET`, `DATABASE_PG_BOSS_URL`. WhatsApp vars (`WP_TOKEN`, `WP_PHONE_NUMBER_ID`, `FLOW_*_ID`) are read directly from `process.env` in route/service files.