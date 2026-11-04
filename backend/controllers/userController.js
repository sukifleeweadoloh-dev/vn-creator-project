const db = require('../db');

// ==========================================
// 1. ระบบโปรไฟล์ (Profile)
// ==========================================
exports.getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const { rows: users } = await db.query(
            'SELECT id, username, email, profile_pic, bio FROM users WHERE id = $1', 
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: "ไม่พบผู้ใช้" });
        }

        const { rows: novels } = await db.query(
            'SELECT * FROM novels WHERE author_id = $1 ORDER BY created_at DESC', 
            [userId]
        );
        
        const { rows: followers } = await db.query(
            'SELECT COUNT(*)::int FROM follows WHERE following_id = $1', 
            [userId]
        );

        const { rows: following } = await db.query(
            'SELECT COUNT(*)::int FROM follows WHERE follower_id = $1', 
            [userId]
        );
        
        res.json({ 
            user: users[0], 
            novels, 
            followerCount: followers[0].count,
            followingCount: following[0].count
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateProfile = async (req, res) => {
    const { bio, profile_pic, id } = req.body;
    try {
        if (bio !== undefined && profile_pic !== undefined) {
            await db.query('UPDATE users SET bio = $1, profile_pic = $2 WHERE id = $3', [bio, profile_pic, id]);
        } else if (bio !== undefined) {
            await db.query('UPDATE users SET bio = $1 WHERE id = $2', [bio, id]);
        } else if (profile_pic !== undefined) {
            await db.query('UPDATE users SET profile_pic = $1 WHERE id = $2', [profile_pic, id]);
        } else {
            return res.status(400).json({ error: "ไม่มีข้อมูลที่จะอัปเดต" });
        }
        res.json({ message: "อัปเดตสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 2. ระบบติดตาม (Follow)
// ==========================================
exports.followUser = async (req, res) => {
    const { follower_id, following_id } = req.body;
    if (follower_id === following_id) {
        return res.status(400).json({ error: "คุณไม่สามารถติดตามตัวเองได้" });
    }

    try {
        const { rows: userCheck } = await db.query(
            'SELECT id FROM users WHERE id IN ($1, $2)', 
            [follower_id, following_id]
        );
        if (userCheck.length < 2) {
            return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการติดตาม" });
        }

        await db.query(
            'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', 
            [follower_id, following_id]
        );
        res.json({ message: "ติดตามสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.checkFollowStatus = async (req, res) => {
    const { followerId, followingId } = req.params;
    try {
        const { rows } = await db.query(
            'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
            [followerId, followingId]
        );
        res.json({ isFollowing: rows.length > 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getFollowing = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT u.id, u.username, u.profile_pic 
             FROM follows f JOIN users u ON f.following_id = u.id 
             WHERE f.follower_id = $1`, 
            [req.params.id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getFollowers = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT u.id, u.username, u.profile_pic 
             FROM follows f JOIN users u ON f.follower_id = u.id 
             WHERE f.following_id = $1`, 
            [req.params.id]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 3. ระบบแชท (Chat System - อัปเดตใหม่)
// ==========================================

// ส่งข้อความ
exports.sendMessage = async (req, res) => {
    const { sender_id, receiver_id, content } = req.body;
    try {
        await db.query(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)', 
            [sender_id, receiver_id, content]
        );
        res.json({ message: "ส่งแล้ว" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ดึงประวัติแชทระหว่างผู้ใช้ 2 คน (แก้ไขให้ดึงตาม ID คู่สนทนา)
exports.getMessages = async (req, res) => {
    const { userId, partnerId } = req.params; // รับ ID ของเรากับคู่สนทนา
    try {
        const { rows } = await db.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) 
                OR (sender_id = $2 AND receiver_id = $1) 
             ORDER BY created_at ASC`,
            [userId, partnerId]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// [เพิ่มใหม่] ดึงรายชื่อคู่สนทนาล่าสุด (สำหรับ Popup แชทหน้าแรก)
exports.getRecentChats = async (req, res) => {
    const userId = req.params.userId;
    try {
        // Query ที่ค่อนข้างซับซ้อน: ดึงคู่สนทนาที่ไม่ซ้ำกัน พร้อมข้อความล่าสุด และข้อมูลโปรไฟล์
        const { rows } = await db.query(`
            WITH LatestMessages AS (
                SELECT DISTINCT ON (partner_id) 
                    partner_id, 
                    content, 
                    created_at, 
                    sender_id
                FROM (
                    SELECT 
                        CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
                        content, 
                        created_at, 
                        sender_id
                    FROM messages
                    WHERE sender_id = $1 OR receiver_id = $1
                ) AS msg
                ORDER BY partner_id, created_at DESC
            )
            SELECT 
                lm.partner_id, 
                u.username, 
                u.profile_pic, 
                lm.content, 
                lm.created_at, 
                lm.sender_id
            FROM LatestMessages lm
            JOIN users u ON lm.partner_id = u.id
            ORDER BY lm.created_at DESC
        `, [userId]);
        
        res.json(rows);
    } catch (err) { 
        console.error("Get Recent Chats Error:", err);
        res.status(500).json({ error: err.message }); 
    }
};