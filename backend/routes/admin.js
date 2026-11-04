const router = require('express').Router();
const ctrl = require('../controllers/adminController');

// ==========================================
// Routes สำหรับ Admin Dashboard
// ==========================================

// 1. ภาพรวมระบบ
router.get('/stats', ctrl.getStats);

// 2. จัดการนิยาย
router.delete('/novels/:id', ctrl.deleteNovel);

// 3. จัดการผู้ใช้
router.get('/users', ctrl.getAllUsers);
router.delete('/users/:id', ctrl.deleteUser);
router.put('/users/:id/promote', ctrl.promoteUser);

// 4. จัดการแท็ก
router.get('/tags', ctrl.getAllTags);
router.delete('/tags/:tag', ctrl.deleteTag);

module.exports = router;