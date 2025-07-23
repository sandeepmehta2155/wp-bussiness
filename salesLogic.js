const fs = require("fs");
const path = require("path");

const inventoryPath = path.join(__dirname, "inventory.json");
const salesPath = path.join(__dirname, "sales.json");
const ordersPath = path.join(__dirname, "orders.json");

function loadData(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath));
}

function saveData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function handleAddInventory(qty, item) {
  const inventory = loadData(inventoryPath, {});
  inventory[item] = (inventory[item] || 0) + parseInt(qty);
  saveData(inventoryPath, inventory);
  return `✅ *Added ${qty} ${item}(s) to inventory.*`;
}

function handleAddSale(amount, item) {
  const sales = loadData(salesPath, []);
  sales.push({ item, amount: parseInt(amount), time: new Date().toISOString() });
  saveData(salesPath, sales);

  const inventory = loadData(inventoryPath, {});
  if (inventory[item]) inventory[item] -= 1;
  saveData(inventoryPath, inventory);

  return `💸 *Sale logged:* ₹${amount} - ${item}`;
}

function handleCheckStock(item) {
  const inventory = loadData(inventoryPath, {});
  const qty = inventory[item] || 0;
  return `📦 *${item} in stock:* ${qty} units`;
}

function handleSummary() {
  const sales = loadData(salesPath, []);
  let total = 0;
  const summary = {};

  sales.forEach(({ item, amount }) => {
    summary[item] = (summary[item] || 0) + amount;
    total += amount;
  });

  const topItem = Object.entries(summary).sort((a, b) => b[1] - a[1])[0] || [
    "None",
    0,
  ];

  return `📊 *Today's Summary:*\n🪙 *Total Sales:* ₹${total}\n🏆 *Top Item:* ${topItem[0]} (₹${topItem[1]})`;
}

function handleGenerateBill(items) {
  let total = 0;
  const lines = items.map(([qty, item]) => {
    const price = 10; // static price for now
    const lineTotal = qty * price;
    total += lineTotal;
    return `- ${item} x${qty} = ₹${lineTotal}`;
  });

  return `🧾 *Bill:*\n${lines.join("\n")}\n\n💰 *Total:* ₹${total}`;
}

function handleCustomerOrder(text) {
  const orders = loadData(ordersPath, []);
  orders.push({ text, time: new Date().toISOString() });
  saveData(ordersPath, orders);
  return `🛒 *Order logged:* "${text}"`;
}

module.exports = {
  handleAddInventory,
  handleAddSale,
  handleCheckStock,
  handleSummary,
  handleGenerateBill,
  handleCustomerOrder,
};
