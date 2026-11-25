/* Full-screen Phoenix confirmation; all charts, commands and scores are real. */
(function(root) {
  'use strict';
  const modal=document.getElementById('confirmPlayModal');
  const byId=id=>document.getElementById(id);
  const state={ssc:null,starting:false,returnFocus:null,charts:[],imageVersion:0};
  let confirmationVersion=0,finishConfirmationSound=null;
  const confirmationAudio=new Audio('assets/sounds/PHOENIX_2_DONE_SELECT_MUSIC.mp3');
  confirmationAudio.preload='none';confirmationAudio.volume=1;
  const orientation=matchMedia('(orientation:portrait)');
  const isOpen=()=>modal.classList.contains('show');
  let commandSequence='',commandTime=0;
  function openCommand(group='speed',trigger){
    if(!isOpen() || state.starting)return;
    commandSequence='';
    const api=matchMedia('(min-width:1024px) and (orientation:landscape)').matches?root.PiuCommand:root.PiuMobileCommand;
    api?.open(group,trigger);
  }
  const typeName=type=>type==='pump-single'?'SINGLE':type==='pump-halfdouble'?'HALF DOUBLE':'DOUBLE';
  function scoreValue(record) {
    if(typeof record.score==='number') return record.score;
    const value=String(record.score ?? '').trim();
    return /\d/.test(value) && /^[\d.,\s]+$/.test(value)?Number(value.replace(/[.,\s]/g,'')):NaN;
  }
  function error(message) { byId('ps-error').textContent=message;byId('ps-error').hidden=!message; }
  function setStarting(value) {
    state.starting=value;
    if(!value) modal.classList.remove('ps-leaving');
    ['ps-confirm','ps-next','ps-enter','ps-back','ps-cancel'].forEach(id=>byId(id).disabled=value);
    modal.setAttribute('aria-busy',String(value));
  }
  function recordPanel(name,record) {
    const valid=record && Number.isFinite(scoreValue(record));
    byId('ps-'+name+'-data').hidden=!valid;byId('ps-'+name+'-empty').hidden=!!valid;
    if(!valid) return;
    const score=Math.max(0,Math.min(1000000,Math.floor(scoreValue(record))));
    const broken=LocalRecords.isBroken(record),grade=LocalRecords.grade(score);
    byId('ps-'+name+'-score').textContent=String(score).padStart(7,'0');
    PiuResults.rank(byId('ps-'+name+'-grade'),grade,broken);
    PiuResults.plate(byId('ps-'+name+'-plate'),String(record.plate || '').toUpperCase(),broken || record.passed===false);
    byId('ps-'+name+'-status').textContent=broken?'STAGE BREAK OFF':name==='best'?'RECORDE PESSOAL':record.passed===false?'SEM CLEAR':'STAGE PASS';
    byId('ps-'+name+'-data').title=record.date && Number.isFinite(Date.parse(record.date))?new Date(record.date).toLocaleString('pt-BR'):'';
  }
  function refreshRecords() {
    if(!selsong?.levels[chart_level] || !sscpath) return;
    const playback=Number(document.querySelector('.rush-option.focus')?.value || 1);
    const chart={ssc:sscpath,chart:chart_level,playback};
    let best=null,last=null;const problems=[];
    try { best=LocalRecords.best(chart); } catch(_) { problems.push('Não foi possível ler o recorde local.'); }
    try {
      const history=getHistory();
      if(!Array.isArray(history)) throw new Error('Invalid history');
      last=history.find(row=>row && Number.isFinite(scoreValue(row)) && scoreValue(row)>=0 && scoreValue(row)<=1000000 &&
        LocalRecords.key({ssc:row.ssc || row.ssc_path,chart:row.chart===undefined?undefined:Number(row.chart),playback:Number(row.playback || 1)})===LocalRecords.key(chart)) || null;
    } catch(_) { problems.push('Não foi possível ler a última partida.'); }
    recordPanel('last',last);recordPanel('best',best);error(problems.join(' '));
    return {last,best};
  }
  function centerChart(smooth=false) {
    const selected=byId('ps-levels').querySelector('[aria-pressed="true"]');if(!selected) return;
    const holder=byId('ps-levels');
    holder.scrollTo({left:selected.offsetLeft-(holder.clientWidth-selected.offsetWidth)/2,behavior:smooth && !matchMedia('(prefers-reduced-motion:reduce)').matches?'smooth':'instant'});
  }
  function updateChart() {
    const level=selsong?.levels[chart_level];if(!level) return;
    const label=typeName(level.STEPSTYPE);
    byId('ps-type').textContent=label;byId('ps-level').textContent=String(level.METER).padStart(2,'0');
    byId('ps-large-level').classList.toggle('ps-double',level.STEPSTYPE!=='pump-single');
    byId('ps-large-level').classList.toggle('ps-half',level.STEPSTYPE==='pump-halfdouble');
    byId('ps-large-level').setAttribute('aria-label',label+' '+level.METER);
    byId('ps-levels').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.chart)===chart_level)));
    const display=String(level.DISPLAYBPM || selsong.meta.DISPLAYBPM || '').split(':').map(Number).filter(n=>Number.isFinite(n)&&n>0);
    byId('ps-bpm').textContent='/ BPM '+(display.length?display.join('–'):PiuScroll.referenceBpm(selsong,chart_level));
    window.currentSongData={title:selsong.meta.TITLE,artist:selsong.meta.ARTIST || '',stepType:level.STEPSTYPE,level:level.METER,stepTypeDisplay:label};
    refreshRecords();
  }
  function chooseChart(index) {
    if(state.starting || !state.charts.includes(index)) return;
    change_level(index);updateChart();centerChart(true);
  }
  function renderCharts() {
    state.charts=[...document.querySelectorAll('#level .listStep')].map(el=>Number(el.dataset.idx)).filter(index=>Number.isInteger(index)&&selsong.levels[index]);
    byId('ps-levels').replaceChildren();
    state.charts.forEach(index=>{
      const chart=selsong.levels[index],button=document.createElement('button');button.type='button';
      button.className='ps-orb'+(chart.STEPSTYPE==='pump-single'?'':chart.STEPSTYPE==='pump-halfdouble'?' ps-double ps-half':' ps-double');button.dataset.chart=String(index);
      button.textContent=String(chart.METER).padStart(2,'0');
      button.setAttribute('aria-label',typeName(chart.STEPSTYPE)+' '+chart.METER+(chart.DESCRIPTION?', '+chart.DESCRIPTION:''));
      button.title=[typeName(chart.STEPSTYPE),chart.METER,chart.DESCRIPTION,chart.CREDIT].filter(Boolean).join(' · ');
      button.addEventListener('click',()=>chooseChart(index));byId('ps-levels').append(button);
    });
  }
  function renderImage() {
    const folder=sscpath.slice(0,sscpath.lastIndexOf('/')+1);
    const paths=[imgpath,songBanner(song),selsong.meta.BACKGROUND?folder+selsong.meta.BACKGROUND:'',selsong.meta.BANNER?folder+selsong.meta.BANNER:''];
    const candidates=[...new Set(paths.filter(Boolean).map(libraryUrl))],image=byId('ps-background'),version=++state.imageVersion;
    function next() {
      if(version!==state.imageVersion) return;
      const source=candidates.shift();image.hidden=!source;
      if(source) image.src=source;
    }
    image.onerror=next;next();
  }
  function populate() {
    if(!selsong?.levels[chart_level] || !mp3path || !sscpath) return false;
    state.ssc=sscpath;
    byId('ps-title').textContent=selsong.meta.TITLE || song.name;
    byId('ps-artist').textContent=selsong.meta.ARTIST || '';
    byId('ps-player').textContent=byId('nameUserGame').textContent || 'PIUWEB';byId('ps-avatar').src=byId('profileUserGame').src;
    const commands=PiuGameSettings.read();
    PiuActiveModifiers.render(modal.querySelector('.ps-commands'),commands,{tag:'div',onSelect:openCommand});
    PiuControlMode.render(byId('ps-control-mode'),commands.touch);
    byId('ps-speed-kind').textContent=commands.mode==='auto'?'AV':'SPEED';
    byId('ps-speed').textContent=commands.mode==='auto'?commands.av:'X'+commands.speed;
    byId('ps-bga').textContent=commands.bga.toUpperCase();byId('ps-rush').textContent=Math.round(commands.rush*100)+'%';
    byId('ps-bga').parentElement.hidden=commands.bga.toLowerCase()==='on';
    byId('ps-rush').parentElement.hidden=Number(commands.rush)===1;
    byId('ps-noteskin').src=PiuGameSettings.skinImage(commands.skin);
    byId('ps-noteskin').title=commands.randomNote ? 'RANDOM NOTE: tema sorteado ao iniciar a partida' : commands.skin;
    renderCharts();updateChart();renderImage();return true;
  }
  function close() {
    bootstrap.Modal.getInstance(modal)?.hide();
  }
  function playConfirmationSound() {
    return new Promise(resolve=>{
      let timer;
      function finish(){
        clearTimeout(timer);confirmationAudio.pause();
        confirmationAudio.removeEventListener('ended',finish);
        confirmationAudio.removeEventListener('error',finish);
        finishConfirmationSound=null;resolve();
      }
      finishConfirmationSound=finish;
      confirmationAudio.addEventListener('ended',finish,{once:true});
      confirmationAudio.addEventListener('error',finish,{once:true});
      confirmationAudio.currentTime=0;
      timer=setTimeout(finish,8000);
      confirmationAudio.play().catch(finish);
    });
  }
  async function start() {
    if(!isOpen() || state.starting || state.ssc!==sscpath || !state.charts.includes(chart_level)) return;
    setStarting(true);
    const version=++confirmationVersion;
    try {
      stopMusicPreview();resetAudio();
      modal.classList.add('ps-leaving');
      const fadeDuration=matchMedia('(prefers-reduced-motion:reduce)').matches?0:600;
      await Promise.all([playConfirmationSound(),new Promise(resolve=>setTimeout(resolve,fadeDuration))]);
      if(version!==confirmationVersion || !isOpen() || !state.starting) return;
      if(!play()) { setStarting(false);error('Não foi possível iniciar. Verifique a mensagem e tente novamente.');return; }
      // Keep the black fade cover in place until navigation replaces this page.
    } catch(e) {setStarting(false);error('Não foi possível iniciar a partida. Tente novamente.');console.error(e);}
  }
  function moveChart(delta) {
    if(!isOpen() || state.starting || !state.charts.length) return;
    root.PiuArrowFeedback?.flash(delta<0?'ps-cancel':'ps-next');
    const current=state.charts.indexOf(chart_level);
    chooseChart(state.charts[Math.max(0,Math.min(state.charts.length-1,current+delta))]);
  }
  ['ps-back','ps-enter'].forEach(id=>byId(id).addEventListener('click',close));
  byId('ps-cancel').addEventListener('click',()=>moveChart(-1));
  byId('ps-next').addEventListener('click',()=>moveChart(1));
  byId('ps-confirm').addEventListener('click',start);
  const commandGroups=['speed','display','noteskin','rush','touch'];
  modal.querySelectorAll('.ps-commands>div:not([data-active-modifier])').forEach((control,index)=>{
    control.dataset.psCommand=commandGroups[index];control.tabIndex=0;
    control.setAttribute('role','button');control.setAttribute('aria-label','Abrir Command Window: '+commandGroups[index]);
    control.addEventListener('click',()=>openCommand(commandGroups[index],control));
  });
  modal.addEventListener('show.bs.modal',event=>{
    state.returnFocus=event.relatedTarget || document.activeElement;
    root.PiuCommand?.close();root.PiuMobileCommand?.close();
    if(!populate()) {event.preventDefault();return;}
    setStarting(false);document.body.classList.add('prestart-open');
    commandSequence='';
    obj.pause();obj.src='assets/sounds/PHOENIX_2_PRE_SELECT_MUSIC.mp3';obj.volume=1;
    obj.play().catch(()=>{});
  });
  modal.addEventListener('shown.bs.modal',()=>{byId('ps-screen').scrollTop=0;centerChart();modal.focus({preventScroll:true});});
  modal.addEventListener('hidden.bs.modal',()=>{
    root.PiuCommand?.close();root.PiuMobileCommand?.close();commandSequence='';
    confirmationVersion++;finishConfirmationSound?.();
    document.body.classList.remove('prestart-open');
    if(!state.starting && state.returnFocus?.isConnected) state.returnFocus.focus({preventScroll:true});
    setStarting(false);
  });
  document.addEventListener('piu:levelchange',()=>{if(isOpen()) updateChart();});
  document.addEventListener('piu:settingschange',()=>{if(isOpen() && !state.starting){populate();centerChart();}});
  document.addEventListener('piu:songchange',()=>{if(isOpen()) close();});
  orientation.addEventListener('change',()=>{if(isOpen()){byId('ps-screen').scrollTop=0;requestAnimationFrame(()=>centerChart());}});
  window.addEventListener('pageshow',event=>{
    if(event.persisted && state.starting){confirmationVersion++;finishConfirmationSound?.();setStarting(false);}
  });
  document.addEventListener('keydown',event=>{
    if(!isOpen() || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input,select,textarea')) return;
    if(root.PiuCommand?.isOpen() || root.PiuMobileCommand?.isOpen() || document.querySelector('dialog[open]'))return;
    const key=event.key.toLowerCase();
    const command=event.target.closest('[data-ps-command]');
    if(command && ['enter',' ','s'].includes(key)){
      event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)openCommand(command.dataset.psCommand,command);return;
    }
    if(['arrowleft','arrowright','arrowup','arrowdown','z','c'].includes(key)) {
      event.preventDefault();event.stopImmediatePropagation();
      moveChart(['arrowleft','arrowup','z'].includes(key)?-1:1);
      if(['z','c'].includes(key) && !event.repeat){
        const now=performance.now();if(now-commandTime>600)commandSequence='';commandTime=now;
        commandSequence=(commandSequence+key).slice(-6);
        if(commandSequence==='zczczc')openCommand();
      }else if(!event.repeat)commandSequence='';
    } else if(['escape','q','e'].includes(key)) {event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)close();}
    else if(key==='s') {event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)start();}
    else if(key==='enter') {
      // Keyboard activation belongs to the focused button, not the whole preview.
      if(key==='enter' && event.target.closest('button')) return;
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  root.PiuPrestart={populate,refreshRecords,start,close,isOpen,openCommand};
})(globalThis);
