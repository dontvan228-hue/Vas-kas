// Сервис-воркер: страница всегда берётся из сети (свежая версия), кэш нужен только когда нет интернета.
const CACHE='flow-v1';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    try{const res=await fetch(r,{cache:'no-store'});if(res&&res.ok){const c=await caches.open(CACHE);c.put(r,res.clone())}return res}
    catch(err){const c=await caches.open(CACHE);return (await c.match(r))||(await c.match('./'))||Response.error()}})())});
