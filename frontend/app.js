// =============================================
// ALEEF GARDEN RESTAURANT — APP LOGIC
// =============================================

let cart = [];

// ---- NAVBAR SCROLL ----
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 60) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// ---- MOBILE MENU ----
function toggleMenu() {
  const links = document.querySelector('.nav-links');
  links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
  links.style.flexDirection = 'column';
  links.style.position = 'absolute';
  links.style.top = '70px';
  links.style.left = '0';
  links.style.right = '0';
  links.style.background = 'rgba(13,26,18,0.98)';
  links.style.padding = '1.5rem 2rem';
  links.style.zIndex = '999';
  links.style.borderBottom = '1px solid rgba(201,168,76,0.15)';
}

// ---- CART ----
function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, qty: 1 });
  }
  renderCart();
  showToast(`🛒 ${name} added!`);
  // Pulse the cart button
  const btn = document.querySelector('.cart-btn');
  btn.style.transform = 'scale(1.2)';
  setTimeout(() => btn.style.transform = '', 200);
}

function updateQty(name, delta) {
  const item = cart.find(i => i.name === name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.name !== name);
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const countEl = document.getElementById('cartCount');

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  countEl.textContent = totalQty;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-utensils"></i>
        <p>Your cart is empty</p>
      </div>`;
    footer.style.display = 'none';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item-row">
      <span class="item-name">${item.name}</span>
      <div class="item-qty">
        <button onclick="updateQty('${item.name}', -1)">−</button>
        <span>${item.qty}</span>
        <button onclick="updateQty('${item.name}', 1)">+</button>
      </div>
      <span class="item-subtotal">₹${item.price * item.qty}</span>
    </div>
  `).join('');

  footer.style.display = 'block';
  document.getElementById('cartTotal').textContent = `₹${total}`;
}

// ---- MENU FILTER ----
function filterMenu(cat, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.menu-item').forEach(item => {
    if (cat === 'all' || item.dataset.cat === cat) {
      item.classList.remove('hidden');
      item.style.animation = 'fadeUp 0.3s ease both';
    } else {
      item.classList.add('hidden');
    }
  });
}

// ---- CHECKOUT ----
function checkout() {
  toggleCart();
  const modal = document.getElementById('checkoutModal');
  modal.classList.add('open');
  renderOrderSummary();
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
}

function renderOrderSummary() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(total * 0.05);
  const grand = total + tax;

  document.getElementById('orderSummary').innerHTML = `
    ${cart.map(i => `
      <div class="order-summary-row">
        <span>${i.name} × ${i.qty}</span>
        <span>₹${i.price * i.qty}</span>
      </div>
    `).join('')}
    <div class="order-summary-row"><span>GST (5%)</span><span>₹${tax}</span></div>
    <div class="order-summary-row total"><span>Grand Total</span><span>₹${grand}</span></div>
  `;
  document.getElementById('payTotal').textContent = `₹${grand}`;
}

function processPayment(e) {
  e.preventDefault();
  const name = document.getElementById('custName').value;
  const phone = document.getElementById('custPhone').value;
  const address = document.getElementById('custAddress').value;
  const method = document.querySelector('input[name="payment"]:checked').value;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const grand = total + Math.round(total * 0.05);

  // Simulate order placement (replace with real API call)
  const orderData = {
    customer: { name, phone, address },
    items: cart,
    total: grand,
    paymentMethod: method,
    orderedAt: new Date().toISOString()
  };

  console.log('Order Placed:', orderData);

  // Send to backend
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  })
  .then(res => res.json())
  .then(data => {
    handleOrderSuccess(data, method, grand);
  })
  .catch(() => {
    // Offline mode — still show success for demo
    handleOrderSuccess({ orderId: 'AG' + Date.now() }, method, grand);
  });
}

function handleOrderSuccess(data, method, grand) {
  closeCheckout();
  cart = [];
  renderCart();

  if (method === 'upi' || method === 'card') {
    // Razorpay integration point
    initiateRazorpay(grand, data.orderId);
  } else {
    showOrderConfirmed(data.orderId);
  }
}

// ---- RAZORPAY INTEGRATION ----
function initiateRazorpay(amount, orderId) {
  const options = {
    key: 'YOUR_RAZORPAY_KEY_ID', // Replace with your Razorpay key
    amount: amount * 100, // paise
    currency: 'INR',
    name: 'Aleef Garden Restaurant',
    description: 'Food Order Payment',
    order_id: orderId,
    handler: function(response) {
      showOrderConfirmed(response.razorpay_payment_id);
    },
    prefill: {
      name: document.getElementById('custName').value,
      contact: document.getElementById('custPhone').value
    },
    theme: { color: '#C9A84C' }
  };

  if (typeof Razorpay !== 'undefined') {
    const rzp = new Razorpay(options);
    rzp.open();
  } else {
    // Razorpay not loaded (demo mode)
    showOrderConfirmed('DEMO-' + Date.now());
  }
}

function showOrderConfirmed(orderId) {
  showToast(`✅ Order Confirmed! ID: ${orderId}`);
  setTimeout(() => {
    alert(`🎉 Thank you for ordering from Aleef Garden!\n\nOrder ID: ${orderId}\nWe'll deliver in 30-45 minutes!\n\nFor queries: +91 98765 43210`);
  }, 500);
}

// ---- RESERVATION ----
function submitReservation(e) {
  e.preventDefault();
  showToast('✅ Table Reserved! We\'ll confirm via WhatsApp.');
  e.target.reset();
}

// ---- TOAST ----
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- INTERSECTION OBSERVER for fade-in ----
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.special-card, .menu-item, .about-img-card, .info-block').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Init render
renderCart();
