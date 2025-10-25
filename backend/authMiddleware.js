const paseto = require('paseto'); // <-- PERUBAHAN 1
require('dotenv').config();
const secretKey = Buffer.from(process.env.PASETO_SECRET_KEY, 'hex');

module.exports = async function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'Akses ditolak, tidak ada token' });
    }
    try {
        // PERUBAHAN 2: Panggil decrypt melalui objek utama
        const payload = await paseto.V2.decrypt(token, secretKey);
        req.user = { id: payload.id };
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token tidak valid' });
    }
};