// Supabase Edge Function: food-photo
// Принимает фото еды, проверяет вход, считает лимит, спрашивает Gemini, возвращает JSON.
// Фото нигде не сохраняется: оно живёт только в памяти на время запроса.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SB_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const DAILY_LIMIT = parseInt(Deno.env.get('DAILY_LIMIT') || '5', 10);
const MAX_BYTES = 1_500_000; // размер base64-строки

const PROMPT = `Ты опытный нутрициолог. На фото еда. Определи каждый отдельный продукт или блюдо на тарелке.
Для каждого оцени вес порции в граммах (готовое блюдо, как на фото) и посчитай для этой порции калории, белки, жиры и углеводы.
Названия пиши по-русски, коротко и привычно (например: "Гречка варёная", "Куриная грудка запечённая").
Если на фото нет еды, верни пустой список items. Если не уверен, всё равно дай лучшую оценку и укажи низкую confidence.
Отвечай только JSON по заданной схеме.`;

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

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
const r1 = (v) => Math.round(v * 10) / 10;

async function getUser(token) {
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: SERVICE } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

async function useQuota(userId) {
  const day = new Date().toISOString().slice(0, 10);
  const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
  const q = await fetch(`${SB_URL}/rest/v1/photo_usage?select=n&user_id=eq.${userId}&day=eq.${day}`, { headers: H });
  const rows = q.ok ? await q.json() : [];
  const used = rows[0]?.n || 0;
  if (used >= DAILY_LIMIT) return { ok: false, used };
  await fetch(`${SB_URL}/rest/v1/photo_usage?on_conflict=user_id,day`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, day, n: used + 1 }),
  });
  return { ok: true, used: used + 1 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!GEMINI_KEY || !SERVICE || !SB_URL) return json({ error: 'not_configured' }, 500);

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const user = token ? await getUser(token) : null;
  if (!user) return json({ error: 'auth' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const img = String(body.image || '').replace(/^data:image\/\w+;base64,/, '');
  if (!img || img.length > MAX_BYTES) return json({ error: 'bad_image' }, 400);

  const quota = await useQuota(user.id);
  if (!quota.ok) return json({ error: 'limit', limit: DAILY_LIMIT }, 429);

  let g;
  try {
    g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: img } }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
      }),
    });
  } catch { return json({ error: 'upstream' }, 502); }
  if (!g.ok) return json({ error: g.status === 429 ? 'busy' : 'upstream', status: g.status }, 502);

  let out;
  try {
    const j = await g.json();
    out = JSON.parse(j.candidates[0].content.parts[0].text);
  } catch { return json({ error: 'parse' }, 502); }

  const items = (Array.isArray(out.items) ? out.items : []).slice(0, 12).map((x) => ({
    name: String(x.name || 'Блюдо').slice(0, 60),
    grams: Math.round(clamp(x.grams, 1, 2000)),
    kcal: Math.round(clamp(x.kcal, 0, 4000)),
    protein: r1(clamp(x.protein, 0, 300)),
    fat: r1(clamp(x.fat, 0, 300)),
    carbs: r1(clamp(x.carbs, 0, 500)),
    confidence: clamp(x.confidence ?? 0.6, 0, 1),
  }));
  return json({ items, note: String(out.note || '').slice(0, 200), left: DAILY_LIMIT - quota.used });
});
