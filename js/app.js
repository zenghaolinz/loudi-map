// 1. 地图初始化：配置高德地图源
const normalMap = L.tileLayer('https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德地图'
});

const satMap = L.tileLayer('https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], 
    attribution: '© 高德卫星'
});

// 创建地图实例
const map = L.map('map', { 
    zoomControl: false,
    layers: [normalMap]
}).setView([27.7017, 111.9963], 9);

// 添加控件
L.control.zoom({ position: 'topright' }).addTo(map);

const baseMaps = {
    "🗺️ 电子地图": normalMap,
    "🛰️ 卫星影像": satMap
};
L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

// 定义图层组
const layers = {
    spots: L.layerGroup().addTo(map),    // 存放景点标记
    borders: L.layerGroup().addTo(map)   // 存放历史边界
};

// 2. 全局变量
let geoData = null;       // 用于存放 loudi.json 的数据
let currentSearch = '';   // 当前搜索关键词

// 3. 核心修复：主动加载 loudi.json 数据
// 这里的 fetch 必须执行，否则 geoData 永远是空的
fetch('loudi.json')
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log("地理数据 loudi.json 加载成功");
        geoData = data; // 赋值给全局变量
    })
    .catch(err => {
        console.error("无法加载 loudi.json，请检查文件名或网络:", err);
        // 如果是本地打开（非服务器环境），可能会报错，这里给个提示
        if(window.location.protocol === 'file:') {
            alert("注意：直接双击 HTML 文件无法读取 JSON 数据，请使用 VS Code Live Server 或上传到 GitHub Pages。");
        }
    });

// 4. 核心功能：渲染列表与地图 (现代模式)
window.filterSpots = function(filter = 'all', btn) {
    // 按钮样式切换
    if(btn) {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    // 清理地图
    layers.spots.clearLayers();
    layers.borders.clearLayers(); // 现代模式下通常清除历史边界
    
    // 清理列表
    const listEl = document.getElementById('spotList');
    if(!listEl) return;
    listEl.innerHTML = '';

    let bounds = [];
    
    // 确保 spots 数据存在 (来自 data.js)
    const safeSpots = (typeof spots !== 'undefined') ? spots : [];

    safeSpots.forEach(s => {
        // 搜索过滤
        if (currentSearch) {
            const searchStr = (s.name + s.desc + s.area).toLowerCase();
            if (!searchStr.includes(currentSearch)) return;
        }

        // 标签过滤
        let pass = false;
        if (filter === 'all') pass = true;
        else if (filter === '高校' && s.tags && s.tags.includes('高校')) pass = true;
        else if (filter === '学府' && s.tags && s.tags.includes('学府')) pass = true;
        else if (s.area.indexOf(filter) > -1) pass = true;

        if (!pass) return;

        // 颜色定义
        let c = "#10b981"; // 默认绿色
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
            if(window.innerWidth < 768) {
                const mapEl = document.getElementById('map');
                if(mapEl) mapEl.scrollIntoView({behavior: "smooth"});
            }
        };
        listEl.appendChild(card);

        // 渲染地图标记
        const m = L.marker([s.lat, s.lng]).addTo(layers.spots);
        bounds.push([s.lat, s.lng]);
        
        m.bindPopup(`
            <div class="pop-head" style="background:${c}">${s.name}</div>
            <div class="pop-body">
                ${s.desc}
                <br>
                <a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" style="color:${c};display:block;margin-top:8px;text-decoration:none;font-weight:bold;">
                    🚀 导航去这里
                </a>
            </div>
        `);
    });
    
    // 自动缩放适应标记
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        // 如果没有结果，保持默认视图
        // map.setView([27.7017, 111.9963], 9);
    }
}

// 5. 搜索功能入口
window.searchSpots = function(val) {
    currentSearch = val.toLowerCase().trim();
    window.filterSpots(); // 重新调用筛选
};

// 6. 模式切换 (现代/历史)
window.setMode = function(mode) {
    // UI 状态切换
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const timeline = document.getElementById('timeline');

    if(mode === 'tour') {
        // 切换到现代模式
        const t1 = document.querySelector('.tab:nth-child(1)');
        if(t1) t1.classList.add('active');
        
        const v1 = document.getElementById('view-tour');
        if(v1) v1.classList.add('active');
        
        if(timeline) timeline.classList.remove('show');
        
        window.filterSpots(); // 重新加载景点
    } else {
        // 切换到历史模式
        const t2 = document.querySelector('.tab:nth-child(2)');
        if(t2) t2.classList.add('active');
        
        const v2 = document.getElementById('view-hist');
        if(v2) v2.classList.add('active');
        
        if(timeline) timeline.classList.add('show');
        
        loadHist(0); // 默认加载第一个朝代
    }
}

// 7. 历史模式加载逻辑
window.loadHist = function(idx) {
    document.querySelectorAll('.t-btn').forEach((b, i) => b.classList.toggle('active', i===idx));
    
    // 检查 historyEras 是否存在 (来自 data.js)
    if (typeof historyEras === 'undefined') {
        console.error("data.js 未加载或 historyEras 未定义");
        return;
    }

    const d = historyEras[idx];
    if(!d) return;

    // 更新侧边栏文字
    const hTitle = document.getElementById('h-title');
    if(hTitle) hTitle.innerText = d.title;
    
    const hEra = document.getElementById('h-era');
    if(hEra) hEra.innerText = d.year;
    
    const hDesc = document.getElementById('h-desc');
    if(hDesc) hDesc.innerHTML = d.desc;

    // 清除现代景点，准备绘制历史边界
    layers.spots.clearLayers();
    layers.borders.clearLayers();

    // 关键点：检查 geoData 是否已加载
    if(geoData) {
        L.geoJSON(geoData, {
            style: f => {
                const mapName = (f.properties.name || "").toString();
                // 查找当前区块是否属于当前历史时期的某个分组
                let g = d.groups.find(group => 
                    group.members.some(keyword => mapName.indexOf(keyword) > -1)
                );
                
                if(g) {
                    return { color: g.color, weight: 2, fillColor: g.color, fillOpacity: 0.5 };
                }
                // 不相关的区域设为透明
                return { opacity: 0, fillOpacity: 0, weight: 0 };
            },
            onEachFeature: (feature, layer) => {
                // 给历史区块添加点击提示
                 const mapName = (feature.properties.name || "").toString();
                 let g = d.groups.find(group => 
                    group.members.some(keyword => mapName.indexOf(keyword) > -1)
                );
                if(g) {
                    layer.bindPopup(`<b>${mapName}</b><br>隶属：${g.name}`);
                }
            }
        }).addTo(layers.borders);

        // 飞到设定的中心点
        map.flyTo(d.center, d.zoom);
    } else {
        alert("地图数据 (loudi.json) 尚未加载完成，请稍后再试或检查文件是否上传。");
    }
}

// 8. 启动！
// 页面加载完成后，默认显示现代景点
setTimeout(() => {
    window.filterSpots('all'); 
}, 500);
