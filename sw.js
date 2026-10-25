// Сервис-воркер.
// Страница: всегда свежая из сети, но через проверку ETag (если не менялась — сервер отвечает коротким 304, а не качает всё заново).
// Картинки, иконки, видео: сразу из кэша (мгновенно), а в фоне тихо обновляются.
// Без интернета всё берётся из кэша.
const CACHE='flow-v2';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
const isAsset=u=>/\.(webp|png|jpe?g|gif|svg|mp4|webm|woff2?)$/i.test(u.pathname);
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(isAsset(u)){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE),hit=await c.match(r);
      const net=fetch(r).then(res=>{if(res&&res.ok)c.put(r,res.clone());return res}).catch(()=>null);
      if(hit){e.waitUntil(net);return hit}
      return (await net)||Response.error()})());
    return}
  e.respondWith((async()=>{
    try{const res=await fetch(r,{cache:'no-cache'});if(res&&res.ok){const c=await caches.open(CACHE);c.put(r,res.clone())}return res}
    catch(err){const c=await caches.open(CACHE);return (await c.match(r))||(await c.match('./'))||Response.error()}})())});
