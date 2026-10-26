#!/usr/bin/env node
/* Smoke-набор VASSKASS • FLOW: node tests/smoke.js
   Поднимает статический сервер из корня репозитория, гоняет сценарии в Chromium (Playwright),
   печатает PASS/FAIL по каждому сценарию и выходит с кодом 1 при любом провале.
   Флаги: --only=<подстрока имени сценария>, --headed (окно браузера), --verbose. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch (e) {
  try { playwright = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
  catch (e2) { console.error('Не найден модуль playwright (нужен глобально установленный).'); process.exit(2); }
}
const { chromium } = playwright;

const ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const ONLY = (ARGS.find(a => a.startsWith('--only=')) || '').slice(7);
const VERBOSE = ARGS.includes('--verbose');
const HEADED = ARGS.includes('--headed');
const T0 = Date.now();
const GLOBAL_LIMIT_MS = 150000; // жёсткий потолок на весь прогон

/* ---------------- статический сервер ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
function startServer() {
  const srv = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.normalize(path.join(ROOT, p));
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.stat(f, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
        res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
        fs.createReadStream(f).pipe(res);
      });
    } catch (e) { res.writeHead(500); res.end(); }
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

/* ---------------- утилиты ---------------- */
class Fail extends Error {}
const assert = (c, msg) => { if (!c) throw new Fail(msg); };
const short = s => String(s).replace(/\s+/g, ' ').slice(0, 300);

let BASE = '';
let browser;
const SCEN = [];
const scenario = (name, fn) => SCEN.push({ name, fn });
let uid = 0;
const mail = tag => `t${Date.now().toString(36)}${++uid}${tag}@test.ru`;
const PASS = 'secret123';

/* Новый контекст = чистое localStorage. Внешние запросы мокаются, локальные 404 и pageerror собираются. */
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, locale: 'ru-RU',
    serviceWorkers: 'block', timezoneId: 'Europe/Moscow' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [], bad = [];
  page.on('pageerror', e => errors.push(short(e.stack || e.message)));
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) bad.push(`${r.status()} ${r.url().slice(BASE.length)}`); });
  page.on('requestfailed', r => { if (r.url().startsWith(BASE)) bad.push(`failed ${r.url().slice(BASE.length)} ${r.failure() && r.failure().errorText}`); });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    if (/supabase\.co/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (/\.css(\?|$)|fonts\.googleapis/.test(url)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (/\.js(\?|$)|\/npm\//.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (/json|api|overpass|openfoodfacts/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
  });
  page.errors = errors; page.bad = bad; page.ctx = ctx;
  page.noErrors = (where) => {
    assert(!errors.length, `pageerror${where ? ' (' + where + ')' : ''}: ${errors.join(' | ')}`);
    assert(!bad.length, `ошибки загрузки${where ? ' (' + where + ')' : ''}: ${bad.join(', ')}`);
  };
  return page;
}
async function open(page) {
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof doAuth === 'function' && typeof plan === 'function');
}
const visible = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
  if (e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }, sel);
const waitVisible = (page, sel, timeout = 8000) => page.waitForFunction(s => { const e = document.querySelector(s); if (!e || e.closest('[hidden]')) return false;
  const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel, { timeout });
/* какой экран сейчас открыт */
const screen = page => page.evaluate(() => ['auth', 'quiz', 'onb', 'app'].find(id => { const e = document.getElementById(id); return e && !e.hidden; }) || '');

/* Довести стартовый экран до формы входа (лендинг / приветствие могут закрывать #auth). */
async function toAuth(page) {
  await page.evaluate(() => { if (document.getElementById('auth').hidden && typeof show === 'function') show('auth'); });
  await page.waitForFunction(() => !document.getElementById('auth').hidden);
}
async function register(page, email) {
  await toAuth(page);
  await page.evaluate(() => authMode('reg'));
  await page.evaluate(([m, p]) => { const set = (s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    set('#aMail', m); set('#aPass', p); const n = document.querySelector('#aName'); if (n && !n.value) n.value = 'Тест'; }, [email, PASS]);
  await page.evaluate(() => doAuth());
  await page.waitForFunction(() => ['quiz', 'onb', 'app'].some(id => !document.getElementById(id).hidden) || document.querySelector('#aErr').textContent, null, { timeout: 8000 });
  const err = await page.textContent('#aErr');
  assert(!err.trim(), 'регистрация вернула ошибку: ' + err);
}

/* ---------------- анкета ---------------- */
/* prefs: ключ вопроса -> значение варианта. Для остальных берётся первый вариант.
   skip: нажимать «Пропустить», когда кнопка есть. Возвращает журнал шагов. */
async function runQuiz(page, prefs, { skip = false } = {}) {
  await page.waitForFunction(() => !document.getElementById('quiz').hidden);
  const log = [], seen = new Set();
  let prevMain = null, prevExtra = null, skipped = false;
  for (let step = 0; step < 60; step++) {
    const st = await page.evaluate(() => {
      const b = document.getElementById('qBody'), q = (qi >= 0 && qi < QZ.length) ? QZ[qi] : null;
      const lab = [...b.querySelectorAll('p.m')].map(p => p.textContent).find(t => /^(Вопрос|Дополнительно:) \d+ из \d+/.test(t)) || '';
      return { qi, n: QZ.length, key: q ? q[0] : null, vals: q ? q[2].map(o => o[2]) : [], qo: b.querySelectorAll('.qo').length,
        lab, skip: !!b.querySelector('.q94skip') || [...b.querySelectorAll('button')].some(x => /Пропустить/.test(x.textContent)),
        quiz: !document.getElementById('quiz').hidden };
    });
    if (!st.quiz) break;
    // нумерация
    const m = st.lab.match(/^(Вопрос|Дополнительно:) (\d+) из (\d+)/);
    if (m && st.key && !seen.has(st.qi)) {
      seen.add(st.qi);
      const N = +m[2], M = +m[3], kind = m[1];
      const prev = kind === 'Вопрос' ? prevMain : prevExtra;
      if (prev) {
        assert(M >= prev.M, `«${kind} N из M»: M уменьшилось ${prev.M} → ${M} на вопросе ${st.key}`);
        assert(N === prev.N + 1, `«${kind} N из M»: номер идёт не подряд ${prev.N} → ${N} на вопросе ${st.key}`);
      }
      assert(N <= M, `«${kind} ${N} из ${M}»: номер больше общего числа`);
      if (kind === 'Вопрос') prevMain = { N, M }; else prevExtra = { N, M };
    }
    const sig = await page.evaluate(() => qi + '|' + document.getElementById('qBody').innerHTML.length + '|' + ((document.querySelector('#qBody .qt') || {}).textContent || ''));
    log.push(`${st.qi}:${st.key || (st.qi < 0 ? 'intro' : 'summary')}${st.lab ? ' [' + st.lab + ']' : ''}`);
    // клики через element.click(): анимации появления вариантов не тормозят прогон
    if (st.key && skip && st.skip && !(st.key in prefs)) {
      skipped = true;
      await page.evaluate(() => [...document.querySelectorAll('#qBody button')].find(x => /Пропустить/.test(x.textContent)).click());
    } else if (st.key && st.qo > 0) {
      let idx = 0;
      if (st.key in prefs) { idx = st.vals.indexOf(prefs[st.key]); assert(idx >= 0, `в вопросе ${st.key} нет варианта ${prefs[st.key]} (есть: ${st.vals.join(',')})`); }
      await page.evaluate(i => document.querySelectorAll('#qBody .qo')[i].click(), idx);
    } else {
      // шаги без вариантов (интро, оформление, выбор героя, сводка): последняя активная кнопка;
      // кнопка может быть временно disabled (защита от случайного нажатия) — ждём, когда включится
      const SEL = '#qBody .btn:not([disabled]):not(.q94skip)';
      await page.waitForFunction(s => document.querySelector(s), SEL, { timeout: 4000 })
        .catch(() => { throw new Fail(`в анкете нет активной кнопки на шаге ${st.qi}/${st.key || 'без вопроса'}`); });
      await page.evaluate(s => { const b = document.querySelectorAll(s); b[b.length - 1].click(); }, SEL);
    }
    // ждём смены шага/экрана или выхода из анкеты
    await page.waitForFunction(sig => document.getElementById('quiz').hidden ||
      (qi + '|' + document.getElementById('qBody').innerHTML.length + '|' + ((document.querySelector('#qBody .qt') || {}).textContent || '')) !== sig, sig, { timeout: 5000 })
      .catch(() => { throw new Fail(`анкета застряла на шаге ${st.qi} (${st.key})`); });
  }
  assert(await screen(page) === 'onb', `после анкеты ожидалась форма плана, открыт экран «${await screen(page)}»`);
  if (skip) log.skipped = skipped;
  return log;
}

/* ---------------- форма плана ---------------- */
async function fillPlan(page, vals) {
  await waitVisible(page, '#onb');
  for (const [sel, v] of Object.entries(vals)) {
    const ok = await page.evaluate(([s, v]) => { const e = document.querySelector(s); if (!e) return 'нет';
      const r = e.getBoundingClientRect(), vis = !e.closest('[hidden]') && r.width > 0;
      if (vis && !e.value) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }
      return 'ok'; }, [sel, String(v)]);
    assert(ok === 'ok', `в форме плана нет поля ${sel}`);
  }
  await page.evaluate(() => saveProfile());
  await page.waitForFunction(() => !document.getElementById('app').hidden || (document.getElementById('oErr') || {}).textContent, null, { timeout: 8000 });
  const err = await page.evaluate(() => (document.getElementById('oErr') || {}).textContent || '');
  assert(await screen(page) === 'app', 'saveProfile() не открыл #app: ' + err);
  await waitVisible(page, '#app');
}

/* ---------------- сценарий онбординга целиком ---------------- */
async function onboard(page, prefs, planVals, opt) {
  await open(page);
  await register(page, mail(opt && opt.tag || ''));
  const log = await runQuiz(page, prefs, opt);
  await fillPlan(page, planVals);
  return log;
}
const P = page => page.evaluate(() => { const p = plan(), u = U(); return { b: p.b, tdee: p.tdee, formula: p.formula, sex: u.p.sex, age: u.p.age, pace: u.p.pace, gain: !!p.gain, w: p.w, t: u.p.t }; });

/* ================= СЦЕНАРИИ ================= */

scenario('Загрузка: без pageerror и 404', async () => {
  const page = await newPage();
  await open(page);
  await page.waitForLoadState('networkidle').catch(() => {});
  page.noErrors('загрузка');
  const t = await page.title();
  assert(/VASSKASS|FLOW/i.test(t), 'неожиданный title: ' + t);
  await page.ctx.close();
});

scenario('Регистрация: authMode(reg) + doAuth()', async () => {
  const page = await newPage();
  await open(page);
  const email = mail('reg');
  await register(page, email);
  const s = await page.evaluate(() => ({ me, sess: db.session, has: !!db.users[me] }));
  assert(s.me === email && s.sess === email && s.has, 'пользователь не создан или сессия не записана: ' + JSON.stringify(s));
  assert(await screen(page) === 'quiz', 'после регистрации ожидалась анкета, а открыт «' + await screen(page) + '»');
  // повторная регистрация той же почты — ошибка, а не перезапись
  await page.evaluate(() => logout());
  await page.waitForFunction(() => !document.getElementById('auth').hidden);
  await page.evaluate(() => authMode('reg'));
  await page.fill('#aMail', email); await page.fill('#aPass', 'other-pass-1');
  await page.evaluate(() => doAuth());
  assert(await screen(page) === 'auth', 'повторная регистрация занятой почты с другим паролем пустила в аккаунт');
  assert((await page.textContent('#aErr')).trim(), 'нет сообщения об ошибке при регистрации занятой почты');
  // короткий пароль
  await page.evaluate(() => authMode('reg'));
  await page.fill('#aMail', mail('short')); await page.fill('#aPass', '123');
  await page.evaluate(() => doAuth());
  await page.waitForFunction(() => /6/.test(document.querySelector('#aErr').textContent));
  page.noErrors();
  await page.ctx.close();
});

scenario('Гостевой режим «Начать без регистрации» (если есть кнопка)', async () => {
  const page = await newPage();
  await open(page);
  const find = () => page.evaluate(() => [...document.querySelectorAll('button,a,[role=button]')].some(b => /Начать без регистрации/.test(b.textContent)));
  let has = await find();
  if (!has) { await toAuth(page); has = await find(); }
  if (!has) { await page.ctx.close(); return 'SKIP: кнопки нет'; }
  await page.locator('button,a,[role=button]', { hasText: 'Начать без регистрации' }).first().click();
  await page.waitForFunction(() => ['quiz', 'onb', 'app'].some(id => !document.getElementById(id).hidden));
  if (await screen(page) === 'quiz') await runQuiz(page, { sex: 'f', goal: 'lose', health: 'ok' });
  if (await screen(page) === 'onb') await fillPlan(page, { '#oAge': 30, '#oH': 165, '#oW': 70, '#oT': 60 });
  assert(await screen(page) === 'app', 'гость не попал в приложение');
  await page.evaluate(() => setWater(2));
  await page.reload(); await page.waitForFunction(() => typeof U === 'function');
  await page.waitForFunction(() => ['quiz', 'onb', 'app', 'auth'].some(id => !document.getElementById(id).hidden));
  assert(await screen(page) === 'app', 'гость после перезагрузки не в приложении: ' + await screen(page));
  page.noErrors();
  await page.ctx.close();
});

scenario('Анкета: женщина + похудение', async () => {
  const page = await newPage();
  await onboard(page, { sex: 'f', age: 'a', life: 'cyc', goal: 'lose', health: 'ok', diet: 'all' }, { '#oAge': 35, '#oH': 165, '#oW': 72, '#oT': 62 });
  const p = await P(page);
  assert(p.sex === 'f', 'пол в профиле не женский: ' + p.sex);
  assert(p.b >= 1200, `норма для женщины ниже 1200: ${p.b}`);
  assert(p.b < p.tdee, `при похудении норма ${p.b} должна быть ниже поддержания ${p.tdee}`);
  // агрессивный темп не опускает ниже 1200
  const low = await page.evaluate(() => { const u = U(), o = { ...u.p }; u.p.pace = 1; u.p.h = 150; u.adapt = null; const b = plan().b; u.p = o; return b; });
  assert(low >= 1200, 'максимальный темп даёт норму ниже 1200: ' + low);
  page.noErrors();
  await page.ctx.close();
});

scenario('Анкета: мужчина + набор (с «Пропустить»)', async () => {
  const page = await newPage();
  const log = await onboard(page, { sex: 'm', age: 'y', goal: 'gain', health: 'ok', diet: 'all' }, { '#oAge': 25, '#oH': 180, '#oW': 65, '#oT': 72 }, { skip: true, tag: 'm' });
  if (VERBOSE) console.log('   ', log.join(' → '));
  assert(!log.some(s => /:life/.test(s)), 'мужчине показан вопрос про беременность/цикл (life)');
  assert(log.some(s => /:gwhy|:ghow/.test(s)), 'при наборе не показаны вопросы gwhy/ghow');
  const p = await P(page);
  assert(p.sex === 'm', 'пол в профиле не мужской: ' + p.sex);
  assert(p.b >= 1500, `норма для мужчины ниже 1500: ${p.b}`);
  assert(p.b >= p.tdee, `при наборе норма ${p.b} не должна быть ниже поддержания ${p.tdee}`);
  page.noErrors();
  await page.ctx.close();
});

scenario('Анкета: женщина + беременность (вопрос о здоровье) — без дефицита', async () => {
  const page = await newPage();
  await onboard(page, { sex: 'f', age: 'y', life: 'cyc', goal: 'lose', health: 'preg', diet: 'all' }, { '#oAge': 28, '#oH': 168, '#oW': 70, '#oT': 62 });
  const p = await P(page);
  assert(p.b >= 1200, 'норма ниже 1200: ' + p.b);
  // поддержание: plan().tdee; дефицита быть не должно (допуск 1 % на округление)
  assert(p.b >= p.tdee * 0.99, `при беременности есть дефицит: норма ${p.b} < поддержание ${p.tdee}`);
  const noDef = await page.evaluate(() => typeof lifeNoDef === 'function' ? !!lifeNoDef(U()) : null);
  assert(noDef !== false, 'lifeNoDef(U()) = false при беременности');
  // даже если в профиле стоит темп похудения, дефицита нет
  const forced = await page.evaluate(() => { const u = U(), o = u.p.pace; u.p.pace = 1; const r = plan(); u.p.pace = o; return { b: r.b, t: r.tdee }; });
  assert(forced.b >= forced.t * 0.99, `при беременности и темпе 1 кг/нед норма ${forced.b} < поддержания ${forced.t}`);
  page.noErrors();
  await page.ctx.close();
});

scenario('Анкета: подросток (16 лет)', async () => {
  const page = await newPage();
  await onboard(page, { sex: 'f', age: 't', life: 'cyc', goal: 'lose', health: 'ok', diet: 'all' }, { '#oAge': 16, '#oH': 165, '#oW': 68, '#oT': 58 });
  const p = await P(page);
  assert(p.age === 16, 'возраст в профиле не 16: ' + p.age);
  if (p.b < p.tdee) assert(p.b >= 1600, `подростку (жен.) норма ${p.b} ниже 1600 при поддержании ${p.tdee}`);
  const forced = await page.evaluate(() => { const u = U(), o = u.p.pace; u.p.pace = 1; const r = plan(); u.p.pace = o; return { b: r.b, t: r.tdee }; });
  if (forced.b < forced.t) assert(forced.b >= 1600, `подростку при темпе 1 кг/нед норма ${forced.b} ниже 1600`);
  const boy = await page.evaluate(() => { const u = U(), o = { ...u.p }; u.p.sex = 'm'; u.p.pace = 1; const r = plan(); u.p = o; return { b: r.b, t: r.tdee }; });
  if (boy.b < boy.t) assert(boy.b >= 1800, `подростку (муж.) норма ${boy.b} ниже 1800`);
  page.noErrors();
  await page.ctx.close();
});

/* Общий пользователь для сценариев приложения */
let APP = null;
async function appPage() {
  if (APP) return APP;
  const page = await newPage();
  const email = mail('app');
  await onboard(page, { sex: 'f', age: 'a', life: 'cyc', goal: 'lose', health: 'ok', diet: 'all' }, { '#oAge': 33, '#oH': 166, '#oW': 74, '#oT': 64 });
  page.email = await page.evaluate(() => me);
  APP = page; return page;
}
const kcal = page => page.evaluate(() => eaten(day()));

scenario('Еда: #fN/#fK + кнопка, quickAdd, удаление', async () => {
  const page = await appPage();
  await page.evaluate(() => go('today', document.querySelector('nav button')));
  const k0 = await kcal(page);
  await page.fill('#fN', 'Тестовый суп');
  await page.evaluate(() => { const e = document.querySelector('#fK'); e.value = '345'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.evaluate(() => document.querySelector('button[onclick="addFood()"]').click());
  await page.waitForFunction(k => eaten(day()) === k + 345, k0).catch(() => { throw new Fail('после addFood калории не выросли на 345'); });
  assert(await page.evaluate(() => day().food.some(f => f.n === 'Тестовый суп' && f.k === 345)), 'запись «Тестовый суп» не найдена в day().food');
  assert(await page.evaluate(() => document.querySelector('#foodList') ? document.querySelector('#foodList').textContent.includes('Тестовый суп') : true), 'запись не видна в #foodList');
  // quickAdd
  const k1 = await kcal(page), n1 = await page.evaluate(() => day().food.length);
  await page.evaluate(() => quickAdd());
  const panel = await page.waitForFunction(() => { const p = document.getElementById('qa90'); return p && getComputedStyle(p).display !== 'none' && p.getBoundingClientRect().height > 0; }, null, { timeout: 3000 }).then(() => true).catch(() => false);
  if (panel) {
    await page.fill('#qa90Q', 'гречка');
    await page.waitForFunction(() => document.querySelector('#qa90B .qa90p'));
    await page.locator('#qa90B .qa90p').first().click();
    await page.waitForFunction(n => day().food.length === n + 1, n1).catch(() => { throw new Fail('«＋» в панели #qa90 не добавил продукт'); });
  } else {
    // старый путь: вкладка «Макро» с поиском
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'cQ', null, { timeout: 3000 }).catch(() => {});
    await page.fill('#cQ', 'гречка');
    await page.waitForFunction(() => document.querySelector('#cRes .res, .res'));
    await page.locator('.res').first().click();
    if (await visible(page, '#shG')) await page.evaluate(() => commitSheet());
    await page.waitForFunction(n => day().food.length === n + 1, n1).catch(() => { throw new Fail('quickAdd не добавил продукт'); });
  }
  const k2 = await kcal(page);
  assert(k2 > k1, `quickAdd: калории не выросли (${k1} → ${k2})`);
  // удаление
  const idx = await page.evaluate(() => day().food.findIndex(f => f.n === 'Тестовый суп'));
  await page.evaluate(i => delFood(i), idx);
  await page.waitForFunction(k => eaten(day()) === k - 345, k2).catch(() => { throw new Fail('delFood не уменьшил калории на 345'); });
  assert(await page.evaluate(() => !day().food.some(f => f.n === 'Тестовый суп')), 'запись не удалилась');
  const sc = await page.evaluate(() => +document.querySelector('#sC').textContent);
  assert(sc === await kcal(page), `#sC (${sc}) не совпадает с eaten(day())`);
  await page.evaluate(() => typeof qa90Close === 'function' && qa90Close());
  page.noErrors();
});

scenario('Вода: setWater и отображение', async () => {
  const page = await appPage();
  await page.evaluate(() => setWater(3));
  let s = await page.evaluate(() => ({ w: day().water, t: document.querySelector('#sW').textContent, f: document.querySelectorAll('#glasses .f').length }));
  assert(s.w === 3, 'day().water != 3: ' + s.w);
  assert(s.t.includes('3/8'), '#sW не показывает 3/8: ' + s.t);
  assert(s.f === 3, 'закрашено стаканов: ' + s.f);
  await page.evaluate(() => setWater(3)); // повторное нажатие на тот же стакан снимает его
  s = await page.evaluate(() => ({ w: day().water, t: document.querySelector('#sW').textContent, f: document.querySelectorAll('#glasses .f').length }));
  assert(s.w === 2 && s.t.includes('2/8') && s.f === 2, 'повторный тап по 3-му стакану: ' + JSON.stringify(s));
  await page.locator('#glasses button').nth(4).click();
  s = await page.evaluate(() => ({ w: day().water, f: document.querySelectorAll('#glasses .f').length }));
  assert(s.w === 5 && s.f === 5, 'клик по 5-му стакану: ' + JSON.stringify(s));
  page.noErrors();
});

scenario('Вес: #wIn + addWeight(), запятая', async () => {
  const page = await appPage();
  await page.evaluate(() => go('weight', [...document.querySelectorAll('nav button')].find(b => /weight/.test(b.getAttribute('onclick') || ''))));
  await waitVisible(page, '#wIn');
  await page.click('#wIn');
  await page.fill('#wIn', '');
  await page.keyboard.type('71,5');
  const typed = await page.inputValue('#wIn');
  await page.evaluate(() => addWeight());
  const r = await page.evaluate(() => ({ last: lastW(), now: document.querySelector('#wNow').textContent }));
  assert(r.last === 71.5, `ввод «71,5» сохранил вес ${r.last} (value поля после ввода: «${typed}»)`);
  assert(/71[.,]5/.test(r.now), '#wNow не показывает 71,5: ' + r.now);
  // точка тоже
  await page.fill('#wIn', '71.2');
  await page.evaluate(() => addWeight());
  assert(await page.evaluate(() => lastW()) === 71.2, 'ввод 71.2 не сохранился');
  page.noErrors();
});

scenario('XSS: название еды не исполняется', async () => {
  const page = await appPage();
  await page.evaluate(() => go('today', document.querySelector('nav button')));
  const payload = '<img src=x onerror=window.__x=1>';
  await page.fill('#fN', payload);
  await page.evaluate(() => { const e = document.querySelector('#fK'); e.value = '111'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.evaluate(() => document.querySelector('button[onclick="addFood()"]').click());
  await page.waitForFunction(p => day().food.some(f => f.n === p), payload).catch(() => { throw new Fail('XSS-запись не добавилась'); });
  await page.evaluate(() => render());
  // места, где выводятся записи еды: дневник, панель быстрого добавления (недавние), статистика
  await page.evaluate(() => { try { quickAdd(); } catch (e) {} });
  await page.evaluate(() => { try { go('carb', document.querySelectorAll('nav button')[1]); go('weight', document.querySelectorAll('nav button')[3]); go('today', document.querySelector('nav button')); } catch (e) {} });
  await page.evaluate(() => new Promise(r => setTimeout(r, 400))); // даём onerror шанс сработать
  const x = await page.evaluate(() => window.__x);
  assert(x === undefined, 'window.__x установлен — XSS через название еды');
  const raw = await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.getAttribute('src') === 'x').length);
  assert(raw === 0, 'в DOM появился <img src=x> из названия еды');
  await page.evaluate(() => { typeof qa90Close === 'function' && qa90Close(); const i = day().food.findIndex(f => f.n.includes('onerror')); if (i > -1) delFood(i); });
  page.noErrors();
});

scenario('Перезагрузка: данные на месте; выход и вход', async () => {
  const page = await appPage();
  await page.evaluate(() => go('today', document.querySelector('nav button')));
  await page.fill('#fN', 'Перед перезагрузкой');
  await page.evaluate(() => { const e = document.querySelector('#fK'); e.value = '222'; e.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('button[onclick="addFood()"]').click(); });
  await page.waitForFunction(() => day().food.some(f => f.n === 'Перед перезагрузкой'));
  const before = await page.evaluate(() => ({ k: eaten(day()), w: day().water, wt: lastW(), b: plan().b, me }));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => typeof plan === 'function' && ['auth', 'quiz', 'onb', 'app'].some(id => !document.getElementById(id).hidden));
  assert(await screen(page) === 'app', 'после перезагрузки открыт «' + await screen(page) + '», а не приложение');
  const after = await page.evaluate(() => ({ k: eaten(day()), w: day().water, wt: lastW(), b: plan().b, me }));
  assert(JSON.stringify(after) === JSON.stringify(before), `данные изменились после перезагрузки: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  // выход
  await page.evaluate(() => logout());
  await page.waitForFunction(() => !document.getElementById('auth').hidden);
  assert(await page.evaluate(() => me === null && db.session === null), 'после logout сессия не сброшена');
  // неверный пароль
  await page.evaluate(() => authMode('login'));
  await page.fill('#aMail', before.me); await page.fill('#aPass', 'wrong-pass');
  await page.evaluate(() => doAuth());
  await page.waitForFunction(() => document.querySelector('#aErr').textContent.trim());
  assert(await screen(page) === 'auth', 'вход с неверным паролем пустил в приложение');
  // верный пароль
  await page.fill('#aMail', before.me); await page.fill('#aPass', PASS);
  await page.evaluate(() => doAuth());
  await page.waitForFunction(() => !document.getElementById('app').hidden, null, { timeout: 8000 }).catch(() => { throw new Fail('после повторного входа не открылось приложение'); });
  const again = await page.evaluate(() => ({ k: eaten(day()), w: day().water, wt: lastW(), b: plan().b, me }));
  assert(JSON.stringify(again) === JSON.stringify(before), `после входа данные другие: ${JSON.stringify(again)}`);
  // и снова перезагрузка после входа
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => typeof plan === 'function' && !document.getElementById('app').hidden);
  page.noErrors();
});

scenario('Вкладки go(): без ошибок, нет горизонтальной прокрутки на 320 и 375', async () => {
  const page = await appPage();
  const probs = [];
  for (const w of [320, 375]) {
    await page.setViewportSize({ width: w, height: 740 });
    for (const id of ['today', 'carb', 'weight', 'me']) {
      await page.evaluate(id => { const b = [...document.querySelectorAll('nav button')].find(x => (x.getAttribute('onclick') || '').includes(`'${id}'`)); go(id, b); }, id);
      await page.waitForFunction(id => { const t = document.getElementById('t-' + id); return !t || t.classList.contains('on'); }, id);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const o = await page.evaluate(() => {
        const de = document.documentElement, sw = Math.max(de.scrollWidth, document.body.scrollWidth), vw = de.clientWidth;
        if (sw <= vw + 1) return null;
        const wide = [...document.querySelectorAll('body *')].filter(e => { if (e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; })
          .slice(0, 4).map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) + '→' + Math.round(e.getBoundingClientRect().right));
        return `${sw}>${vw} (${wide.join(', ')})`;
      });
      if (o) probs.push(`${w}px/${id}: ${o}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => go('today', document.querySelector('nav button')));
  page.noErrors();
  assert(!probs.length, 'горизонтальная прокрутка: ' + probs.join('; '));
});

scenario('Оформления: все MODES_ALL через applyMode без pageerror', async () => {
  const page = await appPage();
  const r = await page.evaluate(() => {
    const ids = MODES_ALL.map(m => m.id), errs = [];
    for (const id of ids) { try { applyMode(id); render(); } catch (e) { errs.push(id + ': ' + e.message); } }
    return { n: ids.length, errs };
  });
  assert(r.n > 0, 'MODES_ALL пуст');
  assert(!r.errs.length, 'исключения в applyMode: ' + r.errs.join('; '));
  for (const id of ['today', 'carb', 'weight', 'me']) await page.evaluate(id => go(id, [...document.querySelectorAll('nav button')].find(x => (x.getAttribute('onclick') || '').includes(`'${id}'`))), id);
  await page.evaluate(() => go('today', document.querySelector('nav button')));
  await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
  page.noErrors();
  return `${r.n} оформлений`;
});

/* ================= ЗАПУСК ================= */
(async () => {
  const srv = await startServer();
  BASE = `http://127.0.0.1:${srv.address().port}`;
  browser = await chromium.launch(HEADED ? { headless: false } : undefined);
  const killer = setTimeout(() => { console.error(`\nFAIL: прогон превысил ${GLOBAL_LIMIT_MS / 1000} с`); process.exit(1); }, GLOBAL_LIMIT_MS);
  console.log(`VASSKASS • FLOW smoke — ${BASE}\n`);
  let failed = 0, passed = 0, skipped = 0;
  for (const s of SCEN) {
    if (ONLY && !s.name.toLowerCase().includes(ONLY.toLowerCase())) continue;
    const t = Date.now();
    try {
      const note = await Promise.race([s.fn(), new Promise((_, rej) => setTimeout(() => rej(new Fail('таймаут сценария 30 с')), 30000))]);
      const ms = ((Date.now() - t) / 1000).toFixed(1);
      if (typeof note === 'string' && note.startsWith('SKIP')) { skipped++; console.log(`SKIP  ${s.name} (${note.slice(5).trim()})`); }
      else { passed++; console.log(`PASS  ${s.name}  ${ms}s${note ? '  — ' + note : ''}`); }
    } catch (e) {
      failed++;
      console.log(`FAIL  ${s.name}  ${((Date.now() - t) / 1000).toFixed(1)}s\n      ${e instanceof Fail ? e.message : short(e.stack || e.message)}`);
      if (APP && APP.errors) { APP.errors.length = 0; APP.bad.length = 0; } // не тащим ошибку в следующие сценарии
    }
  }
  clearTimeout(killer);
  await browser.close().catch(() => {});
  srv.close();
  console.log(`\n${failed ? 'FAIL' : 'OK'}: ${passed} passed, ${failed} failed, ${skipped} skipped — ${((Date.now() - T0) / 1000).toFixed(1)}s`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
