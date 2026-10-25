/* ===== v89: безопасность расчётов и советов (Нутрициолог) ===== */
(function(){
const fl=u=>(u&&u.quiz)||{};
const isPreg=u=>{try{return HL(u).st==='preg'}catch(e){return false}};
const isFeed=u=>{try{return HL(u).st==='feed'}catch(e){return false}};
const isDia=u=>fl(u).health==='dia';
const isEd=u=>fl(u).health==='ed';
const isTeen=u=>!!(u&&u.p&&u.p.age<18);
const edLose=u=>{try{return isEd(u)&&!isGain()}catch(e){return false}};

/* 1. Адаптивная модель: не учится при беременности/кормлении, дни ≥60% нормы, не ниже 85% формулы */
learn=function(){try{
 const u=U();if(!u||!u.p||lifeNoDef(u))return;
 const now=dn(today()),ws=u.weights.filter(x=>now-dn(x.d)<=21);
 if(ws.length<3||dn(ws[ws.length-1].d)-dn(ws[0].d)<7)return;
 const pl=plan(),f=pl.formula,minK=Math.max(800,.6*pl.b);
 const ds=Object.entries(u.days).filter(([d,v])=>now-dn(d)<=21&&now-dn(d)>=1&&eaten(v)>=minK);
 if(ds.length<5)return;
 const avg=ds.reduce((a,[,v])=>a+eaten(v),0)/ds.length;
 const xs=ws.map(x=>dn(x.d)),ys=ws.map(x=>x.w),mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length;
 let n=0,d=0;xs.forEach((x,i)=>{n+=(x-mx)*(ys[i]-my);d+=(x-mx)**2});if(!d)return;
 const obs=avg-(n/d)*7700;
 if(obs<1200||obs>4500||Math.abs(obs-f)/f>.35)return;
 const t=u.adapt?u.adapt.t+.3*(obs-u.adapt.t):obs;
 u.adapt={t:Math.max(Math.round(.85*f),Math.round(t)),n:(u.adapt?u.adapt.n:0)+1};
}catch(e){}};

/* план: сброс адаптации при беременности/кормлении, нижняя граница 85%, подростковый порог */
const _pl89=plan;plan=function(){const u=U();
 try{if(u&&u.adapt&&lifeNoDef(u))u.adapt=null}catch(e){}
 let r=_pl89.apply(this,arguments);
 try{if(u.adapt&&r.formula&&u.adapt.t<.85*r.formula){u.adapt.t=Math.round(.85*r.formula);r=_pl89.apply(this,arguments)}}catch(e){}
 try{if(isTeen(u)&&!r.gain){/* растущему организму: не ниже 1600/1800, но и не выше поддержания */
  const fl=Math.min(u.p.sex==='m'?1800:1600,Math.round(r.tdee/10)*10),base=r.b-(r.ex||0);
  if(base<fl){r.b=fl+(r.ex||0);r.capped=true;r.teenFloor=fl;r.rate=Math.max(0,r.tdee-r.b)/1100}}}catch(e){}
 return r};
/* текст про нижний порог для подростков */
const _r89=render;render=function(){_r89.apply(this,arguments);try{const p=plan(),e=$('#planNote');
 if(e&&p.teenFloor)e.textContent=`Тело в этом возрасте ещё растёт, поэтому норма не опускается ниже ${p.teenFloor} ккал. Темп будет мягче выбранного (≈${p.rate.toFixed(2).replace('.',',')} кг в неделю).`;
 pnFix(document)}catch(e){}};

/* смена этапа жизни: старая адаптация больше не подходит */
const _hs89=hlSet;hlSet=function(k,v){try{const u=U();if(k==='st'&&HL(u).st!==v)u.adapt=null}catch(e){}return _hs89.apply(this,arguments)};

/* 2. Анкета: «Беременность или кормление» в вопросе о здоровье */
const _qs89=qSummary;qSummary=function(){_qs89.apply(this,arguments);try{const b=$('#qBody');
 if(qa.health==='preg')b.querySelectorAll('p').forEach(e=>{if(e.textContent.includes('план снижения веса'))e.textContent=qa.life==='feed'?'Кормление грудью: худеть сейчас не нужно. Дефицит калорий отключим и добавим энергию для молока. Питание и вес обсуждай с врачом.':'Беременность или кормление: худеть сейчас не нужно. Дефицит калорий отключим, добавку энергии посчитаем по сроку. Прибавку веса и питание обсуждай с врачом.'});
 const rs=[];if(qa.health==='preg')rs.push('при беременности и кормлении');if(qa.health==='dia')rs.push('при диабете на лекарствах');
 if(rs.length&&(qa.diet==='lc'||qa.diet==='if')){const btn=b.querySelector('button.btn');if(btn)btn.insertAdjacentHTML('beforebegin',`<p class="m" style="color:var(--warn);margin-top:8px">${qa.diet==='lc'?'Кето':'Интервальное голодание'} ${rs.join(' и ')} подходит не всем. Обсуди его с врачом, а в приложении можно снять в разделе «Диеты».</p>`)}}catch(e){}};
const _qf89=qFinish;qFinish=function(){_qf89.apply(this,arguments);try{if(qa.health!=='preg'||qa.sex==='m')return;
 const u=U(),h=HL(u);if(!h.st||h.st==='none'||h.st==='cyc')h.st='preg';
 u.adapt=null;const pc=$('#oPace');if(pc&&[...pc.options].some(o=>o.value==='0'))pc.value='0';
 const n=$('#oCare');if(n)n.textContent=h.st==='feed'?'Во время кормления похудение отключено: к норме добавлено около 330 ккал. Вес и питание обсуди с врачом.':'Во время беременности похудение отключено. Укажи дату родов в разделе «Моё здоровье», и норма учтёт срок. Если ты кормишь грудью, выбери там «Кормлю».';
 save()}catch(e){}};

/* 3. Кето и голодание: предупреждение с подтверждением */
function riskWhy(u,kind){const r=[];
 if(isPreg(u))r.push('Беременность: малышу нужны углеводы и регулярное питание, кето и голодание не рекомендуют.');
 if(isFeed(u))r.push('Кормление грудью: строгие ограничения могут уменьшить молоко и вызвать кетоацидоз у мамы.');
 if(isDia(u))r.push('Диабет: на инсулине или таблетках, снижающих сахар, возможна гипогликемия. При препаратах-глифлозинах (дапаглифлозин, эмпаглифлозин) кето опасно кетоацидозом. Дозы меняет только врач.');
 if(isTeen(u))r.push('Организм ещё растёт: такой режим лучше обсудить с врачом.');
 if(isEd(u))r.push('Если было расстройство питания: строгие правила и долгие перерывы в еде могут вернуть срывы. Прислушивайся к себе.');
 return r}
function riskOk(u,name,extra){const r=riskWhy(u).concat(extra||[]);if(!r.length)return true;
 return confirm(name+': прочитай перед включением.\n\n• '+r.join('\n• ')+'\n\nВключить всё равно?')}
const _ad89=applyDiet;applyDiet=function(k){try{if((k==='lc'||k==='if')&&!riskOk(U(),k==='lc'?'Кето':'Интервальное голодание'))return}catch(e){}return _ad89.apply(this,arguments)};
const _tf89=toggleFast;toggleFast=function(){try{const u=U();if(!u.fast){const h=+$('#fHrs').value,ex=h>=24?['Голодание 24 часа и дольше: пей воду, при слабости, головокружении, сердцебиении или обмороке сразу прекрати и поешь. Не подходит при диабете на лекарствах, болезнях сердца и почек, низком весе.']:[];
 if(!riskOk(u,'Голодание '+h+' ч',ex))return}}catch(e){}return _tf89.apply(this,arguments)};
/* выбор лимита 20/30 г углеводов в селекте */
document.addEventListener('change',e=>{try{const t=e.target;if(!t||t.id!=='mNet')return;const v=+t.value,prev=MG().net;
 if(v>0&&v<=30&&!(prev>0&&prev<=30)&&!riskOk(U(),'Кето (до '+v+' г углеводов)')){e.stopImmediatePropagation();t.value=String(prev||0)}}catch(x){}},true);

/* 5. Глюкоза и кетоны */
const R1515='Правило 15/15: сразу 15 г быстрых углеводов (½ стакана сока или сладкой газировки, 3–4 кусочка сахара, 1 ст. л. мёда или 3–4 таблетки глюкозы), через 15 минут перемерь. Если всё ещё ниже 3,9, повтори. Когда сахар выше 3,9, поешь обычную еду. Шоколад и орехи не подходят: жир замедляет подъём.';
function sugNote(v,ctx,u){const preg=isPreg(u);
 if(v<3)return['hi','Опасно низкий сахар. Сразу 15–20 г быстрых углеводов и перемерь через 15 минут, не садись за руль, не оставайся одна или один. Если трудно глотать, спутанность, судороги или потеря сознания, звони 103 или 112 и ничего не вливай в рот.'];
 if(v<3.9)return['low','Низкий сахар. '+R1515+' Если повторяется, скажи врачу.'];
 if(v>=13.9)return['hi','Очень высокий сахар. При жажде, тошноте, рвоте, запахе ацетона, сонливости звони 103 или 112. При диабете 1 типа проверь кетоны и свяжись с врачом сегодня.'];
 if(ctx==='f'){if(preg){if(v<5.1)return['ok','В пределах ориентира натощак при беременности (ниже 5,1).'];if(v<7)return['mid','При беременности натощак ориентир ниже 5,1. Покажи врачу: так может проявляться гестационный диабет.'];return['hi','Высоко натощак. Обратись к врачу в ближайшие дни.']}
  if(v<=5.5)return['ok','В пределах обычных ориентиров натощак.'];if(v<7)return['mid','Выше ориентира натощак. Покажи врачу, особенно если повторяется.'];return['hi','Высоко натощак. Обратись к врачу в ближайшие дни.']}
 if(ctx==='a'||ctx===''||ctx==null){if(v<7.8)return['ok','В пределах обычных ориентиров после еды.'];if(v<11.1)return['mid','Выше ориентира после еды'+(preg?' (при беременности это особенно важно)':'')+'. Покажи врачу.'];return['hi','Высоко. Обратись к врачу сегодня; при жажде, тошноте, слабости звони 103 или 112.']}
 return['ok','']}
const _mn89=measNote;measNote=function(k,v,v2,ctx){if(k==='sug'){try{return sugNote(v,ctx,U())}catch(e){}}return _mn89.apply(this,arguments)};
function ketNote(v,u){const dia=isDia(u);
 if(v<.6)return['ok','Обычный уровень кетонов.'];
 if(v<1.5)return['ok',dia?'Кетоны немного повышены. При диабете проверь сахар и перемерь через 2–3 часа; если растут, позвони врачу.':'Лёгкий кетоз: на кето это ожидаемо.'];
 if(v<3)return['mid',dia?'Риск кетоацидоза. Проверь сахар, пей воду и позвони врачу сейчас. При тошноте, рвоте, боли в животе звони 103 или 112.':'Высокий кетоз. Пей воду, не урезай еду дальше. При тошноте, рвоте, боли в животе, сильной слабости обратись к врачу.'];
 return['hi','Опасно высокие кетоны, особенно при диабете, беременности или кормлении: риск кетоацидоза. При тошноте, рвоте, боли в животе, частом дыхании, запахе ацетона или сонливости сразу звони 103 или 112. Без симптомов всё равно свяжись с врачом сегодня.']}
const _ab89=addBio;addBio=function(){const u=U(),n0=(u.bio||[]).length;const r=_ab89.apply(this,arguments);try{const b=u.bio||[];if(b.length>n0){const x=b[b.length-1],n=x.t==='ket'?ketNote(x.v,u):sugNote(x.v,'',u);
 if(n[0]==='hi'||n[0]==='low')openPop(x.t==='ket'?'Кетоны '+x.v+' ммоль/л':'Сахар '+x.v+' ммоль/л',`<p class="m" style="color:var(--warn)">${esc(n[1])}</p><p class="m" style="opacity:.8">Это ориентир, а не диагноз.</p>`);
 else if(n[1])toast(n[1])}}catch(e){}return r};

/* 6. Беременность: ртуть и листерия */
const PREG_ADD='Рыбу с высоким содержанием ртути (акула, рыба-меч, королевская макрель, марлин, стейки крупного тунца) исключить, консервированный тунец не чаще 1–2 раз в неделю. Из-за листерии исключить или прогревать до горячего: рыбу холодного копчения, колбасные нарезки, паштеты, сосиски без варки, готовые салаты из кулинарии, проростки. Овощи и зелень тщательно мыть.';
function pnFix(root){try{(root||document).querySelectorAll('p').forEach(e=>{if(!e.dataset.pn89&&e.textContent.startsWith('Исключить: алкоголь')){e.dataset.pn89=1;e.insertAdjacentText('beforeend',' '+PREG_ADD)}})}catch(e){}}
const _oh89=openHealth;openHealth=function(){const r=_oh89.apply(this,arguments);pnFix($('#hlBody'));return r};

/* исправления базы продуктов */
try{const fix=(arr,name,vals)=>arr.forEach(x=>{if(x[0]===name)vals.forEach((v,i)=>{if(v!=null)x[i+1]=v})});
 fix(FDB,'Свинина постная варёная',[185,0,0,28,8]);
 fix(FOODS,'Банан',[89]);fix(FOODS,'Тунец консервированный',[116]);fix(FOODS,'Говядина варёная',[254]);
}catch(e){}

/* 4. РПП в прошлом: без наград за потерю веса и голодание */
const _rb89=renderBadges;renderBadges=function(){_rb89.apply(this,arguments);try{if(edLose(U()))document.querySelectorAll('#badges .bd').forEach(e=>{if(/Минус|Голодание/.test(e.textContent))e.remove()})}catch(e){}};
try{ACH.forEach(a=>{if(['Четверть пути','Половина пути','Цель достигнута'].includes(a[1])){const o=a[2];a[2]=u=>!edLose(u)&&o(u)}})}catch(e){}

/* 7. После 65 лет: цель не ниже ИМТ 22 */
const _sp89=saveProfile;saveProfile=function(){try{const age=+$('#oAge').value,h=+$('#oH').value,w=+$('#oW').value,t=+$('#oT').value,g=$('#oGoalSel')&&$('#oGoalSel').value;
 if(age>=65&&h>0&&t>0&&t<w&&g!=='gain'){const m=Math.ceil(22*(h/100)**2);if(t<m)return $('#oErr').textContent=`После 65 лет худеть ниже ИМТ 22 небезопасно: уходят мышцы и прочность костей. Минимальная цель для вашего роста — около ${m} кг.`}}catch(e){}
 return _sp89.apply(this,arguments)};
})();
