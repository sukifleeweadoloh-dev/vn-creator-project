const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ดึงรหัสลับจาก Environment Variable แทนการเขียนตรงๆ
const SECRET = process.env.JWT_SECRET; 

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    if (password.length < 8 || !/[a-zA-Z]/.test(password)) {
        return res.status(400).json({ error: "รหัสผ่านต้องมี 8 ตัวอักษรและมีตัวอักษรภาษาอังกฤษ" });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [username, email, hash]);
        res.json({ message: "สำเร็จ" });
    } catch (e) {
        res.status(400).json({ error: "Username หรือ Email นี้ถูกใช้งานแล้ว" });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length === 0) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "รหัสผ่านผิด" });

        // สร้าง Token โดยใช้ SECRET ที่ดึงมาจาก .env
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
        
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
};