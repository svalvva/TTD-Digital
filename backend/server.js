const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db');
const signatureRoutes = require('./routes');
const authRoutes = require('./authRoutes');

const app = express();

// Koneksi ke Database
connectDB();

// Middleware
app.use(cors()); // Mengizinkan akses dari domain lain
app.use(express.json({ limit: '10mb' })); // Mengizinkan server menerima data JSON (dengan limit besar untuk gambar)

// Definisi Routes
app.use('/api', signatureRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));