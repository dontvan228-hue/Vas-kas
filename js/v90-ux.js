/* ===== v90: быстрое добавление, прошлые дни, вода в одном месте, пустой дневник, вес наверху ===== */
/* Подключается после всех встроенных скриптов. Всё внутри IIFE, наружу только qa90* и cd90* для onclick. */
(function(){
'use strict';
if(typeof render!=='function'||typeof U!=='function')return;

const MEALS=['Завтрак','Обед','Ужин','Перекус'];
const mealNow=()=>{try{if(typeof cbMeal==='function')return cbMeal()}catch(e){}const h=new Date().getHours();return h<11?'Завтрак':h<16?'Обед':h<21?'Ужин':'Перекус'};
const r1=v=>Math.round((+v||0)*10)/10;
const fmtDay=ds=>new Date(ds+'T12:00').toLocaleDateString('ru',{day:'numeric',month:'short'});
const okUser=()=>{try{return !!(me&&U()&&U().p)}catch(e){return false}};

/* ---------- 2. просмотр и правка прошлого дня ----------
   day() объявлена как const, переопределить её нельзя. Поэтому на время просмотра прошлого дня
   U().days заворачивается в Proxy: ключ today() подменяется на curDay ТОЛЬКО когда обращение идёт
   из функции day() и в стеке нет расчётов «про сейчас» (серия, уведомления, обучение, облако).
   JSON.stringify/save/синхронизация идут мимо day() и видят настоящие данные.
   Если разбор стека не удался, подмены нет, то есть показывается сегодня (безопасный отказ). */
let curDay=null;
const DENY=/^(tick|streak|learn|nudge|bell|fire|clPush|clPull|clData|clRefresh46|clMergeInto|renderChibi|cbSat|cbWat|cbNeed|cbTick)$/;
const SELF=/v90-ux\.js/;
function frames(){const L=Error.stackTraceLimit;try{Error.stackTraceLimit=60}catch(e){}const s=String(new Error().stack||'');try{Error.stackTraceLimit=L}catch(e){}
 const out=[];s.split('\n').forEach(l=>{if(!l||SELF.test(l)||/^Error/.test(l))return;let m=l.match(/^\s*at (?:async )?([\w$.]+) \(/);if(m){out.push(m[1].split('.').pop());return}
  m=l.match(/^([\w$.]*)@/);if(m){out.push((m[1]||'').split('.').pop());return}if(/^\s*at /.test(l))out.push('')});return out}
function viaDay(){if(!curDay)return false;const f=frames();if(f[0]!=='day')return false;return !f.some(n=>DENY.test(n))}
const RAW=Symbol('raw90');
function wrapDays(u){if(!u||!u.days||u.days[RAW])return;const raw=u.days;
 u.days=new Proxy(raw,{get(t,k,r){if(k===RAW)return t;if(curDay&&typeof k==='string'&&k===today()&&curDay!==k&&viaDay())return t[curDay];return t[k]},
  set(t,k,v){if(curDay&&typeof k==='string'&&k===today()&&curDay!==k&&viaDay()){t[curDay]=v;return true}t[k]=v;return true}})}
function unwrapDays(u){if(u&&u.days&&u.days[RAW])u.days=u.days[RAW]}
function cdEnsure(){try{const u=U();if(!u)return;if(curDay&&curDay!==today())wrapDays(u);else{curDay=null;unwrapDays(u)}}catch(e){}}
function cdOpen(ds){try{if(!okUser())return;const t=today();if(!/^\d{4}-\d{2}-\d{2}$/.test(ds)||ds>t)return toast('Будущие дни открыть нельзя');
 curDay=ds===t?null:ds;cdEnsure();
 if(curDay){/* самопроверка: если подмена в этом браузере не сработала, не показываем чужой день под видом сегодняшнего */
  let ok=false;try{const u=U(),raw=u.days[RAW]||u.days;if(!raw[curDay])raw[curDay]={food:[],water:0};ok=day()===raw[curDay]}catch(e){}
  if(!ok){curDay=null;cdEnsure();toast('Просмотр прошлых дней не поддерживается в этом браузере')}}
 render()}catch(e){}}
function cdBack(){curDay=null;cdEnsure();try{render()}catch(e){}}
window.cd90Open=cdOpen;window.cd90Back=cdBack;
window.cd90Day=()=>curDay;
/* при сворачивании приложения и смене даты возвращаемся к сегодня, чтобы уведомления и серия считали правильно */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&curDay)cdBack()});

function banner(){let b=document.getElementById('cd90');const app=document.getElementById('app');if(!app)return;
 if(!b){b=document.createElement('div');b.id='cd90';b.setAttribute('role','status');const w=app.querySelector('.wrap');(w||app).insertBefore(b,(w||app).firstChild)}
 const tab=(document.querySelector('.tab.on')||{}).id||'';
 if(curDay&&(tab==='t-today'||tab==='t-carb')){b.innerHTML=`<span>Вы смотрите <b>${esc(fmtDay(curDay))}</b></span><button type="button" onclick="cd90Back()">Вернуться к сегодня</button>`;b.hidden=false}
 else{b.hidden=true;b.innerHTML=''}}

/* полоска «Неделя»: дни кликабельны */
if(typeof weekStrip==='function'){const _ws90=weekStrip;weekStrip=function(){_ws90.apply(this,arguments);try{
 const e=document.getElementById('wk');if(!e||!U())return;const t=new Date(),o=t.getTimezoneOffset()*6e4,cells=[...e.children];
 cells.forEach((c,idx)=>{const i=cells.length-1-idx,ds=new Date(t-i*864e5-o).toISOString().slice(0,10);c.dataset.d=ds;c.setAttribute('role','button');c.tabIndex=0;
  c.setAttribute('aria-label',(i?'Открыть ':'Сегодня, ')+fmtDay(ds));c.classList.toggle('sel90',(curDay||today())===ds);
  c.onclick=()=>cdOpen(ds);c.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();cdOpen(ds)}}})}catch(e){}}}

/* ---------- 1. быстрое добавление: нижняя панель поверх текущего экрана ---------- */
let qaMeal=mealNow(),qaOpenF=false,qaList=[];
function qaEl(){let p=document.getElementById('qa90');if(p)return p;
 document.body.insertAdjacentHTML('beforeend','<div id="qa90bk" onclick="qa90Close()"></div><div id="qa90" role="dialog" aria-modal="true" aria-label="Быстро добавить еду"><div class="qa90g" onclick="qa90Close()"></div>'+
  '<div class="qa90h"><b id="qa90T">Добавить еду</b><button type="button" class="qa90x" aria-label="Закрыть" onclick="qa90Close()">✕</button></div>'+
  '<div class="qa90m" id="qa90M"></div><input id="qa90Q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Найти: гречка, банан, кефир…" aria-label="Поиск продукта">'+
  '<div class="qa90b" id="qa90B"></div></div>');
 const q=document.getElementById('qa90Q');q.addEventListener('input',qaDraw);
 q.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();q.blur()}});
 return document.getElementById('qa90')}
function recents(){const u=U(),seen=new Set(),out=[];const keys=Object.keys((u.days&&u.days[RAW])||u.days||{}).sort().reverse().slice(0,21);
 const D=(u.days&&u.days[RAW])||u.days;for(const k of keys){const f=(D[k]&&D[k].food)||[];for(let i=f.length-1;i>=0;i--){const x=f[i];if(!x||!x.n)continue;const n=String(x.n).toLowerCase();if(seen.has(n))continue;seen.add(n);out.push(x);if(out.length>=6)return out}}return out}
function porFor(name){try{if(typeof PORTIONS!=='undefined'&&PORTIONS){const base=String(name).replace(/,\s*\d+\s*г$/,'');const p=PORTIONS[base]||PORTIONS[name];if(Array.isArray(p)&&p.length)return p}}catch(e){}return null}
function defG(r){const p=porFor(r.n);if(p)return {g:+p[0][1],l:p[0][0]};if(r.g>0)return {g:Math.round(r.g),l:'порция'};if(r.por>0)return {g:Math.round(r.por),l:'порция'};return {g:100,l:''}}
function row(kind,i,name,sub,btn){return `<div class="res qa90r"><span class="qa90n" onclick="qa90Pick('${kind}',${i})">${esc(name)}<br><small>${sub}</small></span><button type="button" class="qa90p" aria-label="Добавить ${esc(name)}" onclick="qa90Add('${kind}',${i})">${btn}</button></div>`}
function qaDraw(){const B=document.getElementById('qa90B');if(!B||!okUser())return;
 document.getElementById('qa90M').innerHTML=MEALS.map(m=>`<span class="chip2 ${m===qaMeal?'on':''}" role="button" tabindex="0" onclick="qa90Meal('${m}')">${m}</span>`).join('');
 document.getElementById('qa90T').textContent=curDay?'Добавить за '+fmtDay(curDay):'Добавить еду';
 const q=document.getElementById('qa90Q').value.trim();let h='';qaList=[];
 if(!q){const rc=recents(),fv=(U().fav||[]).slice(0,8);
  if(rc.length){h+='<p class="qa90s">Недавние</p>'+rc.map((x,i)=>{qaList.push({t:'e',o:x});return row('l',qaList.length-1,x.n,x.k+' ккал · одним касанием','＋')}).join('')}
  if(fv.length){h+='<p class="qa90s">Избранное</p>'+fv.map(x=>{qaList.push({t:'e',o:x});return row('l',qaList.length-1,x.n,x.k+' ккал','＋')}).join('')}
  if(!rc.length&&!fv.length)h+='<p class="m qa90e">Начните вводить название. Нажмите «＋», чтобы сразу записать обычную порцию, или на название, чтобы выбрать граммы.</p>'}
 else{let res=[];try{res=srch(q).slice(0,30)}catch(e){}
  h+=res.length?'<p class="qa90s">Найдено</p>'+res.map(r=>{qaList.push({t:'r',o:r});const d=defG(r);return row('l',qaList.length-1,(r.my?'⭐ ':'')+r.n,`${Math.round(r.k)} ккал/100 г · ＋ ${d.l&&d.l!=='порция'?esc(d.l)+', ':''}${d.g} г`,'＋')}).join('')
   :`<p class="m qa90e">Ничего не нашлось. Попробуйте другое слово или <button type="button" class="qa90lnk" onclick="qa90Close();go('carb',document.querySelector('nav button:nth-child(2)'))">добавьте свой продукт</button>.</p>`}
 B.innerHTML=h}
function addEntry(o){const c=Object.assign({},o);c.m=qaMeal;delete c.t;addMacroFood(c)}
function addRes(r,g){const f=g/100,k=v=>r1(v*f);addMacroFood({n:`${r.n}, ${g} г`,k:Math.round(r.k*f),c:k(r.c),fi:k(r.fi),p:k(r.p),f:k(r.f),m:qaMeal})}
window.qa90Meal=m=>{qaMeal=m;qaDraw()};
window.qa90Add=(kind,i)=>{try{const it=qaList[i];if(!it)return;if(it.t==='e')addEntry(it.o);else addRes(it.o,defG(it.o).g);qaClose()}catch(e){toast('Не получилось добавить')}};
window.qa90Pick=(kind,i)=>{try{const it=qaList[i];if(!it)return;if(it.t==='e'){addEntry(it.o);qaClose();return}
 RES=[Object.assign({},it.o)];openSheet(0);shM=qaMeal;drawMeals()}catch(e){toast('Не получилось открыть продукт')}};
function vvFit(){const p=document.getElementById('qa90');if(!p||!qaOpenF)return;const vv=window.visualViewport;
 const ih=window.innerHeight,vh=vv?vv.height:ih,top=vv?vv.offsetTop:0,kb=Math.max(0,ih-(vh+top));
 const H=Math.max(240,Math.min(640,vh-24));p.style.bottom=kb+'px';p.style.maxHeight=H+'px';p.style.height=H+'px'}
function qaOpen(){if(!okUser())return;const p=qaEl();qaMeal=mealNow();document.getElementById('qa90Q').value='';qaOpenF=true;qaDraw();vvFit();
 document.getElementById('qa90bk').classList.add('on');p.classList.add('on');document.documentElement.classList.add('qa90lock');
 try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}
 const q=document.getElementById('qa90Q');try{q.focus({preventScroll:true})}catch(e){q.focus()}}
function qaClose(){qaOpenF=false;const p=document.getElementById('qa90');if(p){p.classList.remove('on');p.style.bottom='';p.style.height=''}const b=document.getElementById('qa90bk');if(b)b.classList.remove('on');
 document.documentElement.classList.remove('qa90lock');const q=document.getElementById('qa90Q');if(q)q.blur()}
window.qa90Open=qaOpen;window.qa90Close=qaClose;
if(window.visualViewport){visualViewport.addEventListener('resize',vvFit);visualViewport.addEventListener('scroll',vvFit)}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qaOpenF&&!document.getElementById('sheet').classList.contains('on'))qaClose()});
quickAdd=function(){qaOpen()};
/* граммы выбраны в обычной панели — закрываем и быструю */
if(typeof commitSheet==='function'){const _cs90=commitSheet;commitSheet=function(){const r=_cs90.apply(this,arguments);try{if(qaOpenF)qaClose()}catch(e){}return r}}
/* порции от Нутрициолога (js/portions-data.js) рядом с граммами */
if(typeof openSheet==='function'){const _os90=openSheet;openSheet=function(i){const r=_os90.apply(this,arguments);try{const it=RES[i],p=it&&porFor(it.n);if(p){let e=document.getElementById('shP');
 if(!e){e=document.createElement('div');e.id='shP';e.style.cssText='margin:6px 0;display:flex;gap:6px;flex-wrap:wrap';$('#shR').insertAdjacentElement('afterend',e)}
 e.insertAdjacentHTML('afterbegin',p.slice(0,6).map(x=>`<span class="chip2" role="button" onclick="shG_set(${Math.round(+x[1])})">${esc(x[0])} · ${Math.round(+x[1])} г</span>`).join(''))}}catch(e){}return r}}

/* ---------- 3. вода в одном месте ---------- */
const lit=n=>String(Math.round(n*25)/100).replace('.',',');
function waterCard(){const c=document.getElementById('tdWater');if(!c||!okUser())return;const d=day(),w=+d.water||0;
 const h=c.querySelector('h2');if(h)h.textContent='Вода';
 let s=document.getElementById('wt90');if(!s){s=document.createElement('div');s.id='wt90';const g=document.getElementById('glasses');g.parentNode.insertBefore(s,g)}
 s.innerHTML=`<span><b>${w}</b> из 8 стаканов<br><small>${lit(w)} л из 2 л</small></span><span class="wt90b"><button type="button" aria-label="Минус стакан" ${w?'':'disabled'} onclick="setWater(${w})">−</button><button type="button" aria-label="Плюс стакан" onclick="setWater(${w+1})">＋</button></span>`;
 /* «−»: setWater(n) при n===water ставит n-1, поэтому передаём текущее значение */
 const sw=document.getElementById('sW');if(sw){sw.textContent=w+'/8';const box=sw.parentNode;if(box&&!box.dataset.wt90){box.dataset.wt90=1;box.style.cursor='pointer';box.setAttribute('role','button');box.setAttribute('aria-label','Перейти к воде');box.addEventListener('click',()=>{const t=document.getElementById('tdWater');if(t)t.scrollIntoView({behavior:'smooth',block:'center'})})}}
 const slider=document.getElementById('nwt87');if(slider)slider.hidden=true}

/* ---------- 4. пустой дневник: призыв с кнопкой ---------- */
function emptyCta(){const fl=document.getElementById('foodList');if(!fl||!okUser())return;
 const h=document.querySelector('#tdEaten>h2,#tdEaten h2');if(h)h.textContent=curDay?'Съедено '+fmtDay(curDay):'Сегодня съедено';
 if(day().food.length)return;
 fl.innerHTML=`<div class="em90"><p class="m">${curDay?'В этот день записей нет.':'Пока пусто. Начните с того, что уже съели сегодня.'}</p><button type="button" class="btn" onclick="qa90Open()">＋ ${curDay?'Добавить за '+esc(fmtDay(curDay)):'Записать еду'}</button></div>`}

/* ---------- 5. «Записать вес» наверху «Прогресса» ---------- */
function weightTop(){const t=document.getElementById('t-weight'),i=document.getElementById('wIn');if(!t||!i)return;const card=i.closest('.card');if(!card||card.parentNode!==t)return;
 const first=[...t.children].find(e=>e.classList.contains('card'));if(first&&first!==card)t.insertBefore(card,first)}

/* ---------- общий хук ---------- */
const _r90=render;render=function(){cdEnsure();const x=_r90.apply(this,arguments);try{waterCard()}catch(e){}try{emptyCta()}catch(e){}try{weightTop()}catch(e){}try{banner()}catch(e){}return x};
if(typeof go==='function'){const _go90=go;go=function(){const x=_go90.apply(this,arguments);try{banner();if(qaOpenF)qaClose()}catch(e){}return x}}

document.head.insertAdjacentHTML('beforeend','<style id="v90ux">'+
 '#qa90bk{position:fixed;inset:0;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s;z-index:87}#qa90bk.on{opacity:1;pointer-events:auto}'+
 '#qa90{position:fixed;left:0;right:0;bottom:0;max-width:600px;margin:0 auto;display:flex;flex-direction:column;max-height:88vh;background:linear-gradient(var(--g1,#1b2336),var(--g2,#10151f));color:var(--txt);border-top:1px solid var(--line);border-radius:24px 24px 0 0;padding:6px 16px calc(12px + env(safe-area-inset-bottom));transform:translateY(105%);transition:transform .28s cubic-bezier(.2,.8,.2,1),bottom .15s;z-index:88;box-shadow:0 -18px 40px rgba(0,0,0,.35);box-sizing:border-box}'+
 '#qa90.on{transform:none}.qa90g{width:40px;height:5px;border-radius:3px;background:var(--line);margin:4px auto 8px;cursor:pointer}'+
 '.qa90h{display:flex;align-items:center;justify-content:space-between;gap:8px}.qa90h b{font-size:17px}.qa90x{background:none;border:0;color:var(--txt);font-size:18px;min-width:44px;min-height:44px;cursor:pointer}'+
 '.qa90m{display:flex;flex-wrap:wrap;margin:6px 0 2px}.qa90m .chip2{margin:0 6px 6px 0}.qa90m .chip2.on{background:rgb(var(--acc));color:var(--on,#111);border-color:transparent}'+
 '#qa90Q{width:100%;box-sizing:border-box;font-size:16px;margin:2px 0 4px}'+
 '.qa90b{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;min-height:0;flex:1 1 auto;padding-bottom:6px}'+
 '.qa90s{margin:12px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}'+
 '.qa90r{padding:0!important;gap:0!important;cursor:default}.qa90n{flex:1;min-width:0;padding:11px 12px;cursor:pointer;overflow-wrap:anywhere}.qa90n small{color:var(--mut)}'+
 '.qa90p{flex:none;align-self:stretch;min-width:52px;border:0;border-left:1px solid var(--line);background:rgba(var(--acc),.16);color:var(--txt);font-size:22px;border-radius:0 14px 14px 0;cursor:pointer}'+
 '.qa90e{margin-top:12px}.qa90lnk{background:none;border:0;padding:0;color:rgb(var(--acc));font:inherit;text-decoration:underline;cursor:pointer}'+
 'html.qa90lock,html.qa90lock body{overflow:hidden}'+
 '#cd90{position:fixed;left:12px;right:12px;bottom:calc(92px + env(safe-area-inset-bottom));max-width:560px;margin:0 auto;z-index:6;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;box-sizing:border-box;padding:10px 14px;border-radius:16px;background:rgb(var(--acc));color:var(--on,#111);font-size:14px;box-shadow:0 8px 20px rgba(0,0,0,.25)}#cd90[hidden]{display:none}'+
 '.tab.on{scroll-padding-bottom:160px}#cd90 button{background:rgba(0,0,0,.18);color:inherit;border:0;border-radius:12px;padding:8px 12px;min-height:40px;font:inherit;font-weight:700;cursor:pointer}'+
 '#wk>div{cursor:pointer;-webkit-tap-highlight-color:transparent}#wk>div.sel90{outline:2px solid rgb(var(--acc));outline-offset:2px;border-radius:12px}'+
 '#wt90{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;font-size:14px}#wt90 b{font-size:20px}'+
 '.wt90b{display:flex;gap:8px}.wt90b button{min-width:44px;min-height:44px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--txt);font-size:20px;cursor:pointer}.wt90b button:disabled{opacity:.4}'+
 '#nwt87{display:none!important}.em90 .btn{margin-top:10px}'+
 '</style>');

try{if(okUser())render()}catch(e){}
})();
