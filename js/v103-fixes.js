/* ===== v103: исправления по отчёту тестировщика ===== */
(function(){
/* чат: кризисные фразы проверяются раньше всего остального */
const CRISIS=/умереть|умру|не хочу жить|покончить|суицид|убить себя|самоуб|вызыва\S* рвот|вызвать рвот|слабительн|голодаю|не ем уже|не ела уже|не ел уже|трудно дышать|не могу дышать|боль в груди|теряю сознание|обморок/;
const _rp=reply;reply=function(t){try{const l=String(t).toLowerCase();if(CRISIS.test(l)){
 if(/дышать|боль в груди|сознание|обморок/.test(l))return 'Это может быть опасно. Пожалуйста, прямо сейчас позвоните в скорую: 103 или 112. Если рядом есть кто-то, попросите побыть с вами.';
 if(/умереть|умру|не хочу жить|покончить|суицид|убить себя|самоуб/.test(l))return 'Мне очень жаль, что вам сейчас так тяжело. Вы не одни. Пожалуйста, позвоните 112 или обратитесь к близкому человеку прямо сейчас. Если вам нет 18, есть бесплатный телефон доверия 8-800-2000-122.Я — приложение и не могу помочь так, как помогут люди.';
 return 'Спасибо, что написали об этом. Голодание, вызывание рвоты и слабительные вредят сердцу и обмену веществ, и это не ваша вина — так бывает при расстройстве пищевого поведения. Пожалуйста, обсудите это с врачом или психологом. Если плохо прямо сейчас — 103 или 112. Здесь можно просто записывать еду без цели похудеть: это нормально.'}}catch(e){}return _rp.apply(this,arguments)};

/* ярлык ?w=: тот же диапазон, что и в форме, одна запись на день, сортировка */
urlAct=function(){try{const q=new URLSearchParams(location.search);if(!me||!U()||!U().p)return false;let did=0;
 if(q.get('add')==='water'){const d=day();if(d.water<8){d.water++;did=1;toast('Вода +1 💧')}}
 const w=parseFloat((q.get('w')||'').replace(',','.'));
 if(w>=35&&w<=250){const u=U(),ds=today(),v=Math.round(w*10)/10,ex=u.weights.find(x=>x.d===ds);if(ex)ex.w=v;else u.weights.push({d:ds,w:v});u.weights.sort((a,b)=>a.d<b.d?-1:1);did=1;toast('Вес записан: '+String(v).replace('.',',')+' кг')}
 if(did){save();render()}
 if(q.has('add')||q.has('w'))history.replaceState(null,'',location.pathname);return true}catch(e){return false}};

/* форма плана: при ошибке проверки ответы анкеты не меняются */
const _sp=saveProfile;saveProfile=function(){const u=U();let snap=null;try{snap=u&&u.quiz?JSON.stringify(u.quiz):null}catch(e){}
 const r=_sp.apply(this,arguments);
 try{const err=$('#oErr');if(u&&snap&&err&&err.textContent.trim()&&!$('#onb').hidden){u.quiz=JSON.parse(snap);save()}}catch(e){}
 return r};

/* прогноз: при нулевом темпе не обещаем «цель через 1914 нед.» */
function fixForecast(){try{document.querySelectorAll('#t-weight p, #t-weight div, #aiNote, #trNote').forEach(e=>{if(e.children.length)return;const m=e.textContent.match(/через\s*(\d+)\s*нед/);if(m&&+m[1]>156)e.textContent=e.textContent.replace(/[^.]*через\s*\d+\s*нед[^.]*\.?/,' При нынешнем темпе вес почти не меняется: это нормально для поддержания.')})}catch(e){}}

/* кольцо при перерасходе в теме «Неоновое стекло» */
document.head.insertAdjacentHTML('beforeend','<style>html[data-theme] #rg.over{stroke:var(--warn)!important}</style>');
function ringOver(){try{const rg=$('#rg');if(rg&&U()&&U().p)rg.classList.toggle('over',eaten(day())>plan().b)}catch(e){}}

/* поле веса принимает запятую в любом браузере */
try{const w=$('#wIn');if(w&&w.type==='number'){w.type='text';w.setAttribute('inputmode','decimal')}}catch(e){}
/* стартовый таймер не перезапускает уже начатую анкету */
const _en=enter;enter=function(){try{if(!$('#quiz').hidden&&qi>=0)return}catch(e){}return _en.apply(this,arguments)};

const _r=render;render=function(){const r=_r.apply(this,arguments);fixForecast();ringOver();return r};
})();
