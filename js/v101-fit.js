/* ===== v101: активность — шаги, быстрая запись, домашние тренировки, честный бонус к норме ===== */
/* Подключается последним. index.html не меняет: переопределяет plan, renderFit, renderTiles, startWO, woDraw, woNext, closeSheet, render.
   Модель калорий активности (см. fitCalc):
   • Ккал занятия (показываем) = MET × вес(кг) × часы.
   • «Чистые» ккал занятия (идут в расчёт) = (MET − 1) × вес × часы: 1 MET — это покой, он уже есть в базовом обмене.
     Для записей без MET (ручные, старые) = max(0, ккал − вес × часы).
   • Шаги: чистые ккал = max(0, шаги − 4000) × вес × 0,00042 × (рост/170); 4000 шагов бытового движения уже входят в «сидячий» коэффициент 1,2.
     Показываемые ккал шагов = шаги × вес × 0,00058 × (рост/170).
   • В норму уже заложено движение: E_base = (коэффициент активности − 1,2) × BMR (Миффлин).
   • Бонус дня = округл10( 0,5 × max(0, чистые ккал занятий + чистые ккал шагов − E_base) ), не больше 600; выключатель U().fit.on. */
(function(){
'use strict';
if(typeof plan!=='function'||typeof U!=='function'||typeof renderFit!=='function')return;

const SHARE=.5,CAP=600,BASE_STEPS=4000,STEP_G=.00058,STEP_N=.00042;
const ok=()=>{try{return !!(me&&U()&&U().p)}catch(e){return false}};
const isEdU=()=>{try{return ((U().quiz||{}).health)==='ed'}catch(e){return false}};
const share=()=>{try{return U().adapt?.3:SHARE}catch(e){return SHARE}};
const shareTxt=()=>share()===SHARE?'половина':'30%';
const FX=()=>{const u=U(),f=u.fit||(u.fit={});if(f.on==null)f.on=!isEdU();if(!(f.goal>0))f.goal=8000;return f};
const kg=()=>{try{return +lastW()||70}catch(e){return 70}};
const ru=n=>Math.round(n).toLocaleString('ru-RU');
const r10=n=>Math.round(n/10)*10;
const isPreg=()=>{try{return typeof HL==='function'&&HL(U()).st==='preg'}catch(e){return false}};
const pWeek=()=>{try{return typeof pregWeek==='function'?pregWeek(U()):0}catch(e){return 0}};
const strideK=()=>{try{const h=+U().p.h||170;return Math.max(.85,Math.min(1.15,h/170))}catch(e){return 1}};
const stepKcal=s=>Math.round((s||0)*kg()*STEP_G*strideK());

/* ---------- типы быстрой записи: [id, название, иконка, MET [легко, умеренно, интенсивно], подсказки] ---------- */
const ACT=[
 ['walk','Ходьба','🚶',[2.8,3.5,4.3],['прогулка','обычный шаг','быстрый шаг']],
 ['run','Бег','🏃',[7,9,11],['трусцой','≈ 9 км/ч','быстро']],
 ['bike','Велосипед','🚴',[4,6.8,9],['спокойно','умеренно','быстро, в горку']],
 ['swim','Плавание','🏊',[5,7,9.8],['спокойно','умеренно','активно']],
 ['str','Силовая','🏋️',[3.5,5,6],['лёгкие веса','обычная','тяжело, мало отдыха']],
 ['yoga','Йога','🧘',[2.5,3,4],['растяжка','хатха','динамичная']],
 ['dance','Танцы','💃',[4.5,5.5,7.3],['спокойно','активно','очень активно']],
 ['home','Домашние дела','🧹',[2.3,3.3,4],['лёгкая уборка','уборка, готовка','мытьё полов, сад']]];
const INT=['Легко','Умеренно','Интенсивно'];
let SEL='walk',LVL=1,WMODE='min',HLVL=null;

/* ---------- модель ---------- */
function bmr(){const u=U(),p=u.p,w=kg();return 10*w+6.25*p.h-5*p.age+(p.sex==='m'?5:-161)}
function netOf(e){if(!e)return 0;const m=+e.m||0;if(e.kn!=null)return Math.max(0,+e.kn||0);if(e.met)return Math.max(0,(e.met-1)*kg()*m/60);return Math.max(0,(+e.k||0)-kg()*m/60)}
function fitCalc(d){const f=FX(),p=U().p;d=d||day();const ex=d.ex||[],steps=+d.steps||0;
 const mins=ex.reduce((a,x)=>a+(+x.m||0),0),kEx=ex.reduce((a,x)=>a+(+x.k||0),0),nEx=ex.reduce((a,x)=>a+netOf(x),0);
 const nSt=Math.max(0,steps-BASE_STEPS)*kg()*STEP_N*strideK();
 const base=Math.max(0,((+p.act||1.2)-1.2)*bmr()),A=nEx+nSt,over=Math.max(0,A-base);
 const add=f.on?Math.min(CAP,r10(over*share())):0;
 return{mins,steps,kEx:Math.round(kEx),kSt:stepKcal(steps),net:Math.round(A),base:Math.round(base),over:Math.round(over),add,on:f.on,goal:f.goal,n:ex.length}}
const actName=()=>{try{const a=+U().p.act;return a>=1.7?'«Высокая»':a>=1.5?'«Средняя»':a>=1.3?'«Лёгкая»':'«Сидячая»'}catch(e){return ''}};

const _plan101=plan;plan=function(){const r=_plan101.apply(this,arguments);try{if(r&&U()&&U().p){const c=fitCalc();r.fit=c.add;if(c.add>0)r.b+=c.add}}catch(e){}return r};

/* ---------- CSS ---------- */
document.head.insertAdjacentHTML('beforeend',`<style id="fx101css">
.fx-top{display:flex;gap:14px;align-items:center}
.fx-ring{position:relative;width:96px;height:96px;flex:0 0 96px}
.fx-ring svg{width:96px;height:96px;transform:rotate(-90deg)}
.fx-ring circle{fill:none;stroke-width:9}
.fx-ring .bg{stroke:var(--trk,rgba(127,127,127,.22))}
.fx-ring .fg{stroke:var(--lime);stroke-linecap:round;transition:stroke-dashoffset .6s}
.fx-ring .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.1}
.fx-ring .c b{font-size:17px}.fx-ring .c small{font-size:10px;color:var(--mut)}
.fx-sum{flex:1;min-width:0;font-size:13px;line-height:1.45}
.fx-sum b{font-size:15px}
.fx-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.fx-btns button,.fx-mini{background:rgba(127,127,127,.12);border:1px solid var(--line);color:var(--txt);border-radius:14px;padding:8px 11px;font:inherit;font-size:12px;cursor:pointer;min-height:36px}
.fx-btns button:active,.fx-mini:active{transform:scale(.97)}
.fx-bn{margin-top:12px;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:rgba(var(--acc,198,227,160),.10);font-size:12.5px;line-height:1.45}
.fx-bn b{color:var(--lime)}
.fx-sw{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:13px;cursor:pointer}
.fx-sw input{width:20px;height:20px;flex:0 0 20px;accent-color:var(--lime);margin:0}
.fx-acts{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 10px}
.fx-acts button{background:rgba(127,127,127,.10);border:1px solid var(--line);border-radius:14px;color:var(--txt);padding:8px 2px;font:inherit;font-size:11px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:56px;min-width:0;overflow:hidden;text-overflow:ellipsis}
.fx-acts button i{font-style:normal;font-size:20px}
.fx-acts button.on{background:var(--lime);color:var(--on,#222);font-weight:700;border-color:var(--lime)}
.fx-seg{display:flex;gap:6px;margin:6px 0 10px;flex-wrap:wrap}
.fx-seg .chip2{margin:0}
.fx-prev{font-size:13px;margin:8px 0 10px;color:var(--mut)}
.fx-prev b{color:var(--txt);font-size:15px}
.fx-hp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fx-hp button{background:rgba(127,127,127,.10);border:1px solid var(--line);border-radius:16px;color:var(--txt);padding:12px 4px;font:inherit;cursor:pointer;text-align:center;min-width:0}
.fx-hp button b{display:block;font-size:20px}.fx-hp button small{font-size:11px;color:var(--mut)}
.fx-note{font-size:12px;line-height:1.45;padding:10px 12px;border-radius:14px;border:1px dashed var(--line);margin:10px 0 0;color:var(--mut)}
.fx-note b{color:var(--txt)}
.fx-tag{display:inline-block;font-size:10.5px;padding:2px 7px;border-radius:10px;border:1px solid var(--line);color:var(--mut);margin-top:3px}
.fx-del{background:none;border:0;color:var(--mut);font-size:14px;cursor:pointer;padding:4px 6px;min-width:32px;min-height:32px}
.fx-wk{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:96px;margin:12px 0 4px}
.fx-wk div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:10px;color:var(--mut);gap:3px;min-width:0}
.fx-wk u{display:block;width:70%;max-width:26px;border-radius:7px 7px 3px 3px;background:var(--lime);min-height:3px;transition:height .6s}
.fx-wk u.z{background:rgba(127,127,127,.25)}
.fx-wk div.t{color:var(--txt);font-weight:700}
.fx-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.fx-st div{background:rgba(127,127,127,.10);border:1px solid var(--line);border-radius:14px;padding:9px 6px;text-align:center;font-size:11px;color:var(--mut);min-width:0}
.fx-st b{display:block;font-size:16px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* таймер */
.fx-tm{text-align:center}
.fx-tm .k{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.fx-tm .k.w{color:var(--lime);font-weight:800}
.fx-tm .nm{font-size:19px;font-weight:800;margin:4px 0 2px;line-height:1.25}
.fx-tm .tip{font-size:12.5px;color:var(--mut);min-height:18px;line-height:1.4;padding:0 4px}
.fx-tr{position:relative;width:170px;height:170px;margin:12px auto}
.fx-tr svg{width:170px;height:170px;transform:rotate(-90deg)}
.fx-tr circle{fill:none;stroke-width:10}
.fx-tr .bg{stroke:rgba(127,127,127,.2)}
.fx-tr .fg{stroke:var(--lime);stroke-linecap:round;transition:stroke-dashoffset .95s linear}
.fx-tr.rest .fg{stroke:var(--mut)}
.fx-tr .c{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;font-variant-numeric:tabular-nums}
.fx-tr.pz .c{opacity:.45}
.fx-nx{font-size:12.5px;color:var(--mut)}
.fx-pb{height:6px;border-radius:4px;background:rgba(127,127,127,.2);overflow:hidden;margin:10px 0 4px}
.fx-pb u{display:block;height:100%;background:var(--lime);transition:width .6s}
.fx-ctl{display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:8px;margin-top:12px}
.fx-ctl .btn{margin:0;padding-left:4px;padding-right:4px;min-width:0}
</style>`);

/* ---------- запись ---------- */
function logAct(){try{const a=ACT.find(x=>x[0]===SEL)||ACT[0],d=day();
 if(SEL==='walk'&&WMODE==='steps'){const v=Math.round(+($('#fxQS')||{}).value||0);if(!(v>0&&v<=100000))return toast('Укажите количество шагов');
  d.steps=Math.min(150000,(+d.steps||0)+v);save();render();toast(`+${ru(v)} шагов ≈ ${stepKcal(v)} ккал`);return}
 const m=Math.round(+($('#fxQM')||{}).value||0);if(!(m>0&&m<=600))return toast('Укажите минуты: от 1 до 600');
 const met=a[3][LVL],k=Math.round(met*kg()*m/60),kn=Math.round((met-1)*kg()*m/60);
 const before=plan().b;(d.ex||(d.ex=[])).push({n:`${a[1]}, ${INT[LVL].toLowerCase()}`,m,k,t:a[0],met,kn,src:'q'});
 save();try{snd('ok');hap()}catch(e){}render();const add=plan().b-before;
 toast(add>0?`Записано: ${m} мин, ≈${k} ккал · к норме +${add} ккал`:`Записано: ${m} мин, ≈${k} ккал`);if($('#fxQM'))$('#fxQM').value=''}catch(e){console.error(e)}}
function addSteps(n){try{const d=day();d.steps=Math.max(0,Math.min(150000,(+d.steps||0)+n));save();render()}catch(e){}}
function setSteps(){try{const cur=+day().steps||0;openPop('Шаги за сегодня',`<p class="m">Впишите, сколько шагов показывает телефон или браслет за сегодня. Если шаги считаются, ходьбу минутами отдельно не записывайте, чтобы не учесть её дважды.</p><input id="fxSS" type="number" inputmode="numeric" min="0" max="150000" value="${cur||''}" placeholder="например, 6500"><button class="btn" onclick="FX101.saveSteps()">Сохранить</button>`);setTimeout(()=>{try{$('#fxSS').focus()}catch(e){}},80)}catch(e){}}
function saveSteps(){const v=Math.round(+($('#fxSS')||{}).value);if(!(v>=0&&v<=150000))return toast('Введите число от 0 до 150 000');day().steps=v;save();closeSheet();render();toast('Шаги сохранены')}
function setGoal(){const g=FX().goal;openPop('Цель шагов',`<p class="m">Выберите цель, которая вам по силам. Любые шаги сверх обычного уже польза: начинать можно с малого и прибавлять по 500–1000 в неделю.</p><div class="fx-btns">${[4000,6000,7000,8000,10000,12000].map(x=>`<button class="${x===g?'on':''}" style="${x===g?'background:var(--lime);color:var(--on,#222);font-weight:700':''}" onclick="FX101.goal(${x})">${ru(x)}</button>`).join('')}</div><label style="margin-top:10px;display:block">Своя цель</label><div class="row"><div><input id="fxGI" type="number" inputmode="numeric" placeholder="${g}"></div><button class="btn sm" onclick="FX101.goal(+$('#fxGI').value)">OK</button></div>`)}
function goal(n){n=Math.round(+n);if(!(n>=1000&&n<=40000))return toast('Цель от 1 000 до 40 000 шагов');FX().goal=n;save();closeSheet();render();toast('Цель: '+ru(n)+' шагов')}
function toggle(v){FX().on=!!v;save();render();toast(v?'Активность добавляется к норме дня':'Норма больше не меняется от активности')}
function delEx(i){try{const d=day();if(!d.ex||!d.ex[i])return;d.ex.splice(i,1);save();render();toast('Запись удалена')}catch(e){}}
function explain(){const c=fitCalc();openPop('Как активность влияет на норму',`<p class="m">Ваша норма считается по формуле Миффлина — Сан Жеора с коэффициентом активности ${actName()}. В ней уже заложено около <b>${ru(c.base)} ккал</b> движения в день, поэтому обычную активность мы не прибавляем: иначе её пришлось бы «съесть» дважды.</p>
<p class="m">Когда вы двигаетесь больше, считаем только «чистые» калории: сверх тех, что тело тратит в покое. Из того, что выше заложенного, к норме добавляется <b>${shareTxt()}</b>${share()===SHARE?'':' (норма уже подстроена под ваш реальный расход, поэтому доля меньше)'} (не больше ${CAP} ккал). Формулы и браслеты часто завышают траты, а так вес меняется предсказуемо.</p>
<div class="fx-note">Сегодня: занятия и шаги ≈ <b>${ru(c.net)} ккал</b> чистых трат, заложено ${ru(c.base)}, сверх — ${ru(c.over)}.<br>${c.on?`К норме: <b>+${c.add} ккал</b>.`:'Бонус к норме выключен.'}</div>
<p class="m" style="margin-top:10px;font-size:12px">Ккал занятия = MET × вес × время. Шаги: ≈ ${Math.round(kg()*STEP_G*strideK()*1000)} ккал на 1000 шагов при вашем весе, первые ${ru(BASE_STEPS)} шагов входят в базовую норму.</p>`)}

/* ---------- домашние тренировки ---------- */
const POOL={
 std:[['Прыжки «звёздочка»','Можно без прыжка: шаг в сторону и руки вверх'],['Приседания','Колени смотрят туда же, куда носки, спина ровная'],['Отжимания','С колен тоже отлично. Корпус одной линией'],['Выпады назад','Шаг назад, оба колена под 90°. Чередуйте ноги'],['Планка на локтях','Живот подтянут, не задерживайте дыхание'],['Ягодичный мостик','Лёжа на спине, поднимайте таз, сжимая ягодицы'],['Скалолаз','Колени к груди по очереди, в своём темпе'],['Супермен','Лёжа на животе, поднимите руки и ноги на пару секунд'],['Бег на месте','Мягко, на носках, руки работают'],['Боковая планка','По 20 секунд на каждую сторону, можно с колена']],
 beg:[['Марш на месте','Поднимайте колени, руки работают'],['Вставания со стула','Сядьте и встаньте без помощи рук, если получается'],['Отжимания от стены','Руки на уровне плеч, тело прямое'],['Подъёмы на носки','Держитесь за спинку стула для равновесия'],['Ягодичный мостик','Лёжа на спине, плавно поднимайте и опускайте таз'],['Птица-собака','На четвереньках тянитесь рукой и противоположной ногой'],['Подъёмы колен стоя','Можно держаться за опору'],['Шаги в стороны','Широкий шаг в сторону и обратно, руки в стороны']],
 preg:[['Марш на месте','Спокойный темп, дыхание ровное, можно разговаривать'],['Приседания у стула','Неглубоко, до касания стула, ноги чуть шире плеч'],['Отжимания от стены','Руки на уровне груди, спина прямая'],['Шаги в стороны','Без прыжков, держите равновесие'],['Кошка-корова','На четвереньках: мягко округляйте и прогибайте спину'],['Птица-собака','На четвереньках, по очереди. Если тяжело, только руки'],['Подъёмы на носки','Держитесь за опору'],['Отведение ноги лёжа на боку','Лёжа на боку, подушка под голову. Сменяйте стороны'],['Круги плечами','Расслабьте шею, вдох — вверх, выдох — назад и вниз'],['Дыхание','Вдох носом на 4 счёта, выдох на 6. Расслабьте живот']]};
const LV={std:{n:'Обычный',w:40,r:15,met:5,wu:45,cd:45},beg:{n:'Для начинающих',w:30,r:30,met:3.5,wu:60,cd:60},preg:{n:'При беременности',w:40,r:20,met:3,wu:90,cd:90}};
const PREG_NOTE='Без прыжков и без упражнений лёжа на спине и на животе (лёжа на спине после 1-го триместра не занимаются). Остановитесь и обратитесь к врачу, если появились боль, кровянистые выделения, головокружение, сильная одышка, схватки или подтекание воды.';
function build(min,lv){const L=LV[lv],P=POOL[lv],wu=min<=7?Math.min(30,L.wu):L.wu,cd=min<=7?Math.min(30,L.cd):L.cd;
 const n=Math.max(4,Math.floor((min*60-wu-cd+L.r)/(L.w+L.r))),ex=[];for(let i=0;i<n;i++)ex.push(P[i%P.length]);
 const steps=[['Разминка',lv==='std'?'Ходьба на месте и вращения руками':'Марш на месте, плавные круги плечами',wu,'Разогрейтесь в спокойном темпе']];
 ex.forEach((e,i)=>{steps.push(['Работа',e[0],L.w,e[1]]);if(i<ex.length-1)steps.push(['Отдых','Дальше: '+ex[i+1][0],L.r,'Отдышитесь, попейте воды при желании'])});
 steps.push(['Заминка','Растяжка и спокойное дыхание',cd,'Потянитесь, без резких движений']);
 return{n:`Дома без инвентаря · ${min} мин`+(lv==='std'?'':lv==='beg'?' · для начинающих':' · при беременности'),min,lv,met:L.met,steps,ex:ex.map(x=>x[0])}}
function homeLvl(){return HLVL||(isPreg()?'preg':'std')}
function preview(min){const lv=homeLvl(),p=build(min,lv),tot=p.steps.reduce((a,s)=>a+s[2],0),k=Math.round(p.met*kg()*tot/3600),L=LV[lv];
 openPop(p.n,`<p class="m">≈ ${Math.round(tot/60)} мин · ${L.w} с работа / ${L.r} с отдых · ≈${k} ккал (ориентир)</p>${lv==='preg'||isPreg()?`<div class="fx-note" style="margin:0 0 10px"><b>По согласованию с врачом.</b> ${PREG_NOTE}</div>`:''}`+
 p.ex.map((e,j)=>`<div class="item"><span>${j+1}. ${esc(e)}</span><small style="color:var(--mut)">${L.w} с</small></div>`).join('')+
 `<p class="m" style="font-size:12px;margin-top:8px">Двигайтесь в комфортном темпе: если упражнение неудобно, замените его маршем на месте. Таймер подскажет, что дальше.</p><button class="btn" onclick="FX101.go(${min})">Начать</button>`)}

/* ---------- улучшенный таймер (на тех же глобальных WS/wi/wl/woT/wpause) ---------- */
let RUN=null,WL=null;
const lock=async()=>{try{if(navigator.wakeLock&&!WL)WL=await navigator.wakeLock.request('screen')}catch(e){}};
const unlock=()=>{try{WL&&WL.release()}catch(e){}WL=null};
function runProg(p){try{WS=[['Приготовьтесь',p.steps[0][1],5,'Таймер стартует через 5 секунд']].concat(p.steps);wi=0;wl=WS[0][2];wpause=0;RUN={p,act:0,t:Date.now()};
 openPop(p.n,`<div class="fx-tm" aria-live="polite"><div class="k" id="woK"></div><div class="nm" id="woN"></div><div class="fx-tr" id="fxTR"><svg viewBox="0 0 170 170"><circle class="bg" cx="85" cy="85" r="75"/><circle class="fg" id="fxTF" cx="85" cy="85" r="75" stroke-dasharray="471.2" stroke-dashoffset="0"/></svg><div class="c" id="woC"></div></div><div class="tip" id="fxTip"></div><div class="fx-pb"><u id="fxPB" style="width:0"></u></div><div class="fx-nx"><span id="woS"></span> · осталось <span id="fxLeft"></span></div>
 <div class="fx-ctl"><button class="btn ghost" onclick="FX101.prev()" aria-label="Предыдущий шаг">⏮</button><button class="btn" id="fxPz" onclick="FX101.pause()">Пауза</button><button class="btn ghost" onclick="woNext()" aria-label="Следующий шаг">⏭</button></div>
 <button class="btn ghost" style="margin-top:8px" onclick="FX101.finish()">Завершить и записать</button></div>`);
 lock();woDraw();clearInterval(woT);woT=setInterval(()=>{if(wpause||!RUN)return;wl--;if(WS[wi]&&WS[wi][0]!=='Приготовьтесь')RUN.act++;if(wl>0&&wl<=3){try{snd('t')}catch(e){}}if(wl<=0)woNext();else woDraw()},1000)}catch(e){console.error(e)}}
woDraw=function(){try{const s=WS[wi];if(!s||!$('#woC'))return;const K=$('#woK');K.textContent=s[0];K.className='k'+(s[0]==='Работа'?' w':'');$('#woN').textContent=s[1];
 $('#woC').textContent=wl>=60?Math.floor(wl/60)+':'+String(wl%60).padStart(2,'0'):wl;$('#woS').textContent='Шаг '+(wi+1)+' из '+WS.length;
 const tf=$('#fxTF');if(tf)tf.style.strokeDashoffset=471.2*(1-wl/(s[2]||1));const tr=$('#fxTR');if(tr){tr.classList.toggle('rest',s[0]!=='Работа');tr.classList.toggle('pz',!!wpause)}
 const tip=$('#fxTip');if(tip)tip.textContent=s[3]||'';const left=wl+WS.slice(wi+1).reduce((a,x)=>a+x[2],0),tot=WS.reduce((a,x)=>a+x[2],0);
 const L=$('#fxLeft');if(L)L.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');const pb=$('#fxPB');if(pb)pb.style.width=Math.min(100,(1-left/tot)*100)+'%';
 const pz=$('#fxPz');if(pz)pz.textContent=wpause?'Продолжить':'Пауза'}catch(e){}};
function done(early){clearInterval(woT);unlock();const r=RUN;RUN=null;if(!r)return;const sec=r.act,m=Math.max(1,Math.round(sec/60));
 if(sec<60){$('#popB').innerHTML=`<div class="greet" style="font-size:20px">Ничего страшного<small>Тренировка короче минуты, поэтому мы её не записали. Вернуться можно в любой момент.</small></div><button class="btn" onclick="closeSheet()">Хорошо</button>`;return}
 const k=Math.round(r.p.met*kg()*sec/3600),kn=Math.round((r.p.met-1)*kg()*sec/3600),d=day(),before=plan().b;
 (d.ex||(d.ex=[])).push({n:r.p.n,m,k,t:'wo',met:r.p.met,kn,src:'wo'});let coins='';if(m>=5){try{CB().coins+=8;coins=' Чиби гордится вами: +8 🪙'}catch(e){}}
 save();try{snd('ok');hap()}catch(e){}render();const add=plan().b-before;
 $('#popB').innerHTML=`<div class="greet" style="font-size:22px">${early?'Хорошая работа':'Тренировка завершена'} 💪<small>Записано: ${m} мин, ≈${k} ккал.${add>0?` К норме дня: +${add} ккал.`:''}${coins}</small></div><button class="btn" onclick="closeSheet()">Отлично</button>`}
woNext=function(){try{if(!RUN){wi++;if(wi>=WS.length){clearInterval(woT);return}wl=WS[wi][2];woDraw();return}wi++;if(wi>=WS.length)return done(false);wl=WS[wi][2];if(WS[wi][0]==='Работа')hap();try{snd('ok')}catch(e){}woDraw()}catch(e){console.error(e)}};
function prev(){if(!RUN)return;if(WS[wi]&&wl<WS[wi][2]-2){wl=WS[wi][2]}else if(wi>0){wi--;wl=WS[wi][2]}woDraw()}
function pause(){wpause=!wpause;wpause?unlock():lock();woDraw()}
startWO=function(i){try{const w=WO[i];if(!w)return;const ex=w[4],steps=[];ex.forEach((e,j)=>{steps.push(['Работа',e[0],e[1],e[1]>=300?'Двигайтесь в комфортном темпе':''] );if(j<ex.length-1)steps.push(['Отдых','Дальше: '+ex[j+1][0],15,'Отдышитесь'])});
 runProg({n:w[0],min:w[2],met:Math.max(2,w[3]*60/(70*w[2])),steps})}catch(e){console.error(e)}};
const _cl101=closeSheet;closeSheet=function(){try{if(RUN){RUN=null;unlock()}}catch(e){}return _cl101.apply(this,arguments)};
document.addEventListener('visibilitychange',()=>{try{if(document.visibilityState==='visible'&&RUN&&!wpause)lock()}catch(e){}});

/* ---------- экран «Тренировки» ---------- */
const ring=(v,g)=>{const C=213.6,r=Math.min(1,g?v/g:0);return `<div class="fx-ring" role="img" aria-label="Шаги: ${ru(v)} из ${ru(g)}"><svg viewBox="0 0 96 96"><circle class="bg" cx="48" cy="48" r="34"/><circle class="fg" cx="48" cy="48" r="34" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-r)}"/></svg><div class="c"><b>${v>=10000?(Math.round(v/100)/10).toString().replace('.',',')+'к':ru(v)}</b><small>из ${ru(g)}</small></div></div>`};
function bonusLine(c){if(!c.on)return c.n||c.steps?`Бонус к норме выключен: норма не меняется от активности.`:'';
 if(c.add>0)return `Норма сегодня <b>+${c.add} ккал</b> за активность: это ${shareTxt()} от ${ru(c.over)} ккал сверх заложенного в ваш план.`;
 if(c.n||c.steps>BASE_STEPS)return `Ваша активность пока в пределах заложенной в норму (≈${ru(c.base)} ккал в день), поэтому норма та же. Всё, что сверх, добавим.`;return ''}
function cardDay(){const c=fitCalc(),f=FX(),left=Math.max(0,c.goal-c.steps);
 return `<h2>Активность сегодня</h2><div class="fx-top">${ring(c.steps,c.goal)}<div class="fx-sum"><b>${ru(c.steps)}</b> шагов${c.steps?` · ≈${c.kSt} ккал`:''}<br>${c.mins} мин занятий${c.kEx?` · ≈${ru(c.kEx)} ккал`:''}<br><span style="color:var(--mut)">${c.steps>=c.goal?'Цель шагов на сегодня выполнена 🎉':c.steps?`До цели ${ru(left)} шагов`:'Добавьте шаги, когда будет удобно'}</span></div></div>
 <div class="fx-btns"><button onclick="FX101.steps(500)">+500</button><button onclick="FX101.steps(1000)">+1000</button><button onclick="FX101.setSteps()">Ввести всего</button><button onclick="FX101.setGoal()">Цель: ${ru(c.goal)}</button></div>
 ${bonusLine(c)?`<div class="fx-bn">${bonusLine(c)} <a href="#" onclick="FX101.explain();return false" style="color:var(--lime)">Как считается</a></div>`:''}
 <label class="fx-sw"><input type="checkbox" ${f.on?'checked':''} onchange="FX101.toggle(this.checked)"><span>Добавлять часть сожжённого к норме дня</span></label>`}
function cardQuick(){const a=ACT.find(x=>x[0]===SEL)||ACT[0],steps=SEL==='walk'&&WMODE==='steps';
 return `<h2>Быстрая запись</h2><div class="fx-acts" role="radiogroup" aria-label="Вид активности">${ACT.map(x=>`<button role="radio" aria-checked="${x[0]===SEL}" class="${x[0]===SEL?'on':''}" onclick="FX101.sel('${x[0]}')"><i aria-hidden="true">${x[2]}</i>${x[1]}</button>`).join('')}</div>
 ${SEL==='walk'?`<div class="fx-seg"><span class="chip2 ${!steps?'on':''}" onclick="FX101.wm('min')">Минуты</span><span class="chip2 ${steps?'on':''}" onclick="FX101.wm('steps')">Шаги</span></div>`:''}
 ${steps?`<label>Сколько шагов добавить</label><input id="fxQS" type="number" inputmode="numeric" placeholder="например, 3000" oninput="FX101.pv()"><div class="fx-btns">${[1000,2000,3000,5000].map(n=>`<button onclick="$('#fxQS').value=${n};FX101.pv()">${ru(n)}</button>`).join('')}</div>`:
 `<div class="fx-seg">${INT.map((t,i)=>`<span class="chip2 ${i===LVL?'on':''}" onclick="FX101.lvl(${i})" title="${esc(a[4][i])}">${t}</span>`).join('')}</div><p class="m" style="font-size:12px;margin:-4px 0 8px">${esc(a[4][LVL])}</p><label>Сколько минут</label><input id="fxQM" type="number" inputmode="numeric" placeholder="например, 30" oninput="FX101.pv()"><div class="fx-btns">${[10,20,30,45,60].map(n=>`<button onclick="$('#fxQM').value=${n};FX101.pv()">${n} мин</button>`).join('')}</div>`}
 ${isPreg()&&(LVL===2||['run','swim','dance','str'].includes(SEL))&&!(SEL==='walk'&&WMODE==='steps')?'<div class="fx-note" style="margin:4px 0 0"><b>По согласованию с врачом.</b> Во время беременности интенсивные нагрузки, бег, силовые, плавание и танцы обсуждайте с вашим врачом.</div>':''}<div class="fx-prev" id="fxPv"></div><button class="btn" onclick="FX101.log()">Записать</button>`}
function pv(){try{const e=$('#fxPv');if(!e)return;const a=ACT.find(x=>x[0]===SEL)||ACT[0];
 if(SEL==='walk'&&WMODE==='steps'){const v=+($('#fxQS')||{}).value||0;e.innerHTML=v>0?`≈ <b>${stepKcal(v)} ккал</b> · примерно ${Math.round(v/100)} мин ходьбы`:`≈ ${Math.round(kg()*STEP_G*strideK()*1000)} ккал на каждую 1000 шагов при вашем весе`;return}
 const m=+($('#fxQM')||{}).value||0,met=a[3][LVL];e.innerHTML=m>0?`≈ <b>${Math.round(met*kg()*m/60)} ккал</b> · MET ${String(met).replace('.',',')} × ${String(n1(kg())).replace('.',',')} кг × ${m} мин`:`MET ${String(met).replace('.',',')}: ≈ ${Math.round(met*kg()/60*10)} ккал за 10 минут`}catch(e){}}
function cardHome(){const lv=homeLvl(),L=LV[lv];
 return `<h2>Домашние тренировки</h2><p class="m" style="margin-bottom:8px">Без инвентаря, с таймером и подсказками. Хватит места рядом с ковриком.</p><div class="fx-seg">${Object.keys(LV).map(k=>`<span class="chip2 ${k===lv?'on':''}" onclick="FX101.hl('${k}')">${LV[k].n}</span>`).join('')}</div>
 <div class="fx-hp">${[7,15,20].map(m=>`<button onclick="FX101.pre(${m})"><b>${m}</b><small>мин · ≈${Math.round(L.met*kg()*m/60)} ккал</small></button>`).join('')}</div>
 ${lv==='preg'||isPreg()?`<div class="fx-note"><b>По согласованию с врачом.</b> ${PREG_NOTE}${isPreg()&&pWeek()>13?`<br>Сейчас у вас ${pWeek()}-я неделя: упражнения лёжа на спине в эту программу не входят.`:''}</div>`:lv==='beg'?`<div class="fx-note">Мягкий старт: 30 секунд движения и 30 секунд отдыха, без прыжков. Отдыхайте дольше, если нужно, — это нормально.</div>`:''}`}
function cardToday(){const ex=day().ex||[],c=fitCalc();
 return (ex.length?ex.map((x,i)=>`<div class="item"><span>${esc(x.n)}<br><small style="color:var(--mut)">${x.m} мин · ≈${x.k} ккал</small></span><button class="fx-del" aria-label="Удалить запись" onclick="FX101.del(${i})">✕</button></div>`).join(''):'<p class="m">Сегодня записей пока нет. Подойдёт даже 10-минутная прогулка.</p>')+(c.steps?`<div class="item"><span>Шаги<br><small style="color:var(--mut)">${ru(c.steps)} · ≈${c.kSt} ккал</small></span><button class="fx-del" aria-label="Обнулить шаги" onclick="FX101.steps(-${c.steps})">✕</button></div>`:'')}
function ensure(){const t=document.getElementById('t-fit');if(!t)return null;if(!t.querySelector('#fxDay')){const back=t.querySelector(':scope>button');
 const h=`<div class="card" id="fxDay"></div><div class="card" id="fxQuick"></div><div class="card" id="fxHome"></div>`;if(back)back.insertAdjacentHTML('afterend',h);else t.insertAdjacentHTML('afterbegin',h);
 const tod=$('#fitToday');if(tod&&tod.closest('.card')){const cd=tod.closest('.card');t.insertBefore(cd,$('#fxQuick'))}}return t}
const _rf101=renderFit;renderFit=function(){const r=_rf101.apply(this,arguments);try{if(!ok())return r;const t=ensure();if(!t)return r;
 $('#fxDay').innerHTML=cardDay();const qv=($('#fxQM')||{}).value,sv=($('#fxQS')||{}).value,foc=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#fxQuick');
 if(!foc){$('#fxQuick').innerHTML=cardQuick();if(qv&&$('#fxQM'))$('#fxQM').value=qv;if(sv&&$('#fxQS'))$('#fxQS').value=sv;pv()}
 $('#fxHome').innerHTML=cardHome();$('#fitToday').innerHTML=cardToday();
 if(isPreg()){const bad=/Прыж|выпрыг|Бёрпи|Скалолаз|Скручив|Подъём ног|Велосипед|Планка|Тяга в наклоне|мостик|лёжа на спине|на животе/i;const L=WO.map((w,i)=>({w,i})).filter(x=>FF==='all'||x.w[1]===FF);
  [...document.querySelectorAll('#fitList .res')].forEach((el,j)=>{const w=L[j]&&L[j].w;if(w&&w[4].some(e=>bad.test(e[0]))&&!el.querySelector('.fx-tag'))el.querySelector('span').insertAdjacentHTML('beforeend','<br><span class="fx-tag">Не для беременности: выберите домашнюю программу выше</span>')})}
}catch(e){console.error(e)}return r};

/* ---------- плитка «Движение» ---------- */
const _rt101=renderTiles;renderTiles=function(){const r=_rt101.apply(this,arguments);try{if(!ok())return r;const c=fitCalc(),t=[...document.querySelectorAll('#tiles .tile')].find(b=>(b.querySelector('small')||{}).textContent==='Движение');if(!t)return r;
 const st=c.steps>=1000?(c.steps>=10000?Math.round(c.steps/1000):Math.round(c.steps/100)/10).toString().replace('.',',')+'к шагов':c.steps?c.steps+' шагов':'';
 t.querySelector('b').textContent=c.mins&&st?`${c.mins} мин · ${st}`:st||c.mins+' мин';const u=t.querySelector('u');if(u)u.style.width=Math.min(100,Math.max(c.mins/30,c.steps/c.goal)*100)+'%';
 t.setAttribute('aria-label',`Движение: ${c.mins} минут, ${c.steps} шагов из ${c.goal}${c.add?`, к норме плюс ${c.add} ккал`:''}`)}catch(e){}return r};

/* ---------- неделя на «Прогрессе» ---------- */
const DW=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
function weekCard(){const u=U(),g=FX().goal,a=[];for(let i=6;i>=0;i--){const t=new Date(),ds=new Date(t-i*864e5-t.getTimezoneOffset()*6e4).toISOString().slice(0,10),d=u.days[ds]||{},ex=d.ex||[];
  a.push({ds,wd:DW[new Date(ds+'T12:00:00').getDay()],m:ex.reduce((s,x)=>s+(+x.m||0),0),st:+d.steps||0,n:ex.length,k:ex.reduce((s,x)=>s+(+x.k||0),0),i})}
 const M=a.reduce((s,x)=>s+x.m,0),S=a.reduce((s,x)=>s+x.st,0),N=a.reduce((s,x)=>s+x.n,0),gd=a.filter(x=>x.st>=g).length,act=a.filter(x=>x.m>0||x.st>=g).length;
 const mx=Math.max(30,...a.map(x=>x.m));
 const msg=!M&&!S?'На этой неделе записей активности пока нет. Начать можно с короткой прогулки или 7-минутной тренировки дома.':M>=150?`${M} минут за неделю — это уровень, который ВОЗ советует для здоровья (150–300 минут). Отличная работа!`:`${M} из 150 минут, рекомендованных ВОЗ. Каждые 10 минут движения засчитываются, торопиться не нужно.`;
 return `<h2>Активность за неделю</h2><div class="fx-st"><div><b>${M}</b>минут</div><div><b>${S>=100000?Math.round(S/1000)+'к':ru(S)}</b>шагов</div><div><b>${N}</b>${N%10===1&&N%100!==11?'занятие':[2,3,4].includes(N%10)&&![12,13,14].includes(N%100)?'занятия':'занятий'}</div></div>
 <div class="fx-wk" role="img" aria-label="Минуты активности по дням: ${a.map(x=>x.wd+' '+x.m).join(', ')}">${a.map(x=>`<div class="${x.i===0?'t':''}" title="${x.m} мин · ${ru(x.st)} шагов"><small>${x.m||''}</small><u class="${x.m?'':'z'}" style="height:${x.m?Math.max(6,x.m/mx*62):3}px"></u>${x.wd}</div>`).join('')}</div>
 <p class="m" style="font-size:12.5px;margin-top:8px">${msg}${S?` Дней с целью шагов: ${gd} из 7.`:''}${act&&act<7?` Активных дней: ${act}.`:''}</p><button class="btn ghost" style="margin-top:10px" onclick="go('fit',null)">Записать активность</button>`}
function renderWeek(){const t=document.getElementById('t-weight');if(!t||!ok())return;let c=document.getElementById('fxWeek');
 if(!c){c=document.createElement('div');c.className='card';c.id='fxWeek';const ins=document.getElementById('insights'),ref=ins&&ins.closest('.card');if(ref&&ref.parentNode===t)ref.after(c);else t.appendChild(c)}c.innerHTML=weekCard()}

/* ---------- заметка под кольцом на «Сегодня» ---------- */
function todayNote(){const pn=document.getElementById('planNote');if(!pn||!ok())return;let e=document.getElementById('fxNote');const c=fitCalc();
 if(!c.add){if(e)e.remove();return}if(!e){e=document.createElement('p');e.id='fxNote';e.className='m';e.style.cssText='margin-top:6px;cursor:pointer';e.onclick=()=>go('fit',null);pn.after(e)}
 e.innerHTML=`🏃 В норму включено <b style="color:var(--lime)">+${c.add} ккал</b> за активность сегодня`}

const _r101=render;render=function(){const r=_r101.apply(this,arguments);try{todayNote();renderWeek()}catch(e){console.error(e)}return r};

window.FX101={log:logAct,steps:addSteps,setSteps,saveSteps,setGoal,goal,toggle,del:delEx,explain,pv,pre:preview,prev,pause,
 finish:()=>{if(RUN)done(true)},go:m=>runProg(build(m,homeLvl())),
 sel:id=>{SEL=id;renderFit()},lvl:i=>{LVL=i;const q=($('#fxQM')||{}).value;$('#fxQuick').innerHTML=cardQuick();if(q)$('#fxQM').value=q;pv()},
 wm:m=>{WMODE=m;$('#fxQuick').innerHTML=cardQuick();pv()},hl:k=>{HLVL=k;$('#fxHome').innerHTML=cardHome()},calc:()=>fitCalc(),build};
FX101.sel=id=>{SEL=id;$('#fxQuick').innerHTML=cardQuick();pv()};
try{if(ok())render()}catch(e){}
})();
