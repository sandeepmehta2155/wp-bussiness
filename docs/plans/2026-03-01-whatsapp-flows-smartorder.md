# WhatsApp Flows SmartOrder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete WhatsApp Flows-based ordering system where customers submit orders through interactive WhatsApp flows, sellers provide pricing, and orders are tracked end-to-end.

**Architecture:**
- 5 WhatsApp Flows (submit, review, pricing, confirm, packed)
- PostgreSQL database with smart_orders, smart_order_messages, and flow_sessions tables
- Express API endpoints for flow session management
- Integration with existing WhatsApp Business API

**Tech Stack:**
- Node.js/Express
- PostgreSQL with pg-boss
- WhatsApp Business API v22.0
- WhatsApp Flows API v3.0

---

## Task 1: Run Database Migration

**Files:**
- Migration: `migrations/CREATE_SMART_ORDER_TABLES.sql` (already created)

**Step 1: Execute the migration**

```bash
psql $DATABASE_PG_BOSS_URL -f migrations/CREATE_SMART_ORDER_TABLES.sql
```

Expected: All tables, types, indexes, and triggers created successfully.

**Step 2: Verify tables exist**

```sql
psql $DATABASE_PG_BOSS_URL -c "\dt"
```

Expected: `smart_orders`, `smart_order_messages`, `flow_sessions` tables listed.

---

## Task 2: Create SmartOrder Service

**Files:**
- Create: `service/smart-order.service.js`

**Step 1: Write the service module**

Create a service module with functions:
- `createSmartOrder(customerPhone, items, originalText)`
- `getSmartOrderById(id)`
- `updateSmartOrderStatus(id, status, data)`
- `getOrdersByStatus(status)`
- `createFlowSession(sessionId, smartOrderId, flowType, data)`
- `getFlowSessionByOrderId(orderId)`
- `logMessage(smartOrderId, from, to, messageText, flowData)`

**Step 2: Test the service**

```javascript
// Test script
const { createSmartOrder, getSmartOrderById } = require('./service/smart-order.service.js');
// Add test assertions
```

**Step 3: Commit**

```bash
git add service/smart-order.service.js
git commit -m "feat: add smart order service"
```

---

## Task 3: Create SmartOrder Controller

**Files:**
- Create: `controller/smart-order.controller.js`

**Step 1: Write the controller**

Endpoints:
- `POST /api/smart-orders` - Create new order
- `GET /api/smart-orders/:id` - Get order by ID
- `PUT /api/smart-orders/:id/status` - Update order status
- `GET /api/smart-orders/status/:status` - Get orders by status
- `POST /api/smart-orders/:id/flow-session` - Create flow session

**Step 2: Test endpoints with curl**

```bash
curl -X POST http://localhost:3000/api/smart-orders \
  -H "Content-Type: application/json" \
  -d '{"customerPhone": "1234567890", "items": [], "originalText": "1kg sugar"}'
```

**Step 3: Commit**

```bash
git add controller/smart-order.controller.js routes/v1/smart-order.route.js
git commit -m "feat: add smart order controller and routes"
```

---

## Task 4: Create Flow Session Controller

**Files:**
- Create: `controller/flow-session.controller.js`

**Step 1: Write the controller**

Endpoints:
- `POST /api/flows/start/:type` - Start a new flow session
- `POST /api/flows/submit` - Handle flow submission webhook
- `GET /api/flows/:sessionId` - Get flow session status
- `POST /api/flows/send/:orderId` - Send flow to WhatsApp

**Step 2: Commit**

```bash
git add controller/flow-session.controller.js routes/v1/flow-session.route.js
git commit -m "feat: add flow session controller"
```

---

## Task 5: Update WhatsApp Webhook Handler

**Files:**
- Modify: `routes/v1/wp.route.js`

**Step 1: Add flow submission handler**

Handle WhatsApp webhook messages:
- Detect flow submission messages
- Extract form data
- Process based on flow type (SUBMIT_ORDER, REVIEW_ORDER, etc.)

**Step 2: Add flow message sender**

Update `sendMessage` function to support:
- Flow messages with `type: "flow"`
- Interactive messages with `type: "interactive"`

**Step 3: Commit**

```bash
git add routes/v1/wp.route.js
git commit -m "feat: update webhook handler for flow messages"
```

---

## Task 6: Create Flow Metadata Configuration

**Files:**
- Create: `config/flows.js`

**Step 1: Add flow configurations**

Each flow needs:
- Flow JSON file path
- Callback URL for submissions
- Status mapping on submit

**Step 2: Commit**

```bash
git add config/flows.js
git commit -m "feat: add flow configuration"
```

---

## Task 7: Update Package.json Scripts

**Files:**
- Modify: `package.json`

**Step 1: Add migration and seed scripts**

```json
"scripts": {
  "smartorder:migrate": "node scripts/run-smartorder-migration.js",
  "smartorder:seed": "node scripts/seed-smartorder.js"
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add smartorder scripts"
```

---

## Task 8: Integrate with PgBoss for Background Processing

**Files:**
- Create: `service/smart-order-jobs.js`

**Step 1: Create background jobs**

- Job to process pending orders
- Job to send status notifications
- Job to handle timeout cleanup

**Step 2: Register jobs**

Update `service/job-registeration.service.js` to register smartorder jobs.

**Step 3: Commit**

```bash
git add service/smart-order-jobs.js service/job-registeration.service.js
git commit -m "feat: integrate with pgboss for background jobs"
```

---

## Task 9: Add WhatsApp Flow Registration Script

**Files:**
- Create: `scripts/register-flows.js`

**Step 1: Register flows with Meta**

Use WhatsApp Business API to register each flow:
```
POST /{phone-number-id}/flows
```

**Step 2: Store flow IDs**

Save registered flow IDs to config or database.

**Step 3: Commit**

```bash
git add scripts/register-flows.js
git commit -m "feat: add flow registration script"
```

---

## Task 10: Add Tests

**Files:**
- Create: `tests/smart-order.test.js`
- Create: `tests/flow-session.test.js`

**Step 1: Write tests**

Test each service function and controller endpoint.

**Step 2: Run tests**

```bash
npm test
```

**Step 3: Commit**

```bash
git add tests/smart-order.test.js tests/flow-session.test.js
git commit -m "test: add smartorder and flow session tests"
```

---

## Task 11: Documentation

**Files:**
- Create: `docs/whatsapp-flows.md`

**Step 1: Write documentation**

Include:
- Architecture overview
- Flow types and their purposes
- API reference
- Setup instructions
- Troubleshooting guide

**Step 2: Commit**

```bash
git add docs/whatsapp-flows.md
git commit -m "docs: add whatsapp flows documentation"
```

---

## Task 12: Final Code Review

**Files:**
- All implementation files

**Step 1: Run linter**

```bash
npm run lint
```

**Step 2: Fix issues**

**Step 3: Final commit**

```bash
git add .
git commit -m "refactor: fix linting issues"
```

---

## Verification Checklist

- [ ] Database migration runs successfully
- [ ] All tables exist and have correct schema
- [ ] All API endpoints respond correctly
- [ ] WhatsApp webhook processes messages
- [ ] Flow messages can be sent
- [ ] Background jobs are registered
- [ ] All tests pass
- [ ] Documentation is complete

## Deployment Steps

1. Run database migration
2. Register flows with Meta
3. Start the server
4. Test with a WhatsApp number
