const API_BASE = 'https://api.mayzacasaos.my.id';
const MAX_HISTORY = 24;
let trafficChart;
let trafficData = Array(MAX_HISTORY).fill(0);
let trafficLabels = Array(MAX_HISTORY).fill('--:--');
let prevTotal = 0;
let totalUptimeSeconds = 0;

// Chart
function initChart() {
    const ctx = document.getElementById('trafficChart')?.getContext('2d');
    if (!ctx) return;
    trafficChart = new Chart(ctx, {
        type: 'line',
        data: { labels: trafficLabels, datasets: [{ data: trafficData, borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.03)', fill: true, tension: 0.4, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 400 }, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#555', font: { size: 9 }, maxTicksLimit: 6 } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#555', font: { size: 9 }, maxTicksLimit: 4 }, beginAtZero: true } } }
    });
}

// Fetch Stats
async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/api/stats`);
        const data = await res.json();
        const now = new Date();
        const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
        const newRequests = Math.max(0, (data.total || 0) - prevTotal);
        prevTotal = data.total || 0;
        if (trafficChart) {
            trafficData.push(newRequests); trafficData.shift();
            trafficLabels.push(timeStr); trafficLabels.shift();
            trafficChart.data.datasets[0].data = [...trafficData];
            trafficChart.data.labels = [...trafficLabels];
            trafficChart.update('active');
        }
        document.getElementById('total-requests').textContent = (data.total || 0).toLocaleString();
        document.getElementById('credits-used').textContent = (data.credits || 0).toLocaleString();
        document.getElementById('credit-bar').style.width = Math.min(100, (data.credits || 0) / 125) + '%';
        document.getElementById('credit-label').textContent = `${(data.credits || 0).toLocaleString()} / 12,500`;
        document.getElementById('trend-requests').textContent = newRequests > 0 ? `↑ ${newRequests}` : '↑ 0';
        updateActivity(data.history || []);
    } catch (e) {}
}

// Fetch Uptime
async function fetchUptime() {
    try {
        const res = await fetch(`${API_BASE}/api/uptime`);
        const data = await res.json();
        totalUptimeSeconds = data.seconds || 0;
    } catch (e) {}
}

function updateUptime() {
    const el = document.getElementById('uptime-display');
    if (!el) return;
    const h = Math.floor(totalUptimeSeconds / 3600);
    const m = Math.floor((totalUptimeSeconds % 3600) / 60);
    const s = totalUptimeSeconds % 60;
    el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Fetch Health
async function fetchHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        const keys = ['cpu', 'ram', 'disk', 'network'];
        document.querySelectorAll('.health-item').forEach((item, i) => {
            const key = keys[i];
            if (data[key] !== undefined) {
                item.querySelector('.health-fill').style.width = data[key] + '%';
                item.querySelector('.health-value').textContent = data[key] + '%';
            }
        });
    } catch (e) {}
}

// Update Activity
function updateActivity(history) {
    const list = document.getElementById('activity-list');
    if (!list || !history.length) return;
    const recent = history.slice(-5).reverse();
    list.innerHTML = recent.map(h => {
        const time = new Date(h.time);
        const diff = Math.floor((Date.now() - time) / 1000);
        const ago = diff < 60 ? `${diff}s ago` : diff < 3600 ? `${Math.floor(diff/60)}m ago` : `${Math.floor(diff/3600)}h ago`;
        return `<div class="activity-item"><div class="activity-dot"></div><div class="activity-info"><span class="activity-text">${h.type || 'API Request'}</span><span class="activity-time">${ago}</span></div></div>`;
    }).join('');
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Sidebar !== 'undefined') Sidebar.render('dashboard');
    initChart();
    fetchStats(); 
    fetchHealth();
    
    // Fetch uptime + update tiap detik
    fetchUptime().then(() => {
        updateUptime();
    });
    
    setInterval(fetchStats, 3000);
    setInterval(fetchHealth, 5000);
    setInterval(() => {
        fetchUptime().then(() => updateUptime());
    }, 1000); // ← FETCH UPTIME TIAP 1 DETIK
});