const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const dataDir = path.join(__dirname, '..', 'data');
const ordersFile = path.join(dataDir, 'orders.json');

function loadOrders() {
  try {
    return JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
  } catch (err) {
    return {};
  }
}

function saveOrders(orders) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

function createOrder({ packageId, packageName, amountUsd, email, product, category, planKey }) {
  const orders = loadOrders();
  const id = nanoid(10);
  const order = {
    id,
    packageId,
    packageName,
    product: product || 'api',
    category: category || 'token',
    planKey: planKey || null,
    amountUsd,
    email: email || '',
    status: 'pending',
    code: null,
    fulfillment: null,
    stripeSessionId: null,
    createdAt: new Date().toISOString(),
  };
  orders[id] = order;
  saveOrders(orders);
  return order;
}

function getOrder(id) {
  const orders = loadOrders();
  return orders[id] || null;
}

function listOrders() {
  const orders = loadOrders();
  return Object.values(orders).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function updateOrder(id, patch) {
  const orders = loadOrders();
  if (!orders[id]) return null;
  orders[id] = { ...orders[id], ...patch };
  saveOrders(orders);
  return orders[id];
}

module.exports = { createOrder, getOrder, listOrders, updateOrder };
