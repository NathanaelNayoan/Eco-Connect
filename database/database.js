const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the bundled database (read-only in Vercel)
const staticDbPath = path.join(process.cwd(), 'database', 'database.sqlite');
// Path to the writable database in Vercel
const writableDbPath = '/tmp/database.sqlite';

console.log(`[DB] Bundle path: ${staticDbPath}`);
console.log(`[DB] Writable path: ${writableDbPath}`);

// Copy static db to writable /tmp if it doesn't exist
if (!fs.existsSync(writableDbPath)) {
    try {
        if (fs.existsSync(staticDbPath)) {
            fs.copyFileSync(staticDbPath, writableDbPath);
            console.log(`[DB] Copied bundled database to /tmp`);
        } else {
            console.warn(`[DB] Bundled database not found, creating new one in /tmp`);
        }
    } catch (err) {
        console.error(`[DB] Failed to copy database to /tmp: ${err.message}`);
    }
} else {
    console.log(`[DB] Using existing database in /tmp`);
}

const db = new sqlite3.Database(writableDbPath, (err) => {
    if (err) {
        console.error(`[DB] Error opening database: ${err.message}`);
    } else {
        console.log(`[DB] Connected to database in /tmp.`);
    }
});

db.serialize(() => {
  // Create Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT DEFAULT 'user',
      fullName TEXT,
      email TEXT UNIQUE,
      password TEXT,
      phone TEXT,
      balanceCoins INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      kecamatan TEXT,
      kelurahan TEXT,
      alamatFavorit TEXT,
      birthDate TEXT,
      gender TEXT,
      isVerified INTEGER DEFAULT 0,
      idCardPhoto TEXT,
      selfiePhoto TEXT
    )
  `);

  // Create Wastes table
  db.run(`
    CREATE TABLE IF NOT EXISTS wastes (
      id TEXT PRIMARY KEY,
      userId TEXT,
      jenis TEXT,
      beratKg REAL,
      beratActual REAL,
      lokasi TEXT,
      status TEXT DEFAULT 'Menunggu',
      coinsEarned INTEGER DEFAULT 0,
      photos TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  // Create Cashouts table
  db.run(`
    CREATE TABLE IF NOT EXISTS cashouts (
      id TEXT PRIMARY KEY,
      userId TEXT,
      method TEXT,
      provider TEXT,
      accountNumber TEXT,
      accountName TEXT,
      amountRupiah INTEGER,
      coinsUsed INTEGER,
      status TEXT DEFAULT 'Diproses',
      proofImage TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  // Create Contacts table
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      email TEXT,
      whatsapp TEXT,
      message TEXT,
      status TEXT DEFAULT 'Belum Dibaca',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert a dummy Admin if not exists
  db.get("SELECT id FROM users WHERE email = ?", ['admin@ecoconnect.id'], (err, row) => {
    if (!row) {
      db.run(`
        INSERT INTO users (id, role, fullName, email, password, createdAt)
        VALUES (?, 'admin', 'Administrator', 'admin@ecoconnect.id', 'admin123', CURRENT_TIMESTAMP)
      `, ['admin_1']);
    }
  });

  // Insert a default User if not exists
  db.get("SELECT id FROM users WHERE email = ?", ['user@ecoconnect.id'], (err, row) => {
    if (!row) {
      db.run(`
          INSERT INTO users (id, role, fullName, email, password, phone, balanceCoins, createdAt)
          VALUES (?, 'user', 'Budi Santoso', 'user@ecoconnect.id', 'user123', '08123456789', 2500, CURRENT_TIMESTAMP)
        `, ['user_1']);
    }
  });
});

module.exports = db;
