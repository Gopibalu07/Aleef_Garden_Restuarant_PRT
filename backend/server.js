// =============================================
// ALEEF GARDEN RESTAURANT — BACKEND SERVER
// Node.js + Express + SQLite
// =============================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT not defined");
}

// ---- MIDDLEWARE ----
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve Frontend folder (works from root when deployed on Railway)
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- DB ----
const db = require('./database');

// ---- RAZORPAY (optional — only if keys are set) ----
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// =============================================
// MENU ENDPOINTS
// =============================================

app.get('/api/menu', (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM menu_items WHERE available = 1';
  const params = [];
  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, items: rows });
  });
});

app.get('/api/menu/:id', (req, res) => {
  db.get('SELECT * FROM menu_items WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true, item: row });
  });
});

// =============================================
// ORDER ENDPOINTS
// =============================================

app.post('/api/orders', (req, res) => {
  const { customer, items, total, paymentMethod } = req.body;
  if (!customer || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order data' });
  }
  const orderId = 'AG' + Date.now();
  const itemsJson = JSON.stringify(items);
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO orders (order_id, customer_name, customer_phone, customer_address, items, total, payment_method, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, customer.name, customer.phone, customer.address, itemsJson, total, paymentMethod, 'pending', now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, orderId, message: 'Order placed successfully!' });
    }
  );
});

app.get('/api/orders', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(r => ({ ...r, items: JSON.parse(r.items) }));
    res.json({ success: true, orders });
  });
});

app.get('/api/orders/:orderId', (req, res) => {
  db.get('SELECT * FROM orders WHERE order_id = ?', [req.params.orderId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Order not found' });
    row.items = JSON.parse(row.items);
    res.json({ success: true, order: row });
  });
});

app.patch('/api/orders/:orderId/status', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.run('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.orderId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: `Order status updated to ${status}` });
  });
});

// =============================================
// PAYMENT ENDPOINTS (Razorpay)
// =============================================

app.post('/api/payment/create-order', async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ error: 'Payment gateway not configured' });
  }
  const { amount, orderId } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: orderId,
    });
    db.run('UPDATE orders SET razorpay_order_id = ? WHERE order_id = ?', [order.id, orderId]);
    res.json({
      success: true,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

app.post('/api/payment/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Payment verification failed' });
  }
  db.run(
    'UPDATE orders SET status = ?, payment_id = ? WHERE order_id = ?',
    ['confirmed', razorpay_payment_id, orderId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Payment verified & order confirmed!' });
    }
  );
});

// =============================================
// RESERVATIONS
// =============================================

app.post('/api/reservations', (req, res) => {
  const { name, phone, email, date, guests, requests } = req.body;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO reservations (name, phone, email, date, guests, requests, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, email, date, guests, requests || '', 'pending', now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, reservationId: this.lastID, message: 'Table reserved!' });
    }
  );
});

// =============================================
// HEALTH CHECK & FALLBACK
// =============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', restaurant: 'Aleef Garden', timestamp: new Date() });
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// ---- START ----

app.listen(PORT, () => {
  console.log(`\n🌿 Aleef Garden running at http://localhost:${PORT}`);
  console.log(`📡 API at http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
