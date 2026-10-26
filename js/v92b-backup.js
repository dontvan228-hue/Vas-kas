/* ===== v92b: резервная копия в файл и восстановление =====
   подключать после js/v92-data.js */
(function(){
'use strict';
const FMT='vasskass-backup',VER=1,REF='idbref:',DAY=864e5;
const bkKey=()=>'flow_bk:'+me;
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const walk=(o,f,d)=>{if(!o||typeof o!=='object'||(d||0)>14)return;for(const k in o){const v=o[k];if(typeof v==='string')f(o,k,v);else if(v&&typeof v==='object')walk(v,f,(d||0)+1)}};
const stamp=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const cleanOut=u=>{const c=JSON.parse(JSON.stringify(u));delete c.salt;delete c.hash;return c};

/* ---------- экспорт: весь пользователь, картинки по ссылкам берём из IDB ---------- */
async function bkBuild(){const u=cleanOut(U());const need=[];walk(u,(o,k,v)=>{if(v.startsWith(REF))need.push([o,k,v.slice(REF.length)])});
 let miss=0;for(const [o,k,id] of need){let v=null;try{v=await idbGet('media:'+id)}catch(e){}if(typeof v==='string')o[k]=v;else{delete o[k];miss++}}
 return {f:{format:FMT,version:VER,date:new Date().toISOString(),app:'VASSKASS • FLOW',email:me,user:u},miss}}
exportData=async function(){try{if(!me||!U())return;const {f,miss}=await bkBuild();
 const b=new Blob([JSON.stringify(f)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='vasskass-backup-'+stamp()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
 lsSet(bkKey(),String(Date.now()));const n=(f.user.photos||[]).length;toast('Копия сохранена в файл'+(n?' (фото: '+n+')':'')+(miss?'. '+miss+' картинок не нашлось':''));try{bkCard()}catch(e){}}
 catch(e){toast('Не удалось сделать копию: '+String(e&&e.message||e).slice(0,80))}};

/* ---------- импорт ---------- */
let BKIN=null;
function bkParse(t){let o;try{o=JSON.parse(t)}catch(e){return null}if(!o||typeof o!=='object'||Array.isArray(o))return null;
 let u=null;if(o.format===FMT&&o.user&&typeof o.user==='object')u=o.user;
 else if(o.days||o.weights||o.p)u=o;/* старый flow-data.json: просто объект пользователя */
 if(!u||typeof u!=='object')return null;
 if(u.days!=null&&(typeof u.days!=='object'||Array.isArray(u.days)))return null;
 if(u.weights!=null&&!Array.isArray(u.weights))return null;
 if(u.photos!=null&&!Array.isArray(u.photos))return null;
 u=JSON.parse(JSON.stringify(u));delete u.salt;delete u.hash;
 walk(u,(x,k,v)=>{if(v.startsWith(REF))delete x[k]});/* ссылки на чужую IDB бесполезны */
 if(Array.isArray(u.photos))u.photos=u.photos.filter(p=>p&&typeof p.img==='string'&&p.img);
 return {u,date:o.date||null,old:o.format!==FMT}}
function bkPick(){let i=document.getElementById('bkIn');if(!i){document.body.insertAdjacentHTML('beforeend','<input type="file" id="bkIn" accept=".json,application/json" style="display:none">');i=document.getElementById('bkIn');i.onchange=()=>bkFile(i.files&&i.files[0])}i.value='';i.click()}
function bkFile(f){if(!f)return;const r=new FileReader();r.onload=()=>{const x=bkParse(String(r.result||''));if(!x)return toast('Это не файл резервной копии приложения');BKIN=x;
 const d=Object.keys(x.u.days||{}).length,ph=(x.u.photos||[]).length,w=(x.u.weights||[]).length;
 openPop('Восстановить из файла',`<p class="m">${x.date?'Копия от '+esc(String(x.date).slice(0,10))+'. ':''}${x.old?'Старый формат, без фото. ':''}В файле: дней ${d}, взвешиваний ${w}, фото ${ph}.</p><p class="m" style="margin-top:8px">Перед восстановлением мы сохраним копию текущих данных в памяти браузера.</p><button class="btn" onclick="bkApply('merge')">Объединить с текущими</button><button class="btn ghost" onclick="bkApply('replace')">Заменить текущие данные</button><button class="btn ghost" onclick="closeSheet()">Отмена</button>`)};r.onerror=()=>toast('Не удалось прочитать файл');r.readAsText(f)}
async function bkApply(mode){const x=BKIN;if(!x||!me||!U())return;BKIN=null;try{closeSheet()}catch(e){}
 const u=U();
 /* копия текущего состояния: без неё ничего не делаем */
 try{await idbSet('bak:import:'+me,{ts:Date.now(),mode,s:JSON.stringify(u)});const c=await idbGet('bak:import:'+me);if(!c||!c.s)throw 0}catch(e){return toast('Не удалось сделать копию текущих данных, восстановление отменено')}
 const r=x.u;
 if(mode==='replace'){const keep={salt:u.salt,hash:u.hash};Object.keys(u).forEach(k=>delete u[k]);Object.assign(u,r,keep);u.days=u.days||{};u.weights=u.weights||[]}
 else{try{clMergeInto(u,r)}catch(e){}
  for(const k in r)if(u[k]===undefined)u[k]=r[k];/* поля, которых нет локально, берём из файла */
  if(Array.isArray(r.photos)){const have=new Set((u.photos||[]).map(p=>p&&p.img));const add=r.photos.filter(p=>!have.has(p.img));if(add.length)u.photos=(u.photos||[]).concat(add).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0)}
  if(r.look&&r.look.pic&&!(u.look&&u.look.pic))u.look=Object.assign(u.look||{},{pic:r.look.pic})}
 try{window.__v92&&__v92.base()}catch(e){}
 save();try{window.__v92&&await __v92.migrate()}catch(e){}/* фото уходят в IDB, в localStorage остаются ссылки */
 try{if(CL)CL.last=null}catch(e){}
 try{render();applyLook()}catch(e){}
 toast(mode==='replace'?'Данные заменены из файла':'Данные из файла объединены')}
window.bkPick=bkPick;window.bkApply=bkApply;

/* ---------- кнопки в профиле и напоминание раз в 30 дней ---------- */
function bkUI(){const m=document.querySelector('#t-me .meLinks');if(!m)return;
 const e=m.querySelector('button[onclick="exportData()"]');if(e&&e.textContent!=='Резервная копия в файл')e.textContent='Резервная копия в файл';
 if(!document.getElementById('bkRest'))m.insertAdjacentHTML('afterend','<div class="meLinks" id="bkRest"><button onclick="bkPick()">Восстановить из файла</button></div>')}
function bkDue(){try{if(!me||!U()||!U().p)return false;if(typeof CL!=='undefined'&&CL&&CL.ready)return false;if(typeof isTest==='function'&&isTest())return false;
 const t=+lsGet(bkKey())||0;if(!t){lsSet(bkKey(),String(Date.now()));return false}return Date.now()-t>30*DAY}catch(e){return false}}
function bkCard(){const c=document.getElementById('bkCard'),due=bkDue();if(!due){if(c)c.remove();return}if(c)return;const h=document.getElementById('t-today');if(!h)return;
 h.insertAdjacentHTML('beforeend','<div class="card" id="bkCard"><h2>💾 Сделайте резервную копию</h2><p class="m">Данные хранятся только на этом телефоне. Сохраните копию в файл или включите облако в профиле.</p><div class="row" style="margin-top:10px"><button class="btn" style="margin:0" onclick="exportData()">Сохранить копию</button><button class="btn ghost" style="margin:0" onclick="bkLater()">Позже</button></div></div>')}
window.bkLater=function(){lsSet(bkKey(),String(Date.now()));const c=document.getElementById('bkCard');if(c)c.remove()};
try{const _r=render;render=function(){const x=_r.apply(this,arguments);try{bkUI();bkCard()}catch(e){}return x}}catch(e){}
try{if(me&&U()&&U().p){bkUI();bkCard()}}catch(e){}
window.__v92b={bkParse,bkBuild,bkApply:(m,x)=>{BKIN=x;return bkApply(m)}};
})();
