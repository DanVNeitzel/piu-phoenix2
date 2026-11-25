/* Live touchpad editing renders the frozen scene without advancing judgments. */
(function(root){
  'use strict';
  let bridge=null,draft=null,original=null,side='left',frame=null,drag=null;
  const byId=id=>document.getElementById(id),mode=()=>innerWidth>innerHeight?'landscape':'portrait';
  const dialog=document.createElement('dialog');dialog.id='touch-editor';dialog.setAttribute('aria-labelledby','te-title');
  dialog.innerHTML='<div class="te-handles"></div><section class="te-panel"><header><div><span id="te-orientation"></span><h2 id="te-title">Ajustar touchpad</h2></div><button type="button" id="te-toggle" aria-expanded="true">Ver jogo</button></header><div class="te-content"><p>Partida pausada. Arraste o contorno do pad ou use os ajustes abaixo.</p><nav id="te-sides" aria-label="Pad a posicionar"><button type="button" data-side="left">Esquerdo</button><button type="button" data-side="right">Direito</button></nav><div id="te-ranges"></div><button type="button" id="te-reset">Restaurar esta orientação</button><p class="te-hint">Os pads permanecem dentro da tela. Barra e sensores podem se mover por toda a altura da tela, inclusive atrás dos indicadores.</p></div><footer><p id="te-status" role="status" aria-live="polite">As mudanças aparecem na hora.</p><div><button type="button" id="te-cancel">Cancelar</button><button type="button" id="te-save">Salvar</button></div></footer></section>';
  document.body.append(dialog);
  const definitions=[['size','Tamanho do pad',60,140],['x','Posição horizontal do pad',-45,45],['y','Posição vertical do pad',-60,60],['opacity','Transparência',0,90],['fieldWidth','Largura dos sensores e notas',20,100],['lifeWidth','Largura da barra de vida',20,100],['lifeHeight','Espessura da barra de vida',50,250],['fieldY','Altura da barra e receptores',-100,100]];
  for(const [key,label,min,max]of definitions){
    const row=document.createElement('label');row.className='te-range';row.htmlFor='te-'+key;
    const text=document.createElement('span');text.textContent=label;const output=document.createElement('output');output.id='te-'+key+'-value';output.htmlFor='te-'+key;text.append(output);
    const input=document.createElement('input');input.type='range';input.id='te-'+key;input.min=min;input.max=max;input.step=1;
    input.addEventListener('input',()=>{
      const value=Number(input.value)/100,pref=draft[mode()];
      if(key==='x'||key==='y')position()[key]=value;
      else pref[key]=key==='opacity'?1-value:value;
      schedule();updateControls();
    });row.append(text,input);byId('te-ranges').append(row);
  }
  const handles=[0,1].map(index=>{
    const button=document.createElement('button');button.type='button';button.className='te-handle';dialog.querySelector('.te-handles').append(button);
    button.addEventListener('pointerdown',event=>{
      if(!dialog.open)return;event.preventDefault();
      side=index===0?'left':'right';updateControls();
      const value=position();drag={pointer:event.pointerId,mode:mode(),x:event.clientX,y:event.clientY,offset:{...value}};button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove',event=>{
      if(!drag||drag.pointer!==event.pointerId||drag.mode!==mode())return;
      const value=position();value.x=Math.max(-.45,Math.min(.45,drag.offset.x+(event.clientX-drag.x)/innerWidth));value.y=Math.max(-.6,Math.min(.6,drag.offset.y+(event.clientY-drag.y)/innerHeight));schedule();updateControls();
    });
    const end=()=>{drag=null;};button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);button.addEventListener('lostpointercapture',end);
    return button;
  });
  function position(){return mode()==='portrait'?draft.portrait:draft.landscape[side];}
  function updateControls(){
    if(!draft)return;const current=mode(),pref=draft[current],offset=position();
    byId('te-orientation').textContent=current==='portrait'?'RETRATO':'PAISAGEM';
    byId('te-sides').hidden=current==='portrait';
    dialog.querySelectorAll('[data-side]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.side===side)));
    const stage=bridge.engine.stage._playerStages[0],bar=PiuGameplayLayout.bounds(stage._lifeBar.object,bridge.engine);
    const receptors=Object.values(stage.padReceptors).map(r=>PiuGameplayLayout.bounds(r._receptor,bridge.engine));
    const fieldWidth=(Math.max(...receptors.map(r=>r.right))-Math.min(...receptors.map(r=>r.left)))/innerWidth;
    const values={size:Math.round(pref.size*100),x:Math.round(offset.x*100),y:Math.round(offset.y*100),opacity:Math.round((1-pref.opacity)*100),fieldY:Math.round(pref.fieldY*100),fieldWidth:Math.round((pref.fieldWidth??fieldWidth)*100),lifeWidth:Math.round((pref.lifeWidth??(bar.right-bar.left)/innerWidth)*100),lifeHeight:Math.round(pref.lifeHeight*100)};
    for(const [key,value]of Object.entries(values)){byId('te-'+key).value=value;byId('te-'+key+'-value').textContent=(value>0&&(key==='x'||key==='y'||key==='fieldY')?'+':'')+value+'%';}
  }
  function preview(){
    frame=null;if(!dialog.open)return;
    bridge.input.layoutPreferences=PiuTouchLayout.normalize(draft);bridge.layout();
    bridge.engine.scene.updateMatrixWorld(true);
    bridge.engine.renderer.render(bridge.engine.scene,bridge.engine.camera);
    const pads=bridge.input.getVisiblePads();
    handles.forEach((button,index)=>{
      const pad=pads[index];button.hidden=!pad;if(!pad)return;
      const r=PiuGameplayLayout.bounds(pad.object,bridge.engine);
      Object.assign(button.style,{left:r.left+'px',top:r.top+'px',width:(r.right-r.left)+'px',height:(r.bottom-r.top)+'px'});
      const label=mode()==='portrait'?'Mover conjunto central':index===0?'Mover pad esquerdo':'Mover pad direito';
      button.setAttribute('aria-label',label);button.textContent='Arraste para mover';
    });
    updateControls();
  }
  function schedule(){if(frame===null)frame=requestAnimationFrame(preview);}
  async function open(){
    if(!bridge||dialog.open||!bridge.canEdit())return;
    await bridge.pause();if(!bridge.canEdit())return;
    original=PiuTouchLayout.normalize(bridge.input.layoutPreferences);draft=PiuTouchLayout.normalize(original);side='left';
    const profile=PiuTouchLayout.profileName(bridge.config.record.type);
    byId('te-title').textContent='Ajustar touchpad · '+profile;
    byId('te-reset').textContent='Restaurar '+profile+' nesta orientação';
    bridge.hidePause();dialog.classList.remove('te-collapsed');byId('te-toggle').textContent='Ver jogo';byId('te-toggle').setAttribute('aria-expanded','true');
    byId('te-status').textContent='Perfil '+profile+': ajustes exclusivos deste modo, separados em retrato e paisagem.';
    dialog.querySelector('.te-content>p').textContent=bridge.preview?'Prévia antes de jogar. Arraste o contorno do pad ou use os ajustes abaixo.':'Partida pausada. Arraste o contorno do pad ou use os ajustes abaixo.';
    dialog.showModal();updateControls();preview();byId('te-size').focus({preventScroll:true});
  }
  function finish(save){
    if(!dialog.open)return;
    let value=original;
    if(save){try{value=PiuTouchLayout.save(draft,bridge.config.record.type);}catch(_){byId('te-status').textContent='Não foi possível salvar. Tente novamente ou cancele.';return;}}
    if(frame!==null){cancelAnimationFrame(frame);frame=null;}drag=null;
    bridge.input.layoutPreferences=PiuTouchLayout.normalize(value);bridge.config.touchLayout=bridge.input.layoutPreferences;
    bridge.layout();bridge.engine.renderer.render(bridge.engine.scene,bridge.engine.camera);
    dialog.close();bridge.back(value,save);
  }
  dialog.querySelectorAll('[data-side]').forEach(button=>button.onclick=()=>{side=button.dataset.side;updateControls();});
  byId('te-toggle').onclick=()=>{const collapsed=dialog.classList.toggle('te-collapsed');byId('te-toggle').textContent=collapsed?'Mostrar ajustes':'Ver jogo';byId('te-toggle').setAttribute('aria-expanded',String(!collapsed));};
  byId('te-reset').onclick=()=>{draft[mode()]=PiuTouchLayout.defaults()[mode()];updateControls();schedule();};
  byId('te-save').onclick=()=>finish(true);byId('te-cancel').onclick=()=>finish(false);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
  window.addEventListener('resize',()=>{if(dialog.open){drag=null;updateControls();schedule();}});
  root.PiuTouchEditor={init(value){bridge=value;const button=byId('game-touch-edit');button.hidden=false;button.addEventListener('click',open);},open,refresh:schedule,isOpen:()=>dialog.open,cancel:()=>finish(false)};
})(globalThis);
