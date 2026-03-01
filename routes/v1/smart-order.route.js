const express = require("express");
const smartOrderController = require("../../controller/smart-order.controller.js");
const flowSessionController = require("../../controller/flow-session.controller.js");

const router = express.Router();

// Smart Order Routes
router.post("/smart-orders", smartOrderController.createSmartOrder);
// Specific paths must come before parameterized :id routes
router.get("/smart-orders/customer/:phone", smartOrderController.getActiveOrdersByCustomer);
router.get("/smart-orders/status/:status", smartOrderController.getOrdersByStatus);
router.get("/smart-orders/:id", smartOrderController.getSmartOrderById);
router.put("/smart-orders/:id/status", smartOrderController.updateOrderStatus);
router.post("/smart-orders/:id/submit-pricing", smartOrderController.submitSellerPricing);
router.post("/smart-orders/:id/confirm", smartOrderController.confirmOrder);
router.post("/smart-orders/:id/pack", smartOrderController.markOrderPacked);
router.post("/smart-orders/:id/complete", smartOrderController.markOrderCompleted);
router.post("/smart-orders/:id/cancel", smartOrderController.cancelOrder);

// Flow Session Routes
router.post("/flows/start/:type", flowSessionController.startFlowSession);
router.post("/flows/submit", flowSessionController.handleFlowSubmission);
router.get("/flows/:sessionId", flowSessionController.getFlowSessionStatus);
router.post("/flows/send/:orderId", flowSessionController.sendFlowToWhatsApp);

module.exports = router;
