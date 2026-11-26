/* Desktop wheel using the original selection, modals and local records. */
(function () {
  'use strict';
  const desktop = matchMedia('(min-width:1024px) and (orientation:landscape)');
  const byId = id => document.getElementById(id);
  const songBackground = document.createElement('img');
  songBackground.className = 'selection-song-background';
  songBackground.alt = ''; songBackground.hidden = true;
  songBackground.decoding = 'async';
  document.querySelector('.bg-static').append(songBackground);
  let backgroundVersion = 0, backgroundSong = null, backgroundSource = '';
  function updateSongBackground() {
    const source = imgpath || (song ? songBanner(song) : '');
    if (backgroundSong === song && backgroundSource === source && !songBackground.hidden) return;
    backgroundSong = song; backgroundSource = source;
    const version = ++backgroundVersion;
    songBackground.hidden = true;
    document.body.classList.remove('has-song-background');
    const folder = sscpath ? sscpath.slice(0, sscpath.lastIndexOf('/') + 1) : '';
    const candidates = [...new Set([source, song ? songBanner(song) : '',
      selsong?.meta.BANNER ? folder + selsong.meta.BANNER : '',
      selsong?.meta.BACKGROUND ? folder + selsong.meta.BACKGROUND : ''].filter(Boolean).map(libraryUrl))];
    function next() {
      if (version !== backgroundVersion) return;
      const url = candidates.shift();
      if (url) songBackground.src = url;
      else songBackground.removeAttribute('src');
    }
    songBackground.onload = () => {
      if (version !== backgroundVersion) return;
      songBackground.hidden = false;
      document.body.classList.add('has-song-background');
    };
    songBackground.onerror = next;
    next();
  }
  const frame = document.createElement('div'); frame.className = 'desktop-arcade';
  frame.innerHTML = '<button id="desktop-return" aria-label="Voltar às músicas"><img src="assets/img/phx2/arrow_red_shift_l.png" alt=""></button>' +
    '<button id="desktop-channels-right" aria-label="Selecionar canal" title="Canais"><img src="assets/img/phx2/arrow_red_shift_r.png" alt=""></button><div id="desktop-channel"></div>' +
    '<div id="desktop-options"><button data-command-category="speed" data-bs-toggle="modal" data-bs-target="#commandWindow" aria-label="Ajustar velocidade"><small>SPEED</small><span id="desktop-speed">1X</span></button><button data-command-category="noteskin" data-bs-toggle="modal" data-bs-target="#commandWindow" aria-label="Ajustar noteskin"><img id="desktop-noteskin" alt="Noteskin atual"></button><button data-command-category="display" data-bs-toggle="modal" data-bs-target="#commandWindow" aria-label="Ajustar fundo"><small>BGA</small><span id="desktop-bga">ON</span></button><button data-command-category="rush" data-bs-toggle="modal" data-bs-target="#commandWindow" aria-label="Ajustar rush"><small>RUSH</small><span id="desktop-rush">100%</span></button><button id="desktop-control-mode" data-command-category="touch" data-bs-toggle="modal" data-bs-target="#commandWindow"></button></div><div id="desktop-footer"></div>';
  document.body.append(frame);
  const playerMenu = document.createElement('button'); playerMenu.id='mobile-player-menu-trigger'; playerMenu.type='button';
  playerMenu.className='mobile-only'; playerMenu.textContent='☰';playerMenu.setAttribute('aria-label','Menu do jogador');
  playerMenu.setAttribute('data-bs-toggle','modal');playerMenu.setAttribute('data-bs-target','#mobile-player-menu');
  byId('playerLog').querySelector('.cardUserDetails').append(playerMenu);
  const menu = document.createElement('div');menu.className='modal';menu.id='mobile-player-menu';menu.tabIndex=-1;
  menu.setAttribute('aria-label','Menu do jogador');
  menu.innerHTML='<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2>PIUWEB</h2><button type="button" data-bs-dismiss="modal" aria-label="Fechar">×</button></div><div class="modal-body"><button data-player-action="command">COMMAND WINDOW</button><button data-player-action="history">HISTÓRICO</button><button data-player-action="details">ESTATÍSTICAS</button><button data-player-action="settings">CONFIGURAÇÕES</button></div></div></div>';
  document.body.append(menu);
  menu.querySelectorAll('[data-player-action]').forEach(button=>button.addEventListener('click',()=>{
    menu.addEventListener('hidden.bs.modal',()=>{
      const action=button.dataset.playerAction;
      if(action==='command') { window.PiuMobileCommand?.open();return; }
      if(action==='history') {getHistory();populateHistoryModal();}
      if(action==='details') getInfoPlayer();
      bootstrap.Modal.getOrCreateInstance(byId({history:'historyModal',details:'playerDetailsWindow',settings:'settingsMenu'}[action])).show();
    },{once:true});bootstrap.Modal.getInstance(menu).hide();
  }));
  const selecting = () => document.body.classList.contains('desktop-song-select');
  const songLinks = () => [...byId('online-song').querySelectorAll('.listSong:not(.wheel-ghost)')];
  const activeIndex = links => Math.max(0, links.findIndex(el => el.classList.contains('active')));
  function moveSong(delta) {
    window.PiuArrowFeedback?.flash(delta<0?'arrowSongLeft':'arrowSongRight');
    const links = songLinks(); if (!links.length) return;
    links[(activeIndex(links) + delta + links.length) % links.length].click();
  }
  function arrangeEdges() {
    const wheel = byId('online-song');
    wheel.querySelectorAll('.wheel-ghost').forEach(el => el.remove());
    const links = songLinks();
    // Our selection state owns the wheel; Bootstrap must not activate a cloned edge.
    links.forEach(link => link.removeAttribute('data-bs-toggle'));
    if (links.length < 2) return;
    function duplicate(original) {
      const ghost = original.cloneNode(true);
      ghost.classList.add('wheel-ghost'); ghost.classList.remove('active');
      ghost.removeAttribute('data-bs-toggle');
      ghost.tabIndex = -1; ghost.setAttribute('aria-hidden','true');
      ghost.onclick = event => { event.preventDefault(); original.click(); };
      if(original.favoriteSongData)bindFavoriteGesture(ghost,original.favoriteSongData);
      ghost.querySelectorAll('img').forEach(img => img.onerror = () => img.hidden = true);
      return ghost;
    }
    links.slice(-3).reverse().forEach(el => wheel.prepend(duplicate(el)));
    links.slice(0,3).forEach(el => wheel.append(duplicate(el)));
  }
  ['Left','Right'].forEach(side => {
    const button = byId('arrowSong' + side);
    button.innerHTML = '<img src="assets/img/phx2/' + (side === 'Left' ? 'arrow_blue_shift_l.png' : 'arrow_blue_shift_r.png') + '" alt="">';
    button.setAttribute('aria-label', side === 'Left' ? 'Música anterior' : 'Próxima música');
    button.title = side === 'Left' ? 'Música anterior (←)' : 'Próxima música (→)';
    button.addEventListener('click', event => {
      if (!selecting()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      moveSong(side === 'Left' ? -1 : 1);
    }, true);
  });
  let centeredSong = null, centerFrame = 0, motionFrame = 0;
  function stopWheelMotion() {
    cancelAnimationFrame(motionFrame);motionFrame=0;
    byId('online-song').classList.remove('song-wheel-moving');
  }
  function scheduleCenter(smooth) {
    cancelAnimationFrame(centerFrame);
    centerFrame=requestAnimationFrame(()=>{centerFrame=0;centerSong(smooth);});
  }
  function centerSong(smooth) {
    if (!selecting()) return;
    const wheel = byId('online-song'), links = songLinks(), index = activeIndex(links);
    const all = [...wheel.querySelectorAll('.listSong')], position = all.indexOf(links[index]);
    all.forEach((el, i) => { el.style.setProperty('--tilt', (i < position ? 16 : i > position ? -16 : 0) + 'deg'); el.setAttribute('aria-current', String(i === position)); });
    const selected = links[index];
    const previousIndex = links.indexOf(centeredSong);
    // Wrap directly across the ends instead of scrolling past every song.
    const wrapping = links.length > 2 && previousIndex >= 0 &&
      Math.abs(index - previousIndex) === links.length - 1;
    const animate = smooth && !wrapping && !matchMedia('(prefers-reduced-motion:reduce)').matches;
    stopWheelMotion();
    if (selected) {
      const target=Math.max(0,Math.min(wheel.scrollWidth-wheel.clientWidth,selected.offsetLeft-(wheel.clientWidth-selected.offsetWidth)/2));
      const from=wheel.scrollLeft,start=performance.now();
      wheel.classList.add('song-wheel-moving');
      const move=now=>{
        const progress=animate?Math.min(1,(now-start)/180):1;
        wheel.scrollTo({left:from+(target-from)*(1-Math.pow(1-progress,3)),behavior:'instant'});
        if(progress<1)motionFrame=requestAnimationFrame(move);
        else {motionFrame=0;wheel.classList.remove('song-wheel-moving');}
      };
      move(start);
    }
    centeredSong = selected || null;
    byId('desktop-footer').textContent = 'SINGLE PLAYER  [ ' + (links.length ? index + 1 : 0) + ' / ' + links.length + ' ]  ·  ' + (desktop.matches ? 'ENTER CONFIRMAR' : 'RECORDES LOCAIS');
  }
  function showConfirmation() {
    if (!selecting() || chart_level === null || document.querySelector('.btnSelectMusic').disabled) return;
    if(confirmPlay()) bootstrap.Modal.getOrCreateInstance(byId('confirmPlayModal')).show();
  }
  function positionChannel() {
    if (!document.body.matches('.desktop-song-select,.desktop-channel-select')) return;
    const player = byId('playerLog').getBoundingClientRect();
    const right = byId('desktop-channels-right').getBoundingClientRect();
    const portrait = matchMedia('(orientation:portrait)').matches;
    const left = portrait ? 64 : player.right + 16;
    const width = portrait ? innerWidth - 128 : right.left - left - 16;
    const channel = byId('desktop-channel');
    channel.style.setProperty('--channel-left', left + 'px');
    channel.style.setProperty('--channel-width', Math.max(0,width) + 'px');
    channel.style.setProperty('--channel-top', (portrait ? player.bottom + 8 : player.top + player.height / 2) + 'px');
  }
  function updateOptions() {
    const commands=PiuGameSettings.read(), touch=commands.touch;
    PiuActiveModifiers.render(byId('desktop-options'),commands);
    if(byId('desktop-control-mode').dataset.touch!==String(touch)){PiuControlMode.render(byId('desktop-control-mode'),touch);byId('desktop-control-mode').dataset.touch=String(touch);}
    const scroll = PiuScroll.state();
    byId('desktop-speed').textContent = scroll.mode === 'auto' ? scroll.target : 'X' + scroll.multiplier;
    byId('desktop-speed').previousElementSibling.textContent = scroll.mode === 'auto' ? 'AV' : 'SPEED';
    byId('desktop-bga').textContent = (document.querySelector('.bga-option.focus')?.value || 'on').toUpperCase();
    byId('desktop-rush').textContent = Math.round(Number(document.querySelector('.rush-option.focus')?.value || 1) * 100) + '%';
    byId('desktop-bga').parentElement.hidden = byId('desktop-bga').textContent === 'ON';
    byId('desktop-rush').parentElement.hidden = Number(document.querySelector('.rush-option.focus')?.value || 1) === 1;
    const skin=PiuGameSettings.skinImage(PiuGameSettings.read().skin);
    if(byId('desktop-noteskin').getAttribute('src')!==skin) byId('desktop-noteskin').src=skin;
    const channelName = currentChannel === 'favorites' ? 'FAVORITES' : songsJson?.children[stageIndex]?.name || 'CARREGANDO BIBLIOTECA';
    byId('desktop-channel').textContent = channelName.replace(/^\d+\s*-\s*/, '') + (channelChartFilter?.level ? ' · LV. ' + channelChartFilter.level : '');
    byId('desktop-channel').title = byId('desktop-channel').textContent;
  }
  function updateMode() {
    const lobby = !containerMobGame.classList.contains('hide') && !byId('performance').classList.contains('show');
    document.body.classList.toggle('arcade-mobile',!desktop.matches);
    document.body.classList.toggle('desktop-song-select', lobby && !blockSelectSong.classList.contains('hide'));
    document.body.classList.toggle('desktop-channel-select', lobby && !blockSelectChannel.classList.contains('hide'));
    const channelList = document.body.classList.contains('desktop-channel-select');
    const backDisabled=lobby && !!window.PiuChannels?.isRootPicker();
    const backLabel=backDisabled?'Voltar indisponível: selecione um canal':
      window.PiuChannels?.isLevelPicker() || window.PiuChannels?.isSeriesPicker()?'Voltar aos canais':
      channelChartFilter?.type && !channelList?'Voltar aos níveis':
      currentChannel!=='favorites' && PiuLibrary.isSeries(songsJson?.children[stageIndex]) && !channelList?'Voltar às séries':channelList?'Voltar às músicas':'Selecionar canal';
    ['desktop-return','desktop-channels-right','btnAllChannels'].forEach(id=>{
      const button=byId(id);button.disabled=backDisabled;
      button.setAttribute('aria-disabled',String(backDisabled));button.setAttribute('aria-label',backLabel);button.title=backLabel;
    });
    updateOptions(); scheduleCenter(false); requestAnimationFrame(positionChannel);
    refreshInterfaceBackground();
    ['Left','Right'].forEach(side=>byId('arrowSong'+side).setAttribute('aria-label',side==='Left'?'Música anterior':'Próxima música'));
    if (desktop.matches && !window.PiuChannels && !blockSelectChannel.classList.contains('hide')) byId('stage').querySelector('.active')?.scrollIntoView({block:'nearest',inline:'center'});
  }
  byId('desktop-channels-right').addEventListener('click',selectionBack);
  byId('desktop-return').addEventListener('click',selectionBack);
  const observer = new MutationObserver(updateMode);
  [containerMobGame,blockSelectSong,blockSelectChannel,byId('performance')].forEach(el => observer.observe(el, {attributes:true,attributeFilter:['class']}));
  document.addEventListener('piu:channelview',updateMode);
  desktop.addEventListener('change', updateMode);
  window.addEventListener('resize', () => { scheduleCenter(false); positionChannel(); });
  const headerObserver = new ResizeObserver(positionChannel);
  headerObserver.observe(byId('playerLog'));
  headerObserver.observe(byId('desktop-channels-right'));
  ['piu:songchange','piu:songready','piu:stagechange'].forEach(name => document.addEventListener(name, () => {
    if (name === 'piu:stagechange') arrangeEdges();
    if (name !== 'piu:stagechange') updateSongBackground();
    updateOptions();
    // Chart downloads may finish during a swipe; they must not pull the wheel back.
    if(name!=='piu:songready')scheduleCenter(name !== 'piu:stagechange');
  }));
  document.addEventListener('piu:levelchange', () => { updateOptions(); if (desktop.matches) byId('level').querySelector('.active')?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'}); });
  document.addEventListener('click', () => requestAnimationFrame(updateOptions));
  document.addEventListener('piu:settingschange', updateOptions);
  byId('online-song').addEventListener('click', event => {
    const selected = event.target.closest('.listSong:not(.wheel-ghost)');
    if (!selecting() || !selected || Number(selected.dataset.songIndex ?? selected.dataset.idx) !== songIndex ||
        (selected.dataset.stageIndex !== undefined && Number(selected.dataset.stageIndex) !== stageIndex)) return;
    // Confirm the current choice without reloading its charts or resetting the level.
    event.preventDefault(); event.stopImmediatePropagation();
    if (!document.querySelector('.modal.show')) showConfirmation();
  }, true);
  document.addEventListener('keydown', event => {
    if (!desktop.matches || event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
    const modal = document.querySelector('.modal.show,dialog[open]');
    if (modal) {
      return;
    }
    if (!selecting() && !document.body.classList.contains('desktop-channel-select')) return;
    if (event.key === 'Escape') { event.preventDefault(); if(!event.repeat)selectionBack(); return; }
    if (!selecting()) return;
    if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); moveSong(event.key === 'ArrowLeft' ? -1 : 1); }
    else if (['ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault(); const levels = [...byId('level').querySelectorAll('.listStep')];
      levels[Math.max(0, Math.min(levels.length - 1, activeIndex(levels) + (event.key === 'ArrowUp' ? -1 : 1)))]?.click();
    } else if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); showConfirmation(); }
  });
  let lastWheel = 0;
  window.addEventListener('wheel', event => {
    if (!selecting() || document.querySelector('.modal.show,dialog[open]') || !event.target.closest('.blockSelectSong')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (performance.now() - lastWheel < 180) return;
    const delta=event.deltaX || event.deltaY;if(!delta)return;
    lastWheel = performance.now(); moveSong(delta > 0 ? 1 : -1);
  }, {capture:true,passive:false});
  let scrollingByTouch=false,pointerActive=false,settleTimer=null;
  ['piu:favoritechange','piu:songchange','piu:stagechange'].forEach(name=>document.addEventListener(name,()=>{scrollingByTouch=false;clearTimeout(settleTimer);}));
  const wheel=byId('online-song');
  wheel.addEventListener('pointerdown',event=>{
    if(desktop.matches && event.pointerType!=='touch')return;
    pointerActive=true;scrollingByTouch=true;
    clearTimeout(settleTimer);cancelAnimationFrame(centerFrame);stopWheelMotion();
  });
  function settleTouchScroll() {
    if(!scrollingByTouch || pointerActive || !selecting())return;
    clearTimeout(settleTimer);settleTimer=setTimeout(()=>{
      if(!selecting() || !scrollingByTouch || pointerActive) return;
      scrollingByTouch=false;
      // A pending carousel scroll must not change songs behind the level preview.
      if(document.querySelector('.modal.show,dialog[open]')) return;
      const links=[...wheel.querySelectorAll('.listSong')];if(!links.length) return;
      const center=wheel.scrollLeft+wheel.clientWidth/2;
      const nearest=links.reduce((best,el)=>Math.abs(el.offsetLeft+el.offsetWidth/2-center)<Math.abs(best.offsetLeft+best.offsetWidth/2-center)?el:best);
      if(!nearest.classList.contains('active')) nearest.click();
      else scheduleCenter(false);
    },150);
  }
  wheel.addEventListener('scroll',settleTouchScroll,{passive:true});
  ['pointerup','pointercancel'].forEach(name=>window.addEventListener(name,()=>{pointerActive=false;settleTouchScroll();}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)actualMusic.pause();refreshInterfaceBackground();});
  updateSongBackground(); updateMode();
})();

