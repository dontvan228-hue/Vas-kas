/* ===== v100: меню на неделю и список покупок ===== */
(function(){
'use strict';
/* --- продукты: [название в списке, отдел, ккал, углеводы, клетчатка, белки, жиры (на 100 г), вес 1 шт, ед., флаги]
   флаги: M — мясо/рыба, P — во время беременности лучше отложить; ед. 'мл' для жидкостей */
const D_VEG='Овощи и зелень',D_FR='Фрукты и ягоды',D_MEAT='Мясо и птица',D_FISH='Рыба и консервы',D_MILK='Молочное и яйца',D_GR='Крупы, макароны, хлеб',D_GROC='Бакалея',D_FRZ='Заморозка';
const DEPTS=[D_VEG,D_FR,D_MEAT,D_FISH,D_MILK,D_GR,D_GROC,D_FRZ];
const ING={
 egg:['Яйца куриные',D_MILK,157,.7,0,12.7,11.5,55,'шт',''],
 milk:['Молоко 2,5%',D_MILK,52,4.7,0,2.8,2.5,0,'мл',''],
 kefir:['Кефир 1%',D_MILK,40,4,0,3,1,0,'мл',''],
 tvorog:['Творог 5%',D_MILK,121,3,0,17,5,0,'',''],
 yog:['Йогурт натуральный 2%',D_MILK,60,4.7,0,4.3,2,0,'',''],
 cheese:['Сыр полутвёрдый',D_MILK,360,0,0,24,29,0,'',''],
 brynza:['Брынза',D_MILK,260,.4,0,18,20,0,'',''],
 smet:['Сметана 15%',D_MILK,162,3,0,2.6,15,0,'',''],
 butter:['Масло сливочное',D_MILK,748,.8,0,.5,82.5,0,'',''],
 chick:['Куриное филе',D_MEAT,113,.4,0,23.6,1.9,0,'','M'],
 thigh:['Куриное бедро без кожи',D_MEAT,177,0,0,18.5,11.5,0,'','M'],
 turkey:['Филе индейки',D_MEAT,115,0,0,23,2,0,'','M'],
 beef:['Говядина (лопатка)',D_MEAT,187,0,0,18.9,12.4,0,'','M'],
 mince:['Фарш говяжий',D_MEAT,254,0,0,17,20,0,'','M'],
 pork:['Свиная вырезка',D_MEAT,142,0,0,19.4,7.1,0,'','M'],
 liver:['Печень куриная',D_MEAT,137,.7,0,20.4,5.9,0,'','MP'],
 pollock:['Минтай (филе)',D_FISH,72,0,0,15.9,.9,0,'','M'],
 hake:['Хек (филе)',D_FISH,86,0,0,16.6,2.2,0,'','M'],
 salmonp:['Горбуша',D_FISH,140,0,0,20.5,6.5,0,'','M'],
 tuna:['Тунец в собственном соку',D_FISH,96,0,0,21,1,0,'','M'],
 herring:['Сельдь слабосолёная',D_FISH,217,0,0,19.8,15.4,0,'','MP'],
 salmon:['Сёмга слабосолёная',D_FISH,202,0,0,22.5,12.5,0,'','MP'],
 buck:['Гречка',D_GR,313,57,11,12.6,3.3,0,'',''],
 rice:['Рис белый',D_GR,344,78,1.4,6.7,.7,0,'',''],
 oats:['Овсяные хлопья',D_GR,366,62,11,12,6.2,0,'',''],
 pasta:['Макароны из твёрдых сортов',D_GR,350,71,3.2,12,1.5,0,'',''],
 bulgur:['Булгур',D_GR,342,76,12.5,12.3,1.3,0,'',''],
 millet:['Пшено',D_GR,348,69,3.6,11.5,3.3,0,'',''],
 lentil:['Чечевица красная',D_GR,314,48,11,24,1.5,0,'',''],
 flour:['Мука пшеничная',D_GR,334,70,3.5,10,1.1,0,'',''],
 bread:['Хлеб цельнозерновой',D_GR,247,41,7,13,3.4,30,'ломт.',''],
 beans:['Фасоль консервированная',D_GROC,95,17,5,6,.5,0,'',''],
 potato:['Картофель',D_VEG,77,17,2.2,2,.4,120,'шт',''],
 cucumber:['Огурцы',D_VEG,15,3,.7,.8,.1,120,'шт',''],
 tomato:['Помидоры',D_VEG,20,3.7,1.2,1.1,.2,120,'шт',''],
 cabbage:['Капуста белокочанная',D_VEG,27,5.8,2,1.8,.1,0,'',''],
 carrot:['Морковь',D_VEG,35,7,2.4,1.3,.1,80,'шт',''],
 onion:['Лук репчатый',D_VEG,41,9.5,1.7,1.4,.2,80,'шт',''],
 beet:['Свёкла',D_VEG,43,9.6,2.8,1.6,.2,200,'шт',''],
 zucchini:['Кабачки',D_VEG,24,4.6,1,.6,.3,300,'шт',''],
 pepper:['Перец болгарский',D_VEG,27,5.3,1.9,1.3,.1,150,'шт',''],
 mush:['Шампиньоны',D_VEG,22,3.3,1,3.1,.3,0,'',''],
 pumpkin:['Тыква',D_VEG,22,4.4,2,1,.1,0,'',''],
 greens:['Зелень (укроп, петрушка)',D_VEG,40,6,3,3,.5,30,'пуч.',''],
 lettuce:['Салат листовой',D_VEG,14,2.9,1.3,1.4,.2,0,'',''],
 garlic:['Чеснок',D_VEG,149,33,2,6.4,.5,5,'зуб.',''],
 apple:['Яблоки',D_FR,52,13.8,2.4,.3,.2,180,'шт',''],
 banana:['Бананы',D_FR,89,22.8,2.6,1.1,.3,120,'шт',''],
 mandarin:['Мандарины',D_FR,38,8.1,1.8,.8,.2,80,'шт',''],
 berries:['Ягоды замороженные',D_FRZ,45,10,3,.8,.4,0,'',''],
 broccoli:['Брокколи',D_FRZ,34,7,2.6,2.8,.4,0,'',''],
 cauli:['Цветная капуста',D_FRZ,30,5,2,2.5,.3,0,'',''],
 vegmix:['Овощная смесь',D_FRZ,45,8,3,2,.4,0,'',''],
 oil:['Масло растительное',D_GROC,899,0,0,0,99.9,0,'мл',''],
 honey:['Мёд',D_GROC,329,81,.2,.8,0,0,'',''],
 walnut:['Грецкие орехи',D_GROC,654,14,6.7,15.2,65,0,'',''],
 pnut:['Арахисовая паста',D_GROC,588,20,6,25,50,0,'',''],
 tpaste:['Томатная паста',D_GROC,82,17,4,4.8,.5,0,'',''],
 tofu:['Тофу',D_GROC,76,1.9,.3,8,4.8,0,'',''],
};
/* короткие подписи в составе блюда */
const SH={egg:'яйца',milk:'молоко',kefir:'кефир',tvorog:'творог',yog:'йогурт',cheese:'сыр',brynza:'брынза',smet:'сметана',butter:'масло слив.',chick:'куриное филе',thigh:'куриное бедро',turkey:'индейка',beef:'говядина',mince:'фарш',pork:'свинина',liver:'печень',pollock:'минтай',hake:'хек',salmonp:'горбуша',tuna:'тунец',herring:'сельдь',salmon:'сёмга',buck:'гречка (сух.)',rice:'рис (сух.)',oats:'овсяные хлопья',pasta:'макароны (сух.)',bulgur:'булгур (сух.)',millet:'пшено (сух.)',lentil:'чечевица (сух.)',flour:'мука',bread:'хлеб',beans:'фасоль',potato:'картофель',cucumber:'огурец',tomato:'помидор',cabbage:'капуста',carrot:'морковь',onion:'лук',beet:'свёкла',zucchini:'кабачок',pepper:'перец',mush:'шампиньоны',pumpkin:'тыква',greens:'зелень',lettuce:'салат',garlic:'чеснок',apple:'яблоко',banana:'банан',mandarin:'мандарины',berries:'ягоды',broccoli:'брокколи',cauli:'цв. капуста',vegmix:'овощная смесь',oil:'раст. масло',honey:'мёд',walnut:'орехи',pnut:'арахисовая паста',tpaste:'томатная паста',tofu:'тофу'};
/* --- блюда: [название, типы (b завтрак, m обед/ужин, s перекус), состав {продукт: граммы}] --- */
const DISHES=[
 ['Овсянка на молоке с бананом','b',{oats:50,milk:200,banana:100}],
 ['Овсянка с ягодами и орехами','b',{oats:50,milk:150,berries:100,walnut:10}],
 ['Гречка с молоком и маслом','b',{buck:60,milk:200,butter:5}],
 ['Омлет с помидорами и хлебом','b',{egg:165,milk:50,tomato:120,bread:30,oil:5}],
 ['Яичница с перцем и луком','b',{egg:110,pepper:100,onion:30,oil:5,bread:30}],
 ['Сырники со сметаной','b',{tvorog:180,egg:55,flour:30,oil:7,smet:30}],
 ['Творог с ягодами и мёдом','b',{tvorog:180,berries:100,honey:10}],
 ['Бутерброды с сыром и яйцом, огурец','b',{bread:60,cheese:30,egg:55,cucumber:100}],
 ['Пшённая каша с тыквой','b',{millet:60,milk:150,pumpkin:150,butter:5}],
 ['Рисовая каша на молоке','b',{rice:50,milk:250,butter:5}],
 ['Ленивая овсянка с йогуртом и яблоком','b',{yog:200,oats:40,apple:150}],
 ['Омлет с брынзой и зеленью','b',{egg:165,brynza:40,greens:30,oil:5}],
 ['Скрэмбл с грибами и сыром','b',{egg:165,mush:100,cheese:20,butter:5}],
 ['Творожная запеканка со сметаной','b',{tvorog:200,egg:55,oats:20,smet:20}],
 ['Бутерброды с сёмгой и огурцом','b',{bread:60,salmon:50,cucumber:100,tvorog:50}],
 ['Творог со сметаной и орехами','b',{tvorog:180,smet:30,walnut:15}],
 ['Омлет с курицей и сыром','b',{egg:110,chick:80,cheese:20,butter:5}],
 ['Шакшука (яйца в томатах) с хлебом','bm',{egg:165,tomato:250,pepper:100,onion:40,oil:7,bread:30}],
 ['Запеканка из яиц с брокколи и сыром','bm',{egg:165,broccoli:150,cheese:30,milk:50}],
 ['Борщ со сметаной и хлебом','m',{beef:70,beet:100,cabbage:100,potato:80,carrot:40,onion:30,tpaste:15,oil:5,smet:20,bread:30}],
 ['Щи из свежей капусты с курицей','m',{thigh:80,cabbage:150,potato:80,carrot:40,onion:30,smet:20,bread:30}],
 ['Куриный суп с лапшой','m',{chick:80,pasta:30,carrot:40,onion:30,potato:60,greens:10,bread:30}],
 ['Чечевичный суп','m',{lentil:60,carrot:50,onion:40,potato:80,oil:7,tpaste:15,bread:30}],
 ['Суп-пюре из тыквы с сыром','m',{pumpkin:300,potato:80,onion:40,milk:100,oil:7,cheese:20,bread:30}],
 ['Гречка с куриной грудкой и огурцом','m',{buck:60,chick:150,cucumber:150,oil:5}],
 ['Минтай тушёный с овощами и рисом','m',{pollock:180,rice:60,carrot:50,onion:40,oil:7}],
 ['Макароны по-флотски с помидором','m',{pasta:70,mince:100,onion:40,tomato:100}],
 ['Тефтели из индейки с гречкой','m',{turkey:150,rice:15,onion:30,buck:60,smet:20,tpaste:10}],
 ['Плов с курицей','m',{thigh:120,rice:70,carrot:80,onion:50,oil:7,garlic:5}],
 ['Гуляш из говядины с гречкой','m',{beef:120,onion:50,tpaste:15,buck:60,carrot:40,oil:5}],
 ['Курица с запечённым картофелем и салатом','m',{chick:150,potato:200,oil:7,cucumber:100,tomato:100}],
 ['Куриные котлеты с картофельным пюре','m',{chick:150,egg:25,onion:30,potato:200,milk:50,butter:5,oil:5}],
 ['Горбуша с картофелем и огурцом','m',{salmonp:150,potato:180,cucumber:120,oil:5}],
 ['Хек с овощами и рисом','m',{hake:180,vegmix:200,rice:50}],
 ['Ленивые голубцы','m',{mince:100,rice:30,cabbage:150,carrot:40,onion:30,tpaste:15,smet:20}],
 ['Фаршированные перцы','m',{pepper:250,mince:100,rice:30,carrot:30,onion:30,tpaste:15,smet:20}],
 ['Индейка с булгуром и овощами','m',{turkey:150,bulgur:60,cucumber:100,tomato:100,oil:5}],
 ['Тушёная капуста с индейкой','m',{turkey:150,cabbage:250,carrot:50,onion:40,tpaste:10,oil:7}],
 ['Печень куриная в сметане с гречкой','m',{liver:150,onion:50,smet:30,buck:60}],
 ['Сельдь с варёным картофелем и луком','m',{herring:80,potato:200,onion:30,oil:5,greens:10}],
 ['Овощное рагу с фасолью','m',{beans:150,potato:120,zucchini:150,carrot:50,onion:40,pepper:100,oil:10}],
 ['Гречка с грибами и луком','m',{buck:70,mush:200,onion:60,oil:10,smet:20}],
 ['Макароны с сыром и помидорами','m',{pasta:80,cheese:40,tomato:150,oil:5}],
 ['Булгур с овощами и яйцом','m',{bulgur:60,pepper:100,zucchini:100,egg:55,oil:7}],
 ['Тофу с овощами и рисом','m',{tofu:150,vegmix:200,rice:50,oil:7}],
 ['Куриное бедро с брокколи и сыром','m',{thigh:150,broccoli:200,cheese:20,oil:5}],
 ['Минтай под сметаной с цветной капустой','m',{pollock:200,smet:40,cauli:200,cheese:15,oil:5}],
 ['Свинина с кабачками и перцем','m',{pork:150,zucchini:200,pepper:100,oil:10}],
 ['Говяжьи котлеты с салатом из овощей','m',{mince:130,egg:25,onion:30,cucumber:150,tomato:150,oil:10}],
 ['Салат с тунцом, яйцом и овощами','m',{tuna:120,egg:110,cucumber:150,tomato:120,lettuce:50,oil:10}],
 ['Салат с брынзой и овощами','m',{cucumber:150,tomato:150,pepper:100,brynza:60,oil:10,walnut:10}],
 ['Капуста тушёная с грибами и яйцом','m',{cabbage:250,mush:150,egg:110,oil:10}],
 ['Кабачки, запечённые с творогом и сыром','m',{zucchini:300,tvorog:120,egg:55,cheese:30}],
 ['Яблоко и грецкие орехи','s',{apple:180,walnut:15}],
 ['Кефир и яблоко','s',{kefir:250,apple:150}],
 ['Творог с огурцом и зеленью','s',{tvorog:150,cucumber:100,greens:10}],
 ['Йогурт с ягодами','s',{yog:200,berries:80}],
 ['Бутерброд с сыром и помидором','s',{bread:30,cheese:25,tomato:50}],
 ['Кефир с бананом','s',{kefir:200,banana:120}],
 ['Яйца вкрутую с огурцом','s',{egg:110,cucumber:150}],
 ['Сыр и грецкие орехи','s',{walnut:20,cheese:30}],
 ['Творог с бананом','s',{tvorog:120,banana:80}],
 ['Овощные палочки с брынзой','s',{carrot:100,cucumber:100,brynza:40}],
 ['Хлеб с арахисовой пастой и бананом','s',{bread:30,pnut:15,banana:60}],
 ['Сыр с помидором','s',{cheese:30,tomato:120}],
 ['Творог с орехами','s',{tvorog:120,walnut:10}],
 ['Стакан кефира','s',{kefir:250}],
 ['Мандарины и йогурт','s',{mandarin:160,yog:150}],
].map((d,i)=>{let k=0,c=0,fi=0,p=0,f=0,meat=false,np=false;Object.entries(d[2]).forEach(([key,g])=>{const x=ING[key];k+=x[2]*g/100;c+=x[3]*g/100;fi+=x[4]*g/100;p+=x[5]*g/100;f+=x[6]*g/100;if(x[9].includes('M'))meat=true;if(x[9].includes('P'))np=true});
 const net=c-fi;return{id:i,n:d[0],t:d[1],ing:d[2],k,c,fi,p,f,net,veg:!meat,np,lc:net<=(d[1]==='s'?10:13)}});
window.MENU_DISHES=DISHES;

/* --- настройки --- */
const SLOTS={2:[['Завтрак','b',.45],['Ужин','m',.55]],3:[['Завтрак','b',.30],['Обед','m',.40],['Ужин','m',.30]],4:[['Завтрак','b',.25],['Обед','m',.35],['Ужин','m',.28],['Перекус','s',.12]],5:[['Завтрак','b',.23],['Перекус','s',.10],['Обед','m',.32],['Перекус','s',.10],['Ужин','m',.25]]};
const DIETN={all:'Обычное',lc:'Лоу-карб',veg:'Вегетарианское'};
const WD=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],WDF=['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const q=()=>(U()&&U().quiz)||{};
const defDiet=()=>{const d=q().diet;return d==='lc'||d==='veg'?d:(typeof LIM==='function'&&LIM()?'lc':'all')};
const defMeals=()=>({'2':2,'3':3,'5':5}[q().meals]||4);
const isPreg=()=>{const u=U();return q().health==='preg'||!!(u&&u.hl&&(u.hl.st==='preg'||u.hl.st==='feed'))};
const M=()=>U().menu;
const fmt=n=>Math.round(n).toLocaleString('ru-RU');
const r5=g=>Math.max(5,Math.round(g/5)*5);
const dateAt=(start,i)=>{const t=new Date(Date.parse(start)+i*864e5);return{wd:t.getUTCDay(),d:t.getUTCDate(),iso:t.toISOString().slice(0,10)}};

function targets(diet){
 const b=plan().b,mn=mnorm(),P=mn.P;
 if(diet==='lc'){const C=(typeof LIM==='function'&&LIM())?NG():Math.min(50,mn.C);return{b,P,C,F:Math.max(40,Math.round((b-4*P-4*C)/9)),lc:1}}
 return{b,P,F:mn.F,C:mn.C,lc:0};
}
function pool(diet,preg){return DISHES.filter(d=>(!preg||!d.np)&&(diet!=='veg'||d.veg)&&(diet!=='lc'||d.lc))}
/* сумма по дню: items [{id,x}] */
function sum(items){const s={k:0,p:0,f:0,c:0,net:0};items.forEach(it=>{const d=DISHES[it.id];s.k+=d.k*it.x;s.p+=d.p*it.x;s.f+=d.f*it.x;s.c+=d.c*it.x;s.net+=d.net*it.x});return s}
function pen(v,t){const d=(v-t)/t,a=Math.abs(d);return d*d+(a>.1?(a-.1)*3:0)}
function score(items,T){const s=sum(items);let sc=3*pen(s.k,T.b)+pen(s.p,T.P)+.8*pen(s.f,T.F);
 if(T.lc){if(s.net>T.C)sc+=pen(s.net,T.C)*2}else sc+=.8*pen(s.c,T.C);
 return sc}
const XMIN=.5,XMAX=2,STEP=.05;
function refine(items,T,only){/* покоординатный спуск по размерам порций */
 let best=score(items,T);
 for(let pass=0;pass<20;pass++){let moved=false;
  items.forEach((it,i)=>{if(only!=null&&i!==only)return;[STEP,-STEP,2*STEP,-2*STEP].forEach(st=>{const o=it.x,nx=Math.round((o+st)*100)/100;if(nx<XMIN||nx>XMAX)return;it.x=nx;const sc=score(items,T);if(sc<best-1e-9){best=sc;moved=true}else it.x=o})});
  if(!moved)break}
 return best}
const rnd=a=>a[Math.floor(Math.random()*a.length)];
function buildDay(slots,T,P,cnt,lim){
 let best=null;const cand=[];
 for(let it=0;it<260;it++){const used=new Set(),items=[];let ok=true;
  for(const [,ty,sh] of slots){const opts=P.filter(d=>d.t.includes(ty)&&!used.has(d.id)&&(cnt[d.id]||0)<lim);if(!opts.length){ok=false;break}
   const d=rnd(opts);used.add(d.id);items.push({id:d.id,x:Math.min(XMAX,Math.max(XMIN,Math.round(T.b*sh/d.k*20)/20))})}
  if(!ok)continue;cand.push({items,sc:score(items,T)})}
 cand.sort((a,b)=>a.sc-b.sc);
 cand.slice(0,12).forEach(c=>{c.sc=refine(c.items,T);if(!best||c.sc<best.sc)best=c});
 return best}
function generate(opt){
 const u=U(),old=u.menu||{},diet=(opt&&opt.diet)||old.diet||defDiet(),meals=(opt&&opt.meals)||old.meals||defMeals(),preg=isPreg();
 const T=targets(diet),slots=SLOTS[meals],P=pool(diet,preg);
 let lim=2,days=null;
 for(;lim<=4&&!days;lim++){const cnt={},ds=[];let ok=true;
  for(let i=0;i<7;i++){const b=buildDay(slots,T,P,cnt,lim);if(!b){ok=false;break}b.items.forEach(x=>cnt[x.id]=(cnt[x.id]||0)+1);ds.push({items:b.items,lg:{}})}
  if(ok)days=ds}
 lim--;
 u.menu={v:1,start:today(),diet,meals,preg,lim,days:days||[],shop:(old.shop)||{},made:Date.now()};
 save();return u.menu}
function counts(m){const c={};m.days.forEach(d=>d.items.forEach(x=>c[x.id]=(c[x.id]||0)+1));return c}

/* --- состояние окна --- */
let wTab='menu',wDay=0;
const dayIdx=m=>Math.round(dn(today())-dn(m.start));
function ensure(){const u=U();if(!u)return null;if(!u.menu||!u.menu.days||!u.menu.days.length)generate();return u.menu}

function slotsOf(m){return SLOTS[m.meals]||SLOTS[4]}
function ingLine(d,x){return Object.entries(d.ing).map(([k,g])=>{const z=ING[k],gg=g*x;
 if(z[8]==='шт'&&k==='egg')return`${SH[k]} ${Math.max(1,Math.round(gg/z[7]))} шт`;
 return`${SH[k]} ${r5(gg)} ${z[8]==='мл'?'мл':'г'}`}).join(' · ')}
function portionG(d,x){return Object.values(d.ing).reduce((a,g)=>a+g,0)*x}

function chip(on,l,f){return`<span class="chip2 ${on?'on':''}" role="button" tabindex="0" onclick="${f}">${l}</span>`}
function mark(v,t,lc){const ok=lc?v<=t*1.1:Math.abs(v-t)<=t*.1;return`<i class="wm-ok ${ok?'y':'n'}" aria-hidden="true">${ok?'✓':'≈'}</i>`}

function rMenu(m){
 const sl=slotsOf(m),di=dayIdx(m),T=targets(m.diet);
 let h='';
 if(di>6)h+=`<div class="wm-note">Неделя по этому меню закончилась. Можно составить новое — с учётом ваших текущих настроек.<button class="btn" onclick="wmNew()">Составить новое меню</button></div>`;
 h+=`<div class="wm-days" role="tablist">${m.days.map((d,i)=>{const a=dateAt(m.start,i);return`<button role="tab" aria-selected="${i===wDay}" class="${i===wDay?'on':''}${i===di?' td':''}" onclick="wmDay(${i})"><small>${WD[a.wd]}</small><b>${a.d}</b></button>`}).join('')}</div>`;
 const D=m.days[wDay];if(!D)return h+'<p class="m">Не получилось подобрать блюда. Попробуйте другой тип питания.</p>';
 const s=sum(D.items),a=dateAt(m.start,wDay);
 h+=`<div class="wm-sum"><div><b>${wDay===di?'Сегодня, ':''}${WDF[a.wd]}</b><span>${fmt(s.k)} из ${fmt(T.b)} ккал ${mark(s.k,T.b)}</span></div>
 <div class="wm-mac"><span>Б ${fmt(s.p)} / ${fmt(T.P)} г ${mark(s.p,T.P)}</span><span>Ж ${fmt(s.f)} / ${fmt(T.F)} г ${mark(s.f,T.F)}</span>${T.lc?`<span>Чистые У ${fmt(s.net)} / до ${fmt(T.C)} г ${mark(s.net,T.C,1)}</span>`:`<span>У ${fmt(s.c)} / ${fmt(T.C)} г ${mark(s.c,T.C)}</span>`}</div></div>`;
 h+=D.items.map((it,i)=>{const d=DISHES[it.id],lg=D.lg&&D.lg[i];
  return`<div class="wm-it"><div class="wm-top"><div><small>${sl[i]?sl[i][0]:''}</small><b>${esc(d.n)}</b></div><span class="wm-k">${fmt(d.k*it.x)}<small> ккал</small></span></div>
  <div class="m wm-ing">${ingLine(d,it.x)}</div>
  <div class="m wm-bju">≈${fmt(portionG(d,it.x))} г · Б ${fmt(d.p*it.x)} · Ж ${fmt(d.f*it.x)} · У ${fmt(d.c*it.x)}</div>
  <div class="wm-act"><button class="btn ghost sm" onclick="wmSwap(${wDay},${i})" aria-label="Заменить блюдо: ${esc(d.n)}">↻ Заменить</button>${lg?`<button class="btn ghost sm wm-done" onclick="wmLog(${wDay},${i})">✓ В дневнике</button>`:`<button class="btn sm" onclick="wmLog(${wDay},${i})" aria-label="Записать в дневник: ${esc(d.n)}">＋ В дневник</button>`}</div></div>`}).join('');
 h+=`<button class="btn" onclick="wmLogDay(${wDay})">Записать весь день в дневник</button>`;
 h+=`<p class="m" style="margin-top:10px;font-size:12px">Записи попадают в дневник за сегодня. Крупы и макароны указаны в сухом виде, мясо и рыба — в сыром. Порции рассчитаны под вашу норму, цифры ориентировочные.</p>`;
 h+=`<details class="wm-set"><summary>Настройки меню</summary>
 <p class="m" style="margin:8px 0 4px">Тип питания</p><div class="chips">${Object.keys(DIETN).map(k=>chip(m.diet===k,DIETN[k],`wmSet('diet','${k}')`)).join('')}</div>
 <p class="m" style="margin:4px 0">Приёмов пищи в день</p><div class="chips">${[2,3,4,5].map(n=>chip(+m.meals===n,n,`wmSet('meals',${n})`)).join('')}</div>
 ${m.preg?'<p class="m">Учитываю беременность или кормление: в меню нет слабосолёной рыбы и печени. Сыры и молочное — пастеризованные.</p>':''}
 ${m.lim>2?'<p class="m">Для таких настроек блюд немного, поэтому некоторые повторяются чуть чаще обычного.</p>':''}
 <button class="btn ghost" onclick="wmNew()">Составить меню заново</button></details>`;
 return h}

/* --- покупки --- */
function shopList(m){const t={};m.days.forEach(D=>D.items.forEach(it=>{const d=DISHES[it.id];Object.entries(d.ing).forEach(([k,g])=>{t[k]=(t[k]||0)+g*it.x})}));return t}
function qty(k,g){const z=ING[k];
 if(k==='egg')return`${Math.ceil(g/z[7])} шт`;
 const u=z[8]==='мл'?['мл','л']:['г','кг'],G=Math.ceil(g/10)*10;
 let s=G>=1000?`${(Math.round(G/100)/10).toLocaleString('ru-RU')} ${u[1]}`:`${G} ${u[0]}`;
 if(z[7]&&z[8]&&z[8]!=='мл')s+=` (≈${Math.max(1,Math.round(g/z[7]))} ${z[8]})`;
 return s}
function rShop(m){
 const L=shopList(m),ch=m.shop||{},by={};Object.keys(L).forEach(k=>{(by[ING[k][1]]=by[ING[k][1]]||[]).push(k)});
 const all=Object.keys(L).length,done=Object.keys(L).filter(k=>ch[k]).length;
 let h=`<p class="m">На 7 дней по вашему меню. Куплено ${done} из ${all}.</p><div class="wm-bar"><i style="width:${all?Math.round(done/all*100):0}%"></i></div>`;
 DEPTS.forEach(dp=>{const ks=by[dp];if(!ks)return;ks.sort((a,b)=>ING[a][0].localeCompare(ING[b][0],'ru'));
  h+=`<h4 class="wm-dep">${dp}</h4>`+ks.map(k=>`<label class="wm-sh ${ch[k]?'on':''}"><input type="checkbox" ${ch[k]?'checked':''} onchange="wmTick('${k}',this.checked)"><span>${ING[k][0]}</span><b>${qty(k,L[k])}</b></label>`).join('')});
 h+=`<button class="btn" onclick="wmShare()">Поделиться списком</button>${done?'<button class="btn ghost" onclick="wmUntick()">Снять все отметки</button>':''}
 <p class="m" style="margin-top:10px;font-size:12px">Количество округлено вверх. Крупы и макароны — в сухом виде. Соль, специи и вода в список не входят.</p>`;
 return h}
function shopText(m){const L=shopList(m),ch=m.shop||{};let t='Список покупок на неделю\n';
 DEPTS.forEach(dp=>{const ks=Object.keys(L).filter(k=>ING[k][1]===dp).sort((a,b)=>ING[a][0].localeCompare(ING[b][0],'ru'));if(!ks.length)return;t+=`\n${dp}:\n`+ks.map(k=>`${ch[k]?'✓':'☐'} ${ING[k][0]} — ${qty(k,L[k])}`).join('\n')+'\n'});
 return t+'\nVASSKASS • FLOW'}

/* --- окно --- */
function render100(){const m=M();if(!m)return;const b=document.getElementById('wmBody');if(!b)return;
 b.innerHTML=`<h3>Меню на неделю</h3><div class="hltabs" role="tablist"><button role="tab" aria-selected="${wTab==='menu'}" class="${wTab==='menu'?'on':''}" onclick="wmTab('menu')">🍽 Меню</button><button role="tab" aria-selected="${wTab==='shop'}" class="${wTab==='shop'?'on':''}" onclick="wmTab('shop')">🛒 Покупки</button></div>`+(wTab==='menu'?rMenu(m):rShop(m))}
window.wmOpen=function(tab,day){const m=ensure();if(!m)return;if(tab)wTab=tab;const di=dayIdx(m);wDay=day!=null?day:Math.min(6,Math.max(0,di));
 let sh=document.getElementById('wmSheet');if(!sh){document.body.insertAdjacentHTML('beforeend','<div id="wmSheet" class="hlsh" role="dialog" aria-modal="true" aria-label="Меню на неделю"><div class="hlin"><button class="hlx" onclick="wmClose()" aria-label="Закрыть">✕</button><div id="wmBody"></div></div></div>');sh=document.getElementById('wmSheet');sh.addEventListener('click',e=>{if(e.target===sh)wmClose()})}
 render100();sh.classList.add('on');document.body.style.overflow='hidden';try{if(typeof closeTools==='function'&&document.getElementById('tlSheet'))closeTools();document.body.style.overflow='hidden'}catch(e){}try{hap()}catch(e){}};
window.wmClose=function(){const s=document.getElementById('wmSheet');if(s)s.classList.remove('on');document.body.style.overflow='';cardFill()};
window.wmTab=function(t){wTab=t;render100();const i=document.querySelector('#wmSheet .hlin');if(i)i.scrollTop=0};
window.wmDay=function(i){wDay=i;render100()};
window.wmNew=function(){generate();const m=M();wDay=Math.min(6,Math.max(0,dayIdx(m)));render100();toast('Новое меню на неделю готово')};
window.wmSet=function(k,v){const m=M();m[k]=v;generate({diet:m.diet,meals:m.meals});render100();toast(k==='diet'?`Меню: ${DIETN[v].toLowerCase()} питание`:`Меню на ${v} приёма пищи`.replace('на 5 приёма','на 5 приёмов'))};
window.wmSwap=function(di,si){const m=M(),D=m.days[di],T=targets(m.diet),sl=slotsOf(m),cnt=counts(m),cur=D.items[si].id,ty=sl[si][1];
 const P=pool(m.diet,m.preg).filter(d=>d.t.includes(ty)&&d.id!==cur&&!D.items.some(x=>x.id===d.id)&&(cnt[d.id]||0)<Math.max(2,m.lim||2));
 if(!P.length)return toast('Других подходящих блюд пока нет');
 const res=P.map(d=>{const items=D.items.map(x=>({id:x.id,x:x.x}));items[si]={id:d.id,x:Math.min(XMAX,Math.max(XMIN,Math.round(T.b*sl[si][2]/d.k*20)/20))};const sc=refine(items,T,si);return{items,sc}}).sort((a,b)=>a.sc-b.sc);
 const pick=rnd(res.slice(0,Math.min(4,res.length)));D.items=pick.items;if(D.lg)delete D.lg[si];save();render100();toast('Блюдо заменено')};
function logOne(di,si){const m=M(),D=m.days[di],it=D.items[si],d=DISHES[it.id],sl=slotsOf(m)[si],r=v=>Math.round(v*10)/10;
 addMacroFood({n:`${d.n}, ${r5(portionG(d,it.x))} г`,k:Math.round(d.k*it.x),c:r(d.c*it.x),fi:r(d.fi*it.x),p:r(d.p*it.x),f:r(d.f*it.x),g:r5(portionG(d,it.x)),m:sl?sl[0]:'Перекус'});
 (D.lg=D.lg||{})[si]=today()}
window.wmLog=function(di,si){const D=M().days[di];if(D.lg&&D.lg[si]===today())return toast('Это блюдо уже в дневнике за сегодня');logOne(di,si);save();render100()};
window.wmLogDay=function(di){const D=M().days[di];let n=0;D.items.forEach((x,i)=>{if(!(D.lg&&D.lg[i]===today())){logOne(di,i);n++}});save();render100();toast(n?`В дневник добавлено блюд: ${n}`:'Весь день уже в дневнике')};
window.wmTick=function(k,v){const m=M();m.shop=m.shop||{};if(v)m.shop[k]=1;else delete m.shop[k];save();render100()};
window.wmUntick=function(){M().shop={};save();render100()};
window.wmShare=async function(){const t=shopText(M());
 try{if(navigator.share){await navigator.share({title:'Список покупок',text:t});return}}catch(e){if(e&&e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(t);toast('Список скопирован — можно вставить в мессенджер');return}catch(e){}
 openPop('Список покупок',`<p class="m">Скопируйте текст и отправьте, куда удобно.</p><textarea readonly style="width:100%;min-height:240px;margin-top:8px;font-size:13px">${esc(t)}</textarea>`)};
/* старое «меню на день» теперь открывает неделю на сегодняшнем дне */
window.planMenu=function(){wmOpen('menu')};
try{planMenu=window.planMenu}catch(e){}

/* --- карточка на вкладке «Макро» --- */
function cardFill(){try{const u=U();if(!u||!u.p)return;const c=document.getElementById('t-carb');if(!c)return;
 let card=c.querySelector('#wmCard');
 if(!card){const btn=c.querySelector('button[onclick="planMenu()"]');card=btn&&btn.closest('.card');if(!card)return;card.id='wmCard';
  const h=card.querySelector('h2');if(h)h.textContent='Меню на день и неделю';
  const host=card.querySelector('.fbody')||card;[...host.children].forEach(e=>{if(e.tagName!=='H2')e.remove()});host.insertAdjacentHTML('beforeend','<div id="wmCardB"></div>')}
 const b=card.querySelector('#wmCardB');if(!b)return;const m=u.menu;
 if(m&&m.days&&m.days.length&&dayIdx(m)>=0&&dayIdx(m)<=6){const D=m.days[dayIdx(m)],sl=slotsOf(m),s=sum(D.items);
  b.innerHTML=`<p class="m">Сегодня по меню: ${fmt(s.k)} ккал · ${DIETN[m.diet].toLowerCase()} питание</p>`+D.items.map((it,i)=>`<div class="item"><span><small style="color:var(--mut)">${sl[i]?sl[i][0]:''}</small><br>${esc(DISHES[it.id].n)}</span><span>${fmt(DISHES[it.id].k*it.x)}</span></div>`).join('')+`<div class="row" style="margin-top:12px"><button class="btn sm" onclick="wmOpen('menu')">Открыть меню</button><button class="btn ghost sm" onclick="wmOpen('shop')">🛒 Покупки</button></div>`}
 else b.innerHTML=`<p class="m">${m?'Неделя по прошлому меню закончилась. ':''}Составлю меню на 7 дней под вашу норму калорий и БЖУ, с заменой блюд в одно касание и списком покупок по отделам магазина.</p><button class="btn" onclick="${m?'wmOpen(\'menu\');wmNew()':'wmOpen(\'menu\')'}">Составить меню на неделю</button>`;
}catch(e){}}
window.wmCardFill=cardFill;
try{const _r=render;render=function(){const x=_r.apply(this,arguments);cardFill();return x}}catch(e){}
try{const _g=go;go=function(id){const x=_g.apply(this,arguments);if(id==='carb')cardFill();return x}}catch(e){}

/* --- кнопка в «Ещё» --- */
try{if(typeof tlMore==='function'){const _tm=tlMore;tlMore=function(){const h=_tm.apply(this,arguments);return`<button class="btn" style="margin:0 0 16px" onclick="wmOpen('menu')">🗓 Меню на неделю и покупки</button>`+h}}}catch(e){}

/* --- стили --- */
document.head.insertAdjacentHTML('beforeend',`<style>
#wmSheet .hlin{max-width:640px;margin:0 auto}
.wm-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:0 0 12px}
.wm-days button{display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 0;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--txt);font:inherit;cursor:pointer;min-width:0}
.wm-days button small{font-size:11px;color:var(--mut)}.wm-days button b{font-size:15px}
.wm-days button.td{border-color:var(--lime)}
.wm-days button.on{background:var(--lime);color:var(--on)}.wm-days button.on small{color:var(--on);opacity:.8}
.wm-sum{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:10px;font-size:14px}
.wm-sum>div:first-child{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.wm-mac{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:12.5px;color:var(--mut)}
.wm-ok{font-style:normal;font-weight:800;margin-left:2px}.wm-ok.y{color:var(--lime)}.wm-ok.n{color:var(--warn)}
.wm-it{border:1px solid var(--line);border-radius:16px;padding:12px;margin-bottom:10px;background:var(--card)}
.wm-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.wm-top small{display:block;color:var(--mut);font-size:12px}.wm-top b{font-size:15px;line-height:1.3;overflow-wrap:anywhere}
.wm-k{white-space:nowrap;font-weight:800}.wm-k small{font-weight:400;color:var(--mut);font-size:12px}
.wm-ing{margin-top:6px;font-size:12.5px;overflow-wrap:anywhere}.wm-bju{font-size:12px;margin-top:2px}
.wm-act{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.wm-act .btn.sm{flex:1 1 120px;padding:10px 12px;font-size:14px}
.wm-done{opacity:.75}
.wm-note{border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:12px;font-size:13px}
.wm-set{margin-top:16px;border-top:1px solid var(--line);padding-top:12px}.wm-set summary{cursor:pointer;color:var(--lime);font-weight:700;font-size:14px}
.wm-set .chip2{cursor:pointer}
.wm-dep{font-size:13px;color:var(--lime);margin:16px 0 4px;text-transform:uppercase;letter-spacing:.04em}
.wm-sh{display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;cursor:pointer}
.wm-sh input{width:22px;height:22px;flex:none;accent-color:var(--lime)}
.wm-sh span{flex:1;min-width:0}.wm-sh b{font-weight:600;white-space:nowrap;font-size:13px;color:var(--mut)}
.wm-sh.on span{text-decoration:line-through;opacity:.6}
.wm-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden;margin:8px 0 4px}.wm-bar i{display:block;height:100%;background:var(--lime);transition:width .3s}
@media (max-width:360px){.wm-sh b{white-space:normal;text-align:right;max-width:44%}.wm-top b{font-size:14px}}
</style>`);
setTimeout(cardFill,0);
})();
