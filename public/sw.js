const CACHE_NAME='apml-portal-shell-v4';
const BASE_PATH=new URL('.',self.location.href).pathname;
const INDEX_URL=BASE_PATH+'index.html';
const CORE_ASSETS=[BASE_PATH,INDEX_URL,BASE_PATH+'logo.svg',BASE_PATH+'pwa-192.svg',BASE_PATH+'pwa-512.svg',BASE_PATH+'manifest.webmanifest'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME&&key.indexOf('apml-portal-shell-')===0).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE_PATH))return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok)return response;
    return await caches.match(INDEX_URL)||response;
   }catch(error){
    return await caches.match(INDEX_URL)||await caches.match(BASE_PATH);
   }
  })());
  return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
  return response;
 })));
});
