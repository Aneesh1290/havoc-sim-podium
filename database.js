const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_URL = process.env.DATABASE_URL || "postgresql://slots_db_yqvv_user:feguu4oTsGEZ2TVGok9U0ylcphlCftjh@dpg-db941hft5n8s73e7qt1g-a.singapore-postgres.render.com/slots_db_yqvv";

let db = null;

if (DB_URL) {
    console.log("[Database] Connecting to PostgreSQL (Render)...");
    const pool = new Pool({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        keepAlive: true
    });

    // Helper: translate SQLite SQL dialect and ? placeholders to PostgreSQL $1, $2, ...
    function convertQuery(sql, params = []) {
        let paramIndex = 1;
        let converted = sql.replace(/\?/g, () => `$${paramIndex++}`);

        // SQLite date/time conversions to PostgreSQL
        converted = converted.replace(/datetime\(created_at\)\s*<=\s*datetime\('now',\s*'-15 minutes'\)/gi, "created_at <= NOW() - INTERVAL '15 minutes'");
        converted = converted.replace(/created_at\s*>=\s*date\('now',\s*\$([0-9]+)\)/gi, (m, g1) => `created_at >= NOW() - ($${g1}::text || ' days')::interval`);
        converted = converted.replace(/booking_date\s*>=\s*date\('now',\s*'-1 day'\)/gi, "1=1");
        converted = converted.replace(/date_str\s*>=\s*date\('now',\s*'-1 day'\)/gi, "1=1");
        converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, table, cols, vals) => {
            return `INSERT INTO ${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`;
        });

        // Normalize params array
        const normalizedParams = Array.isArray(params) ? params.map(p => {
            if (p === undefined) return null;
            if (typeof p === 'string' && p.startsWith('-') && p.endsWith(' days')) {
                // e.g. "-30 days" -> "30"
                return p.replace(/[^0-9]/g, '');
            }
            return p;
        }) : [];

        return { text: converted, values: normalizedParams };
    }

    // Helper: whenever a booking is created or updated, synchronize simulator_slot_locks
    async function syncSlotLock(sql, params) {
        try {
            const lower = (sql || '').toLowerCase();
            if (lower.includes('insert into bookings')) {
                // INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, ...)
                // Parameters: order_id, name, email, phone, item_name, price, booking_date, booking_time, status
                const orderId = params[0];
                const customerName = params[1];
                const phone = params[3];
                const itemName = params[4];
                const bookingDate = params[6];
                const bookingTime = params[7];
                const status = params[8] || 'PENDING';

                if (itemName && bookingDate && bookingTime) {
                    await pool.query(`
                        INSERT INTO simulator_slot_locks 
                            (simulator_name, booking_date, booking_time, source_platform, source_order_id, customer_name, customer_phone, status)
                        VALUES ($1, $2, $3, 'HAVOC_SIM_PODIUM', $4, $5, $6, $7)
                        ON CONFLICT (simulator_name, booking_date, booking_time) DO UPDATE 
                        SET source_order_id = excluded.source_order_id,
                            status = excluded.status,
                            customer_name = excluded.customer_name,
                            customer_phone = excluded.customer_phone
                    `, [itemName, bookingDate, bookingTime, orderId, customerName, phone, status]);
                }
            } else if (lower.includes("update bookings set status = 'paid'")) {
                const match = params && params[0];
                if (match) {
                    const cleanPrefix = String(match).replace(/%/g, '');
                    await pool.query(`UPDATE simulator_slot_locks SET status = 'PAID' WHERE source_order_id LIKE $1`, [`${cleanPrefix}%`]);
                }
            } else if (lower.includes("update bookings set status = 'attended'")) {
                const match = params && params[0];
                if (match) {
                    const cleanPrefix = String(match).replace(/%/g, '');
                    await pool.query(`UPDATE simulator_slot_locks SET status = 'ATTENDED' WHERE source_order_id LIKE $1`, [`${cleanPrefix}%`]);
                }
            } else if (lower.includes('update bookings set status = ?')) {
                const newStatus = (params[0] || '').toUpperCase();
                const match = params[1];
                if (match) {
                    const cleanPrefix = String(match).replace(/%/g, '');
                    if (newStatus === 'CANCELLED') {
                        await pool.query(`DELETE FROM simulator_slot_locks WHERE source_order_id LIKE $1`, [`${cleanPrefix}%`]);
                    } else {
                        await pool.query(`UPDATE simulator_slot_locks SET status = $1 WHERE source_order_id LIKE $2`, [newStatus, `${cleanPrefix}%`]);
                    }
                }
            } else if (lower.includes('delete from bookings where order_id like') || lower.includes("status = 'pending' and created_at <=")) {
                if (lower.includes('order_id like')) {
                    const match = params && params[0];
                    if (match) {
                        const cleanPrefix = String(match).replace(/%/g, '');
                        await pool.query(`DELETE FROM simulator_slot_locks WHERE source_order_id LIKE $1`, [`${cleanPrefix}%`]);
                    }
                } else {
                    // Expired pending bookings cleanup (exclude PAYDUE desk bookings)
                    await pool.query(`DELETE FROM simulator_slot_locks WHERE status = 'PENDING' AND source_order_id NOT LIKE 'PAYDUE%' AND created_at <= NOW() - INTERVAL '15 minutes'`);
                }
            }
        } catch (lockErr) {
            console.warn('[Slot Lock Sync Notice]', lockErr.message);
        }
    }

    db = {
        pool,
        isPostgres: true,

        all: function(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            const q = convertQuery(sql, params);
            pool.query(q.text, q.values, (err, res) => {
                if (err) {
                    console.error('[PG Error in all()]', err.message, q.text, q.values);
                    return callback ? callback(err) : null;
                }
                if (callback) callback(null, res.rows);
            });
        },

        get: function(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            const q = convertQuery(sql, params);
            pool.query(q.text, q.values, (err, res) => {
                if (err) {
                    console.error('[PG Error in get()]', err.message, q.text, q.values);
                    return callback ? callback(err) : null;
                }
                if (callback) callback(null, res.rows[0] || null);
            });
        },

        run: function(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            const q = convertQuery(sql, params);
            const context = { changes: 0, lastID: null };

            pool.query(q.text, q.values, async (err, res) => {
                if (err) {
                    console.error('[PG Error in run()]', err.message, q.text, q.values);
                    if (callback) callback.call(context, err);
                    return;
                }
                context.changes = res.rowCount || 0;
                
                // Asynchronously sync slot locks if applicable
                await syncSlotLock(sql, params);

                if (callback) callback.call(context, null);
            });
        },

        prepare: function(sql) {
            return {
                run: (params, callback) => {
                    db.run(sql, params, callback);
                },
                finalize: () => {}
            };
        },

        serialize: function(fn) {
            if (fn) fn();
        }
    };

    console.log("[Database] PostgreSQL adapter ready.");
} else {
    console.log("[Database] No DATABASE_URL found. Falling back to local SQLite...");
    const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'havoc.db');
    db = new sqlite3.Database(dbPath);
}

module.exports = db;
