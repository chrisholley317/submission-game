/* SUBMISSION service worker — offline app shell */
const CACHE='submission-v1';
const SHELL=['.','index.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'){return;}
  const url=new URL(req.url);
  // never cache Firebase or API calls — always go to network
  if(/firebaseio\.com|anthropic\.com|workers\.dev/.test(url.host)){return;}
  // navigations: network-first, fall back to cached shell (offline)
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));return r;}).catch(()=>caches.match(req).then(m=>m||caches.match('index.html')||caches.match('.'))));
    return;
  }
  // other same-origin GETs: cache-first
  if(url.origin===self.location.origin){
    e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));return r;}).catch(()=>m)));
  }
});
