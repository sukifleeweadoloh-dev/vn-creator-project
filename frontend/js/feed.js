// ==========================================
// ระบบฟิสิกส์กลุ่มปกนิยายหน้าแรก (Feed Animation)
// ==========================================

let feeds = [];
let feedContainer;
let feedDataList = []; // เก็บข้อมูลนิยายที่ดึงมาจาก Database

// ฟังก์ชันสุ่มตัวเลข
const getRandom = (min, max) => Math.random() * (max - min) + min;

class Feed {
    constructor(novels) {
        // 1. สร้าง Wrapper สำหรับให้ JS คุมตำแหน่ง (ฟิสิกส์)
        this.element = document.createElement('div');
        this.element.className = 'feed-wrapper';
        
        // 2. สร้าง Cluster สำหรับให้ CSS คุมการกางออก
        this.cluster = document.createElement('div');
        this.cluster.className = 'feed-cluster';
        
        // 3. สร้างการ์ดปกนิยาย 3 ใบ
        novels.forEach((novel, index) => {
            const card = document.createElement('div');
            card.className = 'feed-card';
            
            // ถ้ามีรูปปกให้ใช้รูป ถ้าไม่มีให้ใช้สีพื้นหลังพร้อมอิโมจิ
            if (novel.cover_image) {
                card.style.backgroundImage = `url(${novel.cover_image})`;
            } else {
                card.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:50px;">${novel.cover_emoji || '📖'}</div>`;
            }
            
            // เมื่อคลิกที่การ์ดใบใดใบหนึ่ง ให้ไปหน้า play
            card.onclick = (e) => {
                e.stopPropagation(); // ป้องกันไม่ให้ไปทับซ้อนกับ Event ของ cluster
                window.location.href = `play.html?id=${novel.id}`;
            };
            
            this.cluster.appendChild(card);
        });

        this.element.appendChild(this.cluster);
        feedContainer.appendChild(this.element);

        // 4. ตั้งค่าฟิสิกส์ (ขนาดความกว้าง/สูง อ้างอิงจาก CSS)
        this.size = 160; 
        this.x = window.innerWidth + this.size; // เริ่มจากนอกจอขวา
        this.y = getRandom(50, window.innerHeight - 250); 
        
        this.vx = getRandom(-1.5, -0.6); // ความเร็วแกน X (ลบ = ไปทางซ้าย)
        this.vy = getRandom(-1, 1);      // ความเร็วแกน Y
        this.isExpanded = false;         // สถานะว่ากางออกหรือยัง

        // 5. ผูก Event การกาง/หุบ
        this.cluster.onclick = () => {
            this.isExpanded = !this.isExpanded;
            if (this.isExpanded) {
                this.cluster.classList.add('expanded');
                // หยุดการเคลื่อนที่ชั่วคราวเพื่อให้คลิกง่าย
                this.vx = 0;
                this.vy = 0;
            } else {
                this.cluster.classList.remove('expanded');
                // กลับมาเคลื่อนที่ไปทางซ้ายเหมือนเดิม
                this.vx = getRandom(-1.5, -0.6); 
            }
        };

        this.updatePosition();
    }

    updatePosition() {
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }

    move(width, height) {
        // ถ้ากางออกอยู่ ไม่ต้องขยับ
        if (this.isExpanded) return;

        // กระเด้งเฉพาะขอบบน-ล่าง
        if (this.y <= 0) { 
            this.y = 0; 
            this.vy *= -1; 
        } else if (this.y >= height - this.size) { 
            this.y = height - this.size; 
            this.vy *= -1; 
        }

        // ลดแรงดีดแนวตั้งลงเรื่อยๆ ให้ดูเป็นธรรมชาติ
        this.vy *= 0.99;

        // อัปเดตตำแหน่ง
        this.x += this.vx;
        this.y += this.vy;
        
        this.updatePosition();
    }
}

// ตรวจสอบการชนกันระหว่างกลุ่ม
function checkCollisions() {
    for (let i = 0; i < feeds.length; i++) {
        for (let j = i + 1; j < feeds.length; j++) {
            const f1 = feeds[i], f2 = feeds[j];
            
            // ถ้ากำลังกางออกอยู่ ไม่ต้องเช็คการชน
            if (f1.isExpanded || f2.isExpanded) continue;

            const dx = (f1.x + f1.size/2) - (f2.x + f2.size/2);
            const dy = (f1.y + f1.size/2) - (f2.y + f2.size/2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // ถ้าระยะห่างน้อยกว่าขนาด (ชนกัน)
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

// ลูปการทำงานหลัก
function animateFeeds() {
    if (!feedContainer) return;
    
    const width = feedContainer.clientWidth;
    const height = feedContainer.clientHeight;

    feeds.forEach(feed => feed.move(width, height));
    checkCollisions();

    // ลบกลุ่มที่หลุดออกนอกจอซ้ายไปแล้ว
    feeds = feeds.filter(feed => {
        // ถ้ากางออกอยู่ ห้ามลบเด็ดขาด (รอให้ผู้ใช้คลิกก่อน)
        if (!feed.isExpanded && feed.x < -feed.size * 3) { 
            feed.element.remove(); 
            return false; 
        }
        return true;
    });

    requestAnimationFrame(animateFeeds);
}

// ฟังก์ชันเริ่มต้น (ถูกเรียกจาก app.js)
async function initFeeds() {
    feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    try {
        // 1. ดึงข้อมูลนิยายแบบสุ่มจาก API
        const res = await fetch(`${API}/novels/feed`);
        if (!res.ok) throw new Error("ไม่สามารถโหลดฟีดได้");
        
        feedDataList = await res.json();
        
        // ถ้าไม่มีนิยายเลย ให้หยุดทำงาน
        if (!feedDataList || feedDataList.length === 0) {
            console.log("ยังไม่มีนิยายในระบบ");
            return;
        }

        // 2. สร้างกลุ่มปกขึ้นมาใหม่เรื่อยๆ ทุก 3 วินาที
        setInterval(() => {
            if (feeds.length < 8) { // จำกัดจำนวนไม่ให้เยอะเกินไป
                // สุ่มเลือกนิยาย 3 เรื่องจาก List ที่มี
                // (ถ้ามีนิยายไม่ถึง 3 เรื่อง ก็เอาท่าที่มี)
                let shuffled = [...feedDataList].sort(() => 0.5 - Math.random());
                let selectedNovels = shuffled.slice(0, 3);
                
                // ถ้าเลือกมาได้อย่างน้อย 1 เรื่อง ให้สร้างฟีด
                if (selectedNovels.length > 0) {
                    feeds.push(new Feed(selectedNovels));
                }
            }
        }, 3000);

        // 3. เริ่มลูปแอนิเมชัน
        animateFeeds();

    } catch (err) {
        console.error("❌ Feed Load Error:", err);
    }
}