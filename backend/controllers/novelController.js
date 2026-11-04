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
        const { rows } = await db.query('SELECT id, title, cover_image, cover_emoji FROM novels ORDER BY RANDOM() LIMIT 6');
        res.json(rows);
    } catch (err) { 
        console.error("Feed Query Error:", err); 
        res.status(500).json({ error: err.message }); 
    }
};

// 3. ดึงข้อมูลสำหรับหน้าเล่น (ดึงหน้า, ตัวละคร, บทพูด, ตัวเลือก, และ Story Line)
exports.getNovelForPlay = async (req, res) => {
    try {
        const novelId = req.params.id;
        
        // ตรวจสอบว่ามีนิยายเรื่องนี้อยู่จริงไหม
        const { rows: novelCheck } = await db.query('SELECT id, author_id, tags FROM novels WHERE id = $1', [novelId]);
        if (novelCheck.length === 0) {
            return res.status(404).json({ error: "ไม่พบนิยายเรื่องนี้" });
        }
        
        await db.query('UPDATE novels SET views = views + 1 WHERE id = $1', [novelId]); 
        
        // ดึงข้อมูล Chapters (เพื่อดู next_chapter_name)
        const { rows: chapters } = await db.query('SELECT id, title, next_chapter_name FROM chapters WHERE novel_id = $1 ORDER BY order_index ASC', [novelId]);
        
        // ดึงข้อมูล Pages และ Objects
        const { rows: pages } = await db.query(`
            SELECT p.id, p.background_image, p.storyline_x, p.storyline_y, 
                   COALESCE(json_agg(
                       json_build_object(
                           'id', o.id,
                           'type', o.type, 
                           'image', o.image_url, 
                           'text', o.text_content, 
                           'x', o.x_pos, 
                           'y', o.y_pos, 
                           'order', o.dialogue_order,
                           'target_page_id', o.target_page_id
                       )
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
            chapters, // ส่ง chapters ไปด้วยเพื่อให้รู้ว่าบทไหนจบแล้วไปบทไหนต่อ
            author_id: novelCheck[0].author_id,
            tags: novelCheck[0].tags 
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. บันทึก/อัปเดตนิยาย (พร้อม Story Line, Choices, และ Golden Arrow)
exports.saveNovel = async (req, res) => {
    // รับค่า next_chapter_name มาด้วย
    const { title, author_id, pages, novel_id, cover_image, tags, next_chapter_name } = req.body; 
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        let novelId = novel_id;

        if (novel_id) {
            await client.query(
                'UPDATE novels SET title = $1, cover_image = $2, tags = $3 WHERE id = $4', 
                [title, cover_image || null, tags || null, novelId]
            );
            // ลบ chapter เก่าทิ้งก่อนเขียนใหม่ (Cascade ลบ pages/objects ต่อ)
            await client.query('DELETE FROM chapters WHERE novel_id = $1', [novelId]);
        } else {
            const novelRes = await client.query(
                'INSERT INTO novels (author_id, title, cover_emoji, cover_image, tags) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
                [author_id, title, '📖', cover_image || null, tags || null]
            );
            novelId = novelRes.rows[0].id;
        }
        
        // สร้าง Chapter (บันทึก next_chapter_name สำหรับลูกศรสีทอง)
        const chapRes = await client.query(
            'INSERT INTO chapters (novel_id, title, order_index, next_chapter_name) VALUES ($1, $2, $3, $4) RETURNING id', 
            [novelId, 'ตอนที่ 1', 1, next_chapter_name || null]
        );
        const chapterId = chapRes.rows[0].id;

        // วนลูปบันทึกหน้า และ Object
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            
            // [อัปเดต] บันทึก storyline_x และ storyline_y
            const pageRes = await client.query(
                'INSERT INTO pages (chapter_id, background_image, order_index, storyline_x, storyline_y) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
                [chapterId, page.bg || null, i + 1, page.storyline_x || 100, page.storyline_y || 100]
            );
            const pageId = pageRes.rows[0].id;

            for (let obj of page.objects) {
                // [อัปเดต] บันทึก target_page_id (สำหรับ Choice)
                await client.query(
                    'INSERT INTO objects (page_id, type, image_url, text_content, x_pos, y_pos, z_index, dialogue_order, target_page_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                    [pageId, obj.type, obj.image || null, obj.text || null, obj.x, obj.y, obj.type === 'dialogue' ? 100 : 10, obj.order || 1, obj.target_page_id || null]
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

// ==========================================
// 7. [เพิ่มใหม่] ระบบคอมเมนต์ (Comments)
// ==========================================

// ดึงคอมเมนต์ของนิยายเรื่องนั้นๆ
exports.getComments = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT c.id, c.content, c.created_at, u.username, u.profile_pic 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.novel_id = $1 
            ORDER BY c.created_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// เพิ่มคอมเมนต์ใหม่
exports.addComment = async (req, res) => {
    const { user_id, content } = req.body;
    if (!user_id) return res.status(400).json({ error: "กรุณาเข้าสู่ระบบก่อนคอมเมนต์" });
    if (!content || content.trim() === "") return res.status(400).json({ error: "กรุณาพิมพ์ข้อความ" });

    try {
        await db.query('INSERT INTO comments (user_id, novel_id, content) VALUES ($1, $2, $3)', 
            [user_id, req.params.id, content]);
        res.json({ message: "คอมเมนต์สำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};