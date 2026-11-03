const router = require('express').Router();
const ctrl = require('../controllers/novelController');

router.get('/popular', ctrl.getPopular);
router.get('/play/:id', ctrl.getNovelForPlay); // สำหรับหน้าเล่น
router.post('/save', ctrl.saveNovel);
router.post('/:id/review', ctrl.addReview);
router.get('/search', ctrl.searchNovels); // เพิ่มระบบค้นหา

module.exports = router;