const https = require('https');
const http = require('http');

const BASE = 'https://deep-seek.ai';
const API = `${BASE}/api/chat`;

const MODELS = {
  'v4-flash': 'deepseek/deepseek-v4-flash',
  'r1': 'deepseek/deepseek-r1',
};

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchBuffer(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 15000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
          text: () => Buffer.concat(chunks).toString('utf8'),
          getSetCookie: () => {
            const sc = res.headers['set-cookie'];
            return Array.isArray(sc) ? sc : (sc ? [sc] : []);
          },
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
  const res = await fetchBuffer(BASE, {
    headers: {
      'User-Agent': randomUA(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = res.text();
  const csrfMatch = html.match(/<meta name="csrf-token" content="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : '';

  const setCookies = res.getSetCookie();
  const xsrfCookie = setCookies.find(c => c.includes('XSRF-TOKEN='));
  const sessionCookie = setCookies.find(c => c.includes('deep_seek_session='));

  const xsrfRaw = xsrfCookie ? xsrfCookie.split(';')[0].split('=')[1] : '';
  const xsrfDecoded = decodeURIComponent(xsrfRaw);

  const cookieParts = [];
  if (xsrfCookie) cookieParts.push(xsrfCookie.split(';')[0]);
  if (sessionCookie) cookieParts.push(sessionCookie.split(';')[0]);

  return { csrf, xsrfToken: xsrfDecoded, cookie: cookieParts.join('; ') };
}

function parseSSEStream(res, onChunk) {
  return new Promise((resolve, reject) => {
    let content = '', reasoning = '', buffer = '';
    res.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const json = JSON.parse(raw);
          const delta = json?.choices?.[0]?.delta || {};
          if (delta.reasoning) { reasoning += delta.reasoning; if (onChunk) onChunk({ type: 'reasoning', text: delta.reasoning }); }
          if (delta.content) { content += delta.content; if (onChunk) onChunk({ type: 'content', text: delta.content }); }
        } catch {}
      }
    });
    res.on('end', () => resolve({ reasoning, content }));
    res.on('error', reject);
  });
}

async function chat(prompt, model = 'v4-flash', onChunk, retries = 3) {
  if (!MODELS[model]) return { success: false, error: `Model invalid. Pilih: ${Object.keys(MODELS).join(', ')}` };
  const modelId = MODELS[model];
  let session = await getSession();
  const body = JSON.stringify({ model: modelId, messages: [{ role: 'user', content: prompt }] });
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) { await delay(2000 * attempt); session = await getSession(); }
    const headers = {
      'Content-Type': 'application/json', Accept: 'text/event-stream',
      'X-CSRF-TOKEN': session.csrf, 'X-XSRF-TOKEN': session.xsrfToken,
      Cookie: session.cookie, Origin: BASE, Referer: `${BASE}/`,
      'User-Agent': randomUA(), 'Content-Length': Buffer.byteLength(body),
    };
    try {
      const res = await new Promise((resolve, reject) => {
        const req = https.request(API, { method: 'POST', headers, timeout: 180000 }, resolve);
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(body); req.end();
      });
      if (res.statusCode === 419 || res.statusCode === 401) { lastError = `HTTP ${res.statusCode}`; continue; }
      if (res.statusCode !== 200) {
        const chunks = []; for await (const c of res) chunks.push(c);
        lastError = `HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 300)}`; continue;
      }
      const result = await parseSSEStream(res, onChunk);
      return { success: true, model: modelId, ...result };
    } catch (e) { lastError = e.message; }
  }
  return { success: false, error: lastError || 'Unknown error' };
}

// ========== VERCEL SERVERLESS HANDLER ==========
module.exports = async (req, res) => {
    const { text, model } = req.query || {};

    if (!text) {
        return res.status(200).json({
            creator: 'Rynaqrtz',
            scraper: 'DeepSeek AI',
            base: 'https://deep-seek.ai',
            models: MODELS,
            usage: '/ai/deepseek?text=halo&model=v4-flash',
            example: {
                flash: '/ai/deepseek?text=apa itu AI&model=v4-flash',
                r1: '/ai/deepseek?text=apa itu AI&model=r1'
            }
        });
    }

    try {
        const result = await chat(text, model || 'v4-flash');
        return res.status(200).json(result);
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
};