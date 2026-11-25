/* Arcade attract -> center step -> player entry, using the local title video. */
(function(root){
  'use strict';
  // The HTML labels identify the loaded build; the update notice checks the published release.
  const byId=id=>document.getElementById(id);
  const attract=document.querySelector('.black_screen');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const backdrop=document.createElement('video');
  backdrop.id='arcade-opening-video';backdrop.className='arcade-opening-video';
  backdrop.muted=true;backdrop.defaultMuted=true;backdrop.loop=true;backdrop.playsInline=true;
  backdrop.preload='none';backdrop.setAttribute('aria-hidden','true');
  backdrop.addEventListener('loadeddata',()=>{if(phase!=='closed')document.body.classList.add('arcade-opening-has-video');});
  backdrop.addEventListener('error',()=>document.body.classList.remove('arcade-opening-has-video'));
  const titleMusic=new Audio();
  titleMusic.id='arcade-title-music';titleMusic.loop=true;titleMusic.volume=.65;titleMusic.preload='none';
  titleMusic.hidden=true;document.body.append(titleMusic);
  let phase='locked',entryTimer=null,entryFallbackTimer=null,entryAudioCleanup=null;
  const inLobby=()=>!containerMobGame.classList.contains('hide');
  function playTitleMusic(){
    if(phase==='closed' || inLobby() || document.hidden) return;
    if(!titleMusic.getAttribute('src')) titleMusic.src='assets/sounds/TITLE_PHOENIX_2.mp3';
    titleMusic.play().catch(()=>{});
  }
  function mountVideo(holder){
    holder.prepend(backdrop);
    if(!backdrop.getAttribute('src')) backdrop.src='assets/videos/mainBg2.mp4';
    if(!reduced.matches && !document.hidden) backdrop.play().catch(()=>{});
    else {backdrop.preload='auto';backdrop.load();}
  }
  function unlock(){
    if(inLobby() || phase!=='locked') return;
    phase='ready';stopMusicPreview();resetAudio();
    playTitleMusic();
    attract.style.display='none';containerMobTitle.classList.remove('hide');
    document.body.classList.add('arcade-opening-active','arcade-opening-ready');
    mountVideo(containerMobTitle.querySelector('.startGameTitle'));
    soundGame.src='assets/sounds/PHOENIX_2_TITLE_READY.mp3';soundGame.volume=.8;soundGame.loop=false;
    soundGame.play().catch(()=>{});
    byId('btnModalLogin').focus({preventScroll:true});
  }
  function start(){
    if(inLobby() || phase==='entering' || phase==='closed') return;
    if(phase==='locked'){unlock();return;}
    phase='entering';byId('btnModalLogin').disabled=true;
    byId('arcade-entry-name').textContent=byId('nameUserGame').textContent || 'PIUWEB';
    byId('arcade-entry-avatar').src=byId('profileUserGame').src;
    soundGame.pause();
    soundGame.src='assets/sounds/PHOENIX_2_TITLE_Pump_It_Up.mp3';
    let animationDone=false,audioDone=false;
    function enterSelection(){
      if(phase!=='entering' || !animationDone || !audioDone) return;
      loginContinue();byId('online-song').querySelector('.listSong.active:not(.wheel-ghost)')?.focus({preventScroll:true});
      document.body.classList.add('arcade-selection-entering');
    }
    function audioFinished(){audioDone=true;enterSelection();}
    soundGame.addEventListener('ended',audioFinished,{once:true});
    soundGame.addEventListener('error',audioFinished,{once:true});
    entryAudioCleanup=()=>{
      soundGame.removeEventListener('ended',audioFinished);
      soundGame.removeEventListener('error',audioFinished);
    };
    soundGame.play().catch(audioFinished);
    document.body.classList.add('arcade-opening-entering');
    entryTimer=setTimeout(()=>{animationDone=true;enterSelection();},reduced.matches?0:600);
    // A failed or stalled audio load must not trap the player on the title screen.
    entryFallbackTimer=setTimeout(audioFinished,8000);
  }
  function close(){
    clearTimeout(entryTimer);clearTimeout(entryFallbackTimer);entryAudioCleanup?.();entryAudioCleanup=null;
    phase='closed';soundGame.pause();
    titleMusic.pause();titleMusic.removeAttribute('src');titleMusic.load();titleMusic.remove();
    backdrop.pause();backdrop.removeAttribute('src');backdrop.load();backdrop.remove();
    attract.style.display='none';
    document.body.classList.remove('arcade-opening-active','arcade-opening-ready','arcade-opening-entering','arcade-opening-has-video');
  }
  byId('arcade-insert').addEventListener('click',unlock);
  document.body.addEventListener('animationend',event=>{
    if(event.animationName==='arcade-selection-fade')document.body.classList.remove('arcade-selection-entering');
  });
  document.addEventListener('keydown',event=>{
    if(inLobby() || phase==='closed' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable]')) return;
    if(document.querySelector('.modal.show,dialog[open]')) return;
    if(event.key==='Enter' || event.key.toLowerCase()==='s' || event.key.toUpperCase()===leftKeyMap.c.toUpperCase()){
      event.preventDefault();event.stopImmediatePropagation();phase==='locked'?unlock():start();
    }
  },true);
  root.PiuOpening={unlock,start,close};
  function updateVideoPlayback(){
    if(phase==='closed') return;
    if(document.hidden) titleMusic.pause();
    else playTitleMusic();
    if(document.hidden || reduced.matches) backdrop.pause();
    else backdrop.play().catch(()=>{});
  }
  document.addEventListener('visibilitychange',updateVideoPlayback);
  reduced.addEventListener('change',updateVideoPlayback);
  let restoringResult=false;
  try{restoringResult=!!JSON.parse(sessionStorage.getItem('piu_single_result') || 'null')?.performance;}catch(_){}
  if(!inLobby() && !restoringResult && location.hash!=='#selection'){
    document.body.classList.add('arcade-opening-active');mountVideo(attract);playTitleMusic();
  }
})(globalThis);
