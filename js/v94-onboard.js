/* ===== v94: короткий и понятный вход — анкета с пропуском, форма «Настроим план» по порядку ===== */
(function(){
 if(typeof QZ==='undefined'||typeof qRender!=='function')return;
 const $q=s=>document.querySelector(s);

 /* ---------- 1. Анкета: необязательные вопросы можно пропустить ---------- */
 /* Обязательные (безопасность и формула): sex, look, age, life, goal, gwhy, ghow, health, diet.
    Необязательные: значение по умолчанию ничего не ломает и не влияет на безопасность. */
 const OPT={meals:'x',hard:'choice',water:'1',sleep:'2',act:'1.375',mot:'num',rem:'wv'};
 let jumpFrom=null;
 const hidden=i=>{const k=qi;qi=i;let r=false;try{r=_skip72()}catch(e){}qi=k;return r};
 window.qLater=function(){try{
  if(qi<0||qi>=QZ.length)return;const from=qi,later=[];
  for(let i=qi;i<QZ.length;i++){const key=QZ[i][0];if(key in OPT&&qa[key]==null&&!hidden(i)){qa[key]=OPT[key];later.push(key)}}
  qa.later=Array.from(new Set((qa.later||[]).concat(later)));
  let n=from+1;while(n<QZ.length&&(hidden(n)||(QZ[n][0] in OPT)))n++;
  jumpFrom=from;qi=n;try{hap()}catch(e){}qRender();window.scrollTo(0,0)}catch(e){try{qNext()}catch(_){}}};
 const _qb94=qBack;qBack=function(){try{if(jumpFrom!=null&&qi>=QZ.length){qi=jumpFrom;jumpFrom=null;qRender();return}}catch(e){}return _qb94.apply(this,arguments)};
 const _sq94=startQuiz;startQuiz=function(){jumpFrom=null;return _sq94.apply(this,arguments)};
 const _qr94=qRender;qRender=function(){const r=_qr94.apply(this,arguments);try{
  if(qi<0||qi>=QZ.length)return r;
  /* нумерация «из N» не скачет вниз: условный вопрос считаем, только когда его условие уже известно и выполнено */
  {const may=i=>{const k=QZ[i][0];if(k==='life')return qa.sex==='f';if(k==='gwhy'||k==='ghow')return qa.goal==='gain';return true};
   const opt=(QZ[qi][0] in OPT),v=[];for(let i=0;i<QZ.length;i++)if((i===qi||may(i))&&((QZ[i][0] in OPT)===opt))v.push(i);
   const k=v.indexOf(qi),pm=$q('#qBody>p.m');
   if(k>-1&&pm&&/^Вопрос \d+ из \d+$/.test(pm.textContent)){pm.textContent=opt?`Дополнительно: ${k+1} из ${v.length}`:`Вопрос ${k+1} из ${v.length}`;const bar=$q('#qBar');if(bar)bar.style.width=(opt?75+20*(k+1)/v.length:75*(k+1)/v.length)+'%'}}
  const key=QZ[qi][0];if(!(key in OPT))return r;
  const b=$q('#qBody');if(!b||b.querySelector('.q94skip'))return r;
  let left=0;for(let i=qi;i<QZ.length;i++)if(QZ[i][0] in OPT&&!hidden(i))left++;
  const p=b.querySelector('p.m');if(p&&/^Дополнительно: \d+ из \d+$/.test(p.textContent))p.textContent+=' · можно пропустить';
  b.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost q94skip" style="margin-top:12px" onclick="qLater()">Пропустить, заполню потом</button><p class="m q94note" style="text-align:center;font-size:13px;margin-top:6px">${left>1?'Осталось '+left+' необязательных вопросов: их можно заполнить позже в «Профиле».':'Это необязательный вопрос.'}</p>`)}catch(e){}return r};
 /* если в анкете что-то пропущено, сводка не должна показывать «undefined» */
 const _qs94=qSummary;qSummary=function(){try{for(const k in OPT)if(qa[k]==null){qa[k]=OPT[k];(qa.later||(qa.later=[])).push(k)}}catch(e){}return _qs94.apply(this,arguments)};

 /* ---------- 2. Форма «Настроим план»: порядок и подписи ---------- */
 const AGEK=a=>a<18?'t':a<30?'y':a<45?'a':a<60?'m':'s';
 const AGER={t:'до 18',y:'18–29',a:'30–44',m:'45–59',s:'60 и старше'};
 const AMID=(typeof AGEMID!=='undefined'&&AGEMID)||{t:16,y:24,a:37,m:52,s:65};
 const fem=()=>{const s=$q('#oSex');return !s||s.value!=='m'};
 function layout(){
  const card=$q('#onb .card'),sex=$q('#oSex'),age=$q('#oAge'),hh=$q('#oH'),oT=$q('#oT');if(!card||!sex||!age||!hh||!oT)return;
  if(!$q('#oGoalSel')){try{paceOpts()}catch(e){}}
  if(card.dataset.v94)return;card.dataset.v94=1;
  const sexRow=sex.closest('.row'),ageCell=age.parentNode;
  /* строка «Женщина · изменить» */
  sexRow.insertAdjacentHTML('beforebegin','<div id="oWho" class="m" style="display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0 2px;font-size:15px"><b id="oWhoT"></b><button type="button" id="oWhoE" style="background:none;border:0;color:var(--ac,inherit);text-decoration:underline;font:inherit;padding:6px 4px;cursor:pointer">изменить</button></div>');
  /* возраст отдельным полем на всю ширину */
  const ab=document.createElement('div');ab.id='oAgeBox';
  ab.innerHTML='<label for="oAge">Сколько вам лет?</label>';ab.appendChild(age);
  ab.insertAdjacentHTML('beforeend','<p class="m" id="oAgeHint" style="font-size:13px;margin-top:6px" hidden></p>');
  sexRow.after(ab);if(ageCell&&ageCell!==sexRow&&ageCell.parentNode===sexRow)ageCell.remove();
  /* «Главная цель» → рост и вес → цель, кг → активность → темп */
  const hRow=hh.closest('.row'),gs=$q('#oGoalSel');
  if(gs){const gl=gs.previousElementSibling;const gb=document.createElement('div');gb.id='oGoalBox';
   if(gl&&gl.tagName==='LABEL'){gl.setAttribute('for','oGoalSel');gb.appendChild(gl)}gb.appendChild(gs);hRow.before(gb)}
  const tl=[...card.querySelectorAll('label')].find(l=>l.textContent.trim()==='Цель, кг');
  const tb=document.createElement('div');tb.id='oTBox';
  if(tl){tl.setAttribute('for','oT');tl.textContent='Желаемый вес, кг';tb.appendChild(tl)}
  tb.appendChild(oT);tb.insertAdjacentHTML('beforeend','<p class="m" id="oTHint" style="font-size:13px;margin-top:6px" hidden></p>');hRow.after(tb);
  $q('#oWhoE').addEventListener('click',()=>{sexRow.hidden=!sexRow.hidden;whoUpd()});
  sex.addEventListener('change',whoUpd);age.addEventListener('input',ageUpd);
  if(gs)gs.addEventListener('change',goalUpd);$q('#oW').addEventListener('input',goalUpd);
 }
 function whoUpd(){try{const t=$q('#oWhoT'),sr=$q('#oSex').closest('.row');if(t)t.textContent=fem()?'Женщина':'Мужчина';const e=$q('#oWhoE');if(e)e.textContent=sr.hidden?'изменить':'готово';ageUpd()}catch(e){}}
 let ageMid=null;
 function ageUpd(){try{const h=$q('#oAgeHint'),a=+$q('#oAge').value;if(!h)return;let t='',warn=false;
  if(a>0&&a<18){t='Тело в этом возрасте ещё растёт, поэтому план лучше обсудить с врачом. Цель и темп выбираешь '+(fem()?'сама.':'сам.');warn=true}
  else if(ageMid&&a===ageMid.v)t='Вы выбрали «'+AGER[ageMid.k]+'», поэтому подставили '+a+'. Укажите точный возраст: от него зависит норма калорий.';
  h.textContent=t;h.hidden=!t;h.style.color=warn?'var(--warn)':''}catch(e){}}
 function goalUpd(){try{const gs=$q('#oGoalSel'),tb=$q('#oTBox'),oT=$q('#oT'),w=+$q('#oW').value,h=$q('#oTHint');if(!gs||!tb)return;
  const keep=gs.value==='keep';tb.hidden=keep;if(keep&&w>0)oT.value=w;
  if(h){const t=gs.value==='gain'?'Больше текущего веса. Темп набора выберите ниже.':gs.value==='lose'?'Меньше текущего веса. Приложение не даст поставить цель ниже здоровой.':'';h.textContent=t;h.hidden=!t}}catch(e){}}

 /* ---------- 3. Подставить ответы анкеты, если план ещё не рассчитан ---------- */
 function restore(){const u=U();if(!u||u.p||!u.quiz)return;const q=u.quiz;
  if(q.sex)$q('#oSex').value=q.sex;
  if(q.age&&AMID[q.age]){$q('#oAge').value=AMID[q.age]}
  const act=$q('#oAct');if(q.act&&[...act.options].some(o=>o.value===String(q.act)))act.value=String(q.act);
  try{paceOpts()}catch(e){}
  const pc=$q('#oPace');
  if(q.health==='preg'&&q.goal!=='gain'){[...pc.options].forEach(o=>{if(o.value!=='.25'&&o.value!=='0')o.remove()});pc.value=q.goal==='keep'?'0':'.25'}
  else if((q.goal==='keep'||q.goal==='aware')&&q.goal!=='gain'&&[...pc.options].some(o=>o.value==='0'))pc.value='0';
  if(q.goal==='keep'||q.goal==='aware')$q('#oT').value=$q('#oW').value;
  else if(q.goal==='gain'){const w=+$q('#oW').value||60;if(!(+$q('#oT').value>w))$q('#oT').value=Math.round(w+3)}
  if(!$q('#oCare'))pc.insertAdjacentHTML('afterend','<p class="m" id="oCare" style="margin-top:8px">Цель и темп можно изменить позже. Это ориентир, а не медицинская рекомендация.</p>');
 }
 function onShow(){try{layout();const u=U(),q=(u&&u.quiz)||{},fresh=u&&!u.p;
  if(fresh)restore();
  const sr=$q('#oSex').closest('.row');sr.hidden=!!((u&&u.p)||q.sex);
  ageMid=fresh&&q.age&&AMID[q.age]?{k:q.age,v:AMID[q.age]}:null;
  whoUpd();goalUpd()}catch(e){}}
 const _sh94=show;show=function(id){const r=_sh94.apply(this,arguments);if(id==='onb')onShow();return r};
 /* qFinish заполняет поля после show('onb'): обновим подсказки ещё раз */
 const _qf94=qFinish;qFinish=function(){const r=_qf94.apply(this,arguments);try{const u=U();ageMid=qa.age&&AMID[qa.age]?{k:qa.age,v:AMID[qa.age]}:null;whoUpd();goalUpd()}catch(e){}return r};
 /* точный возраст обновляет диапазон в анкете, чтобы подростковые подсказки совпадали */
 const _sp94=saveProfile;saveProfile=function(){try{const u=U(),a=+$q('#oAge').value;if(u&&u.quiz&&a>0)u.quiz.age=AGEK(a);const gs=$q('#oGoalSel');if(gs&&gs.value==='keep')$q('#oT').value=$q('#oW').value;
  if(gs&&gs.value==='lose'&&+$q('#oT').value>+$q('#oW').value){const e=$q('#oErr');if(e)e.textContent='Для снижения веса желаемый вес должен быть меньше текущего. Если хотите просто держать вес, выберите «Удержать вес».';return}}catch(e){}return _sp94.apply(this,arguments)};
 try{const o=$q('#onb');if(o&&!o.hidden)onShow()}catch(e){}
})();

/* ===== v94b: карточки-дозаполнения пропущенных вопросов анкеты (U().quiz.later) ===== */
(function(){
 if(typeof QZ==='undefined')return;
 const $q=s=>document.querySelector(s);
 /* спрашиваем только то, что на что-то влияет; мотивация и число приёмов пищи не используются */
 const ASK=['rem','act','hard'];
 const DAY=864e5;
 const tday=()=>{try{return today()}catch(e){return new Date().toISOString().slice(0,10)}};
 const kcal=()=>{try{return Math.round(plan().b)}catch(e){return 0}};
 function pick(u){const q=u&&u.quiz;if(!q||!Array.isArray(q.later)||!u.p)return null;
  if(q.lastAsk===tday())return null;
  const sn=q.snooze||{},now=Date.now();
  q.later=q.later.filter(k=>ASK.includes(k));
  const k=q.later.find(k=>!(sn[k]>now));
  if(!k)return null;const z=QZ.find(x=>x[0]===k);return z?{k,z}:null}
 function apply(u,k,v){const q=u.quiz;q[k]=v;
  if(k==='rem'){const n=NT();n.on=v!=='off';n.meals=v==='mv'||v==='meals';n.water=v!=='off';n.weigh=v==='wv'||v==='mv';n.eve=v==='mv';
   try{if(n.on&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission().then(()=>{try{renderNt()}catch(e){}})}catch(e){}
   return v==='off'?'Напоминания выключены':'Напоминания настроены. Изменить можно в «Профиле»'}
  if(k==='act'){const a=+v;if(a>0&&u.p){u.p.act=a;try{const s=$q('#oAct');if(s)s.value=String(v)}catch(e){}}const b=kcal();return b?'Норма обновлена: '+b+' ккал':'Активность сохранена'}
  if(k==='hard'){try{return (typeof HT!=='undefined'&&HT[v])||'Спасибо, учтём'}catch(e){return 'Спасибо, учтём'}}
  return 'Сохранено'}
 window.q94Ans=function(k,i){try{const u=U(),q=u.quiz,z=QZ.find(x=>x[0]===k);if(!z||!z[2][i])return;
  const msg=apply(u,k,z[2][i][2]);q.later=(q.later||[]).filter(x=>x!==k);if(q.snooze)delete q.snooze[k];q.lastAsk=tday();
  save();try{hap()}catch(e){}render();toast(msg)}catch(e){}};
 window.q94Snooze=function(k){try{const q=U().quiz;(q.snooze||(q.snooze={}))[k]=Date.now()+2*DAY;q.lastAsk=tday();save();render()}catch(e){}};
 try{if(typeof TD_ORDER!=='undefined'&&Array.isArray(TD_ORDER)&&!TD_ORDER.includes('q94Later')){const i=TD_ORDER.indexOf('ringCard');TD_ORDER.splice(i>-1?i+1:0,0,'q94Later')}}catch(e){}
 function card(){try{const t=$q('#t-today');let c=$q('#q94Later');const u=U();const it=u&&!(typeof isGuest==='function'&&isGuest()&&$q('#g99Save'))?pick(u):null;
  if(!it||!t){if(c)c.remove();return}
  const {k,z}=it,man=u.p&&u.p.sex==='m';
  let title=z[1];if(k==='act')title='Сколько вы двигаетесь? От этого зависит норма калорий';
  const html=`<h2 style="margin:0 0 4px">Уточним план</h2><p class="m" style="margin-bottom:10px">${esc(title)}</p><div class="chips">${z[2].map((o,i)=>`<button type="button" class="chip2" style="font-size:14px;padding:10px 14px;min-height:44px" onclick="q94Ans('${k}',${i})">${o[0]} ${esc(o[1])}</button>`).join('')}</div><button type="button" class="btn ghost" style="margin-top:10px" onclick="q94Snooze('${k}')">Не сейчас</button>`;
  if(!c){c=document.createElement('div');c.className='card';c.id='q94Later';const r=$q('#ringCard');if(r&&r.parentNode===t)r.after(c);else t.prepend(c)}
  if(c.dataset.k!==k){c.dataset.k=k;c.innerHTML=html}}catch(e){}}
 try{const _r=render;render=function(){const x=_r.apply(this,arguments);card();return x}}catch(e){}
})();
