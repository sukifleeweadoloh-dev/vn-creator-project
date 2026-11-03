// ==========================================
// ระบบขออนุญาตใช้ Cookie และ Storage (Cookie Consent)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // ตรวจสอบว่าผู้ใช้เคยยอมรับไปแล้วหรือยัง (เช็คจาก LocalStorage)
    const consent = localStorage.getItem('vn_cookie_consent');
    
    if (!consent) {
        showCookieBanner();
    }
});

function showCookieBanner() {
    // สร้าง Element สำหรับแบนเนอร์
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    
    // เนื้อหาของแบนเนอร์
    banner.innerHTML = `
        <div class="cookie-content">
            <p>
                🍪 เว็บไซต์นี้ใช้พื้นที่จัดเก็บข้อมูล (Storage) เพื่อช่วยให้ระบบ "ตัดพื้นหลังรูปภาพอัตโนมัติ" ทำงานได้อย่างมีประสิทธิภาพ 
                และเพื่อจดจำสถานะการเข้าสู่ระบบของคุณ
            </p>
            <div class="cookie-buttons">
                <button id="btn-accept-cookie" class="btn-accept">ยอมรับทั้งหมด</button>
                <button id="btn-decline-cookie" class="btn-decline">ปฏิเสธ</button>
            </div>
        </div>
    `;
    
    // นำแบนเนอร์ไปแปะไว้ที่ body
    document.body.appendChild(banner);

    // ผูก Event ให้ปุ่ม "ยอมรับ"
    document.getElementById('btn-accept-cookie').addEventListener('click', () => {
        localStorage.setItem('vn_cookie_consent', 'accepted');
        banner.remove();
        
        // รีเฟรชหน้าเว็บ 1 ครั้ง เพื่อให้ Browser ปลดล็อก Storage และโหลดระบบตัดพื้นหลังใหม่
        window.location.reload(); 
    });

    // ผูก Event ให้ปุ่ม "ปฏิเสธ"
    document.getElementById('btn-decline-cookie').addEventListener('click', () => {
        localStorage.setItem('vn_cookie_consent', 'declined');
        banner.remove();
        // หมายเหตุ: ถ้าปฏิเสธ ระบบตัดพื้นหลังจะไม่ทำงาน (แต่ยังอัปโหลดรูปปกติได้)
    });
}