require('dotenv').config(); // โหลดค่าจาก .env
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// ==========================================
// 1. ตั้งค่า CORS (ความปลอดภัย)
// ==========================================
const allowedOrigins = [
    'http://localhost:5500', 
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://vn-creator-project-frontend.vercel.app' // <-- เปลี่ยนเป็น URL Vercel ของคุณจริงๆ (ห้ามมี / ปิดท้าย)
];

app.use(cors({
    origin: function (origin, callback) {
        // อนุญาตถ้าไม่มี origin (เช่น Postman) หรือ origin อยู่ในรายการ
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

// ==========================================
// 2. ตั้งค่า Cloudinary (ระบบอัปโหลดรูป)
// ==========================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'vn_creator_uploads', // ชื่อโฟลเดอร์ใน Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    },
});

const upload = multer({ storage: storage });

// Route สำหรับอัปโหลดรูปภาพ (พร้อมระบบดักจับ Error)
app.post('/api/upload', (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err) {
            console.error("❌ Cloudinary Upload Error:", err);
            return res.status(500).json({ error: "อัปโหลดรูปล้มเหลว: " + err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'ไม่มีไฟล์อัปโหลด' });
        }
        // Cloudinary จะคืนค่า URL แบบเต็มมาให้ใน req.file.path
        res.json({ url: req.file.path }); 
    });
});

// ==========================================
// 3. Routes อื่นๆ
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/novels', require('./routes/novel'));
app.use('/api/users', require('./routes/user'));

// ==========================================
// 4. เริ่มต้น Server
// ==========================================
// ใช้ process.env.PORT สำหรับ Render (ถ้าไม่มีให้ใช้ 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));