// =============================================
// HAVOC SIM PODIUM — Cashfree Backend Server
// =============================================

require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const db = require('./database');
const { sendConfirmationEmail, sendBulkEmail, sendInstructorEmail } = require('./mailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { SdkClient } = require('@icici/http-core');
const { CollectPayRequestDTO } = require('@icici/eazypay');
const {
    WRISTBAND_PALETTE,
    DEFAULT_SLOT_COLORS,
    COLOR_NAME_TO_HEX,
    resolveColorNameToHex,
    getSlotWristbandColor,
    getWristbandBadgeStyle
} = require('./slotColors');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

function saveBase64ImageFile(dataUri, prefix = 'img') {
    if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) return dataUri;
    try {
        const matches = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length < 3) return dataUri;
        let ext = matches[1].toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
        return `/assets/uploads/${filename}`;
    } catch (e) {
        return dataUri;
    }
}

function saveUploadedBufferFile(file, prefix = 'upload') {
    if (!file || !file.buffer) return null;
    let ext = 'jpg';
    if (file.mimetype && file.mimetype.includes('png')) ext = 'png';
    else if (file.mimetype && file.mimetype.includes('webp')) ext = 'webp';
    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
    return `/assets/uploads/${filename}`;
}

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024,  // 10MB per file
        fieldSize: 30 * 1024 * 1024   // 30MB per field (for base64 existing images)
    }
});


const helmet = require('helmet');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'havoc-super-secret-key-123';

// =========================================================================
// AUTOMATIC SCHEMA INITIALIZATION (Ensures all tables exist on new DBs)
// =========================================================================

// 1. Admin Auth table
db.run(`
    CREATE TABLE IF NOT EXISTS admin_auth (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        totp_secret TEXT,
        must_change_password INTEGER DEFAULT 0,
        role TEXT DEFAULT 'staff',
        permissions TEXT DEFAULT 'all'
    )
`, [], (err) => {
    if (err) {
        db.run(`
            CREATE TABLE IF NOT EXISTS admin_auth (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                totp_secret TEXT,
                must_change_password INTEGER DEFAULT 0,
                role TEXT DEFAULT 'staff',
                permissions TEXT DEFAULT 'all'
            )
        `, [], () => { });
    }
});

// 2. Settings table
db.run(`
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
`, [], () => { });

// 3. Coupons table
db.run(`
    CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE,
        type TEXT,
        value REAL,
        active INTEGER DEFAULT 1,
        expires_at TEXT,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        allowed_simulators TEXT,
        max_sessions INTEGER
    )
`, [], (err) => {
    if (err) {
        db.run(`
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE,
                type TEXT,
                value REAL,
                active INTEGER DEFAULT 1,
                expires_at TEXT,
                max_uses INTEGER,
                used_count INTEGER DEFAULT 0,
                allowed_simulators TEXT,
                max_sessions INTEGER
            )
        `, [], () => { });
    }
});

// 4. Products table
db.run(`
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
`, [], (err) => {
    if (err) {
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        `, [], () => { });
    }
});

// 5. Bookings table
db.run(`
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
        player_two_name TEXT,
        payment_ref TEXT,
        wristband_number TEXT,
        whatsapp_consent INTEGER DEFAULT 1
    )
`, [], (err) => {
    if (err) {
        db.run(`
            CREATE TABLE IF NOT EXISTS bookings (
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                instructor_id INTEGER,
                instructor_fee REAL DEFAULT 0,
                players INTEGER DEFAULT 1,
                player_two_name TEXT,
                payment_ref TEXT,
                wristband_number TEXT,
                whatsapp_consent INTEGER DEFAULT 1
            )
        `, [], () => { });
    }
});

// 6. Instructors table
db.run(`
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
`, [], () => { });

// 7. Slots table
db.run(`
    CREATE TABLE IF NOT EXISTS slots (
        id SERIAL PRIMARY KEY,
        time_range TEXT UNIQUE,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
    )
`, [], (err) => {
    if (err) {
        db.run(`
            CREATE TABLE IF NOT EXISTS slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                time_range TEXT UNIQUE,
                active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0
            )
        `, [], () => { });
    }
});

// 8. Inventory Overrides table
db.run(`
    CREATE TABLE IF NOT EXISTS inventory_overrides (
        id SERIAL PRIMARY KEY,
        product_id INTEGER,
        date_str TEXT,
        time_range TEXT,
        override_quantity INTEGER,
        UNIQUE(product_id, date_str, time_range)
    )
`, [], () => { });

// Ensure columns exist on tables if created previously
db.run("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_consent INTEGER DEFAULT 1", [], () => { });
db.run("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_ref TEXT", [], () => { });
db.run("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS wristband_number TEXT", [], () => { });
db.run("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS allowed_simulators TEXT", [], () => { });
db.run("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_sessions INTEGER", [], () => { });
db.run("ALTER TABLE admin_auth ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT 'all'", [], () => { });
db.run("ALTER TABLE products ADD COLUMN IF NOT EXISTS images_json TEXT DEFAULT '[]'", [], () => { });
db.run("ALTER TABLE products ADD COLUMN IF NOT EXISTS two_player_price REAL", [], () => { });

// Ensure payment_links table exists for custom admin payment requests
db.run(`
    CREATE TABLE IF NOT EXISTS payment_links (
        id SERIAL PRIMARY KEY,
        link_id TEXT UNIQUE NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        amount REAL NOT NULL,
        description TEXT,
        order_ids TEXT,
        status TEXT DEFAULT 'PENDING',
        icici_order_id TEXT,
        icici_txn_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP
    )
`, [], (err) => {
    if (err) {
        // SQLite fallback
        db.run(`
            CREATE TABLE IF NOT EXISTS payment_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                link_id TEXT UNIQUE NOT NULL,
                customer_name TEXT,
                customer_phone TEXT,
                customer_email TEXT,
                amount REAL NOT NULL,
                description TEXT,
                order_ids TEXT,
                status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP
            )
        `, [], () => { });
    }
});

// Ensure order_ids column exists in payment_links if table was already created
if (db.isPostgres) {
    db.pool.query("ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS order_ids TEXT", () => { });
    db.pool.query("ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS upgrade_data TEXT", () => { });
    db.pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS advance_reminder_sent INTEGER DEFAULT 0", () => { });
} else {
    db.run("ALTER TABLE payment_links ADD COLUMN order_ids TEXT", [], () => { });
    db.run("ALTER TABLE payment_links ADD COLUMN upgrade_data TEXT", [], () => { });
    db.run("ALTER TABLE bookings ADD COLUMN advance_reminder_sent INTEGER DEFAULT 0", [], () => { });
}

// Ensure blocked_slots table exists for global/date/simulator slot blocking
db.run(`
    CREATE TABLE IF NOT EXISTS blocked_slots (
        id SERIAL PRIMARY KEY,
        simulator_name TEXT DEFAULT 'ALL',
        booking_date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_sim_block UNIQUE (simulator_name, booking_date, time_slot)
    )
`, [], (err) => {
    if (err) {
        // SQLite fallback
        db.run(`
            CREATE TABLE IF NOT EXISTS blocked_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                simulator_name TEXT DEFAULT 'ALL',
                booking_date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(simulator_name, booking_date, time_slot)
            )
        `, [], () => { });
    }
});

// Ensure online_checkout_holds table exists for temporary payment gateway reservations
db.run(`
    CREATE TABLE IF NOT EXISTS online_checkout_holds (
        id SERIAL PRIMARY KEY,
        txn_id TEXT UNIQUE NOT NULL,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        amount REAL NOT NULL,
        items_json TEXT NOT NULL,
        whatsapp_consent INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, [], (err) => {
    if (err) {
        // SQLite fallback
        db.run(`
            CREATE TABLE IF NOT EXISTS online_checkout_holds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                txn_id TEXT UNIQUE NOT NULL,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                amount REAL NOT NULL,
                items_json TEXT NOT NULL,
                whatsapp_consent INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, [], () => { });
    }
});

// Ensure common shared band_items table exists (Shared with Havoc RC Fun Zone)
db.run(`
    CREATE TABLE IF NOT EXISTS band_items (
        id SERIAL PRIMARY KEY,
        band_code TEXT NOT NULL UNIQUE,
        color_name TEXT NOT NULL,
        color_hex TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Standard',
        status TEXT NOT NULL DEFAULT 'available',
        current_holder_name TEXT,
        current_booking_id INTEGER,
        current_order_number TEXT,
        total_uses INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, [], (err) => {
    if (err) {
        // SQLite fallback
        db.run(`
            CREATE TABLE IF NOT EXISTS band_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                band_code TEXT NOT NULL UNIQUE,
                color_name TEXT NOT NULL,
                color_hex TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Standard',
                status TEXT NOT NULL DEFAULT 'available',
                current_holder_name TEXT,
                current_booking_id INTEGER,
                current_order_number TEXT,
                total_uses INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, [], () => { });
    }
    // Create indexes for high-speed queries
    db.run("CREATE INDEX IF NOT EXISTS idx_band_items_code ON band_items(band_code)", [], () => { });
    db.run("CREATE INDEX IF NOT EXISTS idx_band_items_status ON band_items(status)", [], () => { });
    db.run("CREATE INDEX IF NOT EXISTS idx_band_items_color ON band_items(color_name)", [], () => { });

    // Ensure site_settings table exists for persistent flags (e.g. band_inventory_seeded)
    db.run(`
        CREATE TABLE IF NOT EXISTS site_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, [], (setErr) => {
        if (setErr) {
            db.run(`
                CREATE TABLE IF NOT EXISTS site_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, [], () => { });
        }
    });

    // Ensure wristband_number column exists on bookings table
    if (db.isPostgres && db.pool) {
        db.pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS wristband_number TEXT", () => { });
    } else {
        db.run("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS wristband_number TEXT", [], () => { });
    }
});

// Ensure common shared band_transactions audit log table exists (Shared with Havoc RC Fun Zone)
db.run(`
    CREATE TABLE IF NOT EXISTS band_transactions (
        id SERIAL PRIMARY KEY,
        band_id INTEGER NOT NULL,
        band_code TEXT NOT NULL,
        color_name TEXT NOT NULL,
        color_hex TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        customer_name TEXT,
        booking_id INTEGER,
        order_number TEXT,
        staff_name TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, [], (err) => {
    if (err) {
        // SQLite fallback
        db.run(`
            CREATE TABLE IF NOT EXISTS band_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                band_id INTEGER NOT NULL,
                band_code TEXT NOT NULL,
                color_name TEXT NOT NULL,
                color_hex TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                customer_name TEXT,
                booking_id INTEGER,
                order_number TEXT,
                staff_name TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, [], () => { });
    }
    db.run("CREATE INDEX IF NOT EXISTS idx_band_tx_band_id ON band_transactions(band_id)", [], () => { });
    db.run("CREATE INDEX IF NOT EXISTS idx_band_tx_type ON band_transactions(transaction_type)", [], () => { });
    db.run("CREATE INDEX IF NOT EXISTS idx_band_tx_created ON band_transactions(created_at)", [], () => { });

    // Ensure custom band categories & offers table exists (Shared pool)
    db.run(`
        CREATE TABLE IF NOT EXISTS band_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            badge_color TEXT DEFAULT '#E5B869',
            sort_order INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, [], (catErr) => {
        if (catErr) {
            db.run(`
                CREATE TABLE IF NOT EXISTS band_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    badge_color TEXT DEFAULT '#E5B869',
                    sort_order INTEGER DEFAULT 0,
                    active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, [], () => seedDefaultBandCategories());
        } else {
            seedDefaultBandCategories();
        }
    });
});

function seedDefaultBandCategories() {
    const defaults = [
        { name: "Standard", desc: "Regular session admission", color: "#94A3B8", order: 1 },
        { name: "Student Offer", desc: "College / School discount deal", color: "#38BDF8", order: 2 },
        { name: "Happy Hour", desc: "Afternoon / Off-peak promo pass", color: "#F59E0B", order: 3 },
        { name: "Weekend Pass", desc: "Weekend special tier", color: "#EC4899", order: 4 },
        { name: "VIP Racer", desc: "Premium simulator / unlimited lap tier", color: "#E5B869", order: 5 },
        { name: "Child / Junior", desc: "Junior track pass", color: "#10B981", order: 6 },
        { name: "Staff / Marshal", desc: "Internal crew & track marshals", color: "#8B5CF6", order: 7 }
    ];
    defaults.forEach(d => {
        db.run(
            `INSERT INTO band_categories (name, description, badge_color, sort_order, active)
             VALUES (?, ?, ?, ?, 1)
             ON CONFLICT (name) DO NOTHING`,
            [d.name, d.desc, d.color, d.order],
            () => {
                // SQLite fallback syntax if ON CONFLICT syntax differs
                db.run(
                    `INSERT OR IGNORE INTO band_categories (name, description, badge_color, sort_order, active)
                     VALUES (?, ?, ?, ?, 1)`,
                    [d.name, d.desc, d.color, d.order],
                    () => { }
                );
            }
        );
    });
}

// Ensure dedicated sim_podium_time_slots table exists (Independent for Sim Podium, never shared or synced with RC Fun Zone)
db.run(`
    CREATE TABLE IF NOT EXISTS sim_podium_time_slots (
        id SERIAL PRIMARY KEY,
        label VARCHAR(100) NOT NULL UNIQUE,
        start_hour NUMERIC,
        end_hour NUMERIC,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        color VARCHAR(50),
        color_name VARCHAR(100),
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, [], (tsErr) => {
    if (tsErr) {
        db.run(`
            CREATE TABLE IF NOT EXISTS sim_podium_time_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL UNIQUE,
                start_hour REAL,
                end_hour REAL,
                active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                color TEXT,
                color_name TEXT,
                remark TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, [], () => { });
    }
});

// Note: Automatic re-seeding is permanently disabled.
// If the admin deletes slots, the system MUST NEVER recreate them automatically.

// Redirect all secondary domains to canonical https://www.havocsim.in
app.use((req, res, next) => {
    const host = req.hostname;
    // Only redirect production domains (do not redirect localhost / render internal hostnames)
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.includes('onrender.com')) {
        if (host !== 'www.havocsim.in') {
            return res.redirect(301, 'https://www.havocsim.in' + req.originalUrl);
        }
    }
    next();
});


app.use(helmet({
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"]
        }
    }
}));
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve static assets with 7-day browser caching
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '7d' }));
// Serve all HTML, CSS, JS, and asset files from the project root
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));


// ICICI PG Direct Credentials & Environment
const ICICI_MERCHANT_ID = process.env.ICICI_MERCHANT_ID || '100000000531583';
const ICICI_SECRET_KEY = process.env.ICICI_SECRET_KEY || 'db06cca0-838b-4e01-8b20-6ac446ffb6bd';
const ICICI_AGGREGATOR_ID = process.env.ICICI_AGGREGATOR_ID || '100000000531582';
const ICICI_ENV = process.env.ICICI_ENV || 'live'; // 'uat' or 'live'

const getIciciBaseUrl = () => {
    return ICICI_ENV === 'live'
        ? 'https://pgpay.icici.bank.in/pg/api/v2'
        : 'https://pgpayuat.icicibank.com/tsp/pg/api/v2';
};

// ==========================================
// ADMIN DASHBOARD & 2FA ROUTES
// ==========================================

// Middleware to verify JWT and ensure user still exists in database
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized.' });

        // Check if user still exists in database
        db.get("SELECT id, username, role, permissions FROM admin_auth WHERE id = ?", [decoded.id], (dbErr, user) => {
            if (dbErr || !user) {
                return res.status(401).json({ error: 'User account has been deleted or deactivated.' });
            }
            req.user = user;
            next();
        });
    });
};

// Middleware to verify Super Admin
const verifySuperAdmin = (req, res, next) => {
    if (req.user.username !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }
    next();
};

// Middleware to verify specific permission or Super Admin
const checkPermission = (requiredPerm) => {
    return (req, res, next) => {
        if (req.user.username === 'admin' || req.user.role === 'super_admin') {
            return next();
        }
        if (req.user.permissions === 'all') return next();
        const perms = (req.user.permissions || '').split(',').map(p => p.trim());
        if (perms.includes(requiredPerm)) {
            return next();
        }
        return res.status(403).json({ error: `Access denied. Requires '${requiredPerm}' permission.` });
    };
};

app.get('/api/admin/me', verifyToken, (req, res) => {
    res.json({ username: req.user.username, role: req.user.role, permissions: req.user.permissions || '' });
});

// Newsletter Subscription
app.post('/api/newsletter', express.json(), (req, res) => {
    const email = req.body.email;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    db.run("INSERT INTO newsletter_subscribers (email) VALUES (?)", [email], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email is already subscribed.' });
            }
            return res.status(500).json({ error: 'Internal server error.' });
        }
        res.json({ success: true, message: 'Successfully subscribed!' });
    });
});

app.get('/api/admin/newsletter-subscribers', verifyToken, (req, res) => {
    db.all("SELECT id, email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch subscribers.' });
        res.json({ subscribers: rows });
    });
});

app.post('/api/admin/newsletter-send', verifyToken, async (req, res) => {
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required.' });

    db.all("SELECT email FROM newsletter_subscribers", [], async (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch subscribers.' });

        if (rows.length === 0) {
            return res.status(400).json({ error: 'No subscribers found.' });
        }

        const bccList = rows.map(r => r.email);
        const result = await sendBulkEmail(subject, body, bccList);

        if (result.success) {
            res.json({ success: true, message: `Email sent to ${bccList.length} subscribers.` });
        } else {
            res.status(500).json({ error: result.error || 'Failed to send bulk email.' });
        }
    });
});

// ==========================================
// SETTINGS ROUTES
// ==========================================

app.get('/api/settings/payment', (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'payment_methods'", (err, row) => {
        if (err || !row) return res.json({ cod: true, upi: true });
        try {
            res.json(JSON.parse(row.value));
        } catch (e) {
            res.json({ cod: true, upi: true });
        }
    });
});

app.post('/api/admin/settings/payment', verifyToken, verifySuperAdmin, (req, res) => {
    const { cod, upi } = req.body;
    const value = JSON.stringify({ cod: !!cod, upi: !!upi });

    db.run("UPDATE settings SET value = ? WHERE key = 'payment_methods'", [value], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update settings.' });
        if (this.changes === 0) {
            db.run("INSERT INTO settings (key, value) VALUES ('payment_methods', ?)", [value], (insertErr) => {
                if (insertErr) return res.status(500).json({ error: 'Failed to insert settings.' });
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

// Feature switches (e.g. Band Inventory & Desk Payment Link ON/OFF toggle per website)
app.get('/api/settings/features', (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'feature_switches'", (err, row) => {
        const defaults = { band_inventory_enabled: true, desk_payment_link_enabled: true, advance_notifications_enabled: true };
        if (err || !row) return res.json(defaults);
        try {
            const parsed = JSON.parse(row.value);
            res.json({
                band_inventory_enabled: parsed.band_inventory_enabled !== false,
                desk_payment_link_enabled: parsed.desk_payment_link_enabled !== false,
                advance_notifications_enabled: parsed.advance_notifications_enabled !== false
            });
        } catch (e) {
            res.json(defaults);
        }
    });
});

app.post('/api/admin/settings/features', verifyToken, (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'feature_switches'", (getErr, row) => {
        let current = { band_inventory_enabled: true, desk_payment_link_enabled: true, advance_notifications_enabled: true };
        if (!getErr && row && row.value) {
            try { current = { ...current, ...JSON.parse(row.value) }; } catch (e) { }
        }

        if (req.body.band_inventory_enabled !== undefined) {
            current.band_inventory_enabled = !!req.body.band_inventory_enabled;
        }
        if (req.body.desk_payment_link_enabled !== undefined) {
            current.desk_payment_link_enabled = !!req.body.desk_payment_link_enabled;
        }
        if (req.body.advance_notifications_enabled !== undefined) {
            current.advance_notifications_enabled = !!req.body.advance_notifications_enabled;
        }

        const value = JSON.stringify(current);

        db.run("UPDATE settings SET value = ? WHERE key = 'feature_switches'", [value], function (err) {
            if (err) return res.status(500).json({ error: 'Failed to update feature settings.' });
            if (this.changes === 0) {
                db.run("INSERT INTO settings (key, value) VALUES ('feature_switches', ?)", [value], (insertErr) => {
                    if (insertErr) return res.status(500).json({ error: 'Failed to insert feature settings.' });
                    res.json({ success: true, ...current });
                });
            } else {
                res.json({ success: true, ...current });
            }
        });
    });
});

// 1. Admin Login (Username + Password + TOTP)
app.post('/api/admin/login', (req, res) => {
    const { username, password, token } = req.body;

    db.get("SELECT * FROM admin_auth WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials.' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

        // If TOTP is set, verify the token (DISABLED FOR NOW)
        /*
        if (user.totp_secret) {
            if (!token) {
                return res.status(401).json({ error: '2FA token required.', require2FA: true });
            }
            
            const isValid = speakeasy.totp.verify({
                secret: user.totp_secret,
                encoding: 'base32',
                token: token
            });
            if (!isValid) return res.status(401).json({ error: 'Invalid 2FA code.' });
        } else if (!user.totp_secret && token) {
            return res.status(400).json({ error: '2FA not setup for this user yet.' });
        }
        */

        const jwtToken = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({
            success: true,
            token: jwtToken,
            totpSetup: true /* bypassed */,
            mustChangePassword: user.must_change_password === 1
        });
    });
});

// 2. Setup 2FA (Returns QR Code)
app.get('/api/admin/setup-2fa', verifyToken, (req, res) => {
    db.get("SELECT totp_secret FROM admin_auth WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Database error' });
        if (user.totp_secret) return res.status(400).json({ error: '2FA is already setup.' });

        const secret = speakeasy.generateSecret({ name: `Havoc Sim Podium (${req.user.username})` });

        qrcode.toDataURL(secret.otpauth_url, (err, imageUrl) => {
            if (err) return res.status(500).json({ error: 'Error generating QR Code' });
            res.json({ secret: secret.base32, qrCodeUrl: imageUrl });
        });
    });
});

// 3. Confirm 2FA Setup
app.post('/api/admin/confirm-2fa', verifyToken, (req, res) => {
    const { token, secret } = req.body;
    const isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token
    });

    if (isValid) {
        db.run("UPDATE admin_auth SET totp_secret = ? WHERE id = ?", [secret, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error saving 2FA settings' });
            res.json({ success: true });
        });
    } else {
        res.status(400).json({ error: 'Invalid token. 2FA setup failed.' });
    }
});

// 4. Change Password (Forced on first login)
app.post('/api/admin/change-password', verifyToken, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(newPassword, saltRounds);
        db.run("UPDATE admin_auth SET password_hash = ?, must_change_password = 0 WHERE id = ?", [hash, req.user.id], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
    } catch (err) {
        res.status(500).json({ error: 'Error updating password' });
    }
});

// 5. Change Own Password (Admin self-service, verifies current password)
app.post('/api/admin/change-my-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Invalid input. New password must be at least 6 characters.' });
    }

    db.get("SELECT * FROM admin_auth WHERE id = ?", [req.user.id], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found.' });

        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

        try {
            const hash = await bcrypt.hash(newPassword, 10);
            db.run("UPDATE admin_auth SET password_hash = ?, must_change_password = 0 WHERE id = ?", [hash, req.user.id], (err) => {
                if (err) return res.status(500).json({ error: 'Database error.' });
                res.json({ success: true });
            });
        } catch (e) {
            res.status(500).json({ error: 'Error updating password.' });
        }
    });
});


// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================

// Get all staff users (Protected, Admin only)
app.get('/api/admin/users', verifyToken, verifySuperAdmin, (req, res) => {
    db.all("SELECT id, username, role, permissions FROM admin_auth ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Add a new staff user (Protected, Admin only)
app.post('/api/admin/users', verifyToken, verifySuperAdmin, async (req, res) => {
    const { username, password, role, permissions } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const userRole = role === 'super_admin' ? 'super_admin' : 'staff';
    const userPerms = userRole === 'super_admin' ? 'all' : (Array.isArray(permissions) ? permissions.join(',') : (permissions || 'bookings,availability'));

    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        db.run("INSERT INTO admin_auth (username, password_hash, must_change_password, role, permissions) VALUES (?, ?, 1, ?, ?)", [username, hash, userRole, userPerms], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed') || (err.message.includes('duplicate key') && err.message.includes('username'))) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, id: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Update a staff user's role and permissions (Protected, Admin only)
app.put('/api/admin/users/:id/role', verifyToken, verifySuperAdmin, (req, res) => {
    const { id } = req.params;
    const { role, permissions } = req.body;

    if (role !== 'super_admin' && role !== 'staff') {
        return res.status(400).json({ error: 'Invalid role' });
    }

    db.get("SELECT username FROM admin_auth WHERE id = ?", [id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') {
            return res.status(403).json({ error: 'Cannot change the primary admin account role' });
        }

        let userPerms = 'bookings,availability';
        if (role === 'super_admin') {
            userPerms = 'all';
        } else if (Array.isArray(permissions)) {
            userPerms = permissions.join(',');
        } else if (typeof permissions === 'string') {
            userPerms = permissions;
        }

        db.run("UPDATE admin_auth SET role = ?, permissions = ? WHERE id = ?", [role, userPerms, id], (err) => {
            if (err) return res.status(500).json({ error: 'Error updating role' });
            res.json({ success: true, permissions: userPerms });
        });
    });
});

// Delete a staff user (Protected, Admin only)
app.delete('/api/admin/users/:id', verifyToken, verifySuperAdmin, (req, res) => {
    const { id } = req.params;

    // Prevent deleting the main 'admin' account (id=1 usually, but safer to check by username)
    db.get("SELECT username FROM admin_auth WHERE id = ?", [id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') {
            return res.status(403).json({ error: 'Cannot delete the primary admin account' });
        }

        db.run("DELETE FROM admin_auth WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: 'Error deleting user' });
            res.json({ success: true });
        });
    });
});

// Reset a staff user's password to custom or default (Protected, Admin only)
app.post('/api/admin/users/:id/reset-password', verifyToken, verifySuperAdmin, (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    // Prevent resetting the main 'admin' account
    db.get("SELECT username FROM admin_auth WHERE id = ?", [id], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') {
            return res.status(403).json({ error: 'Cannot reset the primary admin account' });
        }

        try {
            const targetPassword = (newPassword && typeof newPassword === 'string' && newPassword.trim().length >= 6)
                ? newPassword.trim()
                : 'sabharwal@65';
            const saltRounds = 10;
            const hash = await bcrypt.hash(targetPassword, saltRounds);
            db.run("UPDATE admin_auth SET password_hash = ?, must_change_password = 1 WHERE id = ?", [hash, id], (err) => {
                if (err) return res.status(500).json({ error: 'Error resetting user password' });
                res.json({ success: true });
            });
        } catch (error) {
            res.status(500).json({ error: 'Encryption error' });
        }
    });
});

// ==========================================
// PRODUCT MANAGEMENT ROUTES
// ==========================================

// Get all products (Protected)
app.get('/api/admin/products', verifyToken, (req, res) => {
    db.all("SELECT * FROM products ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// ==========================================
// COUPON MANAGEMENT ROUTES
// ==========================================

// Get all active coupons (Public for checkout validation)
app.get('/api/coupons', (req, res) => {
    db.all("SELECT code, type, value, expires_at, max_uses, used_count, allowed_simulators, max_sessions FROM coupons WHERE active = 1", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const now = new Date();
        // Filter out expired or exhausted coupons
        const valid = rows.filter(c => {
            if (c.expires_at && new Date(c.expires_at) < now) return false;
            if (c.max_uses != null && c.used_count >= c.max_uses) return false;
            return true;
        });
        res.json(valid);
    });
});

// Bulk create coupons (Protected, Admin only)
app.post('/api/admin/coupons/bulk', verifyToken, verifySuperAdmin, (req, res) => {
    const { prefix, count, start_from, type, value, expires_at, max_uses, format, allowed_simulators, max_sessions } = req.body;

    if (!prefix || !count || count < 1 || count > 500) {
        return res.status(400).json({ error: 'Invalid prefix or count (max 500).' });
    }

    const startIdx = start_from ? parseInt(start_from) : 1;
    const expiresVal = expires_at || null;
    const maxUsesVal = max_uses != null && max_uses !== '' ? parseInt(max_uses) : null;
    const maxSessionsVal = max_sessions != null && max_sessions !== '' ? parseInt(max_sessions) : null;
    const allowedSimsVal = allowed_simulators ? (typeof allowed_simulators === 'string' ? allowed_simulators : JSON.stringify(allowed_simulators)) : null;
    const codes = [];

    const generateRandomString = (length) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    for (let i = startIdx; i < startIdx + count; i++) {
        let code = '';
        if (format === 'random') {
            code = `${prefix}${generateRandomString(6)}`;
        } else {
            // sequential default
            code = `${prefix}${i}`;
        }
        codes.push(code.toUpperCase());
    }

    // Insert all codes
    const stmt = db.prepare("INSERT OR IGNORE INTO coupons (code, type, value, expires_at, max_uses, used_count, allowed_simulators, max_sessions) VALUES (?, ?, ?, ?, ?, 0, ?, ?)");

    let insertedCount = 0;
    codes.forEach((code) => {
        stmt.run([code, type, value, expiresVal, maxUsesVal, allowedSimsVal, maxSessionsVal], function (err) {
            if (!err) {
                // Approximate since we don't have this.changes from pg in the mocked stmt
                insertedCount++;
            }
        });
    });

    stmt.finalize();
    // Simulate slight delay for bulk inserts to finish before returning
    setTimeout(() => {
        res.json({ success: true, count: codes.length, message: `Successfully requested creation of ${codes.length} coupons.` });
    }, 500);
});

// Add a coupon (Protected, Admin only)
app.post('/api/admin/coupons', verifyToken, verifySuperAdmin, (req, res) => {
    const { code, type, value, expires_at, max_uses, allowed_simulators, max_sessions } = req.body;
    const expiresVal = expires_at || null;
    const maxUsesVal = max_uses != null && max_uses !== '' ? parseInt(max_uses) : null;
    const maxSessionsVal = max_sessions != null && max_sessions !== '' ? parseInt(max_sessions) : null;
    const allowedSimsVal = allowed_simulators ? (typeof allowed_simulators === 'string' ? allowed_simulators : JSON.stringify(allowed_simulators)) : null;

    db.run(
        "INSERT INTO coupons (code, type, value, expires_at, max_uses, used_count, allowed_simulators, max_sessions) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        [code, type, value, expiresVal, maxUsesVal, allowedSimsVal, maxSessionsVal],
        function (err) {
            if (err) return res.status(400).json({ error: 'Coupon code might already exist.' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Update a coupon (Protected, Admin only)
app.put('/api/admin/coupons/:code', verifyToken, verifySuperAdmin, (req, res) => {
    const codeToUpdate = req.params.code;
    const { type, value, expires_at, max_uses, allowed_simulators, max_sessions } = req.body;
    const expiresVal = expires_at || null;
    const maxUsesVal = max_uses != null && max_uses !== '' ? parseInt(max_uses) : null;
    const maxSessionsVal = max_sessions != null && max_sessions !== '' ? parseInt(max_sessions) : null;
    const allowedSimsVal = allowed_simulators ? (typeof allowed_simulators === 'string' ? allowed_simulators : JSON.stringify(allowed_simulators)) : null;

    db.run(
        "UPDATE coupons SET type = ?, value = ?, expires_at = ?, max_uses = ?, allowed_simulators = ?, max_sessions = ? WHERE code = ?",
        [type, value, expiresVal, maxUsesVal, allowedSimsVal, maxSessionsVal, codeToUpdate],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to update coupon.' });
            res.json({ success: true });
        }
    );
});

// Get all coupons for admin (Protected) — no filtering, shows expired/exhausted too
app.get('/api/admin/coupons', verifyToken, verifySuperAdmin, (req, res) => {
    db.all("SELECT * FROM coupons ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Increment coupon used_count (Public — called after successful booking)
app.post('/api/coupons/use', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });
    db.run("UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND active = 1", [code], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// Delete a coupon (Protected, Admin only)
app.delete('/api/admin/coupons/:code', verifyToken, verifySuperAdmin, (req, res) => {
    db.run("DELETE FROM coupons WHERE code = ?", [req.params.code], (err) => {
        if (err) return res.status(500).json({ error: 'Error deleting coupon' });
        res.json({ success: true });
    });
});

// Delete multiple coupons (Protected, Admin only)
app.post('/api/admin/coupons/bulk-delete', verifyToken, verifySuperAdmin, (req, res) => {
    const { codes } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
        return res.status(400).json({ error: 'No codes provided' });
    }

    const placeholders = codes.map(() => '?').join(',');
    db.run(`DELETE FROM coupons WHERE code IN (${placeholders})`, codes, function (err) {
        if (err) return res.status(500).json({ error: 'Error deleting coupons' });
        res.json({ success: true, deleted: this.changes });
    });
});

// ==========================================
// BACKUP ROUTE
// ==========================================

app.get('/api/admin/backup', verifyToken, verifySuperAdmin, (req, res) => {
    const dbPath = process.env.DB_PATH || require('path').resolve(__dirname, 'havoc.db');
    res.download(dbPath, `havoc_backup_${new Date().toISOString().split('T')[0]}.db`, (err) => {
        if (err) {
            console.error("Backup download error:", err);
            if (!res.headersSent) res.status(500).json({ error: 'Error downloading database' });
        }
    });
});

// ==========================================
// CMS ROUTES (Content, Products, Slots, Instructors)
// ==========================================


// Instructor Auth API
app.post('/api/instructor/login', async (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM instructors WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)", [email, email, email], async (err, instructor) => {
        if (err || !instructor) return res.status(401).json({ error: 'Invalid username/email or password' });

        // If no password set yet, default is 'havoc123'
        const match = instructor.password_hash
            ? await bcrypt.compare(password, instructor.password_hash)
            : password === 'havoc123';

        if (!match) return res.status(401).json({ error: 'Invalid username/email or password' });

        // Auto-migrate if they used default without hash
        if (!instructor.password_hash) {
            const hash = await bcrypt.hash('havoc123', 10);
            db.run("UPDATE instructors SET password_hash = ?, must_change_password = 1 WHERE id = ?", [hash, instructor.id]);
        }

        const mustChangePassword = (instructor.must_change_password === 1 || password === 'havoc123');
        const token = jwt.sign({ id: instructor.id, role: 'instructor' }, process.env.JWT_SECRET || 'havoc-secret-key', { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            mustChangePassword,
            instructor: { id: instructor.id, name: instructor.name, username: instructor.username }
        });
    });
});

// Instructor Forgot Password - Send OTP
app.post('/api/instructor/forgot-password/send-otp', async (req, res) => {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
        return res.status(400).json({ error: 'Please enter your username or registered email.' });
    }
    const cleanId = identifier.trim().toLowerCase();

    db.get("SELECT * FROM instructors WHERE LOWER(username) = ? OR LOWER(email) = ?", [cleanId, cleanId], async (err, instructor) => {
        if (err || !instructor) {
            return res.status(404).json({ error: 'No instructor account found with that username or email.' });
        }

        if (!instructor.email || !instructor.email.includes('@')) {
            return res.status(400).json({ error: 'No valid email address is linked to your instructor account. Please contact admin.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

        db.run("UPDATE instructors SET reset_otp = ?, reset_otp_expires_at = ? WHERE id = ?", [otp, expiresAt, instructor.id], async (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: 'Failed to process request. Please try again.' });
            }

            try {
                const mailer = require('./mailer');
                await mailer.sendInstructorOtpEmail(instructor, otp);
            } catch (mailErr) {
                console.error("Failed to send OTP email:", mailErr);
            }

            // Mask email e.g. "an****@gmail.com"
            const parts = instructor.email.split('@');
            const namePart = parts[0];
            const maskedName = namePart.length <= 2
                ? namePart[0] + '***'
                : namePart.substring(0, 2) + '*'.repeat(Math.max(3, namePart.length - 2));
            const maskedEmail = `${maskedName}@${parts[1]}`;

            res.json({
                success: true,
                message: `An OTP has been sent to your email (${maskedEmail}).`,
                maskedEmail
            });
        });
    });
});

// Instructor Forgot Password - Verify OTP & Reset Password
app.post('/api/instructor/forgot-password/verify-reset', async (req, res) => {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    if (newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    db.get("SELECT * FROM instructors WHERE LOWER(username) = ? OR LOWER(email) = ?", [cleanId, cleanId], async (err, instructor) => {
        if (err || !instructor) {
            return res.status(404).json({ error: 'Instructor account not found.' });
        }

        if (!instructor.reset_otp || instructor.reset_otp !== cleanOtp) {
            return res.status(400).json({ error: 'Invalid OTP. Please check the code sent to your email.' });
        }

        if (!instructor.reset_otp_expires_at || Date.now() > Number(instructor.reset_otp_expires_at)) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
        }

        const hash = await bcrypt.hash(newPassword.trim(), 10);
        db.run(
            "UPDATE instructors SET password_hash = ?, must_change_password = 0, reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = ?",
            [hash, instructor.id],
            function (updateErr) {
                if (updateErr) {
                    return res.status(500).json({ error: 'Failed to update password.' });
                }

                const token = jwt.sign(
                    { id: instructor.id, role: 'instructor' },
                    process.env.JWT_SECRET || 'havoc-secret-key',
                    { expiresIn: '7d' }
                );

                res.json({
                    success: true,
                    token,
                    message: 'Password reset successfully!'
                });
            }
        );
    });
});

const verifyInstructorToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    jwt.verify(token, process.env.JWT_SECRET || 'havoc-secret-key', (err, decoded) => {
        if (err || decoded.role !== 'instructor') return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

app.post('/api/instructor/change-password', verifyInstructorToken, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    const hash = await bcrypt.hash(newPassword.trim(), 10);
    db.run("UPDATE instructors SET password_hash = ?, must_change_password = 0 WHERE id = ?", [hash, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        res.json({ success: true, message: 'Password updated successfully' });
    });
});

app.get('/api/instructor/me', verifyInstructorToken, (req, res) => {
    db.get("SELECT id, name, username, email, phone, role, age, fee, simulator_type, status, photo_url, biography, schedule_json FROM instructors WHERE id = ?", [req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Not found' });
        res.json(row);
    });
});

app.put('/api/instructor/me', verifyInstructorToken, (req, res) => {
    const { status, schedule_json } = req.body;
    db.run("UPDATE instructors SET status = ?, schedule_json = ? WHERE id = ?", [status, schedule_json, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: 'Update failed' });
        res.json({ success: true });
    });
});

// Instructors API
app.get('/api/instructors', (req, res) => {
    db.all("SELECT * FROM instructors ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/available-instructors', (req, res) => {
    const { date, time, isoDate } = req.query; // date: label e.g. "Oct 11 (Sun)" or ISO "2026-10-11", time: e.g. "11AM-11:30AM"
    if (!date || !time) return res.status(400).json({ error: 'Date and time are required' });

    db.all("SELECT instructor_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PAID', 'ATTENDED', 'CASH', 'PENDING') AND instructor_id IS NOT NULL", [date, time], (err, bookedRows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching bookings' });
        const bookedInstructorIds = (bookedRows || []).map(r => r.instructor_id);

        db.all("SELECT * FROM instructors WHERE status = 'Available' ORDER BY id ASC", [], (err, instructors) => {
            if (err) return res.status(500).json({ error: 'Database error fetching instructors' });

            // Normalize time helper
            const normTime = t => {
                let s = (t || '').toLowerCase().replace(/[:\s]/g, '');
                s = s.replace(/00am/g, 'am').replace(/00pm/g, 'pm');
                return s.replace(/[^a-z0-9]/g, '');
            };
            const targetTime = normTime(time);

            // Derive finalIsoDate if not provided
            let finalIsoDate = isoDate || null;
            if (!finalIsoDate && date) {
                const cleanDateStr = date.replace(/\s*\([a-zA-Z]+\)\s*/, ' ').trim();
                const curYear = new Date().getFullYear();
                const pD = new Date(`${cleanDateStr} ${curYear}`);
                if (!isNaN(pD.getTime())) {
                    const y = pD.getFullYear();
                    const m = String(pD.getMonth() + 1).padStart(2, '0');
                    const d = String(pD.getDate()).padStart(2, '0');
                    finalIsoDate = `${y}-${m}-${d}`;
                }
            }

            // Extract day of week from date string or Date object
            let dayOfWeek = '';
            const dayMatch = date.match(/\(([a-zA-Z]+)\)/);
            if (dayMatch) {
                const dayMap = {
                    'sun': 'sunday', 'mon': 'monday', 'tue': 'tuesday',
                    'wed': 'wednesday', 'thu': 'thursday', 'fri': 'friday', 'sat': 'saturday'
                };
                dayOfWeek = dayMap[dayMatch[1].toLowerCase()] || dayMatch[1].toLowerCase();
            }
            if (!dayOfWeek) {
                const d = new Date(finalIsoDate || date);
                if (!isNaN(d.getTime())) {
                    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    dayOfWeek = days[d.getDay()];
                }
            }

            // Calculate slot start timestamp for notice_hours check
            let slotStartTimestamp = null;
            if (finalIsoDate) {
                // Parse start time from slot e.g. "11:00 AM - 11:30 AM" or "11AM-11:30AM" or "2:30PM-3PM"
                const timeMatch = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
                if (timeMatch) {
                    let hour = parseInt(timeMatch[1], 10);
                    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
                    const meridiem = timeMatch[3].toLowerCase();
                    if (meridiem === 'pm' && hour < 12) hour += 12;
                    if (meridiem === 'am' && hour === 12) hour = 0;

                    const [y, m, d] = finalIsoDate.split('-').map(Number);
                    slotStartTimestamp = new Date(y, m - 1, d, hour, minute, 0).getTime();
                } else {
                    const [y, m, d] = finalIsoDate.split('-').map(Number);
                    slotStartTimestamp = new Date(y, m - 1, d, 23, 59, 59).getTime();
                }
            }
            const nowTime = Date.now();

            const availableInstructors = instructors.filter(i => {
                if ((i.status || '').toLowerCase() !== 'available') return false;
                if (bookedInstructorIds.includes(i.id)) return false;

                // Check Notice Hours Requirement (e.g. 48 hours prior)
                const requiredNoticeHours = parseInt(i.notice_hours, 10) || 0;
                if (requiredNoticeHours > 0 && slotStartTimestamp) {
                    const hoursUntilSlot = (slotStartTimestamp - nowTime) / (1000 * 60 * 60);
                    if (hoursUntilSlot < requiredNoticeHours) {
                        return false; // Slot is too soon for this instructor's notice requirement
                    }
                }

                if (i.schedule_json) {
                    try {
                        const schedule = JSON.parse(i.schedule_json);
                        let allowedSlots = null;

                        // 1. Check exact date overrides in schedule.dates
                        if (schedule.dates) {
                            if (finalIsoDate && schedule.dates[finalIsoDate] !== undefined) {
                                allowedSlots = schedule.dates[finalIsoDate];
                            } else if (schedule.dates[date] !== undefined) {
                                allowedSlots = schedule.dates[date];
                            } else {
                                for (const [dKey, sList] of Object.entries(schedule.dates)) {
                                    if (date.includes(dKey) || (finalIsoDate && dKey.includes(finalIsoDate))) {
                                        allowedSlots = sList;
                                        break;
                                    }
                                }
                            }
                        }

                        // 2. Check direct date overrides in root
                        if (allowedSlots === null) {
                            if (schedule[date] !== undefined) {
                                allowedSlots = schedule[date];
                            } else if (isoDate && schedule[isoDate] !== undefined) {
                                allowedSlots = schedule[isoDate];
                            }
                        }

                        // 3. Fallback to weekly day-of-week defaults
                        if (allowedSlots === null && dayOfWeek) {
                            if (schedule.weekly && schedule.weekly[dayOfWeek] !== undefined) {
                                allowedSlots = schedule.weekly[dayOfWeek];
                            } else if (schedule[dayOfWeek] !== undefined) {
                                allowedSlots = schedule[dayOfWeek];
                            }
                        }

                        // If instructor specified slots for this day/date:
                        if (Array.isArray(allowedSlots)) {
                            // If empty array, instructor is OFF on this date
                            if (allowedSlots.length === 0) return false;

                            const isMatch = allowedSlots.some(s => {
                                const nS = normTime(s);
                                return nS === targetTime || (nS.length > 3 && targetTime.length > 3 && (nS.includes(targetTime) || targetTime.includes(nS)));
                            });
                            if (!isMatch) return false;
                        }
                    } catch (e) {
                        // ignore parse err
                    }
                }
                return true;
            });
            res.json(availableInstructors);
        });
    });
});

app.post('/api/admin/instructors', verifyToken, verifySuperAdmin, upload.single('image'), async (req, res) => {
    const { name, username, age, role, key_achievement, status, biography, fee, email, phone, simulator_type, password, notice_hours } = req.body;
    let photo_url = null;
    if (req.file) {
        const base64Data = req.file.buffer.toString('base64');
        photo_url = `data:${req.file.mimetype};base64,${base64Data}`;
    }
    const initialPassword = password && password.trim() ? password.trim() : 'havoc123';
    const password_hash = await bcrypt.hash(initialPassword, 10);
    const mustChange = initialPassword === 'havoc123' ? 1 : 0;
    const finalUsername = username && username.trim()
        ? username.trim().toLowerCase()
        : (email ? email.split('@')[0].toLowerCase() : name.toLowerCase().replace(/\s+/g, ''));
    const noticeHoursVal = parseInt(notice_hours, 10) || 0;

    db.run("INSERT INTO instructors (name, username, age, role, key_achievement, status, biography, photo_url, fee, email, phone, simulator_type, password_hash, must_change_password, notice_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, finalUsername, age || null, role, key_achievement, status || 'Available', biography, photo_url, fee != null ? parseFloat(fee) : 500, email, phone, simulator_type || 'All', password_hash, mustChange, noticeHoursVal],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to add instructor' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/instructors/:id', verifyToken, verifySuperAdmin, upload.single('image'), async (req, res) => {
    const { name, username, age, role, key_achievement, status, biography, fee, email, phone, simulator_type, password, notice_hours } = req.body;
    const feeVal = fee != null ? parseFloat(fee) : 500;
    const simTypeVal = simulator_type || 'All';
    const finalUsername = username && username.trim() ? username.trim().toLowerCase() : null;
    const noticeHoursVal = parseInt(notice_hours, 10) || 0;

    let query = "UPDATE instructors SET name=?, username=?, age=?, role=?, key_achievement=?, status=?, biography=?, fee=?, email=?, phone=?, simulator_type=?, notice_hours=?";
    let params = [name, finalUsername, age || null, role, key_achievement, status || 'Available', biography, feeVal, email, phone, simTypeVal, noticeHoursVal];

    if (password && password.trim()) {
        const hash = await bcrypt.hash(password.trim(), 10);
        const mustChange = password.trim() === 'havoc123' ? 1 : 0;
        query += ", password_hash=?, must_change_password=?";
        params.push(hash, mustChange);
    }

    if (req.file) {
        const base64Data = req.file.buffer.toString('base64');
        const photo_url = `data:${req.file.mimetype};base64,${base64Data}`;
        query += ", photo_url=?";
        params.push(photo_url);
    }

    query += " WHERE id=?";
    params.push(req.params.id);

    db.run(query, params, (err) => {
        if (err) {
            console.error("SQL UPDATE ERROR:", err);
            return res.status(500).json({ error: 'Failed to update instructor' });
        }
        res.json({ success: true });
    });
});

app.post('/api/admin/instructors/:id/reset-password', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const hash = await bcrypt.hash('havoc123', 10);
        db.run("UPDATE instructors SET password_hash = ?, must_change_password = 1 WHERE id = ?", [hash, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: 'Failed to reset instructor password' });
            res.json({ success: true, message: 'Password reset to default (havoc123). Instructor will be prompted to change password.' });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/instructors/:id', verifyToken, verifySuperAdmin, (req, res) => {
    db.run("DELETE FROM instructors WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error deleting instructor' });
        res.json({ success: true });
    });
});

// Content API
app.get('/api/content', (req, res) => {
    db.all("SELECT * FROM site_content", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const content = {};
        rows.forEach(r => content[r.section_key] = r.content_value);
        res.json(content);
    });
});

app.put('/api/admin/content', verifyToken, verifySuperAdmin, (req, res) => {
    const { key, value } = req.body;
    db.run("INSERT INTO site_content (section_key, content_value) VALUES (?, ?) ON CONFLICT(section_key) DO UPDATE SET content_value=excluded.content_value", [key, value], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update content.' });
        res.json({ success: true });
    });
});

// Products API
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/admin/products', verifyToken, verifySuperAdmin, upload.array('images', 20), (req, res) => {
    const { name, type, price, compare_price, two_player_price, stock_quantity, description, options, hide_suffix, existing_images, image_order } = req.body;
    let imagesList = [];

    // Parse order if provided
    let orderArray = null;
    if (image_order) {
        try {
            orderArray = JSON.parse(image_order);
        } catch (e) { }
    }

    if (Array.isArray(orderArray) && orderArray.length > 0) {
        orderArray.forEach(item => {
            if (item.type === 'existing' && item.url) {
                imagesList.push(saveBase64ImageFile(item.url, 'prod_ex'));
            } else if (item.type === 'new' && typeof item.fileIndex === 'number' && req.files && req.files[item.fileIndex]) {
                const f = req.files[item.fileIndex];
                const savedPath = saveUploadedBufferFile(f, 'prod');
                if (savedPath) imagesList.push(savedPath);
            }
        });
    } else {
        // Fallback: existing images first, then newly uploaded files
        if (existing_images) {
            try {
                const parsed = JSON.parse(existing_images);
                if (Array.isArray(parsed)) {
                    parsed.forEach(url => imagesList.push(saveBase64ImageFile(url, 'prod_ex')));
                }
            } catch (e) { }
        }
        if (req.files && req.files.length > 0) {
            req.files.forEach(f => {
                const savedPath = saveUploadedBufferFile(f, 'prod');
                if (savedPath) imagesList.push(savedPath);
            });
        }
    }

    // Primary image is first image in array, or null
    const image_url = imagesList.length > 0 ? imagesList[0] : null;
    const images_json = JSON.stringify(imagesList);
    const hideSuffixVal = hide_suffix === '1' || hide_suffix === 'true' ? 1 : 0;
    const twoPlayerVal = two_player_price ? parseFloat(two_player_price) : null;

    db.run("INSERT INTO products (name, type, price, compare_price, two_player_price, stock_quantity, description, image_url, images_json, options, hide_suffix) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, price, compare_price || null, twoPlayerVal, stock_quantity || 10, description, image_url, images_json, options || '[]', hideSuffixVal],
        function (err) {
            if (err) {
                console.error("SQL INSERT PRODUCT ERROR:", err);
                return res.status(500).json({ error: 'Failed to add product: ' + err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/products/:id', verifyToken, verifySuperAdmin, upload.array('images', 20), (req, res) => {
    const { name, type, price, compare_price, two_player_price, stock_quantity, description, options, hide_suffix, existing_images, image_order } = req.body;
    const hideSuffixVal = hide_suffix === '1' || hide_suffix === 'true' ? 1 : 0;
    const twoPlayerVal = two_player_price ? parseFloat(two_player_price) : null;

    let imagesList = [];

    // Parse order if provided
    let orderArray = null;
    if (image_order) {
        try {
            orderArray = JSON.parse(image_order);
        } catch (e) { }
    }

    if (Array.isArray(orderArray) && orderArray.length > 0) {
        orderArray.forEach(item => {
            if (item.type === 'existing' && item.url) {
                imagesList.push(saveBase64ImageFile(item.url, 'prod_ex'));
            } else if (item.type === 'new' && typeof item.fileIndex === 'number' && req.files && req.files[item.fileIndex]) {
                const f = req.files[item.fileIndex];
                const savedPath = saveUploadedBufferFile(f, 'prod');
                if (savedPath) imagesList.push(savedPath);
            }
        });
    } else {
        // Fallback: existing images first, then newly uploaded files
        if (existing_images) {
            try {
                const parsed = JSON.parse(existing_images);
                if (Array.isArray(parsed)) {
                    parsed.forEach(url => imagesList.push(saveBase64ImageFile(url, 'prod_ex')));
                }
            } catch (e) { }
        }
        if (req.files && req.files.length > 0) {
            req.files.forEach(f => {
                const savedPath = saveUploadedBufferFile(f, 'prod');
                if (savedPath) imagesList.push(savedPath);
            });
        }
    }

    const image_url = imagesList.length > 0 ? imagesList[0] : null;
    const images_json = JSON.stringify(imagesList);

    let query = "UPDATE products SET name=?, type=?, price=?, compare_price=?, two_player_price=?, stock_quantity=?, description=?, options=?, hide_suffix=?, image_url=?, images_json=? WHERE id=?";
    let params = [name, type, price, compare_price || null, twoPlayerVal, stock_quantity || 10, description, options || '[]', hideSuffixVal, image_url, images_json, req.params.id];

    db.run(query, params, (err) => {
        if (err) {
            console.error("SQL UPDATE PRODUCT ERROR:", err);
            return res.status(500).json({ error: 'Failed to update product: ' + err.message });
        }
        res.json({ success: true });
    });
});

app.delete('/api/admin/products/:id', verifyToken, verifySuperAdmin, (req, res) => {
    db.run("DELETE FROM products WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error deleting product' });
        res.json({ success: true });
    });
});

app.post('/api/admin/products/:id/duplicate', verifyToken, verifySuperAdmin, (req, res) => {
    db.get("SELECT * FROM products WHERE id=?", [req.params.id], (err, product) => {
        if (err || !product) return res.status(404).json({ error: 'Product not found' });

        const newName = product.name + ' (Copy)';
        const query = `INSERT INTO products (name, type, price, compare_price, two_player_price, stock_quantity, description, options, image_url, images_json)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [newName, product.type, product.price, product.compare_price, product.two_player_price || null, product.stock_quantity, product.description, product.options, product.image_url, product.images_json || '[]'];

        db.run(query, params, function (err) {
            if (err) return res.status(500).json({ error: 'Error duplicating product' });
            res.json({ success: true, id: this.lastID });
        });
    });
});

// Slots API (Public listing for booking interface - strictly Sim Podium independent slots)
app.get('/api/slots', (req, res) => {
    db.all("SELECT * FROM sim_podium_time_slots WHERE active = 1 ORDER BY sort_order ASC, start_hour ASC", [], (err, rows) => {
        if (!err && rows && rows.length > 0) {
            // Map to compatible time_range property so existing booking scripts work seamlessly
            return res.json(rows.map(r => ({
                id: r.id,
                time_range: r.label,
                active: r.active,
                sort_order: r.sort_order,
                color: r.color,
                color_name: r.color_name
            })));
        }
        // Fallback to legacy slots table if sim_podium_time_slots is empty
        db.all("SELECT * FROM slots WHERE active = 1 ORDER BY sort_order ASC", [], (sErr, sRows) => {
            if (sErr) return res.status(500).json({ error: 'Database error' });
            res.json(sRows || []);
        });
    });
});

// ==========================================
// BOOKINGS MANAGEMENT ROUTES
// ==========================================

// Helper: normalize time slot strings for insensitive comparison
function normalizeTimeSlot(slotStr) {
    if (!slotStr) return "";
    let clean = String(slotStr).toLowerCase().replace(/\s+/g, "");
    clean = clean.replace(/0(\d):/g, "$1:");
    clean = clean.replace(/:00([ap]m)/g, "$1");
    return clean;
}

// Helper: generate common date variants across YYYY-MM-DD, Mmm DD, Mmm DD (Ddd)
function generateDateVariants(dateStr) {
    if (!dateStr) return [];
    const set = new Set();
    const raw = String(dateStr).trim();
    set.add(raw);

    const withoutParen = raw.replace(/\s*\([A-Za-z]+\)$/, '').trim();
    set.add(withoutParen);

    const monthMap = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const monthNamesLong = {
        jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', jun: 'June',
        jul: 'July', aug: 'August', sep: 'September', oct: 'October', nov: 'November', dec: 'December'
    };
    const monthNamesShort = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
        '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
    };

    const isoMatch = withoutParen.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const [_, y, m, d] = isoMatch;
        const dNum = parseInt(d, 10);
        const shortM = monthNamesShort[m];
        const longM = monthNamesLong[shortM ? shortM.toLowerCase() : ''];
        if (shortM) {
            set.add(`${shortM} ${d}`);
            set.add(`${shortM} ${dNum}`);
            if (longM) {
                set.add(`${longM} ${d}`);
                set.add(`${longM} ${dNum}`);
            }
            const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, dNum);
            if (!isNaN(dt.getTime())) {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayName = dayNames[dt.getDay()];
                set.add(`${shortM} ${d} (${dayName})`);
                set.add(`${shortM} ${dNum} (${dayName})`);
                if (longM) {
                    set.add(`${longM} ${d} (${dayName})`);
                    set.add(`${longM} ${dNum} (${dayName})`);
                }
            }
        }
    }

    const textMatch = withoutParen.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
    if (textMatch) {
        const mPrefix = textMatch[1].toLowerCase().slice(0, 3);
        const dNum = parseInt(textMatch[2], 10);
        const dPad = String(dNum).padStart(2, '0');
        const mNum = monthMap[mPrefix];
        if (mNum) {
            const year = new Date().getFullYear();
            set.add(`${year}-${mNum}-${dPad}`);
            set.add(`${textMatch[1]} ${dPad}`);
            set.add(`${textMatch[1]} ${dNum}`);
            const dt = new Date(year, parseInt(mNum, 10) - 1, dNum);
            if (!isNaN(dt.getTime())) {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayName = dayNames[dt.getDay()];
                set.add(`${textMatch[1]} ${dPad} (${dayName})`);
                set.add(`${textMatch[1]} ${dNum} (${dayName})`);
            }
        }
    }

    return Array.from(set);
}

// Get booked slots for a specific date (Public)
app.get('/api/availability/:date', (req, res) => {
    const { date } = req.params;
    const { item } = req.query;

    const dateVariants = generateDateVariants(date);
    const datePlaceholders = dateVariants.map(() => '?').join(',');

    let query = `SELECT booking_time, status, order_id, created_at FROM bookings WHERE booking_date IN (${datePlaceholders}) AND status IN ('PAID', 'ATTENDED', 'CASH', 'PENDING', 'CONFIRMED')`;
    let params = [...dateVariants];

    if (item) {
        query += " AND item_name ILIKE ?";
        params.push(item);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const now = Date.now();
        const bookedSlots = [];

        (rows || []).forEach(r => {
            // Keep hard bookings (PAID, ATTENDED, CASH, CONFIRMED or PAYDUE desk reservations)
            if (r.status === 'PAID' || r.status === 'ATTENDED' || r.status === 'CASH' || r.status === 'CONFIRMED' || (r.order_id && r.order_id.startsWith('PAYDUE_'))) {
                if (!bookedSlots.includes(r.booking_time)) bookedSlots.push(r.booking_time);
            } else if (r.status === 'PENDING') {
                // Online pending: only block if under 2 minutes old
                const ageMs = now - new Date(r.created_at).getTime();
                if (ageMs <= 2 * 60 * 1000) {
                    if (!bookedSlots.includes(r.booking_time)) bookedSlots.push(r.booking_time);
                }
            }
        });

        // Also check active online checkout holds (< 2 minutes old)
        db.all("SELECT items_json, created_at FROM online_checkout_holds", [], (holdErr, holdRows) => {
            if (!holdErr && holdRows) {
                holdRows.forEach(hr => {
                    const ageMs = now - new Date(hr.created_at).getTime();
                    if (ageMs <= 2 * 60 * 1000) {
                        try {
                            const heldItems = JSON.parse(hr.items_json || '[]');
                            heldItems.forEach(hi => {
                                const hiDateVariants = generateDateVariants(hi.date);
                                const dateMatches = hiDateVariants.some(v => dateVariants.includes(v));
                                const itemMatches = !item || (hi.item_name && hi.item_name.toLowerCase() === item.toLowerCase());
                                if (dateMatches && itemMatches) {
                                    if (hi.time && !bookedSlots.includes(hi.time)) {
                                        bookedSlots.push(hi.time);
                                    }
                                }
                            });
                        } catch (e) { }
                    }
                });
            }

            // Also check shared simulator_slot_locks table (locks from RC Fun Zone & cross-platform combos)
            let lockQuery = `SELECT booking_time, booking_date, status, source_order_id, created_at FROM simulator_slot_locks WHERE booking_date IN (${datePlaceholders}) AND status IN ('CONFIRMED', 'PENDING', 'PAID', 'ATTENDED')`;
            let lockParams = [...dateVariants];
            if (item) {
                lockQuery += " AND simulator_name ILIKE ?";
                lockParams.push(item);
            }

            db.all(lockQuery, lockParams, (lockErr, lockRows) => {
                if (!lockErr && lockRows) {
                    lockRows.forEach(lr => {
                        if (lr.status === 'PAID' || lr.status === 'ATTENDED' || lr.status === 'CONFIRMED' || (lr.source_order_id && lr.source_order_id.startsWith('PAYDUE_'))) {
                            if (!bookedSlots.includes(lr.booking_time)) bookedSlots.push(lr.booking_time);
                        } else if (lr.status === 'PENDING') {
                            const ageMs = now - new Date(lr.created_at).getTime();
                            if (ageMs <= 5 * 60 * 1000) {
                                if (!bookedSlots.includes(lr.booking_time)) bookedSlots.push(lr.booking_time);
                            }
                        }
                    });
                }

                // Also merge admin-blocked slots/dates from blocked_slots table
                let blockQuery = `SELECT time_slot, simulator_name FROM blocked_slots WHERE (booking_date IN (${datePlaceholders}) OR booking_date = 'ALL')`;
                let blockParams = [...dateVariants];
                if (item) {
                    blockQuery += " AND (simulator_name ILIKE ? OR simulator_name = 'ALL')";
                    blockParams.push(item);
                }

                db.all(blockQuery, blockParams, (blockErr, blockRows) => {
                    if (!blockErr && blockRows) {
                        blockRows.forEach(br => {
                            if (br.time_slot === 'ALL_DAY') {
                                if (!bookedSlots.includes('ALL_DAY')) bookedSlots.push('ALL_DAY');
                            } else {
                                if (!bookedSlots.includes(br.time_slot)) bookedSlots.push(br.time_slot);
                            }
                        });
                    }
                    res.json({ bookedSlots });
                });
            });
        });
    });
});

// Get Analytics (Protected)
app.get('/api/admin/analytics', verifyToken, (req, res) => {
    let days = req.query.days || 30;

    let dateFilter = '';
    let params = [];
    if (days !== 'all') {
        days = parseInt(days);
        dateFilter = "AND created_at >= date('now', ?)";
        params.push(`-${days} days`);
    }

    db.get(`SELECT SUM(price) as sales, COUNT(id) as orders FROM bookings WHERE status IN ('PAID', 'ATTENDED', 'CASH', 'SUCCESS') ${dateFilter}`, params, (err, bookingStats) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        db.get("SELECT COUNT(id) as active_slots FROM slots WHERE active=1", [], (err, slotStat) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            db.get("SELECT SUM(stock_quantity) as total_stock FROM products", [], (err, prodStat) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                const sales = bookingStats.sales || 0;
                const orders = bookingStats.orders || 0;

                const activeSlots = slotStat.active_slots || 0;
                const totalStock = prodStat.total_stock || 0;

                const calcDays = (days === 'all') ? 365 : parseInt(days);
                const totalCapacity = calcDays * activeSlots * totalStock;
                const slotsEmpty = Math.max(0, totalCapacity - orders);

                res.json({
                    sales,
                    orders,
                    aov: orders > 0 ? (sales / orders) : 0,
                    slotsBooked: orders,
                    slotsEmpty,
                    totalCapacity
                });
            });
        });
    });
});

// Get Inventory Matrix Data (Protected)
app.get('/api/admin/inventory', verifyToken, (req, res) => {
    // Return products, slots, future bookings, and overrides to let frontend build the matrix
    db.all("SELECT id, name, stock_quantity FROM products ORDER BY name ASC", [], (err, products) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        db.all("SELECT time_range FROM slots WHERE active=1 ORDER BY sort_order ASC", [], (err, slots) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            db.all("SELECT item_name, booking_date, booking_time, status FROM bookings WHERE status IN ('PAID', 'ATTENDED', 'CASH', 'SUCCESS') AND booking_date >= date('now', '-1 day')", [], (err, bookings) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                db.all("SELECT product_id, date_str, time_range, override_quantity FROM inventory_overrides WHERE date_str >= date('now', '-1 day')", [], (err, overrides) => {
                    if (err) return res.status(500).json({ error: 'Database error' });

                    res.json({
                        products,
                        slots,
                        bookings,
                        overrides
                    });
                });
            });
        });
    });
});

// Update Inventory Override (Protected)
app.post('/api/admin/inventory/override', verifyToken, express.json(), (req, res) => {
    const { product_id, date_str, time_range, override_quantity } = req.body;
    if (!product_id || !date_str || !time_range) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare(`
        INSERT INTO inventory_overrides (product_id, date_str, time_range, override_quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(product_id, date_str, time_range) DO UPDATE SET override_quantity = excluded.override_quantity
    `);

    stmt.run([product_id, date_str, time_range, override_quantity], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Inventory Report: per-product Empty/Full slot counts (Protected)
app.get('/api/admin/inventory-report', verifyToken, (req, res) => {
    const { month } = req.query; // e.g. "2026-09" or "all"

    db.all("SELECT id, name, type, price, stock_quantity FROM products ORDER BY name ASC", [], (err, products) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        db.all("SELECT COUNT(*) as slotCount FROM slots WHERE active=1", [], (err, slotRows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            const slotsPerDay = slotRows[0].slotCount || 1;

            // Build date range based on selected month filter
            let dateFilter = '';
            let dateParams = [];
            if (month && month !== 'all') {
                const monthNamesLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const parts = month.split('-');
                const yrStr = parts[0];
                const moNumStr = parts[1];
                const moIndex = Number(moNumStr) - 1;
                dateFilter = `AND (
                    booking_date LIKE ? OR 
                    booking_date LIKE ? OR 
                    booking_date LIKE ? OR 
                    booking_date LIKE ? OR 
                    booking_date LIKE ?
                )`;
                dateParams = [
                    `${monthNamesShort[moIndex]}%`,
                    `${monthNamesLong[moIndex]}%`,
                    `${yrStr}-${moNumStr}%`,
                    `%-${moNumStr}-%`,
                    `%/${moNumStr}/%`
                ];
            }

            db.all(
                `SELECT item_name, COUNT(*) as booked_count FROM bookings WHERE status IN ('PAID', 'ATTENDED', 'CASH', 'SUCCESS') ${dateFilter} GROUP BY item_name`,
                dateParams,
                (err, bookingCounts) => {
                    if (err) return res.status(500).json({ error: 'Database error' });

                    // Compute total open days (excluding Mondays)
                    let totalOpenDays = 0;
                    if (month && month !== 'all') {
                        const [yr, mo] = month.split('-').map(Number);
                        const daysInMonth = new Date(yr, mo, 0).getDate();
                        for (let d = 1; d <= daysInMonth; d++) {
                            const dateObj = new Date(yr, mo - 1, d);
                            // getDay() returns 1 for Monday
                            if (dateObj.getDay() !== 1) {
                                totalOpenDays++;
                            }
                        }
                    } else {
                        // Approximate for "all time" (365 days minus ~52 Mondays)
                        totalOpenDays = Math.floor(365 * 6 / 7);
                    }

                    const norm = str => (str || '').toLowerCase().trim();
                    const bookingMap = {};
                    (bookingCounts || []).forEach(b => {
                        const key = norm(b.item_name);
                        bookingMap[key] = (bookingMap[key] || 0) + (b.booked_count || 0);
                    });

                    const report = products.map(p => {
                        const totalSlots = totalOpenDays * slotsPerDay;
                        const pKey = norm(p.name);
                        let fullSlots = bookingMap[pKey] || 0;

                        if (!fullSlots) {
                            for (const [bKey, count] of Object.entries(bookingMap)) {
                                const cleanP = pKey.replace(/[^a-z0-9]/g, '');
                                const cleanB = bKey.replace(/[^a-z0-9]/g, '');
                                if (cleanP === cleanB || (cleanP.length > 5 && cleanB.length > 5 && (cleanP.includes(cleanB) || cleanB.includes(cleanP)))) {
                                    fullSlots += count;
                                }
                            }
                        }

                        const emptySlots = Math.max(0, totalSlots - fullSlots);
                        return {
                            id: p.id,
                            name: p.name,
                            type: p.type,
                            price: p.price,
                            emptySlots,
                            fullSlots
                        };
                    });

                    res.json({ report });
                }
            );
        });
    });
});

// Get all bookings (Protected)
app.get('/api/admin/bookings', verifyToken, (req, res) => {
    db.all("SELECT bookings.*, instructors.name as instructor_name FROM bookings LEFT JOIN instructors ON bookings.instructor_id = instructors.id ORDER BY bookings.created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Get bookings by date for Availability Schedule (Protected)
app.get('/api/admin/bookings/date/:date', verifyToken, (req, res) => {
    const { date } = req.params;
    // Exclude CANCELLED (freed) bookings from the schedule view; PENDING = Pay-at-Desk holds
    db.all("SELECT * FROM bookings WHERE booking_date = ? AND status != 'CANCELLED'", [date], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const allRows = rows ? [...rows] : [];

        // Also include locks from external platforms (e.g. Havoc RC Fun Zone)
        const altDate = date.replace(/ \([A-Za-z]+\)/, '');
        db.all("SELECT * FROM simulator_slot_locks WHERE (booking_date = ? OR booking_date = ?) AND status != 'CANCELLED' AND source_platform != 'HAVOC_SIM_PODIUM'", [date, altDate], (lockErr, lockRows) => {
            if (!lockErr && lockRows) {
                lockRows.forEach(lr => {
                    allRows.push({
                        id: `lock_${lr.id}`,
                        order_id: lr.source_order_id,
                        name: `${lr.customer_name || 'Combo Pass'} [${lr.source_platform}]`,
                        phone: lr.customer_phone || '',
                        email: '',
                        item_name: lr.simulator_name,
                        booking_date: lr.booking_date,
                        booking_time: lr.booking_time,
                        status: lr.status,
                        is_external_lock: true
                    });
                });
            }

            // Also include admin-blocked slots so availability grid displays them as Unavailable / Blocked
            db.all("SELECT * FROM blocked_slots WHERE (booking_date = ? OR booking_date = ? OR booking_date = 'ALL')", [date, altDate], (blockErr, blockRows) => {
                if (!blockErr && blockRows) {
                    blockRows.forEach(br => {
                        allRows.push({
                            id: `block_${br.id}`,
                            order_id: `BLOCKED_${br.id}`,
                            name: br.reason ? `Blocked: ${br.reason}` : 'Admin Blocked',
                            phone: '',
                            email: '',
                            item_name: br.simulator_name === 'ALL' ? '' : br.simulator_name,
                            booking_date: date,
                            booking_time: br.time_slot,
                            status: 'BLOCKED',
                            is_admin_blocked: true,
                            reason: br.reason || ''
                        });
                    });
                }
                res.json(allRows);
            });
        });
    });
});

// ==========================================
// BLOCKED SLOTS MANAGEMENT ROUTES
// ==========================================

// Public API: Get blocked slots and closed dates for the public booking calendar
app.get('/api/blocked-dates', (req, res) => {
    db.all("SELECT id, simulator_name, booking_date, time_slot, reason FROM blocked_slots", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows || []);
    });
});

// Get all blocked slots (Protected)
app.get('/api/admin/blocked-slots', verifyToken, (req, res) => {
    db.all("SELECT * FROM blocked_slots ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows || []);
    });
});

// Block slot(s) or dates (Protected - requires 'block_slots' permission or Super Admin)
app.post('/api/admin/blocked-slots', verifyToken, checkPermission('block_slots'), (req, res) => {
    const { simulator_name, booking_date, time_slots, reason } = req.body;

    if (!booking_date) {
        return res.status(400).json({ error: 'booking_date is required.' });
    }

    const simName = simulator_name || 'ALL';
    const slots = Array.isArray(time_slots) ? time_slots : (time_slots ? [time_slots] : ['ALL_DAY']);
    const cleanReason = (reason || '').trim();

    let completed = 0;
    let errors = [];

    slots.forEach(slot => {
        const query = `
            INSERT INTO blocked_slots (simulator_name, booking_date, time_slot, reason)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (simulator_name, booking_date, time_slot)
            DO UPDATE SET reason = excluded.reason
        `;
        db.run(query, [simName, booking_date, slot, cleanReason], function (err) {
            if (err) {
                // SQLite fallback if ON CONFLICT syntax differs
                db.run("DELETE FROM blocked_slots WHERE simulator_name = ? AND booking_date = ? AND time_slot = ?", [simName, booking_date, slot], () => {
                    db.run("INSERT INTO blocked_slots (simulator_name, booking_date, time_slot, reason) VALUES (?, ?, ?, ?)", [simName, booking_date, slot, cleanReason], (insErr) => {
                        if (insErr) errors.push(insErr.message);
                        completed++;
                        if (completed === slots.length) {
                            if (errors.length > 0 && completed === errors.length) {
                                return res.status(500).json({ error: 'Failed to block slots' });
                            }
                            res.json({ success: true, count: completed });
                        }
                    });
                });
                return;
            }
            completed++;
            if (completed === slots.length) {
                res.json({ success: true, count: completed });
            }
        });
    });
});

// Unblock a slot by id (Protected - requires 'block_slots' permission or Super Admin)
app.delete('/api/admin/blocked-slots/:id', verifyToken, checkPermission('block_slots'), (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM blocked_slots WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, deleted: this.changes });
    });
});

// ==========================================
// TIME SLOTS & WRISTBAND COLOR CODE ROUTES
// ==========================================

// 1. Get all time slots (Sim Podium Dedicated Slots)
app.get('/api/admin/slots', verifyToken, (req, res) => {
    db.all("SELECT * FROM sim_podium_time_slots ORDER BY sort_order ASC, start_hour ASC, id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching slots' });
        // Augment with computed wristband styles if configured
        const slotsWithColor = (rows || []).map(slot => {
            const resolved = getSlotWristbandColor(slot.label, slot.color, slot.color_name);
            const badgeStyle = resolved ? getWristbandBadgeStyle(resolved.hex) : null;
            return {
                ...slot,
                resolved_hex: resolved ? resolved.hex : null,
                resolved_color_name: resolved ? resolved.name : null,
                badge_style: badgeStyle
            };
        });
        res.json(slotsWithColor);
    });
});

// 2. Create a new time slot
app.post('/api/admin/slots', verifyToken, checkPermission('block_slots'), (req, res) => {
    const { label, start_hour, end_hour, color, color_name, remark, sort_order, active } = req.body;
    const cleanLabel = (label || '').trim();

    if (!cleanLabel) {
        return res.status(400).json({ error: 'Slot label is required (e.g. 11AM-12PM).' });
    }

    const startNum = parseFloat(start_hour) || 0;
    const endNum = parseFloat(end_hour) || (startNum + 1.0);
    const sortNum = parseInt(sort_order, 10) || 0;
    const activeVal = active === 0 || active === false ? 0 : 1;

    // Auto-resolve hex and name using slotColors helper
    let hex = (color || '').trim();
    let name = (color_name || '').trim();
    if (!hex && name) {
        const foundHex = resolveColorNameToHex(name);
        if (foundHex) hex = foundHex;
    }
    const resolved = getSlotWristbandColor(cleanLabel, hex, name);

    db.get("SELECT id FROM sim_podium_time_slots WHERE UPPER(label) = UPPER(?)", [cleanLabel], (chkErr, existing) => {
        if (existing) {
            return res.status(400).json({ error: `A time slot with label '${cleanLabel}' already exists.` });
        }

        db.run(
            `INSERT INTO sim_podium_time_slots (label, start_hour, end_hour, sort_order, color, color_name, remark, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [cleanLabel, startNum, endNum, sortNum, resolved.hex, resolved.name, (remark || '').trim() || null, activeVal],
            function (insErr) {
                if (insErr) {
                    console.error('Error creating time slot:', insErr);
                    return res.status(500).json({ error: insErr.message || 'Failed to create time slot' });
                }
                res.json({
                    success: true,
                    id: this ? this.lastID : null,
                    label: cleanLabel,
                    start_hour: startNum,
                    end_hour: endNum,
                    color: resolved.hex,
                    color_name: resolved.name,
                    remark: (remark || '').trim() || null,
                    active: activeVal
                });
            }
        );
    });
});

// 3. Update an existing time slot
app.put('/api/admin/slots/:id', verifyToken, checkPermission('block_slots'), (req, res) => {
    const slotId = parseInt(req.params.id, 10);
    if (!slotId) return res.status(400).json({ error: 'Valid slot ID is required' });

    const { label, start_hour, end_hour, color, color_name, remark, sort_order, active } = req.body;
    const cleanLabel = (label || '').trim();

    if (!cleanLabel) {
        return res.status(400).json({ error: 'Slot label is required.' });
    }

    const startNum = parseFloat(start_hour) || 0;
    const endNum = parseFloat(end_hour) || (startNum + 1.0);
    const sortNum = parseInt(sort_order, 10) || 0;
    const activeVal = active === 0 || active === false ? 0 : 1;

    let hex = (color || '').trim();
    let name = (color_name || '').trim();
    if (!hex && name) {
        const foundHex = resolveColorNameToHex(name);
        if (foundHex) hex = foundHex;
    }
    const resolved = getSlotWristbandColor(cleanLabel, hex, name);

    db.get("SELECT id FROM sim_podium_time_slots WHERE UPPER(label) = UPPER(?) AND id != ?", [cleanLabel, slotId], (chkErr, existing) => {
        if (existing) {
            return res.status(400).json({ error: `Slot label '${cleanLabel}' is already in use by another slot.` });
        }

        db.run(
            `UPDATE sim_podium_time_slots
             SET label = ?,
                 start_hour = ?,
                 end_hour = ?,
                 sort_order = ?,
                 color = ?,
                 color_name = ?,
                 remark = ?,
                 active = ?
             WHERE id = ?`,
            [cleanLabel, startNum, endNum, sortNum, resolved.hex, resolved.name, (remark || '').trim() || null, activeVal, slotId],
            function (upErr) {
                if (upErr) {
                    console.error('Error updating time slot:', upErr);
                    return res.status(500).json({ error: 'Failed to update time slot' });
                }
                res.json({ success: true, updated: this ? this.changes : 1 });
            }
        );
    });
});

// 4. Toggle active status of a time slot
app.patch('/api/admin/slots/:id/toggle', verifyToken, checkPermission('block_slots'), (req, res) => {
    const slotId = parseInt(req.params.id, 10);
    if (!slotId) return res.status(400).json({ error: 'Valid slot ID is required' });

    db.get("SELECT active FROM sim_podium_time_slots WHERE id = ?", [slotId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Slot not found' });

        const newStatus = row.active === 1 ? 0 : 1;
        db.run("UPDATE sim_podium_time_slots SET active = ? WHERE id = ?", [newStatus, slotId], function (upErr) {
            if (upErr) return res.status(500).json({ error: 'Failed to toggle slot status' });
            res.json({ success: true, active: newStatus });
        });
    });
});

// 5. Delete a single time slot
app.delete('/api/admin/slots/:id', verifyToken, checkPermission('block_slots'), (req, res) => {
    const slotId = parseInt(req.params.id, 10);
    if (!slotId) return res.status(400).json({ error: 'Valid slot ID is required' });

    db.run("DELETE FROM sim_podium_time_slots WHERE id = ?", [slotId], function (delErr) {
        if (delErr) return res.status(500).json({ error: 'Failed to delete time slot' });
        res.json({ success: true, deleted: this ? this.changes : 1 });
    });
});

// 6. Delete multiple time slots at once (Bulk Delete)
app.post('/api/admin/slots/bulk-delete', verifyToken, checkPermission('block_slots'), (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Please provide an array of slot IDs to delete.' });
    }

    const cleanIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
        return res.status(400).json({ error: 'No valid slot IDs provided.' });
    }

    const placeholders = cleanIds.map(() => '?').join(',');
    const sql = `DELETE FROM sim_podium_time_slots WHERE id IN (${placeholders})`;

    db.run(sql, cleanIds, function (delErr) {
        if (delErr) {
            console.error('Error bulk deleting time slots:', delErr);
            return res.status(500).json({ error: 'Failed to delete selected time slots' });
        }
        res.json({
            success: true,
            deletedCount: this ? this.changes : cleanIds.length,
            message: `Successfully deleted ${this ? this.changes : cleanIds.length} time slot(s).`
        });
    });
});

// Delete a booking or slot lock (Protected - requires 'delete_orders' permission or Super Admin)
app.delete('/api/admin/bookings/:order_id', verifyToken, checkPermission('delete_orders'), (req, res) => {
    let { order_id } = req.params;
    order_id = decodeURIComponent(order_id).trim();

    // 1. Delete from bookings table
    db.run("DELETE FROM bookings WHERE order_id = ? OR order_id LIKE ?", [order_id, `${order_id}%`], function (bErr) {
        if (bErr) {
            console.error('Error deleting from bookings:', bErr);
            return res.status(500).json({ error: 'Database error deleting booking' });
        }
        const bookingsDeleted = this?.changes || 0;

        // 2. Also delete from simulator_slot_locks table (for cross-platform combo passes like RC Fun Zone)
        db.run("DELETE FROM simulator_slot_locks WHERE source_order_id = ? OR source_order_id LIKE ?", [order_id, `${order_id}%`], function (lErr) {
            if (lErr) {
                console.error('Error deleting from simulator_slot_locks:', lErr);
            }
            const locksDeleted = this?.changes || 0;

            console.log(`[Admin Delete] Order: ${order_id} -> Deleted: ${bookingsDeleted} bookings, ${locksDeleted} slot locks`);

            if (bookingsDeleted === 0 && locksDeleted === 0) {
                return res.status(404).json({ error: `Order #${order_id} not found in bookings or simulator locks.` });
            }

            res.json({
                success: true,
                message: `Order #${order_id} deleted successfully.`,
                bookingsDeleted,
                locksDeleted
            });
        });
    });
});

// Purge test orders by specific order_id or name (Protected - Super Admin only)
app.post('/api/admin/purge-test-orders', verifyToken, verifySuperAdmin, (req, res) => {
    const { order_id, name } = req.body || {};
    if (!order_id && !name) {
        return res.json({ success: true, message: 'No target specified.', bookingsDeleted: 0, locksDeleted: 0 });
    }
    const query = order_id ? "DELETE FROM bookings WHERE order_id = ?" : "DELETE FROM bookings WHERE LOWER(name) = ?";
    const param = order_id ? order_id : String(name).trim().toLowerCase();

    db.run(query, [param], function (err) {
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        const bookingsDeleted = this?.changes || 0;
        const lockQuery = order_id ? "DELETE FROM simulator_slot_locks WHERE source_order_id = ?" : "DELETE FROM simulator_slot_locks WHERE LOWER(customer_name) = ?";
        db.run(lockQuery, [param], function (lockErr) {
            const locksDeleted = this?.changes || 0;
            res.json({
                success: true,
                message: `Deleted ${bookingsDeleted} bookings and ${locksDeleted} slot locks.`,
                bookingsDeleted,
                locksDeleted
            });
        });
    });
});

// Mark booking as attended (Protected - requires 'edit_orders' permission or Super Admin)
app.put('/api/admin/bookings/:order_id/attend', verifyToken, checkPermission('edit_orders'), (req, res) => {
    const { order_id } = req.params;
    db.run("UPDATE bookings SET status = 'ATTENDED' WHERE order_id LIKE ?", [`${order_id}%`], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json({ success: true });
    });
});

// Manually override booking status (Protected - requires 'edit_orders' permission or Super Admin)
app.put('/api/admin/bookings/:order_id/status', verifyToken, checkPermission('edit_orders'), (req, res) => {
    let { order_id } = req.params;
    order_id = decodeURIComponent(order_id).trim();
    const cleanId = order_id.replace(/^#+/, '');
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PAID', 'ATTENDED', 'CANCELLED', 'CASH', 'REFUNDED'];
    if (!validStatuses.includes(status?.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    const targetStatus = status.toUpperCase();

    db.run(
        `UPDATE bookings SET status = ? 
         WHERE order_id = ? OR order_id = ? OR order_id = ? 
            OR order_id LIKE ? OR order_id LIKE ? OR order_id LIKE ?`,
        [targetStatus, cleanId, `#${cleanId}`, `##${cleanId}`, `${cleanId}%`, `#${cleanId}%`, `##${cleanId}%`],
        function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            const bookingsUpdated = this?.changes || 0;

            // Also sync status on simulator_slot_locks (e.g. Fun Zone combo passes)
            const lockAction = (targetStatus === 'CANCELLED' || targetStatus === 'REFUNDED')
                ? `DELETE FROM simulator_slot_locks 
                   WHERE source_order_id = ? OR source_order_id = ? OR source_order_id = ? 
                      OR source_order_id LIKE ? OR source_order_id LIKE ? OR source_order_id LIKE ?`
                : `UPDATE simulator_slot_locks SET status = ? 
                   WHERE source_order_id = ? OR source_order_id = ? OR source_order_id = ? 
                      OR source_order_id LIKE ? OR source_order_id LIKE ? OR source_order_id LIKE ?`;
            const lockParams = (targetStatus === 'CANCELLED' || targetStatus === 'REFUNDED')
                ? [cleanId, `#${cleanId}`, `##${cleanId}`, `${cleanId}%`, `#${cleanId}%`, `##${cleanId}%`]
                : [targetStatus, cleanId, `#${cleanId}`, `##${cleanId}`, `${cleanId}%`, `#${cleanId}%`, `##${cleanId}%`];

        db.run(lockAction, lockParams, function (lockErr) {
            const locksUpdated = this?.changes || 0;
            if (bookingsUpdated === 0 && locksUpdated === 0) {
                return res.status(404).json({ error: `Order #${order_id} not found.` });
            }
            res.json({ success: true, bookingsUpdated, locksUpdated });
        });
    });
});

// Update Wristband Number for a single booking item (Protected - requires 'edit_orders' permission or Super Admin)
app.put('/api/admin/bookings/:id/wristband', verifyToken, checkPermission('edit_orders'), (req, res) => {
    const bookingId = parseInt(req.params.id, 10);
    if (!bookingId) {
        return res.status(400).json({ error: 'Valid booking ID is required.' });
    }

    const { wristband_number } = req.body;
    const cleanBand = (wristband_number || '').trim();

    db.run(
        "UPDATE bookings SET wristband_number = ? WHERE id = ?",
        [cleanBand || null, bookingId],
        function (err) {
            if (err) {
                console.error('Error updating wristband number:', err);
                return res.status(500).json({ error: 'Database error updating wristband number.' });
            }
            if (this && this.changes === 0) {
                return res.status(404).json({ error: 'Booking item not found.' });
            }
            res.json({ success: true, id: bookingId, wristband_number: cleanBand || null });
        }
    );
});

// Process ICICI Refund for a Booking (Protected - requires 'refunds' permission or Super Admin)
app.post('/api/admin/bookings/:order_id/refund', verifyToken, checkPermission('refunds'), async (req, res) => {
    const { order_id } = req.params;
    const refundAmount = req.body.amount ? parseFloat(req.body.amount).toFixed(2) : null;

    db.all("SELECT * FROM bookings WHERE order_id LIKE ?", [`${order_id}%`], async (err, rows) => {
        if (err || !rows || rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = rows[0];
        if (booking.status === 'REFUNDED') {
            return res.status(400).json({ error: 'This order has already been refunded.' });
        }
        if (booking.status !== 'PAID' && booking.status !== 'ATTENDED') {
            return res.status(400).json({ error: `Cannot refund an order with status "${booking.status}". Only PAID orders can be refunded.` });
        }

        const totalAmount = refundAmount || rows.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0).toFixed(2);
        
        // Find the gateway transaction ID to refund:
        // ICICI refunds require the original gateway transaction ID (icici_txn_id, e.g. '3000004563830')
        // or the transaction attempt reference (icici_merchant_txn / merchantTxnNo).
        // If the booking was paid via a payment link (#PL_...), look up the payment link's icici_txn_id.
        let originalTxnNo = booking.icici_txn_id || booking.icici_merchant_txn;

        const executeRefund = async (targetTxnNo) => {
            if (!targetTxnNo) {
                targetTxnNo = booking.order_id;
            }

            const refundTxnNo = ('REF_' + Date.now().toString().slice(-8) + Math.floor(100 + Math.random() * 900)).slice(0, 20);

            const refundPayload = {
                amount: totalAmount,
                merchantId: ICICI_MERCHANT_ID,
                merchantTxnNo: refundTxnNo,
                originalTxnNo: targetTxnNo,
                transactionType: 'REFUND'
            };
            if (ICICI_AGGREGATOR_ID) {
                refundPayload.aggregatorID = ICICI_AGGREGATOR_ID;
            }
            refundPayload.secureHash = generateIciciHash(refundPayload);

            try {
                const formBody = new URLSearchParams();
                for (const [k, v] of Object.entries(refundPayload)) {
                    formBody.append(k, v);
                }

                const iciciBase = ICICI_ENV === 'live' ? 'https://pgpay.icici.bank.in/pg/api' : 'https://pgpayuat.icicibank.com/tsp/pg/api';
                const response = await fetch(`${iciciBase}/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formBody.toString()
                });

                const data = await response.json();
                console.log(`ICICI Refund Response (target: ${targetTxnNo}):`, data);

                // Response code "000" or "R1000" means refund accepted / success
                if (data.responseCode === "000" || data.responseCode === "R1000") {
                    const finalRefundId = data.txnID || refundTxnNo;
                    db.run("UPDATE bookings SET status = 'REFUNDED', refund_id = ? WHERE order_id LIKE ?", [finalRefundId, `${order_id}%`], () => {
                        // Release / Cancel any associated locks so the slot becomes free
                        db.run("UPDATE simulator_slot_locks SET status = 'CANCELLED' WHERE source_order_id = ? OR source_order_id LIKE ?", [order_id, `${order_id}%`]);

                        res.json({
                            success: true,
                            message: 'Refund processed successfully',
                            refundTxnNo: finalRefundId,
                            details: data
                        });
                    });
                } else {
                    return res.status(400).json({
                        error: data.respDescription || 'ICICI Payment Gateway rejected the refund request',
                        code: data.responseCode,
                        details: data
                    });
                }
            } catch (apiErr) {
                console.error('Refund API error:', apiErr);
                return res.status(500).json({ error: 'Failed to communicate with ICICI Refund Gateway' });
            }
        };

        if (originalTxnNo) {
            return executeRefund(originalTxnNo);
        }

        // If not directly on booking, check if payment_ref holds a Payment Link ID (e.g. PL_ATTZOZ)
        const payRef = (booking.payment_ref || '').trim();
        if (payRef.startsWith('PL_')) {
            db.get("SELECT icici_txn_id, icici_merchant_txn FROM payment_links WHERE link_id = ?", [payRef], (plErr, plRow) => {
                const foundTxn = (plRow && (plRow.icici_txn_id || plRow.icici_merchant_txn)) || booking.order_id;
                executeRefund(foundTxn);
            });
        } else {
            executeRefund(booking.order_id);
        }
    });
});

// ==========================================
// DESK CUSTOMER CHECK-IN & OTP VERIFICATION
// ==========================================

// In-memory OTP storage: key = normalized phone, value = { otp, expiresAt, orderIds }
const deskOtpStore = new Map();

// Helper to normalize phone number (extract digits)
function normalizePhone(rawPhone) {
    if (!rawPhone) return '';
    return String(rawPhone).replace(/[^0-9]/g, '');
}

// Helper to parse international phone number into countryCode and clean phoneNumber
function parseInternationalPhone(rawPhone) {
    if (!rawPhone) return { countryCode: '+91', phoneNumber: '' };
    const str = String(rawPhone).trim();

    if (str.startsWith('+')) {
        const digits = str.slice(1).replace(/\D/g, '');
        // Known 3-digit country codes (e.g. +971 UAE, +966 KSA, +974 QAT, +353 IRL, +852 HKG, +880 BGD, +977 NPL)
        const threeDigitCodes = ['971', '966', '974', '968', '965', '973', '353', '852', '880', '977'];
        for (const code of threeDigitCodes) {
            if (digits.startsWith(code) && digits.length > code.length) {
                return { countryCode: `+${code}`, phoneNumber: digits.slice(code.length) };
            }
        }
        // Known 2-digit country codes (e.g. +91 IND, +44 GBR, +61 AUS, +65 SGP, +49 DEU, +33 FRA, +39 ITA, +34 ESP, +31 NLD, +41 CHE, +46 SWE, +47 NOR, +64 NZL, +60 MYS, +62 IDN, +66 THA, +63 PHL, +84 VNM, +81 JPN, +82 KOR, +86 CHN, +27 ZAF, +55 BRA, +52 MEX, +94 LKA, +92 PAK, +20 EGY, +90 TUR)
        const twoDigitCodes = ['91', '44', '61', '65', '49', '33', '39', '34', '31', '41', '46', '47', '64', '60', '62', '66', '63', '84', '81', '82', '86', '27', '55', '52', '94', '92', '20', '90'];
        for (const code of twoDigitCodes) {
            if (digits.startsWith(code) && digits.length > code.length) {
                return { countryCode: `+${code}`, phoneNumber: digits.slice(code.length) };
            }
        }
        // Known 1-digit country codes (e.g. +1 USA/CAN, +7 RUS)
        const oneDigitCodes = ['1', '7'];
        for (const code of oneDigitCodes) {
            if (digits.startsWith(code) && digits.length > code.length) {
                return { countryCode: `+${code}`, phoneNumber: digits.slice(code.length) };
            }
        }
        // Fallback for general + prefixed numbers: first 2 digits as code if length >= 12
        if (digits.length >= 12) {
            return { countryCode: `+${digits.slice(0, 2)}`, phoneNumber: digits.slice(2) };
        }
        return { countryCode: '+91', phoneNumber: digits };
    }

    const clean = str.replace(/\D/g, '');
    // If standard 10-digit Indian mobile number
    if (clean.length === 10) {
        return { countryCode: '+91', phoneNumber: clean };
    }
    // If 12-digit starting with 91
    if (clean.length === 12 && clean.startsWith('91')) {
        return { countryCode: '+91', phoneNumber: clean.slice(2) };
    }
    // If 11-digit starting with 0
    if (clean.length === 11 && clean.startsWith('0')) {
        return { countryCode: '+91', phoneNumber: clean.slice(1) };
    }

    return { countryCode: '+91', phoneNumber: clean };
}

// Automated WhatsApp Booking Confirmation Notification via Interakt API
async function sendBookingConfirmationWhatsApp({ customerName, customerPhone, orderId, sessionDetails, date, timeSlot, totalAmount, paymentStatus }) {
    const interaktApiKey = process.env.INTERAKT_API_KEY;
    if (!interaktApiKey) {
        console.log('[Interakt WhatsApp] INTERAKT_API_KEY not configured. Skipping WhatsApp confirmation.');
        return;
    }

    if (!customerPhone) {
        console.log('[Interakt WhatsApp] No customer phone provided. Skipping WhatsApp confirmation.');
        return;
    }

    const { countryCode, phoneNumber } = parseInternationalPhone(customerPhone);
    if (!phoneNumber) {
        console.warn(`[Interakt WhatsApp] Could not extract valid phone number from: "${customerPhone}". Skipping.`);
        return;
    }

    const templateName = process.env.INTERAKT_BOOKING_TEMPLATE || "sim_podium_booking_confirmation";
    const driverName = (customerName || "Driver").trim();
    const formattedOrderId = String(orderId || "").replace(/_\d+$/, '');
    const formattedSession = String(sessionDetails || "Simulator Session").trim();
    const formattedDateTime = `${date || 'Scheduled Date'} • ${timeSlot || 'Scheduled Time'}`;
    const formattedAmount = `₹${totalAmount} (${paymentStatus || 'Confirmed'})`;

    const requestPayload = {
        countryCode: countryCode,
        phoneNumber: phoneNumber,
        type: "Template",
        template: {
            name: templateName,
            languageCode: "en",
            bodyValues: [
                driverName,
                formattedOrderId,
                formattedSession,
                formattedDateTime,
                formattedAmount
            ]
        }
    };

    try {
        console.log(`[Interakt WhatsApp] Sending booking confirmation to ${countryCode}${phoneNumber} (Order #${formattedOrderId})...`);
        const response = await fetch('https://api.interakt.ai/v1/public/message/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${interaktApiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            console.log(`[Interakt WhatsApp] Booking confirmation dispatched successfully to ${countryCode}${phoneNumber}! Result:`, data.result || 'OK');
        } else {
            const errText = await response.text();
            console.warn(`[Interakt WhatsApp] Interakt API returned status ${response.status}:`, errText);
        }
    } catch (err) {
        console.error('[Interakt WhatsApp] Error sending booking confirmation:', err.message);
    }
}

// Helper to format booking rows into parameters for sendBookingConfirmationWhatsApp
function dispatchBookingWhatsAppNotification(rows, paymentStatus) {
    if (!rows || rows.length === 0) return;
    const primary = rows[0];
    const customerName = primary.name;
    const customerPhone = primary.phone;
    let orderId = primary.order_id || '';
    const parts = orderId.split('_');
    if (parts[1] === 'SP') {
        orderId = parts.slice(0, 3).join('_');
    } else if (parts.length >= 4) {
        orderId = parts.slice(0, 3).join('_');
    }

    const sessionSummary = rows.map(r => {
        const isDuo = (Number(r.players) === 2 || r.player_two_name);
        return `${r.item_name || 'Simulator'}${isDuo ? ' (2-Player Duo)' : ''}`;
    }).join(' + ');

    const date = primary.booking_date || '';
    const timeSlot = rows.map(r => r.booking_time).filter(Boolean).join(', ') || '';
    const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0).toFixed(2);

    sendBookingConfirmationWhatsApp({
        customerName,
        customerPhone,
        orderId,
        sessionDetails: sessionSummary,
        date,
        timeSlot,
        totalAmount,
        paymentStatus
    }).catch(e => console.error('[Interakt WhatsApp] Unhandled rejection:', e));
}

// Automated Payment Link Notification via Interakt WhatsApp
async function sendPaymentLinkWhatsApp({ customerName, customerPhone, amount, paymentUrl, venueName = "Havoc Sim Podium", orderSummary = "" }) {
    const interaktApiKey = process.env.INTERAKT_API_KEY;
    if (!customerPhone) {
        return { success: false, reason: 'No customer phone provided' };
    }

    const { countryCode, phoneNumber } = parseInternationalPhone(customerPhone);
    const cleanDigitsCountry = countryCode.replace(/\D/g, "") || "91";
    const waNumber = `${cleanDigitsCountry}${phoneNumber}`;
    const custName = (customerName || "Driver").trim();
    const formattedAmt = parseFloat(amount).toFixed(2);

    // Direct WhatsApp message text as standard fallback / manual wa.me link
    const messageText = `Hi ${custName}! 🏁\n\nHere is your secure payment link for your session at ${venueName}:\n\n• Amount Due: ₹${formattedAmt}\n• Payment Link: ${paymentUrl}\n\nTap the link above to complete your payment online.`;
    const waMeUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(messageText)}`;

    const templateName = process.env.INTERAKT_PAYMENT_LINK_TEMPLATE || "havoc_payment_link";

    if (!interaktApiKey) {
        console.log(`[Payment Link WhatsApp] INTERAKT_API_KEY not configured. WhatsApp waMeUrl generated.`);
        return { success: false, reason: 'INTERAKT_API_KEY not configured', waMeUrl, messageText };
    }

    if (!phoneNumber) {
        console.warn(`[Payment Link WhatsApp] Invalid phone number: "${customerPhone}".`);
        return { success: false, reason: 'Invalid phone number', waMeUrl, messageText };
    }

    try {
        console.log(`[Payment Link WhatsApp] Dispatching via Interakt to ${countryCode}${phoneNumber} (Template: ${templateName})...`);
        const response = await fetch('https://api.interakt.ai/v1/public/message/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${interaktApiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                countryCode: countryCode,
                phoneNumber: phoneNumber,
                type: 'Template',
                template: {
                    name: templateName,
                    languageCode: 'en',
                    bodyValues: [
                        custName,
                        venueName,
                        formattedAmt,
                        paymentUrl
                    ]
                }
            })
        });

        if (response.ok) {
            console.log(`[Payment Link WhatsApp] Dispatched successfully via Interakt to ${countryCode}${phoneNumber}!`);
            return { success: true, viaInterakt: true, waMeUrl, messageText };
        } else {
            const errText = await response.text();
            console.warn(`[Payment Link WhatsApp] Interakt returned status ${response.status}:`, errText);
            return { success: false, viaInterakt: false, reason: errText, waMeUrl, messageText };
        }
    } catch (err) {
        console.error('[Payment Link WhatsApp] Error sending via Interakt:', err.message);
        return { success: false, viaInterakt: false, reason: err.message, waMeUrl, messageText };
    }
}

// Automated Google Review / Experience Feedback Notification via Interakt WhatsApp
const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJb8-vOgMVrjsRW__4-FpHspA";

async function sendGoogleReviewWhatsApp({ customerName, customerPhone, reviewUrl = GOOGLE_REVIEW_URL }) {
    const interaktApiKey = process.env.INTERAKT_API_KEY;
    if (!interaktApiKey) {
        console.log(`[Review WhatsApp] INTERAKT_API_KEY not configured. Mock review message for ${customerPhone} (${customerName}): "Thanks for racing at Havoc Sim Podium! Rate your experience here: ${reviewUrl}"`);
        return { success: false, reason: 'INTERAKT_API_KEY not configured' };
    }

    if (!customerPhone) {
        return { success: false, reason: 'No customer phone provided' };
    }

    const { countryCode, phoneNumber } = parseInternationalPhone(customerPhone);
    if (!phoneNumber) {
        console.warn(`[Review WhatsApp] Invalid phone number: "${customerPhone}". Skipping.`);
        return { success: false, reason: 'Invalid phone number' };
    }

    const templateName = process.env.INTERAKT_REVIEW_TEMPLATE || "simpodium_google_review";
    const driverName = (customerName || "Driver").trim();
    const languageCode = process.env.INTERAKT_REVIEW_LANG || "en";

    // Default payload (with both driverName body variable and optional CTA button URL variable)
    const requestPayload = {
        countryCode: countryCode,
        phoneNumber: phoneNumber,
        type: "Template",
        template: {
            name: templateName,
            languageCode: languageCode,
            bodyValues: [
                driverName
            ]
        }
    };

    try {
        console.log(`[Review WhatsApp] Sending experience review request to ${countryCode}${phoneNumber} with template "${templateName}" (lang: ${languageCode})...`);
        console.log(`[Review WhatsApp] Request Payload:`, JSON.stringify(requestPayload));

        let response = await fetch('https://api.interakt.ai/v1/public/message/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${interaktApiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            console.log(`[Review WhatsApp] Google Review request dispatched successfully to ${countryCode}${phoneNumber}! Result:`, data.result || 'OK');
            return { success: true, result: data.result || 'OK' };
        }

        let errText = await response.text();
        console.warn(`[Review WhatsApp] Interakt API returned status ${response.status}:`, errText);

        // Fallback 1: If rejected because the CTA button was configured as a Dynamic URL in Interakt/Meta,
        // it requires buttonValues: { "0": ["..."] }
        if (errText.includes('button') || errText.includes('param') || response.status === 400) {
            console.log(`[Review WhatsApp] Retrying with buttonValues (dynamic URL button fallback)...`);
            requestPayload.template.buttonValues = {
                "0": ["ChIJb8-vOgMVrjsRW__4-FpHspA"]
            };
            const btnResp = await fetch('https://api.interakt.ai/v1/public/message/', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${interaktApiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            if (btnResp.ok) {
                const btnData = await btnResp.json().catch(() => ({}));
                console.log(`[Review WhatsApp] Google Review request dispatched successfully with buttonValues to ${countryCode}${phoneNumber}!`);
                return { success: true, result: btnData.result || 'OK' };
            }
            const btnErr = await btnResp.text();
            console.warn(`[Review WhatsApp] Retry with buttonValues returned status ${btnResp.status}:`, btnErr);
            // If still failed, delete buttonValues before testing languageCode fallback
            delete requestPayload.template.buttonValues;
        }

        // Fallback 2: If languageCode was 'en' and failed (e.g. template approved under en_US), retry with 'en_US'
        if (languageCode === 'en' && (errText.includes('language') || errText.includes('template') || response.status === 400 || response.status === 404)) {
            console.log(`[Review WhatsApp] Retrying with languageCode: "en_US"...`);
            requestPayload.template.languageCode = "en_US";
            const retryResp = await fetch('https://api.interakt.ai/v1/public/message/', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${interaktApiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            if (retryResp.ok) {
                const retryData = await retryResp.json().catch(() => ({}));
                console.log(`[Review WhatsApp] Google Review request dispatched successfully on retry (en_US) to ${countryCode}${phoneNumber}!`);
                return { success: true, result: retryData.result || 'OK' };
            }
            errText = await retryResp.text();
            console.warn(`[Review WhatsApp] Retry with en_US also returned status ${retryResp.status}:`, errText);

            // Also test en_US with buttonValues
            requestPayload.template.buttonValues = { "0": ["ChIJb8-vOgMVrjsRW__4-FpHspA"] };
            const retryBtnResp = await fetch('https://api.interakt.ai/v1/public/message/', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${interaktApiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });
            if (retryBtnResp.ok) {
                const rData = await retryBtnResp.json().catch(() => ({}));
                console.log(`[Review WhatsApp] Google Review request dispatched successfully with en_US + buttonValues!`);
                return { success: true, result: rData.result || 'OK' };
            }
        }

        return { success: false, error: errText };
    } catch (err) {
        console.error('[Review WhatsApp] Error sending Google review request:', err.message);
        return { success: false, error: err.message };
    }
}

// Helper to parse booking date string into Date object
function parseBookingDate(dateStr) {
    if (!dateStr) return null;
    try {
        // Formats: 'YYYY-MM-DD', 'DD/MM/YYYY', 'Oct 31 (Sat)', '31 Oct 2026', 'October 31, 2026'
        const clean = String(dateStr).trim();
        // Remove day of week like (Sat), (Sun)
        const noDay = clean.replace(/\([A-Za-z]+\)/g, '').trim();

        // Check if ISO format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(noDay)) {
            const [y, m, d] = noDay.split('-').map(Number);
            return new Date(y, m - 1, d);
        }

        // Check DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(noDay)) {
            const [d, m, y] = noDay.split('/').map(Number);
            return new Date(y, m - 1, d);
        }

        // Try standard Date parsing (e.g. 'Oct 31', '31 Oct 2026')
        const currentYear = new Date().getFullYear();
        let parsed = new Date(noDay);
        if (isNaN(parsed.getTime())) {
            // Try appending current year if missing
            parsed = new Date(`${noDay} ${currentYear}`);
        }
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    } catch (e) { }
    return null;
}

// Check if booking is strictly for TODAY in India (IST)
function isTodayBooking(b) {
    // If already cancelled or refunded, ignore
    if (b.status === 'CANCELLED' || b.status === 'REFUNDED') return false;

    // Current date in IST (YYYY-MM-DD and DD/MM/YYYY)
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const istYear = nowIST.getFullYear();
    const istMonth = nowIST.getMonth(); // 0-indexed
    const istDate = nowIST.getDate();

    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNamesLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const bStr = String(b.booking_date || '').trim();
    if (!bStr) return false;

    // Check parsed date
    const parsed = parseBookingDate(bStr);
    if (parsed) {
        if (parsed.getFullYear() === istYear && parsed.getMonth() === istMonth && parsed.getDate() === istDate) {
            return true;
        }
    }

    // Direct string match against today's formats (e.g., 'Oct 23', '23 Oct', '2026-10-23')
    const curShort = monthNamesShort[istMonth];
    const curLong = monthNamesLong[istMonth];
    if (bStr.includes(curShort) || bStr.includes(curLong)) {
        // Check if day number matches (with word boundary)
        const dayRegex = new RegExp(`\\b0?${istDate}\\b`);
        if (dayRegex.test(bStr)) {
            return true;
        }
    }

    return false;
}

// Helper to strictly check if a stored booking phone matches the requested country code & national number
function matchesCountryCodeAndPhone(storedPhone, targetCountryCode, targetPhoneDigits) {
    if (!storedPhone || !targetPhoneDigits) return false;
    const cleanStoredDigits = String(storedPhone).replace(/[^0-9]/g, '');
    const cleanTargetDigits = String(targetPhoneDigits).replace(/[^0-9]/g, '');
    const cleanCodeDigits = String(targetCountryCode || '+91').replace(/[^0-9]/g, '');

    // 1. If stored phone includes country code (e.g. "+91 8618796251" or "918618796251")
    if (String(storedPhone).trim().startsWith('+')) {
        const parsed = parseInternationalPhone(storedPhone);
        return parsed.countryCode === (targetCountryCode.startsWith('+') ? targetCountryCode : `+${targetCountryCode}`) &&
            parsed.phoneNumber === cleanTargetDigits;
    }

    // 2. If stored phone starts with the code digits followed by target phone digits
    if (cleanStoredDigits === `${cleanCodeDigits}${cleanTargetDigits}`) {
        return true;
    }

    // 3. If stored phone is stored without country code (e.g. 10 digits "8618796251")
    // In India (+91), 10-digit mobile numbers default to +91. Other country codes must not match a plain 10-digit Indian number!
    if (cleanStoredDigits === cleanTargetDigits) {
        if (cleanCodeDigits === '91') {
            return true;
        }
        // If user selected non-+91 country code (e.g. +1), a plain Indian number without country code should not match
        return false;
    }

    return false;
}

// 1. Lookup active / upcoming bookings by customer phone
app.post('/api/admin/verify/lookup', verifyToken, (req, res) => {
    const rawPhone = (req.body.phone || '').trim();
    const cleanPhone = normalizePhone(rawPhone);
    const rawCountryCode = (req.body.country_code || '+91').trim();
    const cleanCountryCode = rawCountryCode.startsWith('+') ? rawCountryCode : ('+' + rawCountryCode);
    const codeDigits = cleanCountryCode.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 5) {
        return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    // Query bookings that match phone (handling with or without country code)
    const phoneQueries = [
        cleanPhone,
        `%${cleanPhone}`,
        `%${codeDigits}${cleanPhone}`,
        `%${cleanCountryCode}${cleanPhone}`,
        `%${cleanPhone}%`
    ];

    db.all(`
        SELECT id, order_id, name, phone, email, item_name, price, booking_date, booking_time, status, instructor_id, players, player_two_name, created_at
        FROM bookings
        WHERE (phone = ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ?)
        ORDER BY created_at DESC, booking_date DESC, booking_time DESC
        LIMIT 30
    `, phoneQueries, (err, rows) => {
        if (err) {
            console.error('Error looking up customer bookings:', err);
            return res.status(500).json({ error: 'Database error searching customer' });
        }

        // Strictly filter to ensure the country code AND phone number match
        const matchingRows = (rows || []).filter(r => matchesCountryCodeAndPhone(r.phone, cleanCountryCode, cleanPhone));

        if (!matchingRows || matchingRows.length === 0) {
            return res.status(404).json({ error: `No bookings found for ${cleanCountryCode} ${cleanPhone}` });
        }

        // Strictly match ONLY today's sessions
        const todaySessions = matchingRows.filter(isTodayBooking);
        const customerName = matchingRows[0].name || 'Valued Customer';

        if (todaySessions.length === 0) {
            return res.status(404).json({
                error: `No sessions scheduled for TODAY for this customer (${cleanCountryCode} ${cleanPhone}). Past or future bookings cannot be checked in today.`
            });
        }

        res.json({
            success: true,
            phone: cleanPhone,
            country_code: cleanCountryCode,
            customer_name: customerName,
            booking_count: todaySessions.length,
            bookings: todaySessions
        });
    });
});

// 2. Generate and send OTP to customer
app.post('/api/admin/verify/generate-otp', verifyToken, async (req, res) => {
    const rawPhone = (req.body.phone || '').trim();
    const cleanPhone = normalizePhone(rawPhone);
    const rawCountryCode = (req.body.country_code || '+91').trim();
    const cleanCountryCode = rawCountryCode.startsWith('+') ? rawCountryCode : ('+' + rawCountryCode);
    const codeDigits = cleanCountryCode.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 5) {
        return res.status(400).json({ error: 'Valid phone number is required' });
    }

    const phoneQueries = [
        cleanPhone,
        `%${cleanPhone}`,
        `%${codeDigits}${cleanPhone}`,
        `%${cleanCountryCode}${cleanPhone}`,
        `%${cleanPhone}%`
    ];

    // Verify booking exists
    db.all(`
        SELECT order_id, name, phone, status, booking_date, created_at
        FROM bookings 
        WHERE (phone = ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ?)
        ORDER BY created_at DESC
        LIMIT 50
    `, phoneQueries, async (err, rows) => {
        // Strictly filter to ensure the country code AND phone number match
        const matchingRows = (rows || []).filter(r => matchesCountryCodeAndPhone(r.phone, cleanCountryCode, cleanPhone));

        if (err || !matchingRows || matchingRows.length === 0) {
            return res.status(404).json({ error: `No matching bookings found for ${cleanCountryCode} ${cleanPhone}` });
        }

        const todaySessions = matchingRows.filter(isTodayBooking);
        if (todaySessions.length === 0) {
            return res.status(404).json({ error: `Customer (${cleanCountryCode} ${cleanPhone}) has no bookings scheduled for TODAY. Cannot generate check-in OTP.` });
        }

        // Generate 4-digit numeric OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

        const otpPayload = {
            otp,
            expiresAt,
            countryCode: cleanCountryCode,
            phone: cleanPhone,
            customerName: matchingRows[0].name,
            matchedOrders: todaySessions.map(r => r.order_id)
        };
        deskOtpStore.set(`${cleanCountryCode}_${cleanPhone}`, otpPayload);

        console.log(`[Desk OTP] Generated OTP for customer (${cleanCountryCode} ${cleanPhone}): ${otp}`);

        // Dispatch via Interakt WhatsApp API if credentials exist
        const interaktApiKey = process.env.INTERAKT_API_KEY;
        const interaktTemplateName = process.env.INTERAKT_OTP_TEMPLATE || 'desk_checkin_otp';
        let sentViaInterakt = false;

        if (interaktApiKey) {
            try {
                const response = await fetch('https://api.interakt.ai/v1/public/message/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${interaktApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        countryCode: cleanCountryCode,
                        phoneNumber: cleanPhone,
                        type: 'Template',
                        template: {
                            name: interaktTemplateName,
                            languageCode: 'en',
                            bodyValues: [otp],
                            buttonValues: {
                                '0': [otp]
                            }
                        }
                    })
                });

                if (response.ok) {
                    sentViaInterakt = true;
                    console.log(`[Desk OTP] Interakt WhatsApp message dispatched successfully to ${cleanCountryCode}${cleanPhone}`);
                } else {
                    const errData = await response.text();
                    console.warn(`[Desk OTP] Interakt returned status ${response.status}:`, errData);
                }
            } catch (apiErr) {
                console.error('[Desk OTP] Failed to dispatch via Interakt:', apiErr.message);
            }
        } else {
            console.log('[Desk OTP] INTERAKT_API_KEY not configured yet in .env; OTP logged in server console.');
        }

        res.json({
            success: true,
            phone: cleanPhone,
            country_code: cleanCountryCode,
            customer_name: rows[0].name,
            sent_via_interakt: sentViaInterakt,
            // For convenience before Interakt template approval, return dev_otp if Interakt not configured
            dev_otp: !sentViaInterakt ? otp : undefined,
            message: sentViaInterakt
                ? 'OTP sent successfully to customer WhatsApp!'
                : `OTP generated: ${otp} (Interakt template pending/not connected)`
        });
    });
});

// 3. Confirm OTP, show full details, and AUTO-FULFILL ONLY today's sessions
app.post('/api/admin/verify/confirm-otp', verifyToken, (req, res) => {
    const rawPhone = (req.body.phone || '').trim();
    const enteredOtp = (req.body.otp || '').trim();
    const cleanPhone = normalizePhone(rawPhone);
    const rawCountryCode = (req.body.country_code || '+91').trim();
    const cleanCountryCode = rawCountryCode.startsWith('+') ? rawCountryCode : ('+' + rawCountryCode);
    const codeDigits = cleanCountryCode.replace(/[^0-9]/g, '');

    if (!cleanPhone || !enteredOtp) {
        return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const record = deskOtpStore.get(`${cleanCountryCode}_${cleanPhone}`);
    if (!record) {
        return res.status(400).json({ error: 'No OTP requested for this number or it has expired. Please generate a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
        deskOtpStore.delete(`${cleanCountryCode}_${cleanPhone}`);
        return res.status(400).json({ error: 'OTP has expired. Please generate a new code.' });
    }

    if (record.otp !== enteredOtp) {
        return res.status(400).json({ error: 'Incorrect OTP entered. Please try again.' });
    }

    // OTP Verified! Remove from cache
    deskOtpStore.delete(`${cleanCountryCode}_${cleanPhone}`);

    const phoneQueries = [
        cleanPhone,
        `%${cleanPhone}`,
        `%${codeDigits}${cleanPhone}`,
        `%${cleanCountryCode}${cleanPhone}`,
        `%${cleanPhone}%`
    ];

    // Fetch all bookings for this customer
    db.all(`
        SELECT id, order_id, name, phone, email, item_name, price, booking_date, booking_time, status, instructor_id, players, player_two_name, created_at
        FROM bookings
        WHERE phone = ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ?
        ORDER BY created_at DESC, booking_date DESC, booking_time DESC
        LIMIT 50
    `, phoneQueries, (err, allBookings) => {
        // Strictly filter to ensure the country code AND phone number match
        const matchingBookings = (allBookings || []).filter(r => matchesCountryCodeAndPhone(r.phone, cleanCountryCode, cleanPhone));

        if (err || !matchingBookings || matchingBookings.length === 0) {
            return res.status(404).json({ error: 'Verified, but no booking records could be retrieved' });
        }

        // Filter: ONLY touch TODAY's active sessions! DO NOT TOUCH any other date!
        const todaySessions = matchingBookings.filter(isTodayBooking);

        if (todaySessions.length === 0) {
            return res.status(404).json({ error: 'Verified, but this customer has no sessions scheduled for today.' });
        }

        const autoFulfilledOrders = [];
        const updatePromises = todaySessions.map(b => {
            // Auto-fulfill ONLY if paid/cash and NOT already attended
            const isPaid = (b.status === 'PAID' || b.status === 'CASH');
            if (isPaid && b.status !== 'ATTENDED') {
                autoFulfilledOrders.push(b.order_id);
                return new Promise((resolve) => {
                    db.run("UPDATE bookings SET status = 'ATTENDED' WHERE id = ?", [b.id], (upErr) => {
                        if (!upErr) b.status = 'ATTENDED';
                        resolve();
                    });
                });
            }
            return Promise.resolve();
        });

        Promise.all(updatePromises).then(async () => {
            res.json({
                success: true,
                verified: true,
                customer_name: allBookings[0].name,
                phone: cleanPhone,
                country_code: cleanCountryCode,
                auto_fulfilled: autoFulfilledOrders.length > 0,
                auto_fulfilled_orders: autoFulfilledOrders,
                bookings: todaySessions
            });
        });
    });
});

// 3.5 Direct Check-In (Direct confirmation without WhatsApp OTP)
app.post('/api/admin/verify/direct-checkin', verifyToken, (req, res) => {
    const rawPhone = (req.body.phone || '').trim();
    const cleanPhone = normalizePhone(rawPhone);
    const rawCountryCode = (req.body.country_code || req.body.countryCode || '+91').trim();
    const cleanCountryCode = rawCountryCode.startsWith('+') ? rawCountryCode : ('+' + rawCountryCode);
    const codeDigits = cleanCountryCode.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 5) {
        return res.status(400).json({ error: 'Valid phone number is required.' });
    }

    const phoneQueries = [
        cleanPhone,
        `%${cleanPhone}`,
        `%${codeDigits}${cleanPhone}`,
        `%${cleanCountryCode}${cleanPhone}`,
        `%${cleanPhone}%`
    ];

    // Fetch all bookings for this customer
    db.all(`
        SELECT id, order_id, name, phone, email, item_name, price, booking_date, booking_time, status, instructor_id, players, player_two_name, wristband_number, created_at
        FROM bookings
        WHERE phone = ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ? OR phone LIKE ?
        ORDER BY created_at DESC, booking_date DESC, booking_time DESC
        LIMIT 50
    `, phoneQueries, (err, allBookings) => {
        // Strictly filter to ensure the country code AND phone number match
        const matchingBookings = (allBookings || []).filter(r => matchesCountryCodeAndPhone(r.phone, cleanCountryCode, cleanPhone));

        if (err || !matchingBookings || matchingBookings.length === 0) {
            return res.status(404).json({ error: 'No booking records could be found for this phone number.' });
        }

        // Filter: ONLY touch TODAY's active sessions!
        const todaySessions = matchingBookings.filter(isTodayBooking);

        if (todaySessions.length === 0) {
            return res.status(404).json({ error: 'This customer has no sessions scheduled for today.' });
        }

        const autoFulfilledOrders = [];
        const updatePromises = todaySessions.map(b => {
            // Auto-fulfill ONLY if paid/cash and NOT already attended
            const isPaid = (b.status === 'PAID' || b.status === 'CASH');
            if (isPaid && b.status !== 'ATTENDED') {
                autoFulfilledOrders.push(b.order_id);
                return new Promise((resolve) => {
                    db.run("UPDATE bookings SET status = 'ATTENDED' WHERE id = ?", [b.id], (upErr) => {
                        if (!upErr) b.status = 'ATTENDED';
                        resolve();
                    });
                });
            }
            return Promise.resolve();
        });

        Promise.all(updatePromises).then(async () => {
            res.json({
                success: true,
                verified: true,
                customer_name: matchingBookings[0].name || 'Guest Customer',
                phone: cleanPhone,
                country_code: cleanCountryCode,
                auto_fulfilled: autoFulfilledOrders.length > 0,
                auto_fulfilled_orders: autoFulfilledOrders,
                bookings: todaySessions
            });
        });
    });
});

// 4. Collect desk payment and fulfill unpaid order(s)
app.post('/api/admin/verify/collect-and-fulfill', verifyToken, async (req, res) => {
    const { order_ids, amount_collected, transaction_ref } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
        return res.status(400).json({ error: 'At least one order ID is required.' });
    }

    const amt = parseFloat(amount_collected);
    if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ error: 'Valid amount collected is required.' });
    }

    const txnRef = (transaction_ref || '').trim();
    if (!txnRef) {
        return res.status(400).json({ error: 'Transaction reference number / payment note is required.' });
    }

    // Safety check: If the transaction reference is a payment link (e.g. PL_...),
    // enforce that the payment link has ACTUALLY been paid in full via ICICI gateway!
    if (txnRef.startsWith('PL_')) {
        const linkCheck = await new Promise((resolve) => {
            db.get("SELECT status, icici_txn_id FROM payment_links WHERE link_id = ?", [txnRef], (err, row) => {
                if (err || !row) return resolve({ found: false });
                return resolve({ found: true, status: row.status, txnId: row.icici_txn_id });
            });
        });

        if (linkCheck.found && linkCheck.status !== 'PAID') {
            return res.status(400).json({
                error: `Payment link #${txnRef} is still PENDING. The customer has not completed payment yet.`
            });
        }
    }

    // Verify order(s) and amounts
    const placeholders = order_ids.map(() => '?').join(',');
    db.all(`SELECT id, order_id, name, phone, email, price, status FROM bookings WHERE order_id IN (${placeholders})`, order_ids, (err, rows) => {
        if (err || !rows || rows.length === 0) {
            return res.status(404).json({ error: 'Booking records not found.' });
        }

        const expectedTotal = rows.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
        if (Math.abs(expectedTotal - amt) > 0.05) {
            return res.status(400).json({
                error: `Amount collected (₹${amt.toFixed(2)}) does not match order total (₹${expectedTotal.toFixed(2)}).`
            });
        }

        // Update each booking to status 'ATTENDED' (Paid & Fulfilled) and record payment_ref
        const updatePromises = rows.map(r => {
            return new Promise((resolve) => {
                db.run("UPDATE bookings SET status = 'ATTENDED' WHERE order_id LIKE ?", [`${r.order_id}%`], () => {
                    db.run("UPDATE bookings SET payment_ref = ? WHERE order_id LIKE ?", [txnRef, `${r.order_id}%`], () => {
                        resolve();
                    });
                });
            });
        });

        Promise.all(updatePromises).then(() => {
            console.log(`[Desk Payment] Successfully collected ₹${amt.toFixed(2)} (Ref: ${txnRef}) for orders:`, order_ids);

            // Send Google Review Request on desk payment completion
            const primaryCustomer = rows[0];
            if (primaryCustomer && primaryCustomer.phone) {
                const custName = primaryCustomer.name || 'Customer';
                sendGoogleReviewWhatsApp({
                    customerName: custName,
                    customerPhone: primaryCustomer.phone
                }).catch(e => console.error('[Review WhatsApp] Send error:', e));
            }

            res.json({
                success: true,
                message: `Payment of ₹${amt.toFixed(2)} recorded and order(s) marked as PAID and FULFILLED!`,
                order_ids,
                amount_collected: amt,
                transaction_ref: txnRef,
                review_requested: true
            });
        });
    });
});

// 5. Desk Check-In: Cancel / Walkout / Stepper adjust player quantities
app.post('/api/admin/verify/cancel-walkout', verifyToken, (req, res) => {
    const { booking_id, order_id, reduce_quantity, target_quantity, reason } = req.body;

    if (!booking_id && !order_id) {
        return res.status(400).json({ error: 'booking_id or order_id is required' });
    }

    const findQuery = booking_id ? "SELECT * FROM bookings WHERE id = ?" : "SELECT * FROM bookings WHERE order_id = ?";
    const findParam = booking_id || order_id;

    db.get(findQuery, [findParam], (err, booking) => {
        if (err || !booking) {
            return res.status(404).json({ error: 'Booking record not found' });
        }

        const currentPlayers = parseInt(booking.players, 10) || 1;
        const currentPrice = parseFloat(booking.price) || 0;
        const unitPrice = currentPlayers > 0 ? (currentPrice / currentPlayers) : currentPrice;

        let newPlayers = currentPlayers;
        if (target_quantity !== undefined && target_quantity !== null) {
            newPlayers = parseInt(target_quantity, 10);
            if (isNaN(newPlayers) || newPlayers < 0) newPlayers = 0;
            // Never allow increasing player count beyond current at check-in desk
            if (newPlayers > currentPlayers) {
                return res.status(400).json({ error: 'Adding extra players at desk is not permitted. Only opting out / reducing is allowed.' });
            }
        } else if (reduce_quantity !== undefined && reduce_quantity !== null) {
            const dec = parseInt(reduce_quantity, 10) || 1;
            newPlayers = Math.max(0, currentPlayers - dec);
        } else {
            // No quantity specified: treat as full walkout (0 players)
            newPlayers = 0;
        }

        const cleanReason = (reason || 'Customer opted out / changed mind at desk').trim();

        if (newPlayers === 0) {
            // Full cancellation: release slot lock and mark status as CANCELLED
            const newPrice = 0;
            db.run(
                "UPDATE bookings SET status = 'CANCELLED', players = 0, price = ?, payment_ref = COALESCE(payment_ref || ' | ', '') || ? WHERE id = ?",
                [newPrice, `Walkout: ${cleanReason}`, booking.id],
                function (upErr) {
                    if (upErr) {
                        return res.status(500).json({ error: 'Failed to cancel booking' });
                    }
                    // Free slot lock for cross-platform simulator calendar
                    db.run("DELETE FROM simulator_slot_locks WHERE source_order_id LIKE ?", [`${booking.order_id}%`], () => { });

                    console.log(`[Desk Check-In] Booking #${booking.id} (${booking.order_id}) marked CANCELLED/WALKOUT. Slot freed.`);
                    res.json({
                        success: true,
                        action: 'CANCELLED',
                        booking_id: booking.id,
                        order_id: booking.order_id,
                        players: 0,
                        price: 0,
                        status: 'CANCELLED',
                        message: 'Session cancelled and simulator slot released.'
                    });
                }
            );
        } else {
            // Partial reduction or increment: recalculate proportional amount
            const newPrice = Math.max(0, Math.round(unitPrice * newPlayers * 100) / 100);
            const statusToSet = booking.status === 'CANCELLED' ? 'PENDING' : booking.status;

            db.run(
                "UPDATE bookings SET players = ?, price = ?, status = ? WHERE id = ?",
                [newPlayers, newPrice, statusToSet, booking.id],
                function (upErr) {
                    if (upErr) {
                        return res.status(500).json({ error: 'Failed to update player count' });
                    }

                    console.log(`[Desk Check-In] Booking #${booking.id} (${booking.order_id}) players adjusted: ${currentPlayers} -> ${newPlayers}, Price: ₹${currentPrice} -> ₹${newPrice}`);
                    res.json({
                        success: true,
                        action: 'UPDATED',
                        booking_id: booking.id,
                        order_id: booking.order_id,
                        players: newPlayers,
                        price: newPrice,
                        unit_price: unitPrice,
                        status: statusToSet,
                        message: `Player count adjusted to ${newPlayers} (₹${newPrice.toFixed(2)}).`
                    });
                }
            );
        }
    });
});

// 6. Explicit route to send / re-send Google Review request via WhatsApp
app.post('/api/admin/verify/send-review-link', verifyToken, async (req, res) => {
    try {
        const { phone, country_code, name } = req.body;
        const cleanPhone = normalizePhone(phone || '');
        const rawCountryCode = (country_code || '+91').trim();
        const cleanCountryCode = rawCountryCode.startsWith('+') ? rawCountryCode : ('+' + rawCountryCode);
        const fullPhone = `${cleanCountryCode}${cleanPhone}`;
        const custName = (name || 'Customer').trim();

        if (!cleanPhone) {
            return res.status(400).json({ error: 'Valid phone number is required' });
        }

        const waResult = await sendGoogleReviewWhatsApp({
            customerName: custName,
            customerPhone: fullPhone
        });

        res.json({
            success: true,
            message: `Google Review WhatsApp message sent to ${fullPhone}!`,
            whatsapp: waResult
        });
    } catch (err) {
        console.error('Send review link error:', err);
        res.status(500).json({ error: 'Failed to dispatch review request' });
    }
});

// Manually create a walk-in booking (Protected)
app.post('/api/admin/bookings', verifyToken, (req, res) => {
    const { name, phone, email, item_name, price, booking_date, booking_time, status, order_id } = req.body;

    // Validate required fields
    if (!item_name || !booking_date || !booking_time) {
        return res.status(400).json({ error: 'Missing required booking details' });
    }

    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = (order_id && String(order_id).trim()) ? String(order_id).trim() : `WK_${shortCode}`;
    const finalName = name || 'Walk-in';
    const finalPhone = phone || '';
    const finalEmail = email || '';
    const finalPrice = price || 0;
    const finalStatus = status || 'CASH';

    db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, finalName, finalEmail, finalPhone, item_name, finalPrice, booking_date, booking_time, finalStatus],
        function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (finalPhone || finalEmail) {
                const bookingRecord = [{
                    order_id: orderId,
                    name: finalName,
                    email: finalEmail,
                    phone: finalPhone,
                    item_name: item_name,
                    price: finalPrice,
                    booking_date: booking_date,
                    booking_time: booking_time,
                    status: finalStatus
                }];
                if (finalEmail) sendConfirmationEmail(bookingRecord);
                if (finalPhone) dispatchBookingWhatsAppNotification(bookingRecord, finalStatus === 'PAID' ? 'Paid' : (finalStatus === 'CASH' ? 'Paid (Cash)' : 'Confirmed'));
            }

            res.json({ success: true, order_id: orderId });
        }
    );
});

// Update booking details (package/simulator, date, time slot, players, co-player, price)
app.put('/api/admin/bookings/:id/update-details', verifyToken, checkPermission('edit_orders'), (req, res) => {
    const bookingId = parseInt(req.params.id, 10);
    if (!bookingId) {
        return res.status(400).json({ error: 'Valid booking ID is required.' });
    }

    const { item_name, booking_date, booking_time, players, player_two_name, price, status, instructor_id } = req.body;

    db.get("SELECT * FROM bookings WHERE id = ?", [bookingId], (err, existing) => {
        if (err || !existing) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        const updates = [];
        const params = [];

        if (item_name !== undefined) { updates.push('item_name = ?'); params.push(item_name); }
        if (booking_date !== undefined) { updates.push('booking_date = ?'); params.push(booking_date); }
        if (booking_time !== undefined) { updates.push('booking_time = ?'); params.push(booking_time); }
        if (players !== undefined) { updates.push('players = ?'); params.push(parseInt(players, 10) || 1); }
        if (player_two_name !== undefined) { updates.push('player_two_name = ?'); params.push(player_two_name); }
        if (price !== undefined) { updates.push('price = ?'); params.push(parseFloat(price) || 0); }
        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (instructor_id !== undefined) { updates.push('instructor_id = ?'); params.push(instructor_id); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields provided for update.' });
        }

        params.push(bookingId);

        db.run("UPDATE bookings SET " + updates.join(', ') + " WHERE id = ?", params, function (uErr) {
            if (uErr) {
                console.error('Error updating booking details:', uErr);
                return res.status(500).json({ error: 'Database error updating booking.' });
            }

            // Sync with simulator_slot_locks if simulator, date, or time changed
            const finalItem = item_name !== undefined ? item_name : existing.item_name;
            const finalDate = booking_date !== undefined ? booking_date : existing.booking_date;
            const finalTime = booking_time !== undefined ? booking_time : existing.booking_time;
            const finalStatus = status !== undefined ? status : existing.status;
            const orderId = existing.order_id;

            if (orderId && (item_name !== undefined || booking_date !== undefined || booking_time !== undefined || status !== undefined)) {
                const lockUpd = [];
                const lockParams = [];
                if (item_name !== undefined) { lockUpd.push('simulator_name = ?'); lockParams.push(finalItem); }
                if (booking_date !== undefined) { lockUpd.push('booking_date = ?'); lockParams.push(finalDate); }
                if (booking_time !== undefined) { lockUpd.push('booking_time = ?'); lockParams.push(finalTime); }
                if (status !== undefined) { lockUpd.push('status = ?'); lockParams.push(finalStatus); }

                if (lockUpd.length > 0) {
                    lockParams.push(orderId, orderId + '%');
                    db.run("UPDATE simulator_slot_locks SET " + lockUpd.join(', ') + " WHERE source_order_id = ? OR source_order_id LIKE ?", lockParams, () => {});
                }
            }

            res.json({
                success: true,
                message: 'Booking details updated successfully.',
                booking_id: bookingId,
                updated: { item_name: finalItem, booking_date: finalDate, booking_time: finalTime, players, price }
            });
        });
    });
});

// Update booking details by order_id (bulk update all items in order)
app.put('/api/admin/bookings/order/:order_id/update-details', verifyToken, checkPermission('edit_orders'), (req, res) => {
    let orderId = req.params.order_id;
    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });
    orderId = decodeURIComponent(orderId).trim();

    const { booking_date, booking_time, name, phone, email } = req.body;

    const updates = [];
    const params = [];
    if (booking_date !== undefined) { updates.push('booking_date = ?'); params.push(booking_date); }
    if (booking_time !== undefined) { updates.push('booking_time = ?'); params.push(booking_time); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided for update.' });
    }

    params.push(orderId, orderId + '%');

    db.run("UPDATE bookings SET " + updates.join(', ') + " WHERE order_id = ? OR order_id LIKE ?", params, function (uErr) {
        if (uErr) {
            console.error('Error updating order details:', uErr);
            return res.status(500).json({ error: 'Database error updating order.' });
        }

        // Sync simulator_slot_locks
        if (booking_date !== undefined || booking_time !== undefined) {
            const lockUpd = [];
            const lockParams = [];
            if (booking_date !== undefined) { lockUpd.push('booking_date = ?'); lockParams.push(booking_date); }
            if (booking_time !== undefined) { lockUpd.push('booking_time = ?'); lockParams.push(booking_time); }
            lockParams.push(orderId, orderId + '%');
            db.run("UPDATE simulator_slot_locks SET " + lockUpd.join(', ') + " WHERE source_order_id = ? OR source_order_id LIKE ?", lockParams, () => {});
        }

        res.json({ success: true, message: 'Order bookings updated successfully.', order_id: orderId });
    });
});

// Update order_id for a booking (Admin only)
app.put('/api/admin/bookings/:order_id/update-order-id', verifyToken, (req, res) => {
    let oldOrderId = req.params.order_id;
    if (!oldOrderId) return res.status(400).json({ error: 'Current order ID is required' });
    oldOrderId = decodeURIComponent(oldOrderId).trim();
    const newOrderId = (req.body.new_order_id || '').trim();
    if (!newOrderId) return res.status(400).json({ error: 'Valid new_order_id is required' });

    db.run("UPDATE bookings SET order_id = ? WHERE order_id = ? OR order_id LIKE ?", [newOrderId, oldOrderId, `${oldOrderId}%`], function (bErr) {
        if (bErr) return res.status(500).json({ error: 'Database error updating booking' });
        db.run("UPDATE simulator_slot_locks SET source_order_id = ? WHERE source_order_id = ? OR source_order_id LIKE ?", [newOrderId, oldOrderId, `${oldOrderId}%`], function (lErr) {
            res.json({ success: true, oldOrderId, newOrderId });
        });
    });
});

// ==========================================
// BAND / WRISTBAND INVENTORY MANAGEMENT (Common shared pool with Havoc RC Fun Zone)
// ==========================================

function ensureBandInventorySeeded(cb) {
    // Check if inventory already exists or if band_inventory_seeded flag is set
    db.get("SELECT value FROM site_settings WHERE key = 'band_inventory_seeded'", [], (setErr, setRow) => {
        if (!setErr && setRow && setRow.value === '1') {
            if (cb) cb();
            return;
        }

        db.get("SELECT COUNT(*) as count FROM band_items", [], (err, row) => {
            if (!err && row && Number(row.count) > 0) {
                // Records already present; mark seeded permanently so we never inject starter stock
                db.run(
                    "INSERT INTO site_settings (key, value) VALUES ('band_inventory_seeded', '1') ON CONFLICT (key) DO UPDATE SET value = '1'",
                    [],
                    () => {
                        db.run("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('band_inventory_seeded', '1')", [], () => { });
                        if (cb) cb();
                    }
                );
                return;
            }

            // If band_items is 0 or empty, permanently mark seeded so phantom starter colors are NEVER auto-injected
            db.run(
                "INSERT INTO site_settings (key, value) VALUES ('band_inventory_seeded', '1') ON CONFLICT (key) DO UPDATE SET value = '1'",
                [],
                () => {
                    db.run("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('band_inventory_seeded', '1')", [], () => { });
                    if (cb) cb();
                }
            );
        });
    });
}

// 1. Get real-time stock summary & color/category breakdowns
app.get('/api/admin/bands/summary', verifyToken, (req, res) => {
    ensureBandInventorySeeded(() => {
        const countsQuery = `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) AS issued,
                SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) AS damaged,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost,
                SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) AS retired
            FROM band_items
        `;

        db.get(countsQuery, [], (err, counts) => {
            if (err) return res.status(500).json({ error: 'Database error fetching band summary' });

            const totalBands = Number(counts?.total || 0);
            const available = Number(counts?.available || 0);
            const issued = Number(counts?.issued || 0);
            const damaged = Number(counts?.damaged || 0);
            const lost = Number(counts?.lost || 0);
            const retired = Number(counts?.retired || 0);
            const activeInventory = Math.max(0, totalBands - retired);
            const availabilityRate = activeInventory > 0 ? Math.round((available / activeInventory) * 100) : 0;

            const isPg = Boolean(db && db.isPostgres);
            const todayQuery = isPg
                ? `SELECT
                        SUM(CASE WHEN transaction_type = 'ISSUE' THEN 1 ELSE 0 END) AS issued_today,
                        SUM(CASE WHEN transaction_type = 'RETURN' THEN 1 ELSE 0 END) AS returned_today
                   FROM band_transactions
                   WHERE created_at::date = CURRENT_DATE`
                : `SELECT
                        SUM(CASE WHEN transaction_type = 'ISSUE' THEN 1 ELSE 0 END) AS issued_today,
                        SUM(CASE WHEN transaction_type = 'RETURN' THEN 1 ELSE 0 END) AS returned_today
                   FROM band_transactions
                   WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')`;

            db.get(todayQuery, [], (tErr, todayRow) => {
                const issuedToday = Number(todayRow?.issued_today || 0);
                const returnedToday = Number(todayRow?.returned_today || 0);

                const colorQuery = `
                    SELECT
                        color_name,
                        color_hex,
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
                        SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) as damaged,
                        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
                        SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) as retired
                    FROM band_items
                    GROUP BY color_name, color_hex
                    ORDER BY total DESC, color_name ASC
                `;

                db.all(colorQuery, [], (cErr, colorRows) => {
                    const colorBreakdown = (colorRows || []).map(r => ({
                        color_name: r.color_name,
                        color_hex: r.color_hex,
                        total: Number(r.total || 0),
                        available: Number(r.available || 0),
                        issued: Number(r.issued || 0),
                        damaged: Number(r.damaged || 0),
                        lost: Number(r.lost || 0),
                        retired: Number(r.retired || 0)
                    }));

                    const lowStockColors = colorBreakdown
                        .filter(c => c.available < 3)
                        .map(c => ({
                            color_name: c.color_name,
                            color_hex: c.color_hex,
                            available: c.available
                        }));

                    const catQuery = `
                        SELECT
                            category,
                            COUNT(*) as total,
                            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                            SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued
                        FROM band_items
                        GROUP BY category
                        ORDER BY total DESC
                    `;

                    db.all(catQuery, [], (catErr, catRows) => {
                        const categoryBreakdown = (catRows || []).map(r => ({
                            category: r.category || "Standard",
                            total: Number(r.total || 0),
                            available: Number(r.available || 0),
                            issued: Number(r.issued || 0)
                        }));

                        // Populate active simulator slot colors (strictly Sim Podium dedicated slots)
                        db.all(`
                            SELECT DISTINCT color, color_name 
                            FROM sim_podium_time_slots 
                            WHERE active = 1 AND color IS NOT NULL AND TRIM(color) != ''
                        `, [], (tsErr, slotColorRows) => {
                            const breakdownMap = new Map();

                            // 1. Initialize slots that admin actually configured
                            (slotColorRows || []).forEach(sc => {
                                if (!sc.color) return;
                                const hex = sc.color.trim().toUpperCase();
                                const name = (sc.color_name && sc.color_name.trim()) ? sc.color_name.trim() : sc.color;
                                breakdownMap.set(hex, {
                                    color_name: name,
                                    color_hex: hex,
                                    total: 0,
                                    available: 0,
                                    issued: 0,
                                    damaged: 0,
                                    lost: 0,
                                    retired: 0
                                });
                            });

                            // 2. Overlay or add physical inventory actually present in band_items
                            (colorRows || []).forEach(r => {
                                const hex = (r.color_hex || '').trim().toUpperCase();
                                const name = (r.color_name || '').trim();
                                if (!hex) return;

                                if (breakdownMap.has(hex)) {
                                    const entry = breakdownMap.get(hex);
                                    entry.total = Number(r.total || 0);
                                    entry.available = Number(r.available || 0);
                                    entry.issued = Number(r.issued || 0);
                                    entry.damaged = Number(r.damaged || 0);
                                    entry.lost = Number(r.lost || 0);
                                    entry.retired = Number(r.retired || 0);
                                    if (name && (!entry.color_name || entry.color_name === hex)) {
                                        entry.color_name = name;
                                    }
                                } else {
                                    // Also include colors that actually have registered physical inventory in band_items
                                    breakdownMap.set(hex, {
                                        color_name: name || hex,
                                        color_hex: hex,
                                        total: Number(r.total || 0),
                                        available: Number(r.available || 0),
                                        issued: Number(r.issued || 0),
                                        damaged: Number(r.damaged || 0),
                                        lost: Number(r.lost || 0),
                                        retired: Number(r.retired || 0)
                                    });
                                }
                            });

                            const strictColorBreakdown = Array.from(breakdownMap.values()).sort((a, b) => b.total - a.total || a.color_name.localeCompare(b.color_name));

                            const lowStockColors = strictColorBreakdown
                                .filter(c => c.total > 0 && c.available < 3)
                                .map(c => ({
                                    color_name: c.color_name,
                                    color_hex: c.color_hex,
                                    available: c.available
                                }));

                            // Build stock palette strictly from active slot colors and registered band colors
                            const stockPalette = [];
                            const seenHex = new Set();
                            strictColorBreakdown.forEach(c => {
                                if (!seenHex.has(c.color_hex)) {
                                    seenHex.add(c.color_hex);
                                    stockPalette.push({
                                        hex: c.color_hex,
                                        name: c.color_name,
                                        bgClass: "bg-gray-100",
                                        textClass: "text-gray-800"
                                    });
                                }
                            });

                            res.json({
                                totalBands,
                                available,
                                issued,
                                damaged,
                                lost,
                                retired,
                                activeInventory,
                                issuedToday,
                                returnedToday,
                                availabilityRate,
                                colorBreakdown: strictColorBreakdown,
                                categoryBreakdown,
                                lowStockColors,
                                palette: stockPalette
                            });
                        });
                    });
                });
            });
        });
    });
});

// 2. Get band items list with search, status, and color filtering
app.get('/api/admin/bands/items', verifyToken, (req, res) => {
    ensureBandInventorySeeded(() => {
        const { search, status, color_name, category, limit, offset, sortBy, sortOrder } = req.query;

        const whereClauses = [];
        const params = [];

        if (search && search.trim()) {
            const s = `%${search.trim()}%`;
            whereClauses.push("(band_code LIKE ? OR current_holder_name LIKE ? OR current_order_number LIKE ? OR notes LIKE ?)");
            params.push(s, s, s, s);
        }

        if (status && status !== 'all') {
            whereClauses.push("status = ?");
            params.push(status.trim().toLowerCase());
        }

        if (color_name && color_name !== 'all') {
            whereClauses.push("color_name = ?");
            params.push(color_name.trim());
        }

        if (category && category !== 'all') {
            whereClauses.push("category = ?");
            params.push(category.trim());
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const countQuery = `SELECT COUNT(*) as cnt FROM band_items ${whereSql}`;
        db.get(countQuery, params, (cErr, cRow) => {
            if (cErr) return res.status(500).json({ error: 'Database error counting band items' });
            const totalCount = cRow ? Number(cRow.cnt) : 0;

            const allowedSortCols = ["band_code", "status", "total_uses", "created_at", "updated_at"];
            const sortCol = allowedSortCols.includes(sortBy) ? sortBy : "updated_at";
            const orderDir = (sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            let dataQuery = `SELECT * FROM band_items ${whereSql} ORDER BY ${sortCol} ${orderDir}`;
            const queryParams = [...params];

            const numLimit = parseInt(limit, 10);
            const numOffset = Math.max(0, parseInt(offset, 10) || 0);

            if (!isNaN(numLimit) && numLimit > 0) {
                dataQuery += ` LIMIT ? OFFSET ?`;
                queryParams.push(numLimit, numOffset);
            }

            db.all(dataQuery, queryParams, (err, rows) => {
                if (err) return res.status(500).json({ error: 'Database error fetching bands' });
                res.json({ items: rows || [], totalCount });
            });
        });
    });
});

// 3. Get transactions audit log
app.get('/api/admin/bands/transactions', verifyToken, (req, res) => {
    ensureBandInventorySeeded(() => {
        const { band_id, band_code, type, search, startDate, endDate, limit, offset } = req.query;

        const whereClauses = [];
        const params = [];

        if (band_id) {
            whereClauses.push("band_id = ?");
            params.push(parseInt(band_id, 10));
        }

        if (band_code && band_code.trim()) {
            whereClauses.push("UPPER(band_code) = UPPER(?)");
            params.push(band_code.trim());
        }

        if (type && type !== 'all') {
            whereClauses.push("transaction_type = ?");
            params.push(type.trim().toUpperCase());
        }

        if (search && search.trim()) {
            const s = `%${search.trim()}%`;
            whereClauses.push("(band_code LIKE ? OR customer_name LIKE ? OR order_number LIKE ? OR staff_name LIKE ? OR notes LIKE ?)");
            params.push(s, s, s, s, s);
        }

        const isPg = Boolean(db && db.isPostgres);
        if (startDate) {
            whereClauses.push(isPg ? "created_at::date >= ?" : "DATE(created_at, 'localtime') >= DATE(?)");
            params.push(startDate);
        }

        if (endDate) {
            whereClauses.push(isPg ? "created_at::date <= ?" : "DATE(created_at, 'localtime') <= DATE(?)");
            params.push(endDate);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const countQuery = `SELECT COUNT(*) as cnt FROM band_transactions ${whereSql}`;
        db.get(countQuery, params, (cErr, cRow) => {
            if (cErr) return res.status(500).json({ error: 'Database error counting transactions' });
            const totalCount = cRow ? Number(cRow.cnt) : 0;

            let dataQuery = `SELECT * FROM band_transactions ${whereSql} ORDER BY created_at DESC, id DESC`;
            const queryParams = [...params];

            const numLimit = parseInt(limit, 10);
            const numOffset = Math.max(0, parseInt(offset, 10) || 0);

            if (!isNaN(numLimit) && numLimit > 0) {
                dataQuery += ` LIMIT ? OFFSET ?`;
                queryParams.push(numLimit, numOffset);
            }

            db.all(dataQuery, queryParams, (err, rows) => {
                if (err) return res.status(500).json({ error: 'Database error fetching transactions' });
                res.json({ transactions: rows || [], totalCount });
            });
        });
    });
});

// 4. Create single band item (Stock In)
app.post('/api/admin/bands/create', verifyToken, (req, res) => {
    const { band_code, color_name, color_hex, category, notes } = req.body;
    const cleanCode = (band_code || '').trim().toUpperCase();

    if (!cleanCode) return res.status(400).json({ error: 'Unique Band ID / Code is required.' });
    if (!color_name || !color_hex) return res.status(400).json({ error: 'Color name and hex code are required.' });

    const bandCategory = category || 'Standard';
    const staffName = req.user?.username || 'Staff';
    const cleanNotes = (notes || '').trim() || null;

    db.get("SELECT id FROM band_items WHERE UPPER(band_code) = UPPER(?)", [cleanCode], (chkErr, existing) => {
        if (chkErr) return res.status(500).json({ error: 'Database error' });
        if (existing) {
            return res.status(400).json({ error: `Band ID '${cleanCode}' already exists in inventory.` });
        }

        db.run(
            `INSERT INTO band_items (band_code, color_name, color_hex, category, status, total_uses, notes)
             VALUES (?, ?, ?, ?, 'available', 0, ?)`,
            [cleanCode, color_name.trim(), color_hex.trim(), bandCategory, cleanNotes],
            function (insErr) {
                if (insErr) return res.status(500).json({ error: insErr.message || 'Failed to create band' });
                const newId = this ? this.lastID : null;

                db.run(
                    `INSERT INTO band_transactions (band_id, band_code, color_name, color_hex, transaction_type, quantity, staff_name, notes)
                     VALUES (?, ?, ?, ?, 'STOCK_IN', 1, ?, ?)`,
                    [newId, cleanCode, color_name.trim(), color_hex.trim(), staffName, cleanNotes || 'Manual stock-in'],
                    () => { }
                );

                res.json({ success: true, id: newId, band_code: cleanCode });
            }
        );
    });
});

// 5. Bulk create bands
app.post('/api/admin/bands/bulk-create', verifyToken, (req, res) => {
    const { prefix, startingNumber, count, color_name, color_hex, category, notes } = req.body;
    const cleanPrefix = (prefix || '').trim().toUpperCase();
    const numCount = Math.min(Math.max(1, parseInt(count, 10) || 10), 200);
    const startNum = Math.max(1, parseInt(startingNumber, 10) || 1);

    if (!cleanPrefix) return res.status(400).json({ error: 'Band Code Prefix is required (e.g. BND-CYAN)' });
    if (!color_name || !color_hex) return res.status(400).json({ error: 'Color selection is required.' });

    const bandCategory = category || 'Standard';
    const staffName = req.user?.username || 'Staff';
    const batchNotes = (notes || '').trim() || `Batch Stock-In of ${numCount} bands`;

    let createdCount = 0;
    let completedChecks = 0;

    for (let i = 0; i < numCount; i++) {
        const curNum = startNum + i;
        const padCode = String(curNum).padStart(3, "0");
        const code = cleanPrefix.endsWith("-") ? `${cleanPrefix}${padCode}` : `${cleanPrefix}-${padCode}`;

        db.get("SELECT id FROM band_items WHERE UPPER(band_code) = UPPER(?)", [code], (cErr, exists) => {
            if (!exists) {
                db.run(
                    `INSERT INTO band_items (band_code, color_name, color_hex, category, status, total_uses, notes)
                     VALUES (?, ?, ?, ?, 'available', 0, ?)`,
                    [code, color_name.trim(), color_hex.trim(), bandCategory, batchNotes],
                    function (insErr) {
                        if (!insErr) {
                            const newId = this ? this.lastID : null;
                            createdCount++;
                            db.run(
                                `INSERT INTO band_transactions (band_id, band_code, color_name, color_hex, transaction_type, quantity, staff_name, notes)
                                 VALUES (?, ?, ?, ?, 'STOCK_IN', 1, ?, ?)`,
                                [newId, code, color_name.trim(), color_hex.trim(), staffName, batchNotes]
                            );
                        }
                        completedChecks++;
                        if (completedChecks === numCount) {
                            res.json({ success: true, createdCount });
                        }
                    }
                );
            } else {
                completedChecks++;
                if (completedChecks === numCount) {
                    res.json({ success: true, createdCount });
                }
            }
        });
    }
});

// 6. Issue wristband to customer / order
app.post('/api/admin/bands/issue', verifyToken, (req, res) => {
    const { band_id, band_code, customer_name, booking_id, order_number, notes } = req.body;

    const lookupQuery = band_id
        ? "SELECT * FROM band_items WHERE id = ?"
        : "SELECT * FROM band_items WHERE UPPER(band_code) = UPPER(?)";
    const lookupParam = band_id ? parseInt(band_id, 10) : (band_code || '').trim();

    db.get(lookupQuery, [lookupParam], (err, band) => {
        if (err || !band) {
            return res.status(404).json({ error: `Wristband '${band_code || band_id}' not found in inventory.` });
        }

        if (band.status === 'issued') {
            return res.status(400).json({
                error: `Band '${band.band_code}' is currently issued to ${band.current_holder_name || "another player"}. Please return it first.`
            });
        }

        if (band.status === 'damaged' || band.status === 'lost' || band.status === 'retired') {
            return res.status(400).json({
                error: `Band '${band.band_code}' cannot be issued because its status is '${band.status.toUpperCase()}'.`
            });
        }

        const customerName = (customer_name || '').trim() || 'Guest Player';
        const orderNum = (order_number || '').trim() || (booking_id ? `#${booking_id}` : null);
        const staffName = req.user?.username || 'Staff';
        const issueNotes = (notes || '').trim() || 'Issued at Reception / Track Desk';

        db.run(
            `UPDATE band_items
             SET status = 'issued',
                 current_holder_name = ?,
                 current_booking_id = ?,
                 current_order_number = ?,
                 total_uses = total_uses + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [customerName, booking_id || null, orderNum, band.id],
            function (upErr) {
                if (upErr) return res.status(500).json({ error: 'Failed to update band status' });

                db.run(
                    `INSERT INTO band_transactions (
                        band_id, band_code, color_name, color_hex, transaction_type, 
                        quantity, customer_name, booking_id, order_number, staff_name, notes
                    ) VALUES (?, ?, ?, ?, 'ISSUE', 1, ?, ?, ?, ?, ?)`,
                    [band.id, band.band_code, band.color_name, band.color_hex, customerName, booking_id || null, orderNum, staffName, issueNotes],
                    () => { }
                );

                res.json({ success: true, band_id: band.id, band_code: band.band_code, holder: customerName });
            }
        );
    });
});

// 7. Return wristband back to inventory
app.post('/api/admin/bands/return', verifyToken, (req, res) => {
    const { band_id, band_code, condition, notes } = req.body;
    const lookupQuery = band_id
        ? "SELECT * FROM band_items WHERE id = ?"
        : "SELECT * FROM band_items WHERE UPPER(band_code) = UPPER(?)";
    const lookupParam = band_id ? parseInt(band_id, 10) : (band_code || '').trim();

    db.get(lookupQuery, [lookupParam], (err, band) => {
        if (err || !band) {
            return res.status(404).json({ error: `Wristband '${band_code || band_id}' not found.` });
        }

        const prevHolder = band.current_holder_name;
        const prevOrder = band.current_order_number;
        const prevBookingId = band.current_booking_id;
        const staffName = req.user?.username || 'Staff';

        let newStatus = 'available';
        let txType = 'RETURN';

        if (condition === 'damaged') {
            newStatus = 'damaged';
            txType = 'DAMAGED';
        } else if (condition === 'lost') {
            newStatus = 'lost';
            txType = 'LOST';
        }

        const returnNotes = (notes || '').trim() || `Returned condition: ${(condition || 'good').toUpperCase()}`;

        db.run(
            `UPDATE band_items
             SET status = ?,
                 current_holder_name = NULL,
                 current_booking_id = NULL,
                 current_order_number = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [newStatus, band.id],
            function (upErr) {
                if (upErr) return res.status(500).json({ error: 'Failed to return band' });

                db.run(
                    `INSERT INTO band_transactions (
                        band_id, band_code, color_name, color_hex, transaction_type, 
                        quantity, customer_name, booking_id, order_number, staff_name, notes
                    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
                    [band.id, band.band_code, band.color_name, band.color_hex, txType, prevHolder, prevBookingId, prevOrder, staffName, returnNotes],
                    () => { }
                );

                res.json({ success: true, band_id: band.id, band_code: band.band_code, status: newStatus });
            }
        );
    });
});

// 8. Retire / Stock-out band
app.post('/api/admin/bands/retire', verifyToken, (req, res) => {
    const { band_id, reason } = req.body;
    if (!band_id) return res.status(400).json({ error: 'band_id is required' });

    db.get("SELECT * FROM band_items WHERE id = ?", [parseInt(band_id, 10)], (err, band) => {
        if (err || !band) return res.status(404).json({ error: 'Band item not found.' });

        const staffName = req.user?.username || 'Staff';
        const retireReason = (reason || '').trim() || 'Item retired / written off';

        db.run(
            `UPDATE band_items 
             SET status = 'retired',
                 current_holder_name = NULL,
                 current_booking_id = NULL,
                 current_order_number = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [band.id],
            function (upErr) {
                if (upErr) return res.status(500).json({ error: 'Database update failed' });

                db.run(
                    `INSERT INTO band_transactions (band_id, band_code, color_name, color_hex, transaction_type, quantity, staff_name, notes)
                     VALUES (?, ?, ?, ?, 'STOCK_OUT', 1, ?, ?)`,
                    [band.id, band.band_code, band.color_name, band.color_hex, staffName, retireReason],
                    () => { }
                );

                res.json({ success: true });
            }
        );
    });
});

// 9. Restore damaged/lost/retired band back to 'available'
app.post('/api/admin/bands/restore', verifyToken, (req, res) => {
    const { band_id, notes } = req.body;
    if (!band_id) return res.status(400).json({ error: 'band_id is required' });

    db.get("SELECT * FROM band_items WHERE id = ?", [parseInt(band_id, 10)], (err, band) => {
        if (err || !band) return res.status(404).json({ error: 'Band item not found.' });

        const staffName = req.user?.username || 'Staff';
        const restoreNotes = (notes || '').trim() || 'Restored back to available stock';

        db.run(
            `UPDATE band_items 
             SET status = 'available',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [band.id],
            function (upErr) {
                if (upErr) return res.status(500).json({ error: 'Database update failed' });

                db.run(
                    `INSERT INTO band_transactions (band_id, band_code, color_name, color_hex, transaction_type, quantity, staff_name, notes)
                     VALUES (?, ?, ?, ?, 'STATUS_CHANGE', 1, ?, ?)`,
                    [band.id, band.band_code, band.color_name, band.color_hex, staffName, restoreNotes],
                    () => { }
                );

                res.json({ success: true });
            }
        );
    });
});

// 10. Edit / update band metadata
app.put('/api/admin/bands/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { band_code, color_name, color_hex, category, status, notes } = req.body;
    const cleanCode = (band_code || '').trim().toUpperCase();

    if (!cleanCode) return res.status(400).json({ error: 'Band code is required.' });

    db.get("SELECT id FROM band_items WHERE UPPER(band_code) = UPPER(?) AND id != ?", [cleanCode, parseInt(id, 10)], (chkErr, existing) => {
        if (existing) {
            return res.status(400).json({ error: `Band code '${cleanCode}' is already used by another item.` });
        }

        db.run(
            `UPDATE band_items
             SET band_code = ?,
                 color_name = ?,
                 color_hex = ?,
                 category = COALESCE(?, category),
                 status = COALESCE(?, status),
                 notes = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [cleanCode, (color_name || '').trim(), (color_hex || '').trim(), category || null, status || null, (notes || '').trim() || null, parseInt(id, 10)],
            function (upErr) {
                if (upErr) return res.status(500).json({ error: 'Failed to update band details' });
                res.json({ success: true });
            }
        );
    });
});

// 11. Delete band item (Admin only)
app.delete('/api/admin/bands/:id', verifyToken, verifySuperAdmin, (req, res) => {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    db.run("DELETE FROM band_transactions WHERE band_id = ?", [numId], () => {
        db.run("DELETE FROM band_items WHERE id = ?", [numId], function (delErr) {
            if (delErr) return res.status(500).json({ error: 'Failed to delete band item' });
            res.json({ success: true });
        });
    });
});

// 12. Export Band Inventory CSV Reports
app.get('/api/admin/bands/export', verifyToken, (req, res) => {
    const reportType = req.query.type || 'master'; // 'master' | 'summary' | 'movements'
    const nowStr = new Date().toISOString().split('T')[0];

    const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
    };

    if (reportType === 'summary') {
        db.get(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) AS issued,
                SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) AS damaged,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost,
                SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) AS retired
            FROM band_items
        `, [], (err, counts) => {
            const total = Number(counts?.total || 0);
            const available = Number(counts?.available || 0);
            const issued = Number(counts?.issued || 0);
            const damaged = Number(counts?.damaged || 0);
            const lost = Number(counts?.lost || 0);
            const retired = Number(counts?.retired || 0);
            const active = Math.max(0, total - retired);
            const rate = active > 0 ? Math.round((available / active) * 100) : 0;

            db.all(`
                SELECT color_name, color_hex, COUNT(*) as total,
                       SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                       SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
                       SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) as damaged,
                       SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
                       SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) as retired
                FROM band_items
                GROUP BY color_name, color_hex
                ORDER BY total DESC
            `, [], (cErr, colors) => {
                const lines = [];
                lines.push("HAVOC SIM PODIUM & RC FUN ZONE - COMMON WRISTBAND STOCK SUMMARY");
                lines.push(`Generated On:,"${new Date().toLocaleString()}"`);
                lines.push(`Generated By:,"${req.user?.username || 'Admin'}"`);
                lines.push("");
                lines.push("OVERALL KEY PERFORMANCE METRICS");
                lines.push("Metric,Count");
                lines.push(`Total Master Bands,${total}`);
                lines.push(`Available In Stock,${available}`);
                lines.push(`Currently Issued (In Race / Active),${issued}`);
                lines.push(`Damaged / Quarantine,${damaged}`);
                lines.push(`Reported Lost,${lost}`);
                lines.push(`Retired / Written-off,${retired}`);
                lines.push(`Active Inventory Pool,${active}`);
                lines.push(`Availability Rate,${rate}%`);
                lines.push("");
                lines.push("COLOR-WISE STOCK BREAKDOWN");
                lines.push("Color Name,Color Hex,Total Bands,Available,Issued,Damaged,Lost,Retired,Availability %");

                (colors || []).forEach(c => {
                    const cRate = c.total > 0 ? Math.round((c.available / c.total) * 100) : 0;
                    lines.push([
                        escapeCsv(c.color_name),
                        escapeCsv(c.color_hex),
                        c.total,
                        c.available,
                        c.issued,
                        c.damaged,
                        c.lost,
                        c.retired,
                        `${cRate}%`
                    ].join(","));
                });

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="Havoc_Band_Stock_Summary_${nowStr}.csv"`);
                res.send(lines.join("\r\n"));
            });
        });
        return;
    }

    if (reportType === 'movements') {
        db.all("SELECT * FROM band_transactions ORDER BY created_at DESC, id DESC LIMIT 1000", [], (err, rows) => {
            const lines = [];
            lines.push("Date & Time,Band Code,Color,Movement Type,Customer Name,Order / Booking ID,Staff Member,Remarks / Notes");
            (rows || []).forEach(t => {
                lines.push([
                    escapeCsv(t.created_at),
                    escapeCsv(t.band_code),
                    escapeCsv(t.color_name),
                    escapeCsv(t.transaction_type),
                    escapeCsv(t.customer_name || "-"),
                    escapeCsv(t.order_number || (t.booking_id ? `#${t.booking_id}` : "-")),
                    escapeCsv(t.staff_name || "-"),
                    escapeCsv(t.notes || "-")
                ].join(","));
            });

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="Havoc_Band_Movements_Log_${nowStr}.csv"`);
            res.send(lines.join("\r\n"));
        });
        return;
    }

    // Default: 'master' list
    db.all("SELECT * FROM band_items ORDER BY band_code ASC", [], (err, items) => {
        const lines = [];
        lines.push("Band ID,Color Name,Color Hex,Category,Current Status,Current Holder,Order #,Total Uses,Notes,Last Updated,Created At");
        (items || []).forEach(b => {
            lines.push([
                escapeCsv(b.band_code),
                escapeCsv(b.color_name),
                escapeCsv(b.color_hex),
                escapeCsv(b.category),
                escapeCsv((b.status || '').toUpperCase()),
                escapeCsv(b.current_holder_name || "-"),
                escapeCsv(b.current_order_number || "-"),
                b.total_uses,
                escapeCsv(b.notes || "-"),
                escapeCsv(b.updated_at),
                escapeCsv(b.created_at)
            ].join(","));
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Havoc_Band_Master_Inventory_${nowStr}.csv"`);
        res.send(lines.join("\r\n"));
    });
});

// 13. Category / Offer Tier Management APIs (Get, Create, Delete)
app.get('/api/admin/bands/categories', verifyToken, (req, res) => {
    db.all("SELECT id, name, description, badge_color, sort_order, active FROM band_categories WHERE active = 1 ORDER BY sort_order ASC, name ASC", [], (err, rows) => {
        if (err || !rows || rows.length === 0) {
            return res.json([
                { name: "Standard", description: "Regular session admission", badge_color: "#94A3B8" },
                { name: "Student Offer", description: "College / School discount deal", badge_color: "#38BDF8" },
                { name: "Happy Hour", description: "Afternoon / Off-peak promo pass", badge_color: "#F59E0B" },
                { name: "Weekend Pass", description: "Weekend special tier", badge_color: "#EC4899" },
                { name: "VIP Racer", description: "Premium simulator / unlimited lap tier", badge_color: "#E5B869" },
                { name: "Child / Junior", description: "Junior track pass", badge_color: "#10B981" },
                { name: "Staff / Marshal", description: "Internal crew & track marshals", badge_color: "#8B5CF6" }
            ]);
        }
        res.json(rows);
    });
});

app.post('/api/admin/bands/categories', verifyToken, (req, res) => {
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    const badge_color = (req.body.badge_color || '#E5B869').trim();

    if (!name) return res.status(400).json({ error: 'Category / Offer Name is required.' });

    db.get("SELECT id FROM band_categories WHERE UPPER(name) = UPPER(?) AND active = 1", [name], (err, exists) => {
        if (exists) {
            return res.status(400).json({ error: `Category / Offer '${name}' already exists.` });
        }

        db.run(
            `INSERT INTO band_categories (name, description, badge_color, sort_order, active)
             VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM band_categories), 1)`,
            [name, description || null, badge_color],
            function (insErr) {
                if (insErr) return res.status(500).json({ error: insErr.message || 'Failed to create category' });
                res.json({ success: true, id: this ? this.lastID : null, name, description, badge_color });
            }
        );
    });
});

app.delete('/api/admin/bands/categories/:id', verifyToken, verifySuperAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Valid category ID required' });

    db.run("DELETE FROM band_categories WHERE id = ?", [id], function (delErr) {
        if (delErr) return res.status(500).json({ error: 'Failed to delete category' });
        res.json({ success: true });
    });
});

// Helper to get next sequential order number based on highest existing order number
const getNextOrderNumber = () => {
    return new Promise((resolve) => {
        db.all("SELECT order_id FROM bookings", [], (err, rows) => {
            if (err || !rows || rows.length === 0) {
                return resolve('01');
            }
            let maxNum = 0;
            rows.forEach(r => {
                const oid = r.order_id || '';
                // 1. Matches SP format: PAYDUE_SP_40 or PAID_SP_40 with optional suffixes
                const spMatch = oid.match(/(?:PAYDUE|PAID)_SP_(\d+)/i);
                if (spMatch && spMatch[1]) {
                    const num = parseInt(spMatch[1], 10);
                    // Disregard anomalous >100 numbers if SP sequence is in 80s
                    if (!isNaN(num) && num <= 100 && num > maxNum) maxNum = num;
                    else if (!isNaN(num) && num > maxNum && !oid.includes('FZ')) maxNum = num;
                    return;
                }
                // 2. Legacy format: PREFIX_DATE_ORDERNO (e.g. PAYDUE_10OCT26_21) - exclude FZ!
                const parts = oid.split('_');
                if (parts.length >= 3 && !oid.includes('FZ') && parts[1] !== 'FZ') {
                    const num = parseInt(parts[2], 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            const nextNum = maxNum > 0 ? (maxNum + 1) : 1;
            resolve(String(nextNum).padStart(2, '0'));
        });
    });
};

// Create a COD / Pay at Desk booking (Public checkout)
app.post('/api/bookings/cod', async (req, res) => {
    const { amount, customer_details, booking_data } = req.body;
    const items = Array.isArray(booking_data) ? booking_data : [booking_data];

    // Validate required fields
    if (!items[0] || !items[0].item_name || !items[0].date || !items[0].time) {
        return res.status(400).json({ error: 'Missing required booking details' });
    }

    // Check for duplicates within the request itself
    const uniqueItems = new Set(items.map(i => `${i.item_name}|${i.date}|${i.time}`));
    if (uniqueItems.size !== items.length) {
        return res.status(400).json({ error: 'Duplicate slots detected in booking request' });
    }

    // Pre-flight concurrency check
    const checkAvailability = () => {
        return new Promise((resolve, reject) => {
            if (!items || items.length === 0) return resolve(false);
            let checkCount = 0;
            let hasConflict = false;
            const custEmail = (customer_details && customer_details.email) ? customer_details.email.trim().toLowerCase() : '';
            const custPhone = (customer_details && customer_details.phone) ? customer_details.phone.replace(/[^\d]/g, '') : '';

            items.forEach(item => {
                let query = "SELECT id, status, email, phone, created_at, order_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND item_name = ?";
                let params = [item.date, item.time, item.item_name];
                if (item.instructor_id) {
                    query = "SELECT id, status, email, phone, created_at, order_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND (item_name = ? OR instructor_id = ?)";
                    params = [item.date, item.time, item.item_name, item.instructor_id];
                }

                db.all(query, params, (err, rows) => {
                    if (err) return reject(err);
                    if (rows && rows.length > 0) {
                        for (const r of rows) {
                            // Confirmed/paid/attended/desk bookings are always a hard block
                            if (r.status === 'PAID' || r.status === 'SUCCESS' || r.status === 'CASH' || (r.order_id && r.order_id.startsWith('PAYDUE_'))) {
                                hasConflict = true;
                                break;
                            }

                            // For online PENDING attempts:
                            const rEmail = (r.email || '').trim().toLowerCase();
                            const rPhone = (r.phone || '').replace(/[^\d]/g, '');
                            const isSameCustomer = (custEmail && rEmail === custEmail) || (custPhone && rPhone && rPhone === custPhone);

                            if (isSameCustomer) {
                                // It's the same customer's prior abandoned pending attempt! Allow them to supersede it
                                continue;
                            }

                            // If pending attempt was by someone else, check if older than 2 minutes
                            const bookingAgeMs = Date.now() - new Date(r.created_at).getTime();
                            if (bookingAgeMs > 2 * 60 * 1000) {
                                // Expired abandoned attempt, ignore conflict
                                continue;
                            }

                            hasConflict = true;
                            break;
                        }
                    }

                    // Also check shared simulator_slot_locks (for locks from RC Fun Zone or other channels)
                    const lockQuery = "SELECT simulator_name, booking_date, booking_time, status, customer_phone, source_order_id, created_at FROM simulator_slot_locks WHERE simulator_name = ? AND (booking_date = ? OR booking_date = ?) AND booking_time = ? AND status IN ('PENDING', 'PAID', 'ATTENDED', 'CONFIRMED')";
                    const lockParams = [item.item_name, item.date, item.date.replace(/ \([A-Za-z]+\)/, ''), item.time];

                    db.all(lockQuery, lockParams, (lockErr, lockRows) => {
                        if (!lockErr && lockRows && lockRows.length > 0) {
                            for (const lr of lockRows) {
                                if (lr.status === 'PAID' || lr.status === 'ATTENDED' || lr.status === 'CONFIRMED' || (lr.source_order_id && lr.source_order_id.startsWith('PAYDUE_'))) {
                                    hasConflict = true;
                                    break;
                                }
                                const lockPhone = (lr.customer_phone || '').replace(/[^\d]/g, '');
                                if (custPhone && lockPhone && lockPhone === custPhone) {
                                    // Same customer's prior pending lock
                                    continue;
                                }
                                const lockAgeMs = Date.now() - new Date(lr.created_at).getTime();
                                if (lockAgeMs > 2 * 60 * 1000) {
                                    continue;
                                }
                                hasConflict = true;
                                break;
                            }
                        }

                        // Also check active online checkout holds (< 2 minutes old)
                        db.all("SELECT txn_id, customer_email, customer_phone, items_json, created_at FROM online_checkout_holds", [], (holdErr, holdRows) => {
                            if (!holdErr && holdRows) {
                                for (const hr of holdRows) {
                                    const hrEmail = (hr.customer_email || '').trim().toLowerCase();
                                    const hrPhone = (hr.customer_phone || '').replace(/[^\d]/g, '');
                                    const isSameCust = (custEmail && hrEmail === custEmail) || (custPhone && hrPhone && hrPhone === custPhone);
                                    if (isSameCust) continue;

                                    const ageMs = Date.now() - new Date(hr.created_at).getTime();
                                    if (ageMs > 2 * 60 * 1000) continue;

                                    try {
                                        const heldItems = JSON.parse(hr.items_json || '[]');
                                        for (const hi of heldItems) {
                                            const hiDate = (hi.date || '').replace(/ \([A-Za-z]+\)/, '');
                                            const itDate = (item.date || '').replace(/ \([A-Za-z]+\)/, '');
                                            if (hi.item_name === item.item_name && hiDate === itDate && hi.time === item.time) {
                                                hasConflict = true;
                                                break;
                                            }
                                        }
                                    } catch (e) { }
                                    if (hasConflict) break;
                                }
                            }

                            // Also check admin blocked_slots
                            const bQuery = "SELECT COUNT(*) as count FROM blocked_slots WHERE (simulator_name = ? OR simulator_name = 'ALL') AND (booking_date = ? OR booking_date = ? OR booking_date = 'ALL') AND (time_slot = ? OR time_slot = 'ALL_DAY')";
                            const bParams = [item.item_name, item.date, item.date.replace(/ \([A-Za-z]+\)/, ''), item.time];
                            db.get(bQuery, bParams, (bErr, bRow) => {
                                if (!bErr && bRow && bRow.count > 0) hasConflict = true;
                                checkCount++;
                                if (checkCount === items.length) resolve(hasConflict);
                            });
                        });
                    });
                });
            });
        });
    };

    try {
        const hasConflict = await checkAvailability();
        if (hasConflict) {
            return res.status(409).json({ error: 'Sorry, one or more of your selected slots was just booked by someone else! Please select different slots.' });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Database error during availability check' });
    }

    const orderAmount = parseFloat(amount).toFixed(2);

    // Parse "Aug 30 (Sun)" into "30AUG26" (based on the first item for generating order ID)
    const dateParts = items[0].date.split(' ');
    let formattedDate = 'DATE';
    if (dateParts.length >= 2) {
        let year = new Date().getFullYear();
        const monthIndex = new Date(`${dateParts[0]} 1`).getMonth();
        if (monthIndex < new Date().getMonth() && monthIndex <= 2) {
            year += 1;
        }
        formattedDate = (dateParts[1] + dateParts[0]).toUpperCase() + String(year).slice(-2);
    }

    const orderNo = await getNextOrderNumber();
    const baseOrderId = `PAYDUE_SP_${orderNo}`;

    let insertedCount = 0;
    let hasError = false;

    const totalBaseCost = items.reduce((sum, i) => sum + (Number(i.base_price) || 0) + (Number(i.instructor_fee) || 0), 0);

    items.forEach((item, index) => {
        const rowOrderId = items.length > 1 ? `${baseOrderId}_${index}` : baseOrderId;

        let itemPrice = (parseFloat(amount) / items.length).toFixed(2);
        if (totalBaseCost > 0) {
            const itemRatio = ((Number(item.base_price) || 0) + (Number(item.instructor_fee) || 0)) / totalBaseCost;
            itemPrice = (parseFloat(amount) * itemRatio).toFixed(2);
        }

        const whatsappConsentVal = (customer_details && customer_details.whatsapp_consent === false) ? 0 : 1;
        db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id, players, player_two_name, whatsapp_consent) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rowOrderId, customer_details.name, customer_details.email, customer_details.phone, item.item_name, itemPrice, item.date, item.time, 'PENDING', item.instructor_id || null, item.players || 1, item.player_two_name || null, whatsappConsentVal],
            function (err) {
                if (err) {
                    console.error("DB Insert Error (COD):", err);
                    hasError = true;
                }
                insertedCount++;

                if (insertedCount === items.length) {
                    if (hasError) return res.status(500).json({ error: 'Database error while inserting items' });

                    // Send single consolidated confirmation email and WhatsApp notification for all booked items
                    db.all("SELECT * FROM bookings WHERE order_id LIKE ?", [`${baseOrderId}%`], (err, rows) => {
                        if (!err && rows && rows.length > 0) {
                            sendConfirmationEmail(rows);
                            dispatchBookingWhatsAppNotification(rows, 'Pay at Desk');
                            rows.forEach(row => {
                                if (row.instructor_id) {
                                    db.get("SELECT * FROM instructors WHERE id = ?", [row.instructor_id], (err, instructor) => {
                                        if (!err && instructor && instructor.email) {
                                            sendInstructorEmail(instructor, row);
                                        }
                                    });
                                }
                            });
                        }
                    });

                    // Clean up any temporary online hold records for this customer since they booked via COD
                    const cEmail = customer_details?.email ? customer_details.email.trim().toLowerCase() : '';
                    const cPhone = customer_details?.phone ? customer_details.phone.replace(/[^\d]/g, '') : '';
                    if (cEmail || cPhone) {
                        db.run("DELETE FROM online_checkout_holds WHERE LOWER(customer_email) = ? OR customer_phone LIKE ?", [cEmail, `%${cPhone}`], () => { });
                    }

                    res.json({ success: true, order_id: baseOrderId });
                }
            }
        );
    });
});

// ==========================================
// ICICI PG DIRECT ROUTES
// ==========================================

function generateIciciHash(payload) {
    const sortedKeys = Object.keys(payload).sort();
    let plainText = "";
    for (const key of sortedKeys) {
        if (key !== 'secureHash' && payload[key] !== null && payload[key] !== undefined) {
            plainText += payload[key];
        }
    }
    const hmac = crypto.createHmac('sha256', ICICI_SECRET_KEY);
    hmac.update(plainText);
    return hmac.digest('hex');
}

app.post('/api/payment/icici/initiate', async (req, res) => {
    try {
        const { amount, customer_details, booking_data } = req.body;
        const items = Array.isArray(booking_data) ? booking_data : [booking_data];

        // Check for duplicates within the request itself
        const uniqueItems = new Set(items.map(i => `${i.item_name}|${i.date}|${i.time}`));
        if (uniqueItems.size !== items.length) {
            return res.status(400).json({ error: 'Duplicate slots detected in booking request' });
        }

        // Pre-flight concurrency check
        const checkAvailability = () => {
            return new Promise((resolve, reject) => {
                if (!items || items.length === 0) return resolve(false);
                let checkCount = 0;
                let hasConflict = false;
                const custEmail = (customer_details && customer_details.email) ? customer_details.email.trim().toLowerCase() : '';
                const custPhone = (customer_details && customer_details.phone) ? customer_details.phone.replace(/[^\d]/g, '') : '';

                items.forEach(item => {
                    let query = "SELECT id, status, email, phone, created_at, order_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND item_name = ?";
                    let params = [item.date, item.time, item.item_name];
                    if (item.instructor_id) {
                        query = "SELECT id, status, email, phone, created_at, order_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND (item_name = ? OR instructor_id = ?)";
                        params = [item.date, item.time, item.item_name, item.instructor_id];
                    }

                    db.all(query, params, (err, rows) => {
                        if (err) return reject(err);
                        if (rows && rows.length > 0) {
                            for (const r of rows) {
                                // Confirmed/paid/attended/desk bookings are always a hard block
                                if (r.status === 'PAID' || r.status === 'SUCCESS' || r.status === 'CASH' || (r.order_id && r.order_id.startsWith('PAYDUE_'))) {
                                    hasConflict = true;
                                    break;
                                }

                                // For online PENDING attempts:
                                const rEmail = (r.email || '').trim().toLowerCase();
                                const rPhone = (r.phone || '').replace(/[^\d]/g, '');
                                const isSameCustomer = (custEmail && rEmail === custEmail) || (custPhone && rPhone && rPhone === custPhone);

                                if (isSameCustomer) {
                                    // It's the same customer's prior abandoned pending attempt! Allow them to supersede it
                                    continue;
                                }

                                // If pending attempt was by someone else, check if older than 2 minutes
                                const bookingAgeMs = Date.now() - new Date(r.created_at).getTime();
                                if (bookingAgeMs > 2 * 60 * 1000) {
                                    // Expired abandoned attempt, ignore conflict
                                    continue;
                                }

                                hasConflict = true;
                                break;
                            }
                        }

                        // Also check shared simulator_slot_locks (for locks from RC Fun Zone or other channels)
                        const lockQuery = "SELECT simulator_name, booking_date, booking_time, status, customer_phone, source_order_id, created_at FROM simulator_slot_locks WHERE simulator_name = ? AND (booking_date = ? OR booking_date = ?) AND booking_time = ? AND status IN ('PENDING', 'PAID', 'ATTENDED', 'CONFIRMED')";
                        const lockParams = [item.item_name, item.date, item.date.replace(/ \([A-Za-z]+\)/, ''), item.time];

                        db.all(lockQuery, lockParams, (lockErr, lockRows) => {
                            if (!lockErr && lockRows && lockRows.length > 0) {
                                for (const lr of lockRows) {
                                    if (lr.status === 'PAID' || lr.status === 'ATTENDED' || lr.status === 'CONFIRMED' || (lr.source_order_id && lr.source_order_id.startsWith('PAYDUE_'))) {
                                        hasConflict = true;
                                        break;
                                    }
                                    const lockPhone = (lr.customer_phone || '').replace(/[^\d]/g, '');
                                    if (custPhone && lockPhone && lockPhone === custPhone) {
                                        // Same customer's prior pending lock
                                        continue;
                                    }
                                    const lockAgeMs = Date.now() - new Date(lr.created_at).getTime();
                                    if (lockAgeMs > 2 * 60 * 1000) {
                                        continue;
                                    }
                                    hasConflict = true;
                                    break;
                                }
                            }

                            // Also check active online checkout holds (< 2 minutes old)
                            db.all("SELECT txn_id, customer_email, customer_phone, items_json, created_at FROM online_checkout_holds", [], (holdErr, holdRows) => {
                                if (!holdErr && holdRows) {
                                    for (const hr of holdRows) {
                                        const hrEmail = (hr.customer_email || '').trim().toLowerCase();
                                        const hrPhone = (hr.customer_phone || '').replace(/[^\d]/g, '');
                                        const isSameCust = (custEmail && hrEmail === custEmail) || (custPhone && hrPhone && hrPhone === custPhone);
                                        if (isSameCust) continue;

                                        const ageMs = Date.now() - new Date(hr.created_at).getTime();
                                        if (ageMs > 2 * 60 * 1000) continue;

                                        try {
                                            const heldItems = JSON.parse(hr.items_json || '[]');
                                            for (const hi of heldItems) {
                                                const hiDate = (hi.date || '').replace(/ \([A-Za-z]+\)/, '');
                                                const itDate = (item.date || '').replace(/ \([A-Za-z]+\)/, '');
                                                if (hi.item_name === item.item_name && hiDate === itDate && hi.time === item.time) {
                                                    hasConflict = true;
                                                    break;
                                                }
                                            }
                                        } catch (e) { }
                                        if (hasConflict) break;
                                    }
                                }

                                // Also check admin blocked_slots
                                const bQuery = "SELECT COUNT(*) as count FROM blocked_slots WHERE (simulator_name = ? OR simulator_name = 'ALL') AND (booking_date = ? OR booking_date = ? OR booking_date = 'ALL') AND (time_slot = ? OR time_slot = 'ALL_DAY')";
                                const bParams = [item.item_name, item.date, item.date.replace(/ \([A-Za-z]+\)/, ''), item.time];
                                db.get(bQuery, bParams, (bErr, bRow) => {
                                    if (!bErr && bRow && bRow.count > 0) hasConflict = true;
                                    checkCount++;
                                    if (checkCount === items.length) resolve(hasConflict);
                                });
                            });
                        });
                    });
                });
            });
        };

        const hasConflict = await checkAvailability();
        if (hasConflict) {
            return res.status(409).json({ error: 'Sorry, one or more of your selected slots was just booked by someone else! Please select different slots.' });
        }

        const orderAmount = parseFloat(amount).toFixed(2);

        const dateParts = items[0].date.split(' ');
        let formattedDate = 'DATE';
        if (dateParts.length >= 2) {
            let year = new Date().getFullYear();
            const monthIndex = new Date(`${dateParts[0]} 1`).getMonth();
            if (monthIndex < new Date().getMonth() && monthIndex <= 2) {
                year += 1;
            }
            formattedDate = (dateParts[1] + dateParts[0]).toUpperCase() + String(year).slice(-2);
        }

        // Temporary tracking reference for payment gateway strictly <= 20 chars
        // Format: TXN_SP_<compact_timestamp_suffix> (e.g. TXN_SP_948271, 13 chars)
        // We do NOT call getNextOrderNumber() or insert into bookings here, so no order numbers are burned or skipped!
        const attemptSuffix = Date.now().toString().slice(-6);
        const tempTxnId = `TXN_SP_${attemptSuffix}`;
        const baseOrderId = tempTxnId;

        const whatsappConsentVal = (customer_details && customer_details.whatsapp_consent === false) ? 0 : 1;

        // Save temporary hold in online_checkout_holds table
        db.run(
            `INSERT INTO online_checkout_holds (txn_id, customer_name, customer_email, customer_phone, amount, items_json, whatsapp_consent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tempTxnId, customer_details.name || 'Customer', customer_details.email || '', customer_details.phone || '', orderAmount, JSON.stringify(items), whatsappConsentVal],
            function (err) {
                if (err) {
                    console.error("Hold Insert Error:", err);
                    return res.status(500).json({ error: 'Failed to hold selected slots for payment' });
                }
                createIciciOrder();
            }
        );

        async function createIciciOrder() {
            // Build Request Payload as per Step Wise Doc using India Standard Time (IST / Asia/Kolkata)
            const istDateStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(new Date());
            // istDateStr returns "YYYY-MM-DD, HH:mm:ss" or "YYYY-MM-DD HH:mm:ss"
            const txnDate = istDateStr.replace(/\D/g, ''); // YYYYMMDDHHMMSS in IST

            // ICICI expects a clean 10-digit mobile number without + or spaces
            const rawPhone = customer_details.phone || "9999999999";
            const digitsOnly = rawPhone.replace(/\D/g, '');
            const cleanMobile = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly.padStart(10, '9');

            // In production, ICICI Bank enforces strict domain whitelisting (DOMAIN VALIDATION)
            // The exact whitelisted domain in ICICI PG is https://www.havocsim.in
            const isProd = process.env.NODE_ENV === 'production' || ICICI_ENV === 'live';
            const returnBase = isProd ? 'https://www.havocsim.in' : `${req.protocol}://${req.get('host')}`;

            const payload = {
                "merchantId": ICICI_MERCHANT_ID,
                "merchantTxnNo": baseOrderId,
                "amount": orderAmount,
                "aggregatorID": ICICI_AGGREGATOR_ID,
                "currencyCode": "356",
                "payType": "0",
                "customerEmailID": customer_details.email || "dummy@gmail.com",
                "transactionType": "SALE",
                "txnDate": txnDate,
                "returnURL": `${returnBase}/api/payment/icici/callback`,
                "customerMobileNo": cleanMobile,
                "customerName": customer_details.name || "Customer"
            };

            // Generate HMAC Secure Hash
            payload.secureHash = generateIciciHash(payload);

            try {
                const response = await fetch(`${getIciciBaseUrl()}/initiateSale`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.responseCode !== "R1000") {
                    console.error('ICICI initiateSale error response:', data);
                    db.run("DELETE FROM online_checkout_holds WHERE txn_id = ?", [baseOrderId]);
                    return res.status(500).json({
                        error: data.responseDescription || 'Failed to initiate ICICI PG order',
                        code: data.responseCode,
                        details: data
                    });
                }

                // Return redirectURI and tranCtx
                res.json({
                    redirectURI: data.redirectURI,
                    tranCtx: data.tranCtx,
                    order_id: baseOrderId
                });
            } catch (err) {
                console.error('Create ICICI order API error:', err);
                db.run("DELETE FROM online_checkout_holds WHERE txn_id = ?", [baseOrderId]);
                res.status(500).json({ error: 'Failed to communicate with ICICI Gateway' });
            }
        }
    } catch (err) {
        console.error('Create ICICI order error:', err);
        res.status(500).json({ error: 'Failed to create ICICI order' });
    }
});

app.post('/api/payment/icici/callback', express.urlencoded({ extended: true }), async (req, res) => {
    try {
        const body = req.body;
        console.log('ICICI Callback Body:', body);

        // Verify Secure Hash
        const receivedHash = body.secureHash;
        const computedHash = generateIciciHash(body);

        if (receivedHash !== computedHash) {
            console.error('ICICI Callback Hash Mismatch!', { receivedHash, computedHash });
            return res.redirect('/checkout.html?error=Payment Verification Failed');
        }

        const baseOrderId = body.merchantTxnNo;

        if (body.responseCode === "0000") {
            // Payment success!
            const txnID = body.txnID || body.paymentID || null;

            // Check if this was a custom payment link (starts with PL_)
            if (baseOrderId.startsWith('PL_')) {
                // If merchantTxnNo is e.g. PL_A8F2K9_5821, extract original link_id: PL_A8F2K9
                const parts = baseOrderId.split('_');
                const linkId = parts.length >= 3 ? `${parts[0]}_${parts[1]}` : baseOrderId;

                db.run("UPDATE payment_links SET status = 'PAID', icici_txn_id = ?, icici_merchant_txn = ?, paid_at = CURRENT_TIMESTAMP WHERE link_id = ?", [txnID, baseOrderId, linkId], () => {
                    db.get("SELECT * FROM payment_links WHERE link_id = ?", [linkId], (err, plRow) => {
                        if (!err && plRow) {
                            // If this payment link was created for specific booking orders (Desk Check-in)
                            if (plRow.order_ids) {
                                const linkedOrders = plRow.order_ids.split(',').map(s => s.trim()).filter(Boolean);
                                if (linkedOrders.length > 0) {
                                    const placeholders = linkedOrders.map(() => '?').join(',');
                                    db.run(
                                        `UPDATE bookings SET status = 'ATTENDED', payment_ref = ?, icici_txn_id = ?, icici_merchant_txn = ? WHERE order_id IN (${placeholders})`,
                                        [txnID || linkId, txnID, baseOrderId, ...linkedOrders],
                                        () => {
                                            // Process package/slot upgrade if attached to payment link
                                            if (plRow.upgrade_data) {
                                                try {
                                                    const upg = typeof plRow.upgrade_data === 'string' ? JSON.parse(plRow.upgrade_data) : plRow.upgrade_data;
                                                    if (upg && (upg.booking_id || upg.order_id)) {
                                                        const targetId = upg.booking_id;
                                                        const targetOrderId = upg.order_id;
                                                        const updates = [];
                                                        const params = [];
                                                        if (upg.item_name) { updates.push('item_name = ?'); params.push(upg.item_name); }
                                                        if (upg.price !== undefined) { updates.push('price = ?'); params.push(parseFloat(upg.price)); }
                                                        if (upg.players !== undefined) { updates.push('players = ?'); params.push(parseInt(upg.players, 10)); }
                                                        if (upg.player_two_name !== undefined) { updates.push('player_two_name = ?'); params.push(upg.player_two_name); }
                                                        if (upg.booking_date) { updates.push('booking_date = ?'); params.push(upg.booking_date); }
                                                        if (upg.booking_time) { updates.push('booking_time = ?'); params.push(upg.booking_time); }
                                                        if (updates.length > 0) {
                                                            let whereSql = '';
                                                            if (targetId) {
                                                                whereSql = 'WHERE id = ?';
                                                                params.push(targetId);
                                                            } else {
                                                                whereSql = 'WHERE order_id = ?';
                                                                params.push(targetOrderId);
                                                            }
                                                            db.run("UPDATE bookings SET " + updates.join(', ') + " " + whereSql, params, (upgErr) => {
                                                                if (!upgErr) {
                                                                    console.log('[Payment Link Upgrade Applied] Updated booking details:', upg);
                                                                    if (upg.booking_date || upg.booking_time || upg.item_name) {
                                                                        const lockUpd = [];
                                                                        const lockParams = [];
                                                                        if (upg.item_name) { lockUpd.push('simulator_name = ?'); lockParams.push(upg.item_name); }
                                                                        if (upg.booking_date) { lockUpd.push('booking_date = ?'); lockParams.push(upg.booking_date); }
                                                                        if (upg.booking_time) { lockUpd.push('booking_time = ?'); lockParams.push(upg.booking_time); }
                                                                        if (lockUpd.length > 0 && targetOrderId) {
                                                                            lockParams.push(targetOrderId, targetOrderId + '%');
                                                                            db.run("UPDATE simulator_slot_locks SET " + lockUpd.join(', ') + " WHERE source_order_id = ? OR source_order_id LIKE ?", lockParams, () => {});
                                                                        }
                                                                    }
                                                                } else {
                                                                    console.error('[Payment Link Upgrade Error]:', upgErr);
                                                                }
                                                            });
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error('[Payment Link Upgrade Parse Error]:', e);
                                                }
                                            }
                                            console.log(`[Payment Link Success] Automatically marked linked bookings as ATTENDED for link ${linkId}:`, linkedOrders);
                                            // Send post-session Google review WhatsApp
                                            if (plRow.customer_phone) {
                                                sendGoogleReviewWhatsApp({
                                                    customerName: plRow.customer_name || 'Customer',
                                                    customerPhone: plRow.customer_phone
                                                }).catch(e => console.error('[Review WhatsApp] Send error:', e));
                                            }
                                        }
                                    );
                                }
                            }

                            // For custom payment links (especially Desk Check-in links), suppress the automated
                            // "New Booking Alert" confirmation email so staff/customer don't get unwanted booking alerts.
                            // The customer already receives their ICICI transaction receipt and WhatsApp session review.
                            console.log(`[Payment Link Success] Payment confirmed for link ${linkId}. Booking alert email suppressed.`);
                        }
                    });
                });
                return res.redirect(`/pay.html?id=${linkId}&status=success`);
            }

            // Check if this was a slot booking initiated via online_checkout_holds (TXN_SP_*)
            if (baseOrderId.startsWith('TXN_SP_')) {
                db.get("SELECT * FROM online_checkout_holds WHERE txn_id = ?", [baseOrderId], async (holdErr, holdRow) => {
                    if (holdErr || !holdRow) {
                        console.error("Hold record not found for txn_id:", baseOrderId, holdErr);
                        // If already converted to booking, look up in bookings by icici_txn_id
                        db.all("SELECT * FROM bookings WHERE icici_txn_id = ? ORDER BY id ASC", [txnID], (bErr, existingRows) => {
                            if (!bErr && existingRows && existingRows.length > 0) {
                                return res.redirect(`/success.html?order_id=${existingRows[0].order_id}`);
                            }
                            return res.redirect('/checkout.html?error=Hold expired or booking missing');
                        });
                        return;
                    }

                    try {
                        const items = JSON.parse(holdRow.items_json || '[]');
                        const totalBaseCost = items.reduce((sum, i) => sum + (Number(i.base_price) || 0) + (Number(i.instructor_fee) || 0), 0);
                        const orderNo = await getNextOrderNumber();
                        const finalOrderId = `PAID_SP_${orderNo}`;

                        let insertedCount = 0;
                        items.forEach((item, index) => {
                            const rowOrderId = items.length > 1 ? `${finalOrderId}_${index}` : finalOrderId;
                            let itemPrice = (parseFloat(holdRow.amount) / items.length).toFixed(2);
                            if (totalBaseCost > 0) {
                                const itemRatio = ((Number(item.base_price) || 0) + (Number(item.instructor_fee) || 0)) / totalBaseCost;
                                itemPrice = (parseFloat(holdRow.amount) * itemRatio).toFixed(2);
                            }

                            db.run(
                                `INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id, players, player_two_name, whatsapp_consent, icici_txn_id, icici_merchant_txn)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?, ?, ?)`,
                                [
                                    rowOrderId,
                                    holdRow.customer_name,
                                    holdRow.customer_email,
                                    holdRow.customer_phone,
                                    item.item_name,
                                    itemPrice,
                                    item.date,
                                    item.time,
                                    item.instructor_id || null,
                                    item.players || 1,
                                    item.player_two_name || null,
                                    holdRow.whatsapp_consent,
                                    txnID,
                                    baseOrderId
                                ],
                                function (insErr) {
                                    if (insErr) console.error("Insert confirmed booking error:", insErr);
                                    insertedCount++;

                                    if (insertedCount === items.length) {
                                        // Delete hold now that booking is confirmed
                                        db.run("DELETE FROM online_checkout_holds WHERE txn_id = ?", [baseOrderId]);

                                        // Fetch confirmed rows and send communications
                                        db.all("SELECT * FROM bookings WHERE order_id LIKE ?", [`${finalOrderId}%`], (err, rows) => {
                                            if (!err && rows && rows.length > 0) {
                                                try {
                                                    const mailer = require('./mailer');
                                                    mailer.sendConfirmationEmail(rows);
                                                    dispatchBookingWhatsAppNotification(rows, 'Paid Online');

                                                    if (rows[0].instructor_id) {
                                                        db.get("SELECT * FROM instructors WHERE id = ?", [rows[0].instructor_id], (err, inst) => {
                                                            if (!err && inst && inst.email) {
                                                                mailer.sendInstructorEmail(inst, rows[0]);
                                                            }
                                                        });
                                                    }
                                                } catch (e) {
                                                    console.error("Email/WhatsApp send failed:", e);
                                                }
                                            }
                                        });

                                        return res.redirect(`/success.html?order_id=${finalOrderId}`);
                                    }
                                }
                            );
                        });
                    } catch (parseErr) {
                        console.error("Failed to parse hold items_json:", parseErr);
                        return res.redirect('/checkout.html?error=Error confirming booking');
                    }
                });
                return;
            }

            // Fallback for legacy or direct baseOrderId
            db.run("UPDATE bookings SET status = 'PAID', icici_txn_id = ? WHERE order_id LIKE ?", [txnID, `${baseOrderId}%`], () => {
                db.all("SELECT * FROM bookings WHERE order_id LIKE ?", [`${baseOrderId}%`], (err, rows) => {
                    if (!err && rows && rows.length > 0) {
                        try {
                            const mailer = require('./mailer');
                            mailer.sendConfirmationEmail(rows);
                            dispatchBookingWhatsAppNotification(rows, 'Paid Online');

                            if (rows[0].instructor_id) {
                                db.get("SELECT * FROM instructors WHERE id = ?", [rows[0].instructor_id], (err, inst) => {
                                    if (!err && inst && inst.email) {
                                        mailer.sendInstructorEmail(inst, rows[0]);
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Email/WhatsApp send failed:", e);
                        }
                    }
                });
            });
            return res.redirect(`/success.html?order_id=${baseOrderId}`);
        } else {
            // Payment Failed or Cancelled
            console.error('ICICI Payment Failed:', body.respDescription);
            if (baseOrderId.startsWith('PL_')) {
                const parts = baseOrderId.split('_');
                const linkId = parts.length >= 3 ? `${parts[0]}_${parts[1]}` : baseOrderId;
                db.run("UPDATE payment_links SET status = 'FAILED' WHERE link_id = ?", [linkId]);
                return res.redirect(`/pay.html?id=${linkId}&status=failed&error=${encodeURIComponent(body.respDescription || 'Payment Failed')}`);
            }
            if (baseOrderId.startsWith('TXN_SP_')) {
                // Delete temporary hold immediately - slot is released, no order number burned!
                db.run("DELETE FROM online_checkout_holds WHERE txn_id = ?", [baseOrderId]);
                return res.redirect('/checkout.html?error=Payment Failed or Cancelled');
            }
            db.run("UPDATE bookings SET status = 'FAILED' WHERE order_id LIKE ?", [`${baseOrderId}%`]);
            return res.redirect('/checkout.html?error=Payment Failed or Cancelled');
        }
    } catch (err) {
        console.error('ICICI Callback Processing Error:', err);
        return res.redirect('/checkout.html?error=Error processing payment callback');
    }
});

// ==========================================
// PAYMENT LINKS (Custom Admin Payment Requests)
// ==========================================

// Create a new Payment Link (Protected - requires 'payment_links' or 'bookings' permission or Super Admin)
app.post('/api/admin/payment-links', verifyToken, (req, res, next) => {
    // Check if user has either 'payment_links' or 'bookings' permission, or is Super Admin
    if (req.user.username === 'admin' || req.user.role === 'super_admin' || req.user.permissions === 'all') {
        return next();
    }
    const perms = (req.user.permissions || '').split(',').map(p => p.trim());
    if (perms.includes('payment_links') || perms.includes('bookings')) {
        return next();
    }
    return res.status(403).json({ error: "Access denied. Requires 'payment_links' or 'bookings' permission." });
}, async (req, res) => {
    try {
        const { amount, customer_name, customer_phone, customer_email, description, order_ids, upgrade_data } = req.body;
        const numAmount = parseFloat(amount);
        if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        // Generate clean unique link ID (e.g. PL_A8F2K9) - within 15 chars for ICICI compatibility
        const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const linkId = `PL_${shortCode}`;

        const finalName = (customer_name || '').trim();
        const finalPhone = (customer_phone || '').trim();
        const finalEmail = (customer_email || '').trim();
        const finalDesc = (description || 'Custom Payment').trim();
        const orderIdsStr = Array.isArray(order_ids) ? order_ids.join(',') : (order_ids || null);
        const upgradeDataStr = upgrade_data ? (typeof upgrade_data === 'string' ? upgrade_data : JSON.stringify(upgrade_data)) : null;

        db.run(
            `INSERT INTO payment_links (link_id, customer_name, customer_phone, customer_email, amount, description, order_ids, upgrade_data, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [linkId, finalName, finalPhone, finalEmail, numAmount, finalDesc, orderIdsStr, upgradeDataStr],
            async function (err) {
                if (err) {
                    console.error("Create payment link error:", err);
                    return res.status(500).json({ error: 'Failed to create payment link in database' });
                }

                const isProd = process.env.NODE_ENV === 'production' || ICICI_ENV === 'live';
                const baseUrl = isProd ? 'https://www.havocsim.in' : `${req.protocol}://${req.get('host')}`;
                const payUrl = `${baseUrl}/pay.html?id=${linkId}`;

                // Automatically attempt dispatch via Interakt WhatsApp
                let waResult = { success: false, waMeUrl: `https://wa.me/91${finalPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${finalName}!\nHere is your payment link: ${payUrl}`)}` };
                if (finalPhone) {
                    waResult = await sendPaymentLinkWhatsApp({
                        customerName: finalName,
                        customerPhone: finalPhone,
                        amount: numAmount,
                        paymentUrl: payUrl,
                        venueName: "Havoc Sim Podium",
                        orderSummary: finalDesc
                    });
                }

                res.json({
                    success: true,
                    link_id: linkId,
                    amount: numAmount,
                    customer_name: finalName,
                    customer_phone: finalPhone,
                    customer_email: finalEmail,
                    description: finalDesc,
                    order_ids: orderIdsStr,
                    pay_url: payUrl,
                    wa_sent: waResult.viaInterakt || false,
                    wa_me_url: waResult.waMeUrl
                });
            }
        );
    } catch (e) {
        console.error("Create payment link exception:", e);
        res.status(500).json({ error: 'Internal server error creating payment link' });
    }
});

// Get all Payment Links (Protected - requires 'payment_links' permission or Super Admin)
app.get('/api/admin/payment-links', verifyToken, checkPermission('payment_links'), (req, res) => {
    db.all("SELECT * FROM payment_links ORDER BY created_at DESC LIMIT 100", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching payment links' });
        res.json(rows || []);
    });
});

// Public: Get details of a Payment Link for the payer page
app.get('/api/pay-link/:linkId', (req, res) => {
    const { linkId } = req.params;
    db.get("SELECT link_id, customer_name, customer_phone, customer_email, amount, description, status, created_at, paid_at FROM payment_links WHERE link_id = ?", [linkId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Payment link not found or expired' });
        res.json(row);
    });
});

// Public: Initiate ICICI gateway payment for a Payment Link
app.post('/api/pay-link/:linkId/initiate', async (req, res) => {
    const { linkId } = req.params;
    const { customer_name, customer_phone, customer_email } = req.body || {};

    db.get("SELECT * FROM payment_links WHERE link_id = ?", [linkId], async (err, plRow) => {
        if (err || !plRow) {
            return res.status(404).json({ error: 'Payment link not found' });
        }
        if (plRow.status === 'PAID') {
            return res.status(400).json({ error: 'This payment link has already been paid.' });
        }

        const finalName = (customer_name || plRow.customer_name || 'Customer').trim();
        const finalEmail = (customer_email || plRow.customer_email || 'guest@havocsim.in').trim();
        const rawPhone = (customer_phone || plRow.customer_phone || '9999999999').trim();
        const digitsOnly = rawPhone.replace(/\D/g, '');
        const cleanMobile = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly.padStart(10, '9');

        const orderAmount = parseFloat(plRow.amount).toFixed(2);

        // Build Request Payload using IST
        const istDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date());
        const txnDate = istDateStr.replace(/\D/g, '');

        const isProd = process.env.NODE_ENV === 'production' || ICICI_ENV === 'live';
        const returnBase = isProd ? 'https://www.havocsim.in' : `${req.protocol}://${req.get('host')}`;

        // ICICI requires merchantTxnNo to be unique across all attempts (strictly <= 20 chars).
        // plRow.link_id is ~9 chars (e.g. PL_A8F2K9). Append 4-digit timestamp: PL_A8F2K9_5821 (~14 chars).
        const attemptTxnNo = `${plRow.link_id}_${Date.now().toString().slice(-4)}`;

        const payload = {
            "merchantId": ICICI_MERCHANT_ID,
            "merchantTxnNo": attemptTxnNo,
            "amount": orderAmount,
            "aggregatorID": ICICI_AGGREGATOR_ID,
            "currencyCode": "356",
            "payType": "0",
            "customerEmailID": finalEmail,
            "transactionType": "SALE",
            "txnDate": txnDate,
            "returnURL": `${returnBase}/api/payment/icici/callback`,
            "customerMobileNo": cleanMobile,
            "customerName": finalName
        };

        payload.secureHash = generateIciciHash(payload);

        try {
            const response = await fetch(`${getIciciBaseUrl()}/initiateSale`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.responseCode !== "R1000") {
                console.error('ICICI initiateSale error response for pay link:', data);
                return res.status(500).json({
                    error: data.responseDescription || 'Failed to initiate ICICI PG payment link',
                    code: data.responseCode
                });
            }

            res.json({
                redirectURI: data.redirectURI,
                tranCtx: data.tranCtx,
                order_id: plRow.link_id
            });
        } catch (gatewayErr) {
            console.error('Create ICICI payment link API error:', gatewayErr);
            res.status(500).json({ error: 'Failed to communicate with ICICI Gateway' });
        }
    });
});

// ==========================================

// ---- POST /verify-payment ----
app.post('/verify-payment', (req, res) => {
    const { order_id } = req.body;

    // First check the database. For ICICI, the callback updates the DB before redirecting here.
    if (order_id && order_id.startsWith('PL_')) {
        return db.get("SELECT status FROM payment_links WHERE link_id = ?", [order_id], (err, row) => {
            if (!err && row && row.status === 'PAID') {
                return res.json({ success: true, status: 'PAID' });
            }
            return res.json({ success: false, status: (row && row.status) || 'PENDING' });
        });
    }

    db.get("SELECT status FROM bookings WHERE order_id LIKE ?", [`${order_id}%`], async (err, row) => {
        if (!err && row && row.status === 'PAID') {
            return res.json({ success: true, status: 'PAID' });
        }

        // If not paid in DB (or if it's Cashfree which might need active verification), query Cashfree
        try {
            const response = await fetch(`${getCashfreeBaseUrl()}/orders/${order_id}`, {
                method: 'GET',
                headers: {
                    'x-api-version': '2023-08-01',
                    'x-client-id': CASHFREE_APP_ID,
                    'x-client-secret': CASHFREE_SECRET_KEY
                }
            });

            const data = await response.json();

            if (!response.ok) {
                // If it fails on Cashfree, it might just be an ICICI order that genuinely failed/pending.
                // We shouldn't throw an error, just return the DB status.
                if (row) {
                    return res.json({ success: true, status: row.status });
                }
                console.error('Cashfree verify error:', data);
                throw new Error(data.message || 'Failed to verify payment');
            }

            if (data.order_status === 'PAID') {
                db.run("UPDATE bookings SET status = 'PAID' WHERE order_id LIKE ?", [`${order_id}%`], () => {
                    res.json({ success: true, status: 'PAID' });
                });
            } else {
                res.json({ success: true, status: data.order_status });
            }
        } catch (err) {
            console.error('Verify payment error:', err);
            res.status(500).json({ error: 'Failed to verify payment' });
        }
    });
});

// ---- Health check ----
app.get('/', (req, res) => {
    res.json({ status: 'Havoc Sim Podium backend running (Custom)', timestamp: new Date().toISOString() });
});

// ---- Background Cleanup Job ----
// Auto-delete abandoned online pending bookings older than 2 minutes (runs every 60 seconds)
setInterval(() => {
    const isProd = process.env.NODE_ENV === 'production';
    const query = isProd
        ? `DELETE FROM bookings WHERE status = 'PENDING' AND order_id NOT LIKE 'PAYDUE%' AND created_at <= NOW() - INTERVAL '2 minutes'`
        : `DELETE FROM bookings WHERE status = 'PENDING' AND order_id NOT LIKE 'PAYDUE%' AND datetime(created_at) <= datetime('now', '-2 minutes')`;

    db.run(query, function (err) {
        if (err) console.error("Cleanup Job Error:", err);
        else if (this.changes > 0) {
            console.log(`[${new Date().toISOString()}] Cleanup: Auto-deleted ${this.changes} expired pending booking(s)`);
        }
    });

    // Also auto-delete expired temporary holds older than 2 minutes
    const holdCleanupQuery = isProd
        ? `DELETE FROM online_checkout_holds WHERE created_at <= NOW() - INTERVAL '2 minutes'`
        : `DELETE FROM online_checkout_holds WHERE datetime(created_at) <= datetime('now', '-2 minutes')`;
    db.run(holdCleanupQuery, function (err) {
        if (err) console.error("Hold Cleanup Error:", err);
    });
}, 60 * 1000); // Check every minute so abandoned slots release promptly

// ==========================================
// ADVANCE BOOKING NOTIFICATIONS WITH PAYMENT LINKS
// ==========================================

// Helper to parse booking date string (e.g. 'Nov 11 (Wed)', 'Nov 11', '2026-11-11') and time slot into a UTC timestamp
function parseBookingDateTimeIST(dateStr, timeStr) {
    if (!dateStr) return null;
    let cleanDate = String(dateStr).trim().replace(/\s*\([A-Za-z]+\)$/, '').trim();
    const isoMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let year, month, day;
    if (isoMatch) {
        year = parseInt(isoMatch[1], 10);
        month = parseInt(isoMatch[2], 10) - 1;
        day = parseInt(isoMatch[3], 10);
    } else {
        const parts = cleanDate.split(/\s+/);
        if (parts.length >= 2) {
            const mStr = parts[0].toLowerCase();
            const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
            month = monthMap[mStr.slice(0, 3)];
            day = parseInt(parts[1], 10);
            year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
        }
    }
    if (year === undefined || month === undefined || isNaN(day)) return null;

    let hour = 11, minute = 0;
    if (timeStr) {
        const startPart = timeStr.split('-')[0].trim();
        const m = startPart.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
        if (m) {
            hour = parseInt(m[1], 10);
            minute = m[2] ? parseInt(m[2], 10) : 0;
            const meridiem = m[3].toLowerCase();
            if (meridiem === 'pm' && hour < 12) hour += 12;
            if (meridiem === 'am' && hour === 12) hour = 0;
        }
    }
    // IST is UTC+5:30 -> UTC = IST - 5h 30m
    return new Date(Date.UTC(year, month, day, hour - 5, minute - 30));
}

// Core helper: generates a payment link for an order (or reuse existing pending one) and dispatches advance notification WhatsApp
async function dispatchAdvanceBookingNotification(orderId, hostReq = null) {
    return new Promise((resolve) => {
        db.all("SELECT * FROM bookings WHERE order_id = ? OR order_id LIKE ?", [orderId, `${orderId}%`], async (err, rows) => {
            if (err || !rows || rows.length === 0) {
                return resolve({ success: false, reason: 'No bookings found for order ' + orderId });
            }

            const primary = rows[0];
            const customerName = (primary.name || 'Driver').trim();
            const customerPhone = (primary.phone || '').trim();
            const customerEmail = (primary.email || '').trim();

            if (!customerPhone) {
                return resolve({ success: false, reason: 'No phone number for customer' });
            }

            // Exclude already cancelled bookings
            const activeRows = rows.filter(r => r.status !== 'CANCELLED' && r.status !== 'REFUNDED');
            if (activeRows.length === 0) {
                return resolve({ success: false, reason: 'All bookings in order are cancelled' });
            }

            const isAllPaid = activeRows.every(r => r.status === 'PAID' || r.status === 'ATTENDED' || r.status === 'CASH');
            const totalDue = activeRows
                .filter(r => r.status !== 'PAID' && r.status !== 'ATTENDED' && r.status !== 'CASH')
                .reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);

            const isProd = process.env.NODE_ENV === 'production' || ICICI_ENV === 'live';
            let baseUrl = 'https://www.havocsim.in';
            if (hostReq && hostReq.protocol && hostReq.get) {
                baseUrl = isProd ? 'https://www.havocsim.in' : `${hostReq.protocol}://${hostReq.get('host')}`;
            }

            let payUrl = '';
            let linkId = '';

            if (totalDue > 0) {
                // Check if a pending payment link already exists for these order_ids
                const existingLink = await new Promise(resLink => {
                    db.get("SELECT * FROM payment_links WHERE order_ids LIKE ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1", [`%${orderId}%`], (lErr, row) => {
                        resLink(row || null);
                    });
                });

                if (existingLink) {
                    linkId = existingLink.link_id;
                    payUrl = `${baseUrl}/pay.html?id=${linkId}`;
                } else {
                    // Create a new dedicated payment link
                    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    linkId = `PL_${shortCode}`;
                    payUrl = `${baseUrl}/pay.html?id=${linkId}`;

                    const sessionDesc = activeRows.map(r => r.item_name).join(', ') || 'Simulator Session';
                    const orderIdsStr = activeRows.map(r => r.order_id).join(',');

                    await new Promise(resIns => {
                        db.run(
                            `INSERT INTO payment_links (link_id, customer_name, customer_phone, customer_email, amount, description, order_ids, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                            [linkId, customerName, customerPhone, customerEmail, totalDue, `Advance Payment: ${sessionDesc} (${orderId})`, orderIdsStr],
                            () => resIns()
                        );
                    });
                }
            }

            // Compose Advance Booking Notification WhatsApp Message
            const sessionSummary = activeRows.map(r => {
                const isDuo = (Number(r.players) === 2 || r.player_two_name);
                return `${r.item_name || 'Simulator'}${isDuo ? ' (2-Player Combo)' : ''}`;
            }).join(' + ');

            const dateStr = primary.booking_date || '';
            const timeSlotStr = activeRows.map(r => r.booking_time).filter(Boolean).join(', ') || '';

            const { countryCode, phoneNumber } = parseInternationalPhone(customerPhone);
            const cleanDigitsCountry = countryCode.replace(/\D/g, "") || "91";
            const waNumber = `${cleanDigitsCountry}${phoneNumber}`;

            let waMessageText = '';
            if (totalDue > 0 && payUrl) {
                waMessageText = `Hi ${customerName}! 🏎️🏁\n\nThis is an advance reminder from Havoc Sim Podium for your upcoming simulator booking!\n\n📋 *Booking Details:*\n• Order ID: #${orderId}\n• Experience: ${sessionSummary}\n• Date: ${dateStr}\n• Time Slot: ${timeSlotStr}\n• Amount Due: ₹${totalDue.toFixed(2)}\n\n💳 *Complete Payment Before Arrival:*\nTo skip the desk check-in queue, please complete your payment using this secure link:\n${payUrl}\n\nSee you on the podium! 🚀`;
            } else {
                waMessageText = `Hi ${customerName}! 🏎️🏁\n\nThis is an advance reminder from Havoc Sim Podium for your upcoming simulator booking!\n\n📋 *Booking Details:*\n• Order ID: #${orderId}\n• Experience: ${sessionSummary}\n• Date: ${dateStr}\n• Time Slot: ${timeSlotStr}\n• Status: Confirmed & Paid ✓\n\nPlease arrive 10 minutes prior to your slot time. See you on the podium! 🚀`;
            }

            const waMeUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessageText)}`;

            // Attempt WhatsApp dispatch via Interakt API if configured
            const interaktApiKey = process.env.INTERAKT_API_KEY;
            let waSent = false;
            let interaktError = null;

            if (interaktApiKey && phoneNumber) {
                try {
                    // Shared Advance Notification Template (Havoc Sim Podium & Havoc RC Fun Zone)
                    const templateName = process.env.INTERAKT_ADVANCE_NOTIFICATION_TEMPLATE || process.env.INTERAKT_PAYMENT_LINK_TEMPLATE || "havoc_advance_booking_reminder";
                    const formattedAmt = totalDue.toFixed(2);
                    const venueTitle = process.env.VENUE_NAME || "Havoc Sim Podium";
                    const dateTimeDisplay = `${dateStr} • ${timeSlotStr}`;

                    const response = await fetch('https://api.interakt.ai/v1/public/message/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${interaktApiKey.trim()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            countryCode: cleanDigitsCountry ? `+${cleanDigitsCountry}` : "+91",
                            phoneNumber: phoneNumber,
                            type: "Template",
                            template: {
                                name: templateName,
                                languageCode: process.env.INTERAKT_ADVANCE_NOTIFICATION_LANG || "en",
                                bodyValues: [
                                    customerName,
                                    venueTitle,
                                    orderId,
                                    sessionSummary,
                                    dateTimeDisplay,
                                    formattedAmt,
                                    payUrl || "Paid Online / Confirmed"
                                ]
                            }
                        })
                    });

                    const resData = await response.json();
                    if (resData.result === true || response.status === 200 || response.status === 201) {
                        waSent = true;
                        console.log(`[Advance Notification] Interakt WhatsApp sent successfully to ${phoneNumber} for order #${orderId}`);
                    } else {
                        interaktError = resData.message || 'Interakt API returned non-success';
                        console.warn(`[Advance Notification] Interakt response:`, resData);
                    }
                } catch (apiErr) {
                    interaktError = apiErr.message;
                    console.error(`[Advance Notification] Interakt dispatch error:`, apiErr);
                }
            }

            // Mark advance_reminder_sent = 1 on all rows in this order
            db.run("UPDATE bookings SET advance_reminder_sent = 1 WHERE order_id = ? OR order_id LIKE ?", [orderId, `${orderId}%`], () => { });

            resolve({
                success: true,
                order_id: orderId,
                customer_phone: customerPhone,
                total_due: totalDue,
                pay_url: payUrl,
                link_id: linkId,
                wa_sent: waSent,
                wa_me_url: waMeUrl,
                message_text: waMessageText,
                interakt_error: interaktError
            });
        });
    });
}

// Background Cron Job: Runs every 10 minutes to auto-send advance notifications to prior bookings
// Targets bookings occurring in the next 1 to 24 hours that haven't received an advance reminder yet
setInterval(async () => {
    try {
        // First check feature switch from settings
        db.get("SELECT value FROM settings WHERE key = 'feature_switches'", async (err, row) => {
            let advanceEnabled = true;
            if (!err && row && row.value) {
                try {
                    const parsed = JSON.parse(row.value);
                    if (parsed.advance_notifications_enabled === false) {
                        advanceEnabled = false;
                    }
                } catch (e) { }
            }

            if (!advanceEnabled) {
                return; // Feature toggle is disabled in admin
            }

            // Query active bookings where reminder not sent yet
            db.all(
                "SELECT * FROM bookings WHERE (advance_reminder_sent IS NULL OR advance_reminder_sent = 0) AND status NOT IN ('CANCELLED', 'REFUNDED', 'ATTENDED') ORDER BY id ASC LIMIT 50",
                [],
                async (bErr, rows) => {
                    if (bErr || !rows || rows.length === 0) return;

                    const now = new Date();
                    // Group by base order ID so customer gets 1 consolidated notification
                    const orderGroups = new Map();
                    rows.forEach(r => {
                        let base = r.order_id || '';
                        const parts = base.split('_');
                        if (parts[1] === 'SP' && parts.length >= 4) {
                            base = parts.slice(0, 3).join('_');
                        } else if (parts.length >= 4) {
                            base = parts.slice(0, 3).join('_');
                        }
                        if (!orderGroups.has(base)) orderGroups.set(base, []);
                        orderGroups.get(base).push(r);
                    });

                    for (const [orderId, items] of orderGroups) {
                        const first = items[0];
                        const slotTime = parseBookingDateTimeIST(first.booking_date, first.booking_time);
                        if (!slotTime || isNaN(slotTime.getTime())) continue;

                        const diffHours = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                        // If session is within the upcoming 24 hours (and at least 15 mins away)
                        if (diffHours >= 0.25 && diffHours <= 24) {
                            console.log(`[Advance Cron] Dispatching advance reminder for order #${orderId} (slot in ${diffHours.toFixed(1)} hrs)...`);
                            await dispatchAdvanceBookingNotification(orderId);
                        }
                    }
                }
            );
        });
    } catch (cronErr) {
        console.error('[Advance Cron Job Error]:', cronErr);
    }
}, 10 * 60 * 1000); // Check every 10 minutes

// Admin Endpoint: Manual one-click trigger to send advance reminder + payment link
app.post('/api/admin/bookings/:order_id/send-advance-reminder', verifyToken, checkPermission('edit_orders'), async (req, res) => {
    let orderId = req.params.order_id;
    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });
    orderId = decodeURIComponent(orderId).trim();

    try {
        const result = await dispatchAdvanceBookingNotification(orderId, req);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        console.error('Error dispatching manual advance reminder:', e);
        res.status(500).json({ error: e.message || 'Internal server error sending reminder' });
    }
});


// ==========================================
// ICICI UPI PAYMENT ROUTES
// ==========================================

app.post('/api/upi/collect', async (req, res) => {
    try {
        const { amount, customer_details, booking_data, vpa } = req.body;
        const items = Array.isArray(booking_data) ? booking_data : [booking_data];

        if (!vpa) return res.status(400).json({ error: 'UPI ID (VPA) is required.' });

        const checkAvailability = () => {
            return new Promise((resolve, reject) => {
                if (!items || items.length === 0) return resolve(false);
                let checkCount = 0;
                let hasConflict = false;
                const custEmail = (customer_details && customer_details.email) ? customer_details.email.trim().toLowerCase() : '';
                const custPhone = (customer_details && customer_details.phone) ? customer_details.phone.replace(/[^\d]/g, '') : '';

                items.forEach(item => {
                    let query = "SELECT id, status, email, phone, created_at, order_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND item_name = ?";
                    let params = [item.date, item.time, item.item_name];
                    if (item.instructor_id) {
                        query = "SELECT id, status, email, phone, created_at, order_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND (item_name = ? OR instructor_id = ?)";
                        params = [item.date, item.time, item.item_name, item.instructor_id];
                    }

                    db.all(query, params, (err, rows) => {
                        if (err) return reject(err);
                        if (rows && rows.length > 0) {
                            for (const r of rows) {
                                // Confirmed/paid/attended/desk bookings are always a hard block
                                if (r.status === 'PAID' || r.status === 'SUCCESS' || r.status === 'CASH' || (r.order_id && r.order_id.startsWith('PAYDUE_'))) {
                                    hasConflict = true;
                                    break;
                                }

                                // For online PENDING attempts:
                                const rEmail = (r.email || '').trim().toLowerCase();
                                const rPhone = (r.phone || '').replace(/[^\d]/g, '');
                                const isSameCustomer = (custEmail && rEmail === custEmail) || (custPhone && rPhone && rPhone === custPhone);

                                if (isSameCustomer) {
                                    // It's the same customer's prior abandoned pending attempt! Allow them to supersede it
                                    continue;
                                }

                                // If pending attempt was by someone else, check if older than 2 minutes
                                const bookingAgeMs = Date.now() - new Date(r.created_at).getTime();
                                if (bookingAgeMs > 2 * 60 * 1000) {
                                    // Expired abandoned attempt, ignore conflict
                                    continue;
                                }

                                hasConflict = true;
                                break;
                            }
                        }

                        // Also check shared simulator_slot_locks (for locks from RC Fun Zone or other channels)
                        const lockQuery = "SELECT simulator_name, booking_date, booking_time, status, customer_phone, source_order_id, created_at FROM simulator_slot_locks WHERE simulator_name = ? AND (booking_date = ? OR booking_date = ?) AND booking_time = ? AND status IN ('PENDING', 'PAID', 'ATTENDED', 'CONFIRMED')";
                        const lockParams = [item.item_name, item.date, item.date.replace(/ \([A-Za-z]+\)/, ''), item.time];

                        db.all(lockQuery, lockParams, (lockErr, lockRows) => {
                            if (!lockErr && lockRows && lockRows.length > 0) {
                                for (const lr of lockRows) {
                                    if (lr.status === 'PAID' || lr.status === 'ATTENDED' || lr.status === 'CONFIRMED' || (lr.source_order_id && lr.source_order_id.startsWith('PAYDUE_'))) {
                                        hasConflict = true;
                                        break;
                                    }
                                    const lockPhone = (lr.customer_phone || '').replace(/[^\d]/g, '');
                                    if (custPhone && lockPhone && lockPhone === custPhone) {
                                        // Same customer's prior pending lock
                                        continue;
                                    }
                                    const lockAgeMs = Date.now() - new Date(lr.created_at).getTime();
                                    if (lockAgeMs > 2 * 60 * 1000) {
                                        continue;
                                    }
                                    hasConflict = true;
                                    break;
                                }
                            }

                            // Also check active online checkout holds (< 2 minutes old)
                            db.all("SELECT txn_id, customer_email, customer_phone, items_json, created_at FROM online_checkout_holds", [], (holdErr, holdRows) => {
                                if (!holdErr && holdRows) {
                                    for (const hr of holdRows) {
                                        const hrEmail = (hr.customer_email || '').trim().toLowerCase();
                                        const hrPhone = (hr.customer_phone || '').replace(/[^\d]/g, '');
                                        const isSameCust = (custEmail && hrEmail === custEmail) || (custPhone && hrPhone && hrPhone === custPhone);
                                        if (isSameCust) continue;

                                        const ageMs = Date.now() - new Date(hr.created_at).getTime();
                                        if (ageMs > 2 * 60 * 1000) continue;

                                        try {
                                            const heldItems = JSON.parse(hr.items_json || '[]');
                                            for (const hi of heldItems) {
                                                const hiDate = (hi.date || '').replace(/ \([A-Za-z]+\)/, '');
                                                const itDate = (item.date || '').replace(/ \([A-Za-z]+\)/, '');
                                                if (hi.item_name === item.item_name && hiDate === itDate && hi.time === item.time) {
                                                    hasConflict = true;
                                                    break;
                                                }
                                            }
                                        } catch (e) { }
                                        if (hasConflict) break;
                                    }
                                }

                                // Also check admin blocked_slots
                                const bQuery = "SELECT COUNT(*) as count FROM blocked_slots WHERE (simulator_name = ? OR simulator_name = 'ALL') AND (booking_date = ? OR booking_date = ? OR booking_date = 'ALL') AND (time_slot = ? OR time_slot = 'ALL_DAY')";
                                const bParams = [item.item_name, item.date, item.date.replace(/ \([A-Za-z]+\)/, ''), item.time];
                                db.get(bQuery, bParams, (bErr, bRow) => {
                                    if (!bErr && bRow && bRow.count > 0) hasConflict = true;
                                    checkCount++;
                                    if (checkCount === items.length) resolve(hasConflict);
                                });
                            });
                        });
                    });
                });
            });
        };

        const hasConflict = await checkAvailability();
        if (hasConflict) {
            return res.status(409).json({ error: 'Sorry, one or more selected slots was just booked! Please select different slots.' });
        }

        const orderAmount = parseFloat(amount).toFixed(2);
        const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const baseOrderId = `UPI_${shortCode}`;

        let insertedCount = 0;

        const totalBaseCost = items.reduce((sum, i) => sum + (Number(i.base_price) || 0) + (Number(i.instructor_fee) || 0), 0);

        items.forEach((item, index) => {
            const rowOrderId = items.length > 1 ? `${baseOrderId}_${index}` : baseOrderId;

            let itemPrice = (parseFloat(amount) / items.length).toFixed(2);
            if (totalBaseCost > 0) {
                const itemRatio = ((Number(item.base_price) || 0) + (Number(item.instructor_fee) || 0)) / totalBaseCost;
                itemPrice = (parseFloat(amount) * itemRatio).toFixed(2);
            }

            db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id, players, player_two_name) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [rowOrderId, customer_details.name, customer_details.email, customer_details.phone, item.item_name, itemPrice, item.date, item.time, 'PENDING', item.instructor_id || null, item.players || 1, item.player_two_name || null],
                function (err) {
                    if (err) console.error("DB Insert Error:", err);
                    insertedCount++;

                    if (insertedCount === items.length) {
                        initiateUPICollect(baseOrderId, orderAmount, vpa);
                    }
                });
        });

        async function initiateUPICollect(orderId, orderAmt, payerVa) {
            try {
                const payload = new CollectPayRequestDTO();
                payload.amount = orderAmt;
                payload.merchantId = {
                    merchantId: process.env.ICICI_MERCHANT_ID || '',
                    subMerchantId: process.env.ICICI_MERCHANT_ID || '',
                    terminalId: process.env.ICICI_TERMINAL_ID || '',
                    merchantTranId: orderId,
                    payerVa: payerVa,
                    amount: orderAmt,
                    note: "Havoc Sim Podium Booking",
                    collectByDate: "0",
                    merchantName: "Havoc Sim Podium",
                    subMerchantName: "Havoc Sim Podium",
                    billNumber: orderId,
                    validatePayerAccFlag: "N",
                    payerAccount: "",
                    payerIFSC: ""
                };

                const response = await SdkClient.execute("3007", "eazypay", payload);
                console.log("UPI Collect Response:", response);

                if (response && response.success === "true") {
                    res.json({ success: true, order_id: orderId, message: 'Please approve the payment in your UPI app.' });
                } else {
                    db.run("DELETE FROM bookings WHERE order_id LIKE ?", [`${orderId}%`]);
                    res.status(400).json({ error: response?.errormessage || 'Failed to initiate UPI payment' });
                }
            } catch (err) {
                console.error('UPI Collect API error:', err);
                db.run("DELETE FROM bookings WHERE order_id LIKE ?", [`${orderId}%`]);
                res.status(500).json({ error: 'Failed to communicate with ICICI Bank' });
            }
        }
    } catch (err) {
        console.error('Create UPI order error:', err);
        res.status(500).json({ error: 'Failed to create UPI order' });
    }
});

// Callback for ICICI to send status updates
app.post('/api/upi/callback', async (req, res) => {
    try {
        const encData = req.body;
        const response = await SdkClient.decryptCallback(encData);
        console.log("Decrypted Callback:", response);

        if (response && response.status === 'SUCCESS') {
            const orderId = response.merchantTranId;
            db.run("UPDATE bookings SET status = 'PAID' WHERE order_id LIKE ?", [`${orderId}%`], () => {
                db.all("SELECT * FROM bookings WHERE order_id LIKE ?", [`${orderId}%`], (err, rows) => {
                    if (!err && rows && rows.length > 0) {
                        sendConfirmationEmail(rows);
                        dispatchBookingWhatsAppNotification(rows, 'Paid Online');
                        rows.forEach(row => {
                            if (row.instructor_id) {
                                db.get("SELECT * FROM instructors WHERE id = ?", [row.instructor_id], (err, instructor) => {
                                    if (!err && instructor && instructor.email) {
                                        sendInstructorEmail(instructor, row);
                                    }
                                });
                            }
                        });
                    }
                });
            });
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error("Callback Decryption Error:", error);
        res.status(400).send('Bad Request');
    }
});

app.get('/api/upi/status/:orderId', (req, res) => {
    const { orderId } = req.params;
    db.get("SELECT status FROM bookings WHERE order_id = ?", [orderId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, status: row.status });
    });
});

app.listen(PORT, () => {
    console.log(`\n Havoc Sim Podium backend running at http://localhost:${PORT}\n`);

    // Ensure payment_ref column exists on bookings table
    if (db.isPostgres) {
        db.pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_ref TEXT", () => { });
    } else {
        db.run("ALTER TABLE bookings ADD COLUMN payment_ref TEXT", [], () => { });
    }

    // Optimize product images: replace heavy base64 strings with lightweight static URLs
    const optimizedProductData = [
        { id: 1, image_url: "/assets/uploads/prod_1_main_1792739213277_763.png", images_json: "[\"/assets/uploads/prod_1_gallery_0_1792739213279_580.png\"]" },
        { id: 2, image_url: "/assets/uploads/prod_2_main_1792739213283_460.png", images_json: "[\"/assets/uploads/prod_2_gallery_0_1792739213286_341.png\"]" },
        { id: 3, image_url: "/assets/uploads/prod_3_main_1792739213288_391.jpg", images_json: "[\"/assets/uploads/prod_3_gallery_0_1792739213290_998.jpg\"]" },
        { id: 4, image_url: "/assets/uploads/prod_4_main_1792739213293_279.jpg", images_json: "[\"/assets/uploads/prod_4_gallery_0_1792739213299_538.jpg\"]" },
        { id: 5, image_url: "/assets/uploads/prod_5_main_1792739213301_600.png", images_json: "[\"/assets/uploads/prod_5_gallery_0_1792739213303_203.png\"]" },
        { id: 6, image_url: "/assets/uploads/prod_6_main_1792739213304_82.png", images_json: "[\"/assets/uploads/prod_6_gallery_0_1792739213315_997.png\",\"/assets/uploads/prod_6_gallery_1_1792739213320_222.jpg\",\"/assets/uploads/prod_6_gallery_2_1792739213328_609.jpg\"]" },
        { id: 7, image_url: "/assets/uploads/prod_7_main_1792739213330_32.png", images_json: "[\"/assets/uploads/prod_7_gallery_0_1792739213331_965.png\"]" },
        { id: 10, image_url: "/assets/uploads/prod_10_main_1792739213333_509.jpg", images_json: "[\"/assets/uploads/prod_10_gallery_0_1792739213349_204.jpg\",\"/assets/uploads/prod_10_gallery_1_1792739213355_404.jpg\",\"/assets/uploads/prod_10_gallery_2_1792739213361_322.jpg\",\"/assets/uploads/prod_10_gallery_3_1792739213368_32.jpg\"]" },
        { id: 12, image_url: "/assets/uploads/prod_12_main_1792739213370_372.jpg", images_json: "[\"/assets/uploads/prod_12_gallery_0_1792739213385_142.jpg\",\"/assets/uploads/prod_12_gallery_1_1792739213390_962.jpg\",\"/assets/uploads/prod_12_gallery_2_1792739213397_39.jpg\",\"/assets/uploads/prod_12_gallery_3_1792739213404_671.jpg\"]" }
    ];
    // Enforce permanent git-tracked static image paths for standard products
    optimizedProductData.forEach(p => {
        db.run("UPDATE products SET image_url = ?, images_json = ? WHERE id = ?", [p.image_url, p.images_json, p.id]);
    });
});

