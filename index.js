const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require("axios");
const {
  handleAddInventory,
  handleAddSale,
  handleCheckStock,
  handleSummary,
  handleGenerateBill,
  handleCustomerOrder,
} = require("./salesLogic");

// ✅ Your WhatsApp API credentials
const WHATSAPP_TOKEN =
  "EAAKGvSOmZCekBPNPLZBXenPy0EXfM8VGSwGIxz39PH2AJJFSR5uPC7ZC59nQipDoyuS9eEO1lnb8ExZARE5rw2kh0aYNLKhYttQ7bWgMymEA627OgIkyHlIypmuCjux5Fz3jKDKiJNX5Kv5QHR9TwsQiFBnTeUciRBEGcpqSpibmL5pRyDWrql7NIFNk5wZDZD";
const PHONE_NUMBER_ID = "715107624687068";

app.use(bodyParser.json());

// ✅ Health Check Route
app.get("/", (_, res) => {
  res.send("✅ Kirana Store WhatsApp Bot is running!");
});

// ✅ WhatsApp Webhook Verification
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "mehta2155";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Function to Send WhatsApp Message
async function sendMessage(to, message) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("📤 Message sent:", response.data);
  } catch (err) {
    console.error("❌ Error sending message:", err.response?.data || err.message);
  }
}

// ✅ Function to Handle Incoming Messages
function handleMessage(text) {
  const parts = text.trim().split(" ");
  const command = parts[0].toLowerCase();

  if (!isNaN(parseInt(command))) {
    // Handles: "1 milk" as Add Inventory
    const qty = parseInt(parts[0]);
    const item = parts.slice(1).join(" ");
    return handleAddInventory(qty, item);
  }

  switch (command) {
    case "sale":
      return handleAddSale(parts[1], parts.slice(2).join(" "));
    case "stock":
      return handleCheckStock(parts.slice(1).join(" "));
    case "summary":
      return handleSummary();
    case "bill":
      const orderItems = [];
      for (let i = 1; i < parts.length; i += 2) {
        const qty = parseInt(parts[i]);
        const item = parts[i + 1];
        if (!isNaN(qty) && item) orderItems.push([qty, item]);
      }
      return handleGenerateBill(orderItems);
    default:
      if (text.toLowerCase().includes("i want"))
        return handleCustomerOrder(text);
      return (
        "🤖 *Sorry, I didn't understand that.*\n\n📝 *Examples:* \n" +
        "- `1 milk` (Add 1 milk)\n" +
        "- `sale 20 milk` (Log sale)\n" +
        "- `stock milk`\n" +
        "- `summary`\n" +
        "- `bill 2 milk 1 bread`\n"
      );
  }
}

// ✅ Webhook to Receive WhatsApp Messages
app.post("/webhook", (req, res) => {
  const message =
    req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;
  const from = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

  if (message && from) {
    console.log("📥 Message Received:", message);
    const reply = handleMessage(message);
    sendMessage(from, reply);
  }
  res.sendStatus(200);
});

// ✅ Start Server
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
