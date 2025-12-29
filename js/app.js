// 定义普通地图图层 (高德矢量图)
const normalMap = L.tileLayer('http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德地图'
});

// 定义卫星地图图层 (高德卫星图)
const satMap = L.tileLayer('https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德卫星'
});

// 初始化地图对象
// layers: [normalMap] 表示默认显示普通地图
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

// 定义图层组，用于管理覆盖物
const layers = { 
    spots: L.layerGroup().addTo(map), 
    borders: L.layerGroup().addTo(map) 
};
let geoData = null;

// 读取本地 loudi.json 地理边界数据
fetch('loudi.json')
    .then(r => r.json())
    .then(d => {
        geoData = d;
        setMode('tour'); // 默认进入现代景点模式
    })
    .catch(e => {
        console.error("加载 loudi.json 失败", e);
        // 如果是在 GitHub Pages 上，通常不会报错。本地直接打开可能会报错。
        alert("⚠️ 无法加载 'loudi.json' 文件！\n\n请确保文件名全小写，且已上传到 GitHub。");
    });


// ===========================================
// 3. 模式切换 (现代景点 vs 历史疆域)
// ===========================================

window.setMode = function(mode) {
    // 移除所有 Tab 和 Panel 的激活状态
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    if(mode === 'tour') {
        // 切换到景点模式
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('view-tour').classList.add('active');
        document.getElementById('timeline').classList.remove('show'); // 隐藏时间轴
        renderTour(); // 渲染景点
    } else {
        // 切换到历史模式
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('view-hist').classList.add('active');
        document.getElementById('timeline').classList.add('show'); // 显示时间轴
        loadHist(5); // 默认显示现代
    }
}


// ===========================================
// 4. 渲染现代景点 (Tour Mode)
// ===========================================

// filter: 筛选关键词 (如 '新化', '高校', 'all')
// btn: 被点击的按钮元素 (用于高亮)
window.renderTour = function(filter = 'all', btn) {
    if(btn) {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    // 清空地图上的内容
    layers.spots.clearLayers();
    layers.borders.clearLayers();
    document.getElementById('spotList').innerHTML = '';

    // 1. 绘制淡淡的行政区划背景
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

    // 2. 遍历并渲染景点 (spots 数据来自 js/data.js)
    spots.forEach(s => {
        // --- 筛选逻辑 ---
        if(filter === '高校' && (!s.tags || !s.tags.includes('高校'))) return;
        if(filter === '学府' && (!s.tags || !s.tags.includes('学府'))) return;
        // 如果筛选词不是 all/高校/学府，且景点区域不包含筛选词，则跳过
        if(filter !== 'all' && filter !== '高校' && filter !== '学府' && s.area.indexOf(filter) === -1) return;

        // 根据区域定义颜色
        let c = "#666";
        if(s.area.includes("新化")) c="#8b5cf6";
        if(s.area.includes("双峰")) c="#3b82f6";
        if(s.area.includes("冷水江")) c="#f97316";
        if(s.area.includes("涟源")) c="#10b981";
        if(s.area.includes("娄星")) c="#ef4444";
        
        // --- 生成侧边栏卡片 ---
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
        
        // 点击卡片飞到地图位置
        card.onclick = () => {
            map.flyTo([s.lat, s.lng], 14); // 放大级别 14
            m.openPopup();
        };
        document.getElementById('spotList').appendChild(card);

        // --- 生成地图标记 ---
        const m = L.marker([s.lat, s.lng], { draggable: false }).addTo(layers.spots);
        
        // 绑定弹窗内容
        m.bindPopup(`
            <div class="pop-head" style="background:${c}">${s.name}</div>
            <div class="pop-body">${s.desc}
                <a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" class="pop-link" style="background:${c}">🚀 导航去这里</a>
            </div>
        `);
    });
    
    // 如果是查看全部，重置视角
    if(filter === 'all' || filter === '高校' || filter === '学府') {
        map.setView([27.7017, 111.9963], 9);
    }
}

// 将函数暴露给全局，以便 HTML 中的 onclick 调用
window.filterSpots = renderTour;


// ===========================================
// 5. 渲染历史疆域 (History Mode)
// ===========================================

window.loadHist = function(idx) {
    // 切换时间轴按钮状态
    document.querySelectorAll('.t-btn').forEach((b, i) => b.classList.toggle('active', i===idx));
    
    // 获取历史数据 (historyEras 来自 js/data.js)
    const d = historyEras[idx];
    
    // 更新侧边栏文字
    document.getElementById('h-title').innerText = d.title;
    document.getElementById('h-era').innerText = d.year;
    document.getElementById('h-desc').innerHTML = d.desc;

    // 清空地图
    layers.spots.clearLayers();
    layers.borders.clearLayers();

    if(geoData) {
        L.geoJSON(geoData, {
            style: f => {
                // 获取地图中的名字 (如 "新化县")
                const mapName = (f.properties.name || "").toString();
                
                // 查找该名字是否属于当前历史时期的某个分组
                let g = d.groups.find(group => 
                    group.members.some(keyword => mapName.indexOf(keyword) > -1)
                );
                
                // 如果匹配到，上色；否则透明
                if(g) {
                    return { color: g.color, weight: 1, fillColor: g.color, fillOpacity: 0.6 };
                }
                return { opacity: 0, fillOpacity: 0 };
            }
        }).addTo(layers.borders);
        
        // 飞到该历史时期的中心点
        map.flyTo(d.center, d.zoom);
    }
}
