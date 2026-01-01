// ===========================================
// 1. 初始化地图 (HTTPS)
// ===========================================
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
L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

// ===========================================
// 2. 数据与全局变量
// ===========================================

// --- 🎨 城市颜色配置 (不含永州) ---
// 这里的键名对应 geojson 或 data.js 中的 area/name 字段
const cityColors = {
    "长沙": "#ef4444", // 红色
    "株洲": "#3b82f6", // 蓝色
    "湘潭": "#dc2626", // 深红
    "衡阳": "#8b5cf6", // 紫色
    "邵阳": "#06b6d4", // 青色
    "岳阳": "#10b981", // 翠绿
    "常德": "#f472b6", // 粉色
    "张家界": "#0d9488", // 蓝绿
    "益阳": "#84cc16", // 黄绿
    "郴州": "#6366f1", // 靛蓝
    "怀化": "#f59e0b", // 琥珀
    "湘西": "#a855f7", // 紫罗兰
    
    // 娄底各区县原有配色
    "娄底": "#d946ef",
    "新化": "#8b5cf6",
    "冷水江": "#f97316",
    "涟源": "#10b981",
    "双峰": "#3b82f6",
    "娄星": "#ef4444"
};

// 辅助函数：根据名字获取颜色
// 如果找不到匹配的城市（如永州），返回默认灰色 #666
function getAreaColor(name) {
    if (!name) return "#666";
    // 优先匹配完整城市名
    for (let key in cityColors) {
        if (name.includes(key)) return cityColors[key];
    }
    return "#666"; 
}

const layers = { 
    spots: L.layerGroup().addTo(map), 
    borders: L.layerGroup().addTo(map) 
};

let geoData = null;
let hunanData = null;
let isHunanMode = false;
let scopeControlBtn = null;

const loudiCenterMarker = L.marker([27.7017, 111.9963], {
    interactive: true 
}).bindTooltip("📍 娄底市 (点击进入)", { 
    permanent: true, 
    direction: 'right',
    className: 'city-label'
});

loudiCenterMarker.on('click', () => {
    toggleRegion();
});

// 加载娄底详细数据
fetch('loudi.json')
    .then(r => r.json())
    .then(d => {
        geoData = d;
        setMode('tour');
    })
    .catch(e => console.error(e));

// 加载湖南全省数据
fetch('hunan.json')
    .then(r => r.json())
    .then(d => {
        hunanData = d;
    })
    .catch(e => console.error(e));

// ===========================================
// 3. 控件与切换逻辑
// ===========================================
const ScopeControl = L.Control.extend({
    options: { position: 'topleft' }, 

    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.padding = '5px 10px';
        container.style.cursor = 'pointer';
        container.style.fontWeight = 'bold';
        container.style.fontSize = '14px';
        container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        
        container.innerHTML = '🌏 湖南全省';
        scopeControlBtn = container;
        container.onclick = function() { toggleRegion(); }
        return container;
    }
});
map.addControl(new ScopeControl());

function toggleRegion() {
    if (!hunanData) {
        alert("⚠️ 还没找到 hunan.json 文件！");
        return;
    }

    const btn = scopeControlBtn; 

    if (!isHunanMode) {
        // --- 进入湖南全省模式 ---
        isHunanMode = true;
        btn.innerHTML = '🏠 返回娄底';
        
        layers.borders.clearLayers();
        layers.spots.clearLayers(); 
        
        loudiCenterMarker.addTo(map);

        L.geoJSON(hunanData, {
            style: f => {
                const name = f.properties.name || "";
                // 获取对应颜色，如果不是指定城市（如永州），则返回默认
                const color = getAreaColor(name);
                
                // 永州或未定义城市显示为暗色背景
                if (color === "#666") {
                    return { color: "#fff", weight: 1, fillColor: "#1e293b", fillOpacity: 0.5 };
                } else {
                    return { color: color, weight: 2, fillColor: color, fillOpacity: 0.6 };
                }
            },
            onEachFeature: function(feature, layer) {
                const name = feature.properties.name || "";
                const baseColor = getAreaColor(name);
                
                layer.bindTooltip(name, { sticky: true, direction: 'center', className: 'city-label' });
                
                layer.on('mouseover', function() {
                    // 高亮效果
                    if(baseColor !== "#666") {
                        this.setStyle({ fillOpacity: 0.8, color: "#facc15", weight: 2 });
                    }
                });
                
                layer.on('mouseout', function() {
                    // 恢复原样
                    if(baseColor !== "#666") {
                        this.setStyle({ 
                            fillOpacity: 0.6,
                            color: baseColor,
                            weight: 2
                        });
                    }
                });

                // 点击娄底区域可以返回详细视图
                if (name.includes("娄底")) {
                    layer.on('click', function() { toggleRegion(); });
                    layer.options.cursor = 'pointer'; 
                }
            }
        }).addTo(layers.borders);

        map.flyTo([27.5, 111.8], 7);

    } else {
        // --- 返回娄底模式 ---
        isHunanMode = false;
        btn.innerHTML = '🌏 湖南全省';
        map.removeLayer(loudiCenterMarker);
        renderTour(currentFilter, currentBtn); 
    }
}

// ===========================================
// 4. 搜索与渲染逻辑
// ===========================================

window.setMode = function(mode) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    // 如果在全省模式下切换TAB，先切回娄底模式（或者根据需求保留）
    if (isHunanMode) toggleRegion();

    if(mode === 'tour') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('view-tour').classList.add('active');
        document.getElementById('timeline').classList.remove('show');
        
        // 重新渲染，带上当前的搜索词
        const keyword = document.getElementById('searchInput').value;
        renderTour(currentFilter, currentBtn, keyword);
    } else {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('view-hist').classList.add('active');
        document.getElementById('timeline').classList.add('show');
        loadHist(5);
    }
}

let currentFilter = 'all'; 
let currentBtn = null;

// 监听搜索输入
document.getElementById('searchInput').addEventListener('input', (e) => {
    renderTour(currentFilter, currentBtn, e.target.value);
});

// 侧边栏收起逻辑
window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
    
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// 核心渲染函数
window.renderTour = function(filter = 'all', btn, keyword = '') {
    currentFilter = filter;
    currentBtn = btn;
    
    if (typeof keyword !== 'string') {
        keyword = document.getElementById('searchInput').value || '';
    }
    keyword = keyword.trim();

    if(btn) {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    layers.spots.clearLayers();
    layers.borders.clearLayers();
    document.getElementById('spotList').innerHTML = '';

    // 渲染娄底区县边界 (仅在娄底模式下)
    if(geoData) {
        L.geoJSON(geoData, {
            style: f => {
                const n = f.properties.name || "";
                let c = getAreaColor(n); // 复用颜色逻辑
                if(c === "#666") c = "#999"; // 默认边界颜色
                return { color: c, weight: 1, fillColor: c, fillOpacity: 0.1 };
            }
        }).addTo(layers.borders);
    }

    // 渲染景点
    spots.forEach(s => {
        // 过滤逻辑
        if(filter === '高校' && (!s.tags || !s.tags.includes('高校'))) return;
        if(filter === '学府' && (!s.tags || !s.tags.includes('学府'))) return;
        if(filter !== 'all' && filter !== '高校' && filter !== '学府' && s.area.indexOf(filter) === -1) return;

        if (keyword) {
            const matchName = s.name.includes(keyword);
            const matchDesc = s.desc.includes(keyword);
            const matchArea = s.area.includes(keyword);
            if (!matchName && !matchDesc && !matchArea) return;
        }

        // 获取颜色
        let c = getAreaColor(s.area);
        
        // 构造卡片
        const card = document.createElement('div');
        card.className = 'spot-card';
        card.setAttribute('data-area', s.area);
        
        const imgSrc = s.image ? s.image : 'https://via.placeholder.com/80?text=Loudi';
        const baikeUrl = `https://baike.baidu.com/item/${s.name}`;

        card.innerHTML = `
            <img src="${imgSrc}" class="card-img" alt="${s.name}" onerror="this.src='https://via.placeholder.com/80?text=No+Img'">
            <div class="card-info">
                <div class="card-title-row">
                    <span class="card-name" onclick="window.open('${baikeUrl}'); event.stopPropagation();" title="点击查看${s.name}的百科">${s.name}</span>
                    <span class="card-area" style="color:${c}">${s.area}</span>
                </div>
                <div class="card-desc">${s.desc}</div>
            </div>`;
            
        // 点击卡片：地图跳转
        card.onclick = () => {
            map.flyTo([s.lat, s.lng], 14); 
            m.openPopup();
            // 移动端优化
            if (window.innerWidth < 768) {
                document.querySelector('.sidebar').classList.add('collapsed');
                setTimeout(() => map.invalidateSize(), 300);
            }
        };
        document.getElementById('spotList').appendChild(card);

        // 添加地图标记
        const m = L.marker([s.lat, s.lng], { draggable: false }).addTo(layers.spots);
        m.bindPopup(`
            <div class="pop-head" style="background:${c}">${s.name}</div>
            <div class="pop-body">
                <img src="${imgSrc}" style="width:100%; border-radius:8px; margin-bottom:8px;">
                ${s.desc}
                <a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" class="pop-link" style="background:${c}">🚀 导航去这里</a>
            </div>
        `);
    });
    
    // 如果没有搜索关键词且在默认视图，复位地图
    if(!isHunanMode && (filter === 'all' || filter === '高校' || filter === '学府') && !keyword) {
        map.setView([27.7017, 111.9963], 9);
    }
}

window.filterSpots = renderTour;

window.loadHist = function(idx) {
    document.querySelectorAll('.t-btn').forEach((b, i) => b.classList.toggle('active', i===idx));
    const d = historyEras[idx];
    document.getElementById('h-title').innerText = d.title;
    document.getElementById('h-era').innerText = d.year;
    document.getElementById('h-desc').innerHTML = d.desc;

    layers.spots.clearLayers();
    layers.borders.clearLayers();

    if(geoData) {
        L.geoJSON(geoData, {
            style: f => {
                const mapName = (f.properties.name || "").toString();
                let g = d.groups.find(group => 
                    group.members.some(keyword => mapName.indexOf(keyword) > -1)
                );
                if(g) {
                    return { color: g.color, weight: 1, fillColor: g.color, fillOpacity: 0.6 };
                }
                return { opacity: 0, fillOpacity: 0 };
            }
        }).addTo(layers.borders);
        map.flyTo(d.center, d.zoom);
    }
}