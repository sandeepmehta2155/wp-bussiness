const { getPgBoss } = require("../pg-boss.js");
const smartOrderService = require("./smart-order.service.js");

const JOB_PROCESS_PENDING_ORDERS = "smart-order:process-pending";
const JOB_SEND_STATUS_NOTIFICATIONS = "smart-order:send-notifications";
const JOB_TIMEOUT_CLEANUP = "smart-order:timeout-cleanup";

/**
 * Process pending orders that haven't been digitized yet
 * Runs every 5 minutes
 */
const processPendingOrders = async (job) => {
  console.log("[SmartOrder] Processing pending orders...", job.id);

  const pendingOrders = await smartOrderService.getOrdersByStatus("PENDING");
  console.log(`[SmartOrder] Found ${pendingOrders.length} pending orders`);

  for (const order of pendingOrders) {
    try {
      // Mark as digitized - actual digitization happens via WhatsApp flow
      await smartOrderService.updateSmartOrderStatus(order.id, "DIGITIZED");
      console.log(`[SmartOrder] Order ${order.id} marked as DIGITIZED`);
    } catch (err) {
      console.error(`[SmartOrder] Error processing order ${order.id}:`, err.message);
    }
  }

  return { processed: pendingOrders.length };
};

/**
 * Send status notifications to customers
 * Runs every 10 minutes
 */
const sendStatusNotifications = async (job) => {
  console.log("[SmartOrder] Sending status notifications...", job.id);

  // Find orders in PRICING state (seller has priced, waiting for customer confirm)
  const pricingOrders = await smartOrderService.getOrdersByStatus("PRICING");

  for (const order of pricingOrders) {
    try {
      console.log(`[SmartOrder] Would send notification for order ${order.id} to ${order.customer_phone}`);
      // Actual WhatsApp message sending happens via flow-session.controller.js
    } catch (err) {
      console.error(`[SmartOrder] Error notifying for order ${order.id}:`, err.message);
    }
  }

  return { notified: pricingOrders.length };
};

/**
 * Clean up orders stuck in a state longer than the threshold
 * Runs every 30 minutes
 */
const timeoutCleanup = async (job) => {
  console.log("[SmartOrder] Running timeout cleanup...", job.id);

  const stuckOrders = await smartOrderService.getOrdersNeedingAttention(60);
  console.log(`[SmartOrder] Found ${stuckOrders.length} stuck orders`);

  for (const order of stuckOrders) {
    try {
      console.log(`[SmartOrder] Order ${order.id} has been in ${order.status} for over 60 minutes`);
      // Log for monitoring - don't auto-cancel without business logic
    } catch (err) {
      console.error(`[SmartOrder] Error in cleanup for order ${order.id}:`, err.message);
    }
  }

  return { reviewed: stuckOrders.length };
};

/**
 * Register all SmartOrder background jobs with PgBoss
 */
const registerSmartOrderJobs = async () => {
  const pgBoss = getPgBoss();

  // Create queues
  await pgBoss.createQueue(JOB_PROCESS_PENDING_ORDERS).catch(console.error);
  await pgBoss.createQueue(JOB_SEND_STATUS_NOTIFICATIONS).catch(console.error);
  await pgBoss.createQueue(JOB_TIMEOUT_CLEANUP).catch(console.error);

  // Schedule recurring jobs
  await pgBoss.schedule(JOB_PROCESS_PENDING_ORDERS, "*/5 * * * *"); // every 5 min
  await pgBoss.schedule(JOB_SEND_STATUS_NOTIFICATIONS, "*/10 * * * *"); // every 10 min
  await pgBoss.schedule(JOB_TIMEOUT_CLEANUP, "*/30 * * * *"); // every 30 min

  // Register workers
  await pgBoss.work(JOB_PROCESS_PENDING_ORDERS, processPendingOrders);
  await pgBoss.work(JOB_SEND_STATUS_NOTIFICATIONS, sendStatusNotifications);
  await pgBoss.work(JOB_TIMEOUT_CLEANUP, timeoutCleanup);

  console.log("[SmartOrder] Background jobs registered");
};

module.exports = {
  registerSmartOrderJobs,
  JOB_PROCESS_PENDING_ORDERS,
  JOB_SEND_STATUS_NOTIFICATIONS,
  JOB_TIMEOUT_CLEANUP,
};
