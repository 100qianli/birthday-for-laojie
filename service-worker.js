'use strict';
importScripts('./precache-fast.js');
const manifest=self.FAST_GIFT_MANIFEST;
const cacheName='birthday-laojie-fast-'+manifest.version;
const mediaName='birthday-laojie-mobile-media-v1';
const scopeURL=new URL(self.registration.scope);
const aliases=new Map();for(const a of manifest.assets)for(const p of [a.path,...a.aliases||[]])aliases.set(new URL(p,scopeURL).href,a);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function cachedResponse(request){
 const url=new URL(request.url);url.search='';url.hash='';
 if(url.pathname.endsWith('/')||url.pathname===scopeURL.pathname+'index.html')url.pathname=scopeURL.pathname+'start.html';
 const asset=aliases.get(url.href),cache=await caches.open(asset?.group==='shell'||!asset?cacheName:mediaName);
 const cached=await cache.match(asset?new URL(asset.path,scopeURL).href:url.href);
 if(request.mode==='navigate'&&new URL(request.url).searchParams.has('v')&&cached){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1500);
  try{const fresh=await fetch(new Request(request,{signal:controller.signal}));if(fresh.ok)return fresh}catch{}finally{clearTimeout(timer)}
 }
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
