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
// 2. 城市配置数据 (标题、Slogan、坐标)
// ===========================================

const cityMeta = {
    "湖南": {
        title: "湖南全域导览",
        sub: "锦绣潇湘 · 伟人故里 · 快乐大本营",
        center: [27.5, 111.8],
        zoom: 7
    },
    "娄底": {
        title: "娄底全域导览",
        sub: "湘中明珠 · 蚩尤故里 · 湘军摇篮",
        center: [27.7017, 111.9963],
        zoom: 9
    },
    "长沙": {
        title: "长沙全域导览",
        sub: "星城长沙 · 娱乐之都 · 千年学府",
        center: [28.2282, 112.9388],
        zoom: 10
    },
    "株洲": {
        title: "株洲全域导览",
        sub: "动力之都 · 神农福地 · 轨道交通",
        center: [27.8308, 113.1323],
        zoom: 10
    },
    "湘潭": {
        title: "湘潭全域导览",
        sub: "伟人故里 · 红色圣地 · 莲城湘潭",
        center: [27.8297, 112.9440],
        zoom: 10
    },
    "衡阳": {
        title: "衡阳全域导览",
        sub: "雁城衡阳 · 寿岳南山 · 抗战名城",
        center: [26.8968, 112.572],
        zoom: 9
    },
    "邵阳": {
        title: "邵阳全域导览",
        sub: "宝庆邵阳 · 奇美崀山 · 魏源故居",
        center: [27.2389, 111.469],
        zoom: 9
    },
    "岳阳": {
        title: "岳阳全域导览",
        sub: "洞庭天下水 · 岳阳天下楼 · 鱼米之乡",
        center: [29.356, 113.132],
        zoom: 9
    },
    "常德": {
        title: "常德全域导览",
        sub: "桃花源里 · 柳叶湖畔 · 诗画常德",
        center: [29.031, 111.698],
        zoom: 9
    },
    "张家界": {
        title: "张家界导览",
        sub: "国际张 · 奇峰三千 · 秀水八百",
        center: [29.117, 110.478],
        zoom: 9
    },
    "益阳": {
        title: "益阳全域导览",
        sub: "银城益阳 · 羽毛球乡 · 黑茶之源",
        center: [28.553, 112.355],
        zoom: 9
    },
    "郴州": {
        title: "郴州全域导览",
        sub: "林中之城 · 雾漫东江 · 粤港澳后花园",
        center: [25.770, 113.014],
        zoom: 9
    },
    "怀化": {
        title: "怀化全域导览",
        sub: "鹤城怀化 · 黔湘要冲 · 第一古商城",
        center: [27.550, 109.998],
        zoom: 9
    },
    "湘西": {
        title: "湘西州导览",
        sub: "神秘湘西 · 凤凰古城 · 苗寨风情",
        center: [28.312, 109.739],
        zoom: 9
    },
    "永州": { title: "", sub: "", center: [0,0], zoom: 1 } 
};

// --- 🎨 颜色配置 ---
const cityColors = {
    "长沙": "#ef4444", "株洲": "#3b82f6", "湘潭": "#dc2626", "衡阳": "#8b5cf6",
    "邵阳": "#06b6d4", "岳阳": "#10b981", "常德": "#f472b6", "张家界": "#0d9488",
    "益阳": "#84cc16", "郴州": "#6366f1", "怀化": "#f59e0b", "湘西": "#a855f7",
    "娄底": "#d946ef", "新化": "#8b5cf6", "冷水江": "#f97316",
    "涟源": "#10b981", "双峰": "#3b82f6", "娄星": "#ef4444"
};

function getAreaColor(name) {
    if (!name) return "#666";
    for (let key in cityColors) {
        if (name.includes(key)) return cityColors[key];
    }
    return "#666"; 
}

// --- 🎨 自动配色辅助工具 (新增) ---
const colorPalette = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", 
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", 
    "#f43f5e", "#ec4899", "#14b8a6", "#facc15"
];

function getAutoColor(name) {
    if (!name) return "#999";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
}

// ===========================================
// 3. 全局变量与初始化
// ===========================================

const layers = { 
    spots: L.layerGroup().addTo(map), 
    borders: L.layerGroup().addTo(map) 
};

// 读取 geo-data.js 中的数据变量
let geoData = (typeof loudiGeoData !== 'undefined') ? loudiGeoData : null;
let hunanData = (typeof hunanGeoData !== 'undefined') ? hunanGeoData : null;

// 当前状态变量
let currentMode = 'city'; 
let currentCityName = '娄底'; 
let currentFilter = 'all'; 
let currentBtn = null;
let scopeControlBtn = null;

// 初始化入口
if (geoData && hunanData) {
    setTimeout(() => {
        enterCityMode('娄底'); 
    }, 100);
} else {
    alert("⚠️ 错误：找不到地图数据，请检查 js/geo-data.js 文件！");
}

// ===========================================
// 4. 核心模式切换逻辑
// ===========================================

// 切换到【省份概览模式】
function enterProvinceMode() {
    currentMode = 'province';
    currentCityName = '湖南';
    
    updateHeaderText('湖南');
    scopeControlBtn.innerHTML = '🏠 返回当前城市'; 
    
    layers.spots.clearLayers();
    layers.borders.clearLayers();
    document.getElementById('spotList').innerHTML = '<div style="padding:20px; text-align:center; color:#888;">请在地图上点击城市以查看详情 👆</div>';

    L.geoJSON(hunanData, {
        style: f => {
            const name = f.properties.name || "";
            const color = getAreaColor(name);
            if (name.includes("永州")) {
                return { color: "#fff", weight: 1, fillColor: "#1e293b", fillOpacity: 0.5 };
            }
            return { color: color, weight: 2, fillColor: color, fillOpacity: 0.6 };
        },
        onEachFeature: function(feature, layer) {
            const name = feature.properties.name || "";
            layer.bindTooltip(name, { sticky: true, direction: 'center', className: 'city-label' });
            
            if (!name.includes("永州")) { 
                layer.options.cursor = 'pointer';
                layer.on('mouseover', function() {
                    this.setStyle({ fillOpacity: 0.8, color: "#facc15", weight: 3 });
                });
                layer.on('mouseout', function() {
                    const c = getAreaColor(name);
                    this.setStyle({ fillOpacity: 0.6, color: c, weight: 2 });
                });
                layer.on('click', function() {
                    enterCityMode(name);
                });
            }
        }
    }).addTo(layers.borders);

    const cfg = cityMeta["湖南"];
    map.flyTo(cfg.center, cfg.zoom);
}

// 切换到【单城市详细模式】
function enterCityMode(cityName) {
    let key = "";
    for(let k in cityMeta) {
        if(cityName.includes(k)) { key = k; break; }
    }
    if(!key || key === "湖南" || key === "永州") return;

    currentMode = 'city';
    currentCityName = key;

    updateHeaderText(key);
    scopeControlBtn.innerHTML = '🌏 湖南全省';
    
    layers.borders.clearLayers();
    layers.spots.clearLayers();

    // 尝试获取详细数据
    const detailData = (typeof cityDetailData !== 'undefined') ? cityDetailData[key] : null;

    if (detailData) {
        // --- 方案 A：有详细县级数据 ---
        L.geoJSON(detailData, {
            style: f => {
                const n = f.properties.name || "";
                let c = getAreaColor(n);
                if (c === "#666") c = getAutoColor(n); // 自动配色
                return { color: c, weight: 2, fillColor: c, fillOpacity: 0.1 };
            },
            onEachFeature: function(feature, layer) {
                const n = feature.properties.name || "";
                layer.bindTooltip(n, { direction: 'center', className: 'city-label' });
                layer.on('mouseover', function() { this.setStyle({ fillOpacity: 0.4, weight: 3 }); });
                layer.on('mouseout', function() { this.setStyle({ fillOpacity: 0.1, weight: 2 }); });
            }
        }).addTo(layers.borders);
    } else {
        // --- 方案 B：没有详细数据 ---
        const cityFeature = hunanData.features.find(f => f.properties.name.includes(key));
        if (cityFeature) {
            L.geoJSON(cityFeature, {
                style: { color: getAreaColor(key), weight: 3, fillColor: getAreaColor(key), fillOpacity: 0.1 }
            }).addTo(layers.borders);
        }
    }

    renderTour(currentFilter, currentBtn, document.getElementById('searchInput').value);

    const cfg = cityMeta[key];
    if (cfg) map.flyTo(cfg.center, cfg.zoom);
}

// 辅助：更新标题栏
function updateHeaderText(key) {
    const cfg = cityMeta[key];
    if (cfg) {
        document.querySelector('.title').innerText = cfg.title;
        document.querySelector('.subtitle').innerText = cfg.sub;
    }
}

// ===========================================
// 5. 控件与按钮
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
        
        container.onclick = function() { 
            if (currentMode === 'city') {
                enterProvinceMode();
            } else {
                enterCityMode(currentCityName === '湖南' ? '娄底' : currentCityName);
            }
        }
        return container;
    }
});
map.addControl(new ScopeControl());

// ===========================================
// 6. 搜索与渲染列表逻辑
// ===========================================

window.setMode = function(mode) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    if (currentMode === 'province') {
        enterCityMode(currentCityName === '湖南' ? '娄底' : currentCityName);
    }

    if(mode === 'tour') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('view-tour').classList.add('active');
        document.getElementById('timeline').classList.remove('show');
        renderTour(currentFilter, currentBtn);
    } else {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('view-hist').classList.add('active');
        document.getElementById('timeline').classList.add('show');
        loadHist(5);
    }
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    renderTour(currentFilter, currentBtn, e.target.value);
});

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
    setTimeout(() => { map.invalidateSize(); }, 300);
}

// 核心渲染函数 (含自动图片抓取)
window.renderTour = function(filter = 'all', btn, keyword = '') {
    currentFilter = filter;
    currentBtn = btn;
    
    if (typeof keyword !== 'string') keyword = document.getElementById('searchInput').value || '';
    keyword = keyword.trim();

    if(btn) {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    layers.spots.clearLayers();
    document.getElementById('spotList').innerHTML = '';

    // 筛选当前城市的景点
    const citySpots = spots.filter(s => {
        if (currentCityName === '娄底') {
            return ["娄星", "双峰", "新化", "冷水江", "涟源"].some(d => s.area.includes(d));
        }
        return s.area.includes(currentCityName);
    });

    if (citySpots.length === 0) {
        document.getElementById('spotList').innerHTML = `<div style="padding:20px;color:#999;text-align:center;">${currentCityName} 暂无收录数据<br><small>欢迎补充</small></div>`;
        return;
    }

    citySpots.forEach(s => {
        if(filter === '高校' && (!s.tags || !s.tags.includes('高校'))) return;
        if(filter === '学府' && (!s.tags || !s.tags.includes('学府'))) return;
        if(filter !== 'all' && filter !== '高校' && filter !== '学府' && s.area.indexOf(filter) === -1) return;

        if (keyword) {
            const matchName = s.name.includes(keyword);
            const matchDesc = s.desc.includes(keyword);
            if (!matchName && !matchDesc) return;
        }

        let c = getAreaColor(s.area);
        
        // --- 智能图片逻辑 ---
        let imgSrc = s.image; 
        if (!imgSrc) {
            const searchKey = s.area + s.name + "风景";
            imgSrc = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(searchKey)}&w=400&h=300&c=7&rs=1`;
        }

        const baikeUrl = `https://baike.baidu.com/item/${s.name}`;

        const card = document.createElement('div');
        card.className = 'spot-card';
        card.setAttribute('data-area', s.area);
        
        card.innerHTML = `
            <img src="${imgSrc}" class="card-img" alt="${s.name}" 
                 onerror="this.src='https://via.placeholder.com/80?text=No+Img';this.onerror=null;">
            <div class="card-info">
                <div class="card-title-row">
                    <span class="card-name" onclick="window.open('${baikeUrl}'); event.stopPropagation();" title="点击查看百科">${s.name}</span>
                    <span class="card-area" style="color:${c}">${s.area}</span>
                </div>
                <div class="card-desc">${s.desc}</div>
            </div>`;
            
        card.onclick = () => {
            map.flyTo([s.lat, s.lng], 14); 
            m.openPopup();
            if (window.innerWidth < 768) {
                document.querySelector('.sidebar').classList.add('collapsed');
                setTimeout(() => map.invalidateSize(), 300);
            }
        };
        document.getElementById('spotList').appendChild(card);

        const m = L.marker([s.lat, s.lng], { draggable: false }).addTo(layers.spots);
        m.bindPopup(`
            <div class="pop-head" style="background:${c}">${s.name}</div>
            <div class="pop-body">
                <img src="${imgSrc}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:8px;" onerror="this.src='https://via.placeholder.com/200?text=No+Img'">
                ${s.desc}
                <a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" class="pop-link" style="background:${c}">🚀 导航去这里</a>
            </div>
        `);
    });
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