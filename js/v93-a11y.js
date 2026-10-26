/* ===== v93 a11y ===== (Доступность)
 * Диалоги (role/aria-modal/фокус/Esc/ловушка/inert/возврат фокуса) — window.a11yDialog(el,onClose,opts)
 * Контраст --mut и акцентных заливок, подписи полей, цели ≥44px, кнопки-заголовки,
 * aria-current, вкладки, div[onclick] → кнопки, live-регион тоста, кольцо фокуса.
 * Подключается последним; index.html не трогает. Все правки идемпотентны.
 */
(function(){
'use strict';
if(window.__a11y93)return;window.__a11y93=1;
const D=document,$=s=>D.querySelector(s),$$=(s,r)=>[...(r||D).querySelectorAll(s)];

/* ---------- CSS ---------- */
const T=(th,css)=>css.replace(/@/g,'html:root[data-theme='+th+']');
D.head.insertAdjacentHTML('beforeend','<style id="a11y93">'+[
/* видимое кольцо фокуса везде, в т.ч. в полях ввода (там раньше outline:none) */
':focus-visible{outline:3px solid var(--lime)!important;outline-offset:2px!important}',
'input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--lime)!important;outline-offset:1px!important}',
'[tabindex="-1"]:focus{outline:none!important}',
'.a11y-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;border:0!important}',
/* касаемые цели ≥44px */
'.hb{width:44px!important;height:44px!important;min-width:44px}',
'header>div:last-child{gap:4px!important}',
'header>div:first-child{min-width:0;overflow:hidden}header>div:first-child>b,#hSub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}',
'.chip2{min-height:44px;display:inline-flex!important;align-items:center;box-sizing:border-box}',
'.gr>button{min-width:44px!important;min-height:44px!important}',
'.meDel{min-height:44px;padding:12px 10px!important;opacity:1!important}',
'.mood button{min-width:44px;min-height:44px}',
/* бывший h2[role=button]: кнопка внутри заголовка */
'.a11y-fbtn{all:unset;box-sizing:border-box;flex:1 1 auto;display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer;font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;-webkit-tap-highlight-color:transparent}',
'.a11y-fbtn:focus-visible{outline:3px solid var(--lime)!important;outline-offset:3px!important;border-radius:8px}',
/* крестик закрытия окна */
'.a11y-x{position:absolute;top:8px;right:8px;width:44px;height:44px;border-radius:14px;border:1px solid var(--line);background:rgba(var(--acc),.08);color:var(--txt);font:600 20px/1 inherit;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;padding:0}',
'.a11y-hasx>:first-child:not(.a11y-x){padding-right:52px}',
/* закрытые значки: не прозрачность .5, а пунктир+ч/б — текст остаётся читаемым */
'.bd:not(.on){opacity:1!important;color:var(--mut)!important}.bd:not(.on)>span{opacity:.45}',
/* контраст: светлые темы (определяются по --bg) */
'html.a11y-light .meDel{color:#a8322a!important}',
'html.a11y-light .bd:not(.on){color:var(--txt)!important}.a11y-light .bd:not(.on)>span{opacity:.4}',
/* темы: минимальные сдвиги --mut и акцентов (сохраняют оттенок, только темнее/плотнее) */
T('cream','@{--lime:#5c684b;--acc:92,104,75;--mut:rgba(58,50,38,.8)}'),
T('mint','@{--lime:#1d7863;--acc:29,120,99;--mut:rgba(31,61,55,.8)}'),
T('calm','@{--lime:#50663d;--acc:80,102,61}'),
T('y2k','@{--lime:#c41a7d;--acc:196,26,125}'),
T('pearl','@{--lime:#6a42bb;--acc:106,66,187;--mut:rgba(46,42,82,.8)}'),
T('pearl','@ .tabs2 button:not(.on){color:var(--txt)!important}'),
T('warm','@ .meDel{color:#a33a33!important}'),
/* neon: розовые заливки оставляем, текст на них — тёмный */
T('neon','@{--on:#1a0010}'),
T('neon','@ .btn:not(.ghost){color:var(--on)!important}'),
T('neon','@ .bd:not(.on){color:var(--mut)!important}'),
/* slate: белый текст на сером — фон темнее на ~1 ступень, --mut плотнее */
T('slate','@{--bg:#56686a;--bg2:#5f7273;--g1:#5f7273;--g2:#56686a;--g3:#4b5c5d;--bgd:86,104,106;--mut:rgba(244,247,246,.86)}'),
T('slate','@ body{background:radial-gradient(120% 60% at 70% 0,#5f7273,#56686a 60%)!important;background-attachment:fixed!important}'),
T('slate','@ :is(header,nav){background:rgba(86,104,106,.96)!important}'),
T('slate','@ nav .fab{box-shadow:0 0 0 6px #56686a!important}'),
T('nglass','@{--mut:rgba(200,220,245,.8)}')
].join('\n')+'</style>');

/* ---------- светлая/тёмная тема ---------- */
function lumOf(c){const m=c.match(/[\d.]+/g);if(!m)return .1;const a=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
function hexToRgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return 'rgb('+[0,2,4].map(i=>parseInt(h.substr(i,2),16)).join(',')+')'}
function detectLight(){try{let bg=getComputedStyle(D.documentElement).getPropertyValue('--bg').trim();if(bg[0]==='#')bg=hexToRgb(bg);D.documentElement.classList.toggle('a11y-light',lumOf(bg)>.4)}catch(e){}}
new MutationObserver(detectLight).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme','data-ui','class','style']});
detectLight();

/* ---------- диалоги ---------- */
const FOC='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)&&getComputedStyle(e).visibility!=='hidden';
const stack=[];const reg=new Map();const fHist=[];
D.addEventListener('focusin',e=>{const t=e.target;if(t&&t!==D.body){fHist.push(t);if(fHist.length>8)fHist.shift()}},true);
const lastOutside=el=>{for(let i=fHist.length-1;i>=0;i--){const t=fHist[i];if(t.isConnected&&!el.contains(t)&&![...reg.keys()].some(r=>r.contains(t)))return t}return null};
function defOpen(el){return el.classList.contains('on')||el.classList.contains('open')||el.classList.contains('show')||el.hasAttribute('open')}
function hasTextInput(el){return $$('input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=hidden]),textarea,select',el).some(visible)}
function topLevel(el){let n=el;while(n.parentElement&&n.parentElement!==D.body)n=n.parentElement;return n}
function applyInert(){
 $$('[data-a11y-inert]').forEach(n=>{n.inert=false;n.removeAttribute('data-a11y-inert')});
 const top=stack[stack.length-1];if(!top)return;
 const keep=new Set([topLevel(top.el),$('#toast')].filter(Boolean));if(top.opts.backdrop)keep.add(topLevel(top.opts.backdrop));
 [...D.body.children].forEach(n=>{if(keep.has(n)||n.tagName==='SCRIPT'||n.tagName==='STYLE'||n.inert)return;n.inert=true;n.setAttribute('data-a11y-inert','1')});
}
function ensureX(el,d){
 if(d.opts.closeButton===false)return;
 const has=$$('button',el).some(b=>/^(закрыть|отмена|готово|×|✕|✖)$/i.test((b.getAttribute('aria-label')||b.textContent).trim())||b.classList.contains('a11y-x'));
 if(has)return;
 const x=D.createElement('button');x.type='button';x.className='a11y-x';x.setAttribute('aria-label','Закрыть');x.textContent='✕';
 x.addEventListener('click',e=>{e.stopPropagation();d.close()});
 if(getComputedStyle(el).position==='static')el.style.position='relative';
 el.classList.add('a11y-hasx');el.appendChild(x);
}
function a11yDialog(el,onClose,opts){
 if(typeof el==='string')el=$(el);if(!el)return null;
 if(reg.has(el)){const d=reg.get(el);if(onClose)d.onClose=onClose;Object.assign(d.opts,opts||{});return d}
 opts=Object.assign({backdrop:$('#bk'),isOpen:defOpen,label:null},opts||{});
 const d={el,opts,onClose:onClose||null,open:false,ret:null};
 el.setAttribute('role',opts.role||'dialog');el.setAttribute('aria-modal','true');
 if(opts.label)el.setAttribute('aria-label',opts.label);
 else if(!el.hasAttribute('aria-labelledby')&&!el.hasAttribute('aria-label')){
  const t=opts.labelledBy?$(opts.labelledBy):el.querySelector('[id$="T"],h1,h2,h3,[data-title]');
  if(t){if(!t.id)t.id='a11yT'+Math.random().toString(36).slice(2,8);el.setAttribute('aria-labelledby',t.id)}
 }
 d.close=function(){try{if(d.onClose)d.onClose();else if(window.closeSheet)window.closeSheet();else el.classList.remove('on','open','show')}catch(e){console.warn(e)}setTimeout(sync,0)};
 d.focusIn=function(){
  const t=el.getAttribute('aria-labelledby')&&D.getElementById(el.getAttribute('aria-labelledby'));
  let f=opts.initialFocus?$(opts.initialFocus):null;
  if(!f&&t&&visible(t)&&(t.textContent||'').trim()){t.tabIndex=-1;f=t}
  if(!f)f=$$(FOC,el).find(visible);
  if(!f){el.tabIndex=-1;f=el}
  try{f.focus({preventScroll:true})}catch(e){}
 };
 function sync(){
  const o=!!opts.isOpen(el);if(o===d.open)return;d.open=o;
  if(o){
   d.ret=D.activeElement&&D.activeElement!==D.body&&!el.contains(D.activeElement)?D.activeElement:(lastOutside(el)||d.ret);
   el.removeAttribute('aria-hidden');{const i=stack.indexOf(d);if(i>=0)stack.splice(i,1)}stack.push(d);
   ensureX(el,d);applyInert();setTimeout(()=>{if(d.open&&!el.contains(D.activeElement))d.focusIn()},60);
  }else{
   el.setAttribute('aria-hidden','true');const i=stack.indexOf(d);if(i>=0)stack.splice(i,1);applyInert();
   const r=d.ret;d.ret=null;const nxt=stack[stack.length-1];
   if(nxt){if(!nxt.el.contains(D.activeElement))nxt.focusIn()}
   else if(r&&r.isConnected&&visible(r)){try{r.focus({preventScroll:true})}catch(e){}}
   else if(el.contains(D.activeElement)||D.activeElement===D.body){const m=$$('[role=main],main').find(visible);if(m){m.tabIndex=-1;try{m.focus({preventScroll:true})}catch(e){}}}
  }
 }
 d.sync=sync;
 new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['class','style','hidden','open']});
 if(!opts.isOpen(el))el.setAttribute('aria-hidden','true');
 reg.set(el,d);sync();return d;
}
window.a11yDialog=a11yDialog;
window.a11yDialogs={get open(){return stack.map(d=>d.el)},sync(){reg.forEach(d=>d.sync())}};

D.addEventListener('keydown',e=>{
 const top=stack[stack.length-1];if(!top)return;
 if(e.key==='Escape'||e.key==='Esc'){e.preventDefault();e.stopPropagation();top.close();return}
 if(e.key!=='Tab')return;
 const f=$$(FOC,top.el).filter(visible);
 if(!f.length){e.preventDefault();top.focusIn();return}
 const a=D.activeElement,first=f[0],last=f[f.length-1];
 if(!top.el.contains(a)){e.preventDefault();(e.shiftKey?last:first).focus();return}
 if(e.shiftKey&&(a===first||a===top.el||a.tabIndex===-1&&f.indexOf(a)<0)){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}
},true);
/* фон: окна с полями ввода по тапу на фон не закрываются (только Esc и крестик) */
D.addEventListener('click',e=>{
 const top=stack[stack.length-1];if(!top||!top.opts.backdrop||e.target!==top.opts.backdrop)return;
 if(top.opts.backdropClose===true)return;
 if(top.opts.backdropClose===false||hasTextInput(top.el)){e.stopImmediatePropagation();e.preventDefault()}
},true);
D.addEventListener('mousedown',e=>{const top=stack[stack.length-1];if(top&&top.opts.backdrop&&e.target===top.opts.backdrop)e.preventDefault()},true);
/* фокус не должен уходить под модальное окно (клик мышью и т.п.) */
D.addEventListener('focusin',e=>{const top=stack[stack.length-1];if(top&&!top.el.contains(e.target)&&!(e.target.closest&&e.target.closest('#toast')))setTimeout(()=>{if(stack[stack.length-1]===top&&!top.el.contains(D.activeElement))top.focusIn()},0)},true);

/* ---------- подписи и атрибуты ---------- */
const LBL={aMail:'Электронная почта',aPass:'Пароль',oAge:'Возраст, лет',oH:'Рост, см',oW:'Текущий вес, кг',oT:'Целевой вес, кг',shG:'Количество, граммов',shR:'Количество, граммов (ползунок)',cQ:'Поиск продукта'};
const BTN=[[/^ask\(/,'Отправить'],[/^cSearch\(/,'Найти'],[/^addFood\(/,'Добавить продукт'],[/^stepG\(-/,'Уменьшить на 10 граммов'],[/^stepG\(/,'Увеличить на 10 граммов'],[/^quickAdd\(/,'Добавить еду']];
const MOOD=['','Настроение: плохо','Настроение: так себе','Настроение: нормально','Настроение: хорошо','Настроение: отлично'];
const accName=e=>(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.getAttribute('title')||e.textContent||'').replace(/[\s ]/g,'');
const isSym=s=>!s||!/[0-9A-Za-zА-Яа-яЁё]/.test(s);
function keyAct(e){if((e.key==='Enter'||e.key===' ')&&e.target===e.currentTarget){e.preventDefault();e.currentTarget.click()}}

function fix(){
 /* тост — live-регион */
 const t=$('#toast');if(t&&!t.hasAttribute('role')){t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.setAttribute('aria-atomic','true')}
 /* главный ориентир и h1 */
 const td=$('#t-today');if(td&&td.parentElement&&td.parentElement.tagName!=='MAIN'&&!td.parentElement.hasAttribute('role'))td.parentElement.setAttribute('role','main');
 const hb=$('#app header>div:first-child>b');if(hb&&!hb.hasAttribute('role')){hb.setAttribute('role','heading');hb.setAttribute('aria-level','1')}
 /* диалоги ядра */
 if($('#pop'))a11yDialog($('#pop'),()=>window.closeSheet&&window.closeSheet(),{labelledBy:'#popT'});
 if($('#sheet'))a11yDialog($('#sheet'),()=>window.closeSheet&&window.closeSheet(),{labelledBy:'#shT'});
 /* новые окна других слоёв: role=dialog / класс sheet|modal|dialog */
 $$('body>[role=dialog],body>[class*="sheet"],body>[class*="modal"],body>[id$="Sheet"],body>[id$="Modal"]').forEach(el=>{if(reg.has(el)||/(^|[-_])(bk|backdrop|overlay|scrim|shade)|bk$/i.test(el.id+' '+el.className))return;
  const id=el.id,bk=id&&(D.getElementById(id+'bk')||D.getElementById(id+'Bk')||D.getElementById(id+'-bk'))||null;
  const cf=id&&typeof window[id+'Close']==='function'?window[id+'Close']:null;
  a11yDialog(el,cf?()=>window[id+'Close']():bk?()=>bk.click():null,{backdrop:bk||$('#bk')})});
 /* svg-иконки */
 $$('svg:not([aria-hidden]):not([role=img]):not([aria-label])').forEach(s=>{if(s.closest('button,a,[role=button],[onclick],.hb,nav')||!s.querySelector('title')){s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false')}});
 /* поля ввода */
 $$('input:not([type=hidden]),select,textarea').forEach(i=>{
  if(i.labels&&i.labels.length||i.hasAttribute('aria-label')||i.hasAttribute('aria-labelledby'))return;
  const p=i.previousElementSibling;
  if(p&&p.tagName==='LABEL'&&!p.htmlFor&&!p.querySelector('input,select,textarea')){if(!i.id)i.id='a11yI'+Math.random().toString(36).slice(2,8);p.htmlFor=i.id;return}
  const l=LBL[i.id]||i.getAttribute('placeholder')||i.getAttribute('title');if(l)i.setAttribute('aria-label',l);
 });
 /* div/span[onclick] → кнопки */
 $$('[onclick]:not(button):not(a):not(input):not(select):not(textarea):not(label):not(body):not(#bk):not(nav):not([role=dialog])').forEach(e=>{
  if(e.dataset.a11yBtn)return;e.dataset.a11yBtn='1';
  if(!e.hasAttribute('tabindex'))e.tabIndex=0;
  if(!e.hasAttribute('role')&&!e.querySelector('button,a[href],input,select,textarea,[role=button],[onclick]'))e.setAttribute('role','button');
  e.addEventListener('keydown',keyAct);
 });
 /* кнопки без текста / только символ */
 $$('button,[role=button]').forEach(b=>{
  if(b.hasAttribute('aria-label')||b.hasAttribute('aria-labelledby'))return;
  const oc=b.getAttribute('onclick')||'',txt=(b.textContent||'').trim();
  const m=oc.match(/^setMood\((\d)\)/);if(m){b.setAttribute('aria-label',MOOD[+m[1]]||txt);return}
  if(!isSym(txt.replace(/[\s ]/g,''))&&txt.length>2)return;
  for(const [re,l] of BTN)if(re.test(oc)){b.setAttribute('aria-label',l);return}
  if(/close|Close\(|closeSheet/.test(oc)&&!txt){b.setAttribute('aria-label','Закрыть');return}
  if(b.title)b.setAttribute('aria-label',b.title);
 });
 /* навигация */
 $$('nav button').forEach(b=>{if(b.classList.contains('fab'))return;const on=b.classList.contains('on');if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 /* сегменты .tabs2 → tablist */
 $$('.tabs2').forEach(g=>{
  const bs=$$(':scope>button',g);if(!bs.length)return;
  if(g.getAttribute('role')!=='tablist'){g.setAttribute('role','tablist');g.addEventListener('keydown',e=>{if(!/^Arrow(Left|Right)$|^Home$|^End$/.test(e.key))return;const all=$$(':scope>[role=tab]',g);let i=all.indexOf(D.activeElement);if(i<0)return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length;all[i].focus();all[i].click()})}
  const anyOn=bs.some(b=>b.classList.contains('on'));
  bs.forEach((b,i)=>{const on=anyOn?b.classList.contains('on'):i===0;b.setAttribute('role','tab');b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1});
 });
 /* h2[role=button] (сворачиваемые карточки) → кнопка внутри заголовка */
 $$('h2[role=button]').forEach(h=>{
  if(h.querySelector('button,a,input,select')){h.removeAttribute('role');return}
  const b=D.createElement('button');b.type='button';b.className='a11y-fbtn';
  while(h.firstChild)b.appendChild(h.firstChild);
  h.appendChild(b);h.removeAttribute('role');h.removeAttribute('tabindex');
  b.setAttribute('aria-expanded',h.getAttribute('aria-expanded')||'false');h.removeAttribute('aria-expanded');
  /* Enter/Space обрабатывает сама кнопка (click всплывает к h2); keydown h2 не нужен */
  b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation()});
 });
 /* fold() меняет aria-expanded у h2 → переносим на кнопку */
 $$('h2[aria-expanded]>.a11y-fbtn').forEach(b=>{const h=b.parentElement;b.setAttribute('aria-expanded',h.getAttribute('aria-expanded'));h.removeAttribute('aria-expanded')});
 /* h2, у которого текст перезаписали (кнопка пропала), но tabindex остался */
 $$('.card.fold>h2[tabindex]:not(:has(.a11y-fbtn))').forEach(h=>h.setAttribute('role','button'));
}
let ft=0;const fixSoon=()=>{if(ft)return;ft=setTimeout(()=>{ft=0;try{fix()}catch(e){console.warn('a11y93',e)}},40)};
function hookFns(){
 ['render','go','openPop','openSheet','closeSheet'].forEach(n=>{const f=window[n];if(typeof f!=='function'||f.__a11y)return;const w=function(){const r=f.apply(this,arguments);fixSoon();return r};w.__a11y=1;try{window[n]=w}catch(e){}});
}
hookFns();
new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList'||m.attributeName==='aria-expanded'||m.attributeName==='class'&&m.target.closest&&m.target.closest('nav,.tabs2,#pop,#sheet')){fixSoon();return}}})
 .observe(D.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-expanded']});
try{fix()}catch(e){console.warn('a11y93',e)}
if(D.readyState!=='complete')window.addEventListener('load',()=>{hookFns();fixSoon()});
})();
