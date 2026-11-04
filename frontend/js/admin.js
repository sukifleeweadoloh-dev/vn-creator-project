// ==========================================
// Admin Dashboard Logic (เชื่อมต่อ API จริง)
// ==========================================

// 1. ตรวจสอบสิทธิ์ (ต้องเป็น Admin เท่านั้น)
const currentUser = JSON.parse(localStorage.getItem('user'));
if (!currentUser) {
    window.location.href = 'login.html';
} else if (currentUser.role !== 'admin') {
    alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    window.location.href = 'index.html';
}

// แสดงชื่อแอดมิน
document.getElementById('admin-name').innerText = currentUser?.username || 'Admin';
document.getElementById('admin-avatar').innerText = (currentUser?.username || 'A').charAt(0).toUpperCase();

// 2. ระบบสลับแท็บ (Tab Switching)
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('page-title');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        navItems.forEach(n => n.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));

        item.classList.add('active');
        const targetTab = item.dataset.tab;
        document.getElementById(`tab-${targetTab}`).classList.add('active');

        const titleText = item.innerText.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, '').trim();
        pageTitle.innerText = titleText;

        // โหลดข้อมูลตามแท็บที่เลือก
        if (targetTab === 'dashboard') loadDashboardStats();
        if (targetTab === 'novels') loadAdminNovels();
        if (targetTab === 'users') loadAdminUsers();
        if (targetTab === 'chats') loadAdminChats();
        if (targetTab === 'settings') loadAdminTags();
    });
});

// ==========================================
// 3. โหลดข้อมูล Dashboard (ภาพรวม)
// ==========================================
async function loadDashboardStats() {
    try {
        const res = await fetch(`${API}/admin/stats`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่ได้");
        
        const data = await res.json();
        document.getElementById('stat-total-users').innerText = data.totalUsers;
        document.getElementById('stat-total-novels').innerText = data.totalNovels;
        document.getElementById('stat-total-messages').innerText = data.totalMessages;
    } catch (err) {
        console.error(err);
        document.getElementById('stat-total-users').innerText = "Error";
    }
}

// ==========================================
// 4. จัดการนิยาย (Novels)
// ==========================================
async function loadAdminNovels() {
    const tbody = document.getElementById('admin-novels-list');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">กำลังโหลด...</td></tr>';

    try {
        // หมายเหตุ: ในระบบจริงควรมี API /api/admin/novels สำหรับดึงทั้งหมด
        // แต่ตอนนี้เราจะใช้ API /novels/popular ในการดึงข้อมูลมาโชว์ก่อน
        const res = await fetch(`${API}/novels/popular`);
        const novels = await res.json();

        if (novels.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่มีข้อมูลนิยาย</td></tr>';
            return;
        }

        tbody.innerHTML = novels.map(n => `
            <tr>
                <td>${n.id}</td>
                <td><strong>${n.title}</strong></td>
                <td>${n.username}</td>
                <td>${n.views}</td>
                <td>
                    <button class="btn-action btn-danger" onclick="deleteNovel(${n.id})">ลบ</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว</td></tr>';
    }
}

// ฟังก์ชันลบนิยาย (เชื่อมต่อ API จริง)
async function deleteNovel(id) {
    if(confirm(`คุณต้องการลบนิยาย ID: ${id} ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้`)) {
        try {
            const res = await fetch(`${API}/admin/novels/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("ลบนิยายสำเร็จ!");
                loadAdminNovels(); // โหลดตารางใหม่
            } else {
                alert("ลบไม่สำเร็จ");
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    }
}

// ==========================================
// 5. จัดการผู้ใช้ (Users)
// ==========================================
async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-list');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">กำลังโหลด...</td></tr>';

    try {
        const res = await fetch(`${API}/admin/users`);
        const users = await res.json();

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td>
                    <span style="background:${u.role === 'admin' ? '#e0e7ff' : '#f1f5f9'}; color:${u.role === 'admin' ? '#4f46e5' : '#64748b'}; padding:3px 8px; border-radius:10px; font-size:12px;">
                        ${u.role.toUpperCase()}
                    </span>
                </td>
                <td>
                    ${u.role === 'user' ? `<button class="btn-action btn-primary" onclick="promoteUser(${u.id})">เลื่อนขั้นแอดมิน</button>` : ''}
                    ${u.id !== currentUser.id ? `<button class="btn-action btn-danger" onclick="deleteUser(${u.id})">ลบ</button>` : '<span style="color:#94a3b8; font-size:12px;">(ตัวเอง)</span>'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว</td></tr>';
    }
}

async function promoteUser(id) {
    if(confirm(`คุณต้องการเลื่อนขั้นผู้ใช้ ID: ${id} เป็นแอดมินใช่หรือไม่?`)) {
        try {
            const res = await fetch(`${API}/admin/users/${id}/promote`, { method: 'PUT' });
            if (res.ok) {
                alert("เลื่อนขั้นสำเร็จ!");
                loadAdminUsers();
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาด");
        }
    }
}

async function deleteUser(id) {
    if(confirm(`คุณต้องการลบผู้ใช้ ID: ${id} ใช่หรือไม่? ข้อมูลทั้งหมดจะหายไป`)) {
        try {
            const res = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("ลบผู้ใช้สำเร็จ!");
                loadAdminUsers();
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาด");
        }
    }
}

// ==========================================
// 6. ระบบแชท (Admin Chat)
// ==========================================
let selectedPartnerId = null;

async function loadAdminChats() {
    const chatList = document.getElementById('admin-chat-list');
    chatList.innerHTML = '<p style="padding:15px; text-align:center; color:#94a3b8;">กำลังโหลด...</p>';

    try {
        const res = await fetch(`${API}/users/recent-chats/1`); // 1 = Admin ID
        const chats = await res.json();

        if (chats.length === 0) {
            chatList.innerHTML = '<p style="padding:15px; text-align:center; color:#94a3b8;">ยังไม่มีข้อความ</p>';
            return;
        }

        chatList.innerHTML = chats.map(chat => `
            <div class="admin-chat-contact ${chat.partner_id === selectedPartnerId ? 'active' : ''}" onclick="selectChatUser(${chat.partner_id}, '${chat.username}')">
                <div class="admin-chat-avatar">${chat.username.charAt(0).toUpperCase()}</div>
                <div class="admin-chat-info">
                    <div class="admin-chat-name">${chat.username}</div>
                    <div class="admin-chat-last">${chat.sender_id === 1 ? 'คุณ: ' : ''}${chat.content}</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        chatList.innerHTML = '<p style="padding:15px; text-align:center; color:red;">โหลดข้อมูลล้มเหลว</p>';
    }
}

function selectChatUser(partnerId, partnerName) {
    selectedPartnerId = partnerId;
    document.getElementById('admin-chat-header').innerText = `กำลังสนทนากับ: ${partnerName}`;
    document.getElementById('admin-chat-header').style.color = '#1e293b';
    loadAdminMessages(partnerId);
}

async function loadAdminMessages(partnerId) {
    const msgBox = document.getElementById('admin-chat-messages');
    msgBox.innerHTML = '<p style="text-align:center; color:#94a3b8;">กำลังโหลด...</p>';

    try {
        const res = await fetch(`${API}/users/messages/1/${partnerId}`); // 1 = Admin ID
        const messages = await res.json();

        if (messages.length === 0) {
            msgBox.innerHTML = '<p style="text-align:center; color:#94a3b8;">ยังไม่มีข้อความ</p>';
            return;
        }

        msgBox.innerHTML = messages.map(m => {
            const isMine = m.sender_id === 1;
            return `
                <div class="admin-msg-row ${isMine ? 'mine' : 'theirs'}">
                    <div class="admin-msg-bubble">${m.content}</div>
                </div>
            `;
        }).join('');

        msgBox.scrollTop = msgBox.scrollHeight;
    } catch (err) {
        msgBox.innerHTML = '<p style="text-align:center; color:red;">โหลดข้อความล้มเหลว</p>';
    }
}

document.getElementById('btn-admin-send-chat').addEventListener('click', async () => {
    if (!selectedPartnerId) return alert("กรุณาเลือกผู้ติดต่อก่อน");
    
    const input = document.getElementById('admin-chat-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`${API}/users/message`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sender_id: 1, // Admin ID
                receiver_id: selectedPartnerId,
                content: content
            })
        });

        if (res.ok) {
            input.value = '';
            loadAdminMessages(selectedPartnerId);
        }
    } catch (err) {
        alert("ไม่สามารถส่งข้อความได้");
    }
});

// ==========================================
// 7. จัดการแท็ก (Tags) - แท็บ Settings
// ==========================================
async function loadAdminTags() {
    const tbody = document.getElementById('admin-tags-list');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">กำลังโหลด...</td></tr>';

    try {
        const res = await fetch(`${API}/admin/tags`);
        const tags = await res.json();

        if (tags.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">ไม่มีแท็กในระบบ</td></tr>';
            return;
        }

        tbody.innerHTML = tags.map(t => `
            <tr>
                <td>#${t.tag}</td>
                <td>${t.count} เรื่อง</td>
                <td>
                    <button class="btn-action btn-danger" onclick="deleteTag('${t.tag}')">ลบแท็ก</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว</td></tr>';
    }
}

async function deleteTag(tagName) {
    if(confirm(`คุณต้องการลบแท็ก #${tagName} ออกจากทุกนิยายใช่หรือไม่?`)) {
        try {
            const res = await fetch(`${API}/admin/tags/${tagName}`, { method: 'DELETE' });
            if (res.ok) {
                alert("ลบแท็กสำเร็จ!");
                loadAdminTags();
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาด");
        }
    }
}

// ==========================================
// 8. ระบบ Logout และเริ่มต้น
// ==========================================
document.getElementById('btn-admin-logout').addEventListener('click', (e) => {
    e.preventDefault();
    if(confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
});

// เริ่มต้นโหลดข้อมูลหน้า Dashboard
loadDashboardStats();