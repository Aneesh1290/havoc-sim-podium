const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'havoc.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
    db.serialize(() => {
        // 1. Coupons Table
        db.run(`CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            type TEXT, -- 'percent' or 'flat'
            value REAL,
            active INTEGER DEFAULT 1
        )`);

        // 1.5. Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT,
            price REAL,
            compare_price REAL,
            stock_quantity INTEGER DEFAULT 0,
            description TEXT,
            image_url TEXT,
            options TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Auto-seed default products if empty
        db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
            if (!err && row.count === 0) {
                const defaultProducts = [
                    { name: "RC Flying Sim", type: "Simulator", price: 300, stock: 10 },
                    { name: "Flight Sim Pro (Airbus Edition)", type: "Simulator", price: 1500, stock: 10 },
                    { name: "Flight Sim Pro (Boeing Edition)", type: "Simulator", price: 1500, stock: 10 },
                    { name: "Race Sim GT", type: "Simulator", price: 500, stock: 10 },
                    { name: "Race Sim F1", type: "Simulator", price: 600, stock: 10 },
                    { name: "Race Sim Jr.", type: "Simulator", price: 400, stock: 10 },
                    { name: "Race Sim Beginner", type: "Simulator", price: 300, stock: 10 }
                ];
                const stmt = db.prepare("INSERT INTO products (name, type, price, stock_quantity) VALUES (?, ?, ?, ?)");
                defaultProducts.forEach(p => stmt.run(p.name, p.type, p.price, p.stock));
                stmt.finalize();
                console.log("Auto-seeded default products.");
            }
        });

        // 2. Bookings Table
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE,
            name TEXT,
            email TEXT,
            phone TEXT,
            item_name TEXT,
            price REAL,
            booking_date TEXT,
            booking_time TEXT,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2.5 Slots Table
        db.run(`CREATE TABLE IF NOT EXISTS slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            time_range TEXT UNIQUE,
            active INTEGER DEFAULT 1
        )`);

        // Auto-seed default slots if empty
        db.get("SELECT COUNT(*) AS count FROM slots", (err, row) => {
            if (!err && row.count === 0) {
                const defaultSlots = [
                    "11:00 AM - 11:30 AM", "11:30 AM - 12:00 PM",
                    "12:00 PM - 12:30 PM", "12:30 PM - 01:00 PM",
                    "02:00 PM - 02:30 PM", "02:30 PM - 03:00 PM",
                    "03:00 PM - 03:30 PM", "03:30 PM - 04:00 PM",
                    "04:00 PM - 04:30 PM", "04:30 PM - 05:00 PM",
                    "05:00 PM - 05:30 PM", "05:30 PM - 06:00 PM",
                    "06:00 PM - 06:30 PM", "06:30 PM - 07:00 PM",
                    "07:00 PM - 07:30 PM", "07:30 PM - 08:00 PM",
                    "08:00 PM - 08:30 PM", "08:30 PM - 09:00 PM",
                    "09:00 PM - 09:30 PM", "09:30 PM - 10:00 PM"
                ];
                const stmt = db.prepare("INSERT INTO slots (time_range, active) VALUES (?, 1)");
                defaultSlots.forEach(s => stmt.run(s));
                stmt.finalize();
                console.log("Auto-seeded default time slots.");
            }
        });

        // 3. Admin Auth Table
        db.run(`CREATE TABLE IF NOT EXISTS admin_auth (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            totp_secret TEXT,
            must_change_password INTEGER DEFAULT 0,
            role TEXT DEFAULT 'staff'
        )`);

        // Migration to add 'role' column if it doesn't exist
        db.run(`ALTER TABLE admin_auth ADD COLUMN role TEXT DEFAULT 'staff'`, (err) => {
            if (!err) {
                console.log("Added 'role' column to admin_auth table.");
                // Set the default admin to super_admin
                db.run(`UPDATE admin_auth SET role = 'super_admin' WHERE username = 'admin'`);
            }
        });

        // Migrations for products table (missing columns from fresh deploy)
        db.run(`ALTER TABLE products ADD COLUMN description TEXT`, () => {});
        db.run(`ALTER TABLE products ADD COLUMN image_url TEXT`, () => {});
        db.run(`ALTER TABLE products ADD COLUMN options TEXT`, () => {});
        db.run(`ALTER TABLE products ADD COLUMN compare_price REAL`, () => {});

        // Migrations for coupons table (expiry + usage limits)
        db.run(`ALTER TABLE coupons ADD COLUMN expires_at TEXT`, () => {});
        db.run(`ALTER TABLE coupons ADD COLUMN max_uses INTEGER`, () => {});
        db.run(`ALTER TABLE coupons ADD COLUMN used_count INTEGER DEFAULT 0`, () => {});

        // Inventory Overrides Table
        db.run(`CREATE TABLE IF NOT EXISTS inventory_overrides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            date_str TEXT,
            time_range TEXT,
            override_quantity INTEGER,
            UNIQUE(product_id, date_str, time_range)
        )`);

        // Seed default admin if none exist (admin / password123)
        db.get("SELECT COUNT(*) as count FROM admin_auth", async (err, row) => {
            if (!err && row.count === 0) {
                const saltRounds = 10;
                const hash = await bcrypt.hash('password123', saltRounds);
                db.run("INSERT INTO admin_auth (username, password_hash) VALUES (?, ?)", ['admin', hash]);
                console.log("Seeded default admin user: admin / password123");
            }
        });
    });
};

initDb();

module.exports = db;
