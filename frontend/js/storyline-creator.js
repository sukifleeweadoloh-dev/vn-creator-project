// ==========================================
// Story Line Creator Logic
// ==========================================

// 1. ตัวแปรตั้งต้น
const urlParams = new URLSearchParams(window.location.search);
const novelId = urlParams.get('id');

let pagesData = []; 
let nodes = [];     
let connections = []; 

const board = document.getElementById('board');
const svgOverlay = document.getElementById('svg-overlay');
const cardsContainer = document.getElementById('cards-container');
const loadingText = document.getElementById('loading');
const btnAddGolden = document.getElementById('btn-add-golden');
const btnSaveStoryline = document.getElementById('btn-save-storyline');
const boardContainer = document.getElementById('board-container');

// ตรวจสอบว่ามีการโหลด config.js หรือยัง
if (typeof API === 'undefined') {
    console.error("❌ ไม่พบตัวแปร API กรุณาตรวจสอบว่ามีการโหลด js/config.js ใน HTML หรือไม่");
}

if (!novelId) {
    alert("ไม่พบข้อมูลนิยาย");
    window.location.href = 'create.html';
}

// ==========================================
// 2. ฟังก์ชันโหลดข้อมูลจาก Database
// ==========================================
async function fetchStoryline() {
    try {
        const res = await fetch(`${API}/novels/${novelId}/storyline`);
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        
        const data = await res.json();
        pagesData = data.pages || [];
        
        if (pagesData.length === 0) {
            loadingText.innerText = "ยังไม่มีหน้าในเรื่องนี้ กรุณากลับไปสร้างหน้าในหน้า Create ก่อน";
            return;
        }

        // แปลง Pages เป็น Nodes
        nodes = pagesData.map((p, index) => {
            const defaultX = 100 + (index * 200);
            const defaultY = 400;
            
            return {
                id: `page_${p.id}`,
                pageId: p.id,
                title: `หน้า ${p.order_index}`,
                x: p.storyline_x || defaultX,
                y: p.storyline_y || defaultY,
                type: 'page',
                choices: p.choices || []
            };
        });

        // สร้าง Connections อัตโนมัติ (Auto Arrows)
        connections = [];
        
        // 1. เชื่อมตามลำดับหน้า (หน้า 1 -> 2 -> 3)
        for (let i = 0; i < nodes.length - 1; i++) {
            connections.push({
                from: nodes[i].id,
                to: nodes[i+1].id,
                type: 'black'
            });
        }

        // 2. เชื่อมตาม Choice ที่มี target_page_id
        pagesData.forEach((p) => {
            const fromNodeId = `page_${p.id}`;
            if (p.choices) {
                p.choices.forEach(choice => {
                    if (choice.target_page_id) {
                        connections.push({
                            from: fromNodeId,
                            to: `page_${choice.target_page_id}`,
                            type: 'black',
                            isChoice: true
                        });
                    }
                });
            }
        });

        // แสดงผล
        loadingText.style.display = 'none';
        btnAddGolden.disabled = false;
        btnSaveStoryline.disabled = false;
        renderBoard();

    } catch (err) {
        console.error(err);
        loadingText.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
}

// ==========================================
// 3. ฟังก์ชัน Render (วาดการ์ดและเส้น)
// ==========================================
function formatLabel(text) {
    if (!text) return "";
    if (text.length > 5) return text.substring(0, 5) + '...';
    return text;
}

function renderBoard() {
    cardsContainer.innerHTML = '';
    
    nodes.forEach(node => {
        const card = document.createElement('div');
        card.className = `card ${node.type === 'gold' ? 'card-gold' : ''}`;
        card.id = node.id;
        card.style.left = `${node.x}px`;
        card.style.top = `${node.y}px`;

        if (node.type === 'page') {
            let subText = '';
            if (node.choices.length > 0) {
                subText = `<div class="sub-text">ตัวเลือก: ${formatLabel(node.choices[0].text || 'A')}...</div>`;
            }

            card.innerHTML = `
                <div class="main-text">${node.title}</div>
                ${subText}
            `;
        } else if (node.type === 'gold') {
            card.innerHTML = `
                <div class="main-text">บท</div>
                <div class="sub-text">${formatLabel(node.title)}</div>
            `;
        }

        cardsContainer.appendChild(card);
        makeDraggable(card, node);
    });

    updateAllLines();
}

// ==========================================
// 4. ระบบลากการ์ด (Sticky Arrows)
// ==========================================
function makeDraggable(cardElement, nodeData) {
    if (typeof interact === 'undefined') return;

    interact(cardElement).draggable({
        listeners: {
            start(event) {
                document.querySelectorAll('.card').forEach(c => c.style.zIndex = 10);
                event.target.style.zIndex = 100;
            },
            move(event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
                
                // อัปเดตเส้นทันทีที่ลาก
                updateAllLines();
            },
            end(event) {
                const target = event.target;
                const x = parseFloat(target.getAttribute('data-x')) || 0;
                const y = parseFloat(target.getAttribute('data-y')) || 0;
                
                // อัปเดตตำแหน่งสุดท้ายลง Data (ใช้สำหรับ Save)
                const realNode = nodes.find(n => n.id === nodeData.id);
                if(realNode) {
                    realNode.x = target.offsetLeft + x;
                    realNode.y = target.offsetTop + y;
                }
            }
        }
    });
}

// ==========================================
// 5. ฟังก์ชันวาดเส้น (SVG)
// ==========================================
function updateAllLines() {
    svgOverlay.innerHTML = ''; 

    connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);

        if (!fromNode || !toNode) return;

        const cardW = 130;
        const cardH = 180;
        
        // ดึงตำแหน่งปัจจุบัน (รวมค่าที่กำลังลาก)
        const getPos = (node) => {
            const el = document.getElementById(node.id);
            if(!el) return {x: node.x, y: node.y};
            const tx = parseFloat(el.getAttribute('data-x')) || 0;
            const ty = parseFloat(el.getAttribute('data-y')) || 0;
            return { x: el.offsetLeft + tx, y: el.offsetTop + ty };
        };

        const fromPos = getPos(fromNode);
        const toPos = getPos(toNode);

        const fromCenterX = fromPos.x + (cardW / 2);
        const fromCenterY = fromPos.y + (cardH / 2);
        const toCenterX = toPos.x + (cardW / 2);
        const toCenterY = toPos.y + (cardH / 2);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", fromCenterX);
        line.setAttribute("y1", fromCenterY);
        line.setAttribute("x2", toCenterX);
        line.setAttribute("y2", toCenterY);
        line.setAttribute("class", conn.type === 'gold' ? "path-gold" : "path-black");
        
        const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
        const arrowLength = 20;
        const arrowTipX = toCenterX;
        const arrowTipY = toCenterY;
        const arrowBase1X = arrowTipX - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowBase1Y = arrowTipY - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowBase2X = arrowTipX - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowBase2Y = arrowTipY - arrowLength * Math.sin(angle + Math.PI / 6);

        const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        arrowHead.setAttribute("points", `${arrowTipX},${arrowTipY} ${arrowBase1X},${arrowBase1Y} ${arrowBase2X},${arrowBase2Y}`);
        arrowHead.setAttribute("class", conn.type === 'gold' ? "arrow-head-gold" : "arrow-head");

        svgOverlay.appendChild(line);
        svgOverlay.appendChild(arrowHead);
    });
}

// ==========================================
// 6. ปุ่มเพิ่มลูกศรสีทอง (Golden Arrow)
// ==========================================
let goldNodeCount = 0;
btnAddGolden.addEventListener('click', () => {
    const nextChapterName = prompt("ระบุชื่อบทถัดไปที่ต้องการเชื่อมต่อ (หรือพิมพ์ 'จบ' เพื่อจบบท):");
    if (!nextChapterName) return;

    const newId = `gold_${Date.now()}`;
    const newX = 1200 + (goldNodeCount * 50);
    const newY = 400 + (goldNodeCount * 50);
    goldNodeCount++;

    // สร้าง Node ทอง
    const newNode = { 
        id: newId, 
        title: nextChapterName, 
        x: newX, 
        y: newY, 
        type: 'gold' 
    };
    nodes.push(newNode);

    // เชื่อมจาก Node สุดท้าย (หน้าสุดท้าย) มาที่ Node ทองนี้
    const lastPageNode = nodes.filter(n => n.type === 'page').pop();
    if (lastPageNode) {
        connections.push({ from: lastPageNode.id, to: newId, type: 'gold' });
    }

    renderBoard();
});

// ==========================================
// 7. บันทึกตำแหน่ง (Save) - เชื่อมต่อ API จริง
// ==========================================
btnSaveStoryline.addEventListener('click', async () => {
    try {
        btnSaveStoryline.innerText = "กำลังบันทึก...";
        btnSaveStoryline.disabled = true;

        // รวบรวมข้อมูลตำแหน่งของเฉพาะการ์ดที่เป็น Page (ไม่เอาปุ่มทอง)
        const pagesToSave = nodes
            .filter(n => n.type === 'page')
            .map(n => ({
                id: n.pageId,
                x: n.x,
                y: n.y
            }));

        // ส่งข้อมูลไปยัง Backend
        const res = await fetch(`${API}/novels/storyline/save-positions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                novelId: parseInt(novelId),
                pages: pagesToSave
            })
        });

        if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");

        alert("บันทึกผัง Story Line สำเร็จ!");
    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
    } finally {
        btnSaveStoryline.innerText = "💾 บันทึกผัง";
        btnSaveStoryline.disabled = false;
    }
});

// ==========================================
// 8. ระบบ Pan (ลากพื้นที่ว่างเพื่อเลื่อนบอร์ด)
// ==========================================
let isPanning = false;
let startX, startY, scrollLeft, scrollTop;

boardContainer.addEventListener('mousedown', (e) => {
    if (e.target.closest('.card')) return; // ถ้าคลิกที่การ์ด ไม่ต้อง Pan
    
    isPanning = true;
    boardContainer.style.cursor = 'grabbing';
    startX = e.pageX - boardContainer.offsetLeft;
    startY = e.pageY - boardContainer.offsetTop;
    scrollLeft = boardContainer.scrollLeft;
    scrollTop = boardContainer.scrollTop;
});

boardContainer.addEventListener('mouseleave', () => { isPanning = false; boardContainer.style.cursor = 'grab'; });
boardContainer.addEventListener('mouseup', () => { isPanning = false; boardContainer.style.cursor = 'grab'; });

boardContainer.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const x = e.pageX - boardContainer.offsetLeft;
    const y = e.pageY - boardContainer.offsetTop;
    boardContainer.scrollLeft = scrollLeft - (x - startX) * 1.5;
    boardContainer.scrollTop = scrollTop - (y - startY) * 1.5;
});

// ==========================================
// 9. เริ่มต้นโหลดข้อมูล
// ==========================================
fetchStoryline();