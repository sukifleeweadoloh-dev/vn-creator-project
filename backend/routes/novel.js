const router = require('express').Router();
const ctrl = require('../controllers/novelController');

// ==========================================
// Routes สำหรับนิยาย
// ==========================================

router.get('/popular', ctrl.getPopular);                  // ดึงนิยายยอดนิยม
router.get('/feed', ctrl.getFeedNovels);                  // ดึงนิยายแบบสุ่มสำหรับหน้าแรก
router.get('/search', ctrl.searchNovels);                 // ค้นหานิยาย

// ==========================================
// Routes สำหรับหน้าเล่น (Play) และ Story Line
// ==========================================
router.get('/play/:id', ctrl.getNovelForPlay);            // ดึงข้อมูลสำหรับหน้าเล่น
router.get('/:id/storyline', ctrl.getStorylineData);      // [เพิ่มใหม่] ดึงข้อมูลสำหรับวาดหน้า Story Line
router.post('/save', ctrl.saveNovel);                     // บันทึก/อัปเดตนิยาย

// ==========================================
// Routes สำหรับ Interaction (Review, Comment, Progress)
// ==========================================
router.post('/:id/review', ctrl.addReview);               // ให้คะแนน/รีวิว
router.post('/progress', ctrl.saveReadingProgress);       // [เพิ่มใหม่] บันทึกประวัติการอ่าน

// คอมเมนต์
router.get('/:id/comments', ctrl.getComments);            // ดึงคอมเมนต์ของนิยาย
router.post('/:id/comments', ctrl.addComment);            // เพิ่มคอมเมนต์ใหม่

module.exports = router;