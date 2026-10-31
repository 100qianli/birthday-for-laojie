'use strict';
window.giftMediaReady=(async()=>{
 const store=self.GiftStore,urls=new Map();
 window.giftMediaURL=path=>urls.get(store.url(path))||path;
 if(!('caches'in self))return;
 await Promise.all(store.manifest.assets.filter(a=>a.group!=='shell').map(async asset=>{
  const response=await store.existing(asset);if(!response?.ok)return;
  const blobURL=URL.createObjectURL(await response.blob());urls.set(store.url(asset.path),blobURL);
  for(const alias of asset.aliases||[])urls.set(store.url(alias),blobURL);
 }));
 for(const source of document.querySelectorAll('picture source[srcset]'))source.srcset=giftMediaURL(source.getAttribute('srcset'));
 for(const img of document.querySelectorAll('img[src]'))img.src=giftMediaURL(img.getAttribute('src'));
 for(const video of document.querySelectorAll('video')){const source=video.querySelector('source[src]');if(source){source.src=giftMediaURL(source.getAttribute('src'));video.load()}if(video.getAttribute('poster'))video.poster=giftMediaURL(video.getAttribute('poster'))}
 for(const audio of document.querySelectorAll('audio[src]')){audio.src=giftMediaURL(audio.getAttribute('src'));audio.load()}
 for(const a of document.querySelectorAll('.direct-video'))a.href=giftMediaURL(a.getAttribute('href'));
})().catch(()=>{});
