// ==========================================
// ระบบฟิสิกส์กลุ่มปกนิยายหน้าแรก (Feed Animation)
// ==========================================

let feeds = [];
let feedContainer;
let feedDataList = []; 

const getRandom = (min, max) => Math.random() * (max - min) + min;

class Feed {
    constructor(novels) {
        this.element = document.createElement('div');
        this.element.className = 'feed-wrapper';
        
        this.cluster = document.createElement('div');
        this.cluster.className = 'feed-cluster';
        
        // สถานะเริ่มต้น
        this.isExpanded = false;
        this.timeoutId = null; // [เพิ่มใหม่] เก็บ ID ของตัวจับเวลา

        // 1. สร้างการ์ดปกนิยาย 3 ใบ
        novels.forEach((novel, index) => {
            const card = document.createElement('div');
            card.className = 'feed-card';
            
            if (novel.cover_image) {
                card.style.backgroundImage = `url(${novel.cover_image})`;
            } else {
                card.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:50px;">${novel.cover_emoji || '📖'}</div>`;
            }
            
            // Logic การคลิกการ์ด
            card.onclick = (e) => {
                if (this.isExpanded) {
                    e.stopPropagation(); 
                    window.location.href = `play.html?id=${novel.id}`;
                }
            };
            
            this.cluster.appendChild(card);
        });

        this.element.appendChild(this.cluster);
        feedContainer.appendChild(this.element);

        this.size = 160; 
        this.x = window.innerWidth + this.size; 
        this.y = getRandom(50, window.innerHeight - 250); 
        
        this.vx = getRandom(-1.5, -0.6); 
        this.vy = getRandom(-1, 1);         

        // [แก้ไข] Logic การคลิกที่กลุ่ม (เพื่อกาง/หุบ)
        this.cluster.onclick = () => {
            // ล้างเวลาที่ตั้งไว้ก่อนหน้าเสมอ (ถ้ามี)
            if (this.timeoutId) clearTimeout(this.timeoutId);

            if (!this.isExpanded) {
                // --- กางออก ---
                this.isExpanded = true;
                this.cluster.classList.add('expanded');
                this.vx = 0;
                this.vy = 0;

                // [เพิ่มใหม่] ตั้งเวลาหุบกลับอัตโนมัติใน 20 วินาที (20000 ms)
                this.timeoutId = setTimeout(() => {
                    this.collapse();
                }, 20000);

            } else {
                // --- หุบกลับ (กรณีคลิกเอง) ---
                this.collapse();
            }
        };

        this.updatePosition();
    }

    // [เพิ่มใหม่] ฟังก์ชันสำหรับหุบกลับและเริ่มลอยใหม่
    collapse() {
        this.isExpanded = false;
        this.cluster.classList.remove('expanded');
        // กลับมาเคลื่อนที่
        this.vx = getRandom(-1.5, -0.6); 
        this.vy = getRandom(-1, 1);
        this.timeoutId = null;
    }

    updatePosition() {
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }

    move(width, height) {
        if (this.isExpanded) return; // ถ้ากางออกอยู่ ไม่ต้องขยับ

        if (this.y <= 0) { 
            this.y = 0; 
            this.vy *= -1; 
        } else if (this.y >= height - this.size) { 
            this.y = height - this.size; 
            this.vy *= -1; 
        }

        this.vy *= 0.99;
        this.x += this.vx;
        this.y += this.vy;
        
        this.updatePosition();
    }
}

function checkCollisions() {
    for (let i = 0; i < feeds.length; i++) {
        for (let j = i + 1; j < feeds.length; j++) {
            const f1 = feeds[i], f2 = feeds[j];
            if (f1.isExpanded || f2.isExpanded) continue;

            const dx = (f1.x + f1.size/2) - (f2.x + f2.size/2);
            const dy = (f1.y + f1.size/2) - (f2.y + f2.size/2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < f1.size) {
                const overlap = f1.size - distance;
                const nx = dx / (distance || 1);
                const ny = dy / (distance || 1);
                
                f1.x += nx * overlap * 0.5; f1.y += ny * overlap * 0.5;
                f2.x -= nx * overlap * 0.5; f2.y -= ny * overlap * 0.5;

                f1.vy = ny * 2; f2.vy = -ny * 2;
                f1.vx *= 0.8; f2.vx *= 0.8; 
                if (f1.vx > -0.2) f1.vx = -0.2;
                if (f2.vx > -0.2) f2.vx = -0.2;
            }
        }
    }
}

function animateFeeds() {
    if (!feedContainer) return;
    const width = feedContainer.clientWidth;
    const height = feedContainer.clientHeight;

    feeds.forEach(feed => feed.move(width, height));
    checkCollisions();

    feeds = feeds.filter(feed => {
        if (!feed.isExpanded && feed.x < -feed.size * 3) { 
            feed.element.remove(); 
            return false; 
        }
        return true;
    });

    requestAnimationFrame(animateFeeds);
}

async function initFeeds() {
    feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    try {
        const res = await fetch(`${API}/novels/feed`);
        if (!res.ok) throw new Error("ไม่สามารถโหลดฟีดได้");
        feedDataList = await res.json();
        
        if (!feedDataList || feedDataList.length === 0) return;

        setInterval(() => {
            if (feeds.length < 8) { 
                let shuffled = [...feedDataList].sort(() => 0.5 - Math.random());
                let selectedNovels = shuffled.slice(0, 3);
                if (selectedNovels.length > 0) {
                    feeds.push(new Feed(selectedNovels));
                }
            }
        }, 3000);

        animateFeeds();
    } catch (err) {
        console.error("❌ Feed Load Error:", err);
    }
}