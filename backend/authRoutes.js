const express = require('express');
const bcrypt = require('bcryptjs');
const paseto = require('paseto'); // <-- PERUBAHAN 1: Impor seluruh library
const User = require('./userModel');
const router = express.Router();

require('dotenv').config();
const secretKey = Buffer.from(process.env.PASETO_SECRET_KEY, 'hex');

// --- Endpoint Registrasi (Tidak berubah) ---
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Email sudah terdaftar' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({ email, password: hashedPassword });
        await user.save();
        res.status(201).json({ msg: 'Registrasi berhasil!' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// --- Endpoint Login ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }
        const payload = { id: user.id, email: user.email };
        
        // PERUBAHAN 2: Panggil fungsi melalui objek utama
        const token = await paseto.V2.encrypt(payload, secretKey, {
            expiresIn: '7d'
        });
        
        res.json({ token });
    } catch (error) {
        console.error("ERROR DI LOGIN ROUTE:", error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;