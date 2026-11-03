const viewsHTML = {
    home: ``,

    search: `
        <div style="padding: 40px;">
            <h2 style="margin-bottom: 20px;">ค้นหานิยาย</h2>
            <input type="text" id="search-input" placeholder="พิมพ์ชื่อเรื่อง..." style="width:100%; max-width:500px; padding:15px; border-radius:30px; border:1px solid #ccc; margin-bottom:20px; outline:none;">
            <button onclick="performSearch()" style="padding:15px 30px; border-radius:30px; background:#6366f1; color:white; border:none; cursor:pointer;">ค้นหา</button>
            <div id="search-results" style="margin-top:30px; display:flex; gap:20px; flex-wrap:wrap;"></div>
        </div>
    `,

    // ต้องมี id="popular-list" ตรงนี้
    popular: `
        <div style="padding: 40px;">
            <h2 style="margin-bottom: 20px;">นิยายยอดนิยม</h2>
            <div id="popular-list" style="display:flex; gap:20px; flex-wrap:wrap;"></div>
        </div>
    `,

    // ต้องมี id="following-list" ตรงนี้
    following: `
        <div style="padding: 40px;">
            <h2 style="margin-bottom: 20px;">รายชื่อที่คุณติดตาม</h2>
            <div id="following-list" style="display:flex; gap:20px; flex-wrap:wrap;"></div>
        </div>
    `,

    profile: `` // ไม่ใช้แล้วเพราะเราจะ Redirect ไป profile.html
};