#!/usr/bin/env node

/**
 * Register WhatsApp Flows with Meta
 *
 * Usage: node scripts/register-flows.js
 *        FLOW_SUBMIT_ORDER_ID=xxx node scripts/register-flows.js
 *
 * This script reads flow JSON files and registers them with Meta's WhatsApp Business API.
 * It outputs the flow IDs which should be stored in your .env file.
 */

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

// Configuration
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.WP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || process.env.WP_PHONE_NUMBER_ID;

const FLOW_DIR = path.join(__dirname, "../flows");
const FLOW_FILES = {
  SUBMIT_ORDER: "submit-order.json",
  REVIEW_ORDER: "review-order.json",
  SELLER_PRICING: "seller-pricing.json",
  CUSTOMER_CONFIRM: "customer-confirm.json",
  PACKED_NOTIF: "packed-notification.json",
};

// Read flow JSON file
const readFlowFile = async (fileName) => {
  const filePath = path.join(FLOW_DIR, fileName);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
};

// Register a flow with Meta
const registerFlow = async (flowType, flowJson) => {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/flows`;

  const payload = {
    name: flowJson.name || `SmartOrder - ${flowType}`,
    description: flowJson.description || `Flow for ${flowType}`,
    wasm_uri: null, // We're using local JSON flows, not WASM
    json_schema: JSON.stringify(flowJson.schema || {}),
    categories: flowJson.categories || ["ACCOUNT_UPDATE", "PAYMENT_UPDATE", "RESERVATION_UPDATE"],
    webhook: flowJson.webhook || null,
  };

  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Registering flow: ${flowType}`);
    console.log(`${"=".repeat(60)}`);

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Response status: ${response.status}`);
    console.log(`Flow ID: ${response.data.id}`);
    console.log(`Flow Name: ${response.data.name}`);

    return {
      flowType,
      flowId: response.data.id,
      status: response.status,
    };
  } catch (error) {
    console.error(`❌ Error registering flow ${flowType}:`);
    console.error(error.response?.data || error.message);
    return {
      flowType,
      error: error.response?.data || error.message,
    };
  }
};

// List all registered flows
const listFlows = async () => {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/flows`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("\n✅ Registered Flows:");
    console.log("-".repeat(60));
    response.data.data.forEach((flow) => {
      console.log(`ID: ${flow.id}`);
      console.log(`  Name: ${flow.name}`);
      console.log(`  Status: ${flow.status}`);
      console.log(`  Created: ${flow.created_time}`);
      console.log(`  Updated: ${flow.updated_time}`);
      console.log();
    });

    return response.data.data;
  } catch (error) {
    console.error("Error listing flows:", error.response?.data || error.message);
    return [];
  }
};

// Delete a flow (useful for testing)
const deleteFlow = async (flowId) => {
  const url = `https://graph.facebook.com/v22.0/${flowId}`;

  try {
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Deleted flow: ${flowId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error deleting flow ${flowId}:`);
    console.error(error.response?.data || error.message);
    return null;
  }
};

// Main function
const main = async () => {
  console.log("WhatsApp Flows Registration Script");
  console.log("=".repeat(60));
  console.log(`Token: ${WHATSAPP_TOKEN ? "✅ Configured" : "❌ Missing"}`);
  console.log(`Phone Number ID: ${PHONE_NUMBER_ID || "❌ Missing"}`);
  console.log(`Flow Directory: ${FLOW_DIR}`);

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("\n❌ Error: WHATSAPP_TOKEN and PHONE_NUMBER_ID must be set");
    console.error("\nSet environment variables:");
    console.error("  export WHATSAPP_TOKEN='your_token'");
    console.error("  export PHONE_NUMBER_ID='your_phone_number_id'");
    process.exit(1);
  }

  // Ask user what they want to do
  console.log("\nOptions:");
  console.log("1. Register all flows (default)");
  console.log("2. List registered flows");
  console.log("3. Delete a flow (for testing)");
  console.log("4. Register flows and show IDs in .env format");

  const action = process.argv[2] || "register";

  if (action === "list") {
    await listFlows();
    process.exit(0);
  }

  if (action === "delete") {
    const flowId = process.argv[3];
    if (!flowId) {
      console.error("❌ Error: Flow ID required");
      console.error("Usage: node register-flows.js delete <flow_id>");
      process.exit(1);
    }
    await deleteFlow(flowId);
    process.exit(0);
  }

  // Register flows
  console.log("\n" + "=".repeat(60));
  console.log("Registering Flows...");
  console.log("=".repeat(60));

  const results = {};
  const errors = [];

  for (const [flowType, fileName] of Object.entries(FLOW_FILES)) {
    try {
      const flowJson = await readFlowFile(fileName);
      const result = await registerFlow(flowType, flowJson);

      if (result.error) {
        errors.push(result);
      } else {
        results[flowType] = result.flowId;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${flowType}:`, error.message);
      errors.push({ flowType, error: error.message });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Registration Summary");
  console.log("=".repeat(60));

  if (Object.keys(results).length > 0) {
    console.log("\n✅ Successfully Registered:");
    for (const [type, id] of Object.entries(results)) {
      console.log(`  ${type}: ${id}`);
    }

    // Generate .env format
    console.log("\n📝 Add these to your .env file:");
    for (const [type, id] of Object.entries(results)) {
      console.log(`  FLOW_${type}_ID=${id}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach((e) => {
      console.log(`  ${e.flowType}: ${e.error}`);
    });
  }

  // Show all registered flows
  console.log("\n" + "=".repeat(60));
  console.log("Current Registered Flows:");
  console.log("=".repeat(60));
  await listFlows();
};

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
