// ลบ const API = ... ออก เพราะดึงจาก config.js แล้ว
const currentUser = JSON.parse(localStorage.getItem('user'));

// ตรวจสอบว่ามีการโหลด config.js หรือยัง
if (typeof API === 'undefined') {
    console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
}

// ==========================================
// 1. ตรวจสอบสถานะล็อกอิน
// ==========================================
if (!currentUser) {
    window.location.href = 'login.html';
} else {
    loadProfile();
    setupLogout();
}

// ==========================================
// 2. โหลดข้อมูลโปรไฟล์
// ==========================================
function loadProfile() {
    fetch(`${API}/users/profile/${currentUser.id}`)
        .then(res => {
            if(!res.ok) throw new Error("ไม่สามารถดึงข้อมูลโปรไฟล์ได้");
            return res.json();
        })
        .then(data => {
            if(!data.user) {
                document.getElementById('profile-data').innerHTML = '<p style="color:red; text-align:center;">ไม่พบข้อมูลผู้ใช้</p>';
                return;
            }
            
            const { user, novels, followerCount } = data;
            const container = document.getElementById('profile-data');
            
            // สร้างรูปโปรไฟล์ (ถ้าไม่มีให้ใช้ตัวอักษรแรกของชื่อ)
            const picHtml = user.profile_pic 
                ? `<img src="${user.profile_pic}" class="profile-pic" alt="Profile">` 
                : `<div class="profile-pic">${user.username.charAt(0).toUpperCase()}</div>`;

            // สร้างรายการนิยาย
            let novelsHtml = '';
            if (novels && novels.length > 0) {
                novelsHtml = novels.map(n => `
                    <div class="novel-card" onclick="window.location.href='play.html?id=${n.id}'">
                        <div class="novel-emoji">${n.cover_emoji}</div>
                        <h4>${n.title}</h4>
                    </div>
                `).join('');
            } else {
                novelsHtml = `<p style="color:var(--text-light); text-align:center; width:100%;">ยังไม่มีผลงาน</p>`;
            }

            container.innerHTML = `
                <div class="profile-header">
                    ${picHtml}
                    <div class="profile-info">
                        <h2>${user.username}</h2>
                        <p>${user.bio || 'ยังไม่มีคำอธิบาย'} | ผู้ติดตาม: ${followerCount} คน</p>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button class="btn-edit" onclick="editProfile()">📷 เปลี่ยนรูปโปรไฟล์</button>
                            <button class="btn-edit" onclick="editBio()">✏️ แก้ไขคำอธิบาย</button>
                        </div>
                    </div>
                </div>
                <h3 style="margin-top: 40px; color: var(--text-dark);">เรื่องที่ฉันสร้าง</h3>
                <div class="novels-grid">${novelsHtml}</div>
            `;
        })
        .catch(err => {
            console.error("Load Profile Error:", err);
            document.getElementById('profile-data').innerHTML = `
                <p style="color:red; text-align:center;">
                    ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาตรวจสอบเซิร์ฟเวอร์
                </p>
            `;
        });
}

// ==========================================
// 3. ระบบอัปโหลดรูปโปรไฟล์
// ==========================================
function editProfile() {
    const input = document.createElement('input');
    input.type = 'file'; 
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ขนาดไม่เกิน 5MB");
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            // 1. อัปโหลดรูปไปที่ Server
            const uploadRes = await fetch(`${API}/upload`, { method: 'POST', body: formData });
            if (!uploadRes.ok) throw new Error("อัปโหลดล้มเหลว");
            
            const uploadData = await uploadRes.json();
            if (!uploadData.url) throw new Error("ไม่ได้รับ URL จากเซิร์ฟเวอร์");

            // 2. อัปเดต URL รูปลง Database (ส่งแค่ profile_pic ไม่แตะ bio)
            const updateRes = await fetch(`${API}/users/update`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    id: currentUser.id, 
                    profile_pic: uploadData.url 
                })
            });

            if (!updateRes.ok) throw new Error("อัปเดตข้อมูลไม่สำเร็จ");

            alert("✅ อัปเดตรูปโปรไฟล์สำเร็จ!");
            loadProfile(); // โหลดข้อมูลใหม่
            
        } catch (err) {
            console.error("Upload Error:", err);
            alert("❌ อัปโหลดล้มเหลว: " + err.message);
        }
    };
    input.click();
}

// ==========================================
// 4. ระบบแก้ไขคำอธิบาย (Bio)
// ==========================================
async function editBio() {
    const newBio = prompt("กรอกคำอธิบายโปรไฟล์ใหม่:", "");
    if (newBio === null || newBio.trim() === "") return;

    try {
        const res = await fetch(`${API}/users/update`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                id: currentUser.id, 
                bio: newBio.trim()
            })
        });

        if (res.ok) {
            alert("✅ อัปเดตคำอธิบายสำเร็จ!");
            loadProfile();
        } else {
            alert("❌ อัปเดตไม่สำเร็จ");
        }
    } catch (err) {
        console.error("Update Bio Error:", err);
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
}

// ==========================================
// 5. ระบบออกจากระบบ (Logout)
// ==========================================
function setupLogout() {
    const logoutBtn = document.getElementById('btn-logout');
    if (!logoutBtn) return;

    if (currentUser) {
        logoutBtn.style.display = 'inline-block';
    }

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    });
}