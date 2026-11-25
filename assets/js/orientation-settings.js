/* Shared orientation preference for the installed app, menus and gameplay. */
(function(root) {
  'use strict';
  const modes = {sensor:null,vertical:'portrait',horizontal:'landscape'};
  let pending = null;
  function read() {
    try {
      const mode = localStorage.getItem('piu_orientation');
      return Object.hasOwn(modes,mode) ? mode : 'sensor';
    } catch (_) {return 'sensor';}
  }
  async function perform(mode, {allowFullscreen = false} = {}) {
    const orientation = root.screen?.orientation;
    try {
      if (mode === 'sensor') {orientation?.unlock?.();return {applied:true};}
      if (!orientation?.lock) return {applied:false,reason:'unsupported'};
      try {await orientation.lock(modes[mode]);}
      catch (error) {
        const needsFullscreen = ['SecurityError','InvalidStateError','NotAllowedError'].includes(error.name);
        if (!allowFullscreen || !needsFullscreen || document.fullscreenElement || !document.fullscreenEnabled || !document.documentElement.requestFullscreen) throw error;
        await document.documentElement.requestFullscreen();
        await orientation.lock(modes[mode]);
      }
      return {applied:true};
    } catch (_) {return {applied:false,reason:'unavailable'};}
  }
  function apply(options) {
    if (pending) return pending.then(() => apply(options));
    const mode = read();
    pending = perform(mode,options).finally(() => {
      pending = null;
    });
    return pending;
  }
  function set(mode) {
    if (!Object.hasOwn(modes,mode)) throw new Error('Invalid orientation');
    localStorage.setItem('piu_orientation',mode);
    return apply({allowFullscreen:true});
  }
  root.PiuOrientation = {read,set,apply};
  document.addEventListener('DOMContentLoaded',() => apply());
  document.addEventListener('fullscreenchange',() => apply());
  document.addEventListener('pointerdown',() => apply(),{once:true});
  root.addEventListener('pageshow',() => apply());
})(globalThis);
