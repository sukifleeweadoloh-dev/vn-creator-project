// ==========================================
// Story Line Player Logic
// ==========================================

const urlParams = new URLSearchParams(window.location.search);
const novelId = urlParams.get('id');

let currentUser = null;
try {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
        currentUser = JSON.parse(userStr);
    }
} catch (e) { console.error("LocalStorage Error"); }

const userId = currentUser ? currentUser.id : null;

let pagesData = []; 
let nodes = [];     
let connections = []; 
let readingProgress = []; 
let novelAuthorId = null;

const board = document.getElementById('board');
const svgOverlay = document.getElementById('svg-overlay');
const cardsContainer = document.getElementById('cards-container');
const loadingText = document.getElementById('loading');

if (typeof API === 'undefined') {
    console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
}

if (!novelId) {
    alert("ไม่พบข้อมูลนิยาย");
    window.location.href = 'index.html';
}

// อัปเดตลิงก์กลับไปหน้า Play
const btnBackPlay = document.getElementById('btn-back-play');
if (btnBackPlay) btnBackPlay.href = `play.html?id=${novelId}`;

// ==========================================
// 1. ฟังก์ชันโหลดข้อมูลจาก Database
// ==========================================
async function fetchStoryline() {
    try {
        const url = userId ? `${API}/novels/play/${novelId}?userId=${userId}` : `${API}/novels/play/${novelId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        
        const data = await res.json();
        pagesData = data.pages || [];
        novelAuthorId = data.author_id;
        readingProgress = data.readingProgress || []; 
        
        if (pagesData.length === 0) {
            loadingText.innerText = "ไม่มีข้อมูลหน้านิยาย";
            return;
        }

        // หาหน้าที่อ่านล่าสุด (หน้าสุดท้ายที่อยู่ใน readingProgress)
        let currentPageId = null;
        if (readingProgress.length > 0) {
            currentPageId = Math.max(...readingProgress);
        } else if (pagesData.length > 0) {
            // ถ้ายังไม่เคยอ่าน ให้หน้าแรกเป็น Current
            currentPageId = pagesData[0].id;
        }

        // แปลง Pages เป็น Nodes
        nodes = pagesData.map((p, index) => {
            let status = 'locked';
            
            // ถ้าอยู่ในประวัติการอ่าน
            if (readingProgress.includes(p.id)) {
                status = 'read';
            }
            // ถ้าเป็นหน้าล่าสุดที่อ่าน
            if (p.id === currentPageId) {
                status = 'current';
            }
            // หน้าแรกสุดถ้ายังไม่เริ่มอ่าน ให้เป็น current
            if (index === 0 && readingProgress.length === 0) {
                status = 'current';
            }

            return {
                id: `page_${p.id}`,
                pageId: p.id,
                title: `หน้า ${p.order_index}`,
                x: p.storyline_x || (100 + (index * 200)),
                y: p.storyline_y || 400,
                type: 'page',
                status: status,
                choices: p.choices || []
            };
        });

        // สร้าง Connections อัตโนมัติ
        connections = [];
        
        // 1. เชื่อมตามลำดับหน้า
        for (let i = 0; i < nodes.length - 1; i++) {
            connections.push({ from: nodes[i].id, to: nodes[i+1].id, type: 'black' });
        }
        
        // 2. เชื่อมตาม Choice
        pagesData.forEach((p) => {
            if (p.choices) {
                p.choices.forEach(choice => {
                    if (choice.target_page_id) {
                        connections.push({ from: `page_${p.id}`, to: `page_${choice.target_page_id}`, type: 'black' });
                    }
                });
            }
        });

        // โหลดข้อมูลนักเขียน
        if (novelAuthorId) fetchAuthorInfo(novelAuthorId);

        // แสดงผล
        loadingText.style.display = 'none';
        renderBoard();

    } catch (err) {
        console.error(err);
        loadingText.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
}

// ==========================================
// 2. ฟังก์ชัน Render
// ==========================================
function renderBoard() {
    cardsContainer.innerHTML = '';
    
    nodes.forEach(node => {
        const card = document.createElement('div');
        card.className = `card status-${node.status}`;
        card.id = node.id;
        card.style.left = `${node.x}px`;
        card.style.top = `${node.y}px`;

        let subText = '';
        if (node.choices.length > 0) {
            const choiceTxt = node.choices[0].text || 'ตัวเลือก';
            const shortTxt = choiceTxt.length > 5 ? choiceTxt.substring(0,5) + '...' : choiceTxt;
            subText = `<div class="sub-text">${shortTxt}</div>`;
        }

        card.innerHTML = `
            <div class="main-text">${node.title}</div>
            ${subText}
        `;
        cardsContainer.appendChild(card);
    });

    updateAllLines();
}

// ==========================================
// 3. ฟังก์ชันวาดเส้น (SVG)
// ==========================================
function updateAllLines() {
    svgOverlay.innerHTML = ''; 

    connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);

        if (!fromNode || !toNode) return;

        const cardW = 130;
        const cardH = 180;
        
        const fromCenterX = fromNode.x + (cardW / 2);
        const fromCenterY = fromNode.y + (cardH / 2);
        const toCenterX = toNode.x + (cardW / 2);
        const toCenterY = toNode.y + (cardH / 2);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", fromCenterX);
        line.setAttribute("y1", fromCenterY);
        line.setAttribute("x2", toCenterX);
        line.setAttribute("y2", toCenterY);
        line.setAttribute("class", conn.type === 'gold' ? "path-gold" : "path-black");
        
        const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
        const arrowLength = 20;
        const arrowTipX = toCenterX;
        const arrowTipY = toCenterY;
        const arrowBase1X = arrowTipX - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowBase1Y = arrowTipY - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowBase2X = arrowTipX - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowBase2Y = arrowTipY - arrowLength * Math.sin(angle + Math.PI / 6);

        const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        arrowHead.setAttribute("points", `${arrowTipX},${arrowTipY} ${arrowBase1X},${arrowBase1Y} ${arrowBase2X},${arrowBase2Y}`);
        arrowHead.setAttribute("class", conn.type === 'gold' ? "arrow-head-gold" : "arrow-head");

        svgOverlay.appendChild(line);
        svgOverlay.appendChild(arrowHead);
    });
}

// ==========================================
// 4. ระบบ Pan (ลากพื้นที่ว่าง)
// ==========================================
let isPanning = false;
let startX, startY, scrollLeft, scrollTop;
const boardContainer = document.getElementById('board-container');

boardContainer.addEventListener('mousedown', (e) => {
    isPanning = true;
    boardContainer.style.cursor = 'grabbing';
    startX = e.pageX - boardContainer.offsetLeft;
    startY = e.pageY - boardContainer.offsetTop;
    scrollLeft = boardContainer.scrollLeft;
    scrollTop = boardContainer.scrollTop;
});

boardContainer.addEventListener('mouseleave', () => { isPanning = false; boardContainer.style.cursor = 'grab'; });
boardContainer.addEventListener('mouseup', () => { isPanning = false; boardContainer.style.cursor = 'grab'; });

boardContainer.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const x = e.pageX - boardContainer.offsetLeft;
    const y = e.pageY - boardContainer.offsetTop;
    boardContainer.scrollLeft = scrollLeft - (x - startX) * 1.5;
    boardContainer.scrollTop = scrollTop - (y - startY) * 1.5;
});

// ==========================================
// 5. ข้อมูลนักเขียน และปุ่มติดตาม
// ==========================================
async function fetchAuthorInfo(authorId) {
    try {
        const res = await fetch(`${API}/users/profile/${authorId}`);
        const data = await res.json();
        const author = data.user;

        if (author) {
            document.getElementById('author-name').innerText = author.username;
            const avatarEl = document.getElementById('author-avatar');
            if (author.profile_pic) {
                avatarEl.innerHTML = `<img src="${author.profile_pic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                avatarEl.innerText = author.username.charAt(0).toUpperCase();
            }
        }
    } catch (err) { console.error(err); }
}

function goToAuthorProfile() {
    if (novelAuthorId) window.location.href = `profile.html?id=${novelAuthorId}`;
}

// ตรวจสอบสถานะติดตาม (แบบง่าย)
async function checkFollowStatus() {
    const btnFollow = document.getElementById('btn-follow');
    if (!btnFollow) return;
    
    if (!currentUser || currentUser.id === novelAuthorId) {
        btnFollow.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API}/users/check-follow/${currentUser.id}/${novelAuthorId}`);
        const data = await res.json();
        if (data.isFollowing) {
            btnFollow.classList.add('followed');
            btnFollow.innerHTML = '✓ ติดตามแล้ว';
        } else {
            btnFollow.innerHTML = '❤️ ติดตาม';
            btnFollow.onclick = () => followAuthor();
        }
    } catch (e) { console.log(e); }
}

async function followAuthor() {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนติดตาม");
    try {
        await fetch(`${API}/users/follow`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ follower_id: currentUser.id, following_id: novelAuthorId })
        });
        checkFollowStatus();
    } catch (e) { console.log(e); }
}

// ==========================================
// 6. ระบบคอมเมนต์
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
            commentList.innerHTML = '<p style="text-align:center; color:#94a3b8;">ยังไม่มีคอมเมนต์</p>';
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
    } catch (err) { commentList.innerHTML = '<p style="color:red;">โหลดไม่สำเร็จ</p>'; }
}

document.getElementById('btn-send-comment').addEventListener('click', async () => {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนคอมเมนต์");
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
    } catch (err) { alert("ส่งไม่สำเร็จ"); }
});

document.getElementById('comment-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-send-comment').click();
});

// ==========================================
// 7. เริ่มต้นระบบ
// ==========================================
fetchStoryline();
checkFollowStatus();