/* ===== v102: обезличенная статистика (Яндекс Метрика) =====
   Как включить:
   1) вставьте номер счётчика Яндекс Метрики в YM_ID ниже (например: const YM_ID=12345678;);
   2) подключите файл в index.html после остальных модулей: <script src="js/v102-metrics.js"></script>
   Пока YM_ID равен null, файл НИЧЕГО не загружает и не отправляет.

   Цели (создайте в Метрике цели типа «JavaScript-событие» с этими идентификаторами):
   reg        — создан аккаунт или начат гостевой режим (параметр kind: account | guest)
   onb_done   — впервые готов план
   food1      — первая запись еды
   d1         — запись еды на следующий день после первой
   d7         — запись еды на 7–8-й день после первой
   install    — приложение добавлено на экран или впервые открыто как приложение
   seo_to_app — первый визит пришёл со ссылки ?ref=seo-… (параметр ref)

   Персональные данные не отправляются: ни почта, ни имя, ни вес, ни здоровье, ни еда.
   Вебвизор и карта кликов выключены. Пользователь может отказаться в «Профиле → О приложении». */
const YM_ID=null; // вставьте номер счётчика Яндекс Метрики

(function(){
'use strict';
if(!YM_ID||window.__m102)return;window.__m102=1;

var OFF='flow_ym_off',SENT='flow_ym_sent',SEEN='flow_ym_seen';
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}}
function off(){return lsGet(OFF)==='1'}
function sentAll(){try{return JSON.parse(lsGet(SENT)||'{}')||{}}catch(e){return {}}}

/* метка пользователя только для локальных флагов «уже отправляли»; в Метрику не уходит */
function ukey(){try{var s=String(typeof me!=='undefined'&&me||''),h=5381;for(var i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36)}catch(e){return '0'}}
function was(goal,perUser){var a=sentAll();return !!a[perUser?goal+':'+ukey():goal]}
function mark(goal,perUser){var a=sentAll();a[perUser?goal+':'+ukey():goal]=1;lsSet(SENT,JSON.stringify(a))}

/* отправка цели; параметры — только короткие технические метки */
function goal(name,params,perUser){
  try{if(off()||was(name,perUser))return;mark(name,perUser);
    if(typeof window.ym==='function')window.ym(YM_ID,'reachGoal',name,params||undefined)}catch(e){}
}

/* ---------- загрузка Метрики (если пользователь не отказался) ---------- */
if(!off()){
  try{
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
      k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;
      if(a&&a.parentNode)a.parentNode.insertBefore(k,a);else e.head.appendChild(k)
    })(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
    window.ym(YM_ID,'init',{defer:true,clickmap:false,trackLinks:true,accurateTrackBounce:true,webvisor:false,trackHash:false});
    /* при defer:true просмотр отправляем сами — адрес без query, кроме utm/ref */
    var q=new URLSearchParams(location.search),keep=new URLSearchParams();
    q.forEach(function(v,k){if(/^utm_|^ref$/.test(k))keep.set(k,v)});
    var url=location.origin+location.pathname+(String(keep)?'?'+keep:'');
    window.ym(YM_ID,'hit',url,{title:'FLOW',referer:document.referrer});
  }catch(e){}
}

/* ---------- seo_to_app: первый визит с ?ref=seo-… ---------- */
try{
  var ref=new URLSearchParams(location.search).get('ref')||'';
  var firstVisit=!lsGet(SEEN);
  if(firstVisit&&/^seo-[\w-]{1,40}$/.test(ref))goal('seo_to_app',{ref:ref});
  lsSet(SEEN,'1');
}catch(e){}

/* ---------- install ---------- */
try{window.addEventListener('appinstalled',function(){goal('install',{how:'prompt'})})}catch(e){}
try{if((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone)goal('install',{how:'standalone'})}catch(e){}

/* ---------- reg: новый аккаунт через форму ---------- */
function accKeys(){try{return Object.keys(db.users||{}).filter(function(k){return k.indexOf('guest:')!==0})}catch(e){return []}}
try{
  if(typeof doAuth==='function'){
    var _da=doAuth;
    doAuth=async function(){
      var before=accKeys(),r=await _da.apply(this,arguments);
      try{var after=accKeys();if(after.length>before.length&&typeof me!=='undefined'&&before.indexOf(me)<0&&after.indexOf(me)>=0)goal('reg',{kind:'account'},true)}catch(e){}
      return r};
  }
}catch(e){}

/* ---------- onb_done: план появился после saveProfile ---------- */
function hasPlan(){try{return !!(U()&&U().p)}catch(e){return false}}
try{
  if(typeof saveProfile==='function'){
    var _sp=saveProfile;
    saveProfile=function(){var b=hasPlan(),r=_sp.apply(this,arguments);try{if(!b&&hasPlan())goal('onb_done',null,true)}catch(e){}return r};
  }
}catch(e){}

/* ---------- проверки после каждой отрисовки ---------- */
var known={};try{Object.keys(db.users||{}).forEach(function(k){known[k]=1})}catch(e){}
var noPlanSeen={};
function ymd(d){return new Date(d-new Date(d).getTimezoneOffset()*6e4).toISOString().slice(0,10)}
function check(){
  try{
    if(typeof me==='undefined'||!me||typeof U!=='function')return;
    var u=U();if(!u)return;
    /* гость, появившийся в этой сессии */
    if(!known[me]){known[me]=1;if(me.indexOf('guest:')===0)goal('reg',{kind:'guest'},true)}
    /* план появился в этой сессии (анкета без saveProfile) */
    if(!u.p)noPlanSeen[me]=1;else if(noPlanSeen[me])goal('onb_done',null,true);
    /* еда: только даты, без содержимого */
    var days=u.days||{},ds=Object.keys(days).filter(function(d){var x=days[d];return x&&x.food&&x.food.length>0}).sort();
    if(!ds.length)return;
    var first=ds[0],t=(typeof today==='function')?today():ymd(Date.now());
    var gap=Math.round((Date.parse(t)-Date.parse(first))/864e5),hasToday=!!(days[t]&&days[t].food&&days[t].food.length);
    if(gap===0&&hasToday&&ds.length===1)goal('food1',null,true);
    if(gap===1&&hasToday)goal('d1',null,true);
    if((gap===7||gap===8)&&hasToday)goal('d7',null,true);
  }catch(e){}
}
try{
  if(typeof render==='function'){
    var _r=render;
    render=function(){var x=_r.apply(this,arguments);check();return x};
  }
}catch(e){}

/* ---------- «Профиль → О приложении»: строка и переключатель ---------- */
function aboutUI(){
  try{
    if(document.getElementById('m102'))return;
    var h=[].slice.call(document.querySelectorAll('#t-me .card h2')).filter(function(e){return e.textContent.trim()==='О приложении'})[0];
    if(!h)return;
    var box=document.createElement('div');box.id='m102';box.style.marginTop='10px';
    box.innerHTML='<p class="m" style="font-size:12px">Мы собираем обезличенную статистику через Яндекс Метрику: сколько людей открыли приложение и дошли до первой записи. Почта, вес, еда и здоровье не передаются.</p>'+
      '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px;cursor:pointer"><input type="checkbox" id="m102off" style="width:auto;margin:0"> Не участвовать</label>';
    h.parentNode.appendChild(box);
    var cb=document.getElementById('m102off');cb.checked=off();
    cb.addEventListener('change',function(){
      lsSet(OFF,cb.checked?'1':null);
      try{toast(cb.checked?'Статистика отключена':'Спасибо! Статистика включится при следующем запуске')}catch(e){}
    });
  }catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',aboutUI);else aboutUI();
})();
