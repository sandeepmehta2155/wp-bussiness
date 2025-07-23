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

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/webhooks", (req, res) => {
  if (req.query["hub.mode"] == "subscribe") {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(400);
  }
});

app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "mehta2155";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

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
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
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
    .then((res) => {
      console.log(res, "Message sent!");
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

app.post("/webhook", (req, res) => {
  const body = req.body;
  let body_param = req.body;

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

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
