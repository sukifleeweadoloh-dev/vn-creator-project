const router = require('express').Router();
const ctrl = require('../controllers/novelController');

// ==========================================
// Routes สำหรับนิยาย
// ==========================================

router.get('/popular', ctrl.getPopular);                  // ดึงนิยายยอดนิยม
router.get('/feed', ctrl.getFeedNovels);                  // ดึงนิยายแบบสุ่มสำหรับหน้าแรก
router.get('/play/:id', ctrl.getNovelForPlay);            // ดึงข้อมูลสำหรับหน้าเล่น (รวม Storyline)
router.post('/save', ctrl.saveNovel);                     // บันทึก/อัปเดตนิยาย (รวม Storyline)
router.post('/:id/review', ctrl.addReview);               // ให้คะแนน/รีวิว
router.get('/search', ctrl.searchNovels);                 // ค้นหานิยาย

// ==========================================
// [เพิ่มใหม่] Routes สำหรับคอมเมนต์ (Comments)
// ==========================================
router.get('/:id/comments', ctrl.getComments);            // ดึงคอมเมนต์ของนิยายเรื่องนั้นๆ
router.post('/:id/comments', ctrl.addComment);            // เพิ่มคอมเมนต์ใหม่

module.exports = router;