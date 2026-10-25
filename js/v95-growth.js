/* ===== v95 growth: установка на экран, «Поделиться успехом», заморозка серии ===== */
(function(){
'use strict';
if(window.__g95)return;window.__g95=1;

var DAY=864e5,APP='VASSKASS • FLOW',SITE='https://dontvan228-hue.github.io/Vas-kas/',REF=SITE+'?ref=share';
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}
function usr(){try{return (typeof me!=='undefined'&&me&&typeof U==='function')?U():null}catch(e){return null}}
function tdy(){try{return today()}catch(e){return new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)}}
function say(t){try{toast(t)}catch(e){}}
function plural(n,a,b,c){n=Math.abs(n)%100;var m=n%10;if(n>10&&n<20)return c;if(m>1&&m<5)return b;if(m===1)return a;return c}
function isED(){var u=usr();return !!(u&&u.quiz&&u.quiz.health==='ed')}

/* ---------- 3. Заморозка серии: один пропущенный день не чаще раза в 7 дней ---------- */
function streakInfo(){
  var u=usr();if(!u||!u.days)return {n:0,frozen:[]};
  var k=function(o){return new Date(o).toISOString().slice(0,10)};
  var has=function(o){var d=u.days[k(o)];return !!(d&&d.food&&d.food.length>0)};
  var t=Date.parse(tdy()),n=0,frozen=[],last=Infinity,g=0;
  if(!has(t))t-=DAY;                      // сегодня ещё можно успеть записать
  while(g++<4000){
    if(has(t)){n++;t-=DAY;continue}
    // пропуск ровно одного дня, перед ним есть запись, и прошлая заморозка была не ближе 7 дней
    if(has(t-DAY)&&(last-t)>=7*DAY){frozen.push(k(t));last=t;t-=DAY;continue}
    break;
  }
  return {n:n,frozen:frozen};
}
function freezeState(){
  var f=streakInfo().frozen,t=Date.parse(tdy());
  if(!f.length)return {ok:true};
  var lastF=Date.parse(f[0]),next=lastF+7*DAY;
  return t>=next?{ok:true,used:f[0]}:{ok:false,used:f[0],next:new Date(next).toISOString().slice(0,10)};
}
try{ if(typeof streak==='function'){ streak=function(){try{return streakInfo().n}catch(e){return 0}} } }catch(e){}
window.g95StreakInfo=streakInfo;

/* ---------- общие стили ---------- */
var css=''+
'.g95card{position:relative}.g95card h2{margin-bottom:6px}.g95card p{font-size:13px;color:var(--mut);line-height:1.45}'+
'.g95row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.g95row>button,.g95row>a{flex:1 1 120px;min-width:0}'+
'.g95b{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--lime);color:var(--on);border:0;border-radius:14px;padding:12px 14px;font-weight:800;font-size:14px;cursor:pointer;text-decoration:none;text-align:center}'+
'.g95b.gh{background:transparent;color:var(--lime);border:1px solid var(--line)}'+
'.g95x{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--mut);cursor:pointer;font-size:14px}'+
'.g95ios svg{width:18px;height:18px;vertical-align:-3px;stroke:currentColor;fill:none;stroke-width:2}'+
'#g95m{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}'+
'#g95m .in{width:100%;max-width:440px;max-height:94vh;overflow:auto;background:linear-gradient(var(--g1,#1b2440),var(--g2,#0a1222));color:var(--txt);border:1px solid var(--line);border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));position:relative}'+
'@media(min-width:600px){#g95m{align-items:center}#g95m .in{border-radius:22px}}'+
'#g95m h3{font-size:18px;margin:0 40px 10px 0}#g95m img{display:block;width:100%;max-width:240px;margin:6px auto 10px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.35)}'+
'#g95m .opt{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}#g95m .opt button{flex:1 1 auto;border:1px solid var(--line);background:transparent;color:var(--txt);border-radius:12px;padding:9px 10px;font-size:13px;cursor:pointer}'+
'#g95m .opt button.on{background:var(--lime);color:var(--on);border-color:transparent;font-weight:700}'+
'#g95m label.ck{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--mut);margin:8px 0}#g95m label.ck input{width:20px;height:20px;flex:none}'+
'#g95m .m{font-size:12px;color:var(--mut);margin-top:10px;line-height:1.4}'+
'#g95s{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:150;display:flex;gap:8px;align-items:center;max-width:calc(100% - 32px);width:max-content;background:var(--g2,#0a1222);color:var(--txt);border:1px solid var(--line);border-radius:16px;padding:8px 8px 8px 14px;box-shadow:0 8px 30px rgba(0,0,0,.4);font-size:13px}'+
'#g95s span{min-width:0}#g95s .g95b{padding:8px 12px;font-size:13px;flex:none}#g95s .cl{background:transparent;border:0;color:var(--mut);font-size:16px;cursor:pointer;padding:4px 6px;flex:none}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* ---------- 1. Установка на экран ---------- */
var bip=null,DISK='flow_g95_inst_dis',INSTK='flow_g95_installed',FIRSTK='flow_g95_first';
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();bip=e;soon()});
window.addEventListener('appinstalled',function(){ls(INSTK,'1');bip=null;var c=document.getElementById('g95inst');if(c)c.remove()});
function standalone(){try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}}
function iOS(){var ua=navigator.userAgent||'';return /iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function iOSSafari(){var ua=navigator.userAgent||'';return iOS()&&/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS|GSA\//.test(ua)}
function installMode(){if(standalone()||ls(INSTK))return null;if(bip)return 'prompt';if(iOSSafari())return 'ios';return null}
function firstSeen(){
  var m={};try{m=JSON.parse(ls(FIRSTK)||'{}')||{}}catch(e){}
  var key=String(me||''),d=tdy();if(!m[key]){m[key]=d;ls(FIRSTK,JSON.stringify(m))}
  var u=usr(),min=m[key];
  try{Object.keys(u.days||{}).forEach(function(k){var x=u.days[k];if(x&&(x.food&&x.food.length||x.water)&&k<min)min=k});(u.weights||[]).forEach(function(w){if(w&&w.d&&w.d<min)min=w.d})}catch(e){}
  return min;
}
function installDue(){
  var u=usr();if(!u||!u.p)return false;
  var dis=+ls(DISK)||0;if(dis&&Date.now()-dis<7*DAY)return false;
  var ever=false;try{ever=Object.keys(u.days||{}).some(function(k){var d=u.days[k];return d&&d.food&&d.food.length>0})}catch(e){}
  return ever||firstSeen()<tdy();
}
var SHARE_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v9h12v-9"/></svg>';
function installHTML(mode,inMore){
  if(mode==='ios')return '<p class="g95ios">В Safari нажмите «Поделиться» '+SHARE_SVG+' внизу экрана, затем «На экран "Домой"» и «Добавить». Приложение откроется с иконки, без адресной строки.</p>'+
    (inMore?'':'<div class="g95row"><button class="g95b gh" onclick="g95InstallClose()">Понятно</button></div>');
  return '<p>Иконка на главном экране: открывается в одно касание, работает без интернета, без магазина приложений и рекламы.</p>'+
    '<div class="g95row"><button class="g95b" onclick="g95Install()">Установить</button>'+(inMore?'':'<button class="g95b gh" onclick="g95InstallClose()">Не сейчас</button>')+'</div>';
}
function renderInstall(){
  var c=document.getElementById('g95inst'),mode=installMode();
  if(!mode||!installDue()){if(c)c.remove();return}
  var anchor=document.getElementById('tdEaten');if(!anchor)return;
  if(c&&c.dataset.mode===mode&&c.previousElementSibling===anchor)return;
  if(c)c.remove();
  anchor.insertAdjacentHTML('afterend','<div class="card g95card" id="g95inst" data-mode="'+mode+'"><button class="g95x" aria-label="Закрыть" onclick="g95InstallClose()">✕</button><h2>Установить FLOW на экран</h2>'+installHTML(mode,false)+'</div>');
}
window.g95InstallClose=function(){ls(DISK,String(Date.now()));var c=document.getElementById('g95inst');if(c)c.remove()};
window.g95Install=function(){
  if(!bip){if(iOSSafari())say('Нажмите «Поделиться», затем «На экран "Домой"»');return}
  var p=bip;bip=null;
  try{p.prompt();p.userChoice.then(function(r){if(r&&r.outcome==='accepted'){ls(INSTK,'1');say('Готово! Иконка появится на экране')}else ls(DISK,String(Date.now()));soon()}).catch(function(){})}catch(e){}
  var c=document.getElementById('g95inst');if(c)c.remove();
};

/* ---------- 2. Поделиться успехом ---------- */
function results(){
  var u=usr()||{},q=u.quiz||{},p=u.p||{},sn=0;try{sn=streak()}catch(e){}
  var lw=null;try{lw=lastW()}catch(e){}
  var w0=+p.w0||0,delta=0,kind=null;
  if(w0&&lw){if(q.goal==='gain'||q.goal==='fit'){delta=lw-w0;kind='gain'}else if(q.goal==='lose'||q.goal==='tone'||!q.goal){delta=w0-lw;kind='lose'}}
  delta=Math.round(delta*10)/10;
  var canW=!isED()&&kind&&delta>=0.1;
  var logged=0;try{logged=Object.keys(u.days||{}).filter(function(k){var d=u.days[k];return d&&d.food&&d.food.length}).length}catch(e){}
  return {sn:sn,canW:canW,kind:kind,delta:delta,lw:lw,t:p.t,logged:logged};
}
var S={mode:'streak',showW:false,badge:''};
function fmt(n){return String(n).replace('.',',')}
function cssv(n,f){try{var v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();return v||f}catch(e){return f}}
function heroImg(){return new Promise(function(res){var src='';try{src=chFace(chKey())}catch(e){}if(!src)return res(null);var i=new Image();var to=setTimeout(function(){res(null)},1500);i.onload=function(){clearTimeout(to);res(i)};i.onerror=function(){clearTimeout(to);res(null)};i.src=src})}
function wrapText(ctx,txt,max){var w=txt.split(' '),out=[],cur='';w.forEach(function(x){var t=cur?cur+' '+x:x;if(ctx.measureText(t).width>max&&cur){out.push(cur);cur=x}else cur=t});if(cur)out.push(cur);return out}
function drawCard(){
  var r=results(),W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');
  var bg1=cssv('--bg2','#1b2440'),bg2=cssv('--bg','#0a1222'),acc=cssv('--lime','#c6e3a0');
  if(/var\(/.test(bg1))bg1='#1b2440';if(/var\(/.test(bg2))bg2='#0a1222';if(/var\(/.test(acc))acc='#c6e3a0';
  var g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,bg1);g.addColorStop(1,bg2);x.fillStyle=g;x.fillRect(0,0,W,H);
  x.globalAlpha=.18;x.fillStyle=acc;x.beginPath();x.arc(W*.85,H*.12,260,0,7);x.fill();x.beginPath();x.arc(W*.1,H*.9,200,0,7);x.fill();x.globalAlpha=1;
  var F='-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  x.textAlign='center';x.fillStyle='#fff';x.font='800 44px '+F;x.fillText(APP,W/2,120);
  if(S.badge){x.font='700 36px '+F;var bw=Math.min(W-160,x.measureText(S.badge).width+70);x.fillStyle=acc;x.globalAlpha=.95;
    var bx=(W-bw)/2,by=160;x.beginPath();if(x.roundRect)x.roundRect(bx,by,bw,64,32);else x.rect(bx,by,bw,64);x.fill();x.globalAlpha=1;x.fillStyle='#1a1a1a';x.fillText(S.badge,W/2,by+45)}
  return heroImg().then(function(img){
    var cy=430;
    if(img){x.save();x.beginPath();x.arc(W/2,cy,170,0,7);x.closePath();x.fillStyle='rgba(255,255,255,.12)';x.fill();x.clip();
      var s=Math.max(340/img.width,340/img.height);x.drawImage(img,W/2-img.width*s/2,cy-img.height*s/2,img.width*s,img.height*s);x.restore();
      x.lineWidth=8;x.strokeStyle=acc;x.beginPath();x.arc(W/2,cy,174,0,7);x.stroke()}
    var big,sub,useW=S.mode==='w'&&r.canW;
    if(useW){big=(r.kind==='gain'?'+':'−')+fmt(r.delta)+' кг';sub=r.kind==='gain'?'набрано по плану':'уже позади'}
    else if(r.sn>0){big=String(r.sn);sub=plural(r.sn,'день','дня','дней')+' подряд веду дневник'}
    else if(r.logged>0){big=String(r.logged);sub=plural(r.logged,'день','дня','дней')+' с дневником питания'}
    else{big='Старт';sub='начинаю вести дневник питания'}
    x.fillStyle=acc;x.font='900 '+(big.length>6?190:250)+'px '+F;x.fillText(big,W/2,cy+(img?430:250));
    x.fillStyle='#fff';x.font='700 58px '+F;wrapText(x,sub,W-160).forEach(function(l,i){x.fillText(l,W/2,cy+(img?520:340)+i*70)});
    if(useW&&S.showW&&r.lw&&r.t){x.font='600 44px '+F;x.fillStyle='rgba(255,255,255,.8)';x.fillText(fmt(Math.round(r.lw*10)/10)+' кг → цель '+fmt(r.t)+' кг',W/2,cy+(img?610:430))}
    x.fillStyle='rgba(255,255,255,.75)';x.font='500 38px '+F;x.fillText('Бесплатный трекер питания и привычек',W/2,H-170);
    x.fillText('без рекламы и VPN',W/2,H-120);
    x.fillStyle=acc;x.font='700 36px '+F;x.fillText('dontvan228-hue.github.io/Vas-kas',W/2,H-60);
    return c;
  });
}
function shareText(){
  var r=results();
  if(S.mode==='w'&&r.canW)return (r.kind==='gain'?'+':'−')+fmt(r.delta)+' кг с '+APP+'. Бесплатный трекер питания без рекламы:';
  if(r.sn>0)return r.sn+' '+plural(r.sn,'день','дня','дней')+' подряд веду дневник питания в '+APP+'. Бесплатно и без рекламы:';
  return 'Веду дневник питания и привычек в '+APP+'. Бесплатно и без рекламы:';
}
var curBlob=null,curURL='';
function modalHTML(){
  var r=results(),ed=isED();
  var opt='';
  if(r.canW)opt='<div class="opt" role="group" aria-label="Что показать"><button class="'+(S.mode!=='w'?'on':'')+'" onclick="g95Opt(\'streak\')">Серия дней</button><button class="'+(S.mode==='w'?'on':'')+'" onclick="g95Opt(\'w\')">'+(r.kind==='gain'?'+':'−')+fmt(r.delta)+' кг</button></div>'+
    (S.mode==='w'?'<label class="ck"><input type="checkbox" '+(S.showW?'checked':'')+' onchange="g95ShowW(this.checked)"> Показать текущий и целевой вес</label>':'');
  var canFile=false;try{canFile=!!(navigator.canShare&&navigator.canShare({files:[new File([new Blob(['x'],{type:'image/png'})],'a.png',{type:'image/png'})]}))}catch(e){}
  var u=encodeURIComponent(REF),t=encodeURIComponent(shareText());
  return '<button class="g95x" aria-label="Закрыть" onclick="g95ShareClose()">✕</button><h3>Поделиться успехом</h3>'+
   '<img id="g95img" alt="Картинка для публикации">'+opt+
   '<div class="g95row">'+(canFile?'<button class="g95b" onclick="g95DoShare()">Поделиться</button>':'')+'<button class="g95b'+(canFile?' gh':'')+'" onclick="g95Save()">Скачать картинку</button></div>'+
   '<div class="g95row"><a class="g95b gh" target="_blank" rel="noopener" href="https://vk.com/share.php?url='+u+'&title='+t+'">ВКонтакте</a><a class="g95b gh" target="_blank" rel="noopener" href="https://t.me/share/url?url='+u+'&text='+t+'">Telegram</a></div>'+
   '<p class="m">'+(ed?'На картинке только серия дней, без веса и цифр о теле.':'По умолчанию без точного веса. Почта и личные данные на картинку не попадают.')+'</p>';
}
function refreshImg(){
  drawCard().then(function(c){
    var img=document.getElementById('g95img');if(img)img.src=c.toDataURL('image/png');
    try{c.toBlob(function(b){curBlob=b},'image/png')}catch(e){curBlob=null}
  }).catch(function(){});
}
function paint(){var m=document.getElementById('g95m');if(!m)return;m.querySelector('.in').innerHTML=modalHTML();refreshImg()}
window.g95Share=function(badge){
  if(!usr())return;S.badge=badge||'';S.showW=false;
  var r=results();S.mode=(r.sn<2&&r.canW)?'w':'streak';
  var m=document.getElementById('g95m');if(!m){document.body.insertAdjacentHTML('beforeend','<div id="g95m" role="dialog" aria-modal="true" aria-label="Поделиться успехом"><div class="in"></div></div>');m=document.getElementById('g95m');
    m.addEventListener('click',function(e){if(e.target===m)g95ShareClose()})}
  paint();var b=m.querySelector('.g95x');if(b)b.focus();
};
window.g95ShareClose=function(){var m=document.getElementById('g95m');if(m)m.remove();curBlob=null};
window.g95Opt=function(v){if(isED())v='streak';S.mode=v;paint()};
window.g95ShowW=function(v){S.showW=!!v&&!isED();refreshImg()};
function withBlob(fn){if(curBlob)return fn(curBlob);drawCard().then(function(c){c.toBlob(function(b){curBlob=b;fn(b)},'image/png')})}
window.g95Save=function(){withBlob(function(b){if(!b)return;var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='flow-uspeh.png';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500);say('Картинка сохранена')})};
window.g95DoShare=function(){withBlob(function(b){
  var f;try{f=new File([b],'flow-uspeh.png',{type:'image/png'})}catch(e){return g95Save()}
  var data={files:[f],title:APP,text:shareText()+' '+REF};
  try{if(navigator.canShare&&navigator.canShare(data))navigator.share(data).catch(function(){});else g95Save()}catch(e){g95Save()}
})};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('g95m'))g95ShareClose()});

/* точки входа: «Награды», «Ещё», новая награда */
function freezeLine(){
  try{var f=freezeState();
    if(f.ok)return '<p class="m" style="margin-top:10px">❄️ Заморозка серии доступна: если пропустить один день, серия не прервётся. Одна заморозка на 7 дней.</p>';
    return '<p class="m" style="margin-top:10px">❄️ Заморозка серии использована ('+f.used.split('-').reverse().slice(0,2).join('.')+'). Следующая будет доступна с '+f.next.split('-').reverse().slice(0,2).join('.')+'.</p>'}catch(e){return ''}
}
var shareBtn='<div class="g95row"><button class="g95b" onclick="g95Share()">📤 Поделиться успехом</button></div>';
try{if(typeof tlAch==='function'){var _ta=tlAch;tlAch=function(){var h=_ta.apply(this,arguments);return h+freezeLine()+shareBtn}}}catch(e){}
try{if(typeof tlMore==='function'){var _tm=tlMore;tlMore=function(){var h=_tm.apply(this,arguments),mode=installMode();
  return h+'<h3 style="margin-top:18px">Поделиться и установить</h3>'+shareBtn+(mode?'<div class="g95card" style="margin-top:8px">'+installHTML(mode,true)+'</div>':'')}}}catch(e){}

var SHAREABLE=[1,2,3,6,7,8,13],SHAREABLE_ED=[1,2,3,13],snT=0;
function snack(idx){
  if(document.getElementById('g95m'))return;
  var a=null;try{a=ACH[idx]}catch(e){}if(!a)return;
  var old=document.getElementById('g95s');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend','<div id="g95s" role="status"><span>🏆 '+String(a[1]).replace(/[<>&]/g,'')+'</span><button class="g95b" onclick="g95SnackGo('+idx+')">Поделиться</button><button class="cl" aria-label="Закрыть" onclick="this.parentNode.remove()">✕</button></div>');
  clearTimeout(snT);snT=setTimeout(function(){var s=document.getElementById('g95s');if(s)s.remove()},9000);
}
window.g95SnackGo=function(i){var s=document.getElementById('g95s');if(s)s.remove();var t='';try{t='Награда: '+ACH[i][1]}catch(e){}g95Share(t)};
try{if(typeof achCheck==='function'){var _ac=achCheck;achCheck=function(){
  var u=usr(),before={};try{before=Object.assign({},(u&&u.ach)||{})}catch(e){}
  var r=_ac.apply(this,arguments);
  try{u=usr();if(u&&u.ach){var ok=isED()?SHAREABLE_ED:SHAREABLE,nw=Object.keys(u.ach).map(Number).filter(function(i){return !before[i]&&ok.indexOf(i)>=0});if(nw.length)setTimeout(function(){snack(nw[nw.length-1])},2600)}}catch(e){}
  return r}}}catch(e){}

/* ---------- запуск ---------- */
var tmr=0;function soon(){clearTimeout(tmr);tmr=setTimeout(function(){try{renderInstall()}catch(e){}},60)}
try{if(typeof render==='function'){var _r=render;render=function(){var r=_r.apply(this,arguments);soon();return r}}}catch(e){}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')soon()});
setInterval(soon,30000);soon();
})();
