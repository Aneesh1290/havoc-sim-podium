const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'havoc.db');
const db = new sqlite3.Database(dbPath);

const dummyBookings = [
    {
        order_id: 'PAYDUE_5SEP26_03',
        name: 'Philip George',
        email: 'philip.george999@gmail.com',
        phone: '9207570828',
        item_name: 'Flight Sim Pro (Airbus Edition) - 30 Minutes',
        price: 1770,
        booking_date: '2026-09-05',
        booking_time: '19:00',
        status: 'CASH'
    },
    {
        order_id: 'PAYDUE_5SEP26_02',
        name: 'Sonith Shiva',
        email: 'sonithkoli@gmail.com',
        phone: '8792426877',
        item_name: 'Race Sim Jr. - 30 Minutes',
        price: 472,
        booking_date: '2026-09-05',
        booking_time: '17:00',
        status: 'CASH'
    },
    {
        order_id: 'PAYDUE_5SEP26_01',
        name: 'Sonith Shiva',
        email: 'sonithkoli@gmail.com',
        phone: '8792426877',
        item_name: 'Race Sim GT - 30 Minutes',
        price: 590,
        booking_date: '2026-09-05',
        booking_time: '17:00',
        status: 'CASH'
    },
    {
        order_id: 'PAYDUE_25SEP26_01',
        name: 'Parimala Rao',
        email: 'pari.g2006@gmail.com',
        phone: '8884930685',
        item_name: 'Race Sim GT - 30 Minutes',
        price: 590,
        booking_date: '2026-09-25',
        booking_time: '19:30',
        status: 'PENDING'
    }
];

db.serialize(() => {
    // Clear existing bookings for a clean slate
    db.run("DELETE FROM bookings");

    const stmt = db.prepare(`INSERT OR IGNORE INTO bookings (order_id, name, email, phone, item_name, price, booking_date, booking_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    dummyBookings.forEach(b => {
        stmt.run([b.order_id, b.name, b.email, b.phone, b.item_name, b.price, b.booking_date, b.booking_time, b.status]);
    });
    
    stmt.finalize();
    console.log("Database seeded with exact user data!");
});

db.close();
