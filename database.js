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

        // Seed some initial coupons if none exist
        db.get("SELECT COUNT(*) as count FROM coupons", (err, row) => {
            if (!err && row.count === 0) {
                const stmt = db.prepare("INSERT INTO coupons (code, type, value) VALUES (?, ?, ?)");
                stmt.run("HAVOC10", "percent", 10);
                stmt.run("FIRST50", "flat", 50);
                stmt.run("VIP", "percent", 20);
                stmt.finalize();
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
