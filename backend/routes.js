const express = require('express');
const auth = require('./authMiddleware');
const cloudinary = require('cloudinary').v2;
const Signature = require('./model');
const router = express.Router();
const multer = require('multer');
const { PDFDocument, rgb } = require('pdf-lib');
const fetch = require('node-fetch'); // Kita butuh ini untuk mengambil gambar dari URL

// Konfigurasi Multer untuk menangani upload file di memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Endpoint: POST /api/upload
router.post('/upload', async (req, res) => {
  console.log('Sebuah tanda tangan baru sedang diupload!'); // <--- TAMBAHKAN BARIS INI
  try {
    const { image } = req.body; // Menerima gambar dalam format Base64
    if (!image) {
        return res.status(400).json({ msg: 'Tidak ada gambar yang dikirim' });
    }

    // Upload ke Cloudinary
    const uploadedResponse = await cloudinary.uploader.upload(image, {
      folder: 'tanda_tangan', // Opsional: nama folder di Cloudinary
      format: 'png'
    });

    // Simpan URL ke MongoDB
    const newSignature = new Signature({
        user: req.user.id, // <-- Kaitkan dengan ID user yang login
        imageUrl: uploadedResponse.secure_url,
        publicId: uploadedResponse.public_id,
    });
    await newSignature.save();

    res.status(201).json({ 
        msg: 'Tanda tangan berhasil diunggah!', 
        url: uploadedResponse.secure_url 
    });

  } catch (error) {
    console.error('Error saat upload:', error);
    res.status(500).json({ msg: 'Terjadi kesalahan di server' });
  }
});

// Endpoint: GET /api/signatures (untuk mengambil semua data tanda tangan)
router.get('/signatures', async (req, res) => {
  try {
        // Cari tanda tangan yang HANYA milik user yang sedang login
        const signatures = await Signature.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(signatures);
    } catch (error) {
    console.error('Error saat mengambil data:', error);
    res.status(500).json({ msg: 'Terjadi kesalahan di server' });
  }
});

// Endpoint: POST /api/embed (untuk menempelkan gambar ke PDF)
router.post('/embed', upload.single('pdfFile'), async (req, res) => {
  try {
    // 1. Ambil semua data yang dikirim dari frontend
    const { imageUrl, x, y, width, height, pageIndex } = req.body;
    const pdfBytes = req.file.buffer; // File PDF dalam bentuk buffer dari multer

    // 2. Muat dokumen PDF menggunakan pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // 3. Ambil gambar tanda tangan dari URL Cloudinary
    const signatureImageBytes = await fetch(imageUrl).then(res => res.arrayBuffer());

    // 4. Tempelkan gambar ke dalam dokumen PDF
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

    // 5. Pilih halaman PDF yang akan ditempeli (berdasarkan nomor halaman)
    const pages = pdfDoc.getPages();
    const targetPage = pages[parseInt(pageIndex, 10)];

    // 6. Gambar tanda tangan di atas halaman PDF pada koordinat yang ditentukan
    targetPage.drawImage(signatureImage, {
      x: parseFloat(x),
      y: parseFloat(y),
      width: parseFloat(width),
      height: parseFloat(height),
    });

    // 7. Simpan PDF yang sudah dimodifikasi menjadi byte array baru
    const pdfBytesModified = await pdfDoc.save();

    // 8. Kirim kembali PDF baru ke pengguna
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=dokumen-bertandatangan.pdf');
    res.send(Buffer.from(pdfBytesModified));

  } catch (error) {
    console.error('Error saat menempelkan gambar ke PDF:', error);
    res.status(500).json({ msg: 'Gagal memproses PDF' });
  }
});

// Endpoint: DELETE /api/signatures/:id (untuk menghapus tanda tangan)
router.delete('/signatures/:id', async (req, res) => {
  try {
        const signature = await Signature.findOne({ _id: req.params.id, user: req.user.id });
        if (!signature) {
            return res.status(404).json({ msg: 'Tanda tangan tidak ditemukan atau bukan milik Anda' });
        }
    } catch (error) {
    console.error('Error saat menghapus tanda tangan:', error);
    res.status(500).json({ msg: 'Terjadi kesalahan di server' });
  }
});

module.exports = router;