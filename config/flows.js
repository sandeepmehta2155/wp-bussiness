const FLOW_DIR = require("path").join(__dirname, "../flows");

const FLOW_CONFIGS = {
  // Step 1: Customer submits order
  SUBMIT_ORDER: {
    name: "Submit Order Flow",
    description: "Allow customers to submit their order via WhatsApp",
    flowId: process.env.FLOW_SUBMIT_ORDER_ID,
    filePath: `${FLOW_DIR}/submit-order.json`,
    webhookUrl: process.env.FLOW_WEBHOOK_URL
      ? `${process.env.FLOW_WEBHOOK_URL}/flows/submit`
      : null,
  },
  // Step 2: Customer reviews digitized order
  REVIEW_ORDER: {
    name: "Review Order Flow",
    description: "Allow customers to review and edit their digitized order",
    flowId: process.env.FLOW_REVIEW_ORDER_ID,
    filePath: `${FLOW_DIR}/review-order.json`,
    webhookUrl: process.env.FLOW_WEBHOOK_URL
      ? `${process.env.FLOW_WEBHOOK_URL}/flows/submit`
      : null,
  },
  // Step 3: Seller provides pricing
  SELLER_PRICING: {
    name: "Seller Pricing Flow",
    description: "Allow sellers to provide pricing and availability",
    flowId: process.env.FLOW_SELLER_PRICING_ID,
    filePath: `${FLOW_DIR}/seller-pricing.json`,
    webhookUrl: process.env.FLOW_WEBHOOK_URL
      ? `${process.env.FLOW_WEBHOOK_URL}/flows/submit`
      : null,
  },
  // Step 4: Customer confirms final order
  CUSTOMER_CONFIRM: {
    name: "Customer Confirm Flow",
    description: "Allow customers to confirm final order",
    flowId: process.env.FLOW_CUSTOMER_CONFIRM_ID,
    filePath: `${FLOW_DIR}/customer-confirm.json`,
    webhookUrl: process.env.FLOW_WEBHOOK_URL
      ? `${process.env.FLOW_WEBHOOK_URL}/flows/submit`
      : null,
  },
  // Step 5: Packed notification
  PACKED_NOTIF: {
    name: "Packed Notification Flow",
    description: "Notify customer that order is ready for pickup",
    flowId: process.env.FLOW_PACKED_NOTIF_ID,
    filePath: `${FLOW_DIR}/packed-notification.json`,
    webhookUrl: process.env.FLOW_WEBHOOK_URL
      ? `${process.env.FLOW_WEBHOOK_URL}/flows/submit`
      : null,
  },
};

// Get flow config by type
const getFlowConfig = (flowType) => {
  return FLOW_CONFIGS[flowType];
};

// Get all flow configs
const getAllFlowConfigs = () => {
  return Object.values(FLOW_CONFIGS);
};

// Get flow ID by type (returns env value or null)
const getFlowId = (flowType) => {
  return FLOW_CONFIGS[flowType]?.flowId || null;
};

// Update flow IDs after registration
const updateFlowIds = (newFlowIds) => {
  for (const [type, id] of Object.entries(newFlowIds)) {
    if (FLOW_CONFIGS[type]) {
      FLOW_CONFIGS[type].flowId = id;
    }
  }
};

module.exports = {
  FLOW_CONFIGS,
  getFlowConfig,
  getAllFlowConfigs,
  getFlowId,
  updateFlowIds,
};
