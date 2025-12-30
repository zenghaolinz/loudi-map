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

fetch('loudi.json')
    .then(r => r.json())
    .then(d => {
        geoData = d;
        setMode('tour');
    })
    .catch(e => console.error(e));

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
        isHunanMode = true;
        btn.innerHTML = '🏠 返回娄底';
        
        layers.borders.clearLayers();
        layers.spots.clearLayers(); 
        
        loudiCenterMarker.addTo(map);

        L.geoJSON(hunanData, {
            style: f => {
                const name = f.properties.name || "";
                if (name.includes("娄底")) {
                    return { color: "#d946ef", weight: 2, fillColor: "#d946ef", fillOpacity: 0.7 };
                } else {
                    return { color: "#fff", weight: 1, fillColor: "#1e293b", fillOpacity: 0.5 };
                }
            },
            onEachFeature: function(feature, layer) {
                const name = feature.properties.name;
                layer.bindTooltip(name, { sticky: true, direction: 'center', className: 'city-label' });
                
                layer.on('mouseover', function() {
                    this.setStyle({ fillOpacity: 0.8, color: "#facc15", weight: 2 }); 
                });
                layer.on('mouseout', function() {
                    this.setStyle({ 
                        fillOpacity: name.includes("娄底") ? 0.7 : 0.5,
                        color: name.includes("娄底") ? "#d946ef" : "#fff",
                        weight: name.includes("娄底") ? 2 : 1
                    });
                });

                if (name.includes("娄底")) {
                    layer.on('click', function() { toggleRegion(); });
                    layer.options.cursor = 'pointer'; 
                }
            }
        }).addTo(layers.borders);

        map.flyTo([27.5, 111.8], 7);

    } else {
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

// 修改点：侧边栏收起逻辑
window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
    
    // 关键修复：等待动画结束后(300ms)，告诉地图重新适应大小
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

        let c = "#666";
        if(s.area.includes("新化")) c="#8b5cf6";
        if(s.area.includes("双峰")) c="#3b82f6";
        if(s.area.includes("冷水江")) c="#f97316";
        if(s.area.includes("涟源")) c="#10b981";
        if(s.area.includes("娄星")) c="#ef4444";
        
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
            // 在移动端，点击卡片后自动收起侧边栏，方便看地图
            if (window.innerWidth < 768) {
                document.querySelector('.sidebar').classList.add('collapsed');
                // 同样需要触发resize
                setTimeout(() => map.invalidateSize(), 300);
            }
        };
        document.getElementById('spotList').appendChild(card);

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