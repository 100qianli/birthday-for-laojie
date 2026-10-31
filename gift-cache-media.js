'use strict';
window.giftMediaReady=(async()=>{
 const urls=new Map(),manifest=self.BIRTHDAY_MANIFEST;
 const normalize=path=>new URL(path,location.href).href.split('?')[0];
 window.giftMediaURL=path=>urls.get(normalize(path))||path;
 if(!manifest||!('caches'in self))return;
 try{
  const cache=await caches.open(manifest.cacheName);
  await Promise.all(manifest.assets.filter(a=>a.path.startsWith('assets/')).map(async asset=>{
   const response=await cache.match(normalize(asset.path));
   if(response?.ok)urls.set(normalize(asset.path),URL.createObjectURL(await response.blob()));
  }));
  for(const image of document.querySelectorAll('img[src]'))image.src=window.giftMediaURL(image.getAttribute('src'));
  for(const source of document.querySelectorAll('picture source[srcset]'))source.srcset=window.giftMediaURL(source.getAttribute('srcset'));
  for(const video of document.querySelectorAll('video')){
   const source=video.querySelector('source[src]');
   if(source){source.src=window.giftMediaURL(source.getAttribute('src'));video.load()}
   if(video.getAttribute('poster'))video.poster=window.giftMediaURL(video.getAttribute('poster'));
  }
  for(const audio of document.querySelectorAll('audio[src]')){audio.src=window.giftMediaURL(audio.getAttribute('src'));audio.load()}
  for(const a of document.querySelectorAll('.direct-video'))a.href=window.giftMediaURL(a.getAttribute('href'));
 }catch{}
})();
