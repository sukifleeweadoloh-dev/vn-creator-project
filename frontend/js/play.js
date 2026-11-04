// ==========================================
// Play Novel Logic
// ==========================================

const urlParams = new URLSearchParams(window.location.search);
const novelId = urlParams.get('id') || 1;

let chapterData = [];
let currentPage = 0;
let currentDialogue = 0;
let novelAuthorId = null;
let currentUser = JSON.parse(localStorage.getItem('user'));

const pageLayer = document.getElementById('page-layer');
const dialogueLayer = document.getElementById('dialogue-layer');
const readerContainer = document.getElementById('reader-container');

// ตรวจสอบว่ามีการโหลด config.js หรือยัง
if (typeof API === 'undefined') {
    console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
}

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

        // โหลดข้อมูลโปรไฟล์นักเขียน (ถ้ามี)
        if (novelAuthorId) {
            loadAuthorInfo(novelAuthorId);
        }

        setupFollowButton();
        renderPage();
    } catch(e) { 
        console.error(e);
        alert("โหลดนิยายไม่สำเร็จ กรุณาตรวจสอบเซิร์ฟเวอร์"); 
    }
}

// ==========================================
// 2. โหลดข้อมูลนักเขียน (ชื่อ, รูป, ลิงก์)
// ==========================================
async function loadAuthorInfo(authorId) {
    const authorNameEl = document.getElementById('author-name');
    const authorAvatarEl = document.getElementById('author-avatar');

    try {
        const res = await fetch(`${API}/users/profile/${authorId}`);
        if (!res.ok) throw new Error("โหลดโปรไฟล์ไม่ได้");
        
        const data = await res.json();
        const author = data.user;

        if (author) {
            authorNameEl.innerText = author.username;
            if (author.profile_pic) {
                authorAvatarEl.innerHTML = `<img src="${author.profile_pic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                authorAvatarEl.innerText = author.username.charAt(0).toUpperCase();
            }
        }
    } catch (err) {
        console.error(err);
        authorNameEl.innerText = "ไม่พบผู้เขียน";
    }
}

// ฟังก์ชันนำทางไปหน้าโปรไฟล์นักเขียน
function goToAuthorProfile() {
    if (novelAuthorId) {
        window.location.href = `profile.html?id=${novelAuthorId}`;
    }
}

// ฟังก์ชันนำทางไปหน้า Story Line (Player View)
function goToStoryline() {
    // ส่ง novelId ไปด้วยเพื่อให้หน้า storyline-player ดึงข้อมูลได้ถูกเรื่อง
    window.location.href = `storyline-player.html?id=${novelId}`;
}


// ==========================================
// 3. ระบบแสดงผลหน้าและบทพูด
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
    // ถ้าคลิกที่ดาว, ปุ่มติดตาม, หรือ Top bar ไม่ต้องไปต่อ
    if(e.target.classList.contains('star') || e.target.closest('.follow-btn') || e.target.closest('#top-bar-overlay')) return;
    
    currentDialogue++;
    showDialogue();
});

// ==========================================
// 4. ระบบให้ดาว (Rating)
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
// 5. ระบบติดตามผู้เขียน (Follow Author)
// ==========================================
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
        }
    }).catch(err => console.error("Follow error:", err));
}

// ==========================================
// 6. ระบบคอมเมนต์ (Comments)
// ==========================================
const commentModal = document.getElementById('comment-modal');
const commentList = document.getElementById('comment-list');

function openComments() {
    commentModal.style.display = 'flex';
    loadComments();
}

function closeComments() {
    commentModal.style.display = 'none';
}

// ปิด Modal เมื่อคลิกพื้นที่ด้านนอก
commentModal.addEventListener('click', (e) => {
    if (e.target === commentModal) {
        closeComments();
    }
});

async function loadComments() {
    commentList.innerHTML = '<p style="text-align:center; color:#94a3b8;">กำลังโหลด...</p>';
    
    try {
        const res = await fetch(`${API}/novels/${novelId}/comments`);
        const comments = await res.json();

        if (comments.length === 0) {
            commentList.innerHTML = '<p style="text-align:center; color:#94a3b8;">ยังไม่มีคอมเมนต์ มาเป็นคนแรกกันเลย!</p>';
            return;
        }

        commentList.innerHTML = comments.map(c => {
            const avatar = c.profile_pic 
                ? `<img src="${c.profile_pic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` 
                : c.username.charAt(0).toUpperCase();

            return `
                <div class="comment-item">
                    <div class="comment-avatar">${avatar}</div>
                    <div class="comment-body">
                        <div class="comment-author-name">${c.username}</div>
                        <div>${c.content}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Load comments error:", err);
        commentList.innerHTML = '<p style="text-align:center; color:red;">ไม่สามารถโหลดคอมเมนต์ได้</p>';
    }
}

document.getElementById('btn-send-comment').addEventListener('click', async () => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น");
        return;
    }

    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${API}/novels/${novelId}/comments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                user_id: currentUser.id, 
                content: content 
            })
        });

        if (res.ok) {
            input.value = '';
            loadComments(); // โหลดคอมเมนต์ใหม่
        } else {
            alert("ส่งคอมเมนต์ไม่สำเร็จ");
        }
    } catch (err) {
        console.error("Send comment error:", err);
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
});

// กด Enter ในช่องคอมเมนต์เพื่อส่ง
document.getElementById('comment-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-send-comment').click();
    }
});

// ==========================================
// เริ่มต้นโหลดข้อมูล
// ==========================================
loadNovel();