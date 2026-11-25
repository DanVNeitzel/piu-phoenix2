/* Centered channel wheel: browsing changes focus; confirmation loads the channel. */
(function(root){
  'use strict';
  const wheel=document.getElementById('stage');
  const heading=document.querySelector('.blockSelectChannel .card-title');
  const description=document.createElement('p');
  description.className='channel-wheel-description';
  description.setAttribute('aria-live','polite');
  wheel.after(description);
  let selected=null,opened=false,pointer=null,ignoreClickUntil=0;
  let levelMode=false,channelNodes=[],levelStage=null;
  const cards=()=>[...wheel.querySelectorAll('.listSong')];
  const visible=()=>!blockSelectChannel.classList.contains('hide');
  function title(card){return card.title || card.querySelector('.song-card-caption')?.textContent || 'FAVORITES';}
  function artwork(card){
    if(card.dataset.level)return;
    const name=title(card).toUpperCase();
    if(card.dataset.idx==='favorites')return;
    const series=[[/PHOENIX\s*2/,'Phoenix2'],[/PHOENIX/,'Phoenix'],[/PRIME\s*2/,'Prime2'],[/PRIME/,'Prime'],[/XX/,'XX'],[/FIESTA/,'Fiesta_to_fiesta2'],[/NX/,'NX_to_NXA'],[/1ST|PERF|EXTRA|PREX|EXCEED|ZERO/,'1st_to_ZERO']];
    const suffix=series.find(([pattern])=>pattern.test(name))?.[1];
    const stage=songsJson?.children[Number(card.dataset.idx)];
    const file=stage?.banner?null:suffix?'Series_Zone_'+suffix+'.png':null;
    let image=card.querySelector('img');
    if(file && !image){
      image=document.createElement('img');image.className='bannerSong';
      card.querySelector('div')?.replaceChildren(image);
    }
    if(file && image && !image.dataset.channelArtwork){
      const original=image.src;image.dataset.channelArtwork='true';
      image.onerror=()=>{image.onerror=null;if(original)image.src=original;else image.hidden=true;};
      image.src='assets/img/phx2/channels/'+file;
    }
    if(image)image.alt=title(card);
  }
  function updateLock(card) {
    if(card.dataset.level)return;
    const locked=channelSongCount(card.dataset.idx)===0;
    card.classList.toggle('channel-locked',locked);
    card.setAttribute('aria-disabled',String(locked));
    card.setAttribute('aria-label',title(card)+(locked?' · Bloqueado: sem músicas':''));
    let lock=card.querySelector('.channel-lock');
    if(locked && !lock){
      lock=document.createElement('span');lock.className='channel-lock';lock.setAttribute('aria-hidden','true');
      lock.innerHTML='<span class="material-symbols-outlined">lock</span>';
      card.append(lock);
    }
    if(lock)lock.hidden=!locked;
  }
  function render(){
    const list=cards();if(!list.length)return;
    if(!list.includes(selected))selected=list.find(card=>card.classList.contains('active')) || list[0];
    const index=list.indexOf(selected);
    list.forEach((card,i)=>{
      // Selection is controlled here; Bootstrap must not reactivate detached cards.
      card.removeAttribute('data-bs-toggle');
      let offset=i-index;
      if(offset>list.length/2)offset-=list.length;
      if(offset< -list.length/2)offset+=list.length;
      const distance=Math.abs(offset),hidden=distance>2;
      card.style.setProperty('--channel-offset',offset);
      card.style.setProperty('--channel-scale',distance===0?'1.2':distance===1?'.83':'.64');
      card.style.setProperty('--channel-opacity',hidden?'0':distance===0?'1':distance===1?'.82':'.35');
      card.style.zIndex=String(10-Math.min(distance,9));
      card.classList.toggle('channel-highlight',card===selected);
      card.classList.toggle('channel-offscreen',hidden);
      card.tabIndex=hidden?-1:0;
      const levelImage=card.querySelector('img[data-level-src]');
      if(!hidden && levelImage && !levelImage.getAttribute('src'))levelImage.src=levelImage.dataset.levelSrc;
      artwork(card);
      updateLock(card);
    });
    if(heading)heading.textContent=levelMode?'DIFFICULTY ZONE '+channelChartFilter.label:title(selected).replace(/^\d+[- ]*/, '');
    if(levelMode){
      description.textContent=channelChartFilter.label+' · NÍVEL '+selected.dataset.level+' · S / ENTER PARA CONFIRMAR';
      wheel.scrollLeft=0;return;
    }
    const count=channelSongCount(selected.dataset.idx);
    description.textContent=count===0?'CANAL BLOQUEADO · SEM MÚSICAS NESTA BIBLIOTECA':
      (count===undefined?'':count+' músicas · ')+ 'S / ENTER PARA CONFIRMAR';
    wheel.scrollLeft=0;
  }
  function choose(card,sound=true){
    if(!card || !cards().includes(card))return;
    const changed=selected!==card;selected=card;render();
    card.focus({preventScroll:true});
    if(changed && sound)changeSongAudio();
  }
  function move(delta){
    if(!visible())return;
    root.PiuArrowFeedback?.flash(delta<0?'arrowChannelLeft':'arrowChannelRight');
    const list=cards();if(list.length<2)return;
    const index=Math.max(0,list.indexOf(selected));
    choose(list[(index+delta+list.length)%list.length]);
  }
  function open(){
    const list=cards();
    selected=levelMode?list.find(card=>card.dataset.level===String(channelChartFilter?.level || 1)) || list[0]:
      list.find(card=>card.classList.contains('active')) || list[0] || null;
    if(!levelMode && currentChannel==='favorites')selected=list.find(card=>card.dataset.idx==='favorites') || selected;
    opened=true;wheel.classList.add('channel-wheel-opening');render();
    selected?.focus({preventScroll:true});
  }
  function restoreChannels(){
    if(!levelMode)return;
    wheel.replaceChildren(...channelNodes);channelNodes=[];levelMode=false;levelStage=null;
    document.body.classList.remove('difficulty-level-select');
    cards().forEach(card=>card.classList.toggle('active',currentChannel==='favorites'?
      card.dataset.idx==='favorites':card.dataset.idx===String(stageIndex)));
    selected=null;opened=false;ignoreClickUntil=0;pointer=null;
  }
  function openLevels(){
    if(!channelChartFilter)return;
    if(levelMode && levelStage!==stageIndex)restoreChannels();
    resetSongSelection();
    if(!levelMode){
      channelNodes=[...wheel.children];levelMode=true;levelStage=stageIndex;
      const levels=[...Array.from({length:26},(_,i)=>i+1),'27+'];
      const list=levels.map(level=>{
        const card=document.createElement('button');card.type='button';
        card.className='listSong channel-level-card';card.dataset.level=String(level);
        card.title=channelChartFilter.label+' · NÍVEL '+level;
        card.setAttribute('aria-label',card.title);
        const half=channelChartFilter.type==='pump-halfdouble';
        const art=document.createElement('div');art.className='channel-level-art '+channelChartFilter.mode+(half?' half':'');
        const label=document.createElement('span');label.textContent=channelChartFilter.label;
        const number=document.createElement('strong');number.textContent=level==='27+'?level:String(level).padStart(2,'0');
        art.append(label,number);
        const source=half?null:PiuLibrary.levelArtwork(channelChartFilter,level,songsJson?.levelArtworkExtension);
        if(source){
          const image=document.createElement('img');image.className='bannerSong channel-level-image';
          image.alt=card.title;image.width=1280;image.height=1280;image.decoding='async';
          image.dataset.levelSrc=libraryUrl(source);
          art.classList.add('has-level-artwork');
          image.onerror=()=>{image.remove();art.classList.remove('has-level-artwork');};
          art.append(image);
        }
        card.append(art);
        card.onclick=()=>selectChannelLevel(level);
        return card;
      });
      wheel.replaceChildren(...list);
    }
    document.body.classList.add('difficulty-level-select');
    stopMusicPreview();resetAudio();
    blockSelectSong.classList.add('hide');btnSelectMusic.classList.add('hide');
    blockSelectChannel.classList.remove('hide');
    channelMusic.src='assets/sounds/PHOENIX_2_CHANNEL_THEME.mp3';channelMusic.play().catch(()=>{});
    ignoreClickUntil=0;pointer=null;open();
  }
  function back(){
    if(levelMode && visible()){selectChannel(true);return true;}
    if(channelChartFilter && currentChannel!=='favorites' && !blockSelectSong.classList.contains('hide')){
      openLevels();return true;
    }
    return false;
  }
  wheel.addEventListener('animationend',event=>{
    if(event.animationName==='channel-wheel-open')wheel.classList.remove('channel-wheel-opening');
  });
  wheel.addEventListener('click',event=>{
    const card=event.target.closest('.listSong');if(!card || !visible())return;
    if(!card.dataset.level && !channelSongCount(card.dataset.idx)){
      event.preventDefault();event.stopImmediatePropagation();
      if(performance.now()>=ignoreClickUntil)choose(card);
      return;
    }
    if(performance.now()<ignoreClickUntil || card!==selected){
      event.preventDefault();event.stopImmediatePropagation();
      if(performance.now()>=ignoreClickUntil)choose(card);
    }
  },true);
  wheel.addEventListener('focusin',event=>{
    const card=event.target.closest('.listSong');
    if(visible() && !pointer && card && card!==selected)choose(card);
  });
  wheel.addEventListener('wheel',event=>{
    if(!visible())return;
    event.preventDefault();event.stopImmediatePropagation();
    const now=performance.now();
    if(now<ignoreClickUntil)return;
    const delta=event.deltaX || event.deltaY;if(!delta)return;
    ignoreClickUntil=now+160;move(delta>0?1:-1);
  },{capture:true,passive:false});
  wheel.addEventListener('pointerdown',event=>{pointer={x:event.clientX,y:event.clientY,id:event.pointerId};});
  wheel.addEventListener('pointerup',event=>{
    if(pointer?.id===event.pointerId){
      const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
      if(Math.abs(dx)>35 && Math.abs(dx)>Math.abs(dy)){
        move(dx<0?1:-1);ignoreClickUntil=performance.now()+300;
      }
    }
    pointer=null;
  });
  wheel.addEventListener('pointercancel',()=>pointer=null);
  ['Left','Right'].forEach((side,i)=>{
    const button=document.getElementById('arrowChannel'+side);
    button.innerHTML='<img src="assets/img/phx2/arrow_blue_shift_'+(i?'r':'l')+'.png" alt="">';
    button.setAttribute('aria-label',i?'Próximo canal':'Canal anterior');
    button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();move(i?1:-1);},true);
  });
  new MutationObserver(()=>{if(visible())render();}).observe(wheel,{childList:true});
  document.addEventListener('piu:favoritechange',()=>{if(visible())render();});
  new MutationObserver(()=>{
    if(visible() && !opened)open();
    if(!visible()){opened=false;wheel.classList.remove('channel-wheel-opening');}
  }).observe(blockSelectChannel,{attributes:true,attributeFilter:['class']});
  root.PiuChannels={open,move,openLevels,restoreChannels,back,isLevelPicker:()=>levelMode&&visible()};
})(globalThis);
