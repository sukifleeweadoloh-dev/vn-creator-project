// ลบ const API = ... ออก เพราะดึงจาก config.js แล้ว
const urlParams = new URLSearchParams(window.location.search);
const novelId = urlParams.get('id') || 1;

let chapterData = [];
let currentPage = 0;
let currentDialogue = 0;
let novelAuthorId = null;
let currentUser = JSON.parse(localStorage.getItem('user'));

// ตรวจสอบว่ามีการโหลด config.js หรือยัง
if (typeof API === 'undefined') {
    console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
}

const pageLayer = document.getElementById('page-layer');
const dialogueLayer = document.getElementById('dialogue-layer');
const readerContainer = document.getElementById('reader-container');

// ==========================================
// 1. โหลดข้อมูลนิยายจาก Database
// ==========================================
async function loadNovel() {
    try {
        const res = await fetch(`${API}/novels/play/${novelId}`);
        if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลได้");
        
        const data = await res.json();
        
        if (!data.pages || data.pages.length === 0) {
            alert("ไม่พบข้อมูลเนื้อหาในนิยายเรื่องนี้");
            window.location.href = 'index.html';
            return;
        }

        chapterData = data.pages;
        novelAuthorId = data.author_id;

        // ตั้งค่าปุ่มติดตาม (เช็คสถานะก่อน)
        await setupFollowButton();
        
        renderPage();
    } catch(e) { 
        console.error(e);
        alert("โหลดนิยายไม่สำเร็จ กรุณาตรวจสอบเซิร์ฟเวอร์"); 
    }
}

// ==========================================
// 2. ระบบแสดงผลหน้าและบทพูด
// ==========================================
function renderPage() {
    pageLayer.innerHTML = '';
    dialogueLayer.innerHTML = '';
    
    const page = chapterData[currentPage];
    
    if (!page) {
        alert("จบตอนแล้ว!");
        window.location.href = 'index.html';
        return;
    }

    // พื้นหลัง (ถ้าไม่มีรูปให้ใช้สีดำ)
    readerContainer.style.background = page.background_image 
        ? `url(${page.background_image}) center/cover` 
        : 'black';

    // วาดตัวละคร (z-index 10)
    const characters = (page.objects || []).filter(o => o.type === 'character');
    characters.forEach(c => {
        const el = document.createElement('div');
        el.className = 'character-sprite';
        el.innerHTML = `<img src="${c.image}" alt="character">`;
        el.style.left = c.x + 'px';
        el.style.top = c.y + 'px';
        pageLayer.appendChild(el);
    });

    currentDialogue = 0;
    showDialogue();
}

function showDialogue() {
    const page = chapterData[currentPage];
    if (!page) return;

    dialogueLayer.innerHTML = ''; 
    
    const dialogues = (page.objects || [])
        .filter(o => o.type === 'dialogue')
        .sort((a,b) => a.order - b.order);

    if (currentDialogue < dialogues.length) {
        const d = dialogues[currentDialogue];
        const box = document.createElement('div');
        box.className = 'dialogue-box';
        box.innerText = d.text || "..."; 
        dialogueLayer.appendChild(box);
    } else {
        currentPage++;
        renderPage();
    }
}

// คลิกทั้งจอเพื่อไปบทพูดถัดไป
readerContainer.addEventListener('click', (e) => {
    if(e.target.classList.contains('star') || e.target.closest('.follow-btn')) return;
    
    currentDialogue++;
    showDialogue();
});

// ==========================================
// 3. ระบบให้ดาว (Rating)
// ==========================================
function rate(score) {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนให้คะแนน");
        window.location.href = 'login.html';
        return;
    }

    const stars = document.querySelectorAll('.star');
    stars.forEach((s, i) => s.innerText = i < score ? '★' : '☆');
    
    fetch(`${API}/novels/${novelId}/review`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            rating: score, 
            comment: "",
            user_id: currentUser.id
        })
    }).then(res => {
        if(res.ok) {
            alert(`ขอบคุณสำหรับการให้ ${score} ดาว!`);
        } else {
            alert("เกิดข้อผิดพลาดในการบันทึกคะแนน");
        }
    }).catch(err => {
        console.error("Review error:", err);
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    });
}

// ==========================================
// 4. ระบบติดตามผู้เขียน (Follow Author)
// ==========================================

// ตั้งค่าปุ่มติดตาม (เช็คสถานะก่อน)
async function setupFollowButton() {
    const followBtn = document.getElementById('btn-follow-author');
    if (!followBtn) return;

    if (!novelAuthorId) {
        followBtn.classList.add('hidden');
        return;
    }

    if (!currentUser) {
        followBtn.classList.remove('loading');
        followBtn.disabled = false;
        followBtn.innerHTML = '<span>+</span> ติดตามผู้เขียน';
        followBtn.onclick = () => {
            alert("กรุณาเข้าสู่ระบบก่อนติดตาม");
            window.location.href = 'login.html';
        };
        return;
    }

    if (currentUser.id === novelAuthorId) {
        followBtn.classList.add('hidden');
        return;
    }

    // เช็คสถานะการติดตามจาก Backend
    try {
        const res = await fetch(`${API}/users/check-follow/${currentUser.id}/${novelAuthorId}`);
        const data = await res.json();
        
        followBtn.classList.remove('loading');
        followBtn.disabled = false;

        if (data.isFollowing) {
            followBtn.classList.add('followed');
            followBtn.dataset.following = 'true';
            followBtn.innerHTML = '✓ ติดตามแล้ว';
        } else {
            followBtn.dataset.following = 'false';
            followBtn.innerHTML = '<span>+</span> ติดตามผู้เขียน';
            followBtn.onclick = () => followAuthor(novelAuthorId);
        }
    } catch (err) {
        console.error("Check follow error:", err);
        followBtn.classList.remove('loading');
        followBtn.disabled = false;
        followBtn.innerHTML = '<span>+</span> ติดตามผู้เขียน';
        followBtn.onclick = () => followAuthor(novelAuthorId);
    }
}

// ฟังก์ชันกดติดตาม
function followAuthor(authorId) {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if(!user) return alert("กรุณาล็อกอินก่อนติดตาม");

    fetch(`${API}/users/follow`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ follower_id: user.id, following_id: authorId })
    }).then(res => {
        if(res.ok) {
            const btn = document.getElementById('btn-follow-author');
            if(btn) {
                btn.classList.add('followed');
                btn.dataset.following = 'true';
                btn.innerHTML = '✓ ติดตามแล้ว';
                btn.onclick = null;
            }
        } else {
            alert("เกิดข้อผิดพลาดในการติดตาม");
        }
    }).catch(err => {
        console.error("Follow error:", err);
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    });
}

// เริ่มต้นโหลดข้อมูล
loadNovel();