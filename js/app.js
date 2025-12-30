// ================= 1. 初始化地圖 =================

const normalMap = L.tileLayer('http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德地圖'
});

const satMap = L.tileLayer('https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德衛星'
});

// 默認視圖：婁底市中心
const map = L.map('map', { 
    zoomControl: false,
    layers: [normalMap]
}).setView([27.7017, 111.9963], 9);

L.control.zoom({ position: 'topright' }).addTo(map);

const baseMaps = {
    "🗺️ 電子地圖": normalMap,
    "🛰️ 衛星影像": satMap
};
L.control.layers(baseMaps).addTo(map);

// 【實用工具】點擊地圖獲取座標（開發調試用）
map.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    console.log(`座標已複製: [${lng}, ${lat}]`); // 方便複製到代碼
    L.popup()
        .setLatLng(e.latlng)
        .setContent(`座標: ${lng}, ${lat}<br><span style="font-size:12px;color:#888">已輸出至控制台(F12)</span>`)
        .openOn(map);
});

// ================= 2. 全局狀態管理 =================
// 存儲 GeoJSON 數據
let geoData = null; 
// 圖層管理
const layers = {
    spots: L.layerGroup().addTo(map),  // 景點層
    borders: L.layerGroup().addTo(map) // 邊界層
};

// 當前篩選狀態
let appState = {
    mode: 'tour',      // 'tour' (現代) 或 'hist' (歷史)
    category: 'all',   // 標籤過濾：all, 高校, 新化...
    search: ''         // 搜索關鍵詞
};

// ================= 3. 數據加載 =================
// 異步加載 GeoJSON 文件 (確保你上傳了這些文件)
Promise.all([
    fetch('loudi.json').then(r => r.json()), // 縣級邊界
    fetch('hunan.json').then(r => r.json())  // 市級邊界(如果需要)
]).then(([loudiData, hunanData]) => {
    // 這裡我們主要用 loudi.json 做歷史演示
    geoData = loudiData; 
    console.log("地圖數據加載完成");
}).catch(e => console.error("地圖數據加載失敗:", e));


// ================= 4. 核心邏輯：導覽模式 =================

// 切換主模式
window.setMode = function(mode) {
    appState.mode = mode;
    
    // UI 切換
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${mode}`).classList.add('active');

    // 地圖清理
    layers.spots.clearLayers();
    layers.borders.clearLayers();
    document.getElementById('timeline').classList.remove('show');

    if (mode === 'tour') {
        updateTourView();
    } else {
        document.getElementById('timeline').classList.add('show');
        // 默認加載第一個歷史時期
        loadHist(0);
    }
};

// 篩選標籤點擊
window.filterSpots = function(category, btn) {
    appState.category = category;
    
    // 更新按鈕樣式
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');

    updateTourView();
};

// 搜索框輸入
window.searchSpots = function(text) {
    appState.search = text.toLowerCase().trim();
    updateTourView();
};

// 綜合更新視圖（核心函數）
function updateTourView() {
    layers.spots.clearLayers();
    const listEl = document.getElementById('spotList');
    listEl.innerHTML = "";

    // 多重過濾：標籤 + 搜索詞
    const filtered = spots.filter(s => {
        // 1. 檢查標籤
        const matchCat = appState.category === 'all' || s.tags.includes(appState.category) || s.area === appState.category;
        // 2. 檢查搜索
        const matchSearch = s.name.toLowerCase().includes(appState.search) || 
                            s.desc.toLowerCase().includes(appState.search);
        return matchCat && matchSearch;
    });

    // 如果沒有結果
    if(filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;color:#999;padding:20px">未找到相關地點</div>`;
        return;
    }

    // 收集所有座標用於自動縮放
    const bounds = [];

    filtered.forEach(s => {
        const color = getTagColor(s.tags); // 獲取顏色
        
        // 1. 渲染列表項
        const item = document.createElement('div');
        item.className = 'spot-card';
        item.innerHTML = `
            <div class="s-head">
                <div class="s-name">${s.icon} ${s.name}</div>
                <div class="s-tag" style="color:${color};background:${color}20">${s.tags}</div>
            </div>
            <p class="s-desc">${s.desc}</p>
        `;
        // 點擊列表跳轉地圖
        item.onclick = () => {
            map.flyTo([s.lat, s.lng], 14);
            marker.openPopup();
            // 在手機端點擊後自動滾動到地圖（可選）
            if(window.innerWidth < 768) {
                document.getElementById('map').scrollIntoView({behavior: "smooth"});
            }
        };
        listEl.appendChild(item);

        // 2. 渲染地圖標記
        const marker = L.marker([s.lat, s.lng]).addTo(layers.spots);
        bounds.push([s.lat, s.lng]);

        // 綁定彈窗
        marker.bindPopup(`
            <div class="pop-header" style="background:${color}">${s.name}</div>
            <div class="pop-body">
                ${s.desc}
                <a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" class="pop-link" style="background:${color}">🚀 導航去這裡</a>
            </div>
        `);
    });

    // 【核心優化】自動調整地圖視野以包含所有篩選出的點
    if (bounds.length > 0) {
        // padding 避免點貼在邊緣
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 }); 
    }
}

// 輔助函數：根據標籤獲取顏色
function getTagColor(tag) {
    if(tag.includes("高校")) return "#2563eb"; // 藍
    if(tag.includes("學府")) return "#d97706"; // 橙
    return "#10b981"; // 綠（默認）
}

// ================= 5. 歷史溯源模式 =================

window.loadHist = function(idx) {
    // 按鈕樣式
    document.querySelectorAll('.t-btn').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
    });

    const d = historyEras[idx]; // 來自 data.js
    if(!d) return;

    // 更新文字
    document.getElementById('h-title').innerText = d.title;
    document.getElementById('h-era').innerText = d.year;
    document.getElementById('h-desc').innerHTML = d.desc;

    // 清理圖層
    layers.spots.clearLayers();
    layers.borders.clearLayers();

    // 繪製歷史邊界
    if (geoData) {
        L.geoJSON(geoData, {
            style: f => {
                const name = f.properties.name || "";
                // 查找該地區在當前歷史時期屬於哪個組
                let group = d.groups.find(g => {
                    // 模糊匹配：比如 "新化" 匹配 "新化縣"
                    return g.members.some(m => name.includes(m));
                });
                
                return {
                    color: "#fff",
                    weight: 1,
                    fillColor: group ? group.color : "#ccc",
                    fillOpacity: 0.6
                };
            },
            onEachFeature: (f, layer) => {
                // 顯示地名 Tooltip
                layer.bindTooltip(f.properties.name, {
                    permanent: true, 
                    direction: 'center',
                    className: 'map-label' // 你可以在 css 加一個樣式去掉背景
                });
            }
        }).addTo(layers.borders);
    }

    // 視圖跳轉到該歷史時期的中心
    map.flyTo(d.center, d.zoom);
};

// 初始化：加載第一次視圖
updateTourView();
