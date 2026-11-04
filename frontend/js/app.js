// ==========================================
// 1. Safe Initialization
// ==========================================
function initApp() {
    console.log("✅ app.js เริ่มทำงาน");
    
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
    
    // Elements สำหรับเมนู Burger และ Popup แชท
    const burgerBtn = document.getElementById('burger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const chatListModal = document.getElementById('chat-list-modal');
    const btnOpenChat = document.getElementById('btn-open-chat');
    const closeChatModal = document.getElementById('close-chat-modal');
    const chatListContainer = document.getElementById('chat-list-container');

    // ------------------------------------------
    // [เพิ่มใหม่] ระบบเมนู Burger (มือถือ)
    // ------------------------------------------
    if (burgerBtn && mobileMenu) {
        burgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });
    }

    // ------------------------------------------
    // [เพิ่มใหม่] ระบบ Popup แชท (Chat History)
    // ------------------------------------------
    if (btnOpenChat) {
        btnOpenChat.addEventListener('click', () => {
            if (!currentUser) {
                alert("กรุณาเข้าสู่ระบบเพื่อดูข้อความ");
                return;
            }
            chatListModal.style.display = 'flex';
            loadRecentChats();
        });
    }

    if (closeChatModal) {
        closeChatModal.addEventListener('click', () => {
            chatListModal.style.display = 'none';
        });
    }

    // ปิด Popup เมื่อคลิกพื้นที่ว่างด้านนอก
    if (chatListModal) {
        chatListModal.addEventListener('click', (e) => {
            if (e.target === chatListModal) {
                chatListModal.style.display = 'none';
            }
        });
    }

    // ฟังก์ชันโหลดประวัติแชทล่าสุด
    async function loadRecentChats() {
        if (!chatListContainer) return;
        chatListContainer.innerHTML = '<p style="text-align:center; color:#94a3b8;">กำลังโหลด...</p>';

        try {
            const res = await fetch(`${API}/users/recent-chats/${currentUser.id}`);
            if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
            
            const chats = await res.json();
            
            if (chats.length === 0) {
                chatListContainer.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">ยังไม่มีประวัติการแชท</p>';
                return;
            }

            chatListContainer.innerHTML = chats.map(chat => {
                // เช็คว่าใครเป็นคนส่งข้อความล่าสุด (เรา หรือ เขา)
                const isMyMessage = chat.sender_id === currentUser.id;
                const prefix = isMyMessage ? 'คุณ: ' : '';
                
                // รูปโปรไฟล์ (ถ้าไม่มีให้ใช้อักษรตัวแรก)
                const avatarHtml = chat.profile_pic 
                    ? `<img src="${chat.profile_pic}" class="chat-avatar" style="object-fit:cover;">`
                    : `<div class="chat-avatar">${chat.username.charAt(0).toUpperCase()}</div>`;

                // จัดรูปแบบเวลาแบบง่ายๆ
                const date = new Date(chat.created_at);
                const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                return `
                    <div class="chat-list-item" onclick="window.location.href='chat.html?partnerId=${chat.partner_id}'">
                        ${avatarHtml}
                        <div class="chat-info">
                            <div class="chat-name">${chat.username}</div>
                            <div class="chat-last-msg">${prefix}${chat.content}</div>
                        </div>
                        <div class="chat-time">${timeStr}</div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error("Chat List Error:", err);
            chatListContainer.innerHTML = '<p style="text-align:center; color:red;">ไม่สามารถโหลดข้อมูลได้</p>';
        }
    }

    // ------------------------------------------
    // ระบบ เปิด-ปิด กล่องแชทลอย (มุมขวาล่าง)
    // ------------------------------------------
    const chatWidget = document.getElementById('chat-widget');
    const chatHeader = document.getElementById('chat-header');
    const chatToggleIcon = document.getElementById('chat-toggle-icon');

    if (chatHeader && chatWidget && chatToggleIcon) {
        chatHeader.addEventListener('click', () => {
            chatWidget.classList.toggle('open');
            chatToggleIcon.innerText = chatWidget.classList.contains('open') ? '▲' : '▼';
        });
    }

    // ------------------------------------------
    // ฟังก์ชันสลับหน้า (SPA)
    // ------------------------------------------
    function navigateTo(pageId) {
        // อัปเดตสถานะ Active ที่เมนู (ทั้ง Desktop และ Mobile)
        navLinks.forEach(link => {
            if(link.dataset.target === pageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // ปิดเมนูมือถืออัตโนมัติเมื่อกดเลือก
        if (mobileMenu) mobileMenu.classList.remove('show');

        if (pageId === 'home') {
            appContent.style.display = 'none';
            feedContainer.style.display = 'block';
        } else {
            if (typeof viewsHTML === 'undefined' || !viewsHTML[pageId]) {
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
                        container.innerHTML = `<p style="color:red;">เกิดข้อผิดพลาด: ${data.error || 'ไม่ทราบสาเหตุ'}</p>`;
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
                }).catch(err => console.error(err));
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
                    if (!Array.isArray(data)) return;
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
                }).catch(err => console.error(err));
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
                if (!Array.isArray(data)) return;
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
            }).catch(err => console.error(err));
    };

    // ------------------------------------------
    // ระบบแชท (กล่องลอยมุมขวาล่าง)
    // ------------------------------------------
    function loadChat() {
        if (!document.getElementById('chat-box')) return;
        if (!currentUser) {
            document.getElementById('chat-box').innerHTML = '<p style="color:#94a3b8; text-align:center; font-size:12px;">กรุณาเข้าสู่ระบบเพื่อแชท</p>';
            return;
        }
        // สมมติว่ากล่องลอยนี้คุยกับ Admin ID 1
        fetch(`${API}/users/messages/${currentUser.id}/1`)
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
            }).catch(err => console.error(err));
    }

    function sendMsg() {
        if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนส่งข้อความ");
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;

        fetch(`${API}/users/message`, {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender_id: currentUser.id, receiver_id: 1, content: input.value }) // 1 = Admin
        }).then(() => { input.value = ''; loadChat(); }).catch(err => console.error(err));
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