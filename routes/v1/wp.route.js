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

function sendMessage(to, message) {
  axios
    .post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message },
      },
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

router.post("/webhook", ( _req, _res) => {
  const body = _req.body;
//   let body_param = _req.body;

  if (
    body.object &&
    body.entry &&
    body.entry?.[0].changes?.[0].value.messages?.[0]
  ) {
    const message = body.entry[0].changes[0].value.messages[0];
    const text = message.text?.body;
    const from = message.from;
    console.log(body.entry[0], "some message rcvd");
    
    // let phon_no_id =
    //   body_param.entry[0].changes[0].value.metadata.phone_number_id;
    // let froms = body_param.entry[0].changes[0].value.messages[0].from;
    // let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;

    // console.log("phone number " + phon_no_id);
    // console.log("from " + from);
    // console.log("boady param " + msg_body);

    const response = handleMessage(text); // Your bot logic
    sendMessage(from, response);
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
