const router = require('express').Router();
const ctrl = require('../controllers/userController');

// ==========================================
// โปรไฟล์
// ==========================================
router.get('/profile/:id', ctrl.getProfile);
router.post('/update', ctrl.updateProfile);

// ==========================================
// ระบบติดตาม (Follow)
// ==========================================
router.post('/follow', ctrl.followUser);                                    // กดติดตาม
router.get('/following/:id', ctrl.getFollowing);                            // รายชื่อที่เราติดตาม
router.get('/followers/:id', ctrl.getFollowers);                            // รายชื่อผู้ติดตามเรา (เพิ่มใหม่)
router.get('/check-follow/:followerId/:followingId', ctrl.checkFollowStatus); // เช็คสถานะการติดตาม (เพิ่มใหม่)

// ==========================================
// ระบบแชท (Chat)
// ==========================================
router.post('/message', ctrl.sendMessage);        // ส่งข้อความ
router.get('/messages/:userId', ctrl.getMessages); // ดึงประวัติแชท

module.exports = router;