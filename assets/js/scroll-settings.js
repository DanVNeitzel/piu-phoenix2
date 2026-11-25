/* Persistent note speed settings shared by the classic and arcade controls. */
(function (root) {
  'use strict';
  const changed = () => document.dispatchEvent(new Event('piu:settingschange'));
  function state() {
    const multiplier = Number(document.querySelector('.speed-option.focus')?.value || localStorage.getItem('last_speed') || 1);
    const target = Number(localStorage.getItem('piu_auto_velocity')) || 300;
    return {mode:localStorage.getItem('piu_scroll_mode') === 'auto' ? 'auto' : 'multiplier', multiplier,
      target:Math.max(1, Math.min(2000, Math.round(target)))};
  }
  function setMultiplier(value) {
    const multiplier = Number(value);
    if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 20) return;
    const buttons = [...document.querySelectorAll('.speed-option')];
    buttons.forEach(button => button.classList.toggle('focus', Number(button.value) === multiplier));
    // The +0.5 command may create values outside the original preset buttons.
    if (!buttons.some(button => Number(button.value) === multiplier)) {
      const button = document.createElement('button');
      button.type = 'button'; button.value = String(multiplier); button.textContent = multiplier + 'X';
      button.className = 'speed-option button speed sound-confirm focus';
      button.addEventListener('click', () => setMultiplier(multiplier));
      document.querySelector('.select-speed').append(button);
    }
    localStorage.setItem('last_speed', String(multiplier));
    localStorage.setItem('piu_scroll_mode', 'multiplier'); changed();
  }
  function setAutoVelocity(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    localStorage.setItem('piu_auto_velocity', String(Math.max(1, Math.min(2000, Math.round(number)))));
    localStorage.setItem('piu_scroll_mode', 'auto'); changed();
  }
  function referenceBpm(song, level) {
    if (!song || level === null || level === undefined) return 0;
    const display = String(song.levels[level]?.DISPLAYBPM || song.meta.DISPLAYBPM || '');
    const advertised = display.split(':').map(Number).filter(value => Number.isFinite(value) && value > 0);
    if (advertised.length) return Math.max(...advertised);
    const bpms = song.getBMPs(level).map(pair => Number(pair[1])).filter(value => Number.isFinite(value) && value > 0);
    return bpms.length ? Math.max(...bpms) : 0;
  }
  function resolve(song, level, playback = 1) {
    const settings = state(), bpm = referenceBpm(song, level);
    return {...settings, referenceBpm:bpm,
      speed:settings.mode === 'auto' && bpm > 0 ? settings.target / (bpm * Number(playback || 1)) : settings.multiplier};
  }
  function label(settings) {
    return settings.mode === 'auto' ? 'AV ' + settings.target : Number(settings.speed ?? settings.multiplier).toLocaleString('en-US', {maximumFractionDigits:2}) + 'X';
  }
  root.PiuScroll = {state,setMultiplier,setAutoVelocity,referenceBpm,resolve,label,changed};
  const saved = Number(localStorage.getItem('last_speed'));
  if (saved > 0 && saved <= 20) {
    const mode = localStorage.getItem('piu_scroll_mode') || 'multiplier';
    setMultiplier(saved); localStorage.setItem('piu_scroll_mode',mode);
  }
})(globalThis);
