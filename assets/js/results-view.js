/* Phoenix-style results. The second column is the player's previous local best. */
(function (root) {
  'use strict';
  const view = document.getElementById('performance');
  const byId = id => document.getElementById(id);
  const ranks = ['SSS+','SSS','SS+','SS','S+','S','AAA+','AAA','AA+','AA','A+','A','B','C','D','F'];
  const plates = {UG:'1_ug',PG:'2_pg',EG:'3_eg',SG:'4_sg',MG:'5_mg',TG:'6_tg',FG:'7_fg',RG:'8_rg'};
  const plateNames = {UG:'ULTIMATE GAME',PG:'PERFECT GAME',EG:'EXTREME GAME',SG:'SUPERB GAME',MG:'MARVELOUS GAME',TG:'TALENTED GAME',FG:'FAIR GAME',RG:'ROUGH GAME'};
  let scoreFrame = null,renderCount = null,resultVersion = 0,awardRevealVersion = -1,leaving=false;
  const resultTheme=new Audio('assets/sounds/PHOENIX_2_RESULT_GRADE.mp3');
  resultTheme.loop=true;resultTheme.preload='none';resultTheme.volume=.9;
  const countSound=new Audio('assets/sounds/_RESULT_GRADE.mp3');
  countSound.loop=false;countSound.preload='auto';countSound.volume=.9;
  function stopCountSound(){countSound.pause();countSound.currentTime=0;}
  const grayExports = new Map();
  const portrait = matchMedia('(orientation:portrait)');
  function placeLevelBadge() {
    const badge=byId('resultLevelBadge');
    if(portrait.matches) view.querySelector('.result-titlebar').append(badge);
    else view.querySelector('.result-comparison').prepend(badge);
  }
  portrait.addEventListener('change',placeLevelBadge);
  placeLevelBadge();
  async function exportGrade(image,size={}) {
    const source = image.currentSrc || image.src;
    const gray=image.classList.contains('grade-broken');
    const style=getComputedStyle(image),background=image.classList.contains('result-background');
    const width=size.width||image.clientWidth||image.naturalWidth,height=size.height||image.clientHeight||image.naturalHeight;
    const fit=style.objectFit==='cover'?'slice':'meet';
    const brightness=background?Number(style.filter.match(/brightness\(([^)]+)\)/)?.[1]||1):1;
    const saturation=background?Number(style.filter.match(/saturate\(([^)]+)\)/)?.[1]||1):1;
    const key=source+'|'+width+'x'+height+'|'+gray+'|'+fit+'|'+brightness+'|'+saturation;
    if (!grayExports.has(key)) {
      grayExports.set(key, (async () => {
        await image.decode();
        const response = await fetch(source);
        if (!response.ok) throw new Error('Não foi possível exportar a grade.');
        const blob = await response.blob();
        const data = await new Promise((resolve,reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
        });
        // html2canvas lacks CSS filters/object-fit. Bake both into the image.
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><defs><filter id="gray" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".936" intercept="-.1"/><feFuncG type="linear" slope=".936" intercept="-.1"/><feFuncB type="linear" slope=".936" intercept="-.1"/></feComponentTransfer></filter><filter id="tone" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="'+saturation+'"/><feComponentTransfer><feFuncR type="linear" slope="'+brightness+'"/><feFuncG type="linear" slope="'+brightness+'"/><feFuncB type="linear" slope="'+brightness+'"/></feComponentTransfer></filter></defs><image width="100%" height="100%" preserveAspectRatio="xMidYMid '+fit+'"' + (gray ? ' filter="url(#gray)"' : background ? ' filter="url(#tone)"' : '') + ' href="' + data + '"/></svg>';
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      })());
    }
    try{return await grayExports.get(key);}catch(error){grayExports.delete(key);throw error;}
  }
  function normalizedGrade(value) {
    const grade = String(value || '').replace(/^x/i,'').replace(/_plus/gi,'+').replace(/\s/g,'').toUpperCase();
    return ranks.includes(grade) ? grade : 'F';
  }
  function gradeImage(value) {
    const grade = normalizedGrade(value);
    const filename=grade==='C'?'C':grade.toLowerCase().replace('+','_plus');
    return 'assets/img/phx2/grades/' + filename + '.png';
  }
  function gradeClass(value, broken = false) {
    return broken ? 'grade-broken' : '';
  }
  function rank(image, value, broken = false) {
    const grade = normalizedGrade(value);
    image.hidden = false; image.src = gradeImage(grade,broken);
    image.alt = grade + (broken ? ' — Stage Break Off' : ' — Stage Pass');
    image.classList.remove('grade-out','grade-broken','grade-cyan');
    const className = gradeClass(grade,broken); if (className) image.classList.add(className);
  }
  function plate(image, code, broken = false) {
    image.hidden = !plates[code] || broken;
    if (image.hidden) { image.removeAttribute('src'); image.alt = ''; return; }
    image.src = 'assets/img/phx2/plates/' + plates[code] + '.png';
    image.alt = plateNames[code]; image.classList.remove('plate-out');
  }
  const number = value => Number.isFinite(Number(value)) ? Math.max(0,Math.floor(Number(value))) : 0;
  const scoreText = value => String(Math.min(1000000,number(value))).padStart(7,'0');
  const countText = value => value === undefined || value === null || !Number.isFinite(Number(value)) ? '—' : String(number(value)).padStart(3,'0');
  const kcalText = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value.toFixed(3) : '—';
  async function revealAwards() {
    if(renderCount!==null || !view.classList.contains('awards-pending') || awardRevealVersion===resultVersion)return;
    const version=resultVersion;
    awardRevealVersion=version;
    const images=[...view.querySelectorAll('.result-rank,.result-plate')].filter(image=>!image.hidden);
    await Promise.allSettled(images.map(image=>image.decode?image.decode():Promise.resolve()));
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches)await new Promise(resolve=>setTimeout(resolve,300));
    if(version!==resultVersion || !document.body.classList.contains('results-active') || !view.classList.contains('awards-pending'))return;
    view.classList.remove('awards-pending');view.classList.add('awards-ready');
  }
  function finishCount() {
    stopCountSound();
    if(scoreFrame!==null)cancelAnimationFrame(scoreFrame);
    scoreFrame=null;renderCount?.(1);renderCount=null;
    revealAwards();
  }
  function animateNumbers(entries) {
    renderCount=progress=>entries.forEach(({node,value,format})=>{
      const text=format(value*progress);if(node.textContent!==text)node.textContent=text;
    });
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){finishCount();return;}
    renderCount(0);
    countSound.play().catch(()=>{});
    let started=null,lastPaint=0;
    function animate(time){
      if(started===null)started=time;
      const progress=Math.min(1,(time-started)/2400);
      if(time-lastPaint>=1000/30||progress===1){renderCount?.(1-(1-progress)**2);lastPaint=time;}
      if(progress<1)scoreFrame=requestAnimationFrame(animate);
      else finishCount();
    }
    scoreFrame=requestAnimationFrame(animate);
  }
  function stopTheme(){resultTheme.pause();resultTheme.currentTime=0;}
  function playTheme(){stopMusicPreview();resetAudio();resultTheme.play().catch(()=>{});}
  async function fadeOut(){
    if(leaving || !document.body.classList.contains('results-active') || root.PiuScoreShare?.isBusy())return false;
    leaving=true;
    stopCountSound();
    const version=resultVersion;
    byId('resultNext').disabled=true;byId('resultExport').disabled=true;
    view.classList.remove('results-revealing');view.classList.add('results-leaving');
    await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion:reduce)').matches?0:600));
    return leaving && version===resultVersion && document.body.classList.contains('results-active');
  }
  function close() {
    leaving=false;byId('resultNext').disabled=false;byId('resultExport').disabled=false;
    view.classList.remove('results-revealing','results-leaving','awards-pending','awards-ready');
    finishCount();stopTheme();document.body.classList.remove('results-active');
    requestAnimationFrame(() => document.querySelector('#online-song .listSong.active:not(.wheel-ghost)')?.focus({preventScroll:true}));
  }
  function show(incoming) {
    leaving=false;byId('resultNext').disabled=false;byId('resultExport').disabled=false;
    view.classList.remove('results-leaving','awards-pending','awards-ready');
    finishCount();view.dataset.resultVersion=String(++resultVersion);
    view.classList.add('awards-pending');
    const perf = incoming.performance;
    const score = Math.max(0,Math.min(1000000,number(incoming.score ?? LocalRecords.score(perf))));
    const broken = LocalRecords.isBroken(incoming);
    const passed = !broken && LocalRecords.judgments(perf) > 0 && incoming.passed !== false;
    const result = {...incoming,score,broken,passed,grade:LocalRecords.grade(score),plate:passed ? LocalRecords.plate({...perf,broken}) : ''};
    let best = incoming.previousBest;
    if (!Object.hasOwn(incoming,'previousBest')) { try { best = LocalRecords.best(incoming); } catch (_) { best = null; } }
    const newRecord = passed && (incoming.newRecord ?? (!best || score > best.score));
    root.PiuCommand?.close();
    root.PiuMobileCommand?.close();
    root.PiuPrestart?.close();
    stopMusicPreview();
    document.querySelector('.bg-video')?.pause();
    document.body.classList.add('results-active');
    byId('performanceSong').textContent = result.title;
    byId('resultArtist').textContent = result.artist || '';
    byId('resultPlayerName').textContent = byId('nameUserGame')?.textContent || 'PIUWEB';
    byId('resultAvatar').src = byId('profileUserGame')?.src || 'assets/img/avatar/default.png';
    const art = byId('resultBackground');
    art.onerror = () => {
      art.onerror = () => art.hidden = true;
      if (result.banner_path) art.src = result.banner_path; else art.hidden = true;
    };
    art.hidden = !(result.background_path || result.banner_path);
    if (!art.hidden) art.src = result.background_path || result.banner_path;
    else art.removeAttribute('src');
    const type = result.type || result.step_type || 'pump-single';
    byId('stepType').textContent = type === 'pump-single' ? 'SINGLE' : type === 'pump-halfdouble' ? 'HALF DOUBLE' : 'DOUBLE';
    byId('songLevel').textContent = String(result.level).padStart(2,'0');
    byId('resultLevelBadge').classList.toggle('double',type === 'pump-double');
    byId('resultLevelBadge').classList.toggle('half',type === 'pump-halfdouble');
    byId('resultLevelBadge').classList.toggle('single',type === 'pump-single');
    byId('score').textContent = scoreText(score); byId('score').setAttribute('aria-live','off');
    rank(byId('gradeResult'),result.grade,broken); plate(byId('plateResult'),result.plate,broken);
    if (!passed && !broken) byId('gradeResult').alt = result.grade + ' — Sem resultado';
    byId('resultOutcome').textContent = broken ? 'STAGE BREAK OFF' : passed ? 'STAGE PASS' : 'SEM RESULTADO';
    byId('resultOutcome').classList.toggle('is-broken',broken);
    byId('resultNewRecord').hidden = !newRecord;
    const delta = best ? score - best.score : null;
    byId('resultDelta').textContent = delta === null ? 'SEM RECORDE ANTERIOR' : (delta > 0 ? '+' : delta < 0 ? '−' : '±') + Math.abs(delta).toLocaleString('en-US');
    byId('resultDelta').classList.toggle('is-negative',delta !== null && delta < 0);
    byId('resultBestScore').textContent = best ? scoreText(best.score) : '—';
    byId('resultBestGrade').hidden = !best; byId('resultBestEmpty').hidden = !!best;
    if (best) rank(byId('resultBestGrade'),LocalRecords.grade(best.score),LocalRecords.isBroken(best));
    plate(byId('resultBestPlate'),best?.plate,LocalRecords.isBroken(best));
    byId('resultBestOutcome').textContent = best ? 'RECORDE PESSOAL' : 'AINDA SEM RECORDE';
    byId('resultBestDate').textContent = best?.date && Number.isFinite(Date.parse(best.date)) ? new Date(best.date).toLocaleDateString('pt-BR') : 'Antes desta partida';
    const previous = best?.performance || {};
    [['p','perfect','resultBestPerfect'],['gr','great','resultBestGreat'],['go','good','resultBestGood'],['b','bad','resultBestBad'],['m','miss','resultBestMiss'],['maxCombo','maxCombo','resultBestCombo']].forEach(([key,currentId,bestId]) => {
      byId(currentId).textContent = countText(perf[key]);
      byId(bestId).textContent = countText(key === 'maxCombo' ? best?.combo ?? previous.maxCombo : previous[key]);
    });
    byId('resultKcal').textContent = kcalText(perf.kcal); byId('resultBestKcal').textContent = kcalText(previous.kcal);
    const counters=[];
    const counter=(id,value,format)=>{
      if(value!==null&&value!==undefined&&Number.isFinite(Number(value)))counters.push({node:byId(id),value:Number(value),format});
    };
    counter('score',score,scoreText);
    if(best)counter('resultBestScore',best.score,scoreText);
    [['p','perfect','resultBestPerfect'],['gr','great','resultBestGreat'],['go','good','resultBestGood'],['b','bad','resultBestBad'],['m','miss','resultBestMiss'],['maxCombo','maxCombo','resultBestCombo']].forEach(([key,currentId,bestId])=>{
      counter(currentId,perf[key],countText);
      counter(bestId,key==='maxCombo'?best?.combo??previous.maxCombo:previous[key],countText);
    });
    if(typeof perf.kcal==='number'&&perf.kcal>=0)counter('resultKcal',perf.kcal,kcalText);
    if(typeof previous.kcal==='number'&&previous.kcal>=0)counter('resultBestKcal',previous.kcal,kcalText);
    if(delta!==null)counter('resultDelta',Math.abs(delta),value=>(delta>0?'+':delta<0?'−':'±')+Math.floor(value).toLocaleString('en-US'));
    const config = result.config || {};
    const autoSpeed = config.scrollMode === 'auto';
    byId('resultSpeedKind').textContent = autoSpeed ? 'AV' : 'SPEED';
    PiuControlMode.render(byId('resultControlMode'),!!config.useTouchInput);
    byId('songSpeed').textContent = autoSpeed ? String(config.autoVelocity || 300) : 'X' + (config.speed || 1);
    byId('bgaStatus').textContent = (config.bga || 'on').toUpperCase();
    byId('songRush').textContent = Math.round((config.playback || 1) * 100) + '%';
    byId('bgaStatus').parentElement.hidden = (config.bga || 'on').toLowerCase() === 'on';
    byId('songRush').parentElement.hidden = Number(config.playback || 1) === 1;
    byId('resultNoteskin').src = PiuGameSettings.skinImage(config.noteskin || PiuGameSettings.defaults().skin);
    byId('resultNoteskin').alt = 'Noteskin usada: ' + (config.noteskin || PiuGameSettings.defaults().skin);
    byId('resultSaveError').hidden = !result.error; byId('resultSaveError').textContent = result.error || '';
    view.dataset.broken = String(broken);
    view.setAttribute('aria-label','Resultado de ' + result.title + ': ' + result.grade + ', ' + score + ' pontos, ' + byId('resultOutcome').textContent);
    view.classList.add('results-revealing');
    $('#performance').collapse('show'); window.scrollTo(0,0);
    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
    view.classList.toggle('results-reduced-motion',reduced);
    animateNumbers(counters);
    view.tabIndex = -1; requestAnimationFrame(() => view.focus({preventScroll:true}));
    playTheme();
    return result;
  }
  view.addEventListener('animationend',event=>{
    if(event.animationName==='result-fade-in')view.classList.remove('results-revealing');
  });
  document.addEventListener('keydown',event => {
    if(root.PiuScoreShare?.isBusy())return;
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    if (!document.body.classList.contains('results-active') || document.querySelector('.modal.show,dialog[open]') || event.target.closest('input,select,textarea,[contenteditable]')) return;
    if (event.key === 'Enter' && event.target.closest('button,a')) return;
    if (['enter','escape','s'].includes(event.key.toLowerCase())) {
      event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) byId('resultNext').click();
    }
  },true);
  root.PiuResults = {show,close,fadeOut,isLeaving:()=>leaving,rank,plate,gradeImage,gradeClass,exportGrade,finishCount,playTheme,stopTheme};
  root.addEventListener('pagehide',stopCountSound);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopCountSound();
  });
})(globalThis);
