// 定义普通地图图层
const normalMap = L.tileLayer('http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德地图'
});

// 定义卫星地图图层
const satMap = L.tileLayer('https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德卫星'
});

// 初始化地图对象
const map = L.map('map', { 
    zoomControl: false,
    layers: [normalMap] 
}).setView([27.7017, 111.9963], 9);

// 添加缩放控件（右上角）
L.control.zoom({ position: 'topright' }).addTo(map);

// 添加图层切换控件（右上角）
const baseMaps = {
    "🗺️ 电子地图": normalMap,
    "🛰️ 卫星影像": satMap
};
L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);


// ===========================================
// 2. 核心逻辑与数据加载
// ===========================================

const layers = { 
    spots: L.layerGroup().addTo(map), 
    borders: L.layerGroup().addTo(map) 
};

let geoData = null;   // 娄底数据
let hunanData = null; // 湖南数据
let isHunanMode = false; // 当前是否在湖南模式

// 读取娄底数据
fetch('loudi.json')
    .then(r => r.json())
    .then(d => {
        geoData = d;
        setMode('tour'); // 默认进入现代景点模式
    })
    .catch(e => console.error("加载 loudi.json 失败", e));

// 读取湖南数据
fetch('hunan.json')
    .then(r => r.json())
    .then(d => {
        hunanData = d;
    })
    .catch(e => console.error("加载 hunan.json 失败，请确保文件已上传", e));


// ===========================================
// 3. 自定义控件：湖南/娄底 切换按钮 (视觉增强版)
// ===========================================

const ScopeControl = L.Control.extend({
    options: { position: 'topleft' }, // 放在左上角

    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.padding = '5px 10px';
        container.style.cursor = 'pointer';
        container.style.fontWeight = 'bold';
        container.style.fontSize = '14px';
        container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        
        container.innerHTML = '🌏 湖南全省';
        container.onclick = function() {
            toggleRegion(this);
        }
        return container;
    }
});
map.addControl(new ScopeControl());

// 切换逻辑 (颜色加深 & 交互增强)
function toggleRegion(btn) {
    if (!hunanData) {
        alert("⚠️ 还没找到 hunan.json 文件！\n请下载湖南省的 GeoJSON 文件并上传到项目根目录。");
        return;
    }

    if (!isHunanMode) {
        // --- 切换到湖南模式 ---
        isHunanMode = true;
        btn.innerHTML = '🏠 返回娄底';
        
        // 1. 清除现有的娄底边界
        layers.borders.clearLayers();

        // 2. 绘制湖南边界
        L.geoJSON(hunanData, {
            style: f => {
                const name = f.properties.name || "";
                
                // 判断逻辑：娄底高亮，其他加深
                if (name.includes("娄底")) {
                    return { 
                        color: "#722ed1",      // 边框色
                        weight: 2,             // 边框粗细
                        fillColor: "#722ed1",  // 填充色
                        fillOpacity: 0.6       // 不透明度 (60%)
                    };
                } else {
                    return { 
                        color: "#fff",         // 白色边框
                        weight: 1,             
                        fillColor: "#64748b",  // 蓝灰色
                        fillOpacity: 0.4       // 不透明度 (40%，很清晰)
                    };
                }
            },
            // 鼠标交互：悬停变色 + 显示地名
            onEachFeature: function(feature, layer) {
                const name = feature.properties.name;
                // 绑定简单的文字提示
                layer.bindTooltip(name, { sticky: true, direction: 'center', className: 'city-label' });
                
                // 鼠标移入加深
                layer.on('mouseover', function() {
                    this.setStyle({ fillOpacity: 0.8 });
                });
                // 鼠标移出恢复
                layer.on('mouseout', function() {
                    this.setStyle({ fillOpacity: name.includes("娄底") ? 0.6 : 0.4 });
                });
            }
        }).addTo(layers.borders);

        // 3. 飞到湖南省中心 (缩放级别调小，以便看清全省)
        map.flyTo([27.5, 111.8], 7);

    } else {
        // --- 切换回娄底模式 ---
        isHunanMode = false;
        btn.innerHTML = '🌏 湖南全省';
        
        // 重新调用渲染函数，它会自动画回娄底边界并归位
        renderTour(currentFilter, currentBtn); 
    }
}


// ===========================================
// 4. 模式切换 (现代景点 vs 历史疆域)
// ===========================================

window.setMode = function(mode) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    // 切换模式时，强制退出湖南模式，回到娄底视角
    isHunanMode = false;
    document.querySelector('.leaflet-control-custom').innerHTML = '🌏 湖南全省';

    if(mode === 'tour') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('view-tour').classList.add('active');
        document.getElementById('timeline').classList.remove('show');
        renderTour();
    } else {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('view-hist').classList.add('active');
        document.getElementById('timeline').classList.add('show');
        loadHist(5);
    }
}


// ===========================================
// 5. 渲染现代景点 (Tour Mode)
// ===========================================

// 保存当前的筛选状态，以便从湖南模式切回来时能恢复
let currentFilter = 'all'; 
let currentBtn = null;

window.renderTour = function(filter = 'all', btn) {
    currentFilter = filter;
    currentBtn = btn;

    if(btn) {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    // 每次渲染只清除边界，景点如果不动就不清除？
    // 为了防止筛选逻辑混乱，这里还是全部重绘比较稳妥
    layers.spots.clearLayers();
    layers.borders.clearLayers();
    document.getElementById('spotList').innerHTML = '';

    // 绘制娄底边界 (默认)
    if(geoData) {
        L.geoJSON(geoData, {
            style: f => {
                const n = f.properties.name || "";
                let c = "#999";
                if(n.includes("新化")) c="#8b5cf6";
                else if(n.includes("冷水江")) c="#f97316";
                else if(n.includes("涟源")) c="#10b981";
                else if(n.includes("双峰")) c="#3b82f6";
                else if(n.includes("娄星")) c="#ef4444";
                return { color: c, weight: 1, fillColor: c, fillOpacity: 0.1 };
            }
        }).addTo(layers.borders);
    }

    // 绘制景点
    spots.forEach(s => {
        if(filter === '高校' && (!s.tags || !s.tags.includes('高校'))) return;
        if(filter === '学府' && (!s.tags || !s.tags.includes('学府'))) return;
        if(filter !== 'all' && filter !== '高校' && filter !== '学府' && s.area.indexOf(filter) === -1) return;

        let c = "#666";
        if(s.area.includes("新化")) c="#8b5cf6";
        if(s.area.includes("双峰")) c="#3b82f6";
        if(s.area.includes("冷水江")) c="#f97316";
        if(s.area.includes("涟源")) c="#10b981";
        if(s.area.includes("娄星")) c="#ef4444";
        
        const card = document.createElement('div');
        card.className = 'spot-card';
        card.setAttribute('data-area', s.area);
        card.innerHTML = `
            <div class="card-icon" style="color:${c}">${s.icon}</div>
            <div class="card-info">
                <div class="card-title">
                    <span>${s.name}</span>
                    <span class="card-area" style="color:${c}">${s.area}</span>
                </div>
                <div class="card-desc">${s.desc}</div>
            </div>`;
        card.onclick = () => {
            map.flyTo([s.lat, s.lng], 14); 
            m.openPopup();
        };
        document.getElementById('spotList').appendChild(card);

        const m = L.marker([s.lat, s.lng], { draggable: false }).addTo(layers.spots);
        m.bindPopup(`
            <div class="pop-head" style="background:${c}">${s.name}</div>
            <div class="pop-body">${s.desc}
                <a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" class="pop-link" style="background:${c}">🚀 导航去这里</a>
            </div>
        `);
    });
    
    // 只有在不是湖南模式的时候，才重置视角到娄底
    if(!isHunanMode && (filter === 'all' || filter === '高校' || filter === '学府')) {
        map.setView([27.7017, 111.9963], 9);
    }
}

window.filterSpots = renderTour;


// ===========================================
// 6. 渲染历史疆域 (History Mode)
// ===========================================

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
