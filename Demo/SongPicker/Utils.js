/*
 * # Copyright (C) Pedro G. Bascoy
# This file is part of piured <https://github.com/piulin/piured>.
#
# piured is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# piured is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with piured. If not, see <http://www.gnu.org/licenses/>.
 *
 */

// Catalog and media share the published GitHub Pages origin.
let resources = 'https://danvneitzel.github.io/piu-songs/';
const publishedLibrary = resources;
function libraryUrl(path) { return new URL(path.split('/').map(encodeURIComponent).join('/'), resources).href; }
let songLoadVersion = 0;
let songLoadController = null;
const chartCache = new Map();
let channelChartFilter = null;
const difficultyIndexCache = new Map();
const halfDifficultyCache = new WeakMap();
let difficultySelectionVersion = 0;
let selectionReady = Promise.resolve();
const chartInfoCache = new Map();
const chartInfoQueue=[];
let chartInfoActive=0;
const coopIndexedPaths=new Set();
let coopIndexScan=null;
function chartPath(entry){return entry.children.find(file=>/\.ssc$/i.test(file.name))?.path.replace(/^\.\//,'');}
async function loadCoopIndex(){
  if(resources!==publishedLibrary)return;
  try{
    const index=await difficultyFile('assets/data/coop-index.json');
    if(index.schema!==1 || index.library!==resources || !Array.isArray(index.songs) || !Array.isArray(index.indexedPaths))return;
    const entries=new Map(PiuLibrary.entries(songsJson).map(({song})=>[chartPath(song),song]));
    index.indexedPaths.forEach(path=>coopIndexedPaths.add(path));
    index.songs.forEach(({sscPath,charts})=>{
      const entry=entries.get(sscPath);if(!entry || !Array.isArray(charts))return;
      registerCoop(entry,charts);
      const url=libraryUrl(entry.children.find(file=>/\.ssc$/i.test(file.name)).path);
      if(!chartInfoCache.has(url))chartInfoCache.set(url,Promise.resolve(charts));
    });
  }catch(error){console.warn('Índice CO-OP indisponível; os charts serão verificados ao abrir os canais.',error);}
}
function ensureCoopIndex(){
  if(coopIndexScan)return coopIndexScan;
  // A channel supplied by songs.json is only a hint. Search every physical song,
  // including custom libraries and files added since the shipped index was built.
  const entries=PiuLibrary.entries(songsJson).map(({song})=>song).filter(entry=>!coopIndexedPaths.has(chartPath(entry)));
  if(!entries.length)return Promise.resolve();
  coopIndexScan=Promise.allSettled(entries.map(async entry=>{
    await chartInfo(entry);coopIndexedPaths.add(chartPath(entry));
  })).finally(()=>{coopIndexScan=null;document.dispatchEvent(new CustomEvent('piu:coopchange'));});
  return coopIndexScan;
}
function pumpChartInfoQueue(){
  while(chartInfoActive<4 && chartInfoQueue.length){
    const task=chartInfoQueue.shift();chartInfoActive++;
    task().finally(()=>{chartInfoActive--;pumpChartInfoQueue();});
  }
}
function chartInfo(entry){
  const file=entry.children.find(file=>/\.ssc$/i.test(file.name)),url=libraryUrl(file.path);
  if(!chartInfoCache.has(url))chartInfoCache.set(url,new Promise((resolve,reject)=>{
    chartInfoQueue.push(async()=>{
      try {
        const content=chartCache.get(url) || await difficultyFile(url,true);
        const charts=PiuCoop.summaries(content);registerCoop(entry,charts);resolve(charts);
      }catch(error){chartInfoCache.delete(url);reject(error);}
    });pumpChartInfoQueue();
  }));
  return chartInfoCache.get(url);
}
function registerCoop(entry,charts){
  if(!charts.some(chart=>chart.COOP))return;
  const stage=songsJson?.children.find(stage=>stage.channelId==='co-op');if(!stage)return;
  if(!stage.children.some(song=>PiuLibrary.songKey(song)===PiuLibrary.songKey(entry))){
    stage.children.push(entry);
    stage.coopPaths?.add(entry.path);
    try{localStorage.setItem('piu_coop_routes',JSON.stringify({library:resources,keys:stage.children.map(PiuLibrary.songKey)}));}catch(_){}
    document.dispatchEvent(new CustomEvent('piu:coopchange'));
  }
}
async function playablePaths(entries,filter){
  const candidates=entries.filter(hasChart);
  const results=await Promise.allSettled(candidates.map(async entry=>({entry,charts:await chartInfo(entry)})));
  const failures=results.flatMap((result,index)=>result.status==='rejected'?[{path:candidates[index].path,error:result.reason}]:[]);
  // Difficulty availability must remain unknown on failure. CO-OP can still show
  // verified charts when an unrelated catalogue entry is missing or offline.
  if(failures.length && !filter?.coop)throw failures[0].error;
  const matches=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
  const paths=new Set(matches.filter(({charts})=>charts.some(chart=>PiuLibrary.matchesChart(chart,filter))).map(({entry})=>entry.path));
  if(failures.length){
    console.warn('Arquivos indisponíveis ao verificar CO-OP:',failures);
    // No verified CO-OP plus failed downloads is not an empty channel: keep it
    // retryable. Failed entries are evicted from chartInfoCache by chartInfo().
    if(!paths.size)throw failures[0].error;
  }
  return paths;
}

function resetSongSelection() {
  document.getElementById('song-coop-link')?.remove();
  ++songLoadVersion;
  songLoadController?.abort();
  stopMusicPreview();
  chart_level = null; selsong = null; song = null; songIndex = null;
  sscpath = null; mp3path = null; imgpath = null; imageMusic = ''; imageChannel = '';
  clear('level');
  document.querySelectorAll('.btnSelectMusic').forEach(button => button.disabled = true);
  ['t','a','st','d','m','c','b','stops','delays','scrolls','warps','speeds','trickNotes'].forEach(id => {
    const element = document.getElementById(id); if (element) element.textContent = '—';
  });
  ['playable-true','playable-false','playable-unknown'].forEach(id => {
    const element = document.getElementById(id); if (element) element.style.display = 'none';
  });
  document.dispatchEvent(new CustomEvent('piu:songchange'));
}

function showEmptyChannel(title, message) {
  const holder = document.getElementById('online-song');
  holder.replaceChildren();
  const panel = document.createElement('div'); panel.className = 'channel-empty'; panel.setAttribute('role','status');
  const heading = document.createElement('strong'); heading.textContent = title;
  const text = document.createElement('p'); text.textContent = message;
  const back = document.createElement('button'); back.type = 'button'; back.textContent = 'ESCOLHER CANAL'; back.onclick = selectChannel;
  panel.append(heading,text,back); holder.append(panel);
}

function channelLevelPicker() {
  let picker = document.getElementById('channel-level-picker');
  if (!picker) {
    picker = document.createElement('fieldset'); picker.id = 'channel-level-picker'; picker.className = 'channel-level-picker';
    const legend = document.createElement('legend'); legend.textContent = 'ESCOLHA O NÍVEL';
    const options = document.createElement('div'); options.className = 'channel-level-options';
    const help = document.createElement('p'); help.textContent = 'Mostra somente os charts do modo e nível escolhidos.';
    picker.append(legend,options,help);
    document.getElementById('online-song').before(picker);
  }
  return picker;
}

async function difficultyFile(url, text = false) {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(url,{cache:'no-cache',signal:controller.signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return await (text?response.text():response.json());
  } finally {clearTimeout(timeout);}
}

async function difficultyPaths(stage, filter) {
  if(filter.type==='pump-halfdouble'){
    // Scan SSC metadata once for every Half Double level, with bounded downloads.
    if(!halfDifficultyCache.has(stage)){
      const loading=(async()=>{
        const queue=stage.children.filter(hasChart),entries=[];
        await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
          while(queue.length){
            const entry=queue.shift(),file=entry.children.find(f=>/\.ssc$/i.test(f.name));
            const url=libraryUrl(file.path);
            let content=chartCache.get(url);
            if(!content){content=await difficultyFile(url,true);chartCache.set(url,content);}
            entries.push({path:entry.path,charts:content.split(/#NOTEDATA\s*:\s*;/i).slice(1).map(section=>({
              STEPSTYPE:section.match(/#STEPSTYPE\s*:\s*([^;]*);/i)?.[1].trim(),
              METER:section.match(/#METER\s*:\s*([^;]*);/i)?.[1].trim()}))});
          }
        }));
        return entries;
      })().catch(error=>{halfDifficultyCache.delete(stage);throw error;});
      halfDifficultyCache.set(stage,loading);
    }
    const entries=await halfDifficultyCache.get(stage);
    return new Set(entries.filter(entry=>entry.charts.some(chart=>PiuLibrary.matchesChart(chart,filter))).map(entry=>entry.path));
  }
  const url=libraryUrl('difficulty-zone/'+filter.mode+'/'+(filter.level==='27+'?'27-plus':filter.level)+'.json');
  if(!difficultyIndexCache.has(url)){
    const loading=difficultyFile(url).then(entries=>{
      if(!Array.isArray(entries))throw new Error('Índice de dificuldade inválido');
      return entries;
    }).catch(error=>{difficultyIndexCache.delete(url);throw error;});
    difficultyIndexCache.set(url,loading);
  }
  const entries=await difficultyIndexCache.get(url);
  const available=new Set(stage.children.filter(hasChart).map(entry=>entry.path));
  const candidates=new Set(entries.map(entry=>entry.songPath).filter(path=>available.has(path)));
  if(filter.type==='pump-double')return playablePaths(stage.children.filter(entry=>candidates.has(entry.path)),filter);
  return candidates;
}

async function selectChannelLevel(level, selection = null) {
  if (!channelChartFilter?.type || !(level==='27+' || (Number.isInteger(Number(level)) && Number(level)>=1 && Number(level)<=26))) return;
  const request=++difficultySelectionVersion,version=songLoadVersion;
  const stage = songsJson.children[stageIndex];
  const filter = {...channelChartFilter,level};
  try {
    const paths=await difficultyPaths(stage,filter);
    if(request!==difficultySelectionVersion || version!==songLoadVersion || stage!==songsJson.children[stageIndex])return;
    if(!paths.size){
      if(!window.PiuChannels?.isLevelPicker())window.PiuChannels?.openLevels();
      return;
    }
    channelChartFilter=filter;resetSongSelection();
    if(document.body.classList.contains('results-active'))blockSelectChannel.classList.add('hide');
    else choiceChannel();
    const selectedSong=selection ? stage.children.findIndex(entry => PiuLibrary.songKey(entry)===selection.songKey || entry.children?.some(file=>file.path===selection.ssc)) : 0;
    await renderChannelSongs(stage,selectedSong,paths,selection?.chart);
  } catch (error) {
    if(request!==difficultySelectionVersion || version!==songLoadVersion)return;
    showNotification('Não foi possível verificar as músicas deste nível. Tente novamente.','error');
    console.error('Erro no índice de dificuldade:',error);
  }
}

function songBanner(entry) {
  const images = (entry.children || []).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f.name));
  return (images.find(f => !/(?:_B\.|wide|background)/i.test(f.name)) || images[0])?.path || '';
}
function hasChart(entry) { return (entry.children || []).some(file => /\.ssc$/i.test(file.name)); }
function channelSongCount(index) {
  if (index === 'favorites') return getFavorites().filter(favorite => !favorite.unavailable).length;
  return PiuLibrary.songCount(songsJson?.children[Number(index)],songsJson);
}

let imageMusic = '';
let imageChannel = '';

let default_song = '';

let timer;

var fullmp3path = '';
var currentChannel = null; // Variável global para rastrear o canal atual

// === SISTEMA DE FAVORITOS ===
function getFavorites() {
  try {
    let favorites = localStorage.getItem('piu_favorites');
    const stored = favorites ? JSON.parse(favorites) : [];
    if (!songsJson?.children) return Array.isArray(stored) ? stored : [];
    const migrated = PiuLibrary.migrateFavorites(stored,songsJson);
    if (JSON.stringify(migrated) !== JSON.stringify(stored)) saveFavorites(migrated);
    return migrated;
  } catch (e) {
    console.error('Erro ao carregar favoritos:', e);
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem('piu_favorites', JSON.stringify(favorites));
  } catch (e) {
    console.error('Erro ao salvar favoritos:', e);
  }
}

function isFavorite(songData) {
  let favorites = getFavorites();
  return favorites.some(fav => fav.key && fav.key === songData.key);
}

function toggleFavorite(songData) {
  let favorites = getFavorites();
  let index = favorites.findIndex(fav => fav.key && fav.key === songData.key);

  if (index > -1) {
    // Remover dos favoritos
    favorites.splice(index, 1);
    console.log('Música removida dos favoritos:', songData.name);
    if (typeof showNotification === 'function') {
      showNotification('Removed from Favorites: ' + songData.name, 'info');
    }
  } else {
    // Adicionar aos favoritos
    favorites.push(songData);
    console.log('Música adicionada aos favoritos:', songData.name);
    if (typeof showNotification === 'function') {
      showNotification('Added to Favorites: ' + songData.name, 'success');
    }
  }

  saveFavorites(favorites);
  const holder=document.getElementById('online-song');
  const cards=[...holder.querySelectorAll('.listSong:not(.wheel-ghost)')];
  const selected=cards.find(card=>card.classList.contains('active'));
  const selectedIndex=cards.indexOf(selected);
  const removed=index>-1;
  if(currentChannel==='favorites' && removed){
    const removedSelected=selected?.dataset.songKey===songData.key;
    holder.querySelectorAll('.listSong').forEach(card=>{
      if(card.dataset.songKey===songData.key)card.remove();
    });
    const remaining=[...holder.querySelectorAll('.listSong:not(.wheel-ghost)')];
    if(!remaining.length){
      resetSongSelection();
      document.querySelector('.favorite-unavailable')?.remove();
      showEmptyChannel('SEUS FAVORITOS','Pressione e segure uma música para adicioná-la aos favoritos.');
      selectChannel(true);
    }else if(removedSelected){
      remaining[Math.min(selectedIndex,remaining.length-1)].click();
    }
    document.dispatchEvent(new CustomEvent('piu:stagechange'));
  }else{
    holder.querySelectorAll('.listSong').forEach(card=>{
      if(card.dataset.songKey!==songData.key)return;
      const star=card.querySelector('.favorite-star-icon');
      if(removed){star?.remove();return;}
      if(star)return;
      const icon=document.createElement('span');icon.className='favorite-star-icon';icon.textContent='⭐';
      Object.assign(icon.style,{position:'absolute',top:'10px',right:'10px',fontSize:'28px',zIndex:'10',textShadow:'#ffc107 0px 0px 4px',pointerEvents:'none'});
      card.firstElementChild.append(icon);
    });
  }
  document.dispatchEvent(new CustomEvent('piu:favoritechange'));
}

let favoriteClickUntil=0;
document.addEventListener('click',event=>{
  if(event.isTrusted===false || performance.now()>=favoriteClickUntil || !event.target.closest('#online-song'))return;
  favoriteClickUntil=0;event.preventDefault();event.stopImmediatePropagation();
},true);
function bindFavoriteGesture(card,songData){
  let gesture=null;
  card.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false || (event.pointerType==='mouse' && event.button!==0))return;
    if(gesture)return;
    const finish=()=>{
      if(!gesture)return;
      clearTimeout(gesture.timer);
      if(gesture.triggered)favoriteClickUntil=performance.now()+500;
      gesture=null;
      document.removeEventListener('pointerup',finish,true);document.removeEventListener('pointercancel',finish,true);
    };
    gesture={x:event.clientX,y:event.clientY,triggered:false,finish};
    document.addEventListener('pointerup',finish,true);document.addEventListener('pointercancel',finish,true);
    gesture.timer=setTimeout(()=>{
      if(!gesture)return;
      gesture.triggered=true;favoriteClickUntil=performance.now()+1000;
      toggleFavorite(songData);navigator.vibrate?.(50);
    },500);
  });
  const cancel=()=>{if(gesture&&!gesture.triggered)gesture.finish();};
  card.addEventListener('pointermove',event=>{
    if(gesture && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)cancel();
  });
  card.addEventListener('pointerleave',cancel);
}
// === FIM SISTEMA DE FAVORITOS ===

function clear(id) {
  var gl = document.getElementById(id);
  gl.innerHTML = '';
}

function change_level(l) {
  // alert('The option with value ' + $(this).val());

  if (!selsong?.levels[l] || !PiuLibrary.matchesChart(selsong.levels[l],channelChartFilter)) return;
  const changed = Number.isInteger(chart_level) && chart_level !== l;
  document.querySelectorAll('#level .listStep').forEach(el => el.classList.toggle('active', Number(el.dataset.idx) === l));
  localStorage.setItem('last_level', l)
  chart_level = l;

  if (selsong !== null) {
    let song = selsong;
    let level = song.levels[l];

    document.getElementById('st').textContent = level.COOP?'CO-OP · '+level.COOP.count+' jogadores':level.STEPSTYPE;
    document.getElementById('t').innerHTML = song.meta.TITLE;
    document.getElementById('a').innerHTML = song.meta.ARTIST;
    document.dispatchEvent(new CustomEvent('piu:levelchange',{detail:{changed}}));
    document.getElementById('d').innerHTML = level.DESCRIPTION;
    document.getElementById('m').innerHTML = level.METER;
    document.getElementById('c').innerHTML = level.CREDIT;
    const advertisedBpm = String(level.DISPLAYBPM || song.meta.DISPLAYBPM || '').split(':').map(Number).filter(value => Number.isFinite(value) && value > 0);
    document.getElementById('b').textContent = advertisedBpm.length ? advertisedBpm.join('–') : PiuScroll.referenceBpm(song,l);

    if (song.getStops(l).length > 0) {
      document.getElementById('stops').innerHTML = 'YES';
    } else {
      document.getElementById('stops').innerHTML = 'NO';
    }

    if (song.getDelays(l).length > 0) {
      document.getElementById('delays').innerHTML = 'YES';
    } else {
      document.getElementById('delays').innerHTML = 'NO';
    }

    if (song.getScrolls(l).length > 1) {
      document.getElementById('scrolls').innerHTML = 'YES';
    } else {
      document.getElementById('scrolls').innerHTML = 'NO';
    }

    if (song.getWARPS(l).length > 0) {
      document.getElementById('warps').innerHTML = 'YES';
    } else {
      document.getElementById('warps').innerHTML = 'NO';
    }

    if (song.getSpeeds(l).length > 1) {
      document.getElementById('speeds').innerHTML = 'YES';
    } else {
      document.getElementById('speeds').innerHTML = 'NO';
    }


    if (level.STEPSTYPE === 'pump-single' || level.STEPSTYPE === 'pump-double' || level.STEPSTYPE === 'pump-halfdouble') {
      document.getElementById('playable-false').style.display = 'none';
      document.getElementById('playable-true').style.display = '';
      document.getElementById('playable-unknown').style.display = 'none';

      if (level.SPECIALNOTES.size !== 0) {
        document.getElementById('playable-false').style.display = 'none';
        document.getElementById('playable-true').style.display = 'none';
        document.getElementById('playable-unknown').style.display = '';
      }

    } else {
      document.getElementById('playable-false').style.display = '';
      document.getElementById('playable-true').style.display = 'none';
      document.getElementById('playable-unknown').style.display = 'none';

    }

    if (level.SPECIALNOTES.size !== 0) {
      document.getElementById('trickNotes').innerHTML = [...level.SPECIALNOTES].join(', ');
    } else {
      document.getElementById('trickNotes').innerHTML = 'NO';
    }

  }
}


function createBattleChannelLink() {
  let a = document.createElement('a');
  let divName = document.createElement('div');
  let img = document.createElement('img');
  let span = document.createElement('span');

  a.href = '#';
  a.setAttribute('data-idx', 'battles');
  a.setAttribute('data-bs-toggle', "list");
  a.className = "list-group-item list-group-item-action listSong";
  a.onclick = function (e) {
    e.preventDefault(); // Prevenir comportamento padrão do link
    if (typeof openBattleChannel === 'function') {
      openBattleChannel();
    }
  };

  let div1 = document.createElement('div');
  div1.className = "d-flex w-100 justify-content-center";

  img.className = "bannerSong";
  img.src = "assets/img/elements/battleMode.png";
  img.onerror = function () {
    this.src = "";
  };

  div1.append(img);
  a.append(div1);

  return a;
}

function createChallengeChannelLink() {
  let a = document.createElement('a');
  let divName = document.createElement('div');
  let img = document.createElement('img');
  let span = document.createElement('span');

  a.href = '#';
  a.setAttribute('data-idx', 'challenges');
  a.setAttribute('data-bs-toggle', "list");
  a.className = "list-group-item list-group-item-action listSong";
  a.onclick = function (e) {
    e.preventDefault(); // Prevenir comportamento padrão do link
    if (typeof openChallengeChannel === 'function') {
      openChallengeChannel();
    }
  };

  let div1 = document.createElement('div');
  div1.className = "d-flex w-100 justify-content-center";

  img.className = "bannerSong";
  img.src = "assets/img/elements/challengeMode.png";
  img.onerror = function () {
    this.src = "";
  };


  div1.append(img);
  a.append(div1);

  return a;
}

function createFavoritesChannelLink() {
  let a = document.createElement('a');
  let div1 = document.createElement('div');
  let img = document.createElement('img');

  a.href = '#';
  a.setAttribute('data-idx', 'favorites');
  a.setAttribute('data-bs-toggle', "list");
  a.className = "list-group-item list-group-item-action listSong";
  a.onclick = function (e) {
    e.preventDefault(); // Prevenir comportamento padrão do link
    if (typeof openFavoritesChannel === 'function') {
      openFavoritesChannel();
    }
  };

  div1.className = "d-flex w-100 justify-content-center";

  img.className = "bannerSong";
  img.src = "assets/img/elements/favoritesMode.png";
  img.alt = "Favorites";
  img.onerror = function () {
    // Se a imagem não existir, criar um banner com emoji de coração
    let canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 100;
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(0, 0, 300, 100);
    ctx.fillStyle = '#FF1493';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ FAVORITES', 150, 70);
    this.src = canvas.toDataURL();
  };

  div1.append(img);
  a.append(div1);

  return a;
}


async function changeOnlineSong(i, preferredChart = null) {
  const entry = songsJson?.children[stageIndex]?.children[i];
  if (!entry || !hasChart(entry)) return;
  const version = ++songLoadVersion;
  songLoadController?.abort();
  const controller = songLoadController = new AbortController();
  localStorage.setItem('last_song', i);
  if (currentChannel !== 'favorites') localStorage.setItem('piu_last_song_key',PiuLibrary.songKey(entry));
  clear('level'); chart_level = null; selsong = null;
  document.getElementById('song-coop-link')?.remove();
  songIndex = i; song = entry;
  const chart = entry.children.find(f => /\.ssc$/i.test(f.name));
  const audio = entry.children.find(f => /\.(mp3|wav|ogg)$/i.test(f.name));
  sscpath = chart?.path || null; mp3path = audio?.path || null;
  imgpath = songBanner(entry); imageMusic = imgpath; imageChannel = '';
  document.querySelectorAll('.btnSelectMusic').forEach(el => el.disabled = true);
  document.getElementById('t').textContent = entry.name;
  document.getElementById('a').textContent = 'Carregando…';
  stopMusicPreview();
  if (actualMusic.hasAttribute('src')) {actualMusic.removeAttribute('src');actualMusic.load();}
  document.querySelectorAll('#online-song .listSong').forEach(el => el.classList.toggle('active', !el.classList.contains('wheel-ghost') && Number(el.dataset.songIndex ?? el.dataset.idx) === i && (el.dataset.stageIndex === undefined || Number(el.dataset.stageIndex) === stageIndex)));
  document.querySelectorAll('#online-song .active img').forEach(img => {
    img.loading = 'eager'; img.fetchPriority = 'high';
  });
  document.dispatchEvent(new CustomEvent('piu:songchange'));
  try {
    // Browse immediately; fetch and parse only after the choice has settled briefly.
    await new Promise(resolve => setTimeout(resolve, 100));
    if (version !== songLoadVersion) return;
    if (!chart) throw new Error('Esta música não possui arquivo SSC.');
    const path = libraryUrl(chart.path);
    let content = chartCache.get(path);
    if (!content) {
      const response = await fetch(path, {signal:controller.signal});
      if (!response.ok) throw new Error('Não foi possível carregar a dificuldade (HTTP ' + response.status + ').');
      content = await response.text(); chartCache.set(path, content);
    }
    if (version !== songLoadVersion) return;
    discoverLevels(path, content);
    chartInfoCache.set(path,Promise.resolve(selsong.levels));
    registerCoop(entry,selsong.levels);
    const coopCharts=selsong.levels.map((level,index)=>({level,index})).filter(item=>item.level.COOP);
    const oldLink=document.getElementById('song-coop-link');oldLink?.remove();
    if(coopCharts.length && !channelChartFilter?.coop){
      const link=document.createElement('button');link.id='song-coop-link';link.type='button';link.className='coop-route';
      link.textContent='CO-OP · '+[...new Set(coopCharts.map(item=>item.level.COOP.count))].join('/')+' jogadores · ABRIR CANAL';
      link.onclick=()=>openCoopSong(entry,coopCharts[0].index);document.getElementById('level').after(link);
    }
    const folder = sscpath.slice(0, sscpath.lastIndexOf('/') + 1);
    if (!mp3path && selsong.meta.MUSIC) mp3path = folder + selsong.meta.MUSIC;
    if (!imgpath && selsong.meta.BANNER) imgpath = folder + selsong.meta.BANNER;
    const compatible = Number(document.querySelector('#level .listStep')?.dataset.idx ?? -1);
    if (compatible < 0 && coopCharts.length && !channelChartFilter?.coop)return openCoopSong(entry,coopCharts[0].index);
    if (compatible < 0) throw new Error(channelChartFilter?.coop?'Nenhum chart CO-OP marcado neste arquivo.':'Nenhuma dificuldade compatível com este modo.');
    change_level(Number.isInteger(preferredChart) && selsong.levels[preferredChart] && PiuLibrary.matchesChart(selsong.levels[preferredChart],channelChartFilter) ? preferredChart : compatible);
    document.querySelectorAll('.btnSelectMusic').forEach(el => el.disabled = false);
    if (mp3path) previewMusic(mp3path);
    document.dispatchEvent(new CustomEvent('piu:songready'));
  } catch(error) {
    if (version !== songLoadVersion) return;
    clear('level'); chart_level = null;
    document.getElementById('a').textContent = error.message;
    console.error('Falha ao selecionar música:', error);
  }
}

function stopMusicPreview() {
  clearTimeout(timer);
  actualMusic.pause();
  actualMusic.currentTime = 0;
}

function previewMusic(path) {
  stopMusicPreview();
  // Catalog loading alone must not start music on the opening or results screens.
  if (containerMobGame.classList.contains('hide') || blockSelectSong.classList.contains('hide') ||
      document.body.classList.contains('results-active')) return;
  fullmp3path = libraryUrl(path);
  $("#musicPreview").attr("src", fullmp3path);

  actualMusic.play().catch(function() {});
  timer = setTimeout(() => {
    actualMusic.pause();
  }, 10000);
}

if (typeof actualMusic !== 'undefined' && actualMusic) {
  actualMusic.addEventListener("ended", () => {
    clearTimeout(timer);
  });
}


function openCoopSong(entry,chart){
  window.PiuChannels?.restoreChannels();
  const index=songsJson.children.findIndex(stage=>stage.channelId==='co-op');
  if(index<0)return;
  const selected=songsJson.children[index].children.findIndex(song=>PiuLibrary.songKey(song)===PiuLibrary.songKey(entry));
  return change_stage(index,selected,{chart});
}

async function change_stage(i, selectedSong = 0, selection = null) {
  const stage = songsJson?.children[i];
  if (!stage || !channelSongCount(i)) return;
  resetSongSelection();
  document.querySelector('.favorite-unavailable')?.remove();
  localStorage.setItem('last_stage', i);
  localStorage.setItem('piu_last_channel_id',stage.channelId || stage.path);
  clear('online-song');
  currentChannel = null; // Resetar canal ao mudar de stage normal
  imageMusic = ''; // Resetar imageMusic para evitar valores antigos
  imageChannel = ''; // Resetar imageChannel para evitar valores antigos
  stageIndex = i;
  document.querySelectorAll('#stage .listSong').forEach(el => el.classList.toggle('active', el.dataset.idx === String(i)));
  channelChartFilter = PiuLibrary.difficulty(stage);
  channelLevelPicker().hidden = true;
  if(stage.channelId==='series-zone'){
    window.PiuChannels.openSeries();return;
  }
  if (channelChartFilter) {
    document.dispatchEvent(new CustomEvent('piu:stagechange'));
    if(selection?.difficultyLevel != null)return selectChannelLevel(selection.difficultyLevel,selection);
    window.PiuChannels.openLevels();
    return;
  }
  if(stage.channelId==='co-op'){
    channelChartFilter={coop:true};
    showEmptyChannel('VERIFICANDO CO-OP','Identificando os participantes dos charts deste canal…');
    const version=songLoadVersion;
    try{
      await ensureCoopIndex();
      if(version!==songLoadVersion)return;
      const paths=await playablePaths(stage.children,channelChartFilter);
      stage.coopPaths=paths;document.dispatchEvent(new CustomEvent('piu:coopchange'));
      if(version!==songLoadVersion)return;
      return renderChannelSongs(stage,selectedSong,paths,selection?.chart);
    }catch(error){
      if(version===songLoadVersion)showEmptyChannel('CO-OP INDISPONÍVEL','Não foi possível verificar os charts. Volte ao canal para tentar novamente.');
      return;
    }
  }
  return renderChannelSongs(stage,selectedSong,null,selection?.chart);
}

function renderChannelSongs(stage, selectedSong = 0, paths = null, selectedChart = null) {
  const gl = document.getElementById('online-song'); gl.replaceChildren();
  const indices = [];

  for (let i = 0; i < stage.children.length; i++) {

    let song = stage.children[i];
    if (!hasChart(song) || (paths && !paths.has(song.path))) continue;
    indices.push(i);

    // Tentar encontrar imagem nos children (qualquer formato de imagem, qualquer nome)
    imageMusic = songBanner(song);

    // Preparar dados da música para sistema de favoritos
    let songData = {
      stageIndex: stageIndex,
      songIndex: i,
      name: song.name,
      banner: imageMusic
    };
    songData.key = PiuLibrary.songKey(song);

    let a = createListGroupLink(i, song.name, 0,
      function () {
        changeOnlineSong(i);
      }, songData);

    gl.append(a);


  }
  if (!indices.length) {
    showEmptyChannel('SEM MÚSICAS DISPONÍVEIS', paths ? 'Não há charts neste modo e nível. Escolha outro nível acima.' : 'Este canal ainda não possui músicas nesta biblioteca.');
  }
  document.dispatchEvent(new CustomEvent('piu:stagechange'));
  const selectedIndex = indices.includes(selectedSong) ? selectedSong : (indices[0] ?? -1);
  if (selectedIndex >= 0) return changeOnlineSong(selectedIndex,selectedChart);
}


function createListGroupLink(idx, title, number, onclick, songData, channelArtwork = null) {
  let a = document.createElement('a');
  let divName = document.createElement('div');
  let img = document.createElement('img');
  let span = document.createElement('span');

  a.href = '#';
  a.setAttribute('data-idx', idx);
  a.title = title;
  if (songData) { a.dataset.songIndex = songData.songIndex; a.dataset.stageIndex = songData.stageIndex; a.dataset.songKey = songData.key; }
  a.setAttribute('data-bs-toggle', "list");
  a.className = "list-group-item list-group-item-action listSong";
  a.onclick = function(e) {
    e.preventDefault(); // Prevenir comportamento padrão do link
    if (typeof onclick === 'function') {
      onclick();
    }
  };

  let div1 = document.createElement('div');
  div1.className = "d-flex w-100 justify-content-center";
  div1.style.position = "relative";

  if (channelArtwork || imageChannel) {
    img.className = "bannerSong";
    img.src = channelArtwork || libraryUrl(imageChannel);
    img.alt = title;
    if (channelArtwork) img.dataset.channelArtwork = 'true';
    div1.append(img);
  } else if (imageMusic) {
    img.className = "bannerSong";
    img.src = libraryUrl(imageMusic);
    img.alt = title; img.loading = 'lazy';
    img.addEventListener('error', function() { this.hidden = true; });
    divName.append(img);

    // Adicionar ícone de coração se for favorito
    if (songData && isFavorite(songData)) {
      let starIcon = document.createElement('span');
      starIcon.className = "favorite-star-icon";
      starIcon.innerHTML = "⭐";
      starIcon.style.position = "absolute";
      starIcon.style.top = "10px";
      starIcon.style.right = "10px";
      starIcon.style.fontSize = "28px";
      starIcon.style.zIndex = "10";
      starIcon.style.textShadow = "#ffc107 0px 0px 4px";
      starIcon.style.pointerEvents = "none";
      div1.append(starIcon);
    }

    if (songData) bindFavoriteGesture(a,songData);
  }

  // span.className = "badge bg-primary rounded-pill";
  // span.style = 'height: 20px;'
  // span.innerHTML = number;

  if (!channelArtwork && !imageMusic && !imageChannel) {
    divName.className = 'text-white';
    divName.textContent = title;
  }
  div1.append(divName);
  if (number !== 0) {
    div1.append(span);
  }
  a.append(div1);
  const caption = document.createElement('span'); caption.className = 'song-card-caption';
  caption.textContent = title.replace(/^\d+\s*-\s*/, ''); a.append(caption);
  return a;
}

function createListGroupLinkSubtitle(idx, title, aside, subtitle, onclick) {

  let a = document.createElement('a');
  a.href = '#';
  a.setAttribute('data-idx', idx);
  a.title = title;
  a.setAttribute('data-bs-toggle', "list");
  a.className = styleStepType(aside);
  a.onclick = function(e) {
    e.preventDefault(); // Prevenir comportamento padrão do link
    if (typeof onclick === 'function') {
      onclick();
    }
  };

  let div1 = document.createElement('div');
  div1.className = "d-flex w-100 justify-content-between";

  let divName = document.createElement('div');
  divName.className = "fw-bold";

  title = title.substring(0, 2);

  if (title < 10) {
    title = Number(title);
    title = '0' + title.toString();
  }

  title = title.replace(/[^0-9]/g, '');
  divName.innerHTML = title;

  let small = document.createElement('small');
  aside = stepType(aside);

  // small.innerHTML = aside;

  // let small2 = document.createElement('small') ;
  // small2.innerHTML = subtitle;

  div1.append(divName);

  div1.append(small);
  a.append(div1);

  // a.append(small2) ;
  return a;
}



function styleStepType(type) {
  switch (type) {
    case 'pump-single':
      return "list-group-item list-group-item-action listStep circle-single difficulty-select";
      break;

    case 'pump-double':
      return "list-group-item list-group-item-action listStep circle-double difficulty-select";
      break;

    case 'pump-halfdouble':
      return "list-group-item list-group-item-action listStep circle-double circle-half difficulty-select";

    default:
      return "list-group-item list-group-item-action listStep circle-default difficulty-select";
      break;
  }
}

function stepType(type) {
  switch (type) {
    case 'pump-single':
      return 'Single';
      break;

    case 'pump-double':
      return 'Double';
      break;

    case 'pump-halfdouble':
      return 'Half Double';

    default:
      return '????';
      break;
  }
}

async function readSongList() {
  const holder = document.getElementById('stage');
  // Capture before offline-ui consumes the result and removes it from sessionStorage.
  let returnSelection=null;
  try {
    const result=JSON.parse(sessionStorage.getItem('piu_single_result') || 'null');
    if(result?.performance && result.config){
      const record=result.config.record || result;
      const meter=Number(record.level);
      returnSelection={channelName:record.channel,ssc:record.ssc,chart:result.config.chartLevel,
        difficultyLevel:meter>=27?'27+':Number.isInteger(meter)&&meter>=1?meter:null,...result.config.selection};
    }
  } catch(_) {}
  if (location.protocol === 'file:') {
    holder.textContent = 'Para carregar as músicas, execute iniciar-local.cmd e use o endereço HTTP aberto por ele. Não abra index.html por duplo clique.';
    return;
  }
  try {
    let json;
    if (['localhost','127.0.0.1','[::1]'].includes(location.hostname) &&
        (new URLSearchParams(location.search).get('library') === 'local' || returnSelection?.library===new URL('/piu-songs/',location.href).href)) {
      const local = new URL('/piu-songs/',location.href).href;
      try {
        const response = await fetch(local + 'songs.json',{cache:'no-store'});
        if (response.ok) { const data = await response.json(); if (data.children?.[0]?.name === 'Songs') {json = data; resources = local;} }
      } catch (_) { /* Local library is optional; keep the published fallback. */ }
    }
    if (!json) {
      resources = publishedLibrary;
      const response = await fetch(resources + 'songs.json',{cache:'no-cache'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      json = await response.json();
    }
    songsJson = json.children[0];
    if(PiuLibrary.seriesChannels(songsJson).length && !songsJson.children.some(stage=>stage.channelId==='series-zone')){
      songsJson.children.push({name:'SERIES ZONE',channelId:'series-zone',virtual:true,children:[]});
    }
    if(!songsJson.children.some(stage=>stage.channelId==='co-op'))songsJson.children.push({name:'CO-OP',channelId:'co-op',virtual:true,children:[]});
    const coopStage=songsJson.children.find(stage=>stage.channelId==='co-op');
    let coopKeys=[];
    try{const saved=JSON.parse(localStorage.getItem('piu_coop_routes'));if(saved?.library===resources && Array.isArray(saved.keys))coopKeys=saved.keys;}catch(_){}
    if(returnSelection?.channelId==='co-op')coopKeys.push(returnSelection.songKey);
    PiuLibrary.entries(songsJson).filter(entry=>coopKeys.includes(entry.key)).forEach(({song})=>{
      if(!coopStage.children.some(entry=>PiuLibrary.songKey(entry)===PiuLibrary.songKey(song)))coopStage.children.push(song);
    });
    await loadCoopIndex();
    const holder = document.getElementById('stage');
    holder.replaceChildren();
    holder.append(createFavoritesChannelLink());
    songsJson.children.forEach(function(stage, index) {
      if(PiuLibrary.isSeries(stage))return;
      imageMusic = ''; imageChannel = stage.banner || '';
      const card = createListGroupLink(index, stage.name, channelSongCount(index), function() { change_stage(index); }, undefined, PiuLibrary.channelArtwork(stage));
      if(stage.channelId==='series-zone')card.dataset.channelGroup='series';
      card.dataset.channelId = stage.channelId || ''; holder.append(card);
    });
    const sameCatalog = localStorage.getItem('piu_catalog_source') === resources;
    if(returnSelection?.library && returnSelection.library!==resources)returnSelection=null;
    const returnStage=returnSelection ? songsJson.children.findIndex(stage=>(returnSelection.channelId && (stage.channelId || stage.path)===returnSelection.channelId) || stage.name===returnSelection.channelName) : -1;
    const savedStage = returnStage>=0 ? returnStage : PiuLibrary.initialStage(songsJson,sameCatalog ? localStorage.getItem('piu_last_channel_id') : null);
    const savedKey = returnSelection?.songKey || (sameCatalog ? localStorage.getItem('piu_last_song_key') : null);
    const savedSong = songsJson.children[savedStage]?.children.findIndex(entry => PiuLibrary.songKey(entry) === savedKey) ?? 0;
    localStorage.setItem('piu_catalog_source', resources);
    const initialStage=songsJson.children[savedStage] ? savedStage : 0;
    if(channelSongCount(initialStage))await change_stage(initialStage,savedSong,returnStage>=0?returnSelection:null);
    else {
      resetSongSelection();stageIndex=null;channelChartFilter=null;
      blockSelectSong.classList.add('hide');btnSelectMusic.classList.add('hide');
      blockSelectChannel.classList.remove('hide');
      document.dispatchEvent(new CustomEvent('piu:stagechange'));
    }
  } catch (error) {
    const address = new URL(resources + 'songs.json', location.href).href;
    console.error('Falha ao carregar a biblioteca:', {address,error});
    holder.textContent = 'Não foi possível carregar a biblioteca. Verifique a conexão e recarregue. Catálogo: ' + address;
  }
}

function keyMapChanged(km, pad, step) {

  km.value = km.value.charAt(0).toUpperCase();

  if (pad === 'l') {
    leftKeyMap[step] = km.value;
    localStorage.setItem("last_lpad", JSON.stringify(leftKeyMap));
  } else {
    rightKeyMap[step] = km.value;
    localStorage.setItem("last_rpad", JSON.stringify(rightKeyMap));
  }



}

function getDancePadCurrentValue(pad, step) {
  if (pad === 'l') {
    return leftKeyMap[step];
  } else {
    return rightKeyMap[step];
  }
}

// Função para forçar recarregamento manual do songs.json
function reloadSongList() {
  console.log('Forçando recarregamento do songs.json...');

  // Limpar a variável global
  songsJson = null;

  // Recarregar a lista
  readSongList(true);

  console.log('songs.json recarregado com sucesso!');

  // Mostrar notificação se disponível
  if (typeof showNotification === 'function') {
    showNotification('Song list reloaded!', 'success');
  }
}

// Expor função globalmente para debug
if (typeof window !== 'undefined') {
  window.reloadSongList = reloadSongList;

  // Adicionar atalho de teclado: Ctrl+Shift+R para recarregar songs.json
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      console.log('[Atalho] Ctrl+Shift+R pressionado - recarregando songs.json');
      reloadSongList();
    }
  });

  console.log('[Utils.js] Atalho registrado: Ctrl+Shift+R para recarregar songs.json');
  console.log('[Utils.js] Função global disponível: window.reloadSongList()');
}
