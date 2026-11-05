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
        // ส่ง userId ไปด้วยเพื่อดึงประวัติการอ่าน (ถ้ามี)
        const url = currentUser ? `${API}/novels/play/${novelId}?userId=${currentUser.id}` : `${API}/novels/play/${novelId}`;
        const res = await fetch(url);
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
// 2. บันทึกประวัติการอ่าน
// ==========================================
async function saveReadingProgress(pageId) {
    if (!currentUser) return;
    try {
        await fetch(`${API}/novels/progress`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: currentUser.id, novelId: novelId, pageId: pageId })
        });
    } catch(e) { console.error("Save progress error", e); }
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

    // บันทึกประวัติการอ่าน
    saveReadingProgress(page.id);

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

    const choices = (page.objects || []).filter(o => o.type === 'choice');

    if (currentDialogue < dialogues.length) {
        const d = dialogues[currentDialogue];
        const box = document.createElement('div');
        box.className = 'dialogue-box';
        box.innerText = d.text || "..."; 
        dialogueLayer.appendChild(box);
    } else {
        // ถ้าบทพูดหมดแล้ว
        if (choices.length > 0) {
            // ถ้ามี Choice ให้แสดงตัวเลือกและหยุดรอให้ผู้เล่นคลิก
            renderChoices(choices[0]);
        } else {
            // ถ้าไม่มี Choice ให้ไปหน้าถัดไปอัตโนมัติ
            currentPage++;
            renderPage();
        }
    }
}

// ==========================================
// 4. ระบบแสดงตัวเลือก (Choices)
// ==========================================
function renderChoices(choiceObj) {
    const container = document.createElement('div');
    container.className = 'choice-container-reader';
    
    // สไตล์พื้นฐาน (In-line เพื่อให้ทำงานได้ทันทีโดยไม่ต้องรอ CSS)
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '15px';
    container.style.zIndex = '200';

    // ดึงข้อมูล options (อาจจะมาจาก DB โดยตรง หรือ parse จาก JSON)
    let options = choiceObj.options;
    if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch(e) { options = []; }
    }

    // ถ้าไม่มี options ให้ถือว่าเป็นปุ่ม "ไปต่อ" ธรรมดา
    if (!options || options.length === 0) {
        const btn = document.createElement('button');
        btn.innerText = "▶ ดำเนินเรื่องต่อ";
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '18px';
        btn.style.borderRadius = '10px';
        btn.style.background = 'rgba(255,255,255,0.9)';
        btn.style.cursor = 'pointer';
        btn.style.border = '2px solid #6366f1';
        btn.style.fontFamily = 'Prompt';
        btn.onclick = (e) => {
            e.stopPropagation();
            currentPage++;
            renderPage();
        };
        container.appendChild(btn);
    } else {
        // สร้างปุ่มสำหรับแต่ละ option (A, B, C...)
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = `${opt.label || 'ตัวเลือก'}. ${opt.text || ''}`;
            btn.style.padding = '15px 30px';
            btn.style.fontSize = '18px';
            btn.style.borderRadius = '10px';
            btn.style.background = 'rgba(255,255,255,0.9)';
            btn.style.cursor = 'pointer';
            btn.style.border = '2px solid #6366f1';
            btn.style.fontFamily = 'Prompt';
            btn.style.transition = '0.2s';
            
            // Hover Effect
            btn.onmouseover = () => btn.style.background = '#e0e7ff';
            btn.onmouseout = () => btn.style.background = 'rgba(255,255,255,0.9)';

            btn.onclick = (e) => {
                e.stopPropagation(); // ป้องกัน Event ไหลไปที่ readerContainer
                
                // หาว่า target_page_id นี้คือหน้าไหน
                const targetPageId = opt.target_page_id;
                const targetIndex = chapterData.findIndex(p => p.id == targetPageId);

                if (targetIndex !== -1) {
                    currentPage = targetIndex;
                    renderPage();
                } else {
                    // ถ้าหาไม่เจอ ให้แจ้งเตือนและไปหน้าถัดไป
                    console.warn("ไม่พบหน้าเป้าหมาย:", targetPageId);
                    currentPage++;
                    renderPage();
                }
            };
            container.appendChild(btn);
        });
    }

    dialogueLayer.appendChild(container);
}

// คลิกทั้งจอเพื่อไปบทพูดถัดไป
readerContainer.addEventListener('click', (e) => {
    // ถ้าคลิกที่ดาว, ปุ่มติดตาม, Top bar, หรือกล่องตัวเลือก ไม่ต้องไปต่อ
    if(e.target.classList.contains('star') || 
       e.target.closest('.follow-btn') || 
       e.target.closest('#top-bar-overlay') || 
       e.target.closest('.choice-container-reader')) {
        return;
    }
    
    // ถ้ามี Choice แสดงอยู่ ห้ามให้คลิกทะลุไปหน้าถัดไป
    if (document.querySelector('.choice-container-reader')) {
        return;
    }
    
    currentDialogue++;
    showDialogue();
});

// ==========================================
// 5. ระบบให้ดาว (Rating)
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
        if(res.ok) alert(`ขอบคุณสำหรับการให้ ${score} ดาว!`);
    }).catch(err => console.error("Review error:", err));
}

// ==========================================
// 6. ระบบติดตามผู้เขียน (Follow Author)
// ==========================================
async function setupFollowButton() {
    const followBtn = document.getElementById('btn-follow-author');
    if (!followBtn) return;

    if (!novelAuthorId) {
        followBtn.style.display = 'none';
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
        followBtn.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API}/users/check-follow/${currentUser.id}/${novelAuthorId}`);
        const data = await res.json();
        
        followBtn.classList.remove('loading');
        followBtn.disabled = false;

        if (data.isFollowing) {
            followBtn.classList.add('followed');
            followBtn.innerHTML = '✓ ติดตามแล้ว';
        } else {
            followBtn.innerHTML = '<span>+</span> ติดตามผู้เขียน';
            followBtn.onclick = () => followAuthor(novelAuthorId);
        }
    } catch (err) {
        console.error(err);
        followBtn.classList.remove('loading');
        followBtn.disabled = false;
        followBtn.innerHTML = '<span>+</span> ติดตามผู้เขียน';
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
                btn.innerHTML = '✓ ติดตามแล้ว';
                btn.onclick = null;
            }
        }
    }).catch(err => console.error("Follow error:", err));
}

// ==========================================
// 7. ระบบคอมเมนต์, โปรไฟล์คนเขียน, ลิงก์ Story Line
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

function goToAuthorProfile() {
    if (novelAuthorId) window.location.href = `profile.html?id=${novelAuthorId}`;
}

function goToStoryline() {
    window.location.href = `storyline-player.html?id=${novelId}`;
}

// ==========================================
// Modal คอมเมนต์
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

commentModal.addEventListener('click', (e) => {
    if (e.target === commentModal) closeComments();
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
                ? `<img src="${c.profile_pic}" class="comment-avatar">` 
                : `<div class="comment-avatar">${c.username.charAt(0).toUpperCase()}</div>`;

            return `
                <div class="comment-item">
                    ${avatar}
                    <div class="comment-body">
                        <div class="comment-author-name">${c.username}</div>
                        <div>${c.content}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        commentList.innerHTML = '<p style="text-align:center; color:red;">ไม่สามารถโหลดคอมเมนต์ได้</p>';
    }
}

document.getElementById('btn-send-comment').addEventListener('click', async () => {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น");
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${API}/novels/${novelId}/comments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: currentUser.id, content: content })
        });
        if (res.ok) {
            input.value = '';
            loadComments();
        }
    } catch (err) {
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
});

document.getElementById('comment-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-send-comment').click();
    }
});

// ==========================================
// เริ่มต้นโหลดข้อมูล
// ==========================================
loadNovel();