const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const HJ = { ...CORS, 'Content-Type': 'application/json' };
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: HJ });
}

const SB_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
const OR_KEY = Deno.env.get('OPENROUTER_API_KEY');
const OR_MODELS = (
  Deno.env.get('OPENROUTER_MODEL') ||
  'openrouter/free'
).split(',').map((x) => x.trim()).filter(Boolean);
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';
const DAILY_LIMIT = parseInt(Deno.env.get('DAILY_LIMIT') || '5', 10);
const MAX_BYTES = 1500000;

const PROMPT = [
  'Ты опытный нутрициолог. На фото еда или напиток.',
  'Определи каждый продукт или блюдо.',
  'Для каждого оцени вес порции в граммах (как на фото)',
  'и посчитай калории, белки, жиры и углеводы порции.',
  'Названия пиши по-русски, коротко.',
  'Если еды нет, верни пустой список items.',
  'Если не уверен, дай лучшую оценку и низкую confidence.',
  'Ответ: только JSON такого вида:',
  '{"items":[{"name":"","grams":0,"kcal":0,"protein":0,',
  '"fat":0,"carbs":0,"confidence":0.7}],"note":""}',
].join('\n');

const PROMPT_LABEL = [
  'На фото упаковка продукта (этикетка, банка, бутылка, коробка).',
  'Прочитай название, бренд и пищевую ценность на 100 г (или на 100 мл).',
  'Если таблицы не видно, оцени по названию и типу продукта.',
  'Верни ровно один элемент в items: grams равно 100,',
  'kcal, protein, fat, carbs на 100 г. Название по-русски.',
  'Если это не продукт, верни пустой items.',
  'Ответ: только JSON такого вида:',
  '{"items":[{"name":"","grams":100,"kcal":0,"protein":0,',
  '"fat":0,"carbs":0,"confidence":0.7}],"note":""}',
].join('\n');

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          grams: { type: 'NUMBER' },
          kcal: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          confidence: { type: 'NUMBER' },
        },
        required: ['name', 'grams', 'kcal', 'protein', 'fat', 'carbs'],
      },
    },
    note: { type: 'STRING' },
  },
  required: ['items'],
};

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, Number(v) || 0));
}
function r1(v) {
  return Math.round(v * 10) / 10;
}

async function getUser(token) {
  const r = await fetch(SB_URL + '/auth/v1/user', {
    headers: { Authorization: 'Bearer ' + token, apikey: SERVICE },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

async function useQuota(userId, commit) {
  const day = new Date().toISOString().slice(0, 10);
  const H = {
    apikey: SERVICE,
    Authorization: 'Bearer ' + SERVICE,
    'Content-Type': 'application/json',
  };
  const url =
    SB_URL + '/rest/v1/photo_usage?select=n&user_id=eq.' + userId +
    '&day=eq.' + day;
  const q = await fetch(url, { headers: H });
  const rows = q.ok ? await q.json() : [];
  const used = (rows[0] && rows[0].n) || 0;
  if (used >= DAILY_LIMIT) return { ok: false, used };
  if (!commit) return { ok: true, used };
  await fetch(SB_URL + '/rest/v1/photo_usage?on_conflict=user_id,day', {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, day, n: used + 1 }),
  });
  return { ok: true, used: used + 1 };
}

async function askOpenRouterModel(img, prompt, model) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + OR_KEY,
    'X-Title': 'VASSKASS FLOW',
  };
  const body = {
    model: model,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: 'data:image/jpeg;base64,' + img },
          },
        ],
      },
    ],
  };
  let g;
  try {
    g = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { err: json({ error: 'upstream', detail: 'or ' + String(e) }, 502) };
  }
  if (!g.ok) {
    let d = '';
    try {
      d = (await g.text()).slice(0, 160);
    } catch (e) {
      d = '';
    }
    const code = g.status === 429 ? 'busy' : 'upstream';
    return { err: json({ error: code, status: g.status, detail: d }, 502) };
  }
  try {
    const j = await g.json();
    let s = String(j.choices[0].message.content || '');
    s = s.replace(/```json|```/g, '');
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    return { out: JSON.parse(s.slice(a, b + 1)) };
  } catch (e) {
    return { err: json({ error: 'parse', detail: 'or_no_json' }, 502) };
  }
}

async function askOpenRouter(img, prompt) {
  let last = null;
  for (const m of OR_MODELS) {
    const r = await askOpenRouterModel(img, prompt, m);
    if (r.out) return r;
    last = r;
  }
  return last;
}

async function askGemini(img, prompt) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL +
    ':generateContent';
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: img } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0.2,
    },
  };
  let g;
  try {
    g = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(40000),
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { err: json({ error: 'upstream', detail: String(e) }, 502) };
  }
  if (!g.ok) {
    let d = '';
    try {
      d = (await g.text()).slice(0, 160);
    } catch (e) {
      d = '';
    }
    if (g.status === 400 || g.status === 403) {
      const nd = 'Нет рабочего ключа: добавьте секрет OPENROUTER_API_KEY';
      return { err: json({ error: 'not_configured', detail: nd }, 500) };
    }
    const code = g.status === 429 ? 'busy' : 'upstream';
    return { err: json({ error: code, status: g.status, detail: d }, 502) };
  }
  try {
    const j = await g.json();
    return { out: JSON.parse(j.candidates[0].content.parts[0].text) };
  } catch (e) {
    return { err: json({ error: 'parse', detail: 'no_text' }, 502) };
  }
}

async function handle(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if ((!GEMINI_KEY && !OR_KEY) || !SERVICE || !SB_URL) {
    return json({ error: 'not_configured' }, 500);
  }
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const user = token ? await getUser(token) : null;
  if (!user) return json({ error: 'auth' }, 401);

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'bad_json' }, 400);
  }
  let img = String(body.image || '');
  img = img.replace(/^data:image\/\w+;base64,/, '');
  if (!img || img.length > MAX_BYTES) return json({ error: 'bad_image' }, 400);

  let quota = await useQuota(user.id, false);
  if (!quota.ok) return json({ error: 'limit', limit: DAILY_LIMIT }, 429);

  const prompt = body.mode === 'label' ? PROMPT_LABEL : PROMPT;
  const res = OR_KEY
    ? await askOpenRouter(img, prompt)
    : await askGemini(img, prompt);
  if (res.err) return res.err;
  quota = await useQuota(user.id, true);
  const out = res.out || {};

  const list = Array.isArray(out.items) ? out.items.slice(0, 12) : [];
  const items = list.map((x) => ({
    name: String(x.name || 'Блюдо').slice(0, 60),
    grams: Math.round(clamp(x.grams, 1, 2000)),
    kcal: Math.round(clamp(x.kcal, 0, 4000)),
    protein: r1(clamp(x.protein, 0, 300)),
    fat: r1(clamp(x.fat, 0, 300)),
    carbs: r1(clamp(x.carbs, 0, 500)),
    confidence: clamp(x.confidence == null ? 0.6 : x.confidence, 0, 1),
  }));
  const note = String(out.note || '').slice(0, 200);
  return json({ items, note, left: DAILY_LIMIT - quota.used });
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (e) {
    const d = String((e && e.stack) || e).slice(0, 220);
    return json({ error: 'crash', detail: d }, 500);
  }
});
