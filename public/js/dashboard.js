const MAX_HISTORY = 24;
const API_STATS_URL = '/api/stats';
let trafficChart;
let trafficData = Array(MAX_HISTORY).fill(0);
let trafficLabels = Array(MAX_HISTORY).fill('--:--');
let prevTotal = 0;
let totalUptimeSeconds = 0;

// ========== PARTICLE SYSTEM ==========
class CursorParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.frameCount = 0;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('touchmove', (e) => {
            if (e.touches[0]) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            }
        });
        this.createParticles(25);
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
                vx: 0, vy: 0,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.3 + 0.1,
                speed: Math.random() * 0.02 + 0.01
            });
        }
    }

    update() {
        for (let p of this.particles) {
            const dx = this.mouse.x - p.x;
            const dy = this.mouse.y - p.y;
            p.vx += dx * p.speed * 0.05;
            p.vy += dy * p.speed * 0.05;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.frameCount % 3 === 0) {
            const maxDist = 100;
            for (let i = 0; i < this.particles.length; i++) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const dx = this.particles[i].x - this.particles[j].x;
                    const dy = this.particles[i].y - this.particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const opacity = (1 - dist / maxDist) * 0.06;
                        this.ctx.beginPath();
                        this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                        this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                        this.ctx.lineWidth = 0.5;
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
        const gradient = this.ctx.createRadialGradient(this.mouse.x, this.mouse.y, 0, this.mouse.x, this.mouse.y, 80);
        gradient.addColorStop(0, 'rgba(255,255,255,0.03)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 80, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    animate() {
        this.frameCount++;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// ========== UPTIME (COUNTER) ==========
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

// ========== CHART ==========
function initChart() {
    const ctx = document.getElementById('trafficChart')?.getContext('2d');
    if (!ctx) return;

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
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(255,255,255,0.5)',
                pointHoverBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    grid: { color: 'rgba(255,255,255,0.03)' }, 
                    ticks: { color: '#555', font: { size: 9 }, maxTicksLimit: 6 } 
                },
                y: { 
                    grid: { color: 'rgba(255,255,255,0.03)' }, 
                    ticks: { color: '#555', font: { size: 9 }, maxTicksLimit: 4 }, 
                    min: 0, max: 30 
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
        const now = new Date();
        const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

        const newRequests = Math.max(0, (data.total || 0) - prevTotal);
        prevTotal = data.total || 0;

        if (trafficChart) {
            trafficData.push(newRequests);
            trafficData.shift();
            trafficLabels.push(timeStr);
            trafficLabels.shift();
            trafficChart.data.datasets[0].data = [...trafficData];
            trafficChart.data.labels = [...trafficLabels];
            trafficChart.update('active');
        }

        const totalEl = document.getElementById('total-requests');
        const creditsEl = document.getElementById('credits-used');
        const creditBar = document.getElementById('credit-bar');
        const creditLabel = document.getElementById('credit-label');

        if (totalEl) totalEl.textContent = (data.total || 0).toLocaleString();
        if (creditsEl) creditsEl.textContent = (data.credits || 0).toLocaleString();
        if (creditBar) creditBar.style.width = Math.min(100, (data.credits || 0) / 125) + '%';
        if (creditLabel) creditLabel.textContent = `${(data.credits || 0).toLocaleString()} / 12,500`;

        const trendReq = document.querySelector('.stat-item:nth-child(1) .stat-trend');
        if (trendReq) {
            trendReq.textContent = newRequests > 0 ? `↑ ${newRequests}` : '↑ 0';
            trendReq.className = newRequests > 0 ? 'stat-trend up' : 'stat-trend down';
        }

        const trendCred = document.querySelector('.stat-item:nth-child(2) .stat-trend');
        if (trendCred) {
            trendCred.textContent = newRequests > 0 ? `↑ ${newRequests}` : '↑ 0';
            trendCred.className = newRequests > 0 ? 'stat-trend up' : 'stat-trend down';
        }

    } catch (e) {}
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    // SIDEBAR DULU
    if (typeof Sidebar !== 'undefined') {
        Sidebar.render('dashboard');
    }

    new CursorParticleSystem();
    initChart();
    
    // Stats
    fetchStats();
    setInterval(fetchStats, 3000);

    // Uptime
    fetchUptime().then(() => {
        updateUptime();
        setInterval(updateUptime, 1000);
    });
    setInterval(fetchUptime, 10000);
});