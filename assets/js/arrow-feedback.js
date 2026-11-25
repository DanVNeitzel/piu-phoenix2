/* Brief directional feedback without changing the arrow's size or position. */
(function(root){
  'use strict';
  const animations=new WeakMap();
  function flash(id){
    const image=document.getElementById(id)?.querySelector('img');
    if(!image?.animate)return;
    animations.get(image)?.cancel();
    const original=getComputedStyle(image).filter;
    const base=original==='none'?'':original;
    const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
    const glow=base+(reduced?' brightness(1.6) drop-shadow(0 0 10px #8ff8ff)':
      ' brightness(2.4) saturate(.65) drop-shadow(0 0 7px #fff) drop-shadow(0 0 24px #00e5ff)');
    const animation=image.animate([
      {filter:glow},
      {filter:glow,offset:.35},
      {filter:original}
    ],{duration:reduced?100:320,easing:'ease-out'});
    animations.set(image,animation);
  }
  root.PiuArrowFeedback={flash};
})(globalThis);
