/* A single responsive settings panel, backed by the original stored controls. */
(function(){
  'use strict';
  const panel=document.getElementById('settingsMenu'),legacy=document.getElementById('keyMapMenu');
  const byId=id=>document.getElementById(id);
  const fullscreen=[...panel.querySelectorAll('.FullScreenOn,.FullScreenOff')];
  const backgrounds=[...panel.querySelectorAll('.bgStatic,.bgVideo')];
  const map=document.getElementById('dancePadMap');
  const keys=['ul','ur','c','dl','dr'].map(step=>({step,input:byId({ul:'lulmap',ur:'lurmap',c:'lcmap',dl:'ldlmap',dr:'ldrmap'}[step])}));
  panel.setAttribute('aria-labelledby','app-settings-title');panel.tabIndex=-1;
  panel.querySelector('.modal-content').innerHTML='<header class="settings-header"><div><span>PIUWEB · SINGLE PLAYER</span><h2 id="app-settings-title">Configurações</h2></div><button type="button" class="settings-close" data-bs-dismiss="modal" aria-label="Fechar configurações">×</button></header><div class="settings-body"><section class="settings-card"><h3>Tela cheia</h3><p>Use toda a tela para jogar.</p><div class="settings-options" id="settings-fullscreen" role="group" aria-label="Tela cheia"></div></section><section class="settings-card"><h3>Fundo da interface</h3><p>Preferência visual. Na seleção, o fundo acompanha o banner da música; a abertura tem vídeo próprio.</p><div class="settings-options" id="settings-background" role="group" aria-label="Fundo da interface"></div></section><div id="settings-keys-slot"></div><section class="settings-card settings-data"><h3>Dados neste navegador</h3><p>Recordes, histórico e preferências ficam salvos neste dispositivo.</p><button type="button" id="settings-changelog" class="settings-secondary">Ver novidades</button><button type="button" id="settings-erase" class="settings-danger">Apagar dados e cache</button><div class="settings-confirm" id="settings-clear-confirm" hidden><strong>Apagar todos os dados locais?</strong><p>Seus recordes, histórico e preferências serão removidos. Essa ação não pode ser desfeita.</p><div><button type="button" id="settings-clear-cancel" class="settings-secondary">Cancelar</button><button type="button" id="settings-clear-do" class="settings-danger">Apagar tudo</button></div></div></section></div><footer class="settings-footer"><p id="settings-status" role="status" aria-live="polite">As alterações são salvas automaticamente.</p><button type="button" class="settings-done" data-bs-dismiss="modal">Concluído</button></footer>';
  function status(text){byId('settings-status').textContent=text;}
  const fpsCard=document.createElement('section');fpsCard.className='settings-card';
  fpsCard.innerHTML='<h3>FPS na gameplay</h3><p>Mostra um contador discreto no canto inferior esquerdo durante a partida.</p><div class="settings-options" id="settings-fps" role="group" aria-label="Mostrar FPS durante a gameplay"></div>';
  panel.querySelector('.settings-data').before(fpsCard);
  const fpsOptions=[];
  for(const enabled of [true,false]){
    const button=document.createElement('button');button.type='button';button.className='settings-option';button.textContent=enabled?'Ativado':'Desativado';
    button.addEventListener('click',()=>{
      try{localStorage.setItem('piu_show_fps',String(enabled));sync();status('Contador de FPS '+(enabled?'ativado':'desativado')+'.');}
      catch(_){status('Não foi possível salvar a preferência de FPS.');}
    });fpsOptions.push(button);byId('settings-fps').append(button);
  }
  const updateCard=document.createElement('section');updateCard.className='settings-card';
  updateCard.innerHTML='<h3>Atualizações</h3><p>Reinicie para buscar a versão mais recente do jogo. Recordes, histórico e preferências serão mantidos.</p><button type="button" id="settings-restart" class="settings-secondary">Reiniciar jogo</button>';
  panel.querySelector('.settings-data').before(updateCard);
  byId('settings-restart').addEventListener('click',async()=>{
    const button=byId('settings-restart');button.disabled=true;button.textContent='Atualizando…';status('Buscando as últimas atualizações…');
    try {await PiuAppUpdate.restart((done,total)=>status('Atualizando arquivos: '+done+' de '+total+'…'));}
    catch(error){button.disabled=false;button.textContent='Reiniciar jogo';status('Não foi possível atualizar. Verifique a conexão e tente novamente.');console.error('Erro ao reiniciar o jogo:',error);}
  });
  const orientationCard=document.createElement('section');
  orientationCard.className='settings-card';
  orientationCard.innerHTML='<h3>Orientação da tela</h3><p>Sensor acompanha a rotação do aparelho. Vertical e Horizontal travam a orientação. O bloqueio pode exigir tela cheia.</p><div class="settings-options" id="settings-orientation" role="group" aria-label="Orientação da tela"></div>';
  byId('settings-fullscreen').closest('section').after(orientationCard);
  const orientations=[];
  for(const [mode,label] of [['sensor','Sensor'],['vertical','Vertical'],['horizontal','Horizontal']]){
    const button=document.createElement('button');button.type='button';button.className='settings-option';button.textContent=label;button.dataset.orientation=mode;
    button.addEventListener('click',async()=>{
      try{
        const operation=PiuOrientation.set(mode);sync();
        const result=await operation;
        status(result.applied ? 'Orientação salva: '+label+'.' : result.reason==='unsupported' ? 'Preferência salva. Este navegador não oferece bloqueio de orientação.' : 'Preferência salva. O bloqueio não foi permitido agora; tente em tela cheia.');
      }catch(_){status('Não foi possível salvar a orientação.');}
      sync();
    });
    orientations.push(button);byId('settings-orientation').append(button);
  }
  function sync(){
    const showFPS=localStorage.getItem('piu_show_fps')==='true';
    fpsOptions.forEach((button,index)=>{const selected=showFPS===(index===0);button.classList.toggle('focus',selected);button.setAttribute('aria-pressed',String(selected));});
    orientations.forEach(button=>{const selected=button.dataset.orientation===PiuOrientation.read();button.classList.toggle('focus',selected);button.setAttribute('aria-pressed',String(selected));});
    const active=!!(document.fullscreenElement || document.webkitFullscreenElement);
    fullscreen.forEach((button,i)=>{const selected=active===(i===0);button.classList.toggle('focus',selected);button.setAttribute('aria-pressed',String(selected));});
    let background='static';try{background=localStorage.getItem('background') || 'static';}catch(_){}
    backgrounds.forEach((button,i)=>{const selected=background===(i===0?'static':'video');button.classList.toggle('focus',selected);button.setAttribute('aria-pressed',String(selected));});
  }
  fullscreen.forEach((button,i)=>{
    button.removeAttribute('onclick');button.type='button';button.className='settings-option '+(i===0?'FullScreenOn':'FullScreenOff');button.textContent=i===0?'Ativada':'Desativada';
    button.addEventListener('click',async()=>{
      try{
        const current=document.fullscreenElement || document.webkitFullscreenElement;
        if(i===0 && !current){const request=document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;if(!request)throw new Error('unsupported');await request.call(document.documentElement);}
        else if(i===1 && current){const leave=document.exitFullscreen || document.webkitExitFullscreen;await leave.call(document);}
        localStorage.setItem('fullscreen',String(i===0));sync();status('Preferência de tela salva.');
      }catch(_){sync();status('Tela cheia indisponível neste navegador ou momento.');}
    });byId('settings-fullscreen').append(button);
  });
  backgrounds.forEach((button,i)=>{
    button.removeAttribute('onclick');button.type='button';button.className='settings-option '+(i===0?'bgStatic':'bgVideo');button.textContent=i===0?'Estático':'Vídeo';
    button.addEventListener('click',()=>{selectBackground(i===0?'static':'video');sync();status('Preferência de fundo salva.');});byId('settings-background').append(button);
  });
  if(map){
    map.className='settings-card settings-keyboard';map.replaceChildren();
    map.innerHTML='<details><summary>Teclado <span>Alterar teclas das setas</span></summary><p>Selecione uma posição e digite uma letra. As teclas do touchpad continuam disponíveis no Command Window.</p><div class="settings-key-grid"></div></details>';
    const labels={ul:'Superior esquerda',ur:'Superior direita',c:'Centro',dl:'Inferior esquerda',dr:'Inferior direita'};
    for(const {step,input}of keys){
      if(!input)continue;
      ['onfocus','onfocusout','onkeydown','onkeyup'].forEach(attr=>input.removeAttribute(attr));
      input.className='settings-key-input';input.setAttribute('aria-label',labels[step]);input.setAttribute('autocomplete','off');input.setAttribute('autocapitalize','characters');input.spellcheck=false;
      input.addEventListener('input',()=>{if(input.value){keyMapChanged(input,'l',step);status('Tecla de '+labels[step].toLowerCase()+' salva.');}});
      input.addEventListener('blur',()=>input.value=getDancePadCurrentValue('l',step));
      const label=document.createElement('label');label.className='settings-key settings-key-'+step;const text=document.createElement('span');text.textContent=labels[step];label.append(text,input);map.querySelector('.settings-key-grid').append(label);
    }
    byId('settings-keys-slot').replaceWith(map);
  }else byId('settings-keys-slot').remove();
  legacy.replaceChildren();legacy.addEventListener('show.bs.modal',event=>{event.preventDefault();bootstrap.Modal.getOrCreateInstance(panel).show();});
  const confirm=byId('settings-clear-confirm');
  byId('settings-erase').onclick=()=>{confirm.hidden=false;byId('settings-clear-cancel').focus();};
  byId('settings-clear-cancel').onclick=()=>{confirm.hidden=true;byId('settings-erase').focus();};
  byId('settings-clear-do').onclick=()=>{status('Limpando dados locais…');executeClearCacheAndData();};
  byId('settings-changelog').onclick=()=>{panel.addEventListener('hidden.bs.modal',openChangelog,{once:true});bootstrap.Modal.getInstance(panel).hide();};
  panel.addEventListener('show.bs.modal',()=>{sync();confirm.hidden=true;status('As alterações são salvas automaticamente.');});
  panel.addEventListener('shown.bs.modal',()=>{panel.querySelector('.settings-body').scrollTop=0;panel.querySelector('.settings-close').focus();});
  ['fullscreenchange','webkitfullscreenchange'].forEach(name=>document.addEventListener(name,sync));
  PiuAudioCalibration.mount(panel,status);
  sync();
})();
