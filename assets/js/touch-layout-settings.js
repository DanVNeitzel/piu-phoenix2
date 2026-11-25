/* Touch appearance is stored separately for portrait and landscape. */
(function(root){
  'use strict';
  const key='piu_touch_layout_v1',clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
  const offset=v=>({x:clamp(v?.x,-.45,.45,0),y:clamp(v?.y,-.6,.6,0)});
  const width=v=>v==null?null:clamp(v,.2,1,null);
  const appearance=v=>({size:clamp(v?.size,.6,1.4,1),opacity:clamp(v?.opacity,.1,1,.3),fieldY:clamp(v?.fieldY,-1,1,0),fieldWidth:width(v?.fieldWidth),lifeWidth:width(v?.lifeWidth),lifeHeight:clamp(v?.lifeHeight,.5,2.5,1)});
  function normalize(value){return{version:1,portrait:{...appearance(value?.portrait),...offset(value?.portrait)},landscape:{...appearance(value?.landscape),left:offset(value?.landscape?.left),right:offset(value?.landscape?.right)}};}
  const defaults=()=>normalize(null);
  const storageKey=style=>style==='pump-halfdouble'?'piu_touch_layout_halfdouble_v1':key;
  function read(style){try{return normalize(JSON.parse(localStorage.getItem(storageKey(style))||'null'));}catch(_){return defaults();}}
  function save(value,style){const result=normalize(value);localStorage.setItem(storageKey(style),JSON.stringify(result));return result;}
  root.PiuTouchLayout={read,save,defaults,normalize};
})(globalThis);
