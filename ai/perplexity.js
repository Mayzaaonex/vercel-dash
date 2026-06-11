const crypto = require('crypto');
const https = require('https');
const http = require('http');

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

const MODES = ['concise', 'copilot', 'deep_research'];
const MODEL = 'turbo';
const FOCUS = ['internet', 'scholar', 'writing', 'wolfram', 'youtube', 'reddit'];

function randomUA() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

function randomEdgeHeaders() {
  const major = 148;
  const brands = [
    `"Chromium";v="${major}", "Microsoft Edge";v="${major}", "Not/A)Brand";v="99"`,
    `"Chromium";v="${major - 1}", "Microsoft Edge";v="${major - 1}", "Not/A)Brand";v="99"`,
  ];
  return brands[Math.floor(Math.random() * brands.length)];
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchBuffer(url, options = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
          text: () => Buffer.concat(chunks).toString('utf8'),
          json: () => { try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; } },
          getSetCookie: () => {
            const setCookie = res.headers['set-cookie'];
            return Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
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

async function bootstrap() {
  const visitorId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const edgeVid = crypto.randomUUID();
  const edgeSid = crypto.randomUUID();
  const captured = [];

  try {
    const res = await fetchBuffer('https://www.perplexity.ai/', {
      method: 'GET',
      headers: {
        'user-agent': randomUA(),
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua': randomEdgeHeaders(),
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'upgrade-insecure-requests': '1',
      },
    });
    const setCookies = res.getSetCookie();
    for (const c of setCookies) captured.push(c.split(';')[0]);
  } catch {}

  const cookieParts = [
    `pplx.visitor-id=${visitorId}`,
    `pplx.session-id=${sessionId}`,
    `pplx.edge-vid=${edgeVid}`,
    `pplx.edge-sid=${edgeSid}`,
    'pplx.trackingAllowed=true',
    ...captured,
  ];

  return { visitorId, sessionId, cookie: cookieParts.join('; ') };
}

function parseSSEFromBuffer(buffer) {
  const text = buffer.toString('utf8');
  let lastChunk = null;
  const allChunks = [];

  const events = text.split(/\r?\n\r?\n/);
  for (const ev of events) {
    if (!ev.trim()) continue;
    let dataStr = '';
    for (const ln of ev.split(/\r?\n/)) {
      if (ln.startsWith('data: ')) dataStr += ln.slice(6);
      else if (ln.startsWith('data:')) dataStr += ln.slice(5).trim();
    }
    if (!dataStr || dataStr === '{}') continue;
    try {
      const obj = JSON.parse(dataStr);
      if (obj && typeof obj === 'object' && Object.keys(obj).length > 0) {
        lastChunk = obj;
        allChunks.push(obj);
      }
    } catch {}
  }
  return { lastChunk, allChunks };
}

function extractAnswerFromChunk(chunk) {
  if (!chunk?.text) return { answer: '', chunks: [], structured: [], extra_web_results: [] };
  let steps;
  try { steps = JSON.parse(chunk.text); } catch { return { answer: '', chunks: [], structured: [], extra_web_results: [] }; }
  if (!Array.isArray(steps)) return { answer: '', chunks: [], structured: [], extra_web_results: [] };
  const finalStep = steps.find(s => s.step_type === 'FINAL');
  if (!finalStep?.content?.answer) return { answer: '', chunks: [], structured: [], extra_web_results: [] };
  try {
    const inner = JSON.parse(finalStep.content.answer);
    return {
      answer: inner.answer || '',
      chunks: inner.chunks || [],
      structured: inner.structured_answer || [],
      extra_web_results: inner.extra_web_results || [],
    };
  } catch {
    return { answer: '', chunks: [], structured: [], extra_web_results: [] };
  }
}

function cleanSources(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(s => {
    let domain = null;
    try { domain = new URL(s.url || s.link || '').hostname.replace(/^www\./, ''); } catch {}
    return {
      title: s.name || s.title || '',
      url: s.url || s.link || '',
      snippet: s.snippet || s.description || '',
      domain,
      publishedAt: s.publish_date || s.timestamp || null,
    };
  }).filter(s => s.url);
}

function extractMedia(lastChunk) {
  if (!lastChunk?.blocks || !Array.isArray(lastChunk.blocks)) return [];
  const media = [];
  for (const block of lastChunk.blocks) {
    const items = block?.media_items_block?.media_items;
    if (Array.isArray(items)) {
      for (const it of items) {
        media.push({
          title: it.title || it.name || '',
          url: it.medium_url || it.url || it.image_url || it.image || '',
          thumbnail: it.thumbnail || it.thumb_url || it.thumb || null,
          source: it.source || it.source_url || null,
          domain: it.domain || null,
        });
      }
    }
    const images = block?.inline_images_block?.images;
    if (Array.isArray(images)) {
      for (const img of images) {
        media.push({
          title: img.title || '',
          url: img.image_url || img.url || '',
          thumbnail: img.thumbnail || null,
          source: img.source_url || null,
        });
      }
    }
  }
  return media.filter(m => m.url);
}

async function perplexitySearch(query, options = {}) {
  const {
    mode = 'concise',
    focus = 'internet',
    sources = ['web'],
    timezone = 'UTC',
    language = 'en-US',
    retries = 2,
  } = options;

  const q = String(query).trim();
  if (!q) return { query: '', answer: '', sources: [], media: [], related: [], error: 'Empty query' };

  let lastError = 'unknown error';
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await delay(2000 * attempt);

    const session = await bootstrap();
    const frontendUuid = crypto.randomUUID();
    const cacheKey = crypto.randomUUID();
    const contextUuid = crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const rumSessionId = crypto.randomUUID();

    const payload = {
      params: {
        attachments: [],
        language,
        timezone,
        search_focus: focus,
        sources,
        frontend_uuid: frontendUuid,
        mode,
        model_preference: MODEL,
        is_related_query: false,
        is_sponsored: false,
        frontend_context_uuid: contextUuid,
        prompt_source: 'user',
        query_source: 'home',
        is_incognito: false,
        time_from_first_type: 3000 + Math.floor(Math.random() * 4000),
        local_search_enabled: false,
        use_schematized_api: true,
        send_back_text_in_streaming_api: false,
        supported_block_use_cases: [
          'answer_modes', 'media_items', 'knowledge_cards', 'inline_entity_cards',
          'place_widgets', 'finance_widgets', 'news_widgets', 'shopping_widgets',
          'search_result_widgets', 'inline_images', 'inline_assets', 'placeholder_cards',
          'diff_blocks', 'inline_knowledge_cards', 'entity_group_v2', 'refinement_filters',
          'answer_tabs', 'preserve_latex', 'in_context_suggestions',
          'pending_followups', 'inline_claims', 'unified_assets',
        ],
        client_coordinates: null,
        mentions: [],
        dsl_query: q,
        skip_search_enabled: true,
        is_nav_suggestions_disabled: false,
        source: 'default',
        always_search_override: false,
        override_no_search: false,
        client_search_results_cache_key: cacheKey,
        should_ask_for_mcp_tool_confirmation: true,
        browser_agent_allow_once_from_toggle: false,
        force_enable_browser_agent: false,
        supported_features: ['browser_agent_permission_banner_v1.1'],
        extended_context: false,
        version: '2.18',
        rum_session_id: rumSessionId,
      },
      query_str: q,
    };

    const body = JSON.stringify(payload);
    let res;
    try {
      res = await fetchBuffer('https://www.perplexity.ai/rest/sse/perplexity_ask', {
        method: 'POST',
        headers: {
          'accept': 'text/event-stream',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'no-cache',
          'content-type': 'application/json',
          'cookie': session.cookie,
          'origin': 'https://www.perplexity.ai',
          'pragma': 'no-cache',
          'referer': 'https://www.perplexity.ai/',
          'sec-ch-ua': randomEdgeHeaders(),
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': randomUA(),
          'x-perplexity-request-endpoint': 'https://www.perplexity.ai/rest/sse/perplexity_ask',
          'x-perplexity-request-reason': 'ask-query-state-provider',
          'x-perplexity-request-try-number': String(attempt + 1),
          'x-request-id': requestId,
          'content-length': Buffer.byteLength(body),
        },
        body,
      }, 60000);
    } catch (e) {
      lastError = `Fetch error: ${e.message}`;
      continue;
    }

    if (res.status !== 200) {
      lastError = `HTTP ${res.status}`;
      continue;
    }

    const parsed = parseSSEFromBuffer(res.body);
    if (!parsed.lastChunk) {
      lastError = 'empty SSE stream';
      continue;
    }

    if (parsed.lastChunk.error_code || parsed.lastChunk.status === 'failed') {
      lastError = parsed.lastChunk.error_code || 'unknown error';
      continue;
    }

    const inner = extractAnswerFromChunk(parsed.lastChunk);
    if (!inner.answer) {
      lastError = 'no answer in final chunk';
      if (attempt < retries) continue;
    }

    return {
      query: q, mode, focus,
      answer: inner.answer.replace(/【\d+†[^】]*】/g, '').trim(),
      sources: cleanSources(parsed.lastChunk.sources),
      extraSources: cleanSources(inner.extra_web_results),
      media: extractMedia(parsed.lastChunk),
      related: parsed.lastChunk.related_queries || [],
      threadId: parsed.lastChunk.backend_uuid || null,
      threadUrl: parsed.lastChunk.thread_url_slug
        ? `https://www.perplexity.ai/search/${parsed.lastChunk.thread_url_slug}`
        : null,
    };
  }

  return { query: q, answer: '', sources: [], media: [], related: [], error: lastError };
}

// ========== VERCEL HANDLER ==========
module.exports = async (req, res) => {
    const { text, mode, focus } = req.query || {};

    if (!text) {
        return res.status(200).json({
            name: 'Perplexity AI Scraper',
            modes: MODES,
            focus: FOCUS,
            model: MODEL,
            usage: '/api/perplexity?text=apa+itu+ai&mode=concise&focus=internet',
            examples: {
                basic: '/api/perplexity?text=latest+news',
                scholar: '/api/perplexity?text=quantum+computing&focus=scholar',
                copilot: '/api/perplexity?text=write+a+poem&mode=copilot&focus=writing'
            }
        });
    }

    try {
        const result = await perplexitySearch(text, { 
            mode: mode || 'concise', 
            focus: focus || 'internet' 
        });
        return res.status(200).json(result);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

// ========== CLI ==========
if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonFlag = args.includes('-j') || args.includes('--json');
  let mode = 'concise';
  let focus = 'internet';
  let queryArgs = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-m' && args[i + 1]) { mode = args[i + 1]; i++; }
    else if (a === '--focus' && args[i + 1]) { focus = args[i + 1]; i++; }
    else if (a === '-j' || a === '--json') {}
    else { queryArgs.push(a); }
  }

  const query = queryArgs.join(' ');
  if (!query) {
    console.log('Usage: node perplexity.js "pertanyaan" [-m mode] [--focus focus] [-j]');
    console.log('Modes: ' + MODES.join(', '));
    console.log('Focus: ' + FOCUS.join(', '));
    process.exit(0);
  }

  perplexitySearch(query, { mode, focus })
    .then(result => {
      if (jsonFlag) console.log(JSON.stringify(result, null, 2));
      else if (result.error) console.log('Error:', result.error);
      else console.log(result.answer);
    })
    .catch(e => console.error('Fatal:', e.message));
}