/* Refresh the application's HTTP cache without erasing player data. */
(function(root) {
  'use strict';
  let pending = null;
  async function download(url) {
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch(url,{cache:'reload',signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status+': '+url);
      return await response.text();
    } finally {clearTimeout(timeout);}
  }
  async function update(onProgress) {
    const entry=new URL('index.html',location.href),stage=new URL('localStage.html',entry);
    const assets=new Set([new URL('manifest.json',entry).href,new URL('changelog.json',entry).href]);
    for(const page of [entry,stage]){
      const html=await download(page.href);
      const document=new DOMParser().parseFromString(html,'text/html');
      for(const node of document.querySelectorAll('script[src],link[rel="stylesheet"][href]')){
        const url=new URL(node.getAttribute('src') || node.getAttribute('href'),page);
        if(url.origin===entry.origin)assets.add(url.href);
      }
    }
    const queue=[...assets];let completed=0;
    const results=await Promise.allSettled(Array.from({length:Math.min(6,queue.length)},async()=>{
      while(queue.length){await download(queue.shift());onProgress?.(++completed,assets.size);}
    }));
    const failure=results.find(result=>result.status==='rejected');
    if(failure)throw failure.reason;
    // Discard only transient stage state; local records and preferences are untouched.
    for(const key of ['piu_single_config','piu_single_result','piu_touch_preview_config'])sessionStorage.removeItem(key);
    entry.search=location.search;entry.searchParams.set('update',String(Date.now()));entry.hash='';
    location.replace(entry.href);
  }
  root.PiuAppUpdate={restart(onProgress){
    if(!pending)pending=update(onProgress).catch(error=>{pending=null;throw error;});
    return pending;
  }};
})(globalThis);
