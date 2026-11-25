/* Arcade menu shortcuts; gameplay retains the player's configured key map. */
(function(){
  'use strict';
  const gap=600;
  let navigation='',navigationTime=0,velocity='',velocityTimer=null;
  function clear(){navigation='';navigationTime=0;velocity='';clearTimeout(velocityTimer);velocityTimer=null;}
  function context(){
    if(document.querySelector('.modal.show,dialog[open]') || PiuCommand.isOpen())return '';
    if(document.body.classList.contains('desktop-song-select'))return 'songs';
    if(document.body.classList.contains('desktop-channel-select'))return 'channels';
    return '';
  }
  function prefix(history,key,patterns){
    const value=history+key;let best='';
    for(const pattern of patterns)for(let length=1;length<=pattern.length;length++){
      const part=pattern.slice(0,length);
      if(part.length>best.length&&value.endsWith(part))best=part;
    }
    return best;
  }
  function changeSpeed(delta){
    const value=Math.max(.5,Math.min(20,Number((PiuScroll.state().multiplier+delta).toFixed(2))));
    try{PiuScroll.setMultiplier(value);PiuCommandAudio.play('select');}
    catch(_){showNotification('Não foi possível salvar a velocidade.','error');}
  }
  function moveChannel(delta){
    if(window.PiuChannels){window.PiuChannels.move(delta);return;}
    const cards=[...document.querySelectorAll('#stage .listSong')];if(!cards.length)return;
    const focused=cards.indexOf(document.activeElement);
    const current=focused>=0?focused:Math.max(0,cards.findIndex(card=>card.classList.contains('active')));
    const next=cards[(current+delta+cards.length)%cards.length];
    next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest'});
    changeSongAudio();
  }
  document.addEventListener('keydown',event=>{
    const scope=context();
    if(!scope || event.ctrlKey || event.altKey || event.metaKey || event.isComposing ||
       event.target.closest('input,select,textarea,[contenteditable]')){clear();return;}
    const key=event.key.toLowerCase();
    if(scope==='channels' && ['arrowleft','arrowright','arrowup','arrowdown','enter'].includes(key)){
      event.preventDefault();event.stopImmediatePropagation();clear();
      if(key==='enter'){
        if(!event.repeat)(document.activeElement?.closest('#stage .listSong') || document.querySelector('#stage .listSong.active') || document.querySelector('#stage .listSong'))?.click();
      }else moveChannel(['arrowleft','arrowup'].includes(key)?-1:1);
      return;
    }
    if(!['z','c','s','q','e'].includes(key)){clear();return;}
    event.preventDefault();event.stopImmediatePropagation();
    if(key==='s'){
      clear();if(event.repeat)return;
      if(scope==='songs')document.querySelector('#online-song .listSong.active:not(.wheel-ghost)')?.click();
      else (document.activeElement?.closest('#stage .listSong') || document.querySelector('#stage .listSong.active') || document.querySelector('#stage .listSong'))?.click();
      return;
    }
    if(key==='z'||key==='c'){
      clearTimeout(velocityTimer);velocityTimer=null;velocity='';
      if(scope==='channels'){
        moveChannel(key==='z'?-1:1);
        if(!window.PiuChannels?.isLevelPicker()){navigation='';return;}
      }else document.getElementById(key==='z'?'arrowSongLeft':'arrowSongRight').click();
      if(event.repeat)return;
      const now=performance.now();if(now-navigationTime>gap)navigation='';navigationTime=now;
      navigation=prefix(navigation,key,['zczczc']);
      if(navigation==='zczczc'){
        clear();
        if(matchMedia('(min-width:1024px) and (orientation:landscape)').matches)PiuCommand.open();
        else PiuMobileCommand.open();
      }
      return;
    }
    navigation='';if(event.repeat)return;
    if(scope==='channels'){clear();selectionBack();return;}
    clearTimeout(velocityTimer);velocity=prefix(velocity,key,['qeqeqe','eqeqeq']);
    if(velocity.length===6){const delta=velocity==='qeqeqe'?.5:-.5;clear();changeSpeed(delta);return;}
    velocityTimer=setTimeout(()=>{clear();if(context()==='songs')selectChannel();},gap);
  },true);
  window.addEventListener('blur',clear);
  document.addEventListener('pointerdown',clear,true);
  document.addEventListener('show.bs.modal',clear);
  let previous=context();
  new MutationObserver(()=>{const next=context();if(next!==previous){clear();previous=next;}})
    .observe(document.body,{attributes:true,attributeFilter:['class']});
})();
