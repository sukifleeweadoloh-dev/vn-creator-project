const db = require('../db');

// 1. ดึงนิยายยอดนิยม
exports.getPopular = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT n.*, u.username FROM novels n JOIN users u ON n.author_id = u.id ORDER BY n.views DESC LIMIT 10');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. ดึงนิยายแบบสุ่มสำหรับหน้า Feed
exports.getFeedNovels = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, title, cover_image, cover_emoji FROM novels ORDER BY RANDOM() LIMIT 6');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. ดึงข้อมูลสำหรับหน้าเล่น
exports.getNovelForPlay = async (req, res) => {
    try {
        const novelId = req.params.id;
        const userId = req.query.userId; 
        
        const { rows: novelCheck } = await db.query('SELECT id, author_id, tags FROM novels WHERE id = $1', [novelId]);
        if (novelCheck.length === 0) return res.status(404).json({ error: "ไม่พบนิยายเรื่องนี้" });
        
        await db.query('UPDATE novels SET views = views + 1 WHERE id = $1', [novelId]); 
        
        const { rows: chapters } = await db.query('SELECT id, title, next_chapter_name FROM chapters WHERE novel_id = $1 ORDER BY order_index ASC', [novelId]);
        
        const { rows: pages } = await db.query(`
            SELECT p.id, p.background_image, p.storyline_x, p.storyline_y,
                   COALESCE(json_agg(
                       json_build_object(
                           'id', o.id, 'type', o.type, 'image', o.image_url, 
                           'text', o.text_content, 'x', o.x_pos, 'y', o.y_pos, 
                           'order', o.dialogue_order, 'target_page_id', o.target_page_id
                       )
                   ) FILTER (WHERE o.id IS NOT NULL), '[]'::json) as objects
            FROM pages p
            JOIN chapters c ON p.chapter_id = c.id
            LEFT JOIN objects o ON p.id = o.page_id
            WHERE c.novel_id = $1
            GROUP BY p.id
            ORDER BY p.order_index ASC
        `, [novelId]);

        let readingProgress = [];
        if (userId) {
            const { rows: progress } = await db.query(
                'SELECT page_id FROM reading_progress WHERE user_id = $1 AND novel_id = $2', 
                [userId, novelId]
            );
            readingProgress = progress.map(p => p.page_id);
        }

        res.json({ 
            pages,
            chapters, 
            author_id: novelCheck[0].author_id,
            tags: novelCheck[0].tags,
            readingProgress
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. ดึงข้อมูลเฉพาะสำหรับวาดหน้า Story Line
exports.getStorylineData = async (req, res) => {
    try {
        const novelId = req.params.id;
        const { rows: pages } = await db.query(`
            SELECT p.id, p.order_index, p.storyline_x, p.storyline_y,
                   (SELECT json_agg(json_build_object('id', o.id, 'text', o.text_content, 'target_page_id', o.target_page_id))
                    FROM objects o WHERE o.page_id = p.id AND o.type = 'choice') as choices
            FROM pages p
            JOIN chapters c ON p.chapter_id = c.id
            WHERE c.novel_id = $1
            ORDER BY p.order_index ASC
        `, [novelId]);

        const { rows: chapters } = await db.query('SELECT title, next_chapter_name FROM chapters WHERE novel_id = $1', [novelId]);

        res.json({ pages, chapters });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. บันทึก/อัปเดตนิยาย (บันทึก Choices ให้ถูกต้อง)
exports.saveNovel = async (req, res) => {
    const { title, author_id, pages, novel_id, cover_image, tags } = req.body; 
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        let novelId = novel_id;

        if (novel_id) {
            await client.query('UPDATE novels SET title = $1, cover_image = $2, tags = $3 WHERE id = $4', [title, cover_image || null, tags || null, novelId]);
            await client.query('DELETE FROM chapters WHERE novel_id = $1', [novelId]);
        } else {
            const novelRes = await client.query('INSERT INTO novels (author_id, title, cover_emoji, cover_image, tags) VALUES ($1, $2, $3, $4, $5) RETURNING id', [author_id, title, '📖', cover_image || null, tags || null]);
            novelId = novelRes.rows[0].id;
        }
        
        const chapRes = await client.query('INSERT INTO chapters (novel_id, title, order_index) VALUES ($1, $2, $3) RETURNING id', [novelId, 'ตอนที่ 1', 1]);
        const chapterId = chapRes.rows[0].id;

        const pageIdMap = {}; 

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pageRes = await client.query(
                'INSERT INTO pages (chapter_id, background_image, order_index, storyline_x, storyline_y) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
                [chapterId, page.bg || null, i + 1, page.storyline_x || 100, page.storyline_y || 100]
            );
            const realPageId = pageRes.rows[0].id;
            
            pageIdMap[page.tempId || page.id] = realPageId; 
            page.realId = realPageId; 
        }

        for (let page of pages) {
            for (let obj of page.objects) {
                let textContent = obj.text || null;
                
                if (obj.type === 'choice') {
                    const mappedOptions = (obj.options || []).map(opt => ({
                        label: opt.label,
                        text: opt.text,
                        target_page_id: pageIdMap[opt.target_temp_id] || null
                    }));
                    textContent = JSON.stringify(mappedOptions);
                }

                await client.query(
                    'INSERT INTO objects (page_id, type, image_url, text_content, x_pos, y_pos, z_index, dialogue_order, target_page_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                    [page.realId, obj.type, obj.image || null, textContent, obj.x, obj.y, obj.type === 'dialogue' ? 100 : 10, obj.order || 1, null]
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

// 6. บันทึกประวัติการอ่าน
exports.saveReadingProgress = async (req, res) => {
    const { userId, pageId, novelId } = req.body;
    if (!userId || !pageId || !novelId) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });

    try {
        await db.query(
            'INSERT INTO reading_progress (user_id, novel_id, page_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, page_id) DO NOTHING',
            [userId, novelId, pageId]
        );
        res.json({ message: "บันทึกประวัติการอ่านสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 7. รีวิวและค้นหา
exports.addReview = async (req, res) => {
    const { rating, comment, user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "กรุณาเข้าสู่ระบบก่อนให้คะแนน" });
    try {
        await db.query('INSERT INTO reviews (user_id, novel_id, rating, comment) VALUES ($1, $2, $3, $4)', [user_id, req.params.id, rating, comment || ""]);
        res.json({ message: "รีวิวสำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.searchNovels = async (req, res) => {
    const { q } = req.query;
    try {
        const { rows } = await db.query("SELECT * FROM novels WHERE title ILIKE $1 OR description ILIKE $1 OR tags ILIKE $1", [`%${q}%`]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 8. คอมเมนต์
exports.getComments = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT c.id, c.content, c.created_at, u.username, u.profile_pic 
            FROM comments c JOIN users u ON c.user_id = u.id 
            WHERE c.novel_id = $1 ORDER BY c.created_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addComment = async (req, res) => {
    const { user_id, content } = req.body;
    if (!user_id) return res.status(400).json({ error: "กรุณาเข้าสู่ระบบก่อนคอมเมนต์" });
    try {
        await db.query('INSERT INTO comments (user_id, novel_id, content) VALUES ($1, $2, $3)', [user_id, req.params.id, content]);
        res.json({ message: "คอมเมนต์สำเร็จ" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// [เพิ่มใหม่] 9. บันทึกตำแหน่งการ์ดใน Story Line
// ==========================================
exports.saveStorylinePositions = async (req, res) => {
    const { novelId, pages } = req.body; 
    // pages = [{ id: 1, x: 100, y: 200 }, ...]
    
    if (!novelId || !pages || !Array.isArray(pages)) {
        return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        for (let p of pages) {
            // อัปเดตตำแหน่ง X, Y ของแต่ละหน้า
            // ตรวจสอบด้วยว่า page_id นี้อยู่ใน novel_id ที่ถูกต้อง (เพื่อความปลอดภัย)
            await client.query(`
                UPDATE pages 
                SET storyline_x = $1, storyline_y = $2 
                WHERE id = $3 AND chapter_id IN (
                    SELECT id FROM chapters WHERE novel_id = $4
                )
            `, [p.x, p.y, p.id, novelId]);
        }
        
        await client.query('COMMIT');
        res.json({ message: "บันทึกตำแหน่งผังสำเร็จ" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Save Storyline Error:", err);
        res.status(500).json({ error: "บันทึกตำแหน่งไม่สำเร็จ" });
    } finally {
        client.release();
    }
};