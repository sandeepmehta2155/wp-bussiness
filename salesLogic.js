const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, 'inventory.json');
const salesPath = path.join(__dirname, 'sales.json');
const ordersPath = path.join(__dirname, 'orders.json');

function loadData(path, fallback) {
  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify(fallback));
  return JSON.parse(fs.readFileSync(path));
}

function saveData(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function handleAddInventory(qty, item) {
  const inventory = loadData(inventoryPath, {});
  inventory[item] = (inventory[item] || 0) + parseInt(qty);
  saveData(inventoryPath, inventory);
  return `📦 Added ${qty} units of ${item} to inventory.`;
}

function handleAddSale(amount, item) {
  const sales = loadData(salesPath, []);
  sales.push({ item, amount: parseInt(amount), time: new Date().toISOString() });
  saveData(salesPath, sales);

  const inventory = loadData(inventoryPath, {});
  if (inventory[item]) inventory[item] -= 1;
  saveData(inventoryPath, inventory);

  return `✅ Sale logged: ₹${amount} - ${item}`;
}

function handleCheckStock(item) {
  const inventory = loadData(inventoryPath, {});
  const qty = inventory[item] || 0;
  return `📋 ${item} in stock: ${qty} units`;
}

function handleSummary() {
  const sales = loadData(salesPath, []);
  let total = 0;
  const summary = {};
  for (const s of sales) {
    summary[s.item] = (summary[s.item] || 0) + s.amount;
    total += s.amount;
  }
  const topItem = Object.entries(summary).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  return `📊 Today's Summary:\nTotal Sales: ₹${total}\nTop Item: ${topItem[0]} (₹${topItem[1]})`;
}

function handleGenerateBill(items) {
  let total = 0;
  let bill = items.map(([qty, item]) => {
    const price = 10;
    const lineTotal = qty * price;
    total += lineTotal;
    return `${item} x ${qty} = ₹${lineTotal}`;
  }).join('\n');
  return `${bill}\n\n🧾 Total: ₹${total}`;
}

function handleCustomerOrder(text) {
  const orders = loadData(ordersPath, []);
  orders.push({ text, time: new Date().toISOString() });
  saveData(ordersPath, orders);
  return `🛒 Order logged: "${text}"`;
}

module.exports = {
  handleAddInventory,
  handleAddSale,
  handleCheckStock,
  handleSummary,
  handleGenerateBill,
  handleCustomerOrder
};
