import sys, json, argparse, codecs, time, random
from curl_cffi import requests as curlreq
from http.server import BaseHTTPRequestHandler
import urllib.parse

BASE = "https://chatgpt.org"
API = f"{BASE}/api/chat"
CREATOR = "rynaqrtz"

MODELS = {
    "claude":     "anthropic/claude-haiku-4-5",
    "gpt4mini":   "openai/gpt-4o-mini",
    "deepseek":   "deepseek/deepseek-chat-v3-0324",
    "qwen":       "qwen/qwen-2.5-72b-instruct",
    "perplexity": "perplexity/sonar",
}

UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
]

FP_POOL = ["chrome124", "chrome123", "chrome120", "safari17_0"]
LANG_POOL = ["en-US,en;q=0.9", "id-ID,id;q=0.9,en;q=0.8", "en-GB,en;q=0.9"]

def random_ua(): return random.choice(UA_POOL)
def random_fp(): return random.choice(FP_POOL)
def random_lang(): return random.choice(LANG_POOL)

def build_headers(extra=None):
    h = {
        "User-Agent": random_ua(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": random_lang(),
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache",
    }
    if extra:
        h.update(extra)
    return h

def get_deep_session():
    fp = random_fp()
    s = curlreq.Session()
    cookie_jar = {}

    r1 = s.get(BASE, impersonate=fp, headers=build_headers(), timeout=30)
    for k, v in r1.cookies.items():
        cookie_jar[k] = v

    r2 = s.get(f"{BASE}/chat/", impersonate=fp, headers=build_headers({"Referer": BASE}), timeout=30)
    for k, v in r2.cookies.items():
        cookie_jar[k] = v

    cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_jar.items()])
    return s, cookie_str, fp

def iter_sse(response):
    decoder = codecs.getincrementaldecoder('utf-8')()
    buf = ""
    for chunk in response.iter_content(chunk_size=1):
        if not chunk: break
        text = decoder.decode(chunk)
        if text:
            buf += text
            while '\n' in buf:
                line, buf = buf.split('\n', 1)
                yield line

def chat(prompt, model="claude", stream=True):
    if model not in MODELS:
        return {"success": False, "error": f"Model invalid. Pilih: {', '.join(MODELS.keys())}", "creator": CREATOR}

    model_id = MODELS[model]
    last_error = None
    max_retries = 5

    for attempt in range(max_retries):
        session, cookie_str, fp = get_deep_session()

        api_headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Accept-Language": random_lang(),
            "Origin": BASE,
            "Referer": f"{BASE}/chat/",
            "User-Agent": random_ua(),
            "Cookie": cookie_str,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Cache-Control": "no-cache",
        }

        payload = {
            "model": model_id,
            "messages": [{"role": "user", "content": prompt}],
        }

        try:
            r = session.post(API, json=payload, headers=api_headers, impersonate=fp, stream=True, timeout=180)

            if r.status_code in (429, 403):
                last_error = f"HTTP {r.status_code}, attempt {attempt+1}/{max_retries}"
                backoff = (2 ** attempt) * 6 + random.randint(3, 10)
                time.sleep(backoff)
                continue

            if r.status_code != 200:
                last_error = f"HTTP {r.status_code}: {r.text[:300]}"
                if attempt < max_retries - 1:
                    time.sleep(5)
                continue

            output = ""
            for line in iter_sse(r):
                line = line.strip()
                if not line or line.startswith(":") or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data: continue
                try:
                    obj = json.loads(data)
                    text = obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if text:
                        output += text
                        if stream: print(text, end="", flush=True)
                except json.JSONDecodeError: pass

            if stream: print()
            return {"success": True, "model": model_id, "content": output, "creator": CREATOR}

        except Exception as e:
            last_error = str(e)
            if attempt < max_retries - 1:
                time.sleep(6)

    return {"success": False, "error": last_error or "Unknown error", "creator": CREATOR}


# ========== VERCEL SERVERLESS HANDLER ==========
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = urllib.parse.parse_qs(self.path.split('?')[1] if '?' in self.path else '')
        text = params.get('text', [''])[0]
        model = params.get('model', ['claude'])[0]
        
        if not text:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "creator": CREATOR,
                "models": {k: v for k, v in MODELS.items()},
                "usage": "/ai/gpt?text=halo&model=gpt4mini"
            }).encode())
            return
        
        result = chat(text, model=model, stream=False)
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode())


# ========== CLI ==========
if __name__ == "__main__":
    p = argparse.ArgumentParser(description=f"ChatGPT.org Scraper - {CREATOR}")
    p.add_argument("prompt", nargs="*", help="Pertanyaan")
    p.add_argument("-m", "--model", default="claude", help=f"Model ({', '.join(MODELS.keys())})")
    p.add_argument("-j", "--json", action="store_true", help="Output JSON")
    p.add_argument("--list-models", action="store_true", help="List model")
    p.add_argument("--no-stream", action="store_true", help="Non-streaming")
    args = p.parse_args()

    if args.list_models:
        print("Model tersedia:")
        for k, v in MODELS.items(): print(f"  {k}: {v}")
        sys.exit(0)

    if not args.prompt:
        p.print_help()
        sys.exit(0)

    prompt = " ".join(args.prompt)
    result = chat(prompt, model=args.model, stream=not args.no_stream)
    if args.json: print(json.dumps(result, indent=2, ensure_ascii=False))