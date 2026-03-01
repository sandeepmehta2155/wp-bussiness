-- SmartOrder Database Schema
-- Migration: Create tables for WhatsApp Flows-based ordering system

-- Create OrderStatus enum type
CREATE TYPE order_status AS ENUM (
  'PENDING',        -- Customer initiated, waiting for digitization
  'DIGITIZED',      -- AI parsed, waiting for customer review
  'REVIEWING',      -- Customer reviewing edited order
  'PRICING',        -- Seller providing pricing
  'CONFIRMED',      -- Customer confirmed, seller packing
  'PACKING',        -- Seller is packing
  'PACKED',         -- Order packed, waiting for pickup
  'COMPLETED',      -- Order completed
  'CANCELLED'       -- Order cancelled
);

-- Create MessageType enum type
CREATE TYPE message_type AS ENUM (
  'TEXT',
  'FLOW',
  'INTERACTIVE',
  'TEMPLATE'
);

-- Create FlowType enum type
CREATE TYPE flow_type AS ENUM (
  'SUBMIT_ORDER',   -- Step 1: Customer submits order
  'REVIEW_ORDER',   -- Step 2: Customer reviews edited order
  'SELLER_PRICING', -- Step 3: Seller provides pricing
  'CUSTOMER_CONFIRM', -- Step 4: Customer confirms order
  'PACKED_NOTIF'    -- Step 5: Packed notification
);

-- Create SessionStatus enum type
CREATE TYPE session_status AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED'
);

-- SmartOrder: Main order record
CREATE TABLE smart_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone  VARCHAR NOT NULL,
  seller_phone    VARCHAR,
  status          order_status NOT NULL DEFAULT 'PENDING',
  items           JSONB NOT NULL DEFAULT '{}',
  original_text   TEXT,
  estimated_total FLOAT,
  final_total     FLOAT,
  seller_items    JSONB,
  flow_session_id VARCHAR,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  confirmed_at    TIMESTAMP WITH TIME ZONE,
  packed_at       TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE
);

-- SmartOrderMessage: Track all WhatsApp messages for an order
CREATE TABLE smart_order_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_order_id  UUID NOT NULL REFERENCES smart_orders(id) ON DELETE CASCADE,
  from_phone      VARCHAR NOT NULL,
  to_phone        VARCHAR NOT NULL,
  message_text    TEXT,
  flow_data       JSONB,
  message_type    message_type NOT NULL DEFAULT 'TEXT',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- FlowSession: Track active WhatsApp Flow sessions
CREATE TABLE flow_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      VARCHAR NOT NULL UNIQUE,
  smart_order_id  UUID NOT NULL REFERENCES smart_orders(id) ON DELETE CASCADE,
  flow_type       flow_type NOT NULL,
  status          session_status NOT NULL DEFAULT 'ACTIVE',
  data            JSONB,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMP WITH TIME ZONE
);

-- Indexes for common queries
CREATE INDEX idx_smart_orders_customer_phone ON smart_orders(customer_phone);
CREATE INDEX idx_smart_orders_seller_phone ON smart_orders(seller_phone);
CREATE INDEX idx_smart_orders_status ON smart_orders(status);
CREATE INDEX idx_smart_orders_created_at ON smart_orders(created_at);
CREATE INDEX idx_smart_order_messages_order_id ON smart_order_messages(smart_order_id);
CREATE INDEX idx_flow_sessions_session_id ON flow_sessions(session_id);
CREATE INDEX idx_flow_sessions_smart_order_id ON flow_sessions(smart_order_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_smart_orders_updated_at
  BEFORE UPDATE ON smart_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable row level security (optional, for multi-tenant setups)
-- ALTER TABLE smart_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE smart_order_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE flow_sessions ENABLE ROW LEVEL SECURITY;
