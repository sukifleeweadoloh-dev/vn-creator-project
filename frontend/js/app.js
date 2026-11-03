// ==========================================
// 1. Safe Initialization (เรียกใช้ฟังก์ชันอย่างปลอดภัย)
// ==========================================
function initApp() {
    console.log("✅ app.js เริ่มทำงาน");
    
    // ตรวจสอบว่ามีการโหลด config.js หรือยัง
    if (typeof API === 'undefined') {
        console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
        return;
    }

    // ------------------------------------------
    // อ่านข้อมูลผู้ใช้อย่างปลอดภัย
    // ------------------------------------------
    let currentUser = null;
    try {
        const userStr = localStorage.getItem('user');
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
            currentUser = JSON.parse(userStr);
        }
    } catch (e) {
        console.error("❌ ข้อมูลใน localStorage เสีย กำลังล้าง...", e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }

    const navLinks = document.querySelectorAll('.nav-link');
    const appContent = document.getElementById('dynamic-view');
    const feedContainer = document.getElementById('feed-container');

    console.log(`📌 พบปุ่มเมนู ${navLinks.length} ปุ่ม`);

    // ------------------------------------------
    // [เพิ่มใหม่] ระบบ เปิด-ปิด กล่องแชท (Chat Toggle)
    // ------------------------------------------
    const chatWidget = document.getElementById('chat-widget');
    const chatHeader = document.getElementById('chat-header');
    const chatToggleIcon = document.getElementById('chat-toggle-icon');

    if (chatHeader && chatWidget && chatToggleIcon) {
        chatHeader.addEventListener('click', () => {
            // สลับคลาส .open เพื่อเปิด/ปิด
            chatWidget.classList.toggle('open');
            
            // เปลี่ยนไอคอนลูกศรตามสถานะ
            if (chatWidget.classList.contains('open')) {
                chatToggleIcon.innerText = '▲'; // ลูกศรชี้ขึ้น (เปิดอยู่)
            } else {
                chatToggleIcon.innerText = '▼'; // ลูกศรชี้ลง (ปิดอยู่)
            }
        });
    }

    // ------------------------------------------
    // ฟังก์ชันสลับหน้า (SPA)
    // ------------------------------------------
    function navigateTo(pageId) {
        navLinks.forEach(link => {
            if(link.dataset.target === pageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        if (pageId === 'home') {
            appContent.style.display = 'none';
            feedContainer.style.display = 'block';
        } else {
            if (typeof viewsHTML === 'undefined' || !viewsHTML[pageId]) {
                console.error(`❌ ไม่พบ viewsHTML['${pageId}']`);
                appContent.innerHTML = `<h1 style="color:red; padding:20px;">ไม่พบหน้านี้ (${pageId})</h1>`;
            } else {
                appContent.innerHTML = viewsHTML[pageId];
            }
            appContent.style.display = 'block';
            feedContainer.style.display = 'none'; 
            
            loadViewData(pageId); 
        }
    }

    // ------------------------------------------
    // ฟังก์ชันโหลดข้อมูลแต่ละหน้า
    // ------------------------------------------
    function loadViewData(pageId) {
        const user = currentUser || { id: 0 }; 

        if (pageId === 'popular') {
            fetch(`${API}/novels/popular`)
                .then(r => r.json())
                .then(data => {
                    const container = document.getElementById('popular-list');
                    if(!container) return;

                    if (!Array.isArray(data)) {
                        container.innerHTML = `<p style="color:red;">เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${data.error || 'ไม่ทราบสาเหตุ'}</p>`;
                        return;
                    }

                    if (data.length === 0) {
                        container.innerHTML = '<p style="color:#64748b;">ยังไม่มีนิยายในระบบ</p>';
                        return;
                    }
                    container.innerHTML = data.map(n => `
                        <div style="border:1px solid #ddd; padding:20px; border-radius:15px; width:200px; cursor:pointer; background:#fff;" onclick="window.location.href='play.html?id=${n.id}'">
                            <h1 style="text-align:center; font-size:40px;">${n.cover_emoji}</h1>
                            <h4 style="color:#1e293b;">${n.title}</h4>
                            <p style="color:#64748b; font-size:14px;">โดย: ${n.username}</p>
                            <p style="color:#6366f1; font-size:14px;">👁️ ${n.views} วิว</p>
                        </div>
                    `).join('');
                }).catch(err => {
                    console.error("Popular error:", err);
                    const container = document.getElementById('popular-list');
                    if(container) container.innerHTML = '<p style="color:red;">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</p>';
                });
        }

        if (pageId === 'following') {
            const container = document.getElementById('following-list');
            if(!container) return;
            if(!currentUser) {
                container.innerHTML = '<p style="color:#64748b;">กรุณาเข้าสู่ระบบเพื่อดูรายชื่อที่ติดตาม</p>';
                return;
            }
            fetch(`${API}/users/following/${user.id}`)
                .then(r => r.json())
                .then(data => {
                    if (!Array.isArray(data)) {
                        container.innerHTML = `<p style="color:red;">เกิดข้อผิดพลาด: ${data.error || 'ไม่ทราบสาเหตุ'}</p>`;
                        return;
                    }

                    if(data.length === 0) {
                        container.innerHTML = '<p style="color:#64748b;">คุณยังไม่ได้ติดตามใคร</p>';
                    } else {
                        container.innerHTML = data.map(u => `
                            <div style="border:1px solid #ddd; padding:20px; border-radius:15px; width:150px; text-align:center; background:#fff;">
                                <div style="width:50px; height:50px; background:#6366f1; color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:24px; margin:0 auto 10px;">
                                    ${u.username.charAt(0).toUpperCase()}
                                </div>
                                <h4 style="color:#1e293b;">${u.username}</h4>
                            </div>
                        `).join('');
                    }
                }).catch(err => console.error("Following error:", err));
        }
    }

    // ------------------------------------------
    // ผูก Event ให้เมนูทุกปุ่ม
    // ------------------------------------------
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.dataset.target;
            if (target === 'profile') {
                window.location.href = 'profile.html';
                return;
            }
            navigateTo(target);
        });
    });

    // ------------------------------------------
    // ระบบค้นหา
    // ------------------------------------------
    window.performSearch = function() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return alert("กรุณาพิมพ์คำที่ต้องการค้นหา");

        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<p>กำลังค้นหา...</p>';

        fetch(`${API}/novels/search?q=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    resultsContainer.innerHTML = `<p style="color:red;">เกิดข้อผิดพลาด: ${data.error || 'ไม่ทราบสาเหตุ'}</p>`;
                    return;
                }

                if (data.length === 0) {
                    resultsContainer.innerHTML = '<p style="color:#64748b;">ไม่พบนิยายที่ค้นหา</p>';
                } else {
                    resultsContainer.innerHTML = data.map(n => `
                        <div style="border:1px solid #ddd; padding:20px; border-radius:15px; width:200px; cursor:pointer; background:#fff;" onclick="window.location.href='play.html?id=${n.id}'">
                            <h1 style="text-align:center; font-size:40px;">${n.cover_emoji}</h1>
                            <h4 style="color:#1e293b;">${n.title}</h4>
                        </div>
                    `).join('');
                }
            }).catch(err => {
                console.error("Search error:", err);
                resultsContainer.innerHTML = '<p style="color:red;">เกิดข้อผิดพลาดในการค้นหา</p>';
            });
    };

    // ------------------------------------------
    // ระบบแชท (โหลดข้อความ)
    // ------------------------------------------
    function loadChat() {
        if (!document.getElementById('chat-box')) return;
        if (!currentUser) {
            document.getElementById('chat-box').innerHTML = '<p style="color:#94a3b8; text-align:center; font-size:12px;">กรุณาเข้าสู่ระบบเพื่อแชท</p>';
            return;
        }
        fetch(`${API}/users/messages/${currentUser.id}`)
            .then(r => r.json())
            .then(msgs => {
                if (!Array.isArray(msgs)) return; 
                const box = document.getElementById('chat-box');
                box.innerHTML = msgs.map(m => `
                    <div style="margin:5px 0; text-align:${m.sender_id === currentUser.id ? 'right' : 'left'};">
                        <span style="display:inline-block; padding:5px 10px; background:${m.sender_id === currentUser.id ? '#e0e7ff' : '#fee2e2'}; border-radius:10px;">
                            ${m.content}
                        </span>
                    </div>
                `).join('');
                box.scrollTop = box.scrollHeight;
            }).catch(err => console.error("Chat error:", err));
    }

    function sendMsg() {
        if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนส่งข้อความ");
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;

        fetch(`${API}/users/message`, {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender_id: currentUser.id, receiver_id: 1, content: input.value })
        }).then(() => { input.value = ''; loadChat(); }).catch(err => console.error("Send error:", err));
    }

    // ------------------------------------------
    // ระบบ Logout
    // ------------------------------------------
    function setupLogout() {
        const logoutBtn = document.getElementById('btn-logout');
        if (!logoutBtn) return;
        if (currentUser) logoutBtn.style.display = 'inline-block';
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        });
    }

    // ------------------------------------------
    // เริ่มต้นระบบทั้งหมด
    // ------------------------------------------
    if (typeof initFeeds === 'function') initFeeds();
    navigateTo('home');
    loadChat();
    setInterval(loadChat, 3000);

    const sendBtn = document.getElementById('btn-send-chat');
    if (sendBtn) sendBtn.addEventListener('click', sendMsg);

    setupLogout();
}

// เรียกใช้เมื่อ DOM พร้อม
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}