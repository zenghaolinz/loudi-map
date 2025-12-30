// 1. 地图初始化
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

const layers = {
    spots: L.layerGroup().addTo(map),
    borders: L.layerGroup().addTo(map)
};

// 2. 全局变量
let geoData = null;
let currentSearch = '';

// 3. 加载 GeoJSON (即使失败也不会卡死页面)
fetch('loudi.json')
    .then(r => r.json())
    .then(d => {
        geoData = d;
        console.log("地图数据加载成功");
    })
    .catch(e => {
        console.log("未找到 loudi.json，仅显示景点模式");
    });

// 4. 核心功能：渲染列表与地图
// 这个函数就是你 HTML 里调用的 filterSpots，必须存在！
window.filterSpots = function(filter = 'all', btn) {
    if(btn) {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    layers.spots.clearLayers();
    // 如果不需要切换标签时清除行政区，就把下面这行注释掉
    layers.borders.clearLayers(); 
    
    const listEl = document.getElementById('spotList');
    if(!listEl) return;
    listEl.innerHTML = '';

    let bounds = [];
    
    // 防止 data.js 没加载导致的报错
    const safeSpots = (typeof spots !== 'undefined') ? spots : [];

    safeSpots.forEach(s => {
        // 搜索过滤
        if (currentSearch) {
            if (!s.name.includes(currentSearch) && !s.desc.includes(currentSearch)) return;
        }

        // 标签过滤
        let pass = false;
        if (filter === 'all') pass = true;
        else if (filter === '高校' && s.tags && s.tags.includes('高校')) pass = true;
        else if (filter === '学府' && s.tags && s.tags.includes('学府')) pass = true;
        else if (s.area.indexOf(filter) > -1) pass = true;

        if (!pass) return;

        // 颜色定义
        let c = "#10b981";
        if(s.tags && s.tags.includes("高校")) c = "#2563eb";
        else if(s.area.includes("新化")) c = "#8b5cf6";
        else if(s.area.includes("冷水江")) c = "#f97316";
        else if(s.area.includes("娄星")) c = "#ef4444";
        
        // 渲染列表卡片
        const card = document.createElement('div');
        card.className = 'spot-card';
        card.innerHTML = `
            <div class="card-icon" style="color:${c}">${s.icon || '📍'}</div>
            <div class="card-info">
                <div class="card-title">
                    <span>${s.name}</span>
                    <span class="card-area" style="color:${c}">${s.area}</span>
                </div>
                <div class="card-desc">${s.desc}</div>
            </div>`;
        
        card.onclick = () => {
            map.flyTo([s.lat, s.lng], 15);
            m.openPopup();
            // 手机端自动滚动
            if(window.innerWidth < 768) {
                const mapEl = document.getElementById('map');
                if(mapEl) mapEl.scrollIntoView();
            }
        };
        listEl.appendChild(card);

        // 渲染地图标记
        const m = L.marker([s.lat, s.lng]).addTo(layers.spots);
        bounds.push([s.lat, s.lng]);
        
        m.bindPopup(`
            <div class="pop-head" style="background:${c}">${s.name}</div>
            <div class="pop-body">${s.desc}<br><a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" style="color:${c};display:block;margin-top:5px;">🚀 导航去这里</a></div>
        `);
    });
    
    // 自动缩放
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([27.7017, 111.9963], 9);
    }
}

// 5. 搜索功能入口
window.searchSpots = function(val) {
    currentSearch = val.toLowerCase().trim();
    window.filterSpots(); // 重新调用上面的函数
};

// 6. 模式切换 (现代/历史)
window.setMode = function(mode) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    const timeline = document.getElementById('timeline');

    if(mode === 'tour') {
        // 容错处理：找不到元素就不操作
        const t1 = document.querySelector('.tab:nth-child(1)');
        if(t1) t1.classList.add('active');
        
        const v1 = document.getElementById('view-tour');
        if(v1) v1.classList.add('active');
        
        if(timeline) timeline.classList.remove('show');
        
        window.filterSpots();
    } else {
        const t2 = document.querySelector('.tab:nth-child(2)');
        if(t2) t2.classList.add('active');
        
        const v2 = document.getElementById('view-hist');
        if(v2) v2.classList.add('active');
        
        if(timeline) timeline.classList.add('show');
        loadHist(0);
    }
}

// 7. 历史模式加载逻辑
window.loadHist = function(idx) {
    document.querySelectorAll('.t-btn').forEach((b, i) => b.classList.toggle('active', i===idx));
    
    // 防止 data.js 没加载
    if (typeof historyEras === 'undefined') return;

    const d = historyEras[idx];
    if(!d) return;

    const hTitle = document.getElementById('h-title');
    if(hTitle) hTitle.innerText = d.title;
    
    const hEra = document.getElementById('h-era');
    if(hEra) hEra.innerText = d.year;
    
    const hDesc = document.getElementById('h-desc');
    if(hDesc) hDesc.innerHTML = d.desc;

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

// 8. 启动！
// 等待页面加载完成后执行，确保不出错
setTimeout(() => {
    window.filterSpots('all'); 
}, 500);
