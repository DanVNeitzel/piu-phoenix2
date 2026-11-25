/* A single effect channel keeps rapid Command Window navigation clear. */
(function(root){
  'use strict';
  const audio=new Audio();audio.preload='none';audio.volume=1;
  const files={open:'OPEN',move:'MOVE',select:'SELECT',close:'CLOSE'};
  function play(action){
    if(!files[action])return;
    const source='assets/sounds/PHOENIX_2_CW_'+files[action]+'.mp3';
    audio.pause();
    if(audio.getAttribute('src')!==source)audio.src=source;
    else audio.currentTime=0;
    audio.play().catch(()=>{});
  }
  root.PiuCommandAudio={play};
})(globalThis);
