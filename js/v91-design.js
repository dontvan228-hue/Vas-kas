/* ===== v91: дизайн — токены, исправления тем, тост сверху, пустой прогноз, hero ===== */
/* Подключается после встроенных скриптов и v90-ux.js. Только CSS-слой и тонкие обёртки,
   наружу ничего не экспортирует. */
(function(){
'use strict';
if(typeof render!=='function')return;

var css=[
/* ---------- 0. Токены: темы меняют цвет, радиус и шрифт, размеры общие ---------- */
':root{--r-card:22px;--r-ctl:14px;--fs-hero:44px;--fs-h1:22px;--fs-h2:15px;--fs-body:14px;--fs-cap:12px;',
' --sh-1:0 1px 2px rgba(20,16,30,.06),0 6px 18px -8px rgba(20,16,30,.16);',
' --sh-2:0 10px 30px -10px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.18)}',
'html[data-theme=nglass],html[data-theme=slate]{--r-card:26px;--r-ctl:16px}',
'html[data-theme=warm],html[data-theme=wine],html[data-theme=snow]{--r-card:22px;--r-ctl:14px}',
'html[data-theme=calm],html[data-theme=pearl]{--r-card:26px;--r-ctl:16px}',
'html[data-theme=iron],html[data-theme=steel],html[data-theme=forest]{--r-card:14px;--r-ctl:10px}',
'html[data-theme=neon]{--r-card:6px;--r-ctl:6px}',
'html[data-ui=glam]{--r-card:0px;--r-ctl:2px}',
'html[data-ui=granny]{--fs-h2:17px;--fs-body:17px;--fs-cap:14px}',
/* числа не прыгают при смене цифр */
':where(#rN,.stats b,.v87,.mr b,.ringbox .n,#nlC,#nlW,#nlP,.tile b,#hSub,.tabs2 button,#nwtL,.res small){font-variant-numeric:tabular-nums}',
/* заголовки карточек: одинаковый размер и отступ во всех темах, начертание остаётся за темой */
'.card>h2{font-size:var(--fs-h2)!important;line-height:1.3!important;margin-bottom:12px}',
'html[data-theme=slate] .card>h2{font-size:12px!important}',
/* контролы следуют радиусу темы */
':where(.card) :where(input:not([type=range]):not([type=checkbox]),select,textarea){border-radius:var(--r-ctl)}',
'html[data-ui=glam] .chip,html[data-ui=glam] .tabs2,html[data-ui=glam] .tabs2 button,html[data-ui=glam] .res i,html[data-ui=glam] #t-me .card button:not(.fab){border-radius:var(--r-ctl)!important}',
/* светлые темы: карточкам мягкая глубина вместо плоских плашек */
'html[data-theme=warm] .card,html[data-theme=snow] .card,html[data-theme=calm] .card,html[data-theme=pearl] .card{box-shadow:var(--sh-1)!important}',

/* ---------- 1. glam / biz: «+» снова круг с плюсом ---------- */
'html[data-ui=glam] nav .fab{flex:none!important;width:48px!important;height:48px!important;min-width:48px!important;padding:0!important;margin:-14px 6px 0!important;border-radius:50%!important;',
' background:linear-gradient(135deg,var(--a1),var(--a2))!important;color:var(--on)!important;font-size:26px!important;font-weight:300!important;line-height:1!important;',
' display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 0 0 5px var(--bg),var(--sh-2)!important;border:0!important}',
'html[data-ui=glam] nav .fab::before,html[data-ui=glam] nav .fab::after{display:none!important}',

/* ---------- 2. slate: видимый «+», читаемые заголовки и подписи ---------- */
'html[data-theme=slate] nav .fab{background:#2c3b3d!important;color:#f4f7f6!important;border:1px solid rgba(255,255,255,.4)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;font-weight:300!important;box-shadow:0 0 0 6px rgba(108,127,128,.55),var(--sh-2)!important}',
'html[data-theme=slate] .card>h2,html[data-theme=slate] .stats,html[data-theme=slate] .stats b,html[data-theme=slate] .ringbox .l,html[data-theme=slate] .mr,html[data-theme=slate] .card label{color:var(--txt)!important;opacity:1!important;font-weight:600!important;text-shadow:0 1px 2px rgba(20,32,34,.45)!important}',
'html[data-theme=slate] .card .m{text-shadow:0 1px 2px rgba(20,32,34,.35)}',

/* ---------- 3. тост: сверху под шапкой, одна аккуратная плашка ---------- */
'#toast{top:calc(env(safe-area-inset-top,0px) + 74px)!important;bottom:auto!important;width:max-content!important;max-width:min(calc(100vw - 32px),420px)!important;',
' transform:translate(-50%,-12px);box-shadow:var(--sh-2);line-height:1.3;padding:10px 18px!important;z-index:96!important}',
'#toast.on{transform:translate(-50%,0)!important;animation:v91ts .4s cubic-bezier(.3,1.4,.5,1)!important}',
'@keyframes v91ts{from{transform:translate(-50%,-14px) scale(.94);opacity:0}}',
'html[data-ui=granny] #toast{top:calc(env(safe-area-inset-top,0px) + 84px)!important;font-size:15px!important}',

/* ---------- 4. шапка: логотип и подзаголовок в одну строку ---------- */
'header>div:first-child{min-width:0;flex:1 1 auto}',
'header>div:first-child>b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#hSub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'html[data-ui=granny] header>div:first-child>b{font-size:15px!important;letter-spacing:.02em!important}',
'html[data-ui=granny] #hSub{font-size:12px!important}',
'html[data-theme=slate] header>div:first-child>b{letter-spacing:.18em!important}',
'@media (max-width:340px){header>div:first-child>b{font-size:14px!important}html[data-theme=slate] header>div:first-child>b{letter-spacing:.1em!important}}',

/* ---------- 5. granny: непрозрачная нижняя панель ---------- */
'html[data-ui=granny] nav{background:var(--bg)!important;box-shadow:0 -8px 24px -6px rgba(47,40,29,.18)!important;border-color:var(--line)!important}',

/* ---------- 6. granny: Макро — поле поиска, кольцо, строки результатов ---------- */
'html[data-ui=granny] .card .row{display:flex!important;gap:10px!important;align-items:flex-end!important}',
'html[data-ui=granny] .card .row>div{flex:1 1 auto!important;min-width:0!important}',
'html[data-ui=granny] .card .row>.btn{flex:0 0 56px!important;width:56px!important;min-width:56px!important;height:56px!important;padding:0!important;margin:0!important;border-radius:var(--r-ctl)!important}',
'html[data-ui=granny] .card .row input{width:100%!important;min-width:0!important}',
'html[data-ui=granny] #mBars .big{flex-direction:column!important;align-items:center!important;text-align:center!important;gap:10px!important}',
'html[data-ui=granny] #mBars .big .m{display:inline}',
'html[data-ui=granny] .res{gap:10px}',
'html[data-ui=granny] .res>span{flex:1 1 auto;min-width:0}',
'html[data-ui=granny] .res>i{flex:none}',

/* ---------- 7. кнопки: без переносов там, где строка одна ---------- */
'.btn{overflow-wrap:normal}',
'html[data-theme=iron] .btn{letter-spacing:.03em!important;font-size:14px!important}',
'#t-me .row .btn,#t-me .btn.ghost{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'html[data-ui=granny] #t-me .card .btn{font-size:16px!important;padding-left:10px!important;padding-right:10px!important}',

/* ---------- 8. y2k: подписи под иконками, как в остальных темах ---------- */
'html[data-ui=y2k] nav button em{display:block!important;font-size:9px;letter-spacing:.06em;text-transform:uppercase;opacity:.75}',
'html[data-ui=y2k] nav button.on em{opacity:1;letter-spacing:.06em!important}',
'html[data-ui=y2k] nav button.on{padding-left:8px!important;padding-right:8px!important}',

/* ---------- 9. wine: розовый акцент вместо салатового ---------- */
':root[data-theme=wine]{--lime:#f2b6c4;--acc:242,182,196;--a1:#f8cfd8;--a2:#e9a0b3;--on:#2a0a14;--line:rgba(242,182,196,.24)}',

/* ---------- 10. пустой прогноз ---------- */
'.v91empty{display:flex;gap:14px;align-items:center;padding:14px 16px;border:1px dashed var(--line);border-radius:var(--r-ctl);margin-top:4px}',
'.v91empty svg{flex:none;width:40px;height:40px;opacity:.8}',
'.v91empty b{display:block;font-size:var(--fs-body);color:var(--txt);margin-bottom:2px}',
'.v91empty p{margin:0;font-size:var(--fs-cap);color:var(--mut);line-height:1.4}',

/* ---------- hero: три метрики в одной плашке, кольцо с градиентом ---------- */
'#ringCard .stats{gap:0!important;padding:4px 0!important;border-radius:var(--r-ctl);background:color-mix(in srgb,var(--txt) 6%,transparent);border:1px solid var(--line)}',
'#ringCard .stats>div{background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:8px 4px!important}',
'#ringCard .stats>div+div{border-left:1px solid var(--line)!important}',
'#ringCard .stats b{font-size:18px!important;font-weight:700;letter-spacing:-.01em}',
'html[data-ui=glam] #ringCard .stats{background:none;border-left:0;border-right:0}',
'#rg.v91g{stroke:url(#v91grad)!important;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--lime) 45%,transparent))}',
'.fab{transition:transform .15s ease}.fab:active{transform:scale(.94)}'
].join('\n');
document.head.insertAdjacentHTML('beforeend','<style id="v91css">'+css+'</style>');

/* ---------- кольцо hero: градиент от --a1 к --a2 (кроме nglass, у него свой неон) ---------- */
function ringGrad(){try{
 var rg=document.getElementById('rg');if(!rg)return;var svg=rg.ownerSVGElement;if(!svg)return;
 var th=document.documentElement.dataset.theme;
 if(th==='nglass'){rg.classList.remove('v91g');return}
 if(!document.getElementById('v91grad')){
  var NS='http://www.w3.org/2000/svg',defs=document.createElementNS(NS,'defs'),g=document.createElementNS(NS,'linearGradient');
  g.id='v91grad';g.setAttribute('x1','0');g.setAttribute('y1','0');g.setAttribute('x2','1');g.setAttribute('y2','1');
  [['0%','var(--a1)'],['100%','var(--a2)']].forEach(function(s){var st=document.createElementNS(NS,'stop');st.setAttribute('offset',s[0]);st.setAttribute('style','stop-color:'+s[1]);g.appendChild(st)});
  defs.appendChild(g);svg.insertBefore(defs,svg.firstChild)}
 rg.classList.add('v91g');
}catch(e){}}

/* ---------- пустой прогноз: вместо пустых осей — заглушка ---------- */
function emptyStats(){try{
 var box=document.getElementById('stCal');if(!box||!box.querySelector('svg'))return;
 var rects=box.querySelectorAll('svg rect');if(!rects.length)return;
 for(var i=0;i<rects.length;i++){if(+rects[i].getAttribute('height')>2.5)return}
 box.innerHTML='<div class="v91empty"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--lime)"><path d="M6 32h28"/><path d="M10 26l7-7 6 5 9-11"/><circle cx="32" cy="13" r="2"/></svg>'
  +'<div><b>Здесь появится график</b><p>Записывайте еду хотя бы пару дней, и мы покажем калории и углеводы по дням рядом с вашим планом.</p></div></div>';
}catch(e){}}
if(typeof renderStats==='function'){var _rs91=renderStats;renderStats=function(){var x=_rs91.apply(this,arguments);emptyStats();return x}}

/* ---------- автоматический откат режима не показывает тост «Режим: …» ---------- */
var quiet=false;
if(typeof toast==='function'){var _t91=toast;toast=function(t){if(quiet&&/^Режим:/.test(String(t)))return;return _t91.apply(this,arguments)}}
if(typeof manMode==='function'){var _mm91=manMode;manMode=function(){quiet=true;try{return _mm91.apply(this,arguments)}finally{quiet=false}}}

/* после каждой отрисовки и смены режима */
var _r91=render;render=function(){var x=_r91.apply(this,arguments);ringGrad();emptyStats();return x};
if(typeof applyMode==='function'){var _am91=applyMode;window.applyMode=applyMode=function(){var x=_am91.apply(this,arguments);ringGrad();return x}}
ringGrad();emptyStats();
})();
