const router = require('express').Router();
const ctrl = require('../controllers/userController');

// ==========================================
// Routes สำหรับโปรไฟล์ (Profile)
// ==========================================
router.get('/profile/:id', ctrl.getProfile);
router.post('/update', ctrl.updateProfile);

// ==========================================
// Routes สำหรับระบบติดตาม (Follow)
// ==========================================
router.post('/follow', ctrl.followUser);
router.get('/following/:id', ctrl.getFollowing);
router.get('/followers/:id', ctrl.getFollowers);
router.get('/check-follow/:followerId/:followingId', ctrl.checkFollowStatus);

// ==========================================
// Routes สำหรับระบบแชท (Chat)
// ==========================================
router.post('/message', ctrl.sendMessage);

// [แก้ไข] เปลี่ยน Path ให้รับ partnerId เพื่อดึงแชทแบบ 1-on-1
router.get('/messages/:userId/:partnerId', ctrl.getMessages);

// [เพิ่มใหม่] Route สำหรับดึงรายชื่อคู่สนทนาล่าสุด (สำหรับ Popup หน้าแรก)
router.get('/recent-chats/:userId', ctrl.getRecentChats);

module.exports = router;