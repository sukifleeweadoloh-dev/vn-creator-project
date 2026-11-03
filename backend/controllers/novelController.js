const db = require('../db');

// 1. ดึงนิยายยอดนิยม (เรียงตามยอดวิว)
exports.getPopular = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT n.*, u.username FROM novels n JOIN users u ON n.author_id = u.id ORDER BY n.views DESC LIMIT 10');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. ดึงนิยายแบบสุ่มสำหรับหน้า Feed (หน้าแรก)
exports.getFeedNovels = async (req, res) => {
    try {
        // สุ่มดึงนิยายมา 6 เรื่อง
        const { rows } = await db.query('SELECT id, title, cover_image, cover_emoji FROM novels ORDER BY RANDOM() LIMIT 6');
        res.json(rows);
    } catch (err) { 
        console.error("Feed Query Error:", err); // Log ไว้ดูใน Render
        res.status(500).json({ error: err.message }); 
    }
};

// 3. ดึงข้อมูลสำหรับหน้าเล่น (ดึงหน้า, ตัวละคร, บทพูด ทั้งหมด)
exports.getNovelForPlay = async (req, res) => {
    try {
        const novelId = req.params.id;
        
        // ตรวจสอบว่ามีนิยายเรื่องนี้อยู่จริงไหม
        const { rows: novelCheck } = await db.query('SELECT id, author_id, tags FROM novels WHERE id = $1', [novelId]);
        if (novelCheck.length === 0) {
            return res.status(404).json({ error: "ไม่พบนิยายเรื่องนี้" });
        }
        
        await db.query('UPDATE novels SET views = views + 1 WHERE id = $1', [novelId]); 
        
        const { rows: pages } = await db.query(`
            SELECT p.id, p.background_image, 
                   COALESCE(json_agg(
                       json_build_object('type', o.type, 'image', o.image_url, 'text', o.text_content, 'x', o.x_pos, 'y', o.y_pos, 'order', o.dialogue_order)
                   ) FILTER (WHERE o.id IS NOT NULL), '[]'::json) as objects
            FROM pages p
            JOIN chapters c ON p.chapter_id = c.id
            LEFT JOIN objects o ON p.id = o.page_id
            WHERE c.novel_id = $1
            GROUP BY p.id
            ORDER BY p.order_index ASC
        `, [novelId]);

        res.json({ 
            pages,
            author_id: novelCheck[0].author_id,
            tags: novelCheck[0].tags 
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. บันทึก/อัปเดตนิยาย
exports.saveNovel = async (req, res) => {
    const { title, author_id, pages, novel_id, cover_image, tags } = req.body; 
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        let novelId = novel_id;

        if (novel_id) {
            await client.query(
                'UPDATE novels SET title = $1, cover_image = $2, tags = $3 WHERE id = $4', 
                [title, cover_image || null, tags || null, novelId]
            );
            await client.query('DELETE FROM chapters WHERE novel_id = $1', [novelId]);
        } else {
            const novelRes = await client.query(
                'INSERT INTO novels (author_id, title, cover_emoji, cover_image, tags) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
                [author_id, title, '📖', cover_image || null, tags || null]
            );
            novelId = novelRes.rows[0].id;
        }
        
        const chapRes = await client.query('INSERT INTO chapters (novel_id, title, order_index) VALUES ($1, $2, $3) RETURNING id', [novelId, 'ตอนที่ 1', 1]);
        const chapterId = chapRes.rows[0].id;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pageRes = await client.query('INSERT INTO pages (chapter_id, background_image, order_index) VALUES ($1, $2, $3) RETURNING id', [chapterId, page.bg || null, i + 1]);
            const pageId = pageRes.rows[0].id;

            for (let obj of page.objects) {
                await client.query(
                    'INSERT INTO objects (page_id, type, image_url, text_content, x_pos, y_pos, z_index, dialogue_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [pageId, obj.type, obj.image || null, obj.text || null, obj.x, obj.y, obj.type === 'dialogue' ? 100 : 10, obj.order || 1]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: "บันทึกสำเร็จ!", novelId });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: "บันทึกไม่สำเร็จ" });
    } finally {
        client.release();
    }
};

// 5. บันทึกการให้ดาว (Review)
exports.addReview = async (req, res) => {
    const { rating, comment, user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "กรุณาเข้าสู่ระบบก่อนให้คะแนน" });
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "คะแนนต้องอยู่ระหว่าง 1-5 ดาว" });

    try {
        await db.query('INSERT INTO reviews (user_id, novel_id, rating, comment) VALUES ($1, $2, $3, $4)', 
            [user_id, req.params.id, rating, comment || ""]);
        res.json({ message: "รีวิวสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. ค้นหานิยาย
exports.searchNovels = async (req, res) => {
    const { q } = req.query;
    try {
        const { rows } = await db.query(
            "SELECT * FROM novels WHERE title ILIKE $1 OR description ILIKE $1 OR tags ILIKE $1", 
            [`%${q}%`]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};