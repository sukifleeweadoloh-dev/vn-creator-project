// ==========================================
// ระบบฟิสิกส์วงกลมหน้าแรก (Feed Animation)
// ==========================================

let feeds = [];
let feedContainer;

// ฟังก์ชันสุ่มตัวเลข
const getRandom = (min, max) => Math.random() * (max - min) + min;

class Feed {
    constructor() {
        // สร้าง Wrapper สำหรับให้ JS คุมตำแหน่ง
        this.element = document.createElement('div');
        this.element.className = 'feed-wrapper';
        
        // สร้าง Item สำหรับให้ CSS คุมหน้าตา (Hover Effect)
        const innerItem = document.createElement('div');
        innerItem.className = 'feed-item';
        
        // สุ่มข้อความ
        const feedTexts = ['#fantasy', '#แนวตาชี', '#ต่อสู้', '#?', '#ไซไฟ', '#ต่างโลก'];
        const text = feedTexts[Math.floor(Math.random() * feedTexts.length)];
        innerItem.innerHTML = `<span class="feed-text">${text}</span>`;
        
        this.element.appendChild(innerItem);
        feedContainer.appendChild(this.element);

        this.size = 150;
        this.x = window.innerWidth + this.size; // เริ่มจากนอกจอขวา
        this.y = getRandom(50, window.innerHeight - 250); // สุ่มตำแหน่ง Y
        
        // ความเร็ว
        this.vx = getRandom(-1.5, -0.6); // วิ่งไปทางซ้าย
        this.vy = getRandom(-1, 1); 

        this.updatePosition();
    }

    updatePosition() {
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }

    move(width, height) {
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

// ตรวจสอบการชนกันระหว่างวงกลม
function checkCollisions() {
    for (let i = 0; i < feeds.length; i++) {
        for (let j = i + 1; j < feeds.length; j++) {
            const f1 = feeds[i], f2 = feeds[j];
            const dx = (f1.x + f1.size/2) - (f2.x + f2.size/2);
            const dy = (f1.y + f1.size/2) - (f2.y + f2.size/2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // ถ้าระยะห่างน้อยกว่าขนาด (ชนกัน)
            if (distance < f1.size) {
                const overlap = f1.size - distance;
                const nx = dx / (distance || 1);
                const ny = dy / (distance || 1);
                
                // ดันออกจากกัน
                f1.x += nx * overlap * 0.5; f1.y += ny * overlap * 0.5;
                f2.x -= nx * overlap * 0.5; f2.y -= ny * overlap * 0.5;

                // ใส่ความเร็วให้กระเด้งออกจากกัน
                f1.vy = ny * 2; f2.vy = -ny * 2;
                
                // เบรคความเร็วแนวนอนลงนิดนึงเพื่อให้เห็นการชน
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

    // ขยับทุกวงกลม
    feeds.forEach(feed => feed.move(width, height));
    
    // เช็คการชน
    checkCollisions();

    // ลบวงกลมที่หลุดออกนอกจอซ้ายไปแล้ว
    feeds = feeds.filter(feed => {
        if (feed.x < -feed.size * 2) { 
            feed.element.remove(); 
            return false; 
        }
        return true;
    });

    requestAnimationFrame(animateFeeds);
}

// ฟังก์ชันเริ่มต้น (ถูกเรียกจาก app.js)
function initFeeds() {
    feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    // สร้างวงกลมใหม่ทุกๆ 2 วินาที (สูงสุดไม่เกิน 15 อัน)
    setInterval(() => {
        if (feeds.length < 15) {
            feeds.push(new Feed());
        }
    }, 2000);

    // เริ่มลูป
    animateFeeds();
}