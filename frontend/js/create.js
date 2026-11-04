const canvas = document.getElementById('canvas');
// ลบ const API = ... ออก เพราะดึงจาก config.js แล้ว
let currentPages = []; 
let currentPageIndex = 0;
let currentNovelId = null; 
let currentNovelTitle = ""; 
let currentCoverUrl = ""; 
let userNovelsList = [];  
let isChoiceMode = false; // สถานะว่าหน้านี้เป็นแบบตัวเลือกหรือยัง
let currentChoiceCount = 0; // นับจำนวนตัวเลือก A, B, C...

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
// 2. ระบบจัดการหน้า (Pages)
// ==========================================
function addNewPage() {
    // รีเซ็ตสถานะตัวเลือกเมื่อขึ้นหน้าใหม่
    isChoiceMode = false;
    currentChoiceCount = 0;
    
    // เปิดใช้งานปุ่มเพิ่มของต่างๆ (ถ้าเคยโดนล็อก)
    document.getElementById('btn-add-character').disabled = false;
    document.getElementById('btn-add-dialogue').disabled = false;
    // ถ้ามีปุ่มเพิ่มพื้นหลัง ให้เปิดใช้งานด้วย
    const btnAddBg = document.getElementById('btn-add-bg');
    if (btnAddBg) btnAddBg.disabled = false;

    currentPages.push({ bg: null, objects: [] });
    currentPageIndex = currentPages.length - 1;
    renderCanvas();
    updatePageList();
}

function switchPage(index) {
    currentPageIndex = index;
    // เช็คว่าหน้านี้มี choice หรือไม่
    const page = currentPages[currentPageIndex];
    isChoiceMode = page.objects.some(obj => obj.type === 'choice');
    
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

    // ถ้ามีพื้นหลัง ให้แสดงปุ่มลบพื้นหลังที่มุมขวาบน
    if (page.bg) {
        const bgDeleteBtn = document.createElement('button');
        bgDeleteBtn.className = 'bg-delete-btn';
        bgDeleteBtn.innerHTML = '-';
        bgDeleteBtn.onclick = deleteBackground;
        canvas.appendChild(bgDeleteBtn);
    }

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
    
    // --- สร้างปุ่มลบ ---
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.innerHTML = '-';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteObject(index);
    };
    div.appendChild(deleteBtn);

    // --- สร้างเนื้อหาตาม Type ---
    if (obj.type === 'dialogue') {
        div.style.zIndex = 100; 
        const dialogueDiv = document.createElement('div');
        dialogueDiv.className = 'dialogue-obj';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'dialog-text';
        textarea.placeholder = "พิมพ์บทพูด...";
        textarea.value = obj.text || '';
        textarea.addEventListener('input', (e) => { obj.text = e.target.value; });
        
        dialogueDiv.appendChild(textarea);
        div.appendChild(dialogueDiv);
        
    } else if (obj.type === 'choice') {
        div.style.zIndex = 150;
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-obj';
        
        // วาดตัวเลือก A, B, C...
        obj.options.forEach((opt, optIndex) => {
            const row = document.createElement('div');
            row.className = 'choice-item-row';
            row.innerHTML = `<div class="choice-label">${opt.label}.</div>`;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'choice-input';
            input.placeholder = "พิมพ์ตัวเลือก...";
            input.value = opt.text || '';
            input.addEventListener('input', (e) => { obj.options[optIndex].text = e.target.value; });
            
            row.appendChild(input);
            choiceDiv.appendChild(row);
        });

        // ปุ่มเพิ่มตัวเลือก
        if (obj.options.length < 26) { // A-Z สูงสุด 26
            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add-more-choice';
            addBtn.innerHTML = '➕ เพิ่มตัวเลือก';
            addBtn.onclick = (e) => {
                e.stopPropagation();
                addChoiceOption(obj);
            };
            choiceDiv.appendChild(addBtn);
        }

        div.appendChild(choiceDiv);

    } else {
        div.style.zIndex = 10; 
        const imgSrc = obj.image ? obj.image : 'https://via.placeholder.com/150?text=No+Image';
        div.innerHTML += `<img src="${imgSrc}" style="width:100%; pointer-events:none;">`;
    }
    
    canvas.appendChild(div);

    // --- ระบบลาก (interact.js) ---
    if (typeof interact !== 'undefined') {
        interact(div).draggable({
            // ป้องกันไม่ให้ลากเมื่อคลิกที่ textarea, input หรือปุ่มลบ
            ignoreFrom: 'textarea, input, .btn-delete, .btn-add-more-choice',
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
// 4. ระบบลบ (Delete)
// ==========================================
function deleteObject(index) {
    if(confirm("คุณต้องการลบสิ่งนี้ใช่หรือไม่?")) {
        currentPages[currentPageIndex].objects.splice(index, 1);
        // ถ้าลบ choice ออกหมด ให้ปลดล็อกโหมด
        if (currentPages[currentPageIndex].objects.length === 0 || 
            !currentPages[currentPageIndex].objects.some(o => o.type === 'choice')) {
            isChoiceMode = false;
            document.getElementById('btn-add-character').disabled = false;
            document.getElementById('btn-add-dialogue').disabled = false;
            const btnAddBg = document.getElementById('btn-add-bg');
            if (btnAddBg) btnAddBg.disabled = false;
        }
        renderCanvas();
    }
}

function deleteBackground() {
    if(confirm("คุณต้องการลบพื้นหลังนี้ใช่หรือไม่?")) {
        currentPages[currentPageIndex].bg = null;
        renderCanvas();
        updatePageList();
    }
}

// ==========================================
// 5. ระบบเพิ่มบทพูด / ตัวเลือก
// ==========================================
function addNewDialogue() {
    if (isChoiceMode) return alert("หน้านี้มีตัวเลือกอยู่แล้ว ไม่สามารถเพิ่มบทพูดได้");

    const newObj = {
        type: 'dialogue',
        text: '',
        x: 100, y: 100,
        order: currentPages[currentPageIndex].objects.length + 1
    };
    currentPages[currentPageIndex].objects.push(newObj);
    renderCanvas();
}

function addNewChoiceBox() {
    if (isChoiceMode) return alert("หน้านี้มีตัวเลือกอยู่แล้ว");
    
    isChoiceMode = true;
    currentChoiceCount = 2; // เริ่มที่ A, B
    
    // ล็อกปุ่มเพิ่มอื่นๆ
    document.getElementById('btn-add-character').disabled = true;
    document.getElementById('btn-add-dialogue').disabled = true;
    const btnAddBg = document.getElementById('btn-add-bg');
    if (btnAddBg) btnAddBg.disabled = true;

    const newObj = {
        type: 'choice',
        x: 200, y: 200,
        options: [
            { label: 'A', text: '' },
            { label: 'B', text: '' }
        ]
    };
    
    currentPages[currentPageIndex].objects.push(newObj);
    renderCanvas();
}

function addChoiceOption(choiceObj) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (choiceObj.options.length >= alphabet.length) return;
    
    const nextLabel = alphabet[choiceObj.options.length];
    choiceObj.options.push({ label: nextLabel, text: '' });
    renderCanvas();
}

// ==========================================
// 6. ระบบอัปโหลดรูปภาพ (พื้นหลัง/ตัวละคร)
// ==========================================
async function uploadImage(type) {
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
                    console.warn("ไม่สามารถตัดพื้นหลังได้", bgError);
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
        userNovelsList = data.novels || [];

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
        const res = await fetch(`${API}/novels/play/${novelId}`);
        const data = await res.json();
        if (!data.pages) throw new Error("ไม่พบข้อมูล");
        
        currentNovelId = novelId;
        const select = document.getElementById('select-existing-novel');
        currentNovelTitle = select.options[select.selectedIndex].text;
        
        const selectedNovel = userNovelsList.find(n => n.id == novelId);
        if (selectedNovel) {
            currentCoverUrl = selectedNovel.cover_image || '';
            const preview = document.getElementById('cover-preview');
            if (currentCoverUrl) {
                preview.src = currentCoverUrl;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
            document.getElementById('input-tags').value = selectedNovel.tags || '';
        }
        
        currentPages = data.pages.map(p => ({
            bg: p.background_image,
            objects: p.objects.map(o => ({
                type: o.type,
                image: o.image,
                text: o.text,
                x: o.x,
                y: o.y,
                order: o.order,
                // สำหรับ choice (ถ้า backend ส่งมา)
                options: o.options || [] 
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
document.getElementById('btn-add-character').onclick = () => uploadImage('character');
const btnAddBg = document.getElementById('btn-add-bg');
if (btnAddBg) btnAddBg.onclick = () => uploadImage('bg');

document.getElementById('btn-add-dialogue').onclick = addNewDialogue;
document.getElementById('btn-add-page').addEventListener('click', addNewPage);

// ปุ่มเพิ่มตัวเลือก (ถ้ามีใน HTML)
const btnAddChoice = document.getElementById('btn-add-choice');
if (btnAddChoice) {
    btnAddChoice.onclick = addNewChoiceBox;
}

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

    const tagsInput = document.getElementById('input-tags').value.trim();

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
                loadUserNovels(); 
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