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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'assets', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit


const helmet = require('helmet');
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'havoc-super-secret-key-123';

// Redirect secondary domains to primary domain (havocsim.in)
app.use((req, res, next) => {
    const host = req.hostname;
    if (host && (
        host === 'havocsim.com' || 
        host === 'www.havocsim.com' || 
        host === 'havocsimpodium.in' || 
        host === 'www.havocsimpodium.in' || 
        host === 'havocsimpodium.com' || 
        host === 'www.havocsimpodium.com'
    )) {
        return res.redirect(301, 'https://havocsim.in' + req.originalUrl);
    }
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.cashfree.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://www.cashfree.com"],
            connectSrc: ["'self'", "https://api.cashfree.com", "https://sandbox.cashfree.com"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"]
        }
    }
}));
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve all HTML, CSS, JS, and asset files from the project root
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

// Cashfree Credentials & Environment
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const ENVIRONMENT = process.env.CASHFREE_ENV || 'sandbox';

const getCashfreeBaseUrl = () => {
    return ENVIRONMENT === 'production' 
        ? 'https://api.cashfree.com/pg' 
        : 'https://sandbox.cashfree.com/pg';
};

// ICICI PG Direct UAT Credentials & Environment
const ICICI_MERCHANT_ID = process.env.ICICI_MERCHANT_ID || '100000000007164';
const ICICI_SECRET_KEY = process.env.ICICI_SECRET_KEY || 'db06cca0-838b-4e01-8b20-6ac446ffb6bd';
const ICICI_AGGREGATOR_ID = process.env.ICICI_AGGREGATOR_ID || 'A100000000007164';
const ICICI_ENV = process.env.ICICI_ENV || 'uat'; // 'uat' or 'live'

const getIciciBaseUrl = () => {
    return ICICI_ENV === 'live' 
        ? 'https://pgpay.icicibank.com/pg/api/v2' 
        : 'https://pgpayuat.icicibank.com/tsp/pg/api/v2';
};

// ==========================================
// ADMIN DASHBOARD & 2FA ROUTES
// ==========================================

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'No token provided.' });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized.' });
        req.user = decoded;
        next();
    });
};

// Middleware to verify Super Admin
const verifySuperAdmin = (req, res, next) => {
    if (req.user.username !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }
    next();
};

app.get('/api/admin/me', verifyToken, (req, res) => {
    // We could query DB for latest role, but JWT role is usually fine for session
    res.json({ username: req.user.username, role: req.user.role });
});

// Newsletter Subscription
app.post('/api/newsletter', express.json(), (req, res) => {
    const email = req.body.email;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    
    db.run("INSERT INTO newsletter_subscribers (email) VALUES (?)", [email], function(err) {
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
    
    db.run("UPDATE settings SET value = ? WHERE key = 'payment_methods'", [value], function(err) {
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
        db.run("UPDATE admin_auth SET password_hash = ?, must_change_password = 0 WHERE id = ?", [hash, req.user.id], function(err) {
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
    db.all("SELECT id, username, role FROM admin_auth", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Add a new staff user (Protected, Admin only)
app.post('/api/admin/users', verifyToken, verifySuperAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    const userRole = role === 'super_admin' ? 'super_admin' : 'staff';
    
    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        db.run("INSERT INTO admin_auth (username, password_hash, must_change_password, role) VALUES (?, ?, 1, ?)", [username, hash, userRole], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
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

// Update a staff user's role (Protected, Admin only)
app.put('/api/admin/users/:id/role', verifyToken, verifySuperAdmin, (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    if (role !== 'super_admin' && role !== 'staff') {
        return res.status(400).json({ error: 'Invalid role' });
    }

    db.get("SELECT username FROM admin_auth WHERE id = ?", [id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') {
            return res.status(403).json({ error: 'Cannot change the primary admin account role' });
        }
        
        db.run("UPDATE admin_auth SET role = ? WHERE id = ?", [role, id], (err) => {
            if (err) return res.status(500).json({ error: 'Error updating role' });
            res.json({ success: true });
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

// Reset a staff user's password to default (Protected, Admin only)
app.post('/api/admin/users/:id/reset-password', verifyToken, verifySuperAdmin, (req, res) => {
    const { id } = req.params;
    
    // Prevent resetting the main 'admin' account
    db.get("SELECT username FROM admin_auth WHERE id = ?", [id], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') {
            return res.status(403).json({ error: 'Cannot reset the primary admin account' });
        }
        
        try {
            const saltRounds = 10;
            const hash = await bcrypt.hash('sabharwal@65', saltRounds);
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
    db.all("SELECT code, type, value, expires_at, max_uses, used_count FROM coupons WHERE active = 1", [], (err, rows) => {
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
    const { prefix, count, start_from, type, value, expires_at, max_uses, format } = req.body;
    
    if (!prefix || !count || count < 1 || count > 500) {
        return res.status(400).json({ error: 'Invalid prefix or count (max 500).' });
    }

    const startIdx = start_from ? parseInt(start_from) : 1;
    const expiresVal = expires_at || null;
    const maxUsesVal = max_uses != null && max_uses !== '' ? parseInt(max_uses) : null;
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
    const stmt = db.prepare("INSERT OR IGNORE INTO coupons (code, type, value, expires_at, max_uses, used_count) VALUES (?, ?, ?, ?, ?, 0)");
    
    let insertedCount = 0;
    codes.forEach((code) => {
        stmt.run([code, type, value, expiresVal, maxUsesVal], function(err) {
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
    const { code, type, value, expires_at, max_uses } = req.body;
    const expiresVal = expires_at || null;
    const maxUsesVal = max_uses != null && max_uses !== '' ? parseInt(max_uses) : null;
    db.run(
        "INSERT INTO coupons (code, type, value, expires_at, max_uses, used_count) VALUES (?, ?, ?, ?, ?, 0)",
        [code, type, value, expiresVal, maxUsesVal],
        function(err) {
            if (err) return res.status(400).json({ error: 'Coupon code might already exist.' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Update a coupon (Protected, Admin only)
app.put('/api/admin/coupons/:code', verifyToken, verifySuperAdmin, (req, res) => {
    const codeToUpdate = req.params.code;
    const { type, value, expires_at, max_uses } = req.body;
    const expiresVal = expires_at || null;
    const maxUsesVal = max_uses != null && max_uses !== '' ? parseInt(max_uses) : null;
    
    db.run(
        "UPDATE coupons SET type = ?, value = ?, expires_at = ?, max_uses = ? WHERE code = ?",
        [type, value, expiresVal, maxUsesVal, codeToUpdate],
        function(err) {
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
    db.run(`DELETE FROM coupons WHERE code IN (${placeholders})`, codes, function(err) {
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

// Instructors API
app.get('/api/instructors', (req, res) => {
    db.all("SELECT * FROM instructors ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/available-instructors', (req, res) => {
    const { date, time } = req.query;
    if (!date || !time) return res.status(400).json({ error: 'Date and time required' });

    db.all("SELECT instructor_id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PAID', 'ATTENDED', 'CASH', 'PENDING') AND instructor_id IS NOT NULL", [date, time], (err, bookedRows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        const bookedInstructorIds = bookedRows.map(r => r.instructor_id);
        
        db.all("SELECT * FROM instructors WHERE status = 'Available' ORDER BY id ASC", [], (err, instructors) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const availableInstructors = instructors.filter(i => !bookedInstructorIds.includes(i.id));
            res.json(availableInstructors);
        });
    });
});

app.post('/api/admin/instructors', verifyToken, verifySuperAdmin, upload.single('image'), (req, res) => {
    const { name, age, role, key_achievement, status, biography, fee, email, phone, simulator_type } = req.body;
    let photo_url = null;
    if (req.file) {
        const base64Data = req.file.buffer.toString('base64');
        photo_url = `data:${req.file.mimetype};base64,${base64Data}`;
    }
    db.run("INSERT INTO instructors (name, age, role, key_achievement, status, biography, photo_url, fee, email, phone, simulator_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, age || null, role, key_achievement, status || 'Available', biography, photo_url, fee != null ? parseFloat(fee) : 500, email, phone, simulator_type || 'All'],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to add instructor' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/instructors/:id', verifyToken, verifySuperAdmin, upload.single('image'), (req, res) => {
    const { name, age, role, key_achievement, status, biography, fee, email, phone, simulator_type } = req.body;
    const feeVal = fee != null ? parseFloat(fee) : 500;
    const simTypeVal = simulator_type || 'All';
    let query = "UPDATE instructors SET name=?, age=?, role=?, key_achievement=?, status=?, biography=?, fee=?, email=?, phone=?, simulator_type=? WHERE id=?";
    let params = [name, age || null, role, key_achievement, status || 'Available', biography, feeVal, email, phone, simTypeVal, req.params.id];
    
    if (req.file) {
        const base64Data = req.file.buffer.toString('base64');
        const photo_url = `data:${req.file.mimetype};base64,${base64Data}`;
        query = "UPDATE instructors SET name=?, age=?, role=?, key_achievement=?, status=?, biography=?, fee=?, email=?, phone=?, simulator_type=?, photo_url=? WHERE id=?";
        params = [name, age || null, role, key_achievement, status || 'Available', biography, feeVal, email, phone, simTypeVal, photo_url, req.params.id];
    }
    
    db.run(query, params, (err) => {
        if (err) {
            console.error("SQL UPDATE ERROR:", err);
            return res.status(500).json({ error: 'Failed to update instructor' });
        }
        res.json({ success: true });
    });
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

app.post('/api/admin/products', verifyToken, verifySuperAdmin, upload.single('image'), (req, res) => {
    const { name, type, price, compare_price, stock_quantity, description, options } = req.body;
    let image_url = null;
    if (req.file) {
        const base64Data = req.file.buffer.toString('base64');
        image_url = `data:${req.file.mimetype};base64,${base64Data}`;
    }
    db.run("INSERT INTO products (name, type, price, compare_price, stock_quantity, description, image_url, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, type, price, compare_price || null, stock_quantity || 10, description, image_url, options || '[]'],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to add product' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/products/:id', verifyToken, verifySuperAdmin, upload.single('image'), (req, res) => {
    const { name, type, price, compare_price, stock_quantity, description, options } = req.body;
    let query = "UPDATE products SET name=?, type=?, price=?, compare_price=?, stock_quantity=?, description=?, options=? WHERE id=?";
    let params = [name, type, price, compare_price || null, stock_quantity || 10, description, options || '[]', req.params.id];
    
    if (req.file) {
        const base64Data = req.file.buffer.toString('base64');
        const image_url = `data:${req.file.mimetype};base64,${base64Data}`;
        query = "UPDATE products SET name=?, type=?, price=?, compare_price=?, stock_quantity=?, description=?, options=?, image_url=? WHERE id=?";
        params = [name, type, price, compare_price || null, stock_quantity || 10, description, options || '[]', image_url, req.params.id];
    }
    
    db.run(query, params, (err) => {
        if (err) {
            console.error("SQL UPDATE ERROR:", err);
            return res.status(500).json({ error: 'Failed to update product' });
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
        const query = `INSERT INTO products (name, type, price, compare_price, stock_quantity, description, options, image_url)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [newName, product.type, product.price, product.compare_price, product.stock_quantity, product.description, product.options, product.image_url];
        
        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: 'Error duplicating product' });
            res.json({ success: true, newId: this.lastID });
        });
    });
});

// Slots API
app.get('/api/slots', (req, res) => {
    db.all("SELECT * FROM slots WHERE active=1 ORDER BY sort_order ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/admin/slots', verifyToken, verifySuperAdmin, (req, res) => {
    db.all("SELECT * FROM slots ORDER BY sort_order ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/admin/slots', verifyToken, verifySuperAdmin, (req, res) => {
    const { time_range, active, sort_order } = req.body;
    db.run("INSERT INTO slots (time_range, active, sort_order) VALUES (?, ?, ?)",
        [time_range, active, sort_order || 0],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to add slot' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/slots/:id', verifyToken, verifySuperAdmin, (req, res) => {
    const { time_range, active, sort_order } = req.body;
    db.run("UPDATE slots SET time_range=?, active=?, sort_order=? WHERE id=?",
        [time_range, active, sort_order || 0, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update slot' });
            res.json({ success: true });
        }
    );
});

app.delete('/api/admin/slots/:id', verifyToken, verifySuperAdmin, (req, res) => {
    db.run("DELETE FROM slots WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error deleting slot' });
        res.json({ success: true });
    });
});

// ==========================================
// BOOKINGS MANAGEMENT ROUTES
// ==========================================

// Get booked slots for a specific date (Public)
app.get('/api/availability/:date', (req, res) => {
    const { date } = req.params;
    const { item } = req.query;

    let query = "SELECT booking_time FROM bookings WHERE booking_date = ? AND status IN ('PAID', 'ATTENDED', 'CASH', 'PENDING')";
    let params = [date];

    if (item) {
        query += " AND item_name = ?";
        params.push(item);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const bookedSlots = rows.map(r => r.booking_time);
        res.json({ bookedSlots });
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

    db.get(`SELECT SUM(price) as sales, COUNT(id) as orders FROM bookings WHERE status='SUCCESS' ${dateFilter}`, params, (err, bookingStats) => {
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
            
            db.all("SELECT item_name, booking_date, booking_time, status FROM bookings WHERE status='SUCCESS' AND booking_date >= date('now', '-1 day')", [], (err, bookings) => {
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
    
    stmt.run([product_id, date_str, time_range, override_quantity], function(err) {
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
                // month is like "2026-09", but DB has "September 10" or "Sep 10"
                const monthNamesLong = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                const monthNamesShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const moIndex = Number(month.split('-')[1]) - 1;
                dateFilter = `AND (booking_date LIKE ? OR booking_date LIKE ?)`;
                dateParams = [`${monthNamesShort[moIndex]} %`, `${monthNamesLong[moIndex]} %`];
            }

            db.all(
                `SELECT item_name, COUNT(*) as booked_count FROM bookings WHERE status='SUCCESS' ${dateFilter} GROUP BY item_name`,
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

                    const bookingMap = {};
                    bookingCounts.forEach(b => { bookingMap[b.item_name] = b.booked_count; });

                    const report = products.map(p => {
                        const totalSlots = totalOpenDays * slotsPerDay;
                        const fullSlots = bookingMap[p.name] || 0;
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
        res.json(rows);
    });
});

// Delete a booking (Protected)
app.delete('/api/admin/bookings/:order_id', verifyToken, (req, res) => {
    const { order_id } = req.params;
    db.run("DELETE FROM bookings WHERE order_id LIKE ?", [`${order_id}%`], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json({ success: true });
    });
});

// Mark booking as attended (Protected)
app.put('/api/admin/bookings/:order_id/attend', verifyToken, (req, res) => {
    const { order_id } = req.params;
    db.run("UPDATE bookings SET status = 'ATTENDED' WHERE order_id LIKE ?", [`${order_id}%`], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json({ success: true });
    });
});

// Manually override booking status (Protected - accessible by all staff)
app.put('/api/admin/bookings/:order_id/status', verifyToken, (req, res) => {
    const { order_id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['PENDING', 'PAID', 'ATTENDED', 'CANCELLED', 'CASH'];
    if (!validStatuses.includes(status?.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid status value' });
    }
    
    db.run("UPDATE bookings SET status = ? WHERE order_id LIKE ?", [status.toUpperCase(), `${order_id}%`], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json({ success: true });
    });
});

// Manually create a walk-in booking (Protected)
app.post('/api/admin/bookings', verifyToken, (req, res) => {
    const { name, phone, email, item_name, price, booking_date, booking_time, status } = req.body;
    
    // Validate required fields
    if (!item_name || !booking_date || !booking_time) {
        return res.status(400).json({ error: 'Missing required booking details' });
    }

    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `WK_${shortCode}`;
    const finalName = name || 'Walk-in';
    const finalPhone = phone || '';
    const finalEmail = email || '';
    const finalPrice = price || 0;
    const finalStatus = status || 'CASH';

    db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [orderId, finalName, finalEmail, finalPhone, item_name, finalPrice, booking_date, booking_time, finalStatus], 
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, order_id: orderId });
        }
    );
});

// Create a COD / Pay at Desk booking (Public checkout)
app.post('/api/bookings/cod', async (req, res) => {
    const { amount, customer_details, booking_data } = req.body;
    const items = Array.isArray(booking_data) ? booking_data : [booking_data];
    
    // Validate required fields
    if (!items[0] || !items[0].item_name || !items[0].date || !items[0].time) {
        return res.status(400).json({ error: 'Missing required booking details' });
    }

    // Pre-flight concurrency check
    const checkAvailability = () => {
        return new Promise((resolve, reject) => {
            let checkCount = 0;
            let hasConflict = false;
            items.forEach(item => {
                let query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND item_name = ?";
                let params = [item.date, item.time, item.item_name];
                if (item.instructor_id) {
                    query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND (item_name = ? OR instructor_id = ?)";
                    params = [item.date, item.time, item.item_name, item.instructor_id];
                }
                
                db.get(query, params, (err, row) => {
                    if (err) return reject(err);
                    if (row.count > 0) hasConflict = true;
                    checkCount++;
                    if (checkCount === items.length) resolve(hasConflict);
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

    db.get("SELECT COUNT(*) as count FROM bookings WHERE booking_date = ?", [items[0].date], (err, row) => {
        const count = (row ? row.count : 0) + 1;
        const orderNo = String(count).padStart(2, '0');
        const baseOrderId = `PAYDUE_${formattedDate}_${orderNo}`;

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
            
            db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [rowOrderId, customer_details.name, customer_details.email, customer_details.phone, item.item_name, itemPrice, item.date, item.time, 'PENDING', item.instructor_id || null], 
                function(err) {
                    if (err) {
                        console.error("DB Insert Error (COD):", err);
                        hasError = true;
                    }
                    insertedCount++;
                    
                    if (insertedCount === items.length) {
                        if (hasError) return res.status(500).json({ error: 'Database error while inserting items' });
                        
                        // Send confirmation email for the first row as proxy
                        db.all("SELECT * FROM bookings WHERE order_id LIKE ?", [`${baseOrderId}%`], (err, rows) => {
                            if (!err && rows && rows.length > 0) {
                                if (rows[0].email) {
                                    sendConfirmationEmail(rows[0]);
                                }
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

                        res.json({ success: true, order_id: baseOrderId });
                    }
                }
            );
        });
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

        // Pre-flight concurrency check
        const checkAvailability = () => {
            return new Promise((resolve, reject) => {
                if (!items || items.length === 0) return resolve(false);
                let checkCount = 0;
                let hasConflict = false;
                items.forEach(item => {
                    let query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND item_name = ?";
                    let params = [item.date, item.time, item.item_name];
                    if (item.instructor_id) {
                        query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND (item_name = ? OR instructor_id = ?)";
                        params = [item.date, item.time, item.item_name, item.instructor_id];
                    }
                    
                    db.get(query, params, (err, row) => {
                        if (err) return reject(err);
                        if (row.count > 0) hasConflict = true;
                        checkCount++;
                        if (checkCount === items.length) resolve(hasConflict);
                    });
                });
            });
        };

        const hasConflict = await checkAvailability();
        if (hasConflict) {
            return res.status(409).json({ error: 'Sorry, one or more of your selected slots was just booked by someone else! Please select different slots.' });
        }
        
        const orderAmount = parseFloat(amount).toFixed(2);
        const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const baseOrderId = `HV_${shortCode}`; // e.g. HV_A1B2C3

        let insertedCount = 0;
        
        const totalBaseCost = items.reduce((sum, i) => sum + (Number(i.base_price) || 0) + (Number(i.instructor_fee) || 0), 0);

        items.forEach((item, index) => {
            const rowOrderId = items.length > 1 ? `${baseOrderId}_${index}` : baseOrderId;
            
            let itemPrice = (parseFloat(amount) / items.length).toFixed(2);
            if (totalBaseCost > 0) {
                const itemRatio = ((Number(item.base_price) || 0) + (Number(item.instructor_fee) || 0)) / totalBaseCost;
                itemPrice = (parseFloat(amount) * itemRatio).toFixed(2);
            }
            
            // Save pending booking to DB
            db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [rowOrderId, customer_details.name, customer_details.email, customer_details.phone, item.item_name, itemPrice, item.date, item.time, 'PENDING', item.instructor_id || null], 
                function(err) {
                    if (err) console.error("DB Insert Error:", err);
                    insertedCount++;
                    
                    if (insertedCount === items.length) {
                        createIciciOrder();
                    }
            });
        });

        async function createIciciOrder() {
            // Build Request Payload as per Step Wise Doc
            const now = new Date();
            const yyyy = now.getFullYear();
            const MM = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const HH = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const txnDate = `${yyyy}${MM}${dd}${HH}${mm}${ss}`; // YYYYMMDDHHMMSS

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
                "returnURL": `${req.protocol}://${req.get('host')}/api/payment/icici/callback`,
                "customerMobileNo": customer_details.phone || "9999999999",
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
                    return res.status(500).json({ error: 'Failed to initiate ICICI PG order' });
                }

                // Return redirectURI and tranCtx
                res.json({
                    redirectURI: data.redirectURI,
                    tranCtx: data.tranCtx,
                    order_id: baseOrderId
                });
            } catch (err) {
                console.error('Create ICICI order API error:', err);
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
            db.run("UPDATE bookings SET status = 'PAID' WHERE order_id LIKE ?", [`${baseOrderId}%`], () => {
                // Fetch booking details and send confirmation email
                db.all("SELECT * FROM bookings WHERE order_id LIKE ?", [`${baseOrderId}%`], (err, rows) => {
                    if (!err && rows && rows.length > 0) {
                        try {
                            const mailer = require('./mailer');
                            mailer.sendConfirmationEmail(rows[0]);
                            
                            if (rows[0].instructor_id) {
                                db.get("SELECT * FROM instructors WHERE id = ?", [rows[0].instructor_id], (err, inst) => {
                                    if (!err && inst && inst.email) {
                                        mailer.sendInstructorEmail(inst, rows[0]);
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Email send failed:", e);
                        }
                    }
                });
            });
            return res.redirect(`/success.html?order_id=${baseOrderId}`);
        } else {
            // Payment Failed or Cancelled
            console.error('ICICI Payment Failed:', body.respDescription);
            db.run("UPDATE bookings SET status = 'FAILED' WHERE order_id LIKE ?", [`${baseOrderId}%`]);
            return res.redirect('/checkout.html?error=Payment Failed or Cancelled');
        }
    } catch (err) {
        console.error('ICICI Callback Processing Error:', err);
        return res.redirect('/checkout.html?error=Error processing payment callback');
    }
});

// ==========================================
// CASHFREE PAYMENT ROUTES
// ==========================================

// ---- POST /create-order ----
app.post('/create-order', async (req, res) => {
    try {
        const { amount, customer_details, order_meta, booking_data } = req.body;
        const items = Array.isArray(booking_data) ? booking_data : [booking_data];

        // Pre-flight concurrency check
        const checkAvailability = () => {
            return new Promise((resolve, reject) => {
                if (!items || items.length === 0) return resolve(false);
                let checkCount = 0;
                let hasConflict = false;
                items.forEach(item => {
                    let query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND item_name = ?";
                    let params = [item.date, item.time, item.item_name];
                    if (item.instructor_id) {
                        query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND (item_name = ? OR instructor_id = ?)";
                        params = [item.date, item.time, item.item_name, item.instructor_id];
                    }
                    
                    db.get(query, params, (err, row) => {
                        if (err) return reject(err);
                        if (row.count > 0) hasConflict = true;
                        checkCount++;
                        if (checkCount === items.length) resolve(hasConflict);
                    });
                });
            });
        };

        const hasConflict = await checkAvailability();
        if (hasConflict) {
            return res.status(409).json({ error: 'Sorry, one or more of your selected slots was just booked by someone else! Please select different slots.' });
        }

        
        const orderAmount = parseFloat(amount).toFixed(2);
        const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const baseOrderId = `HV_${shortCode}`;

        let insertedCount = 0;
        
        const totalBaseCost = items.reduce((sum, i) => sum + (Number(i.base_price) || 0) + (Number(i.instructor_fee) || 0), 0);

        items.forEach((item, index) => {
            const rowOrderId = items.length > 1 ? `${baseOrderId}_${index}` : baseOrderId;
            
            let itemPrice = (parseFloat(amount) / items.length).toFixed(2);
            if (totalBaseCost > 0) {
                const itemRatio = ((Number(item.base_price) || 0) + (Number(item.instructor_fee) || 0)) / totalBaseCost;
                itemPrice = (parseFloat(amount) * itemRatio).toFixed(2);
            }
            
            // Save pending booking to DB
            db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [rowOrderId, customer_details.name, customer_details.email, customer_details.phone, item.item_name, itemPrice, item.date, item.time, 'PENDING', item.instructor_id || null], 
                function(err) {
                    if (err) console.error("DB Insert Error:", err);
                    insertedCount++;
                    
                    if (insertedCount === items.length) {
                        createCashfreeOrder();
                    }
            });
        });

        async function createCashfreeOrder() {
            // Create Cashfree Order
            const payload = {
                order_amount: orderAmount,
                order_currency: "INR",
                order_id: baseOrderId,
                customer_details: {
                    customer_id: `cust_${Date.now()}`,
                    customer_phone: customer_details.phone,
                    customer_name: customer_details.name,
                    customer_email: customer_details.email
                },
                order_meta: {
                    return_url: order_meta.return_url + `?order_id=${baseOrderId}`
                }
            };

            try {
                const response = await fetch(`${getCashfreeBaseUrl()}/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-version': '2023-08-01',
                        'x-client-id': CASHFREE_APP_ID,
                        'x-client-secret': CASHFREE_SECRET_KEY
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error('Cashfree order error response:', data);
                    return res.status(500).json({ error: data.message || 'Failed to create order' });
                }

                res.json({ 
                    order_id: data.order_id, 
                    payment_session_id: data.payment_session_id 
                });
            } catch (err) {
                console.error('Create Cashfree order API error:', err);
                res.status(500).json({ error: 'Failed to communicate with Cashfree' });
            }
        }

    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to create Cashfree order' });
    }
});

// ---- POST /verify-payment ----
app.post('/verify-payment', (req, res) => {
    const { order_id } = req.body;

    // First check the database. For ICICI, the callback updates the DB before redirecting here.
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
// Auto-delete pending bookings older than 15 minutes
setInterval(() => {
    const isProd = process.env.NODE_ENV === 'production';
    const query = isProd 
        ? `DELETE FROM bookings WHERE status = 'PENDING' AND created_at <= NOW() - INTERVAL '15 minutes'`
        : `DELETE FROM bookings WHERE status = 'PENDING' AND datetime(created_at) <= datetime('now', '-15 minutes')`;
        
    db.run(query, function(err) {
        if (err) console.error("Cleanup Job Error:", err);
        else if (this.changes > 0) {
            console.log(`[${new Date().toISOString()}] Cleanup: Auto-deleted ${this.changes} expired pending booking(s)`);
        }
    });
}, 5 * 60 * 1000); // Run every 5 minutes

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
                items.forEach(item => {
                    let query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND item_name = ?";
                    let params = [item.date, item.time, item.item_name];
                    if (item.instructor_id) {
                        query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND booking_time = ? AND status IN ('PENDING', 'SUCCESS', 'PAID', 'CASH') AND (item_name = ? OR instructor_id = ?)";
                        params = [item.date, item.time, item.item_name, item.instructor_id];
                    }
                    
                    db.get(query, params, (err, row) => {
                        if (err) return reject(err);
                        if (row.count > 0) hasConflict = true;
                        checkCount++;
                        if (checkCount === items.length) resolve(hasConflict);
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
            
            db.run(`INSERT INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status, instructor_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [rowOrderId, customer_details.name, customer_details.email, customer_details.phone, item.item_name, itemPrice, item.date, item.time, 'PENDING', item.instructor_id || null], 
                function(err) {
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
                    res.status(400).json({ error: response?.errormessage || 'Failed to initiate UPI payment' });
                }
            } catch (err) {
                console.error('UPI Collect API error:', err);
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
                        if (rows[0].email) {
                            sendConfirmationEmail(rows[0]);
                        }
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
    console.log(`\n Havoc Sim Podium backend running at http://localhost:${PORT}`);
    console.log(` Cashfree App ID: ${CASHFREE_APP_ID ? 'Configured' : 'NOT SET — check .env'}`);
    console.log(` Environment: ${ENVIRONMENT}\n`);
});
