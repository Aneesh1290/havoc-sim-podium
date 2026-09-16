const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const DB_URL = process.env.DATABASE_URL || "postgresql://havoc_db_user:DkwU5Ztf0GWG9Z6jwLzAo7XReDiisEc3@dpg-dal81c740ujc739rstb0-a.singapore-postgres.render.com/havoc_db";

const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
});

function convertQuery(query) {
    let i = 1;
    // Special case for SQLite INSERT OR IGNORE
    let pgQuery = query.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
    // Replace ? with $1, $2
    pgQuery = pgQuery.replace(/\?/g, () => `$${i++}`);
    
    // Add ON CONFLICT DO NOTHING if it was an INSERT OR IGNORE
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
        
        // Handle SQLite transaction commands by bypassing param conversion if not needed
        pool.query(convertQuery(query), params, (err, res) => {
            if (callback) {
                if (err) return callback.call(null, err);
                // Provide a mock for `this.lastID` and `this.changes`
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
        // PG doesn't strictly need this, but we execute the callback synchronously
        callback();
    },
    prepare: function (query) {
        // Very basic mock for db.prepare used in server.js/database.js for bulk inserts
        return {
            run: (...args) => {
                let params = args;
                // Last arg might be a callback, in prepare it's usually not used, but let's be safe
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
        
        // 1. Coupons
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE,
                type TEXT,
                value REAL,
                active INTEGER DEFAULT 1,
                expires_at TEXT,
                max_uses INTEGER,
                used_count INTEGER DEFAULT 0
            )
        `);
        
        // 2. Newsletter
        await client.query(`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE,
                subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 3. Products
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT,
                type TEXT,
                price REAL,
                compare_price REAL,
                stock_quantity INTEGER DEFAULT 0,
                description TEXT,
                image_url TEXT,
                options TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 4. Bookings
        await client.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                order_id TEXT UNIQUE,
                name TEXT,
                email TEXT,
                phone TEXT,
                item_name TEXT,
                price REAL,
                booking_date TEXT,
                booking_time TEXT,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 5. Slots
        await client.query(`
            CREATE TABLE IF NOT EXISTS slots (
                id SERIAL PRIMARY KEY,
                time_range TEXT UNIQUE,
                active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0
            )
        `);
        
        // 6. Admin Auth
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_auth (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password_hash TEXT,
                totp_secret TEXT,
                must_change_password INTEGER DEFAULT 0,
                role TEXT DEFAULT 'staff'
            )
        `);
        
        // 7. Inventory Overrides
        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory_overrides (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                date_str TEXT,
                time_range TEXT,
                override_quantity INTEGER,
                UNIQUE(product_id, date_str, time_range)
            )
        `);

        // 8. Site content
        await client.query(`
            CREATE TABLE IF NOT EXISTS site_content (
                id SERIAL PRIMARY KEY,
                section_key TEXT UNIQUE,
                content_value TEXT
            )
        `);

        // Seed default admin if none exist (admin / password123)
        const res = await client.query("SELECT COUNT(*) as count FROM admin_auth");
        if (res.rows[0].count == 0) {
            const saltRounds = 10;
            const hash = await bcrypt.hash('password123', saltRounds);
            await client.query("INSERT INTO admin_auth (username, password_hash) VALUES ($1, $2)", ['admin', hash]);
            console.log("Seeded default admin user: admin / password123");
        }

        client.release();
    } catch (err) {
        console.error("Error initializing DB:", err);
    }
};

initDb();

module.exports = db;
