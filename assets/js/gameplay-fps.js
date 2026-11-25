/* Count actual engine renders; update the small readout twice per second. */
(function(root) {
  'use strict';
  function mount(engine, preview = false) {
    const element=document.getElementById('game-fps');
    let enabled=false;
    try {enabled=localStorage.getItem('piu_show_fps')==='true';} catch (_) {}
    if(!element || !enabled || preview)return {reset(){},stop(){}};
    let start=null,frames=0;
    function reset(){start=null;frames=0;element.textContent='FPS: 00.00';}
    const onFrame=time=>{
      if(document.hidden){reset();return;}
      if(start===null){start=time;return;}
      frames++;
      const elapsed=time-start;
      if(elapsed>=500){element.textContent='FPS: '+(frames*1000/elapsed).toFixed(2).padStart(5,'0');start=time;frames=0;}
    };
    engine.onFrame=onFrame;reset();element.hidden=false;
    document.addEventListener('visibilitychange',reset);
    return {reset,stop(){
      if(engine.onFrame===onFrame)engine.onFrame=null;
      document.removeEventListener('visibilitychange',reset);element.hidden=true;
    }};
  }
  root.PiuGameplayFPS={mount};
})(globalThis);
