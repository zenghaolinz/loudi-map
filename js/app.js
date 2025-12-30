// ================= 1. 初始化地图 =================

// 【关键修复】这里必须用 https，否则在 GitHub 上地图会是一片灰
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

// 【实用工具】点击地图获取坐标
map.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    console.log(`[${lng}, ${lat}]`);
    L.popup()
        .setLatLng(e.latlng)
        .setContent(`坐标: ${lng}, ${lat}<br><span style="font-size:12px;color:#888">已输出至控制台</span>`)
        .openOn(map);
});

// ================= 2. 全局状态与数据 =================

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

// 加载 loudi.json (确保文件名大小写一致！loudi.json)
fetch('loudi.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`无法找到 loudi.json (状态码: ${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        geoData = data;
        console.log("历史地图数据加载成功");
    })
    .catch(err => {
        console.warn("历史地图加载失败:", err);
        // 如果失败，给用户一个提示，不要默默失败
        if(window.location.hostname.includes('github')) {
            alert("⚠️ 提示：如果历史疆域无法显示，请检查 loudi.json 是否已上传，且文件名全是小写。");
        }
    });

// 立即渲染一次导览列表
updateTourView();


// ================= 4. 核心逻辑：导览模式 =================

// 切换模式 (现代 vs 历史)
window.setMode = function(mode) {
    appState.mode = mode;
    
    // UI 更新
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
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

// 标签过滤
window.filterSpots = function(category, btn) {
    appState.category = category;
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    updateTourView();
};

// 搜索功能
window.searchSpots = function(text) {
    appState.search = text.toLowerCase().trim();
    updateTourView();
};

// 更新视图 (核心)
function updateTourView() {
    layers.spots.clearLayers();
    const listEl = document.getElementById('spotList');
    listEl.innerHTML = "";

    // 筛选数据
    const filtered = spots.filter(s => {
        // 简体字匹配
        const matchCat = appState.category === 'all' || s.tags.includes(appState.category) || s.area === appState.category;
        const matchSearch = s.name.toLowerCase().includes(appState.search) || 
                            s.desc.toLowerCase().includes(appState.search);
        return matchCat && matchSearch;
    });

    if(filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;color:#999;padding:20px">未找到相关地点</div>`;
        return;
    }

    // 收集坐标用于自动缩放
    const bounds = [];

    filtered.forEach(s => {
        const color = getTagColor(s.tags);
        
        // 渲染列表
        const item = document.createElement('div');
        item.className = 'spot-card';
        item.innerHTML = `
            <div class="s-head">
                <div class="s-name">${s.icon} ${s.name}</div>
                <div class="s-tag" style="color:${color};background:${color}20">${s.tags}</div>
            </div>
            <p class="s-desc">${s.desc}</p>
        `;
        item.onclick = () => {
            map.flyTo([s.lat, s.lng], 14);
            marker.openPopup();
            if(window.innerWidth < 768) {
                document.getElementById('map').scrollIntoView({behavior: "smooth"});
            }
        };
        listEl.appendChild(item);

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

    // 自动调整视野
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 }); 
    }
}

// 辅助函数：根据标签获取颜色 (简体字)
function getTagColor(tag) {
    if(tag.includes("高校")) return "#2563eb"; 
    if(tag.includes("学府")) return "#d97706"; 
    return "#10b981"; 
}

// ================= 5. 历史溯源模式 =================

window.loadHist = function(idx) {
    document.querySelectorAll('.t-btn').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
    });

    const d = historyEras[idx];
    if(!d) return;

    document.getElementById('h-title').innerText = d.title;
    document.getElementById('h-era').innerText = d.year;
    document.getElementById('h-desc').innerHTML = d.desc;

    layers.spots.clearLayers();
    layers.borders.clearLayers();

    // 只有当 geoData 加载成功时才绘制
    if (geoData) {
        L.geoJSON(geoData, {
            style: f => {
                const name = f.properties.name || "";
                let group = d.groups.find(g => {
                    return g.members.some(m => name.includes(m));
                });
                return {
                    color: "#fff", weight: 1,
                    fillColor: group ? group.color : "#ccc",
                    fillOpacity: 0.6
                };
            },
            onEachFeature: (f, layer) => {
                layer.bindTooltip(f.properties.name, {
                    permanent: true, direction: 'center', className: 'map-label'
                });
            }
        }).addTo(layers.borders);
    } 

    map.flyTo(d.center, d.zoom);
};
