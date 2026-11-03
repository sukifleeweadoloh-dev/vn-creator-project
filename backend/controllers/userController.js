const db = require('../db');

// 1. ดึงข้อมูลโปรไฟล์
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

        // ดึงนิยายที่ผู้ใช้สร้าง
        const { rows: novels } = await db.query(
            'SELECT * FROM novels WHERE author_id = $1 ORDER BY created_at DESC', 
            [userId]
        );
        
        // นับผู้ติดตาม (คนที่ติดตามเรา)
        const { rows: followers } = await db.query(
            'SELECT COUNT(*)::int FROM follows WHERE following_id = $1', 
            [userId]
        );

        // นับคนที่เราติดตาม (Following)
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

// 2. อัปเดตโปรไฟล์ (รองรับการอัปเดตทีละฟิลด์)
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

// 3. ระบบติดตาม (Follow)
exports.followUser = async (req, res) => {
    const { follower_id, following_id } = req.body;
    
    // ป้องกันการติดตามตัวเอง
    if (follower_id === following_id) {
        return res.status(400).json({ error: "คุณไม่สามารถติดตามตัวเองได้" });
    }

    try {
        // ตรวจสอบว่าผู้ใช้ทั้งสองมีตัวตนอยู่จริง
        const { rows: userCheck } = await db.query(
            'SELECT id FROM users WHERE id IN ($1, $2)', 
            [follower_id, following_id]
        );
        if (userCheck.length < 2) {
            return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการติดตาม" });
        }

        // INSERT แบบ ON CONFLICT DO NOTHING (ถ้าติดตามอยู่แล้วจะไม่ Error)
        await db.query(
            'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', 
            [follower_id, following_id]
        );
        res.json({ message: "ติดตามสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. [เพิ่มใหม่] เช็คสถานะการติดตาม
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

// 5. ดึงรายชื่อที่เราติดตาม (Following)
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

// 6. [เพิ่มใหม่] ดึงรายชื่อผู้ติดตามเรา (Followers)
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

// 7. ส่งข้อความแชท
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

// 8. ดึงประวัติแชท
exports.getMessages = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC',
            [req.params.userId, 1] // 1 = Admin ID
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};