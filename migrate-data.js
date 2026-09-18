const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

const DB_URL = "postgresql://havoc_db_user:DkwU5Ztf0GWG9Z6jwLzAo7XReDiisEc3@dpg-dal81c740ujc739rstb0-a.singapore-postgres.render.com/havoc_db";
const SQLITE_FILE = path.join(__dirname, 'havoc_backup_2026-09-16.db');

const pgPool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false } //Required for Render Postgres
});

const sqliteDb = new sqlite3.Database(SQLITE_FILE);

async function migrate() {
    console.log("Starting migration...");

    const client = await pgPool.connect();

    try {
        console.log("Creating PostgreSQL tables...");

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

        // 8. Site Content (if it exists, from server.js it seems to)
        await client.query(`
            CREATE TABLE IF NOT EXISTS site_content (
                id SERIAL PRIMARY KEY,
                section_key TEXT UNIQUE,
                content_value TEXT
            )
        `);

        console.log("Tables created successfully.");

        // Helper function to read from SQLite and insert to PG
        async function migrateTable(tableName, columns) {
            return new Promise((resolve, reject) => {
                sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
                    if (err) {
                        // Table might not exist, that's fine for site_content if it was created dynamically
                        if (err.message.includes("no such table")) {
                            console.log(`Table ${tableName} does not exist in SQLite. Skipping.`);
                            return resolve();
                        }
                        return reject(err);
                    }

                    if (rows.length === 0) {
                        console.log(`Table ${tableName} is empty.`);
                        return resolve();
                    }

                    console.log(`Migrating ${rows.length} rows for table: ${tableName}`);

                    // Clear existing PG data (since it's a fresh migration)
                    await client.query(`TRUNCATE ${tableName} RESTART IDENTITY CASCADE`);

                    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
                    const insertQuery = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

                    for (const row of rows) {
                        const values = columns.map(col => row[col]);
                        await client.query(insertQuery, values);
                    }

                    // Reset PostgreSQL sequence so new inserts don't fail with duplicate IDs
                    const maxIdRes = await client.query(`SELECT MAX(id) FROM ${tableName}`);
                    const maxId = maxIdRes.rows[0].max;
                    if (maxId) {
                        await client.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), ${maxId})`);
                    }

                    console.log(`Finished migrating ${tableName}.`);
                    resolve();
                });
            });
        }

        await migrateTable("coupons", ["id", "code", "type", "value", "active", "expires_at", "max_uses", "used_count"]);
        await migrateTable("newsletter_subscribers", ["id", "email", "subscribed_at"]);
        await migrateTable("products", ["id", "name", "type", "price", "compare_price", "stock_quantity", "description", "image_url", "options", "created_at"]);
        await migrateTable("bookings", ["id", "order_id", "name", "email", "phone", "item_name", "price", "booking_date", "booking_time", "status", "created_at"]);
        await migrateTable("slots", ["id", "time_range", "active", "sort_order"]);
        await migrateTable("admin_auth", ["id", "username", "password_hash", "totp_secret", "must_change_password", "role"]);
        await migrateTable("inventory_overrides", ["id", "product_id", "date_str", "time_range", "override_quantity"]);
        await migrateTable("site_content", ["id", "section_key", "content_value"]);

        console.log("Migration complete!");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        client.release();
        await pgPool.end();
        sqliteDb.close();
    }
}

migrate();
