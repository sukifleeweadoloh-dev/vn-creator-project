// ==========================================
// Create Novel Editor Logic
// ==========================================

const canvas = document.getElementById('canvas');
let currentPages = []; 
let currentPageIndex = 0;
let currentNovelId = null; 
let currentNovelTitle = ""; 
let currentCoverUrl = ""; 
let currentChapterCoverUrl = "";
let userNovelsList = [];  
let isChoiceMode = false; 
let pageTempIdCounter = 1; // ใช้สำหรับสร้าง Temp ID ให้แต่ละหน้า

// ตรวจสอบว่ามีการโหลด config.js หรือยัง
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
// 2. ระบบจัดการหน้า (Pages Management)
// ==========================================
function addNewPage() {
    // รีเซ็ตสถานะโหมดตัวเลือก
    isChoiceMode = false;
    toggleSidebarButtons(false); // เปิดใช้งานปุ่มเพิ่มของ
    
    // สร้างหน้าใหม่พร้อม Temp ID สำหรับการเชื่อมโยง
    const newPage = { 
        tempId: 'page_' + pageTempIdCounter++, 
        bg: null, 
        objects: [] 
    };
    
    currentPages.push(newPage);
    currentPageIndex = currentPages.length - 1;
    renderCanvas();
    updatePageList();
}

function switchPage(index) {
    currentPageIndex = index;
    // เช็คว่าหน้านี้มี Choice หรือไม่
    const page = currentPages[currentPageIndex];
    isChoiceMode = page.objects.some(obj => obj.type === 'choice');
    toggleSidebarButtons(isChoiceMode);
    
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
            <span style="position:absolute; bottom:2px; right:5px; color:#fff; font-size:12px; background:rgba(0,0,0,0.5); padding:2px 5px; border-radius:5px;">หน้า ${index + 1}</span>
        `;
        listContainer.appendChild(thumb);
    });
}

// เปิด/ปิด ปุ่มเพิ่มของ ตามสถานะ Choice Mode
function toggleSidebarButtons(disable) {
    document.getElementById('btn-add-character').disabled = disable;
    document.getElementById('btn-add-dialogue').disabled = disable;
    // ปุ่มเพิ่มพื้นหลัง (ถ้าอยากล็อกด้วย)
    document.getElementById('btn-add-bg').disabled = disable; 
}

// ==========================================
// 3. ระบบวาด Canvas และ Object
// ==========================================
function renderCanvas() {
    const page = currentPages[currentPageIndex];
    if (!page) return;
    
    canvas.innerHTML = '';
    canvas.style.backgroundImage = page.bg ? `url(${page.bg})` : 'none';
    canvas.style.backgroundColor = '#000'; 

    // ถ้ามีพื้นหลัง ให้แสดงปุ่มลบพื้นหลัง
    if (page.bg) {
        const bgDeleteBtn = document.createElement('button');
        bgDeleteBtn.className = 'bg-delete-btn';
        bgDeleteBtn.innerHTML = '-';
        bgDeleteBtn.title = "ลบพื้นหลัง";
        bgDeleteBtn.onclick = deleteBackground;
        canvas.appendChild(bgDeleteBtn);
    }

    if (page.objects && Array.isArray(page.objects)) {
        page.objects.forEach((obj, index) => {
            createVisualObject(obj, index);
        });
    }
}

function createVisualObject(obj, index) {
    const div = document.createElement('div');
    div.className = 'draggable-obj';
    div.style.transform = `translate(${obj.x}px, ${obj.y}px)`;
    div.setAttribute('data-x', obj.x);
    div.setAttribute('data-y', obj.y);
    
    // ปุ่มลบ Object
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.innerHTML = '-';
    deleteBtn.onclick = (e) => { e.stopPropagation(); deleteObject(index); };
    div.appendChild(deleteBtn);

    // สร้างเนื้อหาตามประเภท
    if (obj.type === 'dialogue') {
        div.style.zIndex = 100; 
        const dialogueDiv = document.createElement('div');
        dialogueDiv.className = 'dialogue-obj';
        
        const textarea = document.createElement('textarea');
        textarea.placeholder = "พิมพ์บทพูด...";
        textarea.value = obj.text || '';
        textarea.addEventListener('input', (e) => { obj.text = e.target.value; });
        
        dialogueDiv.appendChild(textarea);
        div.appendChild(dialogueDiv);
        
    } else if (obj.type === 'choice') {
        div.style.zIndex = 150;
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-obj';
        
        // วาด Input ของแต่ละตัวเลือก (A, B, C...)
        obj.options.forEach((opt, optIndex) => {
            const row = document.createElement('div');
            row.className = 'choice-item-row';
            
            // สร้าง Dropdown ให้เลือกว่าตัวเลือกนี้จะไปหน้าไหน
            const pageOptions = currentPages.map((p, i) => 
                `<option value="${p.tempId}" ${opt.target_temp_id === p.tempId ? 'selected' : ''}>ไปหน้า ${i + 1}</option>`
            ).join('');

            row.innerHTML = `
                <div class="choice-label">${opt.label}.</div>
                <input type="text" class="choice-input" placeholder="ข้อความตัวเลือก..." value="${opt.text || ''}" data-index="${optIndex}">
                <select class="choice-select" data-index="${optIndex}" style="padding:5px; border-radius:5px; font-family:'Prompt'; max-width:100px;">
                    <option value="">-- ไปหน้า --</option>
                    ${pageOptions}
                </select>
            `;
            
            // ผูก Event เมื่อพิมพ์ข้อความ
            row.querySelector('.choice-input').addEventListener('input', (e) => {
                obj.options[optIndex].text = e.target.value;
            });

            // ผูก Event เมื่อเลือกหน้าเป้าหมาย
            row.querySelector('.choice-select').addEventListener('change', (e) => {
                obj.options[optIndex].target_temp_id = e.target.value;
            });
            
            choiceDiv.appendChild(row);
        });

        // ปุ่มเพิ่มตัวเลือก (ถ้ายังไม่ถึง Z)
        if (obj.options.length < 26) { 
            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add-more-choice';
            addBtn.innerHTML = '➕ เพิ่มตัวเลือก';
            addBtn.onclick = (e) => { e.stopPropagation(); addChoiceOption(obj); };
            choiceDiv.appendChild(addBtn);
        }

        div.appendChild(choiceDiv);

    } else if (obj.type === 'character') {
        div.style.zIndex = 10; 
        const img = document.createElement('img');
        img.src = obj.image;
        img.style.width = '100%';
        img.style.pointerEvents = 'none';
        div.appendChild(img);
    }
    
    canvas.appendChild(div);

    // ระบบ Drag & Drop
    if (typeof interact !== 'undefined') {
        interact(div).draggable({
            // ไม่ให้ลากเมื่อคลิกที่ input, textarea, select, หรือปุ่ม
            ignoreFrom: 'textarea, input, select, .btn-delete, .btn-add-more-choice',
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
    if(confirm("ต้องการลบสิ่งนี้ใช่หรือไม่?")) {
        const page = currentPages[currentPageIndex];
        page.objects.splice(index, 1);
        
        // ถ้าลบ choice ออกจนหมด ให้ปลดล็อกโหมด
        if (!page.objects.some(o => o.type === 'choice')) {
            isChoiceMode = false;
            toggleSidebarButtons(false);
        }
        renderCanvas();
    }
}

function deleteBackground() {
    if(confirm("ต้องการลบพื้นหลังนี้ใช่หรือไม่?")) {
        currentPages[currentPageIndex].bg = null;
        renderCanvas();
        updatePageList();
    }
}

// ==========================================
// 5. ระบบเพิ่ม Object
// ==========================================
document.getElementById('btn-add-dialogue').onclick = () => {
    if (isChoiceMode) return alert("หน้านี้มีตัวเลือกแล้ว ไม่สามารถเพิ่มบทพูดได้");
    
    currentPages[currentPageIndex].objects.push({
        type: 'dialogue',
        text: '',
        x: 100, y: 100,
        order: currentPages[currentPageIndex].objects.length + 1
    });
    renderCanvas();
};

document.getElementById('btn-add-choice').onclick = () => {
    if (isChoiceMode) return alert("หน้านี้มีตัวเลือกอยู่แล้ว");
    
    isChoiceMode = true;
    toggleSidebarButtons(true); // ล็อกปุ่มอื่น

    currentPages[currentPageIndex].objects.push({
        type: 'choice',
        x: 200, y: 200,
        options: [
            { label: 'A', text: '', target_temp_id: '' },
            { label: 'B', text: '', target_temp_id: '' }
        ]
    });
    renderCanvas();
};

function addChoiceOption(choiceObj) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (choiceObj.options.length >= alphabet.length) return;
    
    const nextLabel = alphabet[choiceObj.options.length];
    choiceObj.options.push({ label: nextLabel, text: '', target_temp_id: '' });
    renderCanvas();
}

// ==========================================
// 6. ระบบอัปโหลดรูปภาพ
// ==========================================
async function uploadImage(type, inputId) {
    const input = document.getElementById(inputId);
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            let finalBlob = file; 
            // ตัดพื้นหลังเฉพาะตัวละคร
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
            const data = await res.json();
            if (!data.url) throw new Error("ไม่ได้รับ URL");

            // อัปเดตข้อมูลตามประเภท
            if (type === 'bg') {
                currentPages[currentPageIndex].bg = data.url;
                renderCanvas();
                updatePageList();
            } else if (type === 'cover') {
                currentCoverUrl = data.url;
                document.getElementById('cover-preview').src = currentCoverUrl;
                document.getElementById('cover-preview').style.display = 'block';
            } else if (type === 'chapter-cover') {
                currentChapterCoverUrl = data.url;
                document.getElementById('chapter-cover-preview').src = currentChapterCoverUrl;
                document.getElementById('chapter-cover-preview').style.display = 'block';
            } else if (type === 'character') {
                currentPages[currentPageIndex].objects.push({
                    type: 'character',
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

// ผูกปุ่มอัปโหลด
document.getElementById('btn-add-bg').onclick = () => uploadImage('bg', 'bg-input-hidden'); // สมมติว่ามี input ซ่อน
document.getElementById('btn-upload-cover').onclick = () => uploadImage('cover', 'cover-input');
document.getElementById('btn-upload-chapter-cover').onclick = () => uploadImage('chapter-cover', 'chapter-cover-input');

// สร้าง input ซ่อนสำหรับพื้นหลัง (ถ้าใน HTML ไม่มี)
const bgInput = document.createElement('input');
bgInput.type = 'file';
bgInput.id = 'bg-input-hidden';
bgInput.accept = 'image/*';
bgInput.style.display = 'none';
document.body.appendChild(bgInput);

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
        // รีเซ็ตสร้างใหม่
        currentNovelId = null;
        currentNovelTitle = "";
        currentCoverUrl = "";
        currentPages = [];
        pageTempIdCounter = 1;
        document.getElementById('cover-preview').style.display = 'none';
        document.getElementById('input-tags').value = "";
        addNewPage();
        return;
    }
    
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(`${API}/novels/play/${novelId}`);
        const data = await res.json();
        
        currentNovelId = novelId;
        const select = document.getElementById('select-existing-novel');
        currentNovelTitle = select.options[select.selectedIndex].text;
        
        const selectedNovel = userNovelsList.find(n => n.id == novelId);
        if (selectedNovel) {
            currentCoverUrl = selectedNovel.cover_image || '';
            if (currentCoverUrl) {
                document.getElementById('cover-preview').src = currentCoverUrl;
                document.getElementById('cover-preview').style.display = 'block';
            }
            document.getElementById('input-tags').value = selectedNovel.tags || '';
        }
        
        // Map ข้อมูลจาก DB กลับเป็น Format ของ Editor
        pageTempIdCounter = 1;
        currentPages = data.pages.map(p => {
            const tempId = 'page_' + pageTempIdCounter++;
            return {
                tempId: tempId,
                realId: p.id, // เก็บ ID จริงไว้ด้วย
                bg: p.background_image,
                storyline_x: p.storyline_x || 100,
                storyline_y: p.storyline_y || 100,
                objects: p.objects.map(o => ({
                    type: o.type,
                    image: o.image,
                    text: o.text,
                    x: o.x,
                    y: o.y,
                    order: o.order,
                    options: o.options || [], // สำหรับ choice
                    target_temp_id: o.target_page_id ? 'page_' + o.target_page_id : '' // สมมติว่า ID ตรงกัน
                }))
            };
        });

        currentPageIndex = 0;
        isChoiceMode = currentPages[0].objects.some(obj => obj.type === 'choice');
        toggleSidebarButtons(isChoiceMode);
        renderCanvas();
        updatePageList();
    } catch(err) {
        alert("โหลดข้อมูลเรื่องเดิมไม่สำเร็จ");
    } finally {
        document.body.style.cursor = 'default';
    }
});

// ==========================================
// 8. ปุ่ม Save และ Play
// ==========================================
document.getElementById('btn-go-storyline').onclick = () => {
    if (!currentNovelId) {
        alert("กรุณาบันทึกเรื่องก่อนไปหน้า Story Line");
        return;
    }
    window.location.href = `storyline-creator.html?id=${currentNovelId}`;
};

document.getElementById('btn-play').onclick = () => {
    if (!currentNovelId) return alert("กรุณาบันทึกนิยายก่อนกดเล่น");
    window.location.href = `play.html?id=${currentNovelId}`;
};

document.getElementById('btn-save').onclick = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return alert("กรุณาเข้าสู่ระบบก่อนบันทึกนิยาย");

    let title = prompt("ตั้งชื่อเรื่องของคุณ:", currentNovelId ? currentNovelTitle : "");
    if (!title) return;

    const tagsInput = document.getElementById('input-tags').value.trim();

    // จัดเตรียม Payload
    const payload = { 
        title: title, 
        author_id: user.id, 
        pages: currentPages, // ส่ง Temp ID ไปให้ Backend Map
        cover_image: currentCoverUrl || null,
        tags: tagsInput || null,
        chapter_cover_image: currentChapterCoverUrl || null // ส่งรูปปกตอนไปด้วย
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
};

// เริ่มระบบ
initEditor();