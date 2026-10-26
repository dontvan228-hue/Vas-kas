/* ===== v99: гостевой режим — сначала польза, потом регистрация ===== */
(function(){
 if(typeof db==='undefined'||typeof doAuth!=='function')return;
 const $g=s=>document.querySelector(s);
 const GP='guest:';
 const isG=k=>typeof k==='string'&&k.indexOf(GP)===0;
 const guest=()=>{try{return isG(me)}catch(e){return false}};
 window.isGuest=guest;
 const gKey=()=>Object.keys(db.users||{}).find(isG)||null;
 const lastMail=()=>{try{return localStorage.getItem('flow_last_mail')||''}catch(e){return ''}};
 const hasAcc=()=>!!lastMail()||Object.keys(db.users||{}).some(k=>!isG(k));

 document.head.insertAdjacentHTML('beforeend','<style>#auth .g99h{display:none!important}#g99{margin:16px 0 4px}#g99 .btn{margin-top:8px}#g99 p.m{text-align:center;font-size:13px;margin-top:8px}#g99Back{display:block;margin:12px auto 0;background:none;border:0;color:inherit;opacity:.85;text-decoration:underline;font:inherit;font-size:14px;padding:8px;cursor:pointer}#g99Save .row{margin-top:10px}</style>');

 /* ---------- экран входа: «Начать без регистрации» главное, форма по кнопке ---------- */
 let ui=null;
 function authUI(){
  const card=$g('#auth .card'),tabs=$g('#auth .tabs2'),mail=$g('#aMail'),pass=$g('#aPass'),btn=$g('#aBtn');
  if(!card||!tabs||!mail||!pass||!btn)return null;
  if(ui)return ui;
  tabs.insertAdjacentHTML('beforebegin','<div id="g99"><button type="button" class="btn" id="g99Go">Начать без регистрации</button><p class="m" id="g99Note">Анкета займёт минуту. Аккаунт можно создать потом, записи сохранятся.</p><button type="button" class="btn ghost" id="g99Acc">У меня есть аккаунт</button></div>');
  btn.insertAdjacentHTML('afterend','<button type="button" id="g99Back"></button>');
  const form=[tabs,$g('#fName'),mail.previousElementSibling,mail,pass.previousElementSibling,pass,$g('#aErr'),btn].filter(Boolean);
  ui={form,box:$g('#g99'),go:$g('#g99Go'),acc:$g('#g99Acc'),back:$g('#g99Back'),note:$g('#g99Note')};
  ui.go.addEventListener('click',guestStart);
  ui.acc.addEventListener('click',()=>{formOpen(true);try{authMode(lastMail()?'login':'login')}catch(e){};try{(lastMail()?pass:mail).focus()}catch(e){}});
  ui.back.addEventListener('click',()=>{if(guest()&&U()){try{enter()}catch(e){}}else{formOpen(false)}});
  return ui}
 function formOpen(open){const u=authUI();if(!u)return;
  u.form.forEach(e=>e.classList.toggle('g99h',!open));
  u.box.hidden=open;
  const g=guest();
  u.back.hidden=!open;
  u.back.textContent=g?'Вернуться без регистрации':(gKey()?'Продолжить без регистрации':'Начать без регистрации');
  u.go.textContent=gKey()?'Продолжить без регистрации':'Начать без регистрации'}
 function authState(){try{const g=guest();
  if(g){formOpen(true);authMode('reg');const e=$g('#aErr');if(e)e.textContent='';return}
  formOpen(hasAcc())}catch(e){}}

 function guestStart(){try{
  let k=gKey();
  if(!k){k=GP+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
   db.users[k]={name:'Друг',salt:'',hash:'',p:null,days:{},weights:[],adapt:null,guest:1,gAt:Date.now()}}
  me=k;db.session=k;save();enter()}catch(e){try{toast('Не получилось начать. Обновите страницу')}catch(_){}}}
 window.guestStart=guestStart;

 /* ---------- облако: для гостя ничего не отправляем и не тянем ---------- */
 const noCloud=()=>{if(guest()){try{CL=null}catch(e){}return true}return false};
 const wrapA=name=>{try{const f=window[name];if(typeof f!=='function')return;const w=async function(){if(noCloud())return null;return f.apply(this,arguments)};window[name]=w}catch(e){}};
 ['clPush','clPull','clRefresh46','clUse','clAuth'].forEach(wrapA);
 try{const _rc=renderCloud;renderCloud=function(){if(guest()){const e=$g('#cloudBox');if(e)e.innerHTML='<p class="m">Облако работает с аккаунтом. Создайте его, и записи с этого телефона сохранятся, а открыть их можно будет на любом устройстве.</p><button class="btn" onclick="guestSave()">Создать аккаунт</button>';return}return _rc.apply(this,arguments)}}catch(e){}

 /* вход в приложение: у гостя в памяти нет чужой облачной сессии */
 try{const _en=enter;enter=function(){noCloud();return _en.apply(this,arguments)}}catch(e){}

 /* ---------- «Сохраните данные» ---------- */
 window.guestSave=function(){try{closeSheet()}catch(e){}show('auth');authState();try{const n=$g('#aName');if(n&&U()&&U().name&&U().name!=='Друг')n.value=U().name;$g('#aMail').focus()}catch(e){}};
 window.guestLater=function(){try{U().gNudge=Date.now();save();render()}catch(e){}};
 function needNudge(u){if(!u||!u.p)return false;if(u.gNudge&&Date.now()-u.gNudge<864e5)return false;
  const food=Object.values(u.days||{}).some(d=>d&&d.food&&d.food.length);
  const day2=u.gAt&&new Date(u.gAt).toDateString()!==new Date().toDateString();
  return food||day2}
 try{if(typeof TD_ORDER!=='undefined'&&Array.isArray(TD_ORDER)&&!TD_ORDER.includes('g99Save'))TD_ORDER.unshift('g99Save')}catch(e){}
 function nudge(){try{const u=U(),t=$g('#t-today');let c=$g('#g99Save');
  if(!guest()||!needNudge(u)||!t){if(c)c.remove();return}
  if(!c){t.insertAdjacentHTML('afterbegin','<div class="card" id="g99Save"><h2 style="margin:0 0 6px">Сохраните данные</h2><p class="m">Сейчас записи хранятся только в этом браузере. Если очистить его или сменить телефон, они пропадут. Создайте аккаунт: всё уже записанное останется.</p><div class="row"><button class="btn" onclick="guestSave()">Создать аккаунт</button><button class="btn ghost" onclick="guestLater()">Позже</button></div></div>');}
  else if(t.firstElementChild!==c)t.insertBefore(c,t.firstElementChild)}catch(e){}}
 function meFix(){try{if(!guest())return;const p=$g('#meInfo p');if(p&&p.innerHTML.indexOf(GP)>-1)p.innerHTML=p.innerHTML.replace(/ • guest:[^<]*/,' • без аккаунта, данные на этом устройстве');
  const d=$g('#t-me .meDel');if(d)d.textContent='Удалить данные гостя'}catch(e){}}
 try{const _r=render;render=function(){const x=_r.apply(this,arguments);nudge();meFix();return x}}catch(e){}

 /* ---------- регистрация гостя: переносим его записи под почту ---------- */
 try{const _da=doAuth;doAuth=async function(){
  const mail=(($g('#aMail')||{}).value||'').trim().toLowerCase();
  if(isG(mail)){const e=$g('#aErr');if(e)e.textContent='Введите корректную почту';return}
  if(!(guest()&&mode==='reg'))return _da.apply(this,arguments);
  const pw=$g('#aPass').value,err=$g('#aErr'),btn=$g('#aBtn');
  if(!/^\S+@\S+\.\S+$/.test(mail))return err.textContent='Введите корректную почту';
  if(pw.length<6)return err.textContent='Пароль должен быть не короче 6 символов';
  if(db.users[mail])return err.textContent='Эта почта уже есть на этом телефоне. Укажите другую или войдите во вкладке «Вход»: записи гостя останутся на устройстве.';
  if(btn.disabled)return;btn.disabled=true;err.textContent='Сохраняем…';
  try{
   const old=me,g=db.users[old];if(!g){err.textContent='';return _da.apply(this,arguments)}
   let cr=null;try{cr=await cloudTry(mail,pw)}catch(e){cr=null}
   const salt=Math.random().toString(36).slice(2);
   g.salt=salt;g.hash=await hash(pw,salt);
   const nm=(($g('#aName')||{}).value||'').trim();if(nm)g.name=nm;else if(!g.name)g.name='Друг';
   delete g.guest;delete g.gNudge;
   db.users[mail]=g;delete db.users[old];
   me=mail;db.session=mail;try{localStorage.setItem('flow_last_mail',mail)}catch(e){}
   save();
   /* картинки героя лежат в IndexedDB под старым ключом */
   try{if(typeof SLOTS!=='undefined'&&typeof idbGet==='function')(async()=>{for(const x of SLOTS){try{const v=await idbGet(old+':'+x[0]);if(v){await idbSet(mail+':'+x[0],v);await idbSet(old+':'+x[0],null)}}catch(e){}}})()}catch(e){}
   let msg='Аккаунт создан, записи сохранены';
   if(cr&&cr.fail){CL=null;try{localStorage.removeItem('flow_cloud')}catch(e){}msg='Аккаунт создан на этом телефоне. Облако подключите позже в «Профиле»'}
   else if(cr){const c=cr.c;if(c&&c.data&&c.data.p){CL.ready=false;CL.has=true;msg='У этой почты уже есть данные в облаке. В «Профиле» выберите, какие оставить'}else{CL.ready=true;CL.has=!!c;CL.last=null}clSave()}
   else{try{const st=JSON.parse(localStorage.getItem('flow_cloud')||'null');if(st&&st.user&&String(st.user.email||'').toLowerCase()!==mail)localStorage.removeItem('flow_cloud')}catch(e){}CL=null;try{cloudSignup(mail,pw)}catch(e){}}
   err.textContent='';$g('#aPass').value='';
   try{HERME=null}catch(e){}
   enter();try{toast(msg)}catch(e){}
  }catch(e){err.textContent='Не получилось сохранить. Попробуйте ещё раз'}
  finally{btn.disabled=false}}}catch(e){}

 /* ---------- выход и удаление для гостя ---------- */
 try{const _lo=logout;logout=function(){
  if(guest()&&!window._g99out){try{openPop('Выйти без аккаунта?','<p class="m">Записи останутся только на этом устройстве. Вернуться к ним можно кнопкой «Продолжить без регистрации». Чтобы не потерять их, создайте аккаунт.</p><button class="btn" onclick="guestSave()">Создать аккаунт</button><button class="btn ghost" onclick="window._g99out=1;closeSheet();logout()">Всё равно выйти</button>');return}catch(e){}}
  window._g99out=0;const r=_lo.apply(this,arguments);try{authState()}catch(e){}return r}}catch(e){}
 try{const _sh=show;show=function(id){const r=_sh.apply(this,arguments);if(id==='auth')authState();return r}}catch(e){}
 try{authUI();const a=$g('#auth');if(a&&!a.hidden)authState()}catch(e){}
})();
