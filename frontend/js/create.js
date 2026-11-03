const canvas = document.getElementById('canvas');
let currentPages = []; 
let currentPageIndex = 0;
let currentNovelId = null; 
let currentNovelTitle = ""; 
let currentCoverUrl = ""; // เก็บ URL รูปปกปัจจุบัน
let userNovelsList = [];  // เก็บรายชื่อนิยายทั้งหมดเพื่อดึงข้อมูลตอนเลือกเรื่องเดิม

if (typeof API === 'undefined') {
    console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
}

// ==========================================
// 1. ระบบเริ่มต้น
// ==========================================
function initEditor() {
    if(currentPages.length === 0) addNewPage();
    loadUserNovels();
}

// ==========================================
// 2. ระบบจัดการหน้า
// ==========================================
function addNewPage() {
    currentPages.push({ bg: null, objects: [] });
    currentPageIndex = currentPages.length - 1;
    renderCanvas();
    updatePageList();
}

function switchPage(index) {
    currentPageIndex = index;
    renderCanvas();
    updatePageList();
}

function updatePageList() {
    const listContainer = document.getElementById('page-list');
    if(!listContainer) return;
    
    listContainer.innerHTML = '';
    currentPages.forEach((page, index) => {
        const thumb = document.createElement('div');
        thumb.className = `page-thumb ${index === currentPageIndex ? 'active' : ''}`;
        thumb.onclick = () => switchPage(index);
        
        thumb.innerHTML = `
            <div style="width:100%; height:100%; background: ${page.bg ? `url(${page.bg}) center/cover` : '#333'};"></div>
            <span style="position:absolute; bottom:2px; right:5px; color:#fff; font-size:12px; background:rgba(0,0,0,0.5); padding:2px 5px; border-radius:5px;">${index + 1}</span>
        `;
        listContainer.appendChild(thumb);
    });
}

// ==========================================
// 3. ระบบวาด Canvas
// ==========================================
function renderCanvas() {
    const page = currentPages[currentPageIndex];
    if (!page) return;
    
    canvas.innerHTML = '';
    canvas.style.backgroundImage = page.bg ? `url(${page.bg})` : 'none';
    canvas.style.backgroundColor = '#000'; 

    if (page.objects && Array.isArray(page.objects)) {
        page.objects.forEach((obj, index) => {
            try {
                createVisualObject(obj, index);
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการวาด Object:", error);
            }
        });
    }
}

function createVisualObject(obj, index) {
    const div = document.createElement('div');
    div.className = 'draggable-obj';
    div.style.position = 'absolute';
    div.style.transform = `translate(${obj.x}px, ${obj.y}px)`;
    div.setAttribute('data-x', obj.x);
    div.setAttribute('data-y', obj.y);
    
    if (obj.type === 'dialogue') {
        div.style.zIndex = 100; 
        div.innerHTML = `<div class="dialogue-obj"><textarea class="dialog-text" placeholder="พิมพ์บทพูด...">${obj.text || ''}</textarea></div>`;
        const textarea = div.querySelector('textarea');
        if(textarea) {
            textarea.addEventListener('input', (e) => { obj.text = e.target.value; });
        }
    } else {
        div.style.zIndex = 10; 
        const imgSrc = obj.image ? obj.image : 'https://via.placeholder.com/150?text=No+Image';
        div.innerHTML = `<img src="${imgSrc}" style="width:100%; pointer-events:none;">`;
    }
    
    canvas.appendChild(div);

    if (typeof interact !== 'undefined') {
        interact(div).draggable({
            listeners: {
                move(event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    
                    obj.x = x;
                    obj.y = y;
                }
            }
        });
    }
}

// ==========================================
// 4. ระบบอัปโหลด (พื้นหลัง/ตัวละคร)
// ==========================================
async function uploadAndRemoveBG(type) {
    const input = document.createElement('input');
    input.type = 'file'; 
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            let finalBlob = file; 
            if(type === 'character' && typeof imglyRemoveBackground === 'function') {
                try {
                    document.body.style.cursor = 'wait';
                    finalBlob = await imglyRemoveBackground(file);
                } catch (bgError) {
                    finalBlob = file; 
                } finally {
                    document.body.style.cursor = 'default';
                }
            }

            const formData = new FormData();
            formData.append('image', finalBlob, type + '.png');
            const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("เซิร์ฟเวอร์ปฏิเสธการอัปโหลด");
            
            const data = await res.json();
            if (!data.url) throw new Error("ไม่ได้รับ URL");

            if (type === 'bg') {
                currentPages[currentPageIndex].bg = data.url;
                renderCanvas();
                updatePageList();
            } else {
                currentPages[currentPageIndex].objects.push({
                    type: type,
                    image: data.url,
                    x: 100, y: 100,
                    order: currentPages[currentPageIndex].objects.length + 1
                });
                renderCanvas();
            }
        } catch (err) {
            document.body.style.cursor = 'default';
            alert("❌ อัปโหลดล้มเหลว: " + err.message);
        }
    };
    input.click();
}

// ==========================================
// 5. [เพิ่มใหม่] ระบบอัปโหลดรูปภาพปก
// ==========================================
document.getElementById('btn-upload-cover').addEventListener('click', () => {
    document.getElementById('cover-input').click();
});

document.getElementById('cover-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error("อัปโหลดล้มเหลว");
        
        const data = await res.json();
        if (!data.url) throw new Error("ไม่ได้รับ URL");

        currentCoverUrl = data.url;
        
        // แสดงรูป Preview
        const preview = document.getElementById('cover-preview');
        preview.src = currentCoverUrl;
        preview.style.display = 'block';

    } catch (err) {
        alert("❌ อัปโหลดรูปปกไม่สำเร็จ: " + err.message);
    }
});

// ==========================================
// 6. ระบบเพิ่มบทพูด
// ==========================================
function addNewDialogue() {
    const newObj = {
        type: 'dialogue',
        text: '',
        x: 100, 
        y: 100,
        order: currentPages[currentPageIndex].objects.length + 1
    };
    currentPages[currentPageIndex].objects.push(newObj);
    renderCanvas();
}

// ==========================================
// 7. ระบบโหลดเรื่องเดิม
// ==========================================
async function loadUserNovels() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    try {
        const res = await fetch(`${API}/users/profile/${user.id}`);
        const data = await res.json();
        const select = document.getElementById('select-existing-novel');
        if(!select) return;
        
        select.innerHTML = '<option value="">-- สร้างเรื่องใหม่ --</option>';
        userNovelsList = data.novels || []; // เก็บข้อมูลไว้ใช้ตอนเลือก

        if(data.novels) {
            data.novels.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n.id;
                opt.innerText = n.title;
                select.appendChild(opt);
            });
        }
    } catch(e) { console.log("โหลดรายชื่อนิยายไม่ได้:", e); }
}

document.getElementById('select-existing-novel').addEventListener('change', async (e) => {
    const novelId = e.target.value;
    if(!novelId) {
        // สร้างใหม่ (ล้างค่าเก่าทั้งหมด)
        currentNovelId = null;
        currentNovelTitle = "";
        currentCoverUrl = "";
        currentPages = [];
        document.getElementById('cover-preview').style.display = 'none';
        document.getElementById('input-tags').value = "";
        addNewPage();
        return;
    }
    
    try {
        document.body.style.cursor = 'wait';
        
        // ดึงข้อมูลหน้าจาก API play
        const res = await fetch(`${API}/novels/play/${novelId}`);
        const data = await res.json();
        if (!data.pages) throw new Error("ไม่พบข้อมูล");
        
        currentNovelId = novelId;
        const select = document.getElementById('select-existing-novel');
        currentNovelTitle = select.options[select.selectedIndex].text;
        
        // ดึงข้อมูลปกและแท็กจากตัวแปร userNovelsList ที่โหลดไว้ตอนแรก
        const selectedNovel = userNovelsList.find(n => n.id == novelId);
        if (selectedNovel) {
            currentCoverUrl = selectedNovel.cover_image || '';
            
            // แสดงรูปปก (ถ้ามี)
            const preview = document.getElementById('cover-preview');
            if (currentCoverUrl) {
                preview.src = currentCoverUrl;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
            
            // แสดงแท็ก (ถ้ามี)
            document.getElementById('input-tags').value = selectedNovel.tags || '';
        }
        
        // แปลงข้อมูลหน้า
        currentPages = data.pages.map(p => ({
            bg: p.background_image,
            objects: p.objects.map(o => ({
                type: o.type,
                image: o.image,
                text: o.text,
                x: o.x,
                y: o.y,
                order: o.order
            }))
        }));

        currentPageIndex = 0;
        renderCanvas();
        updatePageList();
    } catch(err) {
        alert("โหลดข้อมูลเรื่องเดิมไม่สำเร็จ");
    } finally {
        document.body.style.cursor = 'default';
    }
});

// ==========================================
// 8. Event Handlers & Save
// ==========================================
document.getElementById('btn-add-character').onclick = () => uploadAndRemoveBG('character');
document.getElementById('btn-add-bg').onclick = () => uploadAndRemoveBG('bg');
document.getElementById('btn-add-dialogue').onclick = addNewDialogue;
document.getElementById('btn-add-page').addEventListener('click', addNewPage);

document.getElementById('btn-play').addEventListener('click', () => {
    if (!currentNovelId) {
        alert("กรุณาบันทึกนิยายก่อนกดเล่นครับ");
        return;
    }
    window.location.href = `play.html?id=${currentNovelId}`;
});

document.getElementById('btn-save').addEventListener('click', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนบันทึกนิยาย");
        window.location.href = 'login.html';
        return;
    }

    let title = prompt("ตั้งชื่อเรื่องของคุณ:", currentNovelId ? currentNovelTitle : "");
    if (!title) return;

    // ดึงค่าแท็กจาก input
    const tagsInput = document.getElementById('input-tags').value.trim();

    // [แก้ไข] เพิ่ม cover_image และ tags ใน Payload
    const payload = { 
        title: title, 
        author_id: user.id, 
        pages: currentPages,
        cover_image: currentCoverUrl || null,
        tags: tagsInput || null
    };
    
    if(currentNovelId) payload.novel_id = currentNovelId; 

    try {
        const btn = document.getElementById('btn-save');
        btn.innerText = "กำลังบันทึก...";
        btn.disabled = true;

        const res = await fetch(`${API}/novels/save`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(res.ok) {
            alert("บันทึกสำเร็จ!");
            if(!currentNovelId) {
                window.location.href = `play.html?id=${data.novelId}`;
            } else {
                currentNovelId = data.novelId || currentNovelId;
                currentNovelTitle = title;
                loadUserNovels(); // รีเฟรช Dropdown
            }
        } else {
            alert("Error: " + (data.error || "ไม่สามารถบันทึกได้"));
        }
    } catch(err) { 
        alert("เซิร์ฟเวอร์ไม่ตอบสนอง"); 
    } finally { 
        const btn = document.getElementById('btn-save');
        btn.innerText = "💾 บันทึก"; 
        btn.disabled = false;
    }
});

// เริ่มระบบ
initEditor();