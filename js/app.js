// ================= 1. 初始化地图 =================

// 【修正1】必须使用 https，否则 GitHub Pages 上地图会是一片灰
const normalMap = L.tileLayer('https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德地图'
});

const satMap = L.tileLayer('https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德卫星'
});

const map = L.map('map', { 
    zoomControl: false,
    layers: [normalMap]
}).setView([27.7017, 111.9963], 9);

L.control.zoom({ position: 'topright' }).addTo(map);

const baseMaps = {
    "🗺️ 电子地图": normalMap,
    "🛰️ 卫星影像": satMap
};
L.control.layers(baseMaps).addTo(map);


// ================= 2. 全局变量与状态 =================

const layers = {
    spots: L.layerGroup().addTo(map),
    borders: L.layerGroup().addTo(map)
};

let geoData = null; // 存放 loudi.json 数据

// 状态管理
let appState = {
    mode: 'tour',      
    category: 'all',   
    search: ''         
};


// ================= 3. 数据加载 =================

// 加载 loudi.json
fetch('loudi.json')
    .then(r => {
        if (!r.ok) throw new Error("HTTP error " + r.status);
        return r.json();
    })
    .then(d => {
        geoData = d;
        console.log("地图数据加载成功");
    })
    .catch(e => {
        console.warn("loudi.json 加载失败，历史疆域功能可能无法使用:", e);
    });

// 立即渲染一次
updateTourView();


// ================= 4. 核心逻辑：交互功能 =================

// 切换模式 (现代 vs 历史)
window.setMode = function(mode) {
    appState.mode = mode;
    
    // UI 更新
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    // 简单的判断来激活 Tab，避免复杂的 DOM 操作
    if(mode === 'tour') document.querySelector('.tab:nth-child(1)').classList.add('active');
    else document.querySelector('.tab:nth-child(2)').classList.add('active');
    
    document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${mode}`).classList.add('active');

    // 清理地图
    layers.spots.clearLayers();
    layers.borders.clearLayers();
    document.getElementById('timeline').classList.remove('show');

    if (mode === 'tour') {
        updateTourView();
    } else {
        document.getElementById('timeline').classList.add('show');
        loadHist(0); // 默认加载第一个时期
    }
};

// 【修正2】添加 filterSpots 函数，适配之前的 HTML
window.filterSpots = function(category, btn) {
    appState.category = category;
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    updateTourView();
};

// 【修正3】添加 searchSpots 函数，支持搜索
window.searchSpots = function(text) {
    appState.search = text.toLowerCase().trim();
    updateTourView();
};

// 综合更新视图 (核心)
function updateTourView() {
    layers.spots.clearLayers();
    layers.borders.clearLayers(); // 现代模式下如果有残留的边界也清除
    
    const listEl = document.getElementById('spotList');
    if(listEl) listEl.innerHTML = "";

    // 筛选数据
    const filtered = spots.filter(s => {
        const matchCat = appState.category === 'all' || (s.tags && s.tags.includes(appState.category)) || s.area === appState.category;
        const matchSearch = s.name.toLowerCase().includes(appState.search) || 
                            (s.desc && s.desc.toLowerCase().includes(appState.search));
        return matchCat && matchSearch;
    });

    if(listEl && filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;color:#999;padding:20px">未找到相关地点</div>`;
        return;
    }

    // 收集坐标用于自动缩放
    const bounds = [];

    filtered.forEach(s => {
        let color = "#10b981";
        if(s.tags && s.tags.includes("高校")) color = "#2563eb";
        else if(s.tags && s.tags.includes("学府")) color = "#d97706";
        else if(s.area.includes("新化")) color = "#8b5cf6";
        else if(s.area.includes("冷水江")) color = "#f97316";
        else if(s.area.includes("娄星")) color = "#ef4444";
        
        // 渲染列表
        if(listEl) {
            const item = document.createElement('div');
            item.className = 'spot-card';
            item.innerHTML = `
                <div class="s-head">
                    <div class="s-name">${s.icon} ${s.name}</div>
                    <div class="s-tag" style="color:${color};background:${color}20">${s.area}</div>
                </div>
                <p class="s-desc">${s.desc}</p>
            `;
            item.onclick = () => {
                map.flyTo([s.lat, s.lng], 14);
                marker.openPopup();
                // 手机端自动滚动
                if(window.innerWidth < 768) {
                    document.getElementById('map').scrollIntoView({behavior: "smooth"});
                }
            };
            listEl.appendChild(item);
        }

        // 渲染地图标记
        const marker = L.marker([s.lat, s.lng]).addTo(layers.spots);
        bounds.push([s.lat, s.lng]);

        marker.bindPopup(`
            <div class="pop-header" style="background:${color}">${s.name}</div>
            <div class="pop-body">
                ${s.desc}
                <a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" class="pop-link" style="background:${color}">🚀 导航去这里</a>
            </div>
        `);
    });

    // 【修正4】自动调整视野 (FitBounds)，解决找不到点的问题
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 }); 
    } else {
        // 如果没有点，默认回到娄底中心
        map.setView([27.7017, 111.9963], 9);
    }
}


// ================= 5. 历史模式逻辑 =================

window.loadHist = function(idx) {
    document.querySelectorAll('.t-btn').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
    });

    const d = historyEras[idx];
    if(!d) return; // 防止越界

    const titleEl = document.getElementById('h-title');
    const eraEl = document.getElementById('h-era');
    const descEl = document.getElementById('h-desc');
    
    if(titleEl) titleEl.innerText = d.title;
    if(eraEl) eraEl.innerText = d.year;
    if(descEl) descEl.innerHTML = d.desc;

    layers.spots.clearLayers();
    layers.borders.clearLayers();

    // 绘制历史边界
    if (geoData) {
        L.geoJSON(geoData, {
            style: f => {
                const name = f.properties.name || "";
                // 查找匹配的组
                let group = d.groups.find(g => {
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
                if(f.properties.name) {
                     layer.bindTooltip(f.properties.name, {
                        permanent: true, 
                        direction: 'center',
                        className: 'map-label' 
                    });
                }
            }
        }).addTo(layers.borders);
    }

    map.flyTo(d.center, d.zoom);
};
