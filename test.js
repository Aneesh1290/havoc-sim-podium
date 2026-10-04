const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('havoc.db'); 
db.serialize(() => { 
    db.run('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)'); 
    db.run("UPDATE settings SET value = ? WHERE key = 'payment_methods'", ['test'], function(err) { 
        console.log('Err:', err); 
        console.log('Changes:', this.changes); 
        if (this.changes === 0) { 
            db.run("INSERT INTO settings (key, value) VALUES ('payment_methods', ?)", ['test'], (e) => console.log('Insert err:', e)); 
        } 
    }); 
});
