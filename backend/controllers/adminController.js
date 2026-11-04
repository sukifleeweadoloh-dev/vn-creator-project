const db = require('../db');

// ==========================================
// 1. ระบบภาพรวม (Dashboard Stats)
// ==========================================
exports.getStats = async (req, res) => {
    try {
        const { rows: users } = await db.query('SELECT COUNT(*)::int FROM users');
        const { rows: novels } = await db.query('SELECT COUNT(*)::int FROM novels');
        const { rows: messages } = await db.query('SELECT COUNT(*)::int FROM messages');
        
        res.json({
            totalUsers: users[0].count,
            totalNovels: novels[0].count,
            totalMessages: messages[0].count
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 2. จัดการนิยาย (Manage Novels)
// ==========================================
exports.deleteNovel = async (req, res) => {
    try {
        // การลบ novel จะ Cascade ไปลบ chapters, pages, objects ให้อัตโนมัติ
        await db.query('DELETE FROM novels WHERE id = $1', [req.params.id]);
        res.json({ message: "ลบนิยายสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 3. จัดการผู้ใช้ (Manage Users)
// ==========================================
exports.getAllUsers = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, email, role FROM users ORDER BY id ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteUser = async (req, res) => {
    try {
        // การลบ user จะ Cascade ไปลบ novels, follows, messages ที่เกี่ยวข้อง
        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: "ลบผู้ใช้สำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.promoteUser = async (req, res) => {
    try {
        await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [req.params.id]);
        res.json({ message: "เลื่อนขั้นเป็นแอดมินสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 4. จัดการแท็ก (Manage Tags)
// ==========================================
exports.getAllTags = async (req, res) => {
    try {
        // ดึงข้อมูล tags ทั้งหมดจากตาราง novels
        const { rows } = await db.query("SELECT tags FROM novels WHERE tags IS NOT NULL AND tags != ''");
        
        // ประมวลผลการนับจำนวนแท็กใน JavaScript
        const tagCounts = {};
        rows.forEach(row => {
            // แยกข้อความด้วยเครื่องหมายจุลภาค และตัดช่องว่าง
            const tags = row.tags.split(',').map(t => t.trim().toLowerCase());
            tags.forEach(t => {
                if(t) {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                }
            });
        });

        // แปลงเป็น Array และเรียงลำดับจากที่ใช้เยอะสุด
        const result = Object.keys(tagCounts).map(tag => ({
            tag: tag,
            count: tagCounts[tag]
        })).sort((a, b) => b.count - a.count);

        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteTag = async (req, res) => {
    const tagToDelete = req.params.tag.toLowerCase();
    try {
        // ค้นหานิยายที่มี tag นี้อยู่
        const { rows } = await db.query("SELECT id, tags FROM novels WHERE tags ILIKE $1", [`%${tagToDelete}%`]);
        
        // วนลูปแก้ไข tags ของนิยายแต่ละเรื่อง (เอาแท็กที่ต้องการลบออก)
        for (let row of rows) {
            let tagsArray = row.tags.split(',').map(t => t.trim());
            // กรองแท็กที่ไม่ตรงกับที่ต้องการลบ
            tagsArray = tagsArray.filter(t => t.toLowerCase() !== tagToDelete);
            const newTags = tagsArray.join(', ');
            
            // อัปเดตกลับลง Database
            await db.query("UPDATE novels SET tags = $1 WHERE id = $2", [newTags, row.id]);
        }
        res.json({ message: "ลบแท็กออกจากทุกนิยายสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};