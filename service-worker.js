'use strict';
importScripts('./precache-manifest.js');
const cacheName=self.BIRTHDAY_MANIFEST.cacheName;
const scopeURL=new URL(self.registration.scope);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function cachedResponse(request){
 const url=new URL(request.url);url.search='';url.hash='';
 if(url.pathname.endsWith('/'))url.pathname+='index.html';
 const cache=await caches.open(cacheName),cached=await cache.match(url.href);
 if(!cached)return fetch(request);
 const range=request.headers.get('range');
 if(!range)return cached;
 const bytes=await cached.arrayBuffer(),length=bytes.byteLength;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 function invalid(){return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+length,'Accept-Ranges':'bytes'}})}
 if(!match||(!match[1]&&!match[2]))return invalid();
 let start,end;
 if(!match[1]){const suffix=Number(match[2]);if(!suffix)return invalid();start=Math.max(0,length-suffix);end=length-1}
 else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),length-1):length-1}
 if(start<0||start>=length||end<start||!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return invalid();
 const headers=new Headers(cached.headers);headers.delete('Content-Encoding');headers.set('Content-Range',`bytes ${start}-${end}/${length}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method==='GET'&&url.origin===scopeURL.origin&&url.pathname.startsWith(scopeURL.pathname))event.respondWith(cachedResponse(event.request));
});
self.addEventListener('message',event=>{
 if(event.data?.type==='CACHE_READY')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('birthday-laojie-')&&k!==cacheName).map(k=>caches.delete(k)))));
});
