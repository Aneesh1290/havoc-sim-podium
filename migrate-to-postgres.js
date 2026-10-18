const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const DB_URL = process.env.DATABASE_URL;
const SQLITE_FILE = path.join(__dirname, 'havoc_backup_2026-10-16.db');

const pgPool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
});

const sqliteDb = new sqlite3.Database(SQLITE_FILE);

async function runMigration() {
    console.log("=== STARTING POSTGRESQL MIGRATION FROM BACKUP ===");
    const client = await pgPool.connect();

    try {
        console.log("1. Creating tables in PostgreSQL...");

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

        // 2. Newsletter Subscribers
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
                hide_suffix INTEGER DEFAULT 0,
                images_json TEXT DEFAULT '[]',
                two_player_price REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Slots
        await client.query(`
            CREATE TABLE IF NOT EXISTS slots (
                id SERIAL PRIMARY KEY,
                time_range TEXT UNIQUE,
                active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0
            )
        `);

        // 5. Admin Auth
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

        // 6. Settings
        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
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

        // 8. Instructors
        await client.query(`
            CREATE TABLE IF NOT EXISTS instructors (
                id SERIAL PRIMARY KEY,
                name TEXT,
                age INTEGER,
                role TEXT,
                key_achievement TEXT,
                status TEXT DEFAULT 'Available',
                photo_url TEXT,
                biography TEXT,
                fee REAL DEFAULT 500,
                email TEXT,
                phone TEXT,
                simulator_type TEXT DEFAULT 'All',
                password_hash TEXT,
                schedule_json TEXT,
                username TEXT,
                must_change_password INTEGER DEFAULT 1,
                reset_otp TEXT,
                reset_otp_expires_at BIGINT,
                notice_hours INTEGER DEFAULT 0
            )
        `);

        // 9. Bookings
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                instructor_id INTEGER,
                instructor_fee REAL DEFAULT 0,
                players INTEGER DEFAULT 1,
                player_two_name TEXT
            )
        `);

        // 10. SHARED BRIDGE: simulator_slot_locks
        // Common across both Havoc Sim Podium and Havoc RC Fun Zone
        await client.query(`
            CREATE TABLE IF NOT EXISTS simulator_slot_locks (
                id SERIAL PRIMARY KEY,
                simulator_name TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                booking_time TEXT NOT NULL,
                source_platform TEXT NOT NULL,
                source_order_id TEXT NOT NULL,
                customer_name TEXT,
                customer_phone TEXT,
                status TEXT DEFAULT 'CONFIRMED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (simulator_name, booking_date, booking_time)
            )
        `);

        console.log("All tables created successfully.");

        // Helper to migrate table
        async function migrateTable(tableName, columns, primaryKey = 'id') {
            return new Promise((resolve, reject) => {
                sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
                    if (err) {
                        console.warn(`Warning: Could not read table ${tableName}: ${err.message}`);
                        return resolve();
                    }

                    if (!rows || rows.length === 0) {
                        console.log(`Table ${tableName}: 0 rows to migrate.`);
                        return resolve();
                    }

                    console.log(`Table ${tableName}: Migrating ${rows.length} rows...`);
                    await client.query(`TRUNCATE ${tableName} RESTART IDENTITY CASCADE`);

                    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
                    const insertSql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

                    for (const row of rows) {
                        const vals = columns.map(c => row[c] === undefined ? null : row[c]);
                        await client.query(insertSql, vals);
                    }

                    if (primaryKey) {
                        const maxRes = await client.query(`SELECT MAX(${primaryKey}) FROM ${tableName}`);
                        const maxVal = maxRes.rows[0].max;
                        if (maxVal && typeof maxVal === 'number') {
                            await client.query(`SELECT setval(pg_get_serial_sequence('${tableName}', '${primaryKey}'), ${maxVal})`);
                        }
                    }

                    console.log(`Table ${tableName}: Successfully migrated ${rows.length} rows.`);
                    resolve();
                });
            });
        }

        // Migrate each table
        await migrateTable("coupons", ["id", "code", "type", "value", "active", "expires_at", "max_uses", "used_count"]);
        await migrateTable("newsletter_subscribers", ["id", "email", "subscribed_at"]);
        await migrateTable("products", ["id", "name", "type", "price", "compare_price", "stock_quantity", "description", "image_url", "options", "hide_suffix", "images_json", "two_player_price", "created_at"]);
        await migrateTable("slots", ["id", "time_range", "active", "sort_order"]);
        await migrateTable("admin_auth", ["id", "username", "password_hash", "totp_secret", "must_change_password", "role"]);
        await migrateTable("settings", ["key", "value"], null);
        await migrateTable("inventory_overrides", ["id", "product_id", "date_str", "time_range", "override_quantity"]);
        await migrateTable("instructors", ["id", "name", "age", "role", "key_achievement", "status", "photo_url", "biography", "fee", "email", "phone", "simulator_type", "password_hash", "schedule_json", "username", "must_change_password", "reset_otp", "reset_otp_expires_at", "notice_hours"]);
        await migrateTable("bookings", ["id", "order_id", "name", "email", "phone", "item_name", "price", "booking_date", "booking_time", "status", "created_at", "instructor_id", "instructor_fee", "players", "player_two_name"]);

        // Populate simulator_slot_locks from active bookings
        console.log("\nPopulating simulator_slot_locks from active bookings...");
        await client.query("TRUNCATE simulator_slot_locks RESTART IDENTITY CASCADE");
        
        const activeBookingsRes = await client.query(`
            SELECT id, order_id, item_name, booking_date, booking_time, name, phone, status
            FROM bookings
            WHERE status IN ('PAID', 'ATTENDED', 'PENDING', 'SUCCESS', 'CASH')
            ORDER BY id ASC
        `);

        let locksCreated = 0;
        for (const b of activeBookingsRes.rows) {
            try {
                await client.query(`
                    INSERT INTO simulator_slot_locks 
                        (simulator_name, booking_date, booking_time, source_platform, source_order_id, customer_name, customer_phone, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (simulator_name, booking_date, booking_time) DO UPDATE 
                    SET source_order_id = excluded.source_order_id, status = excluded.status
                `, [b.item_name, b.booking_date, b.booking_time, 'HAVOC_SIM_PODIUM', b.order_id, b.name, b.phone, b.status]);
                locksCreated++;
            } catch (err) {
                console.warn(`Lock skipped for ${b.item_name} on ${b.booking_date} ${b.booking_time}:`, err.message);
            }
        }
        console.log(`Created ${locksCreated} slot lock records in simulator_slot_locks.`);

        console.log("\n=== VERIFYING FINAL POSTGRESQL ROW COUNTS ===");
        const tables = ['coupons', 'newsletter_subscribers', 'products', 'slots', 'admin_auth', 'settings', 'inventory_overrides', 'instructors', 'bookings', 'simulator_slot_locks'];
        for (const t of tables) {
            const countRes = await client.query(`SELECT COUNT(*) as count FROM ${t}`);
            console.log(`- ${t}: ${countRes.rows[0].count} rows`);
        }

        console.log("\n MIGRATION COMPLETED SUCCESSFULLY!");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        client.release();
        await pgPool.end();
        sqliteDb.close();
    }
}

runMigration();
