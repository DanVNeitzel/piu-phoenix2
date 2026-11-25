/* Do not cancel multi-touch events: the game needs simultaneous pad presses. */
(function(){
  'use strict';
  const cancelZoom=event=>event.preventDefault();
  for(const type of ['gesturestart','gesturechange','gestureend']){
    document.addEventListener(type,cancelZoom,{passive:false});
  }
  document.addEventListener('wheel',event=>{
    if(event.ctrlKey || event.metaKey)event.preventDefault();
  },{passive:false});
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey || event.metaKey) && ['+','-','=','0','Add','Subtract'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
})();
