/* Open the real frozen stage from Command Window, without starting a song. */
(function(root){
  'use strict';
  const host=document.createElement('dialog');host.id='touch-preview-host';host.setAttribute('aria-label','Prévia do touchpad antes de jogar');
  host.innerHTML='<p id="touch-preview-loading" role="status">Carregando prévia do touchpad…</p><button type="button" id="touch-preview-close" aria-label="Voltar ao Command Window">×</button>';
  document.body.append(host);let frame=null,callback=null,returnFocus=null;
  function close(layout=null,saved=false){
    if(!host.open)return;host.close();frame?.remove();frame=null;
    sessionStorage.removeItem('piu_touch_preview_config');
    const back=callback;callback=null;back?.(layout,saved);returnFocus?.focus({preventScroll:true});
    if(document.body.classList.contains('desktop-song-select')&&mp3path)previewMusic(mp3path);
  }
  function open(settings,onClose){
    if(host.open)return false;
    const config=createSingleConfig(settings);if(!config)return false;
    config.useTouchInput=true;
    try{sessionStorage.setItem('piu_touch_preview_config',JSON.stringify(config));}catch(_){showNotification('Não foi possível abrir a prévia local.','error');return false;}
    callback=onClose;returnFocus=document.activeElement;
    (document.querySelector('#confirmPlayModal.show') || document.body).append(host);
    root.PiuMobileCommand?.close();root.PiuCommand?.close();stopMusicPreview();resetAudio();
    const loading=document.getElementById('touch-preview-loading');loading.textContent='Carregando prévia do touchpad…';loading.hidden=false;
    frame=document.createElement('iframe');frame.title='Editor visual do touchpad';frame.src='localStage.html?preview=touchpad';host.prepend(frame);host.showModal();
    return true;
  }
  window.addEventListener('message',event=>{
    if(!host.open||event.source!==frame?.contentWindow||event.origin!==location.origin||event.data?.type!=='piu-touch-preview')return;
    if(event.data.ready)document.getElementById('touch-preview-loading').hidden=true;
    if(event.data.error){const status=document.getElementById('touch-preview-loading');status.textContent=event.data.error;status.hidden=false;}
    if(event.data.closed)close(event.data.layout,event.data.saved===true);
  });
  host.addEventListener('cancel',event=>{event.preventDefault();close();});document.getElementById('touch-preview-close').onclick=()=>close();
  root.PiuTouchPreview={open};
})(globalThis);
