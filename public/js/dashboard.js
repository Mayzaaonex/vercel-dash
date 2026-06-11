const MAX_HISTORY = 30; // 1 bulan
const API_STATS_URL = '/api/stats';
let trafficChart;
let trafficData = Array(MAX_HISTORY).fill(0);
let trafficLabels = Array(MAX_HISTORY).fill('');
let prevTotal = 0;
let totalUptimeSeconds = 0;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ========== PARTICLE SYSTEM ==========
class CursorParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
        this.frameCount = 0;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
        });
        window.addEventListener('touchmove', (e) => {
            if (e.touches[0]) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
                this.mouse.active = true;
            }
        });
        this.createParticles(20);
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles(count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.25 + 0.05,
                trail: []
            });
        }
    }

    update() {
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (this.mouse.active) {
                const dx = this.mouse.x - p.x;
                const dy = this.mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    const force = (200 - dist) / 200 * 0.02;
                    p.vx += dx * force;
                    p.vy += dy * force;
                }
            }
            p.vx *= 0.98;
            p.vy *= 0.98;
            if (p.x < -10) p.x = this.canvas.width + 10;
            if (p.x > this.canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = this.canvas.height + 10;
            if (p.y > this.canvas.height + 10) p.y = -10;
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let p of this.particles) {
            if (p.trail.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.3})`;
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
            }
        }
        if (this.frameCount % 4 === 0) {
            const maxDist = 120;
            for (let i = 0; i < this.particles.length; i++) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const dx = this.particles[i].x - this.particles[j].x;
                    const dy = this.particles[i].y - this.particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const opacity = (1 - dist / maxDist) * 0.04;
                        this.ctx.beginPath();
                        this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                        this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                        this.ctx.lineWidth = 0.3;
                        this.ctx.stroke();
                    }
                }
            }
        }
        for (let p of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            this.ctx.fill();
        }
        if (this.mouse.active) {
            const gradient = this.ctx.createRadialGradient(this.mouse.x, this.mouse.y, 0, this.mouse.x, this.mouse.y, 60);
            gradient.addColorStop(0, 'rgba(255,255,255,0.02)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            this.ctx.beginPath();
            this.ctx.arc(this.mouse.x, this.mouse.y, 60, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    }

    animate() {
        this.frameCount++;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// ========== UPTIME ==========
async function fetchUptime() {
    try {
        const res = await fetch('/api/uptime');
        if (!res.ok) return;
        const data = await res.json();
        totalUptimeSeconds = data.seconds || 0;
    } catch (e) {}
}

function updateUptime() {
    const uptimeEl = document.getElementById('uptime-display');
    if (!uptimeEl) return;
    const hours = Math.floor(totalUptimeSeconds / 3600);
    const minutes = Math.floor((totalUptimeSeconds % 3600) / 60);
    const seconds = totalUptimeSeconds % 60;
    uptimeEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ========== SYSTEM HEALTH ==========
async function fetchHealth() {
    try {
        const res = await fetch('/api/health');
        if (!res.ok) return;
        const data = await res.json();
        
        const healthItems = document.querySelectorAll('.health-item');
        const keys = ['cpu', 'ram', 'disk', 'network'];
        
        healthItems.forEach((item, i) => {
            const key = keys[i];
            if (data[key] !== undefined) {
                const fill = item.querySelector('.health-fill');
                const value = item.querySelector('.health-value');
                if (fill) fill.style.width = data[key] + '%';
                if (value) value.textContent = data[key] + '%';
            }
        });
    } catch (e) {}
}

// ========== CHART ==========
function initChartLabels() {
    trafficLabels = [];
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= MAX_HISTORY; i++) {
        const day = Math.max(1, daysInMonth - MAX_HISTORY + i);
        trafficLabels.push(day.toString());
    }
}

function initChart() {
    const ctx = document.getElementById('trafficChart')?.getContext('2d');
    if (!ctx) return;

    initChartLabels();

    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trafficLabels,
            datasets: [{
                data: trafficData,
                borderColor: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                fill: true,
                tension: 0.4,
                borderWidth: 1.5,
                pointRadius: 2,
                pointBackgroundColor: '#fff',
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    grid: { color: 'rgba(255,255,255,0.03)' }, 
                    ticks: { color: '#555', font: { size: 9 }, maxTicksLimit: 10 } 
                },
                y: { 
                    grid: { color: 'rgba(255,255,255,0.03)' }, 
                    ticks: { color: '#555', font: { size: 9 }, maxTicksLimit: 4 }, 
                    beginAtZero: true 
                }
            }
        }
    });
}

// ========== FETCH STATS ==========
async function fetchStats() {
    try {
        const res = await fetch(API_STATS_URL);
        if (!res.ok) return;
        const data = await res.json();

        // Reset kalo bulan baru
        const now = new Date();
        if (now.getMonth() !== currentMonth || now.getFullYear() !== currentYear) {
            trafficData = Array(MAX_HISTORY).fill(0);
            initChartLabels();
            currentMonth = now.getMonth();
            currentYear = now.getFullYear();
        }

        const newRequests = Math.max(0, (data.total || 0) - prevTotal);
        prevTotal = data.total || 0;

        if (trafficChart && newRequests > 0) {
            trafficData.push(trafficData[trafficData.length - 1] + newRequests);
            trafficData.shift();
            trafficChart.data.datasets[0].data = [...trafficData];
            trafficChart.update('active');
        }

        // Total Requests
        const totalEl = document.getElementById('total-requests');
        if (totalEl) totalEl.textContent = (data.total || 0).toLocaleString();

        // Credits
        const creditsEl = document.getElementById('credits-used');
        const creditBar = document.getElementById('credit-bar');
        const creditLabel = document.getElementById('credit-label');
        if (creditsEl) creditsEl.textContent = (data.credits || 0).toLocaleString();
        if (creditBar) creditBar.style.width = Math.min(100, (data.credits || 0) / 125) + '%';
        if (creditLabel) creditLabel.textContent = `${(data.credits || 0).toLocaleString()} / 12,500`;

        // Trend
        const trendReq = document.getElementById('trend-requests');
        if (trendReq) {
            trendReq.textContent = newRequests > 0 ? `↑ ${newRequests}` : '↑ 0';
            trendReq.className = newRequests > 0 ? 'stat-trend up' : 'stat-trend down';
        }

        const trendCred = document.getElementById('trend-credits');
        if (trendCred) {
            trendCred.textContent = newRequests > 0 ? `↑ ${newRequests}` : '↑ 0';
            trendCred.className = newRequests > 0 ? 'stat-trend up' : 'stat-trend down';
        }

        // Update Activity List
        const activityList = document.getElementById('activity-list');
        if (activityList && data.history && data.history.length > 0) {
            const recent = data.history.slice(-5).reverse();
            activityList.innerHTML = recent.map(h => {
                const time = new Date(h.time);
                const diff = Math.floor((Date.now() - time) / 1000);
                const timeAgo = diff < 60 ? `${diff}s ago` : diff < 3600 ? `${Math.floor(diff/60)}m ago` : `${Math.floor(diff/3600)}h ago`;
                return `
                    <div class="activity-item">
                        <div class="activity-dot"></div>
                        <div class="activity-info">
                            <span class="activity-text">${h.type || 'API Request'}</span>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                        <span class="activity-status success">200</span>
                    </div>`;
            }).join('');
        }

    } catch (e) {}
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Sidebar !== 'undefined') Sidebar.render('dashboard');

    new CursorParticleSystem();
    initChart();
    
    fetchStats();
    setInterval(fetchStats, 3000);

    fetchUptime().then(() => {
        updateUptime();
        setInterval(updateUptime, 1000);
    });
    setInterval(fetchUptime, 10000);

    fetchHealth();
    setInterval(fetchHealth, 5000);
});