const path = require('path');
const bcrypt = require('bcrypt');

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
    // ==========================================
    // PRODUCTION (Render) - PostgreSQL
    // ==========================================
    const { Pool } = require('pg');
    const DB_URL = process.env.DATABASE_URL || "postgresql://havoc_db_user:DkwU5Ztf0GWG9Z6jwLzAo7XReDiisEc3@dpg-dal81c740ujc739rstb0-a.singapore-postgres.render.com/havoc_db";

    const pool = new Pool({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    function convertQuery(query) {
        let i = 1;
        let pgQuery = query.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
        pgQuery = pgQuery.replace(/\?/g, () => `$${i++}`);
        if (query.match(/INSERT OR IGNORE INTO/i)) {
            pgQuery += " ON CONFLICT DO NOTHING";
        }
        return pgQuery;
    }

    const db = {
        run: function (query, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (!params) params = [];
            pool.query(convertQuery(query), params, (err, res) => {
                if (callback) {
                    if (err) return callback.call(null, err);
                    callback.call({ lastID: 0, changes: res ? res.rowCount : 0 }, null);
                }
            });
        },
        get: function (query, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (!params) params = [];
            pool.query(convertQuery(query), params, (err, res) => {
                if (callback) {
                    if (err) return callback(err);
                    callback(null, res.rows ? res.rows[0] : null);
                }
            });
        },
        all: function (query, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (!params) params = [];
            pool.query(convertQuery(query), params, (err, res) => {
                if (callback) {
                    if (err) return callback(err);
                    callback(null, res.rows ? res.rows : []);
                }
            });
        },
        serialize: function (callback) {
            callback();
        },
        prepare: function (query) {
            return {
                run: (...args) => {
                    let params = args;
                    if (args.length > 0 && typeof args[args.length - 1] === 'function') {
                        params = args.slice(0, -1);
                    }
                    pool.query(convertQuery(query), params, (err) => {
                        if (err) console.error("Prepare run error:", err);
                    });
                },
                finalize: () => {}
            };
        }
    };

    const initDb = async () => {
        try {
            const client = await pool.connect();
            await client.query(`
                CREATE TABLE IF NOT EXISTS coupons (id SERIAL PRIMARY KEY, code TEXT UNIQUE, type TEXT, value REAL, active INTEGER DEFAULT 1, expires_at TEXT, max_uses INTEGER, used_count INTEGER DEFAULT 0)
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS newsletter_subscribers (id SERIAL PRIMARY KEY, email TEXT UNIQUE, subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT, type TEXT, price REAL, compare_price REAL, stock_quantity INTEGER DEFAULT 0, description TEXT, image_url TEXT, options TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, order_id TEXT UNIQUE, name TEXT, email TEXT, phone TEXT, item_name TEXT, price REAL, booking_date TEXT, booking_time TEXT, status TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS slots (id SERIAL PRIMARY KEY, time_range TEXT UNIQUE, active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0)
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS admin_auth (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, totp_secret TEXT, must_change_password INTEGER DEFAULT 0, role TEXT DEFAULT 'staff')
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS inventory_overrides (id SERIAL PRIMARY KEY, product_id INTEGER, date_str TEXT, time_range TEXT, override_quantity INTEGER, UNIQUE(product_id, date_str, time_range))
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS site_content (id SERIAL PRIMARY KEY, section_key TEXT UNIQUE, content_value TEXT)
            `);

            const res = await client.query("SELECT COUNT(*) as count FROM admin_auth");
            if (res.rows[0].count == 0) {
                const hash = await bcrypt.hash('password123', 10);
                await client.query("INSERT INTO admin_auth (username, password_hash) VALUES ($1, $2)", ['admin', hash]);
            }
            client.release();
        } catch (err) {
            console.error("Error initializing DB:", err);
        }
    };

    initDb();
    module.exports = db;

} else {
    // ==========================================
    // LOCAL / DEVELOPMENT - SQLite
    // ==========================================
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'havoc.db');
    const db = new sqlite3.Database(dbPath);

    const initDb = () => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, type TEXT, value REAL, active INTEGER DEFAULT 1)`);
            db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, price REAL, compare_price REAL, stock_quantity INTEGER DEFAULT 0, description TEXT, image_url TEXT, options TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            
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
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT UNIQUE, name TEXT, email TEXT, phone TEXT, item_name TEXT, price REAL, booking_date TEXT, booking_time TEXT, status TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            db.run(`CREATE TABLE IF NOT EXISTS slots (id INTEGER PRIMARY KEY AUTOINCREMENT, time_range TEXT UNIQUE, active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0)`);
            
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
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS admin_auth (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, totp_secret TEXT, must_change_password INTEGER DEFAULT 0, role TEXT DEFAULT 'staff')`);
            db.run(`ALTER TABLE admin_auth ADD COLUMN role TEXT DEFAULT 'staff'`, (err) => {
                if (!err) {
                    db.run(`UPDATE admin_auth SET role = 'super_admin' WHERE username = 'admin'`);
                }
            });

            db.run(`ALTER TABLE products ADD COLUMN description TEXT`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN image_url TEXT`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN options TEXT`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN compare_price REAL`, () => {});
            db.run(`ALTER TABLE slots ADD COLUMN sort_order INTEGER DEFAULT 0`, () => {});
            db.run(`ALTER TABLE coupons ADD COLUMN expires_at TEXT`, () => {});
            db.run(`ALTER TABLE coupons ADD COLUMN max_uses INTEGER`, () => {});
            db.run(`ALTER TABLE coupons ADD COLUMN used_count INTEGER DEFAULT 0`, () => {});

            db.run(`CREATE TABLE IF NOT EXISTS inventory_overrides (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, date_str TEXT, time_range TEXT, override_quantity INTEGER, UNIQUE(product_id, date_str, time_range))`);

            db.get("SELECT COUNT(*) as count FROM admin_auth", async (err, row) => {
                if (!err && row.count === 0) {
                    const hash = await bcrypt.hash('password123', 10);
                    db.run("INSERT INTO admin_auth (username, password_hash) VALUES (?, ?)", ['admin', hash]);
                }
            });
        });
    };

    initDb();
    module.exports = db;
}
