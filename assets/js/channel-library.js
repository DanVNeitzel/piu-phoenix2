/* Catalogue identities are independent of channel order and virtual copies. */
(function(root) {
  'use strict';
  const normalize = value => String(value || '').trim().toLowerCase();
  const channelArt = {
    "arcade-mix": "Arcade_Mix.png",
    "new-tunes": "New_Tunes.png",
    "k-pop": "K-POP.png",
    "original": "Original.png",
    "world-music": "World_Music.png",
    "full-song": "Full_Song.png",
    "short-cut": "Short_Cut.png",
    "remix": "Remix.png",
    "series-zone": "Series_Zone.png",
    "1st-to-zero": "Series_Zone_1st_to_ZERO.png",
    "nx-to-nxa": "Series_Zone_NX_to_NXA.png",
    "fiesta-to-fiesta2": "Series_Zone_Fiesta_to_fiesta2.png",
    "prime": "Series_Zone_Prime.png",
    "prime2": "Series_Zone_Prime2.png",
    "xx": "Series_Zone_XX.png",
    "phoenix": "Series_Zone_Phoenix.png",
    "phoenix2": "Series_Zone_Phoenix2.png",
    "rise-volume-1": "Rise_Volume_01.png",
    "difficulty-single": "Difficulty_Zone_Single.png",
    "difficulty-double": "Difficulty_Zone_Double.png",
    "difficulty-half-double": "Difficulty_Zone_H_Double.png",
    "ucs": "UCS.png",
    "online-matching": "Online_Matching.png",
    "rise-mix": "Rise_Mix.png",
    "co-op": "CO-OP.png",
    "xross": "Xross.png"
};
  const channelNames = {
    "arcade mix": "arcade-mix",
    "new tunes": "new-tunes",
    "k-pop": "k-pop",
    "original": "original",
    "world music": "world-music",
    "full song": "full-song",
    "short cut": "short-cut",
    "remix": "remix",
    "series zone": "series-zone",
    "08-1st~zero": "1st-to-zero",
    "13-nx~nxa": "nx-to-nxa",
    "16-fiesta~fiesta2": "fiesta-to-fiesta2",
    "17-prime": "prime",
    "18-prime 2": "prime2",
    "19-xx": "xx",
    "21-phoenix": "phoenix",
    "22-phoenix 2": "phoenix2",
    "rise volume 1": "rise-volume-1",
    "difficulty zone single": "difficulty-single",
    "difficulty zone double": "difficulty-double",
    "difficulty zone h. double": "difficulty-half-double",
    "ucs": "ucs",
    "online matching": "online-matching",
    "rise mix": "rise-mix",
    "co-op": "co-op",
    "xross": "xross"
};
  function channelArtwork(stage) {
    const file = channelArt[stage?.channelId] || channelArt[channelNames[normalize(stage?.name)]];
    return file ? 'assets/img/phx2/channels/' + file : null;
  }
  const seriesIds=['1st-to-zero','nx-to-nxa','fiesta-to-fiesta2','prime','prime2','xx','phoenix','phoenix2'];
  const seriesLabels=['1ST~ZERO','NX~NXA','FIESTA~FIESTA2','PRIME','PRIME 2','XX','PHOENIX','PHOENIX 2'];
  function isSeries(stage){return seriesIds.includes(stage?.channelId || channelNames[normalize(stage?.name)]);}
  function seriesChannels(catalog){
    return seriesIds.flatMap((id,i)=>{
      const index=(catalog?.children || []).findIndex(stage=>(stage.channelId || channelNames[normalize(stage.name)])===id);
      return index<0?[]:[{stage:catalog.children[index],index,label:seriesLabels[i]}];
    });
  }
  function songKey(song) {
    const chart = (song.children || []).find(file => /\.ssc$/i.test(file.name));
    return chart ? normalize(chart.name) + '|' + normalize(song.name) : '';
  }
  function entries(catalog) {
    const unique = new Map();
    // Prefer the physical pack when a song also belongs to several filters.
    [...(catalog?.children || [])].sort((a,b) => Number(!!a.virtual) - Number(!!b.virtual)).forEach(stage => {
      const stageIndex = catalog.children.indexOf(stage);
      (stage.children || []).forEach((song,songIndex) => {
        const key = songKey(song);
        if (key && !unique.has(key)) unique.set(key,{song,stageIndex,songIndex,key});
      });
    });
    return [...unique.values()];
  }
  function resolveFavorite(favorite, catalog) {
    const songs = entries(catalog);
    if (favorite.key) return songs.find(entry => entry.key === favorite.key) || null;
    // Legacy numeric positions are unsafe after the catalogue was reorganized.
    const matches = songs.filter(entry => normalize(entry.song.name) === normalize(favorite.name));
    return matches.length === 1 ? matches[0] : null;
  }
  function migrateFavorites(favorites, catalog) {
    const result = new Map();
    (Array.isArray(favorites) ? favorites : []).filter(f => f && typeof f === 'object').forEach(favorite => {
      const resolved = resolveFavorite(favorite,catalog);
      const value = resolved ? {...favorite,key:resolved.key,name:resolved.song.name,
        stageIndex:resolved.stageIndex,songIndex:resolved.songIndex} : {...favorite,unavailable:true};
      if (resolved) delete value.unavailable;
      result.set(value.key || 'legacy:' + normalize(value.name),value);
    });
    return [...result.values()];
  }
  function difficulty(stage) {
    const id = stage?.channelId || '';
    const type = {'difficulty-single':'pump-single','difficulty-double':'pump-double',
      'difficulty-half-double':'pump-halfdouble'}[id];
    return type ? {type,mode:id === 'difficulty-single' ? 'single' : 'double',
      label:id === 'difficulty-single' ? 'SINGLE' : id === 'difficulty-double' ? 'DOUBLE' : 'H. DOUBLE'} : null;
  }
  function matchesChart(chart, filter) {
    const coop=!!chart.COOP || chart.STEPSTYPE==='pump-routine';
    if(filter?.coop)return coop;
    if (!filter) return coop || ['pump-single','pump-double','pump-halfdouble'].includes(chart.STEPSTYPE);
    if(coop)return false;
    const meter = Number(chart.METER);
    return chart.STEPSTYPE === filter.type && (filter.level === '27+' ? meter >= 27 : meter === Number(filter.level));
  }
  function levelArtwork(filter, level, extension = 'png') {
    const mode = {'pump-single':'single','pump-double':'double','pump-halfdouble':'halfdouble'}[filter?.type];
    const prefix = mode === 'halfdouble' ? 'half_double' : mode;
    const suffix = level === '27+' ? 'mais_27' : Number.isInteger(Number(level)) && Number(level) >= 1 && Number(level) <= 26 ? String(Number(level)).padStart(2,'0') : null;
    const format = extension === 'webp' ? 'webp' : 'png';
    return mode && suffix ? 'difficulty-zone/' + mode + '/img/' + prefix + '_lv_' + suffix + '.' + format : null;
  }
  function songCount(stage,catalog) {
    if(stage?.channelId==='series-zone' && catalog){
      return new Set(seriesChannels(catalog).flatMap(({stage})=>(stage.children || []).map(songKey)).filter(Boolean)).size;
    }
    if(stage?.channelId==='co-op' && stage.coopPaths)return stage.coopPaths.size;
    return (stage?.children || []).filter(song => !!songKey(song)).length;
  }
  function initialStage(catalog, savedId) {
    const stages = catalog.children || [];
    const saved = stages.findIndex(stage => (stage.channelId || stage.path) === savedId && songCount(stage,catalog)>0);
    if (saved >= 0) return saved;
    const arcade = stages.findIndex(stage => stage.channelId === 'arcade-mix' && songCount(stage)>0);
    return arcade >= 0 ? arcade : Math.max(0,stages.findIndex(stage => stage.children.some(song => songKey(song))));
  }
  root.PiuLibrary = {channelArtwork,songKey,entries,resolveFavorite,migrateFavorites,difficulty,matchesChart,levelArtwork,initialStage,songCount,isSeries,seriesChannels};
  if (typeof module !== 'undefined') module.exports = root.PiuLibrary;
})(globalThis);
