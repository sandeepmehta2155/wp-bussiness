const catchAsync = require("../middleware/catch-async.js");
const smartOrderService = require("../service/smart-order.service.js");
const {sendMessage} = require("../routes/v1/wp.route.js");

// Flow type to status mapping
const FLOW_TYPE_STATUS_MAP = {
  SUBMIT_ORDER: 'DIGITIZED',
  REVIEW_ORDER: 'REVIEWING',
  SELLER_PRICING: 'PRICING',
  CUSTOMER_CONFIRM: 'CONFIRMED',
  PACKED_NOTIF: 'PACKED',
};

/**
 * POST /api/flows/start/:type
 * Start a new flow session for an order
 */
const startFlowSession = catchAsync(async (req, res) => {
  const { type } = req.params;
  const { orderId } = req.body;

  // Validate flow type
  const validFlowTypes = ['SUBMIT_ORDER', 'REVIEW_ORDER', 'SELLER_PRICING', 'CUSTOMER_CONFIRM', 'PACKED_NOTIF'];
  if (!validFlowTypes.includes(type)) {
    return res.status(400).json({
      code: 400,
      error: `Invalid flow type. Must be one of: ${validFlowTypes.join(', ')}`,
    });
  }

  // Get order
  const order = await smartOrderService.getSmartOrderById(orderId);
  if (!order) {
    return res.status(404).json({
      code: 404,
      error: 'Order not found',
    });
  }

  // Update order status based on flow type
  const newStatus = FLOW_TYPE_STATUS_MAP[type];
  if (newStatus) {
    await smartOrderService.updateSmartOrderStatus(orderId, newStatus);
  }

  // Create flow session
  const flowSession = await smartOrderService.createFlowSession(
    `flow-${orderId}-${type}-${Date.now()}`,
    orderId,
    type,
    { lastFlowType: type }
  );

  res.status(201).json({
    code: 201,
    message: 'Flow session started successfully',
    data: {
      flowSession,
      orderId,
      flowType: type,
    },
  });
});

/**
 * POST /api/flows/submit
 * Handle flow submission webhook
 * This is called by WhatsApp when a user completes a flow
 */
const handleFlowSubmission = catchAsync(async (req, res) => {
  const { flow_id, flow_request_id, data } = req.body;

  // Find the flow session by flow_id or flow_request_id
  const flowSession = await smartOrderService.getFlowSessionBySessionId(flow_id);

  if (!flowSession) {
    // Try to find by metadata in data
    const orderId = data?.orderId || data?.smart_order_id;
    if (orderId) {
      // Get latest session for this order
      const order = await smartOrderService.getSmartOrderById(orderId);
      if (order) {
        return res.status(200).json({
          code: 200,
          message: 'Flow data received',
          data: { orderId, flowId: flow_id, processed: true },
        });
      }
    }
    return res.status(404).json({
      code: 404,
      error: 'Flow session not found',
    });
  }

  // Update flow session status
  await smartOrderService.completeFlowSession(flowSession.session_id);

  // Update order status based on flow type
  const order = await smartOrderService.getSmartOrderById(flowSession.smart_order_id);
  if (order) {
    const newStatus = FLOW_TYPE_STATUS_MAP[flowSession.flow_type];
    if (newStatus) {
      await smartOrderService.updateSmartOrderStatus(order.id, newStatus, data);
    }
  }

  res.status(200).json({
    code: 200,
    message: 'Flow submission processed successfully',
    data: { flowSession, orderId: flowSession.smart_order_id },
  });
});

/**
 * GET /api/flows/:sessionId
 * Get flow session status
 */
const getFlowSessionStatus = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const flowSession = await smartOrderService.getFlowSessionBySessionId(sessionId);

  if (!flowSession) {
    return res.status(404).json({
      code: 404,
      error: 'Flow session not found',
    });
  }

  res.status(200).json({
    code: 200,
    message: 'Flow session retrieved successfully',
    data: flowSession,
  });
});

/**
 * POST /api/flows/send/:orderId
 * Send a flow message to WhatsApp
 */
const sendFlowToWhatsApp = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { flowId, flowName, to, data } = req.body;

  // Get order
  const order = await smartOrderService.getSmartOrderById(orderId);
  if (!order) {
    return res.status(404).json({
      code: 404,
      error: 'Order not found',
    });
  }

  // Get or create flow session
  let flowSession = await smartOrderService.getFlowSessionByOrderId(orderId);
  if (!flowSession) {
    flowSession = await smartOrderService.createFlowSession(
      `flow-${orderId}-${Date.now()}`,
      orderId,
      'SUBMIT_ORDER',
      { to }
    );
  }

  // Send flow message via WhatsApp API
  // The flow message structure for WhatsApp Business API
  const flowMessage = {
    messaging_product: "whatsapp",
    to: to || order.customer_phone,
    type: "flow",
    flow: {
      flow_id: flowId,
      flow_action: "trigger",
      flow_action_payload: {
        data: data || { orderId: order.id },
      },
    },
  };

  // Send the message
  sendMessage(to || order.customer_phone, JSON.stringify({
    messaging_product: "whatsapp",
    to: to || order.customer_phone,
    type: "flow",
    flow: {
      flow_id: flowId,
      flow_action: "trigger",
      flow_action_payload: {
        data: data || { orderId: order.id },
      },
    },
  }));

  // Log the message
  await smartOrderService.logFlowMessage(orderId, 'system', to || order.customer_phone, flowMessage);

  res.status(200).json({
    code: 200,
    message: 'Flow message sent successfully',
    data: {
      flowSession,
      flowId,
      to: to || order.customer_phone,
    },
  });
});

module.exports = {
  startFlowSession,
  handleFlowSubmission,
  getFlowSessionStatus,
  sendFlowToWhatsApp,
};
