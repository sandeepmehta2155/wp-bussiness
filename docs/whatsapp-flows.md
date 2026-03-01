# WhatsApp Flows - SmartOrder System

## Architecture Overview

The SmartOrder system enables customers to submit orders through interactive WhatsApp Flows. Sellers review orders, provide pricing, and customers confirm — all within WhatsApp.

```
Customer                    WhatsApp API              Server
   |                             |                       |
   |-- sends text order -------->|                       |
   |                             |-- webhook POST ------>|
   |                             |                  create smart_order (PENDING)
   |<-- SUBMIT_ORDER flow -------|<-- send flow ---------|
   |-- submits flow form ------->|                       |
   |                             |-- webhook POST ------>|
   |                             |                  update status → DIGITIZED
   |                             |                  send REVIEW_ORDER flow
   |-- confirms items ---------->|                       |
   |                             |-- webhook POST ------>|
   |                             |                  update status → REVIEWING
   |                             |                  send SELLER_PRICING flow (to seller)
   |                    Seller<--|<-- send flow ---------|
   |                    fills pricing                    |
   |                    Seller-->|-- webhook POST ------>|
   |                             |                  update status → PRICING
   |<-- CUSTOMER_CONFIRM flow ---|<-- send flow ---------|
   |-- confirms final order ---->|                       |
   |                             |-- webhook POST ------>|
   |                             |                  update status → CONFIRMED
   |                             |                  ...packing...
   |<-- PACKED_NOTIF flow -------|<-- send flow ---------|
```

## Flow Types

| Flow | Trigger | Moves Order To |
|------|---------|----------------|
| `SUBMIT_ORDER` | Customer sends text message | `DIGITIZED` |
| `REVIEW_ORDER` | After digitization | `REVIEWING` |
| `SELLER_PRICING` | Seller reviews order | `PRICING` |
| `CUSTOMER_CONFIRM` | Customer sees final prices | `CONFIRMED` |
| `PACKED_NOTIF` | Seller marks packed | `PACKED` |

## Order Status Lifecycle

```
PENDING → DIGITIZED → REVIEWING → PRICING → CONFIRMED → PACKING → PACKED → COMPLETED
                                                                         ↘ CANCELLED
```

## Database Schema

### `smart_orders`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `customer_phone` | VARCHAR | Customer WhatsApp number |
| `seller_phone` | VARCHAR | Assigned seller |
| `status` | order_status | Current lifecycle status |
| `items` | JSONB | Customer's original items |
| `seller_items` | JSONB | Seller-confirmed items with prices |
| `original_text` | TEXT | Raw order text |
| `estimated_total` | DECIMAL | Seller's estimated total |
| `final_total` | DECIMAL | Confirmed final total |
| `confirmed_at`, `packed_at`, `completed_at` | TIMESTAMP | Status timestamps |

### `smart_order_messages`
Logs all messages (text and flow) sent/received for each order.

### `flow_sessions`
Tracks active WhatsApp flow sessions associated with orders.

## API Reference

### Smart Orders

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/smart-orders` | Create a new order |
| `GET` | `/api/smart-orders/:id` | Get order by ID |
| `GET` | `/api/smart-orders/customer/:phone` | Get active orders by customer |
| `GET` | `/api/smart-orders/status/:status` | Get orders by status |
| `PUT` | `/api/smart-orders/:id/status` | Update order status |
| `POST` | `/api/smart-orders/:id/submit-pricing` | Seller submits pricing |
| `POST` | `/api/smart-orders/:id/confirm` | Customer confirms order |
| `POST` | `/api/smart-orders/:id/pack` | Mark as packed |
| `POST` | `/api/smart-orders/:id/complete` | Mark as completed |
| `POST` | `/api/smart-orders/:id/cancel` | Cancel order |

### Flow Sessions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/flows/start/:type` | Start a flow session for an order |
| `POST` | `/api/flows/submit` | Handle WhatsApp flow submission webhook |
| `GET` | `/api/flows/:sessionId` | Get flow session status |
| `POST` | `/api/flows/send/:orderId` | Send a flow message to WhatsApp |

### Example: Create Order

```bash
curl -X POST http://localhost:3000/api/smart-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "+919876543210",
    "originalText": "1kg sugar\n2 packets rice\n500g spices"
  }'
```

### Example: Send Flow to Customer

```bash
curl -X POST http://localhost:3000/api/flows/send/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "flowId": "your_flow_id",
    "to": "+919876543210"
  }'
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```env
# Database
DATABASE_PG_BOSS_URL=postgresql://user:pass@localhost:5432/dbname

# WhatsApp API
WP_TOKEN=your_whatsapp_token
WP_PHONE_NUMBER_ID=your_phone_number_id

# Flow IDs (filled in after registration)
FLOW_SUBMIT_ORDER_ID=
FLOW_REVIEW_ORDER_ID=
FLOW_SELLER_PRICING_ID=
FLOW_CUSTOMER_CONFIRM_ID=
FLOW_PACKED_NOTIF_ID=

# Webhook URL (your ngrok or production URL)
FLOW_WEBHOOK_URL=https://your-domain.com/api
```

### 2. Run Database Migration

```bash
npm run smartorder:migrate
```

Verifies tables exist:
```bash
psql $DATABASE_PG_BOSS_URL -c "\dt"
```

### 3. Register Flows with Meta

```bash
npm run smartorder:register-flows
```

Or list existing flows:
```bash
node scripts/register-flows.js list
```

Copy the output flow IDs into your `.env` file.

### 4. Start the Server

```bash
npm run dev
```

## Background Jobs

Registered via PgBoss:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `smart-order:process-pending` | Every 5 min | Process new pending orders |
| `smart-order:send-notifications` | Every 10 min | Send status notifications |
| `smart-order:timeout-cleanup` | Every 30 min | Flag stuck orders for review |

## Troubleshooting

**Webhook not receiving flow submissions**
- Ensure `FLOW_WEBHOOK_URL` points to your public URL (use ngrok for local dev)
- Check that the `/api/flows/submit` endpoint is accessible
- Verify flow webhook URL is set when registering flows with Meta

**Flow messages not sending**
- Check `WP_TOKEN` and `WP_PHONE_NUMBER_ID` are set
- Verify flow IDs in `.env` match registered flows in Meta dashboard
- Check server logs for axios errors

**Database connection errors**
- Verify `DATABASE_PG_BOSS_URL` is correct
- Ensure PostgreSQL is running and accessible
- Run `npm run smartorder:migrate` if tables are missing

**Orders stuck in PENDING**
- The background job `smart-order:process-pending` runs every 5 minutes
- Check PgBoss is initialized in your app startup
- Manually trigger via: `POST /api/flows/start/SUBMIT_ORDER` with the order ID
