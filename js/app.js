// 1. 初始化地图
const map = L.map('map', { zoomControl: false }).setView([27.7017, 111.9963], 9);
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ["01", "02", "03", "04"], attribution: '© 高德地图'
}).addTo(map);

// 2. 核心变量
const layers = { spots: L.layerGroup().addTo(map), borders: L.layerGroup().addTo(map) };
let geoData = null;

// 3. 读取本地 loudi.json
fetch('loudi.json')
    .then(r => r.json())
    .then(d => {
        geoData = d;
        setMode('tour');
    })
    .catch(e => {
        console.error("加载 loudi.json 失败", e);
        alert("⚠️ 无法加载 'loudi.json' 文件！\n\n请确保：\n1. loudi.json 已上传到 GitHub 仓库（或与 html 在同一目录）。\n2. 文件名全小写。\n3. 如果是本地预览，请使用 VS Code Live Server，浏览器直接打开 file:// 无法读取本地文件。");
    });

// 4. 模式切换逻辑
window.setMode = function(mode) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
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

// 5. 渲染现代景点
window.renderTour = function(filter = 'all', btn) {
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

    // 注意：这里的 spots 变量来自 data.js
    spots.forEach(s => {
        // 筛选逻辑
        if(filter === '高校' && (!s.tags || !s.tags.includes('高校'))) return;
        if(filter === '学府' && (!s.tags || !s.tags.includes('学府'))) return;
        if(filter !== 'all' && filter !== '高校' && filter !== '学府' && s.area.indexOf(filter) === -1) return;

        let c = "#666";
        if(s.area.includes("新化")) c="#8b5cf6";
        if(s.area.includes("双峰")) c="#3b82f6";
        if(s.area.includes("冷水江")) c="#f97316";
        if(s.area.includes("涟源")) c="#10b981";
        if(s.area.includes("娄星")) c="#ef4444";
        
        // 列表
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
        
        // 列表点击事件
        card.onclick = () => {
            map.flyTo([s.lat, s.lng], 15);
            m.openPopup();
        };
        document.getElementById('spotList').appendChild(card);

        // 标记
        const m = L.marker([s.lat, s.lng], { draggable: false }).addTo(layers.spots);
        
        m.bindPopup(`
            <div class="pop-head" style="background:${c}">${s.name}</div>
            <div class="pop-body">${s.desc}<a href="https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${s.name}" target="_blank" class="pop-link" style="background:${c}">🚀 导航去这里</a></div>
        `);
    });
    
    if(filter === 'all' || filter === '高校' || filter === '学府') map.setView([27.7017, 111.9963], 9);
}

// 6. 全局暴露筛选函数供 HTML 调用
window.filterSpots = renderTour;

// 7. 渲染历史疆域
window.loadHist = function(idx) {
    document.querySelectorAll('.t-btn').forEach((b, i) => b.classList.toggle('active', i===idx));
    // 注意：historyEras 变量来自 data.js
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