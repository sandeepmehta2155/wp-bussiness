const { Pool } = require("pg");
const CONSTANT = require("../utils/constants.js");

// Pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_PG_BOSS_URL,
});

/**
 * Create a new SmartOrder
 */
const createSmartOrder = async (customerPhone, items, originalText, sellerPhone) => {
  const query = `
    INSERT INTO smart_orders (customer_phone, items, original_text, seller_phone, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [customerPhone, items || {}, originalText, sellerPhone, 'PENDING'];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get a SmartOrder by ID
 */
const getSmartOrderById = async (id) => {
  const query = `SELECT * FROM smart_orders WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * Get orders by status
 */
const getOrdersByStatus = async (status) => {
  const query = `SELECT * FROM smart_orders WHERE status = $1 ORDER BY created_at DESC`;
  const result = await pool.query(query, [status]);
  return result.rows;
};

/**
 * Get active orders for a customer
 */
const getActiveOrdersByCustomer = async (customerPhone) => {
  const query = `
    SELECT * FROM smart_orders
    WHERE customer_phone = $1
    AND status IN ('PENDING', 'DIGITIZED', 'REVIEWING', 'PRICING', 'CONFIRMED', 'PACKING')
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [customerPhone]);
  return result.rows;
};

/**
 * Update order status and optional data
 */
const updateSmartOrderStatus = async (id, status, data = {}) => {
  const query = `
    UPDATE smart_orders
    SET status = $1, updated_at = NOW(),
        items = COALESCE(items, '{}') || $2::jsonb,
        estimated_total = CASE WHEN $3 IS NOT NULL THEN $3 ELSE estimated_total END,
        final_total = CASE WHEN $4 IS NOT NULL THEN $4 ELSE final_total END,
        seller_items = CASE WHEN $5 IS NOT NULL THEN $5 ELSE seller_items END,
        confirmed_at = CASE WHEN $1 = 'CONFIRMED' THEN NOW() ELSE confirmed_at END,
        packed_at = CASE WHEN $1 = 'PACKED' THEN NOW() ELSE packed_at END,
        completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
    WHERE id = $6
    RETURNING *
  `;
  const values = [status, data.items || {}, data.estimatedTotal, data.finalTotal, data.sellerItems, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Submit seller pricing for an order
 */
const submitSellerPricing = async (orderId, sellerItems, estimatedTotal) => {
  const query = `
    UPDATE smart_orders
    SET status = 'PRICING',
        seller_items = $1,
        estimated_total = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [sellerItems, estimatedTotal, orderId]);
  return result.rows[0];
};

/**
 * Confirm order (customer final confirmation)
 */
const confirmOrder = async (orderId, finalTotal) => {
  const query = `
    UPDATE smart_orders
    SET status = 'CONFIRMED',
        final_total = $1,
        confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [finalTotal, orderId]);
  return result.rows[0];
};

/**
 * Mark order as packed
 */
const markOrderPacked = async (orderId) => {
  const query = `
    UPDATE smart_orders
    SET status = 'PACKED',
        packed_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [orderId]);
  return result.rows[0];
};

/**
 * Mark order as completed
 */
const markOrderCompleted = async (orderId) => {
  const query = `
    UPDATE smart_orders
    SET status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [orderId]);
  return result.rows[0];
};

/**
 * Cancel order
 */
const cancelOrder = async (orderId) => {
  const query = `
    UPDATE smart_orders
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [orderId]);
  return result.rows[0];
};

/**
 * Create a flow session
 */
const createFlowSession = async (sessionId, smartOrderId, flowType, data = {}) => {
  const query = `
    INSERT INTO flow_sessions (session_id, smart_order_id, flow_type, status, data)
    VALUES ($1, $2, $3, 'ACTIVE', $4)
    RETURNING *
  `;
  const result = await pool.query(query, [sessionId, smartOrderId, flowType, data]);
  return result.rows[0];
};

/**
 * Get flow session by session ID
 */
const getFlowSessionBySessionId = async (sessionId) => {
  const query = `SELECT * FROM flow_sessions WHERE session_id = $1`;
  const result = await pool.query(query, [sessionId]);
  return result.rows[0];
};

/**
 * Get flow session by order ID
 */
const getFlowSessionByOrderId = async (orderId) => {
  const query = `SELECT * FROM flow_sessions WHERE smart_order_id = $1 ORDER BY created_at DESC LIMIT 1`;
  const result = await pool.query(query, [orderId]);
  return result.rows[0];
};

/**
 * Complete a flow session
 */
const completeFlowSession = async (sessionId) => {
  const query = `
    UPDATE flow_sessions
    SET status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [sessionId]);
  return result.rows[0];
};

/**
 * Log a message for an order
 */
const logMessage = async (smartOrderId, from, to, messageText, flowData = null) => {
  const query = `
    INSERT INTO smart_order_messages (smart_order_id, from_phone, to_phone, message_text, flow_data, message_type)
    VALUES ($1, $2, $3, $4, $5, 'TEXT')
    RETURNING *
  `;
  const result = await pool.query(query, [smartOrderId, from, to, messageText, flowData]);
  return result.rows[0];
};

/**
 * Log a flow message
 */
const logFlowMessage = async (smartOrderId, from, to, flowData) => {
  const query = `
    INSERT INTO smart_order_messages (smart_order_id, from_phone, to_phone, flow_data, message_type)
    VALUES ($1, $2, $3, $4, 'FLOW')
    RETURNING *
  `;
  const result = await pool.query(query, [smartOrderId, from, to, flowData]);
  return result.rows[0];
};

/**
 * Get all messages for an order
 */
const getOrderMessages = async (smartOrderId) => {
  const query = `SELECT * FROM smart_order_messages WHERE smart_order_id = $1 ORDER BY created_at ASC`;
  const result = await pool.query(query, [smartOrderId]);
  return result.rows;
};

/**
 * Get orders needing attention (stuck in one state too long)
 */
const getOrdersNeedingAttention = async (minutesThreshold = 30) => {
  const query = `
    SELECT * FROM smart_orders
    WHERE status IN ('PENDING', 'DIGITIZED', 'PRICING')
    AND created_at < NOW() - INTERVAL '${minutesThreshold} minutes'
    ORDER BY created_at ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  createSmartOrder,
  getSmartOrderById,
  getOrdersByStatus,
  getActiveOrdersByCustomer,
  updateSmartOrderStatus,
  submitSellerPricing,
  confirmOrder,
  markOrderPacked,
  markOrderCompleted,
  cancelOrder,
  createFlowSession,
  getFlowSessionBySessionId,
  getFlowSessionByOrderId,
  completeFlowSession,
  logMessage,
  logFlowMessage,
  getOrderMessages,
  getOrdersNeedingAttention,
};
