/* Full touch command window backed by the original game settings. */
(function(){
'use strict';
const $=s=>document.querySelector(s),mobile=matchMedia('(max-width:1023px),(orientation:portrait)');
let options=PiuGameSettings.options(),activeGroup='speed',returnFocus=null,draft=null;
const groups=[['speed','SPEED'],['auto','AUTO VELOCITY'],['noteskin','NOTE SKIN'],['display','DISPLAY'],['judge','JUDGE'],['rush','RUSH'],['offset','OFFSET'],['touch','TOUCHPAD'],['reset','RESET']];
const panel=document.createElement('dialog');panel.id='mobile-command';panel.setAttribute('aria-labelledby','mc-title');
panel.innerHTML='<div class="mc-head"><h2 id="mc-title">COMMAND</h2><button type="button" id="mc-close" aria-label="Fechar Command Window">×</button></div><nav class="mc-tabs" aria-label="Categorias do Command Window"></nav><div id="mc-content" tabindex="0"></div><div class="mc-footer"><p id="mc-summary" aria-live="polite"></p></div>';
document.body.append(panel);
const skinCover=PiuGameSettings.skinImage;
function saveSettings(){
 try{PiuGameSettings.apply(draft);draft=PiuGameSettings.read();updateSummary();return true}
 catch(error){showNotification('N\u00e3o foi poss\u00edvel salvar as configura\u00e7\u00f5es locais.','error');return false}
}
function speedLabel(s){return s.mode==='auto'?'AV '+s.av:'SPEED X'+s.speed}
function summary(s){return speedLabel(s)+' · BGA '+s.bga.toUpperCase()+' · RUSH '+Math.round(s.rush*100)+'% · OFFSET '+s.offset.toFixed(1)+'s'}
function button(label,handler,className='mc-option'){const b=document.createElement('button');b.type='button';b.className=className;b.textContent=label;b.onclick=()=>{if(className!=='mc-category')PiuCommandAudio.play('select');handler();if(className!=='mc-category'&&className!=='mc-preview')saveSettings()};return b}
function selectOption(label,value,selected,action){const b=button(label,()=>{action(value);renderContent()});b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));return b}
function grid(className='mc-grid'){const e=document.createElement('div');e.className=className;$('#mc-content').append(e);return e}
function help(text){const e=document.createElement('p');e.className='help';e.textContent=text;$('#mc-content').append(e)}
function numeric(label,value,min,max,step,onChange){const row=document.createElement('label');row.className='mc-readout';row.textContent=label;const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=value;input.setAttribute('aria-label',label);input.onchange=()=>{const n=Number(input.value);if(!Number.isFinite(n)){input.value=value;return}PiuCommandAudio.play('select');onChange(Math.max(min,Math.min(max,n)));saveSettings();renderContent()};row.append(input);$('#mc-content').append(row)}
function renderContent(){const content=$('#mc-content');content.replaceChildren();const title=document.createElement('h3');title.textContent=groups.find(g=>g[0]===activeGroup)[1];content.append(title);
 if(activeGroup==='speed'){const list=grid();for(const value of [...new Set(options.speeds.concat(draft.speed))].sort((a,b)=>a-b)){list.append(selectOption('X'+value,value,draft.mode==='multiplier'&&draft.speed===value,v=>{draft.speed=v;draft.mode='multiplier'}))}list.append(button('+0.5X',()=>{draft.speed=Math.min(20,draft.speed+0.5);draft.mode='multiplier';renderContent()}));help('Multiplicador fixo da velocidade das notas. Selecionar SPEED desativa AV.')}
 if(activeGroup==='auto'){numeric('AV',draft.av,1,2000,1,v=>{draft.av=Math.round(v);draft.mode='auto'});const list=grid('mc-deltas');for(const delta of [-100,-10,-1,1,10,100])list.append(button((delta>0?'+':'')+delta,()=>{draft.av=Math.max(1,Math.min(2000,draft.av+delta));draft.mode='auto';renderContent()}));list.append(button('ATIVAR AV',()=>{draft.mode='auto';renderContent()}));help('AV mantém a velocidade de leitura ajustada ao BPM. Faixa: 1–2000.')}
 if(activeGroup==='noteskin'){const list=grid('mc-grid mc-skins');for(const skin of options.skins){const b=selectOption(skin.cover,skin.value,draft.skin===skin.value,v=>draft.skin=v);b.classList.add('mc-skin');const img=document.createElement('img');img.src=skinCover(skin.value);img.alt='';b.prepend(img);b.setAttribute('aria-label',skin.value);list.append(b)}help('Todas as '+options.skins.length+' noteskins disponíveis.')}
 if(activeGroup==='display'){const list=grid();for(const v of ['on','off','dark'])list.append(selectOption('BGA '+v.toUpperCase(),v,draft.bga===v,v=>draft.bga=v));help('ON: fundo ativo. OFF: fundo desligado. DARK: fundo escurecido.');const heading=document.createElement('h4');heading.textContent='VANISH';content.append(heading);const vanish=grid();for(const enabled of [true,false])vanish.append(selectOption(enabled?'ON':'OFF',enabled,draft.vanish===enabled,v=>draft.vanish=v));help('VANISH ON: as notas desaparecem do meio da tela. OFF: notas visíveis em toda a tela.');const fdHeading=document.createElement('h4');fdHeading.textContent='FD';content.append(fdHeading);const fd=grid();for(const enabled of [true,false])fd.append(selectOption(enabled?'ON':'OFF',enabled,draft.fd===enabled,v=>draft.fd=v));help('FD ON: torna a zona de sensores invisível. OFF: mostra a zona de sensores.')}
 if(activeGroup==='display'){const heading=document.createElement('h4');heading.textContent='RANDOM NOTE';content.append(heading);const list=grid();for(const enabled of [true,false])list.append(selectOption(enabled?'ON':'OFF',enabled,draft.randomNote===enabled,v=>draft.randomNote=v));help('ON: escolhe um tema de nota aleatório a cada partida. OFF: usa o tema selecionado.')}
 if(activeGroup==='judge'){const heading=document.createElement('h4');heading.textContent='HJ';content.append(heading);const list=grid();for(const enabled of [true,false])list.append(selectOption(enabled?'ON':'OFF',enabled,draft.hj===enabled,v=>draft.hj=v));help('HJ ON: mude para um julgamento difícil. OFF: julgamento normal.')}
 if(activeGroup==='rush'){const list=grid();for(const v of options.rush)list.append(selectOption(Math.round(v*100)+'%',v,draft.rush===v,v=>draft.rush=v));help('Altera a velocidade de reprodução da música: 80% a 150%.')}
 if(activeGroup==='offset'){numeric('DELAY (s)',draft.offset,-5,5,.1,v=>draft.offset=Math.round(v*10)/10);const range=document.createElement('input');range.type='range';range.min=-5;range.max=5;range.step=.1;range.value=draft.offset;range.setAttribute('aria-label','Sincronização do áudio');range.onchange=()=>PiuCommandAudio.play('select');range.oninput=()=>{PiuCommandAudio.play('move');draft.offset=Number(range.value);$('#mc-offset-label').textContent=draft.offset.toFixed(1)+'s';saveSettings()};content.append(range);const label=document.createElement('p');label.id='mc-offset-label';label.textContent=draft.offset.toFixed(1)+'s';content.append(label);help('Ajuste de sincronização do áudio, como no menu anterior.')}
 if(activeGroup==='touch'){const row=document.createElement('label');row.className='mc-setting';row.textContent='ACTIVATE TOUCHPAD';const input=document.createElement('input');input.type='checkbox';input.checked=draft.touch;input.onchange=()=>{PiuCommandAudio.play('select');draft.touch=input.checked;saveSettings()};row.append(input);content.append(row);const previewButton=button('AJUSTAR NA TELA',previewTouchpad,'mc-preview');previewButton.id='mc-touch-preview';content.append(previewButton);help('Ajuste tamanho, posição e transparência antes de jogar. A prévia não inicia a música. Ative o touchpad para usá-lo na partida.')}
 if(activeGroup==='reset'){help('Restaura os comandos padrão. Histórico e recordes são preservados.');content.append(button('RESTAURAR PADRÕES',()=>{draft=PiuGameSettings.defaults();renderContent()},'reset'))}
 updateSummary();
}
function updateSummary(){$('#mc-summary').textContent=summary(draft)}
for(const [id,label] of groups){const b=button(label,()=>selectGroup(id),'mc-category');b.dataset.group=id;$('.mc-tabs').append(b)}
function selectGroup(id,audible=true){if(audible&&id!==activeGroup)PiuCommandAudio.play('move');activeGroup=id;document.querySelectorAll('[data-group]').forEach(b=>{b.classList.toggle('selected',b.dataset.group===id);b.setAttribute('aria-pressed',String(b.dataset.group===id))});renderContent();const tab=document.querySelector('[data-group="'+id+'"]');$('.mc-tabs').scrollLeft=tab.offsetLeft-$('.mc-tabs').offsetLeft;$('#mc-content').scrollTop=0}
function openCommand(group='speed',trigger,preserve=false){if((!mobile.matches&&!preserve) || !document.body.matches('.desktop-song-select,.desktop-channel-select.difficulty-level-select'))return;returnFocus=trigger||document.activeElement;const prestart=document.querySelector('#confirmPlayModal.show');(prestart||document.body).append(panel);options=PiuGameSettings.options();if(!preserve)draft=PiuGameSettings.read();if(!panel.open)PiuCommandAudio.play('open');$('#mobile-command').showModal();document.body.classList.add('mobile-command-open');selectGroup(group,false);$('#mc-close').focus()}
function previewTouchpad(){const trigger=returnFocus;PiuTouchPreview.open(draft,()=>openCommand('touch',trigger));}
function closeCommand(){if(!$('#mobile-command').open)return;$('#mobile-command').close();document.body.classList.remove('mobile-command-open');returnFocus?.focus({preventScroll:true})}
panel.addEventListener('keydown',event=>{if(event.key==='Tab'){const before=document.activeElement;requestAnimationFrame(()=>{if(panel.open&&document.activeElement!==before)PiuCommandAudio.play('move')})}});
$('#mc-close').onclick=closeCommand;$('#mobile-command').addEventListener('close',()=>{PiuCommandAudio.play('close');document.body.classList.remove('mobile-command-open');if(!panel.open)document.body.append(panel);returnFocus?.focus({preventScroll:true})});

document.getElementById('commandWindow').addEventListener('show.bs.modal',event=>{
 if(!mobile.matches || !document.body.matches('.desktop-song-select,.desktop-channel-select.difficulty-level-select'))return;
 event.preventDefault();const trigger=event.relatedTarget;let category=trigger?.dataset.commandCategory||'speed';
 if(category==='speed'&&PiuScroll.state().mode==='auto')category='auto';openCommand(category,trigger);
});
mobile.addEventListener('change',closeCommand);
function keyboardOptions(){return [...$('#mc-content').querySelectorAll('button:not(:disabled),input:not(:disabled)')]}
function moveKeyboard(delta){
 const items=keyboardOptions(),index=items.indexOf(document.activeElement);
 if(index>=0){PiuCommandAudio.play('move');items[(index+delta+items.length)%items.length]?.focus();return}
 const current=groups.findIndex(group=>group[0]===activeGroup),next=groups[(current+delta+groups.length)%groups.length][0];
 selectGroup(next);panel.querySelector('[data-group="'+next+'"]').focus();
}
function selectKeyboard(){
 const items=keyboardOptions(),index=items.indexOf(document.activeElement);
 if(index<0){PiuCommandAudio.play('select');(items.find(el=>el.classList.contains('selected'))||items[0])?.focus();return}
 const target=items[index];
 if(target.matches('input:not([type=checkbox])'))target.dispatchEvent(new Event('change',{bubbles:true}));
 else target.click();
 if(panel.open)keyboardOptions()[index]?.focus();
}
function backKeyboard(){
 if($('#mc-content').contains(document.activeElement)){PiuCommandAudio.play('move');panel.querySelector('[data-group="'+activeGroup+'"]').focus()}
 else closeCommand();
}
document.addEventListener('keydown',event=>{
 if(!panel.open||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
 const key=event.key.toLowerCase();if(!['z','c','s','q','e','escape'].includes(key))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(key==='z'||key==='c')moveKeyboard(key==='z'?-1:1);
 else if(!event.repeat){if(key==='s')selectKeyboard();else backKeyboard()}
},true);
new MutationObserver(()=>{if(!document.body.matches('.desktop-song-select,.desktop-channel-select.difficulty-level-select'))closeCommand()}).observe(document.body,{attributes:true,attributeFilter:['class']});
window.PiuMobileCommand={open:openCommand,close:closeCommand,isOpen:()=>panel.open};
})();
