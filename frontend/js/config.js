// ==========================================
// การตั้งค่าส่วนกลางของ Frontend
// ==========================================

const CONFIG = {
    // 1. สำหรับทดสอบในเครื่อง (Local)
    API_URL: 'http://localhost:3000/api',
    
    // 2. สำหรับใช้งานจริง (Public) 
    // เมื่อคุณ Deploy Backend ขึ้น Cloud เสร็จแล้ว ให้นำ URL มาวางแทนบรรทัดบน แล้วลบบรรทัดล่างนี้ทิ้ง
    // API_URL: 'https://your-backend-name.onrender.com/api'
};

// สร้างตัวแปร Global ชื่อ API เพื่อให้ไฟล์อื่นๆ เรียกใช้ได้ง่ายๆ
const API = CONFIG.API_URL;