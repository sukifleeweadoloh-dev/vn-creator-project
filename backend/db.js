require('dotenv').config();
const { Pool } = require('pg');

// ใช้ connectionString แทนการแยกฟิลด์ เพื่อรองรับ Neon Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // จำเป็นสำหรับ Neon และ Cloud Database ทั่วไป
    }
});

module.exports = pool;