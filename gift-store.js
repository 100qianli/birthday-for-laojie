'use strict';
(() => {
 const manifest=self.FAST_GIFT_MANIFEST;
 const base=new URL('./',location.href),url=p=>new URL(p,base).href.split('?')[0];
 const mediaName='birthday-laojie-mobile-media-v1';
 const shellName='birthday-laojie-fast-'+manifest.version;
 const aliases=new Map();for(const a of manifest.assets){aliases.set(url(a.path),a);for(const p of a.aliases||[])aliases.set(url(p),a)}
 const cacheFor=async a=>caches.open(a.group==='shell'?shellName:mediaName);
 const hash=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
 async function existing(asset){
  const cache=await cacheFor(asset),hit=await cache.match(url(asset.path));if(hit?.ok)return hit;
  if(asset.group==='shell')return null;
  const keys=(await caches.keys()).filter(k=>k.startsWith('birthday-laojie-')&&k!==mediaName);
  for(const path of asset.aliases||[])for(const key of keys){const old=await(await caches.open(key)).match(url(path));if(old?.ok){await cache.put(url(asset.path),old.clone());return old}}
  return null;
 }
 async function putAsset(asset,blob){
  const cache=await cacheFor(asset);
  await cache.put(url(asset.path),new Response(blob,{headers:{'Content-Type':asset.type,'Content-Length':String(blob.size)}}));
 }
 function sources(){
  const list=[url(manifest.bundle.path)];
  if(!['localhost','127.0.0.1'].includes(location.hostname)&&manifest.cdnBase)list.push(manifest.cdnBase+manifest.bundle.path);
  return list;
 }
 async function openStream(source,offset,controller){
  let timer;controller.signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),20000)};arm();
  try{
   const response=await fetch(source,{headers:offset?{Range:'bytes='+offset+'-'}:{},cache:'force-cache',signal:controller.signal});
   if(!response.ok||![200,206].includes(response.status))throw Error('Download unavailable');
   if(response.status===206){const range=response.headers.get('Content-Range');if(range){const parts=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(range);if(!parts||Number(parts[1])!==offset||Number(parts[3])!==manifest.bundle.bytes)throw Error('Range representation mismatch')}}
   const reader=response.body?.getReader();if(!reader)throw Error('Streaming unavailable');
   const prefix=[];let size=0;
   while(size<16384){const part=await reader.read();if(part.done)break;prefix.push(part.value);size+=part.value.byteLength;arm()}
   return {reader,prefix,size,resumed:offset>0&&response.status===206,arm,stop:()=>clearTimeout(timer)};
  }catch(error){clearTimeout(timer);controller.abort();throw error}
 }
 async function download(progress){
  const cache=await caches.open(mediaName),checkpoint=url(manifest.bundle.path)+'.partial';
  let saved=await(await cache.match(checkpoint))?.blob();
  if(saved&&saved.size>manifest.bundle.bytes){saved=null;await cache.delete(checkpoint)}
  let skipCDN=false;
  for(let attempt=0;attempt<3;attempt++){
   let parts=saved?[saved]:[],size=saved?.size||0,lastCheckpoint=size,stream;
   const sourceList=sources().filter((_,i)=>!skipCDN||i===0),controllers=sourceList.map(()=>new AbortController());
   try{
    if(size<manifest.bundle.bytes){
     stream=await Promise.any(sourceList.map((source,i)=>openStream(source,size,controllers[i]).then(value=>({value,index:i}))));
     controllers.forEach((c,i)=>{if(i!==stream.index)c.abort()});stream=stream.value;
     if(!stream.resumed){parts=[];size=0;lastCheckpoint=0}
     parts.push(...stream.prefix);size+=stream.size;progress({bytes:size,total:manifest.bundle.bytes,phase:'download'});
     while(true){const part=await stream.reader.read();if(part.done)break;parts.push(part.value);size+=part.value.byteLength;stream.arm();progress({bytes:size,total:manifest.bundle.bytes,phase:'download'});
      if(size-lastCheckpoint>=262144){await cache.put(checkpoint,new Response(new Blob(parts)));lastCheckpoint=size}
     }
     stream.stop();
    }
    const blob=new Blob(parts);
    if(blob.size!==manifest.bundle.bytes||await hash(blob)!==manifest.bundle.sha256){await cache.delete(checkpoint);saved=null;skipCDN=true;throw Error('Download incomplete')}
    progress({bytes:size,total:manifest.bundle.bytes,phase:'saving'});
    for(const asset of manifest.assets){const slice=blob.slice(asset.offset,asset.offset+asset.bytes,asset.type);await putAsset(asset,slice)}
    await cache.delete(checkpoint);return;
   }catch(error){
    stream?.stop?.();controllers.forEach(c=>c.abort());
    if(size>0&&size<manifest.bundle.bytes){saved=new Blob(parts);await cache.put(checkpoint,new Response(saved))}
    if(attempt===2)throw error;
    await new Promise(r=>setTimeout(r,600*(attempt+1)));
   }
  }
 }
 async function prepare(progress=()=>{}){
  if(!('caches'in self))throw Object.assign(Error('Cache unsupported'),{name:'CacheUnsupported'});
  const found=await Promise.all(manifest.assets.map(existing));
  if(found.every(Boolean)){progress({bytes:manifest.bundle.bytes,total:manifest.bundle.bytes,phase:'ready'});return}
  const mediaComplete=manifest.assets.every((a,i)=>a.group==='shell'||found[i]);
  if(mediaComplete){
   const pending=manifest.assets.filter((a,i)=>a.group==='shell'&&!found[i]);
   await Promise.all(pending.map(async a=>{const r=await fetch(url(a.path)+'?v='+manifest.version,{cache:'default'});if(!r.ok)throw Error('Page unavailable');await(await cacheFor(a)).put(url(a.path),r)}));
  }else await download(progress);
  const shell=await caches.open(shellName);
  await shell.put(url('precache-fast.js'),new Response('self.FAST_GIFT_MANIFEST='+JSON.stringify(manifest)+';',{headers:{'Content-Type':'application/javascript'}}));
  progress({bytes:manifest.bundle.bytes,total:manifest.bundle.bytes,phase:'ready'});
 }
 self.GiftStore={manifest,aliases,url,existing,prepare,mediaName,shellName,cacheFor};
})();
