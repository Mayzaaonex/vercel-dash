const https = require('https');
const http = require('http');

const BASE = 'https://chatgpt.org';
const API = `${BASE}/api/chat`;

const MODELS = {
    "claude": "anthropic/claude-haiku-4-5",
    "gpt4mini": "openai/gpt-4o-mini",
    "deepseek": "deepseek/deepseek-chat-v3-0324",
    "qwen": "qwen/qwen-2.5-72b-instruct",
    "perplexity": "perplexity/sonar",
};

const UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
];

function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchWithCookies(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: options.timeout || 30000,
        }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const body = Buffer.concat(chunks);
                const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]);
                resolve({
                    status: res.statusCode,
                    body: body,
                    text: body.toString('utf8'),
                    cookies: cookies,
                    cookieStr: cookies.join('; ')
                });
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function getSession() {
    const headers = {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    };

    let allCookies = [];
    const r1 = await fetchWithCookies(BASE, { headers });
    allCookies = [...allCookies, ...r1.cookies];
    
    const r2 = await fetchWithCookies(`${BASE}/chat/`, { 
        headers: { ...headers, 'Referer': BASE } 
    });
    allCookies = [...allCookies, ...r2.cookies];

    return [...new Set(allCookies)].join('; ');
}

async function chat(prompt, model = 'claude') {
    if (!MODELS[model]) {
        return { success: false, error: `Invalid model. Pilih: ${Object.keys(MODELS).join(', ')}` };
    }

    const modelId = MODELS[model];
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await delay(3000 * attempt);
        
        try {
            const cookieStr = await getSession();
            
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'Origin': BASE,
                'Referer': `${BASE}/chat/`,
                'User-Agent': randomUA(),
                'Cookie': cookieStr,
            };

            const body = JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: prompt }],
            });

            const res = await fetchWithCookies(API, {
                method: 'POST',
                headers,
                body,
                timeout: 180000,
            });

            if (res.status === 429 || res.status === 403) {
                lastError = `HTTP ${res.status}`;
                continue;
            }

            if (res.status !== 200) {
                lastError = `HTTP ${res.status}: ${res.text.slice(0, 200)}`;
                continue;
            }

            // Parse SSE
            let content = '';
            const lines = res.text.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (!data || data === '[DONE]') continue;
                    try {
                        const json = JSON.parse(data);
                        const text = json?.choices?.[0]?.delta?.content || '';
                        content += text;
                    } catch (e) {}
                }
            }

            return { success: true, model: modelId, content };
        } catch (e) {
            lastError = e.message;
        }
    }

    return { success: false, error: lastError || 'Unknown error' };
}

// ========== VERCEL HANDLER ==========
module.exports = async (req, res) => {
    const { text, model } = req.query || {};

    if (!text) {
        return res.json({
            creator: 'Rynaqrtz',
            models: MODELS,
            usage: '/ai/gpt?text=halo&model=gpt4mini',
        });
    }

    try {
        const result = await chat(text, model || 'claude');
        return res.json(result);
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
};