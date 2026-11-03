// ==========================================
// ระบบจัดการล็อกอินและสมัครสมาชิก
// ==========================================

// ตรวจสอบว่ามีการโหลด config.js หรือยัง
if (typeof API === 'undefined') {
    console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
}

// ตรวจสอบว่าเป็นหน้าไหน (Login หรือ Register)
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorMsg = document.getElementById('error-msg');

// --- 1. ระบบสมัครสมาชิก (Register) ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // ป้องกันหน้าเว็บรีเฟรช
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // ตรวจสอบเงื่อนไขเบื้องต้นก่อนส่งไป Backend (รหัสผ่าน 8 ตัว มีตัวอักษร)
        if (password.length < 8 || !/[a-zA-Z]/.test(password)) {
            errorMsg.innerText = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวอักษรภาษาอังกฤษ";
            errorMsg.style.color = "#ef4444";
            return;
        }

        try {
            errorMsg.innerText = "กำลังดำเนินการ...";
            errorMsg.style.color = "#6366f1";

            const res = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
                window.location.href = 'login.html';
            } else {
                // แสดง Error จาก Backend (เช่น อีเมลซ้ำ)
                errorMsg.innerText = data.error;
                errorMsg.style.color = "#ef4444";
            }
        } catch (err) {
            errorMsg.innerText = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
            errorMsg.style.color = "#ef4444";
        }
    });
}

// --- 2. ระบบเข้าสู่ระบบ (Login) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            errorMsg.innerText = "กำลังตรวจสอบ...";
            errorMsg.style.color = "#6366f1";

            const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                // บันทึก Token และข้อมูล User ลง LocalStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // ล็อกอินสำเร็จ กลับหน้าหลัก
                window.location.href = 'index.html';
            } else {
                errorMsg.innerText = data.error;
                errorMsg.style.color = "#ef4444";
            }
        } catch (err) {
            errorMsg.innerText = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
            errorMsg.style.color = "#ef4444";
        }
    });
}