const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database/database.js');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Setup Multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Serves uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper to generate UIDs
const generateId = (prefix) => `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

/* ================== AUTH API ================== */
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT id, role, fullName, balanceCoins FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: "Invalid credentials" });
        res.json({ user: row });
    });
});

app.post('/api/auth/register', upload.fields([{ name: 'idCardPhoto', maxCount: 1 }, { name: 'selfiePhoto', maxCount: 1 }]), (req, res) => {
    const { fullName, email, password, phone, kecamatan, kelurahan, birthDate, gender } = req.body;

    // Check if files exist
    const idCardPhoto = req.files && req.files['idCardPhoto'] ? '/uploads/' + req.files['idCardPhoto'][0].filename : null;
    const selfiePhoto = req.files && req.files['selfiePhoto'] ? '/uploads/' + req.files['selfiePhoto'][0].filename : null;

    const id = generateId('user');

    db.run(`INSERT INTO users (id, fullName, email, password, phone, kecamatan, kelurahan, birthDate, gender, isVerified, idCardPhoto, selfiePhoto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [id, fullName, email, password, phone, kecamatan, kelurahan, birthDate, gender, idCardPhoto, selfiePhoto],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, role: 'user', fullName, balanceCoins: 0, kecamatan, kelurahan, birthDate, gender, isVerified: 0 });
        }
    );
});

app.post('/api/auth/reset', (req, res) => {
    const { email, newPassword } = req.body;
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Email tidak terdaftar" });

        db.run("UPDATE users SET password = ? WHERE email = ?", [newPassword, email], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Password berhasil diubah" });
        });
    });
});

app.post('/api/contact', (req, res) => {
    const { email, whatsapp, message } = req.body;
    const id = generateId('msg');
    db.run(`INSERT INTO contacts (id, email, whatsapp, message) VALUES (?, ?, ?, ?)`,
        [id, email, whatsapp, message],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, messageId: id });
        }
    );
});


/* ================== USER API ================== */
app.get('/api/profile/:id', (req, res) => {
    db.get("SELECT id, fullName, email, phone, balanceCoins, createdAt, kecamatan, kelurahan, alamatFavorit, birthDate, gender, isVerified, idCardPhoto, selfiePhoto FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.put('/api/user/address/:id', (req, res) => {
    const { alamatFavorit } = req.body;
    db.run("UPDATE users SET alamatFavorit = ? WHERE id = ?", [alamatFavorit, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Alamat favorit berhasil disimpan" });
    });
});

// Submit waste
app.post('/api/user/waste', upload.array('photos', 10), (req, res) => {
    const { userId, jenis, beratKg, lokasi, coinsEarned } = req.body;
    const id = generateId('waste');
    const photos = req.files ? req.files.map(f => `/uploads/${f.filename}`).join(',') : '';

    db.run(`INSERT INTO wastes (id, userId, jenis, beratKg, lokasi, coinsEarned, photos) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, jenis, beratKg, lokasi, coinsEarned, photos],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, wasteId: id });
        }
    );
});

// Get user wastes
app.get('/api/user/waste/:userId', (req, res) => {
    db.all("SELECT * FROM wastes WHERE userId = ? ORDER BY createdAt DESC", [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Submit cashout
app.post('/api/user/cashout', (req, res) => {
    const { userId, method, provider, accountNumber, accountName, amountRupiah, coinsUsed } = req.body;
    const id = generateId('cashout');

    db.run(`INSERT INTO cashouts (id, userId, method, provider, accountNumber, accountName, amountRupiah, coinsUsed) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, method, provider, accountNumber, accountName, amountRupiah, coinsUsed],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            // Deduct coins from user balance
            db.run("UPDATE users SET balanceCoins = balanceCoins - ? WHERE id = ?", [coinsUsed, userId]);
            res.json({ success: true, cashoutId: id });
        }
    );
});

// Get user cashouts
app.get('/api/user/cashout/:userId', (req, res) => {
    db.all("SELECT * FROM cashouts WHERE userId = ? ORDER BY createdAt DESC", [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/* ================== ADMIN API ================== */
app.get('/api/admin/users/pending', (req, res) => {
    db.all(`SELECT id, fullName, email, phone, kecamatan, kelurahan, birthDate, gender, createdAt, idCardPhoto, selfiePhoto FROM users WHERE isVerified = 0 AND role = 'user' ORDER BY createdAt ASC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/admin/users/:id/verify', (req, res) => {
    db.run(`UPDATE users SET isVerified = 1 WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Pengguna berhasil diverifikasi" });
    });
});

app.get('/api/admin/contacts', (req, res) => {
    db.all(`SELECT * FROM contacts ORDER BY createdAt DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/admin/waste', (req, res) => {
    db.all(`SELECT w.*, u.fullName FROM wastes w JOIN users u ON w.userId = u.id ORDER BY w.createdAt DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/admin/waste/:id/verify', (req, res) => {
    const { beratActual, coinsEarned, userId } = req.body;
    const wasteId = req.params.id;

    db.serialize(() => {
        db.run(`UPDATE wastes SET beratActual = ?, status = 'Selesai', coinsEarned = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [beratActual, coinsEarned, wasteId]);
        db.run(`UPDATE users SET balanceCoins = balanceCoins + ? WHERE id = ?`,
            [coinsEarned, userId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    });
});

app.get('/api/admin/cashout', (req, res) => {
    db.all(`SELECT c.*, u.fullName, u.kecamatan FROM cashouts c JOIN users u ON c.userId = u.id ORDER BY c.createdAt DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/admin/cashout/:id/proof', upload.single('proofImage'), (req, res) => {
    const cashoutId = req.params.id;
    const proofImage = req.file ? `/uploads/${req.file.filename}` : '';

    db.run(`UPDATE cashouts SET status = 'Berhasil', proofImage = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [proofImage, cashoutId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.get('/api/admin/stats', (req, res) => {
    // Aggregate stats: waste history, cashout history, total users
    db.serialize(() => {
        let stats = {};
        db.get("SELECT count(*) as total FROM users WHERE role = 'user'", (err, row) => {
            stats.totalUsers = row ? row.total : 0;
        });

        db.all("SELECT w.userId, w.beratActual, w.beratKg, w.coinsEarned, w.status, w.jenis, w.createdAt, w.updatedAt, u.fullName FROM wastes w JOIN users u ON w.userId = u.id WHERE w.status = 'Selesai'", (err, wasteRows) => {
            db.all("SELECT userId, amountRupiah, status FROM cashouts WHERE status = 'Berhasil'", (err, cashoutRows) => {
                db.all("SELECT id, fullName, kecamatan FROM users WHERE role = 'user'", (err, users) => {
                    let usersDatabase = users.map(u => ({ id: u.id, name: u.fullName, totalKg: 0, totalCoin: 0, totalCashout: 0 }));

                    let pendingWaste = 0;
                    let pendingCashout = 0;
                    let sumWasteTotal = 0;

                    // Location Stats
                    let locationCounts = {
                        "Kalawat": 0,
                        "Airmadidi": 0
                    };

                    users.forEach(u => {
                        if (u.kecamatan && u.kecamatan.includes("Kalawat")) locationCounts["Kalawat"]++;
                        else if (u.kecamatan && u.kecamatan.includes("Airmadidi")) locationCounts["Airmadidi"]++;
                    });

                    // We will need to count pending as well with separate queries for exactness, or just fetch all wastes and do counting in memory since dataset is small.
                    db.all("SELECT status FROM wastes", (err, allWastes) => {
                        allWastes.forEach(w => {
                            if (w.status !== 'Selesai') pendingWaste++;
                        });

                        db.all("SELECT status, amountRupiah FROM cashouts", (err, allCashouts) => {
                            allCashouts.forEach(c => {
                                if (c.status !== 'Berhasil') pendingCashout++;
                            });

                            // Calculate sums from Selesai/Berhasil
                            wasteRows.forEach(w => {
                                const kg = w.beratActual || w.beratKg;
                                sumWasteTotal += kg;
                                const userIdx = usersDatabase.findIndex(u => u.id === w.userId);
                                if (userIdx > -1) {
                                    usersDatabase[userIdx].totalKg += kg;
                                    usersDatabase[userIdx].totalCoin += w.coinsEarned;
                                }
                            });

                            cashoutRows.forEach(c => {
                                const userIdx = usersDatabase.findIndex(u => u.id === c.userId);
                                if (userIdx > -1) {
                                    usersDatabase[userIdx].totalCashout += c.amountRupiah;
                                }
                            });

                            usersDatabase.sort((a, b) => b.totalKg - a.totalKg);

                            res.json({
                                totalUsers: stats.totalUsers,
                                locationCounts,
                                totalWasteKg: sumWasteTotal,
                                pendingWaste,
                                pendingCashout,
                                usersRanking: usersDatabase,
                                wasteRows: wasteRows // send raw data for pie chart calculation on frontend
                            });
                        });
                    });
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`EcoConnect Backend running on http://localhost:${PORT}`);
});
