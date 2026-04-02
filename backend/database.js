// =============================================
// ALEEF GARDEN RESTAURANT — DATABASE SETUP
// SQLite via better-sqlite3 / sqlite3
// =============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'aleef_garden.db');
const db = new sqlite3.Database(DB_PATH);

// =============================================
// CREATE TABLES
// =============================================

db.serialize(() => {

  // ---- MENU ITEMS TABLE ----
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT,
      price       REAL NOT NULL,
      category    TEXT NOT NULL,
      is_veg      INTEGER DEFAULT 0,
      is_spicy    INTEGER DEFAULT 0,
      available   INTEGER DEFAULT 1,
      image_url   TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ---- ORDERS TABLE ----
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id           TEXT UNIQUE NOT NULL,
      customer_name      TEXT NOT NULL,
      customer_phone     TEXT NOT NULL,
      customer_address   TEXT NOT NULL,
      items              TEXT NOT NULL,
      total              REAL NOT NULL,
      payment_method     TEXT DEFAULT 'cod',
      payment_id         TEXT,
      razorpay_order_id  TEXT,
      status             TEXT DEFAULT 'pending',
      created_at         TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ---- RESERVATIONS TABLE ----
  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      phone      TEXT NOT NULL,
      email      TEXT,
      date       TEXT NOT NULL,
      guests     INTEGER NOT NULL,
      requests   TEXT,
      status     TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ---- SEED MENU ITEMS (only if empty) ----
  db.get('SELECT COUNT(*) as count FROM menu_items', (err, row) => {
    if (err || row.count > 0) return;

    const menuItems = [
      // STARTERS
      ['Chicken 65', 'Crispy deep-fried chicken with curry leaves & chilli', 220, 'starters', 0, 1],
      ['Chicken Lollipop', 'Succulent drumettes in spicy red glaze', 280, 'starters', 0, 1],
      ['Mutton Sukka', 'Dry tossed mutton with roasted coconut & spices', 360, 'starters', 0, 1],
      ['Veg Spring Rolls', 'Crispy rolls stuffed with seasonal vegetables', 160, 'starters', 1, 0],
      ['Fish Finger', 'Golden crumb-fried fish strips with tartar sauce', 300, 'starters', 0, 0],
      ['Prawns Fry', 'Masala coated tiger prawns deep fried', 380, 'starters', 0, 1],
      ['Chicken Wings', 'Spice-rubbed wings with smoky BBQ glaze', 260, 'starters', 0, 1],
      ['Mushroom 65', 'Crispy mushroom bites with spicy mayo', 180, 'starters', 1, 1],

      // TANDOOR
      ['Tandoori Chicken Full', 'Whole chicken marinated & roasted in clay oven', 580, 'tandoor', 0, 0],
      ['Tandoori Chicken Half', 'Half bird, perfectly charred with mint chutney', 320, 'tandoor', 0, 0],
      ['Seekh Kebab', 'Minced lamb skewers with aromatic herbs', 340, 'tandoor', 0, 0],
      ['Paneer Tikka', 'Cottage cheese cubes in smoky tandoor marinade', 260, 'tandoor', 1, 0],
      ['Chicken Tikka', 'Boneless chicken chunks marinated in yogurt & spices', 300, 'tandoor', 0, 0],
      ['Tandoori Roti', 'Whole wheat bread baked in clay oven', 30, 'tandoor', 1, 0],
      ['Garlic Naan', 'Leavened bread with garlic butter, clay-baked', 50, 'tandoor', 1, 0],
      ['Butter Naan', 'Soft naan slathered with fresh butter', 45, 'tandoor', 1, 0],

      // BIRYANI
      ['Chicken Biryani', 'Dum-cooked fragrant rice with juicy chicken', 280, 'biryani', 0, 0],
      ['Mutton Biryani', 'Slow-cooked tender mutton layered with saffron rice', 360, 'biryani', 0, 0],
      ['Egg Biryani', 'Fluffy basmati layered with spiced boiled eggs', 200, 'biryani', 0, 0],
      ['Veg Biryani', 'Garden vegetables dum-cooked with fragrant rice', 180, 'biryani', 1, 0],
      ['Prawn Biryani', 'Juicy prawns slow-cooked with aromatic basmati', 420, 'biryani', 0, 0],
      ['Family Biryani', 'Serves 4 — Mixed chicken & mutton biryani platter', 980, 'biryani', 0, 0],

      // GRAVY
      ['Chicken Butter Masala', 'Rich tomato & cream gravy with tender chicken', 280, 'gravy', 0, 0],
      ['Mutton Korma', 'Slow-braised mutton in cashew & yoghurt sauce', 360, 'gravy', 0, 0],
      ['Dal Tadka', 'Yellow lentils tempered with ghee & cumin', 160, 'gravy', 1, 0],
      ['Paneer Tikka Masala', 'Grilled paneer in creamy tomato gravy', 240, 'gravy', 1, 0],
      ['Fish Curry', 'Coastal style fish in tangy coconut curry', 380, 'gravy', 0, 1],
      ['Chicken Chettinad', 'Aromatic South Indian black pepper chicken', 300, 'gravy', 0, 1],
      ['Kadai Mutton', 'Mutton tossed in iron wok with capsicum & onions', 380, 'gravy', 0, 1],

      // RICE & NOODLES
      ['Chicken Fried Rice', 'Wok-tossed rice with chicken & seasonal veggies', 240, 'rice', 0, 0],
      ['Veg Fried Rice', 'Classic wok-fired rice with garden vegetables', 180, 'rice', 1, 0],
      ['Egg Fried Rice', 'Scrambled egg tossed rice with soy & chilli', 200, 'rice', 0, 0],
      ['Veg Noodles', 'Hakka noodles stir-fried with fresh vegetables', 180, 'rice', 1, 0],
      ['Chicken Noodles', 'Spicy hakka noodles with shredded chicken', 240, 'rice', 0, 1],
      ['Kottu Parotta', 'Flaky parotta shredded & wok-tossed with eggs & masala', 220, 'rice', 0, 0],

      // DESSERTS
      ['Ice Cream Sundae', 'Three scoops with hot fudge, nuts & wafer', 180, 'dessert', 1, 0],
      ['Gulab Jamun', 'Warm milk-solid balls in rose-scented syrup', 80, 'dessert', 1, 0],
      ['Kheer', 'Creamy rice pudding with saffron & pistachios', 100, 'dessert', 1, 0],

      // DRINKS
      ['Mint Lemonade', 'Fresh mint, lemon & a hint of ginger soda', 80, 'drinks', 1, 0],
      ['Mango Lassi', 'Sweet Alphonso mango blended with chilled yogurt', 100, 'drinks', 1, 0],
      ['Masala Chai', 'Ginger cardamom spiced tea, just like home', 40, 'drinks', 1, 0],
      ['Fresh Lime Soda', 'Freshly squeezed lime, soda & black salt', 70, 'drinks', 1, 0],
    ];

    const stmt = db.prepare(
      `INSERT INTO menu_items (name, description, price, category, is_veg, is_spicy) VALUES (?,?,?,?,?,?)`
    );
    menuItems.forEach(item => stmt.run(item));
    stmt.finalize();

    console.log(`✅ Seeded ${menuItems.length} menu items`);
  });

  console.log('📦 Database initialized: aleef_garden.db');
});

module.exports = db;
