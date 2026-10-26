// Сервис-воркер VASSKASS • FLOW.
//
// ВЫПУСК: при каждом релизе поднимай VERSION (любая новая строка). Браузер увидит, что sw.js
// изменился, поставит новый воркер, заново скачает оболочку и удалит все старые кэши.
//
// Кэши:
//   flow-core-VERSION  — оболочка (./, index.html, manifest, иконки), все js/*.js, картинки героев.
//   flow-pages-VERSION — другие страницы сайта (kaloriynost/, kalkulyator-kaloriy/, stati/…), по мере посещения, до PAGES_MAX.
//   flow-cdn-CDN_VER   — сторонние CDN (ZXing на jsdelivr, Google Fonts), до CDN_MAX записей. Живёт между выпусками.
//
// Стратегии:
//   навигация, .js/.css/.json/.webmanifest — сеть (с проверкой ETag) с таймаутом NET_TIMEOUT, потом кэш;
//     для навигации без кэша — встроенная офлайн-заглушка;
//   картинки, видео, шрифты — сразу из кэша, в фоне обновляются (stale-while-revalidate);
//   supabase и прочие сторонние хосты — не трогаем вообще, никогда не кэшируем.

const VERSION = 'v96-1';
const CDN_VER = '1';
const CORE = 'flow-core-' + VERSION;
const PAGES = 'flow-pages-' + VERSION;
const CDN = 'flow-cdn-' + CDN_VER;
const KEEP = [CORE, PAGES, CDN];
const NET_TIMEOUT = 3000;
const PAGES_MAX = 80;
const CDN_MAX = 40;

// Явный список на случай, если index.html при установке не скачался или не разобрался.
// Неважно, если он устарел: при install к нему добавляется всё, что найдено в index.html и manifest,
// а ошибка любого файла установку не валит.
const FALLBACK = [
  './', 'index.html', 'manifest.webmanifest',
  'icon-180.png?v=47', 'icon-192.png?v=47', 'icon-512.png?v=47',
  'icons/icon-maskable-512.png', 'icons/icon-maskable-192.png',
  'js/portions-data.js', 'js/v89-safety.js', 'js/v90-ux.js', 'js/v91-design.js', 'js/v92-data.js',
  'js/v93-a11y.js', 'js/v94-onboard.js', 'js/v95-growth.js', 'js/v96-empty.js'
];
const HERO_FALLBACK = {
  mira: ['idle', 'happy', 'angry', 'shy', 'eat', 'drink'],
  alice: ['idle', 'happy', 'angry', 'shy', 'eat', 'drink'],
  zhenya: ['idle', 'happy', 'shy', 'eat', 'drink'],
  seit: ['idle', 'happy', 'angry', 'shy', 'eat', 'drink']
};
// Сторонние ресурсы, которые стоит иметь офлайн (best effort, в CDN-кэш).
const CDN_PRE = [
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
];
const CDN_HOSTS = /^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|cdnjs\.cloudflare\.com)$/;
const NEVER = /(^|\.)supabase\.(co|in|net|com)$/;

const ASSET_RE = /\.(webp|png|jpe?g|gif|svg|ico|avif|mp4|webm|woff2?|ttf|otf)$/i;
const CODE_RE = /\.(js|mjs|css|json|webmanifest)$/i;

const SCOPE = new URL('./', self.location).href;          // .../Vas-kas/
const abs = p => new URL(p, SCOPE).href;

// ---------- install ----------

// Ответ с редиректом нельзя отдавать на навигацию — пересобираем «чистый».
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function putFresh(cache, url) {
  try {
    const res = await fetch(url, { cache: 'reload' });
    if (res && res.ok) { await cache.put(url, await clean(res)); return true; }
  } catch (e) {}
  return false;
}

function parseIndex(html) {
  const out = new Set();
  const add = s => {
    try { const u = new URL(s, SCOPE); if (u.origin === self.location.origin && u.href.startsWith(SCOPE)) out.add(u.href); } catch (e) {}
  };
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    if (/rel=["'](?:apple-touch-icon|icon|shortcut icon|manifest|stylesheet|preload)["']/i.test(m[0])) add(m[1]);
  }
  // Герои: const CH_V='48'; CHARS={ key:{...dir:'mira',...files:['idle',...]} }
  const v = (html.match(/CH_V\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const q = v ? '?v=' + v : '';
  let heroes = 0;
  for (const m of html.matchAll(/dir\s*:\s*['"]([\w-]+)['"][^}]*?files\s*:\s*\[([^\]]*)\]/g)) {
    const dir = m[1];
    add(dir + '/face.webp' + q);
    for (const f of m[2].matchAll(/['"]([\w-]+)['"]/g)) add(dir + '/' + f[1] + '.webp' + q);
    heroes++;
  }
  if (!heroes) for (const [dir, files] of Object.entries(HERO_FALLBACK)) {
    add(dir + '/face.webp' + q);
    files.forEach(f => add(dir + '/' + f + '.webp' + q));
  }
  return out;
}

async function precache() {
  const c = await caches.open(CORE);
  const urls = new Set(FALLBACK.map(abs));
  for (const [dir, files] of Object.entries(HERO_FALLBACK)) {
    urls.add(abs(dir + '/face.webp'));
    files.forEach(f => urls.add(abs(dir + '/' + f + '.webp')));
  }
  // index.html: скачиваем один раз, кладём под ./ и index.html, разбираем.
  try {
    const res = await fetch(abs('./'), { cache: 'reload' });
    if (res && res.ok) {
      const html = await res.clone().text();
      const fixed = await clean(res);
      await c.put(abs('./'), fixed.clone());
      await c.put(abs('index.html'), fixed);
      urls.delete(abs('./')); urls.delete(abs('index.html'));
      const found = parseIndex(html);
      // Если нашли героев с ?v=, их версии без параметра из запасного списка не нужны.
      if ([...found].some(u => /\.webp\?/.test(u))) for (const u of [...urls]) if (/\/[\w-]+\/[\w-]+\.webp$/.test(u)) urls.delete(u);
      found.forEach(u => urls.add(u));
    }
  } catch (e) {}
  // manifest: иконки и иконки ярлыков.
  try {
    const res = await fetch(abs('manifest.webmanifest'), { cache: 'reload' });
    if (res && res.ok) {
      const base = abs('manifest.webmanifest');
      await c.put(base, res.clone());
      urls.delete(base);
      const m = await res.json();
      const icons = [...(m.icons || [])];
      (m.shortcuts || []).forEach(s => (s.icons || []).forEach(i => icons.push(i)));
      icons.forEach(i => { try { urls.add(new URL(i.src, base).href); } catch (e) {} });
    }
  } catch (e) {}
  const results = await Promise.allSettled([...urls].map(u => putFresh(c, u)));
  // Сторонние: не ждём долго, ошибки игнорируем.
  precacheCdn().catch(() => {});
  return results.filter(r => r.value).length;
}

async function precacheCdn() {
  const c = await caches.open(CDN);
  for (const u of CDN_PRE) {
    if (await c.match(u)) continue;
    try {
      const res = await fetch(u, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) continue;
      await c.put(u, res.clone());
      if (/fonts\.googleapis\.com/.test(u)) {
        const css = await res.text();
        for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
          try { const f = await fetch(m[1], { mode: 'cors', credentials: 'omit' }); if (f.ok) await c.put(m[1], f); } catch (e) {}
        }
      }
    } catch (e) {}
  }
  await trim(CDN, CDN_MAX);
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(precache().catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.disable(); } catch (e) {} }
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  const d = e.data;
  if (d === 'SKIP_WAITING' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting();
  if (d === 'GET_VERSION' || (d && d.type === 'GET_VERSION')) {
    const reply = { type: 'VERSION', version: VERSION };
    if (e.ports && e.ports[0]) e.ports[0].postMessage(reply); else if (e.source) e.source.postMessage(reply);
  }
});

// ---------- helpers ----------

async function trim(name, max) {
  try {
    const c = await caches.open(name), keys = await c.keys();
    for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
  } catch (e) {}
}

// Ищем сначала точное совпадение, потом без ?query (иконки ?v=47, герои ?v=48, ./?a=add).
async function lookup(req, names) {
  for (const n of names) {
    const c = await caches.open(n);
    const hit = (await c.match(req)) || (await c.match(req, { ignoreSearch: true }));
    if (hit) return hit;
  }
  return null;
}

const isShell = u => u.href.split(/[?#]/)[0] === SCOPE || u.href.split(/[?#]/)[0] === SCOPE + 'index.html';

function offlinePage() {
  const html = '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0a1222">' +
    '<title>Нет сети • FLOW</title><style>' +
    'html,body{margin:0;height:100%;background:#0a1222;color:#e8eefc;font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    'main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box;text-align:center}' +
    'h1{font-size:22px;margin:0}p{margin:0;max-width:320px;opacity:.75}' +
    'a,button{display:inline-block;min-height:48px;padding:13px 22px;border-radius:14px;font:600 16px system-ui,sans-serif;text-decoration:none;border:0;cursor:pointer;box-sizing:border-box}' +
    'a{background:#7c9cff;color:#0a1222}button{background:transparent;color:#e8eefc;border:1px solid #33415f}' +
    '</style></head><body><main><div style="font-size:44px" aria-hidden="true">📴</div>' +
    '<h1>Нет подключения к интернету</h1>' +
    '<p>Эта страница ещё не сохранена для офлайна. Само приложение работает без сети — дневник, вода и вес сохраняются на устройстве.</p>' +
    '<a href="' + SCOPE + '">Открыть приложение</a>' +
    '<button type="button" onclick="location.reload()">Повторить</button></main></body></html>';
  return new Response(html, { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// Сеть с таймаутом. Если сеть не успела, а в кэше есть — отдаём кэш, сеть продолжает и обновляет кэш в фоне.
function networkFirst(e, req, store, names, onMiss) {
  const net = fetch(req, { cache: 'no-cache' }).then(async res => {
    if (res && res.ok && (res.type === 'basic' || res.type === 'default' || res.type === 'cors')) {
      const c = await caches.open(store);
      await c.put(req, (await clean(res.clone())));
      if (store === PAGES) trim(PAGES, PAGES_MAX);
    }
    return res;
  });
  e.waitUntil(net.then(() => {}, () => {}));
  return (async () => {
    let timer;
    const timeout = new Promise(r => { timer = setTimeout(() => r('timeout'), NET_TIMEOUT); });
    try {
      const first = await Promise.race([net, timeout]);
      if (first !== 'timeout') { clearTimeout(timer); return first; }
      const hit = await lookup(req, names);
      if (hit) return hit;
      return await net;          // кэша нет — ждём сеть до конца
    } catch (err) {
      clearTimeout(timer);
      const hit = await lookup(req, names);
      if (hit) return hit;
      return onMiss ? onMiss() : Response.error();
    }
  })();
}

function staleWhileRevalidate(e, req, store, names, max) {
  return (async () => {
    const hit = await lookup(req, names);
    const net = fetch(req).then(async res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(store);
        await c.put(req, res.clone());
        if (max) trim(store, max);
      }
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })();
}

// ---------- fetch ----------

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return;
  if (NEVER.test(u.hostname)) return;                       // supabase — только сеть

  if (u.origin !== self.location.origin) {
    if (CDN_HOSTS.test(u.hostname)) e.respondWith(staleWhileRevalidate(e, r, CDN, [CDN], CDN_MAX));
    return;                                                 // прочие сторонние — не трогаем
  }
  if (!u.href.startsWith(SCOPE)) return;
  if (r.headers.has('range')) return;                      // видео-диапазоны — напрямую

  if (r.mode === 'navigate' || (r.destination === 'document')) {
    if (isShell(u)) {
      e.respondWith(networkFirst(e, r, CORE, [CORE], async () =>
        (await lookup(new Request(abs('./')), [CORE])) || (await lookup(new Request(abs('index.html')), [CORE])) || offlinePage()));
    } else {
      e.respondWith(networkFirst(e, r, PAGES, [PAGES, CORE], offlinePage));
    }
    return;
  }
  if (ASSET_RE.test(u.pathname)) {
    e.respondWith(staleWhileRevalidate(e, r, CORE, [CORE, PAGES]));
    return;
  }
  if (CODE_RE.test(u.pathname)) {
    e.respondWith(networkFirst(e, r, CORE, [CORE, PAGES]));
    return;
  }
  // Остальное своё (txt, xml и т.п.) — сеть, потом кэш.
  e.respondWith(networkFirst(e, r, PAGES, [PAGES, CORE]));
});
