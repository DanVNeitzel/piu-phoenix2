/* Arcade command window: categories first, individual commands second. */
(function () {
  'use strict';
  const desktop = matchMedia('(min-width:1024px) and (orientation:landscape)');
  const original = document.getElementById('commandWindow');
  const panel = document.createElement('section');
  panel.id = 'arcade-command'; panel.hidden = true; panel.tabIndex = -1;
  panel.setAttribute('aria-label', 'Command Window');
  panel.setAttribute('aria-describedby', 'cw-instructions');
  panel.innerHTML = '<header class="cw-heading"><h2>COMMAND</h2><button type="button" id="cw-close" aria-label="Fechar Command Window">×</button></header>' +
    '<div class="cw-content"><div id="cw-readout"></div><div id="cw-choices" class="cw-wheel" role="group" aria-label="Selecionar comando"></div><div id="cw-tabs" class="cw-wheel" role="group" aria-label="Categorias"></div></div>' +
    '<p id="cw-description" role="status" aria-live="polite"></p><span class="visually-hidden" id="cw-instructions">Z e C ou setas esquerda e direita navegam. S ou Enter seleciona. Q, E ou Esc volta ou fecha. Z C Z C Z C abre a janela durante a seleção de música.</span>';
  document.body.append(panel);
  const byId = id => document.getElementById(id);
  const allowed=()=>document.body.matches('.desktop-song-select,.desktop-channel-select.difficulty-level-select');
  const groups = [
    {id:'reset', label:'RESET', help:'Reset all commands'},
    {id:'speed', label:'SPEED', help:'Change the note speed'},
    {id:'auto', label:'AUTO VELOCITY', help:'Set the speed of auto velocity'},
    {id:'display', label:'DISPLAY', help:'Change the background display'},
    {id:'judge', label:'JUDGE', help:'Alterar o julgamento das notas'},
    {id:'noteskin', label:'NOTE SKIN', help:'Change the note skin'},
    {id:'rush', label:'RUSH', help:'Change the music playback speed'},
    {id:'touch', label:'TOUCHPAD', help:'Ativar e ajustar touchpad com prévia'},
    {id:'offset', label:'OFFSET', help:'Adjust music synchronization'}
  ];
  let opened = false, detail = false, category = 1, cursor = 0, returnFocus = null, feedback = '';
  let commandModifier = null;
  const group = () => groups[category];
  const selected = selector => document.querySelector(selector + '.focus')?.value;
  const covers = {'EXCEED2-OLD':'OLD','EXCEED2-FLOWERCARD':'FLOWER','FIESTA-DRUM':'DRUM','FIESTA-LIGHTING':'LIGHTHING',
    'FIESTA-MISSILE':'MISSILE','FIESTA-SOCCER':'FOOTBALL','FIESTAEX-BASIC':'BASIC','NX2-DOG':'DOG','NX2-E-FIRE':'FIRE',
    'NX2-E-ICE':'ICE','NX2-E-WIND':'WIND','NX2-GIRL':'GIRL','NX2-SHEEP':'SHEEP','NX2-YASANGMA':'HORSE','PREMIERE':'REBIRTH',
    'ZERO-CANOND':'CANON','ZERO-EASY':'EASY','ZERO-MUSICAL':'MUSIC','ZERO-POKER':'POKER','ZERO-SLIME':'SLIME'};
  const signal = () => PiuScroll.changed();
  function choose(selector, key, value, apply) {
    const button = [...document.querySelectorAll(selector)].find(el => el.value === String(value));
    if (!button) return;
    apply(button); localStorage.setItem(key, String(value)); signal();
  }
  function reset() {
    PiuScroll.setMultiplier(1);
    localStorage.setItem('piu_auto_velocity','300');
    choose('.noteskin-option','last_noteskin','EXCEED2-OLD',selectNote);
    choose('.bga-option','last_bga','on',selectBGA);
    PiuGameSettings.setVanish(false);
    PiuGameSettings.setFD(false);
    PiuGameSettings.setHJ(false);
    PiuGameSettings.setRandomNote(false);
    choose('.rush-option','last_playback','1',selectRush);
    byId('offset').value = '0'; localStorage.setItem('last_offset','0'); signal();
    feedback = 'Commands reset';
  }
  function options() {
    switch (group().id) {
      case 'touch': return [
        {label:PiuGameSettings.read().touch?'DESATIVAR':'ATIVAR',help:'Ativar ou desativar controles por toque',apply:()=>PiuGameSettings.apply({...PiuGameSettings.read(),touch:!PiuGameSettings.read().touch})},
        {label:'AJUSTAR NA TELA',help:'Editar tamanho, posição e transparência antes de jogar',apply:()=>PiuTouchPreview.open(PiuGameSettings.read(),()=>open('touch'))},
      ];
      case 'speed': return [...document.querySelectorAll('.speed-option')]
        .sort((a,b) => Number(a.value) - Number(b.value))
        .map(button => ({label:Number(button.value) + 'X', value:button.value,
          help:'Note speed ' + button.value + 'X', apply:() => PiuScroll.setMultiplier(button.value)}))
        .concat([{label:'+0.5X',help:'Increase note speed by 0.5X',apply:() => PiuScroll.setMultiplier(Math.min(20,PiuScroll.state().multiplier + 0.5))}]);
      case 'auto': return [-1,-10,-100,100,10,1].map(delta => ({label:String(delta),
        help:'Velocity ' + (delta > 0 ? 'plus ' : 'minus ') + Math.abs(delta),
        apply:() => PiuScroll.setAutoVelocity(PiuScroll.state().target + delta)}));
      case 'judge':
        if (commandModifier === 'hj') return [true,false].map(enabled => ({label:enabled ? 'ON' : 'OFF',value:String(enabled),
          help:enabled ? 'Mude para um julgamento difícil' : 'Usar julgamento normal',apply:() => PiuGameSettings.setHJ(enabled)}));
        return [{label:'HJ',help:'Mude para um julgamento difícil',apply:() => {
          commandModifier = 'hj'; cursor = PiuGameSettings.read().hj ? 0 : 1;
        }}];
      case 'display':
        if (commandModifier === 'randomNote') return [true,false].map(enabled => ({label:enabled ? 'ON' : 'OFF',value:String(enabled),
          help:enabled ? 'Escolhe um tema de nota aleatório' : 'Usar o tema de nota selecionado',apply:() => PiuGameSettings.setRandomNote(enabled)}));
        if (commandModifier) return [true,false].map(enabled => ({label:enabled ? 'ON' : 'OFF',value:String(enabled),
          help:commandModifier === 'fd' ? (enabled ? 'Torna a zona de sensores invisível' : 'Mostrar a zona de sensores') :
            (enabled ? 'As notas desaparecem do meio da tela' : 'Mostrar as notas em toda a tela'),
          apply:() => commandModifier === 'fd' ? PiuGameSettings.setFD(enabled) : PiuGameSettings.setVanish(enabled)}));
        return [...document.querySelectorAll('.bga-option')].map(button => ({label:button.textContent.trim().replace(/\s+/g,' '),value:button.value,
        help:button.value === 'on' ? 'Enable the background' : button.value === 'off' ? 'Disable the background' : 'Darken the background',
        apply:() => choose('.bga-option','last_bga',button.value,selectBGA)})).concat([{label:'VANISH',help:'Fazer as notas desaparecerem do meio da tela',apply:() => {
          commandModifier = 'vanish'; cursor = PiuGameSettings.read().vanish ? 0 : 1;
        }}, {label:'FD',help:'Torna a zona de sensores invisível',apply:() => {
          commandModifier = 'fd'; cursor = PiuGameSettings.read().fd ? 0 : 1;
        }}, {label:'RANDOM NOTE',value:'randomNote',help:'Escolhe um tema de nota aleatório',apply:() => {
          commandModifier = 'randomNote'; cursor = PiuGameSettings.read().randomNote ? 0 : 1;
        }}]);
      case 'noteskin': return [...document.querySelectorAll('.noteskin-option')].map(button => ({label:button.value.replace('EXCEED2-','').replace('FIESTAEX-',''),value:button.value,
        image:'assets/img/CW_settings/noteskin_cover/' + (covers[button.value] || button.value) + '.png', help:'Note skin ' + button.value,
        apply:() => choose('.noteskin-option','last_noteskin',button.value,selectNote)}));
      case 'rush': return [...document.querySelectorAll('.rush-option')].map(button => ({label:Math.round(Number(button.value) * 100) + '%',value:button.value,
        help:'Music playback ' + Math.round(Number(button.value) * 100) + '%',
        apply:() => choose('.rush-option','last_playback',button.value,selectRush)}));
      case 'offset': return [-0.1,-0.01,0,0.01,0.1].map(delta => ({label:delta === 0 ? 'RESET' : (delta > 0 ? '+' : '') + delta + 's',
        help:delta === 0 ? 'Reset music offset' : 'Music offset ' + (delta > 0 ? '+' : '') + delta + 's', apply:() => {
          const value = delta === 0 ? 0 : Math.max(-5,Math.min(5,Number(byId('offset').value || 0) + delta));
          byId('offset').step = '0.01'; byId('offset').value = String(Math.round(value * 100) / 100);
          localStorage.setItem('last_offset',byId('offset').value); signal();
        }}));
      default: return [];
    }
  }
  function begin(audible = true) {
    commandModifier = null;
    if (audible) PiuCommandAudio.play('select');
    feedback = '';
    if (group().id === 'reset') { detail = false; cursor = 0; reset(); render(); return; }
    detail = true;
    const value = {speed:String(PiuScroll.state().multiplier),display:selected('.bga-option'),noteskin:selected('.noteskin-option'),rush:selected('.rush-option')}[group().id];
    cursor = group().id === 'auto' ? 3 : group().id === 'offset' ? 2 : Math.max(0, options().findIndex(item => item.value === value));
    render();
  }
  function move(delta) {
    PiuCommandAudio.play('move');
    feedback = '';
    if (detail) { const count = options().length; cursor = (cursor + delta + count) % count; }
    else category = (category + delta + groups.length) % groups.length;
    render();
  }
  function apply() {
    if (!detail) { begin(); return; }
    const option = options()[cursor];
    if (option) PiuCommandAudio.play('select');
    option?.apply(); feedback = option?.help || ''; render();
  }
  function back() {
    if (commandModifier) { PiuCommandAudio.play('move'); const modifier = commandModifier, label = modifier.toUpperCase(); commandModifier = null; cursor = options().findIndex(item => item.value === modifier || item.label === label); feedback = ''; render(); return; }
    if (detail) { PiuCommandAudio.play('move'); detail = false; feedback = ''; render(); }
    else close();
  }
  function wheel(holder, items, index, action, categories = false) {
    holder.replaceChildren();
    [-1,0,1].forEach(delta => {
      const item = items[(index + delta + items.length) % items.length];
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'cw-item' + (delta === 0 ? ' is-current' : '') + (categories ? ' cw-category' : '');
      button.setAttribute('aria-pressed',String(delta === 0));
      button.setAttribute('aria-label', item.help || item.label);
      if (item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = ''; button.append(img); }
      const text = document.createElement('strong'); text.textContent = item.label; button.append(text);
      button.addEventListener('click', () => action(delta)); holder.append(button);
    });
  }
  function render() {
    if (!opened) return;
    panel.dataset.view = detail ? 'detail' : 'category'; panel.dataset.category = group().id;
    const readout = byId('cw-readout'); readout.replaceChildren();
    if (detail) {
      const label = document.createElement('span');
      label.textContent = commandModifier === 'randomNote' ? 'RANDOM NOTE' : commandModifier ? commandModifier.toUpperCase() : {auto:'CURRENT BPM',speed:'CURRENT SPEED',display:'DISPLAY',judge:'JUDGE',noteskin:'NOTE SKIN',rush:'MUSIC RATE',touch:'TOUCHPAD',offset:'OFFSET'}[group().id];
      readout.append(label);
      let value;
      if (group().id === 'auto') {
        value = document.createElement('input'); value.type = 'number'; value.min = '1'; value.max = '2000'; value.step = '1';
        value.value = String(PiuScroll.state().target); value.setAttribute('aria-label','Auto Velocity BPM');
        value.addEventListener('change', () => { PiuCommandAudio.play('select'); PiuScroll.setAutoVelocity(value.value); render(); });
      } else {
        value = document.createElement('strong');
        value.textContent = {judge:commandModifier === 'hj' ? (PiuGameSettings.read().hj ? 'ON' : 'OFF') : (PiuGameSettings.read().hj ? 'HJ' : 'NORMAL'),speed:PiuScroll.state().multiplier + 'X',display:commandModifier ? (PiuGameSettings.read()[commandModifier] ? 'ON' : 'OFF') : (selected('.bga-option') || 'on').toUpperCase(),
          noteskin:(selected('.noteskin-option') || '').replace('EXCEED2-',''),rush:Math.round(Number(selected('.rush-option') || 1) * 100) + '%',touch:PiuGameSettings.read().touch?'ON':'OFF',offset:Number(byId('offset').value || 0) + 's'}[group().id];
      }
      readout.append(value);
      wheel(byId('cw-choices'),options(),cursor, delta => delta === 0 ? apply() : move(delta));
      wheel(byId('cw-tabs'),groups,category, delta => {
        if (delta === 0) { PiuCommandAudio.play('move'); commandModifier = null; detail = false; render(); }
        else { PiuCommandAudio.play('move'); category = (category + delta + groups.length) % groups.length; begin(false); }
      },true);
    } else wheel(byId('cw-choices'),groups,category, delta => delta === 0 ? begin() : move(delta),true);
    byId('cw-description').textContent = feedback || (detail ? options()[cursor]?.help : group().help) || '';
  }
  function open(id = 'speed', trigger) {
    commandModifier = null;
    if (!desktop.matches || !allowed()) return;
    returnFocus = trigger || document.activeElement;
    const prestart=document.querySelector('#confirmPlayModal.show');
    (prestart || document.body).append(panel);
    if (!opened) PiuCommandAudio.play('open');
    if (id === 'speed' && PiuScroll.state().mode === 'auto') id = 'auto';
    category = Math.max(0,groups.findIndex(item => item.id === id));
    detail = false; feedback = ''; opened = true; panel.hidden = false;
    document.body.classList.add('command-panel-open'); render(); panel.focus({preventScroll:true});
  }
  function close() {
    if (!opened) return;
    PiuCommandAudio.play('close');
    opened = false; panel.hidden = true; document.body.classList.remove('command-panel-open');
    document.body.append(panel);
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  original.addEventListener('show.bs.modal', event => {
    if (!desktop.matches || !allowed()) return;
    event.preventDefault();
    const trigger = event.relatedTarget;
    const category = trigger?.dataset.commandCategory || 'speed';
    open(category,trigger);
  });
  byId('cw-close').addEventListener('click',close);
  panel.addEventListener('click',event => event.stopPropagation());
  panel.addEventListener('wheel',event => { event.preventDefault(); event.stopPropagation(); move(event.deltaY > 0 ? 1 : -1); },{passive:false});
  document.addEventListener('show.bs.modal',event => { if (event.target !== original) close(); });
  document.addEventListener('piu:settingschange',render);
  document.addEventListener('keydown',event => {
    if (document.querySelector('dialog[open]')) return;
    if (!desktop.matches || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!opened) return;
    if (event.target.tagName === 'INPUT') {
      if (['escape','q','e'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopImmediatePropagation(); if(!event.repeat)back(); }
      else if (['enter','s'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopImmediatePropagation(); if(!event.repeat){PiuCommandAudio.play('select'); PiuScroll.setAutoVelocity(event.target.value); render(); panel.focus();} }
      else if (['z','c'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopImmediatePropagation();move(event.key.toLowerCase()==='z'?-1:1);panel.focus(); }
      else event.stopImmediatePropagation();
      return;
    }
    const key = event.key.toLowerCase();
    if (['arrowleft','arrowright','arrowup','arrowdown','q','e','s','enter','escape','z','c'].includes(key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (['arrowleft','arrowup','z'].includes(key)) move(-1);
      else if (['arrowright','arrowdown','c'].includes(key)) move(1);
      else if (['escape','q','e'].includes(key)) { if(!event.repeat)back(); }
      else if (!event.repeat) apply();
    }
  },true);
  desktop.addEventListener('change',close);
  new MutationObserver(() => { if (!allowed()) close(); })
    .observe(document.body,{attributes:true,attributeFilter:['class']});
  window.PiuCommand = {open,close,isOpen:() => opened};
})();
