/* ===== v96: пустые состояния, награды по цели, герой по полу, свечение «+» ===== */
/* Подключается после v90-ux и v91-design, до v93-a11y. Всё внутри IIFE, наружу ничего не экспортирует. */
(function(){
'use strict';
if(typeof render!=='function'||typeof U!=='function')return;
const okUser=()=>{try{return !!(me&&U()&&U().p)}catch(e){return false}};
const ICON='<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false" style="color:var(--lime)"><path d="M6 32h28"/><path d="M10 26l7-7 6 5 9-11"/><circle cx="32" cy="13" r="2"/></svg>';
const stub=(t,p,btn)=>`<div class="v91empty e96">${ICON}<div><b>${t}</b><p>${p}</p>${btn||''}</div></div>`;
const weighs=()=>{try{return (U().weights||[]).length}catch(e){return 0}};

/* ---------- 1a. шапка: «🔥 0 дн.» в первый день не показываем ---------- */
function headSub(){const e=document.getElementById('hSub');if(!e)return;const t=e.textContent,n=t.replace(/\s*•\s*🔥\s*0\s*дн\.?\s*$/,'');if(n!==t)e.textContent=n}

/* ---------- 1b. «Статистика»: вместо «Ср. ккал 0 · В плане 0/0» — подсказка (если v91 уже не заменил всё) ---------- */
function statsEmpty(){const box=document.getElementById('stCal');if(!box||box.querySelector('.v91empty'))return;
 const st=box.querySelector(':scope>.stats');if(!st)return;const b=st.querySelectorAll('b');const last=b[b.length-1];
 if(!last||!/^0\/0$/.test(last.textContent.trim()))return;
 st.outerHTML=stub('Пока нечего считать','Запишите еду хотя бы за один день, и здесь появятся средние калории и дни в плане.')}

/* ---------- 1c, 1e. прогноз и график веса до второй записи ---------- */
function weightEmpty(){const few=weighs()<2;
 const ai=document.getElementById('aiNote');if(ai&&few){const t=ai.textContent,n=t.replace(/\s*Прогноз при текущем темпе:[^\n]*/,'');if(n!==t)ai.textContent=n.replace(/\s+$/,'')}
 const tr=document.getElementById('trNote'),trc=tr&&tr.closest('.card');if(trc)trc.hidden=few;
 const ch=document.getElementById('chart'),card=ch&&ch.closest('.card');if(!card)return;
 const stats=card.querySelector(':scope>.stats, :scope>.fbody>.stats');
 if(few){if(stats)stats.hidden=true;
  if(!ch.querySelector('.e96'))ch.innerHTML=stub('Запишите вес 2 раза — появится график','Сейчас '+esc(String((document.getElementById('wNow')||{}).textContent||''))+'. Прогноз до цели тоже покажем после второй записи.',
   '<button type="button" class="e96b" onclick="(function(){var i=document.getElementById(\'wIn\');if(i){i.scrollIntoView({block:\'center\',behavior:\'smooth\'});setTimeout(function(){i.focus()},250)}})()">Записать вес</button>')}
 else if(stats)stats.hidden=false}

/* ---------- 1d. «Макро»: пустой приём пищи — кнопка «＋» в быструю панель ---------- */
const MEAL={'ЗАВТРАК':'Завтрак','ОБЕД':'Обед','УЖИН':'Ужин','ПЕРЕКУС':'Перекус'};
function mealPlus(){const L=document.getElementById('mealList');if(!L)return;
 L.querySelectorAll(':scope>.mh').forEach(h=>{const p=h.nextElementSibling;if(!p||p.tagName!=='P'||p.dataset.e96||p.textContent.trim()!=='Пока пусто')return;
  const s=h.querySelector('span'),m=s&&MEAL[s.textContent.trim().toUpperCase()];if(!m)return;p.dataset.e96=1;p.classList.add('e96m');
  p.innerHTML=`<span>Пока пусто</span><button type="button" class="e96p" aria-label="Добавить: ${m}" onclick="if(window.qa90Open){qa90Open();qa90Meal('${m}')}else quickAdd()">＋ Добавить</button>`})}

/* ---------- 2. награды «Минус 1 / 5 кг» — только тем, кто снижает вес ---------- */
function notLosing(){try{const u=U(),q=u.quiz||{};if(typeof isGain==='function'&&isGain())return true;if(q.goal==='gain'||q.goal==='keep')return true;
 return !!(u.p&&u.p.w0&&u.p.t>=u.p.w0)}catch(e){return false}}
if(typeof renderBadges==='function'){const _rb96=renderBadges;renderBadges=function(){const x=_rb96.apply(this,arguments);
 try{if(notLosing())document.querySelectorAll('#badges .bd').forEach(e=>{if(/Минус\s*\d+\s*кг/.test(e.textContent))e.remove()})}catch(e){}return x}}

/* ---------- 3. герой по полу: мужчине по умолчанию мужской персонаж ---------- */
const MALE_DEF=(()=>{try{return Object.keys(CHARS).find(k=>CHARS[k].male)||null}catch(e){return null}})();
const man=()=>{try{return typeof isMan==='function'&&isMan()}catch(e){return false}};
function heroDefault(){try{if(!MALE_DEF||!okUser()||!man())return;const c=CB();if(c.her)return; /* her ставят только qcOk/herPick — значит человек уже выбрал сам */
 c.her=MALE_DEF;if(['Чиби','Героиня','Карина','Алиса'].includes(c.name))c.name=CHARS[MALE_DEF].name;
 try{chPre(MALE_DEF);HERDEF.face=chFace(MALE_DEF);HERCUR=''}catch(e){}save()}catch(e){}}
/* в анкете: мужчинам мужские герои первыми и предвыбран мужской (подтверждать всё равно нужно кнопкой) */
if(typeof qcShow==='function'&&typeof QCH!=='undefined'){const _qs96=qcShow;let pre=false;
 const _sq96=startQuiz;startQuiz=function(){pre=false;return _sq96.apply(this,arguments)};
 qcShow=function(){try{if(man()){QCH.sort((a,b)=>(CHARS[b].male?1:0)-(CHARS[a].male?1:0));if(!qcSel&&!pre&&MALE_DEF){pre=true;qcSel=MALE_DEF}}
  else QCH.sort((a,b)=>(CHARS[a].male?1:0)-(CHARS[b].male?1:0))}catch(e){}return _qs96.apply(this,arguments)}}

/* ---------- 5. частичный объект героя (после импорта/облака) — дополняем значениями по умолчанию ----------
   CB() объявлена через const, поэтому чиним сам U().cb: при загрузке и перед каждой отрисовкой. */
function cbFix(){try{const u=U();if(!u)return;if(u.cb!=null&&(typeof u.cb!=='object'||Array.isArray(u.cb)))delete u.cb;const c=u.cb;if(!c)return; /* нет cb — CB() создаст полный */
 const now=Date.now(),D={name:'Чиби',skin:'#f6d3b8',hair:'#6b4430',eye:'#4a3426',style:'bob',outfit:'#c6e3a0',ot:'tee',acc:'none',coins:0};
 for(const k in D)if(c[k]==null)c[k]=D[k];
 if(!Array.isArray(c.own))c.own=['none'];if(!Array.isArray(c.ms))c.ms=[];if(!(isFinite(c.coins)))c.coins=0;
 ['sat','wat'].forEach(k=>{const v=c[k];if(!v||typeof v!=='object'||!isFinite(v.v)||!isFinite(v.t))c[k]={v:isFinite(v&&v.v)?+v.v:60,t:isFinite(v&&v.t)?+v.t:now}})}catch(e){}}
/* таймеры чиби (раз в 30 с и др.) рисуют героя мимо render — чиним и там */
if(typeof renderChibi==='function'){const _rch96=renderChibi;renderChibi=function(){cbFix();return _rch96.apply(this,arguments)}}
if(typeof clUse==='function'){const _cu96=clUse;clUse=async function(){try{return await _cu96.apply(this,arguments)}finally{cbFix()}}}
if(typeof clRefresh46==='function'){const _cr96=clRefresh46;clRefresh46=async function(){try{return await _cr96.apply(this,arguments)}finally{cbFix()}}}

/* ---------- 6. ярлыки PWA: ./?a=add и ./?a=water ---------- */
const PA_KEY='flow_pa';let paBusy=false;
(function(){try{const url=new URL(location.href),a=url.searchParams.get('a');if(a!=='add'&&a!=='water')return;
 try{sessionStorage.setItem(PA_KEY,a)}catch(e){window.__pa96=a}
 url.searchParams.delete('a');history.replaceState(history.state,'',url.pathname+url.search+url.hash)}catch(e){}})();
function paGet(){try{return sessionStorage.getItem(PA_KEY)}catch(e){return window.__pa96||null}}
function paClear(){try{sessionStorage.removeItem(PA_KEY)}catch(e){}window.__pa96=null}
function paRun(){const a=paGet();if(!a||paBusy||!okUser())return;const app=document.getElementById('app');if(!app||app.hidden)return;
 paClear();paBusy=true;setTimeout(()=>{paBusy=false;try{
  if(a==='add'){if(window.qa90Open)qa90Open();else quickAdd()}
  else if(a==='water'){const w=+day().water||0;if(w>=8)toast('Норма воды на сегодня уже выполнена 💧');else{setWater(w+1);toast('Вода +1 💧 '+(w+1)+' из 8')}}
 }catch(e){}},350)}

/* ---------- обёртки ---------- */
if(typeof renderWeight==='function'){const _rw96=renderWeight;renderWeight=function(){const x=_rw96.apply(this,arguments);try{weightEmpty()}catch(e){}return x}}
if(typeof renderCarb==='function'){const _rc96=renderCarb;renderCarb=function(){const x=_rc96.apply(this,arguments);try{mealPlus()}catch(e){}return x}}
if(typeof renderStats==='function'){const _rs96=renderStats;renderStats=function(){const x=_rs96.apply(this,arguments);try{statsEmpty()}catch(e){}return x}}
const _r96=render;render=function(){cbFix();try{heroDefault()}catch(e){}const x=_r96.apply(this,arguments);
 try{headSub()}catch(e){}try{statsEmpty()}catch(e){}try{weightEmpty()}catch(e){}try{mealPlus()}catch(e){}try{paRun()}catch(e){}return x};
if(typeof enter==='function'){const _en96=enter;enter=function(){cbFix();const x=_en96.apply(this,arguments);try{paRun()}catch(e){}return x}}

document.head.insertAdjacentHTML('beforeend','<style id="v96css">'+
 /* запасной вид заглушки, если v91 не подключён (у v91 те же правила для .v91empty) */
 '.e96{display:flex;gap:14px;align-items:center;padding:14px 16px;border:1px dashed var(--line);border-radius:var(--r-ctl,14px);margin-top:4px}'+
 '.e96>svg{flex:none;width:40px;height:40px;opacity:.8}.e96 b{display:block;color:var(--txt);margin-bottom:2px}.e96 p{margin:0;font-size:var(--fs-cap,12px);color:var(--mut);line-height:1.4}'+
 '.e96b{margin-top:10px;min-height:40px;padding:8px 14px;border-radius:var(--r-ctl,14px);border:1px solid var(--line);background:rgba(var(--acc),.16);color:var(--txt);font:inherit;font-weight:700;cursor:pointer}'+
 '.e96m{display:flex;align-items:center;justify-content:space-between;gap:10px}'+
 '.e96p{flex:none;min-height:36px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:rgba(var(--acc),.14);color:var(--txt);font:inherit;font-size:12px;font-weight:700;cursor:pointer}'+
 /* мягкое свечение под «+» (v91 его не делает); темы со своей тенью у «+» не трогаем */
 'html:not([data-ui=glam]):not([data-theme=slate]) nav .fab{filter:drop-shadow(0 8px 16px color-mix(in srgb,var(--lime) 42%,transparent))}'+
 '</style>');

cbFix();try{if(okUser())render()}catch(e){}
})();
