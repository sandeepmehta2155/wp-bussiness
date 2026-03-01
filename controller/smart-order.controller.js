const catchAsync = require("../middleware/catch-async.js");
const smartOrderService = require("../service/smart-order.service.js");

// Simple phone number validation (10-15 digits, optional + prefix)
const isValidPhoneNumber = (phone) => /^\+?\d{10,15}$/.test(phone);

/**
 * Parse order items from text
 * Extracts quantity, unit, and item name from text
 */
const parseOrderItems = (text) => {
  const items = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    // Patterns to match: "1kg sugar", "2 packets rice", "500g spices"
    const pattern = /(\d+(?:\.\d+)?)\s*(kg|g|pcs|packet|pack|bottle|box|litre|l|dozen)?\s+(.+?)(?:\s*$)/i;
    const match = line.match(pattern);

    if (match) {
      items.push({
        id: crypto.randomUUID(),
        name: match[3].trim(),
        quantity: match[1],
        unit: match[2] || 'pcs',
        estimated_price: null,
        is_available: true,
        notes: '',
      });
    } else {
      // Fallback: treat entire line as item name with default quantity
      items.push({
        id: crypto.randomUUID(),
        name: line.trim(),
        quantity: '1',
        unit: 'pcs',
        estimated_price: null,
        is_available: true,
        notes: '',
      });
    }
  }

  return items;
};

/**
 * Calculate estimated total from items
 */
const calculateEstimatedTotal = (items) => {
  // Default estimate per item if no prices yet
  return items.length * 50; // ₹50 per item as default estimate
};

/**
 * POST /api/smart-orders
 * Create a new smart order
 */
const createSmartOrder = catchAsync(async (req, res) => {
  const { customerPhone, items, originalText, sellerPhone } = req.body;

  // Validate required fields
  if (!customerPhone) {
    return res.status(400).json({
      code: 400,
      error: 'customerPhone is required',
    });
  }

  // Validate phone number format
  if (!isValidPhoneNumber(customerPhone)) {
    return res.status(400).json({
      code: 400,
      error: 'Invalid phone number format',
    });
  }

  // Parse items from text if provided
  let parsedItems = items || [];
  if (originalText && !parsedItems.length) {
    parsedItems = parseOrderItems(originalText);
  }

  // Calculate initial estimates
  const estimatedTotal = calculateEstimatedTotal(parsedItems);

  // Create order
  const order = await smartOrderService.createSmartOrder(
    customerPhone,
    parsedItems,
    originalText,
    sellerPhone || null
  );

  res.status(201).json({
    code: 201,
    message: 'Order created successfully',
    data: order,
  });
});

/**
 * GET /api/smart-orders/:id
 * Get order by ID
 */
const getSmartOrderById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const order = await smartOrderService.getSmartOrderById(id);

  if (!order) {
    return res.status(404).json({
      code: 404,
      error: 'Order not found',
    });
  }

  res.status(200).json({
    code: 200,
    message: 'Order retrieved successfully',
    data: order,
  });
});

/**
 * GET /api/smart-orders/customer/:phone
 * Get active orders by customer phone
 */
const getActiveOrdersByCustomer = catchAsync(async (req, res) => {
  const { phone } = req.params;

  const orders = await smartOrderService.getActiveOrdersByCustomer(phone);

  res.status(200).json({
    code: 200,
    message: 'Orders retrieved successfully',
    data: orders,
  });
});

/**
 * GET /api/smart-orders/status/:status
 * Get orders by status
 */
const getOrdersByStatus = catchAsync(async (req, res) => {
  const { status } = req.params;

  const orders = await smartOrderService.getOrdersByStatus(status);

  res.status(200).json({
    code: 200,
    message: 'Orders retrieved successfully',
    data: orders,
  });
});

/**
 * PUT /api/smart-orders/:id/status
 * Update order status
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, data } = req.body;

  const validStatuses = ['DIGITIZED', 'REVIEWING', 'PRICING', 'CONFIRMED', 'PACKING', 'PACKED', 'COMPLETED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      code: 400,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  const order = await smartOrderService.updateSmartOrderStatus(id, status, data);

  res.status(200).json({
    code: 200,
    message: 'Order status updated successfully',
    data: order,
  });
});

/**
 * POST /api/smart-orders/:id/submit-pricing
 * Submit seller pricing for an order
 */
const submitSellerPricing = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { sellerItems, estimatedTotal } = req.body;

  if (!sellerItems) {
    return res.status(400).json({
      code: 400,
      error: 'sellerItems is required',
    });
  }

  const order = await smartOrderService.submitSellerPricing(id, sellerItems, estimatedTotal);

  res.status(200).json({
    code: 200,
    message: 'Seller pricing submitted successfully',
    data: order,
  });
});

/**
 * POST /api/smart-orders/:id/confirm
 * Confirm order (customer final confirmation)
 */
const confirmOrder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { finalTotal } = req.body;

  const order = await smartOrderService.confirmOrder(id, finalTotal);

  res.status(200).json({
    code: 200,
    message: 'Order confirmed successfully',
    data: order,
  });
});

/**
 * POST /api/smart-orders/:id/pack
 * Mark order as packed
 */
const markOrderPacked = catchAsync(async (req, res) => {
  const { id } = req.params;

  const order = await smartOrderService.markOrderPacked(id);

  res.status(200).json({
    code: 200,
    message: 'Order marked as packed',
    data: order,
  });
});

/**
 * POST /api/smart-orders/:id/complete
 * Mark order as completed
 */
const markOrderCompleted = catchAsync(async (req, res) => {
  const { id } = req.params;

  const order = await smartOrderService.markOrderCompleted(id);

  res.status(200).json({
    code: 200,
    message: 'Order completed successfully',
    data: order,
  });
});

/**
 * POST /api/smart-orders/:id/cancel
 * Cancel order
 */
const cancelOrder = catchAsync(async (req, res) => {
  const { id } = req.params;

  const order = await smartOrderService.cancelOrder(id);

  res.status(200).json({
    code: 200,
    message: 'Order cancelled successfully',
    data: order,
  });
});

module.exports = {
  createSmartOrder,
  getSmartOrderById,
  getActiveOrdersByCustomer,
  getOrdersByStatus,
  updateOrderStatus,
  submitSellerPricing,
  confirmOrder,
  markOrderPacked,
  markOrderCompleted,
  cancelOrder,
};
