// ==========================================
// ระบบแชท 1-on-1 (Chat Page)
// ==========================================

const API_URL = 'http://localhost:3000/api'; // ในระบบจริงใช้ API จาก config.js
// ตรวจสอบว่ามีการโหลด config.js หรือไม่
const API = (typeof CONFIG !== 'undefined') ? CONFIG.API_URL : 'http://localhost:3000/api';

// 1. ดึงข้อมูลผู้ใช้ปัจจุบัน
let currentUser = null;
try {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
        currentUser = JSON.parse(userStr);
    }
} catch (e) {
    console.error("ข้อมูล User ผิดพลาด");
}

// ถ้าไม่ได้ล็อกอิน ให้เด้งกลับไปหน้า Login
if (!currentUser) {
    window.location.href = 'login.html';
}

// 2. ดึง partnerId จาก URL (เช่น chat.html?partnerId=2)
const urlParams = new URLSearchParams(window.location.search);
const partnerId = urlParams.get('partnerId');

if (!partnerId) {
    alert("ไม่พบข้อมูลคู่สนทนา");
    window.location.href = 'index.html';
}

// 3. ประกาศตัวแปร DOM
const messagesContainer = document.getElementById('chat-messages');
const inputField = document.getElementById('message-input');
const sendBtn = document.getElementById('btn-send-msg');
const partnerNameEl = document.getElementById('partner-name');
const partnerAvatarEl = document.getElementById('partner-avatar');

let lastMessageCount = 0; // ใช้เช็คว่ามีข้อความใหม่หรือไม่ เพื่อลดการกระพริบ

// ==========================================
// 4. ฟังก์ชันโหลดข้อมูลคู่สนทนา (ชื่อ, รูป)
// ==========================================
async function loadPartnerInfo() {
    try {
        const res = await fetch(`${API}/users/profile/${partnerId}`);
        if (!res.ok) throw new Error("โหลดโปรไฟล์ไม่สำเร็จ");
        
        const data = await res.json();
        const partner = data.user;

        if (partner) {
            partnerNameEl.innerText = partner.username;
            
            // ถ้ามีรูปให้แสดงรูป ถ้าไม่มีให้แสดงตัวอักษรแรก
            if (partner.profile_pic) {
                partnerAvatarEl.innerHTML = `<img src="${partner.profile_pic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                partnerAvatarEl.innerText = partner.username.charAt(0).toUpperCase();
            }
        }
    } catch (err) {
        console.error(err);
        partnerNameEl.innerText = "ไม่พบผู้ใช้";
    }
}

// ==========================================
// 5. ฟังก์ชันโหลดประวัติการแชท
// ==========================================
async function loadMessages() {
    try {
        // ใช้ API ที่เราแก้ไขไป: /users/messages/:userId/:partnerId
        const res = await fetch(`${API}/users/messages/${currentUser.id}/${partnerId}`);
        if (!res.ok) throw new Error("โหลดแชทไม่สำเร็จ");
        
        const messages = await res.json();

        // ถ้าจำนวนข้อความเท่าเดิม ไม่ต้องวาดใหม่ (ป้องกันจอกระพริบ)
        if (messages.length === lastMessageCount) return;
        lastMessageCount = messages.length;

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="loading-text">ยังไม่มีข้อความ เริ่มทักทายกันเลย!</div>';
            return;
        }

        // ล้างของเก่า แล้ววาดใหม่
        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            const isMine = msg.sender_id === currentUser.id;
            
            const row = document.createElement('div');
            row.className = `message-row ${isMine ? 'mine' : 'theirs'}`;
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.innerText = msg.content; // ใช้ innerText เพื่อความปลอดภัยจาก XSS
            
            row.appendChild(bubble);
            messagesContainer.appendChild(row);
        });

        // เลื่อน Scrollbar ลงล่างสุดอัตโนมัติ
        scrollToBottom();

    } catch (err) {
        console.error("Load Messages Error:", err);
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ==========================================
// 6. ฟังก์ชันส่งข้อความ
// ==========================================
async function sendMessage() {
    const content = inputField.value.trim();
    if (!content) return;

    // ล้างช่องพิมพ์ทันทีเพื่อ UX ที่ดี
    inputField.value = '';
    inputField.focus();

    try {
        const res = await fetch(`${API}/users/message`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sender_id: currentUser.id,
                receiver_id: parseInt(partnerId),
                content: content
            })
        });

        if (res.ok) {
            // โหลดข้อความใหม่ทันที (ไม่ต้องรอ Polling)
            await loadMessages();
        } else {
            alert("ส่งข้อความไม่สำเร็จ");
        }
    } catch (err) {
        console.error("Send Message Error:", err);
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
}

// ==========================================
// 7. ผูก Event และเริ่มระบบ
// ==========================================

// กด Enter เพื่อส่ง
inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// กดปุ่มส่ง
sendBtn.addEventListener('click', sendMessage);

// เริ่มต้นโหลดข้อมูล
loadPartnerInfo();
loadMessages();

// Polling: ดึงข้อความใหม่ทุกๆ 3 วินาที (เพื่อจำลอง Real-time)
setInterval(loadMessages, 3000);