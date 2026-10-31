'use strict';
(() => {
 const el=id=>document.getElementById(id);let busy=false,done=false,lastPaint=0;
 function paint(state){
  if(state.phase==='download'&&performance.now()-lastPaint<100)return;lastPaint=performance.now();
  const percent=Math.min(state.phase==='ready'?100:99,Math.floor(state.bytes/state.total*100));
  el('prepare-percent').textContent=percent+'%';el('prepare-bar').style.width=percent+'%';el('prepare-progress').setAttribute('aria-valuenow',percent);
  el('prepare-bytes').textContent=(state.bytes/1048576).toFixed(1)+' / '+(state.total/1048576).toFixed(1)+' MB';
  el('prepare-state').textContent=state.phase==='saving'?'回忆已下载，正在放进口袋…':state.phase==='ready'?'照片、短片和音乐都已保存，可以打开礼物了。':'正在收藏回忆，网络中断后可以接着准备…';
 }
 async function run(){
  if(busy||done)return;busy=true;el('prepare-retry').hidden=true;
  try{
   await GiftStore.prepare(paint);done=true;
   el('prepare-title').innerHTML='回忆已装进口袋，<br>现在，打开你的礼物吧。';
   el('prepare-description').textContent='24张照片、两段短片和钢琴音乐，都在这里。';
   for(const group of ['photos','video','audio'])el('status-'+group).textContent='已收藏 ✓';
   el('prepare-enter').hidden=false;document.body.classList.add('ready');
  }catch(error){
   el('prepare-state').textContent=error.name==='CacheUnsupported'?'当前浏览器不支持预存回忆，可以直接观看，或复制链接到 Safari 打开。':error.name==='QuotaExceededError'?'浏览器存储空间不足，可以清理一些浏览器数据后继续。':'网络暂时中断，进度已保留，点继续即可从断点接着下载。';
   if(error.name==='CacheUnsupported')el('prepare-enter').hidden=false;else el('prepare-retry').hidden=false;
  }finally{busy=false}
 }
 el('prepare-retry').onclick=run;addEventListener('online',()=>{if(!done)run()});
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
 run();
})();
