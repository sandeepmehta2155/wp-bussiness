const express = require("express");
const wpController = require("../../controller/wp-controller.js");
const axios = require("axios");
const {
  handleAddInventory,
  handleAddSale,
  handleCheckStock,
  handleSummary,
  handleGenerateBill,
  handleCustomerOrder,
} = require("./salesLogic.js");
const { embeddings } = require("../../service/emedding-docs.js");
const { chatWithRules, ingestDocument } = require("../../service/rag-ollama-embedding.js");
const { pipeline } = require("@xenova/transformers");
const smartOrderService = require("../../service/smart-order.service.js");

let embedder;

// Load model once at startup
(async () => {
  console.log("⏳ Loading embedding model...");
  embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("✅ Model loaded: all-MiniLM-L6-v2");
})();

const router = express.Router();

router.route("/").get(wpController.getHelloWorld);

router.get("/webhooks", (_req, _res) => {
  if (_req.query["hub.mode"] == "subscribe") {
    _res.send(_req.query["hub.challenge"]);
  } else {
    _res.sendStatus(400);
  }
});

router.get("/webhook", (_req, _res) => {
  const VERIFY_TOKEN = "mehta2155";
  const mode = _req.query["hub.mode"];
  const token = _req.query["hub.verify_token"];
  const challenge = _req.query["hub.challenge"];

  console.log(
    mode,
    token,
    challenge,
    mode === "subscribe",
    token === VERIFY_TOKEN,
    ">>>>>>>>>>>>>>>>>>>>"
  );

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified");
    _res.status(200).send(challenge);
  } else {
    _res.sendStatus(403);
  }
});

const WHATSAPP_TOKEN =
  "EAAKBsrR5KzEBOwVRk2iIgVwdvRvATaIR8DAxly1O7AnWhig5zJIjHNPdRyZANklsojfQCAOPkVNov3LR4gw2J9hcZAAQ7NRi6YJ1wRww7ohPpddvmleHvLZBrSIt9DqDsolufO0YjsHspnzhsiasZAsvDF2iJ7kNmTh2GGHFmRMvNsFwyQSPAVFUv5dJnjFLvgZDZD";
const PHONE_NUMBER_ID = "629141943625066";

/**
 * Send a message via WhatsApp Business API
 */
function sendMessage(to, message, messageData = {}) {
  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: message },
    ...messageData
  };

  // If message is an object (for non-text messages), use it directly
  if (typeof message !== 'string') {
    Object.assign(payload, message);
  }

  axios
    .post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    )
    .then((_res) => {
      console.log(_res, "Message sent!");
    })
    .catch((err) => {
      console.error(
        "Error sending message:",
        err.response?.data || err.message
      );
    });
}

/**
 * Send a flow message via WhatsApp Business API
 */
function sendFlowMessage(to, flowId, data = {}) {
  sendMessage(to, {
    type: "flow",
    flow: {
      flow_id: flowId,
      flow_action: "trigger",
      flow_action_payload: {
        data: data,
      },
    },
  });
}

/**
 * Handle text messages
 */
function handleMessage(text) {
  const parts = text.trim().split(" ");
  const command = parts[0].toLowerCase();

  if (command === "add")
    return handleAddInventory(parts[1], parts.slice(2).join(" "));
  if (command === "sale")
    return handleAddSale(parts[1], parts.slice(2).join(" "));
  if (command === "stock") return handleCheckStock(parts.slice(1).join(" "));
  if (command === "summary") return handleSummary();
  if (command === "bill") {
    const orderItems = [];
    for (let i = 1; i < parts.length; i += 2) {
      const qty = parseInt(parts[i]);
      const item = parts[i + 1];
      if (!isNaN(qty) && item) orderItems.push([qty, item]);
    }
    return handleGenerateBill(orderItems);
  }
  if (text.toLowerCase().includes("i want")) return handleCustomerOrder(text);

  return "🤖 Sorry, I did not understand that.";
}

/**
 * Process flow submission data
 */
async function processFlowSubmission(from, flowData) {
  const { flow_id, flow_request_id, data } = flowData;

  console.log("Flow submission received:", { flow_id, flow_request_id, data });

  // Try to find order by data
  let orderId = data?.orderId || data?.smart_order_id;

  if (!orderId) {
    // Try to find active order by customer phone
    const orders = await smartOrderService.getActiveOrdersByCustomer(from);
    if (orders.length > 0) {
      orderId = orders[0].id;
    }
  }

  if (orderId) {
    // Log the flow submission
    await smartOrderService.logFlowMessage(orderId, from, 'system', flowData);

    // Update order status if needed
    const order = await smartOrderService.getSmartOrderById(orderId);
    if (order) {
      // Process based on flow type if available in data
      if (data?.flowType) {
        const statusMap = {
          'SUBMIT_ORDER': 'DIGITIZED',
          'REVIEW_ORDER': 'REVIEWING',
          'SELLER_PRICING': 'PRICING',
          'CUSTOMER_CONFIRM': 'CONFIRMED',
          'PACKED_NOTIF': 'PACKED',
        };
        const newStatus = statusMap[data.flowType];
        if (newStatus) {
          await smartOrderService.updateSmartOrderStatus(orderId, newStatus, data);
        }
      }
    }

    return { processed: true, orderId };
  }

  return { processed: false };
}

// Flow configurations
const FLOW_CONFIGS = {
  SUBMIT_ORDER: {
    flowId: process.env.FLOW_SUBMIT_ORDER_ID || "default_submit_flow_id",
    name: "Submit Order",
  },
  REVIEW_ORDER: {
    flowId: process.env.FLOW_REVIEW_ORDER_ID || "default_review_flow_id",
    name: "Review Order",
  },
  SELLER_PRICING: {
    flowId: process.env.FLOW_SELLER_PRICING_ID || "default_pricing_flow_id",
    name: "Seller Pricing",
  },
  CUSTOMER_CONFIRM: {
    flowId: process.env.FLOW_CUSTOMER_CONFIRM_ID || "default_confirm_flow_id",
    name: "Customer Confirm",
  },
  PACKED_NOTIF: {
    flowId: process.env.FLOW_PACKED_NOTIF_ID || "default_packed_flow_id",
    name: "Packed Notification",
  },
};

// Helper to start a flow for an order
async function startOrderFlow(orderId, flowType) {
  const config = FLOW_CONFIGS[flowType];
  if (!config) return null;

  const order = await smartOrderService.getSmartOrderById(orderId);
  if (!order) return null;

  // Create flow session
  await smartOrderService.createFlowSession(
    `flow-${orderId}-${flowType}-${Date.now()}`,
    orderId,
    flowType,
    { flowType }
  );

  // Send flow message
  sendFlowMessage(order.customer_phone, config.flowId, {
    orderId: order.id,
    flowType,
  });

  return { order, flowType };
}

// Start flow for new orders (pending)
async function startPendingOrderFlows() {
  const pendingOrders = await smartOrderService.getOrdersByStatus('PENDING');
  for (const order of pendingOrders) {
    await startOrderFlow(order.id, 'SUBMIT_ORDER');
  }
}

router.post("/webhook", async (_req, _res) => {
  const body = _req.body;

  // Handle flow submissions
  if (body.object === "instagram" || body.object === "whatsapp") {
    if (body.entry?.[0]?.changes?.[0]?.value?.message_flows?.[0]) {
      const flowUpdate = body.entry[0].changes[0].value.message_flows[0];
      const from = flowUpdate.from;

      // Process flow submission
      const result = await processFlowSubmission(from, flowUpdate);
      console.log("Flow submission processed:", result);
      _res.sendStatus(200);
      return;
    }

    // Handle regular messages
    if (body.entry?.[0].changes?.[0].value.messages?.[0]) {
      const message = body.entry[0].changes[0].value.messages[0];
      const text = message.text?.body;
      const from = message.from;
      console.log(body.entry[0], "some message rcvd");

      const response = handleMessage(text);
      sendMessage(from, response);
    }
  }

  _res.sendStatus(200);
});

// Endpoint: generate embeddings
router.post("/embed", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  const output = await embedder(text);
  const embedding = Array.from(output[0][0]); // flatten
  res.status(200).send({ embedding });

});

router.post("/embed-search", async (req, res) => {
  const { query, topK = 5 } = req.body;

  const [queryEmbedding] = await embeddings.embedDocuments([query]);
  const { rows } = await pool.query(
    `SELECT id, content, metadata, embedding <=> $1 AS distance
     FROM documents
     ORDER BY embedding <=> $1
     LIMIT $2`,
    [queryEmbedding, topK]
  );

  res.json(rows);
});

router.post("/ingest-document", async (req, res) => {
 try { 
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).send({ message: "Project ID is required" });
    }

    await ingestDocument("./docs/business-rules.mdc", projectId);
    res.status(200).send({ message: "Document ingested successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error ingesting document", error: error.message });
  }
});

router.post('/chat-with-rules', async (req, res) => {
  try {
    const { message, projectId } = req.body;
    
    const result = await chatWithRules(message, projectId);
    
    res.json({
      success: true,
      message: result.response,
      context: result.usedTools,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
module.exports.sendMessage = sendMessage;
module.exports.sendFlowMessage = sendFlowMessage;
