/* Shared adapter for real commands, storage and the original form controls. */
(function(root) {
  'use strict';
  const covers = {'EXCEED2-OLD':'OLD','EXCEED2-FLOWERCARD':'FLOWER','FIESTA-DRUM':'DRUM','FIESTA-LIGHTING':'LIGHTHING',
    'FIESTA-MISSILE':'MISSILE','FIESTA-SOCCER':'FOOTBALL','FIESTAEX-BASIC':'BASIC','NX2-DOG':'DOG','NX2-E-FIRE':'FIRE',
    'NX2-E-ICE':'ICE','NX2-E-WIND':'WIND','NX2-GIRL':'GIRL','NX2-SHEEP':'SHEEP','NX2-YASANGMA':'HORSE','PREMIERE':'REBIRTH',
    'ZERO-CANOND':'CANON','ZERO-EASY':'EASY','ZERO-MUSICAL':'MUSIC','ZERO-POKER':'POKER','ZERO-SLIME':'SLIME'};
  const value = selector => document.querySelector(selector + '.focus')?.value;
  const bounded = (n,min,max,fallback) => Number.isFinite(Number(n)) ? Math.max(min,Math.min(max,Number(n))) : fallback;
  function selectedNoteskin() {
    const saved = localStorage.getItem('last_noteskin');
    const skins = [...document.querySelectorAll('.noteskin-option')];
    return skins.find(button => button.value === saved)?.value || value('.noteskin-option') || 'PHOENIX2';
  }
  function touchStyle() {
    return (typeof selsong!=='undefined' && typeof chart_level!=='undefined' && selsong?.levels[chart_level]?.STEPSTYPE) ||
      (typeof channelChartFilter!=='undefined' && channelChartFilter?.type) || 'pump-single';
  }
  function defaults() {
    const touch = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return {mode:'multiplier',speed:1,av:300,skin:'PHOENIX2',bga:'on',vanish:false,fd:false,hj:false,randomNote:false,autoplay:false,rush:1,offset:0,touch,size:touch ? 1 : 0,touchLayoutStyle:touchStyle(),touchLayout:PiuTouchLayout.defaults()};
  }
  function read() {
    const scroll = PiuScroll.state();
    return {mode:scroll.mode,speed:scroll.multiplier,av:scroll.target,skin:selectedNoteskin(),autoplay:localStorage.getItem('piu_autoplay') === 'true',
      bga:value('.bga-option') || 'on',vanish:localStorage.getItem('piu_vanish') === 'true',fd:localStorage.getItem('piu_fd') === 'true',hj:localStorage.getItem('piu_hj') === 'true',randomNote:localStorage.getItem('piu_random_note') === 'true',rush:Number(value('.rush-option') || 1),offset:Number(document.getElementById('offset').value || 0),
      touch:document.getElementById('touchInput').checked,size:Number(document.getElementById('touchpadSize').value),touchLayoutStyle:touchStyle(),touchLayout:PiuTouchLayout.read(touchStyle())};
  }
  function options() {
    const values = selector => [...document.querySelectorAll(selector)].map(el => el.value);
    return {speeds:values('.speed-option').map(Number),rush:values('.rush-option').map(Number),skins:values('.noteskin-option').map(value => ({value,cover:covers[value] || value}))};
  }
  function skinImage(value) { return 'assets/img/CW_settings/noteskin_cover/' + (covers[value] || value) + '.png'; }
  function apply(state) {
    const choose = (selector,key,value,select) => {
      const button = [...document.querySelectorAll(selector)].find(el => el.value === String(value));
      if (button) { select(button); localStorage.setItem(key,String(value)); }
    };
    choose('.noteskin-option','last_noteskin',state.skin,selectNote);
    choose('.bga-option','last_bga',state.bga,selectBGA);
    choose('.rush-option','last_playback',state.rush,selectRush);
    if (typeof state.vanish === 'boolean') setVanish(state.vanish);
    if (typeof state.fd === 'boolean') setFD(state.fd);
    if (typeof state.hj === 'boolean') setHJ(state.hj);
    if (typeof state.randomNote === 'boolean') setRandomNote(state.randomNote);
    if (typeof state.autoplay === 'boolean') setAutoplay(state.autoplay);
    const input = (id,value) => { const el=document.getElementById(id);el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true})); };
    input('offset',bounded(state.offset,-5,5,0));
    input('touchpadSize',Math.round(bounded(state.size,0,6,1)));
    const touch = document.getElementById('touchInput');touch.checked=!!state.touch;touch.dispatchEvent(new Event('change',{bubbles:true}));
    localStorage.setItem('piu_auto_velocity',String(Math.round(bounded(state.av,1,2000,300))));
    PiuScroll.setMultiplier(bounded(state.speed,0.5,20,1));
    if (state.mode === 'auto') PiuScroll.setAutoVelocity(state.av);
    PiuScroll.changed();
    if(state.touchLayout) PiuTouchLayout.save(state.touchLayout,state.touchLayoutStyle || touchStyle());
  }
  function setVanish(enabled) {
    localStorage.setItem('piu_vanish',String(enabled === true));
    PiuScroll.changed();
  }
  function setFD(enabled) {
    localStorage.setItem('piu_fd',String(enabled === true));
    PiuScroll.changed();
  }
  function setHJ(enabled) {
    localStorage.setItem('piu_hj',String(enabled === true));
    PiuScroll.changed();
  }
  function setRandomNote(enabled) {
    localStorage.setItem('piu_random_note',String(enabled === true));
    PiuScroll.changed();
  }
  function resolveNoteskin(state = read()) {
    if (!state.randomNote) return state.skin;
    const skins = [...new Set(options().skins.map(skin => skin.value))];
    return skins.length ? skins[Math.floor(Math.random() * skins.length)] : state.skin;
  }
  function setAutoplay(enabled) {
    localStorage.setItem('piu_autoplay',String(enabled === true));
    PiuScroll.changed();
  }
  root.PiuGameSettings = {read,apply,defaults,options,skinImage,setVanish,setFD,setHJ,setRandomNote,setAutoplay,resolveNoteskin};
})(globalThis);
