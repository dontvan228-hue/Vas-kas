/* ===== v97: «Качество питания» — оценка дня и недели не по калориям ===== */
(function(){
const lc=s=>String(s||'').toLowerCase().replace(/ё/g,'е');
/* классификация по названию */
const NOT_VEG=/йогурт|fanta|добрый|ice tea|энергетик|фруктовый лед|в томатном|напит|сок|лимонад|нектар|чипс|варенье|джем|мармелад|пастил|кетчуп|томатн(ая|ой) паст|пирож|блин|вареник|пельмен|пицц|торт|пирог|чебурек|беляш|шаурм|бургер|оливье|мимоз|крабов|под шуб|чак-чак|мороже|конфет|шоколад/;
const VEG=/овощ|салат|огур|помид|томат|капуст|морков|свекл|брокколи|кабач|цукини|баклажан|перец|перц|лук|чеснок|тыкв|редис|сельдер|шпинат|руккол|зелень|укроп|петрушк|спарж|стручк|горошек|яблок|груш|банан|апельсин|мандарин|грейпфрут|лимон|киви|виноград|персик|нектарин|слива|сливы|абрикос|арбуз|дын|ананас|манго|гранат|хурм|клубник|малин|черник|смородин|вишн|черешн|ягод|фрукт|авокадо|инжир|борщ|щи |щи$|винегрет|лобио|долма|голубц|рагу/;
const GRAIN=/гречк|гречн|овсян|овсяные|бурый|цельнозерн|перлов|булгур|киноа|ржан|черный хлеб|пшенк|пшено|пшенн|чечевиц|фасол|нут|горох|хумус|отруб|мюсли|хлебцы|лобио/;
const NOSUGAR=/томатн|без сахара|zero|\bmax\b|ultra|черный без|чай черный|кофе черный|американо/;
const SWEET=/шокол|конфет|торт|пирожн|печенье|вафл|зефир|мармелад|халв|(^|[^а-я])морожено|пломбир|эскимо|сгущ|варенье|джем|(^|[^а-я])мед([^а-я]|$)|сахар|пончик|эклер|кекс|сдоб|круассан|сырок([^а-я]|$)|чак-чак|пастил|ирис|леденц|сникерс|марс|твикс|kitkat|bounty|milky|рафаэлло|ферреро|oreo|чокопай|пряник|коровка|трюфел|козинак|десерт|йогурт фруктов|(^|[^а-я])кола|cola|pepsi|fanta|sprite|лимонад|газировк|нектар([^и]|$)|морс|компот|(^|[^а-я])сок([^а-я]|$)|энергетик|red bull|adrenaline|burn|monster|ice tea|fuse|какао|квас|крем-сода|тархун|байкал|буратино|дюшес/;
const FRIED=/жарен|фри([^а-я]|$)|колбас|сосиск|сардел|бекон|ветчин|(^|[^а-я])сало([^а-я]|$)|сервелат|чебурек|беляш|наггетс|бургер|хот-дог|шаурм|чипс|копчен|казы|чебуп|сухарики|лапша быстр/;
const grams=f=>{if(f.g)return +f.g;const m=/(\d+(?:[.,]\d+)?)\s*г\b/.exec(f.n||'');return m?parseFloat(m[1].replace(',','.')):0};
function dayQ(d){const F=(d&&d.food)||[];let veg=0,grain=0,sweetK=0,fried=0,p=0,fi=0;
 F.forEach(f=>{const n=lc(f.n);p+=+f.p||0;fi+=+f.fi||0;
  if(VEG.test(n)&&!NOT_VEG.test(n)){const g=grams(f);veg+=/борщ|щи|винегрет|голубц|лобио|долма|рагу/.test(n)?1:g?Math.min(3,Math.max(.5,g/80)):1}
  if(GRAIN.test(n)&&!SWEET.test(n))grain++;
  if(SWEET.test(n)&&!NOSUGAR.test(n))sweetK+=+f.k||0;
  if(FRIED.test(n)&&!/семечк|орех|арахис/.test(n))fried++});
 return{n:F.length,veg:Math.round(veg*2)/2,grain,sweetK,fried,p,fi,water:+(d&&d.water)||0,k:F.reduce((a,f)=>a+(+f.k||0),0)}}
/* уровни: 0 хорошо, 1 можно чуть лучше, 2 стоит добавить */
function points(q){let P=100,b=1800;try{P=mnorm().P;b=plan().b}catch(e){}
 const sw=q.sweetK/Math.max(b,1),vl=q.veg>=5?0:q.veg>=3?1:2,pl=q.p>=.8*P?0:q.p>=.5*P?1:2,fl=(q.fi>=20||q.grain>=2)?0:(q.fi>=12||q.grain>=1)?1:2;
 return[
 {k:'veg',e:'🥦',t:'Овощи и фрукты',l:vl,v:`${String(q.veg).replace('.',',')} из 5 порций`},
 {k:'prot',e:'🥚',t:'Белок',l:pl,v:`${Math.round(q.p)} из ~${P} г`},
 {k:'fib',e:'🌾',t:'Клетчатка и цельные злаки',l:fl,v:q.fi?`${Math.round(q.fi)} г клетчатки`:(q.grain?'есть цельные злаки':'пока нет')},
 {k:'sweet',e:'🍬',t:'Сладкое и сладкие напитки',l:sw<=.1?0:sw<=.2?1:2,v:q.sweetK?`≈${Math.round(q.sweetK)} ккал, ${Math.round(sw*100)}% дня`:'нет'},
 {k:'fried',e:'🍳',t:'Жареное и колбасы',l:q.fried===0?0:q.fried===1?1:2,v:q.fried?q.fried+' раз':'нет'},
 {k:'water',e:'💧',t:'Вода',l:q.water>=6?0:q.water>=4?1:2,v:`${q.water} из 8 стаканов`}]}
const TIP={veg:'Добавь овощи к обеду и ужину: огурец, помидор, горсть квашеной капусты или фрукт на перекус. Это уже плюс две порции.',
 prot:veg=>veg?'Начни завтрак с белка: творог, яйца, греческий йогурт, тофу или хумус. Так дольше сытно.':'Начни завтрак с белка: два яйца, творог или греческий йогурт. Так дольше сытно.',
 fib:'В одном приёме пищи замени белый хлеб, рис или макароны на гречку, овсянку, ржаной хлеб или фасоль.',
 sweet:'Если захочется сладкого, съешь его после основной еды, а не вместо неё. Фрукт или пара долек тёмного шоколада тоже подойдут.',
 fried:'Попробуй один раз приготовить мясо или рыбу в духовке или на пару вместо сковороды. Вкусно и легче.',
 water:'Поставь бутылку воды на видное место и выпей стакан сразу после пробуждения.'};
const COL=['#7ccf8a','#e8c76a','#ef9a6a'],LBL=['хорошо','можно чуть больше','стоит добавить'],LBLX=['в меру','чуть больше обычного','заметно больше'];
const dk=i=>new Date(Date.parse(today())-i*864e5).toISOString().slice(0,10);
function weekLine(u){let n=0,v=0,p=0,f=0;for(let i=0;i<7;i++){const d=u.days[dk(i)];if(!d||!(d.food||[]).length)continue;n++;const P=points(dayQ(d));if(!P[0].l)v++;if(!P[1].l)p++;if(!P[2].l)f++}
 if(n<2)return'';return `За неделю (${n} дн. с записями): овощей и фруктов хватало в ${v}, белка в ${p}, клетчатки в ${f}.`}
function renderQual(){const t=$('#t-today'),u=U();if(!t||!u||!u.p)return;let c=$('#tdQual');
 if(!c){c=document.createElement('div');c.className='card';c.id='tdQual';t.appendChild(c)}
 const ed=(u.quiz||{}).health==='ed',d=u.days[today()],q=dayQ(d);
 const pos=TD_ORDER.indexOf('tdQual'),want=ed?'tdAdd':'tdBzu';if(pos<0||TD_ORDER[pos-1]!==want){if(pos>=0)TD_ORDER.splice(pos,1);const j=TD_ORDER.indexOf(want);TD_ORDER.splice(j<0?TD_ORDER.length:j+1,0,'tdQual')}
 const head=`<h2>Качество питания</h2>`+(ed?'<p class="m" style="font-size:12px;margin-top:-4px">Разнообразие и регулярность важнее цифр. Это просто наблюдения, без оценок.</p>':'');
 if(!q.n){c.innerHTML=head+'<p class="m">Запиши еду, и здесь появится разбор: овощи, белок, клетчатка, сладкое, вода.</p>';return}
 let P=points(q);const core=P.slice(0,4),extra=P.slice(4).sort((a,b)=>b.l-a.l)[0];P=core.concat(extra);
 const row=x=>{const ex=x.k==='sweet'||x.k==='fried';return `<div style="display:flex;align-items:center;gap:10px;margin:7px 0"><i style="flex:none;width:10px;height:10px;border-radius:50%;background:${COL[x.l]}" aria-hidden="true"></i><span style="flex:1">${x.e} ${x.t}<br><small style="color:var(--mut)">${x.v}</small></span><small style="color:${COL[x.l]};text-align:right">${ex?LBLX[x.l]:LBL[x.l]}</small></div>`};
 const pr=['veg','fib','prot','sweet','fried','water'],all=points(q),worst=all.filter(x=>x.l>0).sort((a,b)=>b.l-a.l||pr.indexOf(a.k)-pr.indexOf(b.k))[0];
 const veg=(u.quiz||{}).diet==='veg'||u.diet==='veg',tip=worst?(typeof TIP[worst.k]==='function'?TIP[worst.k](veg):TIP[worst.k]):'Хороший баланс сегодня. Завтра можно повторить: добавь удачные блюда в «Избранное».';
 const wl=weekLine(u);
 c.innerHTML=head+P.map(row).join('')+`<p class="m" style="margin-top:10px">💡 <b>На завтра:</b> ${tip}</p>`+(wl?`<p class="m" style="font-size:12px;opacity:.85">${wl}</p>`:'')+'<p class="m" style="font-size:11px;opacity:.7">Оценка по названиям продуктов, она приблизительная.</p>'}
const _r97=render;render=function(){_r97.apply(this,arguments);try{renderQual();if(typeof tdLayout==='function')tdLayout()}catch(e){}};
window.qualDay=dayQ;
})();
