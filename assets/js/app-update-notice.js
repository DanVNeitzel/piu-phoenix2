/* Compare the loaded build with the published release, only in selection menus. */
(function(root) {
  'use strict';
  const currentVersion=document.querySelector('[data-app-version]')?.textContent.trim().replace(/^v/,'');
  const lobby=document.querySelector('.container-mob');
  const confirmation=document.getElementById('confirmPlayModal');
  if(!currentVersion || !lobby || !confirmation)return;

  function parseVersion(value) {
    if(typeof value!=='string')return null;
    const match=value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/);
    return match ? {numbers:match.slice(1,4).map(Number),pre:match[4]?.split('.')} : null;
  }
  function newer(candidate, installed) {
    const next=parseVersion(candidate),current=parseVersion(installed);
    if(!next || !current)return false;
    for(let i=0;i<3;i++)if(next.numbers[i]!==current.numbers[i])return next.numbers[i]>current.numbers[i];
    if(!next.pre || !current.pre)return !!current.pre && !next.pre;
    for(let i=0;i<Math.max(next.pre.length,current.pre.length);i++){
      const a=next.pre[i],b=current.pre[i];
      if(a===b)continue;
      if(a===undefined || b===undefined)return b===undefined;
      const aNumber=/^\d+$/.test(a),bNumber=/^\d+$/.test(b);
      if(aNumber && bNumber)return Number(a)>Number(b);
      if(aNumber!==bNumber)return !aNumber;
      return a>b;
    }
    return false;
  }

  const host=document.createElement('aside');host.id='app-update-notice';host.hidden=true;
  host.setAttribute('aria-label','Atualização do PIUWeb');
  host.innerHTML='<section class="app-update-toast" aria-labelledby="app-update-heading">'+
    '<p class="app-update-brand"><span aria-hidden="true"></span>PIUWEB PHOENIX 2</p>'+
    '<div role="status" aria-live="polite" aria-atomic="true"><h2 id="app-update-heading">Nova versão disponível</h2>'+
    '<p id="app-update-message">Atualize o jogo para receber as últimas melhorias e correções.</p></div>'+
    '<p class="app-update-versions"><span id="app-update-current"></span><span aria-hidden="true">→</span><strong id="app-update-latest"></strong></p>'+
    '<div class="app-update-actions"><button type="button" id="app-update-now">Atualizar agora</button>'+
    '<button type="button" id="app-update-later">Agora não</button></div>'+
    '<p class="app-update-foot">O jogo será reiniciado. Seus recordes e preferências serão mantidos.</p></section>'+
    '<button type="button" id="app-update-recall" hidden>↑ Atualização disponível</button>';
  document.body.append(host);
  const byId=id=>host.querySelector('#'+id);
  const toast=host.querySelector('.app-update-toast'),recall=byId('app-update-recall');
  const action=byId('app-update-now'),later=byId('app-update-later');
  const message=byId('app-update-message'),heading=byId('app-update-heading');
  byId('app-update-current').textContent='v'+currentVersion;
  let availableVersion=null,dismissedVersion=null,updating=false,inFlight=null,lastCheck=0,wasEligible=false;

  function eligible() {
    if(document.hidden || lobby.classList.contains('hide') ||
       document.body.classList.contains('results-active') || document.body.classList.contains('index-gameplay-suspended') ||
       document.getElementById('performance')?.classList.contains('show') || confirmation.classList.contains('ps-leaving'))return false;
    if(document.querySelector('.modal.show:not(#confirmPlayModal),dialog[open]') || root.PiuCommand?.isOpen() || root.PiuMobileCommand?.isOpen())return false;
    return confirmation.classList.contains('show') ||
      [...document.querySelectorAll('.blockSelectSong,.blockSelectChannel')].some(panel=>!panel.classList.contains('hide'));
  }
  function render() {
    const parent=confirmation.classList.contains('show') ? confirmation : document.body;
    // Stay inside Bootstrap's focus trap while choosing a difficulty.
    if(host.parentNode!==parent)parent.append(host);
    host.hidden=!availableVersion || !eligible();
    const collapsed=dismissedVersion===availableVersion && !updating;
    toast.hidden=collapsed;recall.hidden=!collapsed;
    byId('app-update-latest').textContent=availableVersion ? 'v'+availableVersion : '';
  }
  function resetMessage() {
    heading.textContent='Nova versão disponível';
    message.textContent='Atualize o jogo para receber as últimas melhorias e correções.';
    action.textContent='Atualizar agora';
  }
  async function requestVersion() {
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const url=new URL('changelog.json',location.href);url.searchParams.set('version-check',String(Date.now()));
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();
      if(updating || !parseVersion(data.version))return;
      const next=newer(data.version,currentVersion) ? data.version : null;
      if(next!==availableVersion){availableVersion=next;dismissedVersion=null;resetMessage();}
      render();
    } catch(_) {
      // A failed check must not interrupt selection or hide an already known release.
    } finally {clearTimeout(timeout);}
  }
  function check() {
    if(inFlight)return inFlight;
    if(updating || !eligible() || Date.now()-lastCheck<10000)return Promise.resolve();
    lastCheck=Date.now();
    inFlight=requestVersion().finally(()=>{inFlight=null;});
    return inFlight;
  }
  function sync() {
    const active=eligible();render();
    if(active && !wasEligible)check();
    wasEligible=active;
  }
  later.addEventListener('click',()=>{dismissedVersion=availableVersion;render();recall.focus({preventScroll:true});});
  recall.addEventListener('click',()=>{dismissedVersion=null;render();action.focus({preventScroll:true});});
  action.addEventListener('click',async()=>{
    if(updating || !availableVersion)return;
    updating=true;action.disabled=true;later.hidden=true;host.setAttribute('aria-busy','true');
    heading.textContent='Atualizando o jogo';message.textContent='Baixando os arquivos da nova versão…';action.textContent='Atualizando…';
    try {
      await root.PiuAppUpdate.restart((done,total)=>{message.textContent='Atualizando arquivos: '+done+' de '+total+'…';});
    } catch(error) {
      updating=false;action.disabled=false;later.hidden=false;host.removeAttribute('aria-busy');
      heading.textContent='Não foi possível atualizar';message.textContent='Verifique a conexão e tente novamente. Seus dados foram mantidos.';
      action.textContent='Tentar novamente';render();console.error('Erro ao atualizar o jogo:',error);
    }
  });
  // Menu shortcuts must not turn Enter/Space on a toast button into a song confirmation.
  root.addEventListener('keydown',event=>{
    if(host.contains(event.target) && event.key!=='Tab'){
      event.stopImmediatePropagation();
      if(['Enter',' '].includes(event.key)){
        event.preventDefault();if(!event.repeat)event.target.closest('button')?.click();
      } else if(event.key==='Escape' && !updating && !toast.hidden){event.preventDefault();later.click();}
    } else if(updating && event.key!=='Tab'){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  root.addEventListener('click',event=>{
    if(updating && !host.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','open']});
  ['shown.bs.modal','hidden.bs.modal'].forEach(name=>document.addEventListener(name,sync));
  document.addEventListener('visibilitychange',()=>{sync();if(!document.hidden)check();});
  root.addEventListener('focus',check);root.addEventListener('online',check);
  root.addEventListener('pageshow',()=>{sync();check();});
  setInterval(check,60000);
  sync();
})(globalThis);
