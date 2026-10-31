'use strict';
(() => {
const manifest=self.BIRTHDAY_MANIFEST;
const el=id=>document.getElementById(id);
const absolute=p=>new URL(p,location.href).href.split('?')[0];
let running=false,cache;
const completed=new Set(),received=new Map();
const total=manifest.assets.reduce((n,a)=>n+a.bytes,0);
const megabytes=n=>(n/1048576).toFixed(1);
function update(){
 const bytes=manifest.assets.reduce((n,a)=>n+Math.min(a.bytes,received.get(a.path)||0),0);
 const percent=Math.min(100,Math.floor(bytes/total*100));
 el('prepare-percent').textContent=percent+'%';el('prepare-bar').style.width=percent+'%';
 el('prepare-progress').setAttribute('aria-valuenow',percent);
 el('prepare-bytes').textContent=megabytes(bytes)+' / '+megabytes(total)+' MB';
 for(const group of ['photos','video','audio']){
  const items=manifest.assets.filter(a=>a.group===group);
  const done=items.every(a=>completed.has(a.path));
  el('status-'+group).textContent=done?'已收藏 ✓':items.some(a=>received.has(a.path))?'准备中…':'等待中';
 }
}
function ready(){
 el('prepare-title').innerHTML='回忆已装进口袋，<br>现在，打开你的礼物吧。';
 el('prepare-description').textContent='照片、短片和音乐都已准备好。接下来的快乐，慢慢看。';
 el('prepare-state').textContent='全部准备完成 · 媒体已保存在当前浏览器';
 el('prepare-enter').hidden=false;el('prepare-retry').hidden=true;
 el('prepare-percent').textContent='100%';el('prepare-bar').style.width='100%';
 el('prepare-progress').setAttribute('aria-valuenow',100);document.body.classList.add('ready');
}
async function download(asset){
 if(completed.has(asset.path))return;
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  const controller=new AbortController();let timer;
  const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),30000)};
  try{
   received.set(asset.path,0);arm();
   const response=await fetch(absolute(asset.path)+'?prepare='+manifest.version,{signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const chunks=[];let length=0;
   if(response.body){const reader=response.body.getReader();while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);length+=value.byteLength;received.set(asset.path,length);arm();update()}}
   else{const data=new Uint8Array(await response.arrayBuffer());chunks.push(data);length=data.length}
   clearTimeout(timer);
   if(!length)throw new Error('Empty resource');
   const headers=new Headers(response.headers);headers.delete('content-encoding');headers.set('content-length',String(length));
   await cache.put(absolute(asset.path),new Response(new Blob(chunks),{status:200,headers}));
   completed.add(asset.path);received.set(asset.path,asset.bytes);update();return;
  }catch(error){lastError=error;clearTimeout(timer);received.set(asset.path,0);update();if(attempt<2)await new Promise(r=>setTimeout(r,1000*(attempt+1)))}
 }
 throw lastError;
}
async function prepare(){
 if(running)return;running=true;el('prepare-retry').hidden=true;
 el('prepare-state').textContent='正在把回忆装进口袋，请让页面保持打开…';
 if(!('caches'in self)){
  el('prepare-state').textContent='当前浏览器不支持保存媒体缓存。请复制链接到 Safari 再打开。';
  el('prepare-description').textContent='也可以直接观看生日礼物，媒体将按需加载。';
  el('prepare-enter').hidden=false;running=false;return;
 }
 try{
  cache=await caches.open(manifest.cacheName);
  const manifestText='self.BIRTHDAY_MANIFEST='+JSON.stringify(manifest)+';';
  await cache.put(absolute('precache-manifest.js'),new Response(manifestText,{headers:{'Content-Type':'application/javascript; charset=utf-8'}}));
  await Promise.all(manifest.assets.map(async a=>{const existing=await cache.match(absolute(a.path));if(existing?.ok){completed.add(a.path);received.set(a.path,a.bytes)}}));update();
  if(completed.size===manifest.assets.length){ready();running=false;return}
  const queue=manifest.assets.filter(a=>!completed.has(a.path));let next=0;const failed=[];
  await Promise.all(Array.from({length:2},async()=>{while(next<queue.length){const asset=queue[next++];try{await download(asset)}catch(error){failed.push(asset.path)}}}));
  if(failed.length){el('prepare-state').textContent='网络有点慢，已完成的内容都保存了。点下方继续，无需重新下载。';el('prepare-retry').hidden=false;return}
  ready();navigator.serviceWorker?.controller?.postMessage({type:'CACHE_READY'});
 }catch(error){
  el('prepare-state').textContent=error?.name==='QuotaExceededError'?'当前浏览器存储空间不足。请在 Safari 中打开，或清理一些浏览器缓存后继续。':'准备暂时中断，已完成的内容会保留。请点继续准备。';
  el('prepare-retry').hidden=false;
 }finally{running=false}
}
el('prepare-retry').addEventListener('click',prepare);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
prepare();
})();
