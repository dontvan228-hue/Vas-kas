/* ===== v92: надёжность данных =====
   1) напоминания: защита от повторов при тройном setInterval(tick)
   2) localStorage: фото и фон живут в IndexedDB, в flow_db_v4 остаётся ссылка; понятное предупреждение при переполнении
   3) облако: надгробия для удалённых записей, метки изменения дня, слияние вместо выбора, запись с проверкой updated_at
   4) heroWords: работает только для мужского рода и не чаще раза в 200 мс */
(function(){
'use strict';
const REF='idbref:',MK='media:',FBK='dbfallback',DAY=864e5;
const now=()=>Date.now();
const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
/* хеш строки: 2×32 бита + длина */
const h2=s=>{let a=0x811c9dc5,b=0;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=(b*31+c)|0}return (a>>>0).toString(36)+(b>>>0).toString(36)};
const mkId=s=>s.length.toString(36)+'_'+h2(s);
const isImg=s=>typeof s==='string'&&s.length>=2000&&s.startsWith('data:image/');
const walk=(o,f,d)=>{if(!o||typeof o!=='object'||(d||0)>14)return;for(const k in o){const v=o[k];if(typeof v==='string')f(o,k,v);else if(v&&typeof v==='object')walk(v,f,(d||0)+1)}};
const idbOK=typeof idbGet==='function'&&typeof idbSet==='function';

/* ---------- 1. напоминания ---------- */
/* базовый tick вызывается тремя интервалами (стр. 764/863/963): ссылки на старые функции уже у таймеров,
   поэтому гасим повторы в fire(): u.nf уже не даёт показать одно и то же дважды за день, плюс защита по времени */
try{const _fi=fire,FT={};fire=function(id){const n=now();if(FT[id]&&n-FT[id]<15000)return;FT[id]=n;return _fi.apply(this,arguments)}}catch(e){}
try{const _tk=tick;let tl=0;tick=function(){const n=now();if(n-tl<15000)return;tl=n;return _tk.apply(this,arguments)}}catch(e){}

/* ---------- 2. медиа в IndexedDB ---------- */
const MED=new Map(),MID=new Map();/* данные → id и id → данные: только то, что проверено в IDB */
let medReady=false,OFF=false,FB=false,migBusy=false,migFail=0,qT=0,medDone;
const medP=new Promise(r=>medDone=r);
const SV0=+(db&&db._sv)||0;try{delete db._sv}catch(e){}
const isQ=e=>!!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014);
const RE=/"([A-Za-z0-9_$]{1,24})":"(data:image\/[a-z+.-]+;base64,[A-Za-z0-9+\/=]{1900,})"/g;
function qWarn(){if(now()-qT<30000)return;qT=now();try{let e=document.getElementById('v92q');if(e)e.remove();
 document.body.insertAdjacentHTML('beforeend','<div id="v92q" role="alert" style="position:fixed;left:12px;right:12px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:99999;background:#3a1418;color:#fff;border:1px solid #ff6b5a;border-radius:16px;padding:14px 40px 14px 14px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)"><b>Память браузера для приложения заполнена</b><br>Последние изменения могут не сохраниться на этом устройстве. Удалите старые фото прогресса или фото фона, а лучше включите облако в профиле: тогда данные не пропадут. Копию мы пока держим в запасной памяти браузера.<button aria-label="Закрыть" onclick="this.parentNode.remove()" style="position:absolute;top:6px;right:8px;background:none;border:0;color:#fff;font-size:20px;padding:4px">✕</button></div>')}catch(e){}}
const SP=Storage.prototype,_set=SP.setItem;
let postT=0;
SP.setItem=function(k,v){
 let ls=null;try{ls=window.localStorage}catch(e){}
 if(k!==K||this!==ls)return _set.apply(this,arguments);
 let s=String(v);
 try{if(MED.size)s=s.replace(RE,(m,a,d)=>{const id=MED.get(d);return id?'"'+a+'":"'+REF+id+'"':m});
  /* метка сохранения внутри самой записи: по ней понимаем, свежее ли запасная копия */
  s=s.replace(/^\{(?:"_sv":\d+,)?(?=")/,'{"_sv":'+now()+',')}catch(e){s=String(v)}
 try{_set.call(this,k,s)}catch(e){if(isQ(e)){qWarn();if(idbOK)idbSet(FBK,{ts:now(),s}).then(()=>{FB=true}).catch(()=>{});migrate()}throw e}
 if(FB){FB=false;try{idbSet(FBK,null).catch(()=>{})}catch(e){}}
 const left=s.indexOf('"data:image/')>-1;
 if(!postT)postT=setTimeout(()=>{postT=0;if(OFF)return;try{if(stamp())save()}catch(e){}if(left)migrate()},0);
};
/* переносим картинки из db в IDB; в localStorage они заменятся ссылкой только после проверки записи */
async function migrate(){if(!idbOK||!medReady||migBusy||now()-migFail<60000)return 0;migBusy=true;let n=0;
 try{const todo=new Set();walk(db.users,(o,k,v)=>{if(isImg(v)&&!MED.has(v))todo.add(v)});
  for(const v of todo){const id=mkId(v);await idbSet(MK+id,v);const r=await idbGet(MK+id);if(r!==v)throw new Error('IDB: проверка не прошла');MED.set(v,id);MID.set(id,v);n++}}
 catch(e){migFail=now()}
 migBusy=false;if(n&&!OFF)try{save()}catch(e){}return n}
async function boot(){let restored=false,hyd=0;
 if(!idbOK){medReady=true;medDone();return}
 /* запасная копия после переполнения: берём, только если она новее того, что в localStorage */
 try{const fb=await idbGet(FBK);if(fb&&fb.s){if(fb.ts>SV0){const nd=JSON.parse(fb.s);if(nd&&nd.users&&typeof nd.users==='object'){delete nd._sv;db=nd;restored=true;FB=true}}else idbSet(FBK,null).catch(()=>{})}}catch(e){}
 /* подставляем картинки по ссылкам */
 try{const need=new Set();walk(db.users,(o,k,v)=>{if(v.startsWith(REF))need.add(v.slice(REF.length))});
  for(const id of need){try{const v=await idbGet(MK+id);if(isImg(v)){MID.set(id,v);MED.set(v,id)}}catch(e){}}
  walk(db.users,(o,k,v)=>{if(v.startsWith(REF)){const x=MID.get(v.slice(REF.length));if(x){o[k]=x;hyd++}}})}catch(e){}
 medReady=true;medDone();
 if(restored){try{if(db.session&&db.users[db.session])me=db.session}catch(e){}base()}
 const mg=await migrate();
 if((restored||hyd)&&!mg)try{save()}catch(e){}
 if(restored||hyd)try{if(me&&U()&&U().p){render();try{applyLook()}catch(e){}}}catch(e){}
 if(restored)try{toast('Восстановили последние изменения из запасной копии')}catch(e){}}
setTimeout(boot,0);

/* ---------- 3. метки изменений и надгробия ---------- */
const ARR=['food','ex'];
const BL=new WeakMap(),ISIG=new WeakMap();
const sig=x=>{if(!x||typeof x!=='object')return JSON.stringify(x);const o={};Object.keys(x).sort().forEach(k=>{if(k!=='_id'&&k!=='_u')o[k]=x[k]});return JSON.stringify(o)};
const rid=()=>now().toString(36)+Math.random().toString(36).slice(2,8);
const tk=(k,f,x)=>'f|'+k+'|'+f+'|'+(x._id||('c'+h2(ISIG.get(x)||sig(x))));
function snapDay(d){const p={d,arr:{},sc:{}};
 ARR.forEach(f=>{const a=Array.isArray(d[f])?d[f]:null;p.arr[f]=a;p.ref=p.ref||{};p.ref[f]=a?a.slice():[];(a||[]).forEach(x=>{if(x&&typeof x==='object')ISIG.set(x,sig(x))})});
 for(const k in d)if(!ARR.includes(k)&&k!=='ts'&&k!=='_t')p.sc[k]=JSON.stringify(d[k]);return p}
function snap(u){const b={days:new Map(),w:null};const ds=u.days||{};for(const k in ds){const d=ds[k];if(d&&typeof d==='object')b.days.set(k,snapDay(d))}
 const W=Array.isArray(u.weights)?u.weights:null;b.w={arr:W,ref:W?W.slice():[]};(W||[]).forEach(x=>{if(x&&typeof x==='object')ISIG.set(x,sig(x))});return b}
function base(){try{for(const m in db.users){const u=db.users[m];if(u&&typeof u==='object')BL.set(u,snap(u))}}catch(e){}}
/* сравниваем с прошлым снимком: новое получает id и метку, удалённое — надгробие, изменённое поле — метку d._t */
function stamp(){const u=me&&db&&db.users&&db.users[me];if(!u||typeof u!=='object')return 0;const b=BL.get(u);if(!b){BL.set(u,snap(u));return 0}
 const t=now();let ch=0;const T=()=>u.tomb||(u.tomb={});const ds=u.days||{};
 for(const k in ds){const d=ds[k];if(!d||typeof d!=='object')continue;const p=b.days.get(k);
  if(p&&p.d!==d){b.days.set(k,snapDay(d));continue}/* день заменили целиком (загрузка из облака): без меток */
  let dc=0;const tt=()=>d._t||(d._t={});
  for(const f of ARR){const cur=Array.isArray(d[f])?d[f]:[],prev=p?p.ref[f]:[],ps=new Set(prev),cs=new Set(cur);let fc=0;
   prev.forEach(x=>{if(x&&typeof x==='object'&&!cs.has(x)){T()[tk(k,f,x)]=t;fc++}});
   cur.forEach(x=>{if(!x||typeof x!=='object')return;
    if(!ps.has(x)){x._id=rid();x._u=t;fc++}
    else{const s=sig(x);if(s!==ISIG.get(x)){if(!x._id){T()[tk(k,f,x)]=t;x._id=rid()}x._u=t;fc++}}});
   if(fc){if(p)tt()[f]=t;dc++}}
  if(p){const seen=new Set();for(const key in d){if(ARR.includes(key)||key==='ts'||key==='_t')continue;seen.add(key);if(JSON.stringify(d[key])!==p.sc[key]){tt()[key]=t;dc++}}
   for(const key in p.sc)if(!seen.has(key)){tt()[key]=t;dc++}}
  else for(const key in d){if(ARR.includes(key)||key==='ts'||key==='_t')continue;const v=d[key];if(v&&!(Array.isArray(v)&&!v.length)){tt()[key]=t;dc++}}/* новый день: метим только не пустые значения */
  if(dc){d.ts=t;ch++}
  b.days.set(k,snapDay(d))}
 const W=Array.isArray(u.weights)?u.weights:null;
 if(W&&W===b.w.arr){const ps=new Set(b.w.ref),cs=new Set(W);
  b.w.ref.forEach(x=>{if(x&&x.d&&!cs.has(x)&&!W.some(y=>y&&y.d===x.d)){T()['w|'+x.d]=t;ch++}});
  W.forEach(x=>{if(!x||typeof x!=='object')return;if(!ps.has(x)||sig(x)!==ISIG.get(x)){x.ts=t;ch++}})}
 b.w={arr:W,ref:W?W.slice():[]};(W||[]).forEach(x=>{if(x&&typeof x==='object')ISIG.set(x,sig(x))});
 if(u.tomb&&ch&&Math.random()<.1){for(const k in u.tomb)if(t-u.tomb[k]>180*DAY)delete u.tomb[k]}
 return ch}
base();
try{const _en=enter;enter=function(){try{stamp()}catch(e){}return _en.apply(this,arguments)}}catch(e){}
const flush=()=>{if(OFF)return;try{if(stamp())save()}catch(e){}};
window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
try{const _to=testOff;testOff=function(){OFF=true;return _to.apply(this,arguments)}}catch(e){}

/* слияние списка записей дня: по id, старые записи без id — по содержимому */
function mArr(u,a,b,k,f){const L=Array.isArray(a[f])?a[f]:null,R=Array.isArray(b[f])?b[f]:[];if(!L&&!R.length)return;
 const tm=u.tomb||{},lt=(a._t&&a._t[f])||0,P='f|'+k+'|'+f+'|';
 const rc=new Map();R.forEach(x=>{if(x&&typeof x==='object'&&!x._id){const s=sig(x);rc.set(s,(rc.get(s)||0)+1)}});
 const out=[],ids=new Map(),lc=new Map();
 (L||[]).forEach(x=>{if(!x||typeof x!=='object'){out.push(x);return}
  if(x._id){if(tm[P+x._id])return;ids.set(x._id,out.length);out.push(x);return}
  const s=sig(x),n=(lc.get(s)||0)+1,ct=tm[P+'c'+h2(s)];lc.set(s,n);
  if(ct&&ct>lt&&n>(rc.get(s)||0))return;/* удалено на другом устройстве позже нашей правки */
  out.push(x)});
 const av=new Map();out.forEach(x=>{if(x&&typeof x==='object'&&!x._id){const s=sig(x);av.set(s,(av.get(s)||0)+1)}});
 R.forEach(y=>{if(!y||typeof y!=='object')return;
  if(y._id){if(tm[P+y._id])return;if(ids.has(y._id)){const i=ids.get(y._id);if((y._u||0)>(out[i]._u||0))out[i]=clone(y);return}ids.set(y._id,out.length);out.push(clone(y));return}
  const s=sig(y),c=av.get(s)||0;if(c>0){av.set(s,c-1);return}if(tm[P+'c'+h2(s)])return;out.push(clone(y))});
 a[f]=out;const bt=(b._t&&b._t[f])||0;if(bt>lt)(a._t||(a._t={}))[f]=bt}
function mDay(u,a,b,k){for(const f of ARR)mArr(u,a,b,k,f);
 const ta=a._t||{},tb=b._t||{};
 for(const key in b){if(ARR.includes(key)||key==='ts'||key==='_t')continue;const va=a[key],vb=b[key],x=ta[key]||0,y=tb[key]||0;
  if(va===undefined){a[key]=clone(vb);if(y)ta[key]=y;continue}
  if(y>x){a[key]=clone(vb);ta[key]=y}
  else if(!x&&!y&&key==='water'&&+vb>+va)a.water=vb}/* старое правило для воды без меток: больше */
 if(Object.keys(ta).length)a._t=ta;const ts=Math.max(a.ts||0,b.ts||0);if(ts)a.ts=ts}
function mergeDW(u,r){const before=JSON.stringify([u.days,u.weights,u.tomb]);
 if(r.tomb&&typeof r.tomb==='object'){const T=u.tomb||{};let n=0;for(const k in r.tomb){const v=+r.tomb[k]||0;if(v>(T[k]||0)){T[k]=v;n++}}if(n||u.tomb)u.tomb=T}
 u.days=u.days||{};const rd=(r.days&&typeof r.days==='object')?r.days:{};
 for(const k of new Set([...Object.keys(u.days),...Object.keys(rd)])){const a=u.days[k],b=rd[k];
  if(!a&&!b)continue;
  if(!a){const c=clone(b);mDay(u,c,{},k);u.days[k]=c;continue}
  if(typeof a!=='object')continue;
  mDay(u,a,(b&&typeof b==='object')?b:{},k)}
 /* вес: по дате, новее метка — главнее, надгробие убирает */
 const tm=u.tomb||{},W=Array.isArray(u.weights)?u.weights:[];
 const out=W.filter(x=>!(x&&x.d&&tm['w|'+x.d]&&tm['w|'+x.d]>(x.ts||0)));const by=new Map();out.forEach(x=>{if(x&&x.d)by.set(x.d,x)});
 (Array.isArray(r.weights)?r.weights:[]).forEach(y=>{if(!y||!y.d)return;const l=by.get(y.d);if(l){if((y.ts||0)>(l.ts||0))Object.assign(l,clone(y));return}
  const t=tm['w|'+y.d];if(t&&t>=(y.ts||0))return;const c=clone(y);out.push(c);by.set(y.d,c)});
 out.sort((x,y)=>x.d<y.d?-1:x.d>y.d?1:0);if(out.length||u.weights)u.weights=out;
 /* старый clRefresh46 после слияния поднимает воду до облачной: выравниваем, чтобы он ничего не менял */
 for(const k in rd)if(rd[k]&&u.days[k])rd[k].water=u.days[k].water;
 return before!==JSON.stringify([u.days,u.weights,u.tomb])?1:0}
try{const _mg=clMergeInto;clMergeInto=function(u,r){if(!u||!r||typeof r!=='object')return _mg.apply(this,arguments);
 try{if(u===U())stamp()}catch(e){}
 /* дни и вес старой цепочке не отдаём: там правило «где больше записей» */
 let ch=_mg.call(this,u,Object.assign({},r,{days:{},weights:[]}))||0;
 try{ch+=mergeDW(u,r)}catch(e){console.error('v92 merge',e)}
 try{BL.set(u,snap(u))}catch(e){}
 return ch}}catch(e){}

/* ---------- облако: что отправляем ---------- */
function payload(){const d=clData();
 walk(d,(o,k,v)=>{if(v.startsWith(REF)){const x=MID.get(v.slice(REF.length));if(x)o[k]=x;else delete o[k]}});
 return d}
const lastHash=()=>{const s=JSON.stringify(clData());return s.length+':'+hashS(s)};
let phWarn=0;
const isDup=e=>/duplicate|conflict|409|23505/i.test(String(e&&e.message||e));
async function pullMerge(){const c=await clPull();clMergedUid=CL.user.id;CL.rtsU=CL.user.id;
 if(c){CL.rts=c.updated_at||null;if(c.data){const u=U();if(u&&clMergeInto(u,c.data)){save();try{render()}catch(e){}}}}else CL.rts=null;
 return c}
try{clPush=async function(){
 if(typeof isTest==='function'&&isTest())return;
 if(!CL||!CL.user)throw new Error('Нужно войти');
 await Promise.race([medP,new Promise(r=>setTimeout(r,5000))]);
 try{if(stamp())save()}catch(e){}
 const uid=CL.user.id;
 for(let i=0;i<4;i++){
  let noRow=false;
  if(!CL.rts||CL.rtsU!==uid||clMergedUid!==uid){const c=await pullMerge();noRow=!c}
  const d=payload(),at=new Date().toISOString();let body=JSON.stringify({user_id:uid,data:d,updated_at:at}),cut=0;
  /* фото прогресса уходят в облако целиком (это резервная копия); не влезаем в лимит — убираем самые старые */
  while(body.length>6e6&&Array.isArray(d.photos)&&d.photos.length){d.photos.shift();cut++;body=JSON.stringify({user_id:uid,data:d,updated_at:at})}
  if(cut&&!phWarn){phWarn=1;try{toast('В облако не поместились '+cut+' самых старых фото прогресса: они остались на этом телефоне')}catch(e){}}
  if(body.length>6e6)throw new Error('Данных слишком много для облака (больше 6 МБ)');
  let res=null;
  if(noRow){try{res=await sbReq('/rest/v1/user_data?select=updated_at',{method:'POST',headers:{Prefer:'return=representation'},body},true)}catch(e){if(isDup(e)){CL.rts=null;continue}throw e}}
  else res=await sbReq('/rest/v1/user_data?user_id=eq.'+encodeURIComponent(uid)+'&updated_at=eq.'+encodeURIComponent(CL.rts)+'&select=updated_at',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data:d,updated_at:at})},true);
  if(Array.isArray(res)&&res.length){CL.rts=res[0].updated_at||at;CL.rtsU=uid;CL.last=lastHash();clSave();return}
  CL.rts=null/* в облаке кто-то успел записать: подтянем, сольём и попробуем снова */}
 throw new Error('Облако занято другим устройством, попробуйте ещё раз')}}catch(e){}

try{clRefresh46=async function(){try{if(!CL||!CL.ready||!CL.user||!me||!U()||clBusy)return;if(typeof isTest==='function'&&isTest())return;clBusy=true;
 const u=U(),c=await clPull();clMergedUid=CL.user.id;clBusy=false;if(!c||!c.data||U()!==u)return;
 const ch=clMergeInto(u,c.data);CL.rts=c.updated_at||null;CL.rtsU=CL.user.id;clSave();if(ch){save();render()}}catch(e){clBusy=false}}}catch(e){}

try{const _cu=clUse;clUse=async function(kind){if(kind!=='pull')return _cu.apply(this,arguments);
 const u=U();let keep=[];try{keep=(u&&Array.isArray(u.photos))?u.photos.slice():[];if(idbOK&&u)await idbSet('bak:pull:'+me,{ts:now(),s:JSON.stringify(u)})}catch(e){}
 const r=await _cu.apply(this,arguments);
 try{const v=U();if(v){/* фото прогресса в облако больше не уходят: оставляем свои */
   if(keep.length){/* если облако без части фото (лимит размера) — добавляем свои недостающие */const have=new Set((v.photos||[]).map(p=>p&&p.img));const add=keep.filter(p=>p&&!have.has(p.img));if(add.length){v.photos=(Array.isArray(v.photos)?v.photos:[]).concat(add).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);save();try{renderPhotos()}catch(e){}}}
   BL.set(v,snap(v));if(CL)CL.rts=null}}catch(e){}
 return r}}catch(e){}

/* ---------- облачная сессия привязана к локальному пользователю (CL.owner) ---------- */
let AUTHM=null;/* почта, для которой сейчас идёт вход в облако */
const low=x=>String(x||'').toLowerCase();
const clOwn=()=>{try{if(!CL||!CL.user||!me)return false;if(!CL.owner&&AUTHM)CL.owner=AUTHM;return !!CL.owner&&CL.owner===low(me)}catch(e){return false}};
window.__v92own=clOwn;
/* старая сессия без владельца: привязываем, только если владелец однозначен */
try{if(CL&&CL.user&&!CL.owner){const ses=low(db&&db.session),em=low(CL.user.email),real=Object.keys((db&&db.users)||{}).filter(k=>k.indexOf('guest:')!==0);
 if(em&&db.users[em])CL.owner=em;else if(ses&&real.length===1&&real[0]===ses)CL.owner=ses;
 if(CL.owner)clSave()}}catch(e){}
const NOT='Облако подключено к другому аккаунту на этом телефоне. Войдите в облако заново';
try{const _pl=clPull;clPull=async function(){if(!AUTHM&&!clOwn())throw new Error(NOT);return _pl.apply(this,arguments)}}catch(e){}
try{const _p=clPush;clPush=async function(){if(typeof isTest==='function'&&isTest())return;if(!clOwn())throw new Error(NOT);return _p.apply(this,arguments)}}catch(e){}
try{const _r=clRefresh46;clRefresh46=async function(){if(!clOwn())return;return _r.apply(this,arguments)}}catch(e){}
try{const _u=clUse;clUse=async function(){if(!clOwn()){clMsg=NOT;try{renderCloud()}catch(e){}return}return _u.apply(this,arguments)}}catch(e){}
const withAuth=(name,mailOf)=>{try{const f=window[name];if(typeof f!=='function')return;window[name]=async function(){const m=low(mailOf.apply(this,arguments));const prev=AUTHM;AUTHM=m;
 try{const r=await f.apply(this,arguments);try{if(CL&&CL.user&&!CL.owner){CL.owner=m;clSave()}}catch(e){}return r}finally{AUTHM=prev}}}catch(e){}};
withAuth('cloudTry',mail=>mail);withAuth('cloudSignup',mail=>mail);withAuth('clAuth',()=>me);
/* выход: облачную сессию отключаем, войти снова можно той же почтой и паролем */
try{const _lo=logout;logout=function(){try{CL=null;localStorage.removeItem('flow_cloud');clMergedUid=''}catch(e){}return _lo.apply(this,arguments)}}catch(e){}
try{const _rc=renderCloud;renderCloud=function(){try{if(CL&&CL.user&&me&&!clOwn()&&!AUTHM){const e=$('#cloudBox');if(e){e.innerHTML='<p class="m">'+NOT+'.</p><button class="btn ghost" onclick="clOut()">Отключить облако на этом телефоне</button>';return}}}catch(e){}return _rc.apply(this,arguments)}}catch(e){}

/* ---------- 4. heroWords ---------- */
try{const _hw=heroWords;let hl=0,ht=0;
 heroWords=function(){try{const u=U();if(!u||!u.p)return;const k=chKey(),male=!!(CHARS[k]&&CHARS[k].male);if(!male&&!isMan())return}catch(e){}
  const n=now();if(n-hl<200){if(!ht)ht=setTimeout(()=>{ht=0;hl=now();try{_hw()}catch(e){}},200-(n-hl));return}
  hl=n;return _hw.apply(this,arguments)}}catch(e){}

/* для проверок */
window.__v92={stamp,mergeDW,payload,MED,MID,medP,migrate,base};
})();
