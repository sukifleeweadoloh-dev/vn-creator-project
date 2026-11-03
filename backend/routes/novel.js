const router = require('express').Router();
const ctrl = require('../controllers/novelController');

// ==========================================
// Routes สำหรับนิยาย
// ==========================================

router.get('/popular', ctrl.getPopular);                  // ดึงนิยายยอดนิยม
router.get('/feed', ctrl.getFeedNovels);                  // [เพิ่มใหม่] ดึงนิยายแบบสุ่มสำหรับหน้าแรก
router.get('/play/:id', ctrl.getNovelForPlay);            // ดึงข้อมูลสำหรับหน้าเล่น
router.post('/save', ctrl.saveNovel);                     // บันทึก/อัปเดตนิยาย
router.post('/:id/review', ctrl.addReview);               // ให้คะแนน/รีวิว
router.get('/search', ctrl.searchNovels);                 // ค้นหานิยาย

module.exports = router;