var docElem = document.documentElement;

console.log('========================================');
console.log('mobile.js INICIANDO...');
console.log('========================================');

var radiosNote = document.querySelectorAll('.note');
var radiosSpeed = document.querySelectorAll('.speed');
var radiosBga = document.querySelectorAll('.bga');
var radiosRush = document.querySelectorAll('.rush');
var blockSelectSong = document.querySelector('.blockSelectSong');
var blockSelectChannel = document.querySelector('.blockSelectChannel');
var btnSelectMusic = document.querySelector('.btnSelectMusic');
var performanceSong = document.querySelector('.performanceSong');
var containerMobTitle = document.querySelector('.container-mob-title');
var containerMobGame = document.querySelector('.container-mob');
var btnModalLogin = document.querySelector('#btnModalLogin');
var btnContinue = document.querySelector('#btnContinue');
var CardLogin = document.querySelector('#CardLogin');
var playerLog = document.querySelector('#playerLog');
var lblPassView = document.querySelector('.lblPassView');
var playerDetails = document.querySelector('#playerDetails');
var playerSettings = document.querySelector('#playerSettings');
var playerHistory = document.querySelector('#playerHistory');
var dancePadMap = document.querySelector('#dancePadMap');
var registerBlock = document.querySelector('#registerBlock');
var bgStatic = document.querySelector('.bg-static');
var bgVideo = document.querySelector('.bg-video');
var playerLogout = document.querySelector('#playerLogout');


var FullScreenOn = document.querySelector('.FullScreenOn');
var FullScreenOff = document.querySelector('.FullScreenOff');

var winDialogOptionBackDrop = document.querySelector('#winDialogOptionBackDrop');

var battleResultShowing = false; // Flag para proteger modal de resultado de batalha
var challengeResultShowing = false; // Flag para proteger modal de resultado de desafio
var clearCacheConfirmPending = false; // Flag para limpeza de cache pendente

var winAlertOption = document.querySelector('#winAlertOption');

var AlertOptionTitle = document.querySelector('#AlertOptionTitle');
var AlertSelectedOpt1 = document.querySelector('.AlertSelectedOpt1');
var AlertSelectedOpt2 = document.querySelector('.AlertSelectedOpt2');

// Interceptar adição de classe 'hide' no winAlertMsg para debug
var winAlertMsg = document.querySelector('#winAlertMsg');
if (winAlertMsg) {
  var originalAdd = winAlertMsg.classList.add.bind(winAlertMsg.classList);
  winAlertMsg.classList.add = function (className) {
    if (className === 'hide') {
      console.log('🚨 TENTATIVA DE OCULTAR winAlertMsg');
      console.trace('Stack trace:');
      if (challengeResultShowing) {
        console.warn('⚠️ Tentando ocultar modal de desafio enquanto challengeResultShowing=true');
      }
    }
    return originalAdd(className);
  };
}

var AlertMsgTitle = document.querySelector('#AlertMsgTitle');

var gradeResult = document.querySelector('#gradeResult');
var plateResult = document.querySelector('#plateResult');

var infoPlay;
var phoenixPlate;
var phoenixGrade;
var defaultGradeCount = 0;
var music_temp = '';
var isMobile = false;
var soundGame = document.getElementById('openingPiuWeb');
var actualMusic = document.getElementById('musicPreview');
// Keep the channel theme independent from one-shot navigation effects.
var channelMusic = new Audio();
channelMusic.loop = true;
channelMusic.preload = 'none';
channelMusic.volume = 1;

var documentTitle = document.title + " - ";

var userActive = false;

var s_temp_score;
var d_temp_score;
var exp_temp_user;
var rank_temp_user;
var account_status;

// Keep the document title static; menu decoration should not wake up every 100ms.


// Simulação de Score Perfeito
// $('.songNoteskin').attr('src', "../../piuweb_phoenix/assets/img/noteskin/PRIME/thumbnail.gif");
// $('.levelGrade').css('background-image', 'url("../../piuweb_phoenix/assets/img/elements/eval_single.png")');
// $('#performanceSong').html(' FAKE ARTIST - FAKE SONG');
// $('#perfect').attr('data-count-to', 9999);
// $('#great').attr('data-count-to', 0);
// $('#good').attr('data-count-to', 0);
// $('#bad').attr('data-count-to', 0);
// $('#miss').attr('data-count-to', 0);
// $('#maxCombo').attr('data-count-to', 9999);
// $('#score').attr('data-count-to', 9999999);
// $('#songLevel').html('99');
// $('#songSpeed').html('X4');
// processGrade('A');
// processPlate({
//   gr: 10,
//   go: 6,
//   b: 0,
//   m: 0,
// });

// processCounterUp();


function selectBGA(el) {
  for (var i = 0, l = radiosBga.length; i < l; i++) {
    var fn = radiosBga[i] == el ? 'add' : 'remove';
    radiosBga[i].classList[fn]('focus');
  }
}

function selectRush(el) {
  for (var i = 0, l = radiosRush.length; i < l; i++) {
    var fn = radiosRush[i] == el ? 'add' : 'remove';
    radiosRush[i].classList[fn]('focus');
  }
}

function selectNote(el) {
  if (!el || !el.matches('.noteskin-option')) return;
  for (var i = 0, l = radiosNote.length; i < l; i++) {
    var fn = radiosNote[i] == el ? 'add' : 'remove';
    radiosNote[i].classList[fn]('focus');
  }
  localStorage.setItem('last_noteskin',el.value);
  window.PiuScroll?.changed();
}

function selectSpeed(el) {
  for (var i = 0, l = radiosSpeed.length; i < l; i++) {
    var fn = radiosSpeed[i] == el ? 'add' : 'remove';
    radiosSpeed[i].classList[fn]('focus');
  }
}

var interfaceBackgroundMode = 'static';
function refreshInterfaceBackground() {
  const videoMode=interfaceBackgroundMode==='video';
  document.body.classList.toggle('interface-video',videoMode);
  bgStatic.classList.toggle('hide',videoMode);
  bgVideo.classList.toggle('hide',!videoMode);
  const canPlay=videoMode && !document.hidden && !containerMobGame.classList.contains('hide') &&
    !document.body.classList.contains('results-active') && !document.body.classList.contains('index-gameplay-suspended');
  if(canPlay){
    const source=bgVideo.querySelector('source');
    if(!source.getAttribute('src')){source.src=source.dataset.src;bgVideo.load();}
    if(bgVideo.paused)bgVideo.play().catch(function(){});
  }else bgVideo.pause();
}
function selectBackground(type) {
  if(!['static','video'].includes(type))return;
  interfaceBackgroundMode=type;
  try { localStorage.setItem('background',type); } catch(e) {}
  refreshInterfaceBackground();
  updateBackgroundButtons();
}

function updateBackgroundButtons() {
  try {
    var isVideoVisible = interfaceBackgroundMode==='video';
    var elsStatic = document.querySelectorAll('.bgStatic');
    var elsVideo = document.querySelectorAll('.bgVideo');
    if (elsStatic.length === 0 || elsVideo.length === 0) return;
    if (isVideoVisible) {
      elsVideo.forEach(function (el) { el.classList.add('focus'); });
      elsStatic.forEach(function (el) { el.classList.remove('focus'); });
    } else {
      elsStatic.forEach(function (el) { el.classList.add('focus'); });
      elsVideo.forEach(function (el) { el.classList.remove('focus'); });
    }
  } catch (e) {
    // ignore
  }
}

function clearCacheAndData() {
  AlertOptionTitle.innerHTML = 'Tem certeza que deseja limpar<br>todos os dados e cache do site?';
  AlertSelectedOpt1.innerHTML = 'Confirmar';
  AlertSelectedOpt2.innerHTML = 'Cancelar';
  clearCacheConfirmPending = true;
  winDialogOptionBackDrop.classList.remove('hide');
  winAlertOption.classList.remove('hide');
}

function executeClearCacheAndData() {
  try {
    // Limpar localStorage
    localStorage.clear();

    // Limpar sessionStorage
    sessionStorage.clear();

    // Limpar cookies
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    // Limpar cache do service worker se existir
    if ('caches' in window) {
      caches.keys().then(function (names) {
        for (let name of names) {
          caches.delete(name);
          console.log('Cache deleted:', name);
        }
      });
    }

    // Desregistrar service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
          registration.unregister();
          console.log('Service Worker unregistered:', registration);
        }
      });
    }

    // Limpar cache do navegador para songs.json especificamente
    if ('caches' in window) {
      caches.open('songs-cache').then(function (cache) {
        cache.delete('/piu-songs/songs.json');
        cache.delete('songs.json');
      });
    }

    // Mostrar mensagem de sucesso
    winAlertOption.classList.add('hide');
    winAlertMsg.classList.remove('hide');
    AlertMsgTitle.innerHTML = '<span style="color: #00ff00; font-size: 1.2em;">CACHE AND DATA CLEARED!</span><br><br>' +
      'The page will reload shortly...';

    // Recarregar a página após 2 segundos
    setTimeout(function () {
      window.location.reload(true);
    }, 2000);
  } catch (e) {
    console.error('Error clearing cache and data:', e);
    winAlertOption.classList.add('hide');
    winAlertMsg.classList.remove('hide');
    AlertMsgTitle.innerHTML = '<span style="color: #ff0000; font-size: 1.2em;">ERROR!</span><br><br>' +
      'Failed to clear data.<br>Please try again.';
    setTimeout(function () {
      resetDialog();
    }, 3000);
  }
}

document.oncontextmenu = document.body.oncontextmenu = function () { return false; }

function loginContinue(startPreview = true) {
  window.PiuOpening?.close();
  containerMobTitle.classList.add('hide');
  containerMobGame.classList.remove('hide');
  soundGame.pause();
  if (startPreview && selsong && mp3path) previewMusic(mp3path);
}

async function nextStage() {
  if(!await PiuResults.fadeOut())return;
  PiuResults.close();
  performanceSong.classList.remove('show');
  blockSelectSong.classList.remove('hide');
  plateResult.classList.add('plate-out');
  gradeResult.classList.add('grade-out');
  resetAudio();
  if (mp3path) previewMusic(mp3path);
}

function selectionBack() {
  if(window.PiuChannels?.back())return;
  if(!blockSelectChannel.classList.contains('hide'))choiceChannel();
  else selectChannel();
}

function selectChannel(main = false) {
  if(!main && channelChartFilter && currentChannel!=='favorites' && !blockSelectSong.classList.contains('hide') && window.PiuChannels){
    window.PiuChannels.openLevels();return;
  }
  window.PiuChannels?.restoreChannels();
  stopMusicPreview();
  resetAudio();
  blockSelectSong.classList.add('hide');
  btnSelectMusic.classList.add('hide');
  blockSelectChannel.classList.remove('hide');
  channelMusic.src = "assets/sounds/PHOENIX_2_CHANNEL_THEME.mp3";
  channelMusic.play().catch(function() {});
  requestAnimationFrame(function(){
    if(blockSelectChannel.classList.contains('hide'))return;
    if(window.PiuChannels){window.PiuChannels.open();return;}
    const card=document.querySelector('#stage .listSong.active') || document.querySelector('#stage .listSong');
    card?.focus({preventScroll:true});
    card?.scrollIntoView({block:'nearest',inline:'center'});
  });
}

function choiceChannel() {
  if (!channelSongCount(currentChannel === 'favorites' ? 'favorites' : stageIndex)) return;
  resetAudio();
  blockSelectSong.classList.remove('hide');
  btnSelectMusic.classList.remove('hide');
  blockSelectChannel.classList.add('hide');
  if (selsong && mp3path) previewMusic(mp3path);
}



// Screenshot system share

function captureAndShare() { return PiuScoreShare.capture(); }


// Sounds Effects
var obj = document.createElement("audio");
var obj2 = document.createElement("audio");
var obj3 = document.createElement("audio");

document.addEventListener('piu:levelchange', function (event) {
  if (!event.detail?.changed) return;
  obj.pause();
  const source = 'assets/sounds/PHOENIX_2_SELECT_LEVEL_MUSIC.mp3';
  if (obj.getAttribute('src') !== source) obj.src = source;
  else obj.currentTime = 0;
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-center").click(function () {
  obj.src = "assets/sounds/PHOENIX_2_TITLE_READY.mp3";
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-confirm").click(function () {
  obj.src = "assets/sounds/PHOENIX_COMMAND_CHANGE.WAV";
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-open-cw").click(function () {
  if (this.getAttribute('data-bs-target') === '#commandWindow') return;
  obj.src = "assets/sounds/EX_SELECT.ogg";
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-close-cw").click(function () {
  obj2.src = "assets/sounds/PHOENIX_2_CW_SELECT.mp3";
  obj2.volume = 1.0;
  obj2.autoPlay = false;
  obj2.preLoad = true;
  obj2.controls = true;
  obj2.play().catch(function() {});
});

$(".sound-select-channel").click(function () {
  obj2.src = "assets/sounds/PHOENIX_2_CW_SELECT.mp3";
  obj2.volume = 1.0;
  obj2.autoPlay = false;
  obj2.preLoad = true;
  obj2.controls = true;
  obj2.play().catch(function() {});
});

$(".sound-move").click(function () {
  changeSongAudio();
});

document.getElementById('stage').addEventListener('click',function(event){
  const card=event.target.closest('.listSong');
  if(!card || card.getAttribute('aria-disabled')==='true')return;
  obj2.pause();
  obj2.src='assets/sounds/PHOENIX_2_PRE_SELECT_MUSIC.mp3';
  obj2.volume=1;
  obj2.play().catch(function(){});
  if(!window.PiuChannels?.isLevelPicker() && !event.target.closest('[data-level]'))choiceChannel();
});

$(".sound-confirm-pumpitup").click(function () {
  obj.src = "assets/sounds/PHOENIX_2_TITLE_Pump_It_Up.mp3";
  obj.volume = 0.5;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-pumpitup").click(function () {
  if (this.getAttribute('data-bs-target') === '#confirmPlayModal') return;
  obj.src = "assets/sounds/PHOENIX_2_PRE_SELECT_MUSIC.mp3";
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-startChannel").click(function () {
  obj.src = "assets/sounds/PHOENIX_2_PRE_SELECT_MUSIC.mp3";
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-hit").click(function () {
  obj.src = "assets/sounds/PHOENIX_2_TITLE_Pump_It_Up.mp3";
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

$(".sound-move-s-c").click(function () {
  obj.src = "assets/sounds/PHOENIX_MUSIC_MOVE.mp3";
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.controls = true;
  obj.play().catch(function() {});
});

function updateInfoPlayer(playerData) {

  const updatePlayerData = {
    total_exp: calculateExp(playerData),

    // PHOENIX GRADE
    grade_sss_plus: verifyGradeSSS_plus(playerData),
    grade_sss: verifyGradeSSS(playerData),

    grade_ss_plus: verifyGradeSS_plus(playerData),
    grade_ss: verifyGradeSS(playerData),

    grade_s_plus: verifyGradeS_plus(playerData),
    grade_s: verifyGradeS(playerData),

    grade_aaa_plus: verifyGradeAAA_plus(playerData),
    grade_aaa: verifyGradeAAA(playerData),

    grade_aa_plus: verifyGradeAA_plus(playerData),
    grade_aa: verifyGradeAA(playerData),

    grade_a_plus: verifyGradeA_plus(playerData),

    // BASIC GRADE
    grade_a: verifyGradeA(playerData),
    grade_b: verifyGradeB(playerData),
    grade_c: verifyGradeC(playerData),
    grade_d: verifyGradeD(playerData),
    grade_f: verifyGradeF(playerData),

    // PHOENIX PLATES
    plate_perfect_game: verifyPlatePG(playerData),
    plate_ultimate_game: verifyPlateUG(playerData),
    plate_extreme_game: verifyPlateEG(playerData),
    plate_superb_game: verifyPlateSG(playerData),
    plate_marvelous_game: verifyPlateMG(playerData),
    plate_talented_game: verifyPlateTG(playerData),
    plate_rough_game: verifyPlateRG(playerData),
    plate_fair_game: verifyPlateFG(playerData),

    s_total_score: verifyScoreSingle(playerData, 'single'),
    d_total_score: verifyScoreDouble(playerData, 'double'),

    songs_count: countSong(playerData),
    account_status: account_status
  }


  function verifyGradeSSS_plus(playerData) {
    if (playerData.grade === 'SSS_plus') {
      return parseInt(document.querySelector('#personal_SSS_plus').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_SSS_plus').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeSSS(playerData) {
    if (playerData.grade === 'SSS') {
      return parseInt(document.querySelector('#personal_SSS').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_SSS').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeSS_plus(playerData) {
    if (playerData.grade === 'SS_plus') {
      return parseInt(document.querySelector('#personal_SS_plus').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_SS_plus').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeSS(playerData) {
    if (playerData.grade === 'SS') {
      return parseInt(document.querySelector('#personal_SS').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_SS').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeS_plus(playerData) {
    if (playerData.grade === 'S_plus') {
      return parseInt(document.querySelector('#personal_S_plus').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_S_plus').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeS(playerData) {
    if (playerData.grade === 'S') {
      return parseInt(document.querySelector('#personal_S').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_S').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeAAA_plus(playerData) {
    if (playerData.grade === 'AAA_plus') {
      return parseInt(document.querySelector('#personal_AAA_plus').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_AAA_plus').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeAAA(playerData) {
    if (playerData.grade === 'AAA') {
      return parseInt(document.querySelector('#personal_AAA').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_AAA').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeAA_plus(playerData) {
    if (playerData.grade === 'AA_plus') {
      return parseInt(document.querySelector('#personal_AA_plus').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_AA_plus').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeAA(playerData) {
    if (playerData.grade === 'AA') {
      return parseInt(document.querySelector('#personal_AA').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_AA').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeA_plus(playerData) {
    if (playerData.grade === 'A_plus') {
      return parseInt(document.querySelector('#personal_A_plus').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_A_plus').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeA(playerData) {
    if (playerData.grade === 'A') {
      return parseInt(document.querySelector('#personal_A').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_A').innerHTML) + defaultGradeCount;
    }
  }


  function verifyGradeB(playerData) {
    if (playerData.grade === 'B') {
      return parseInt(document.querySelector('#personal_B').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_B').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeC(playerData) {
    if (playerData.grade === 'C') {
      return parseInt(document.querySelector('#personal_C').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_C').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeD(playerData) {
    if (playerData.grade === 'D') {
      return parseInt(document.querySelector('#personal_D').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_D').innerHTML) + defaultGradeCount;
    }
  }
  function verifyGradeF(playerData) {
    if (playerData.grade === 'F') {
      return parseInt(document.querySelector('#personal_F').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#personal_F').innerHTML) + defaultGradeCount;
    }
  }

  function verifyPlatePG(playerData) {
    if (playerData.plate === 'PG') {
      return parseInt(document.querySelector('#plate_perfect_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_perfect_game').innerHTML) + defaultGradeCount;
    }
  }
  function verifyPlateUG(playerData) {
    if (playerData.plate === 'UG') {
      return parseInt(document.querySelector('#plate_ultimate_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_ultimate_game').innerHTML) + defaultGradeCount;
    }
  }
  function verifyPlateEG(playerData) {
    if (playerData.plate === 'EG') {
      return parseInt(document.querySelector('#plate_extreme_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_extreme_game').innerHTML) + defaultGradeCount;
    }
  }
  function verifyPlateSG(playerData) {
    if (playerData.plate === 'SG') {
      return parseInt(document.querySelector('#plate_superb_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_superb_game').innerHTML) + defaultGradeCount;
    }
  }
  function verifyPlateMG(playerData) {
    if (playerData.plate === 'MG') {
      return parseInt(document.querySelector('#plate_marvelous_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_marvelous_game').innerHTML) + defaultGradeCount;
    }
  }
  function verifyPlateTG(playerData) {
    if (playerData.plate === 'TG') {
      return parseInt(document.querySelector('#plate_talented_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_talented_game').innerHTML) + defaultGradeCount;
    }
  }
  function verifyPlateRG(playerData) {
    if (playerData.plate === 'RG') {
      return parseInt(document.querySelector('#plate_rough_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_rough_game').innerHTML) + defaultGradeCount;
    }
  }
  function verifyPlateFG(playerData) {
    if (playerData.plate === 'FG') {
      return parseInt(document.querySelector('#plate_fair_game').innerHTML) + 1;
    } else {
      return parseInt(document.querySelector('#plate_fair_game').innerHTML) + defaultGradeCount;
    }
  }





  function verifyScoreSingle(playerData) {
    if (playerData.type === 'SINGLE' && playerData.grade !== 'F') {
      return parseInt(s_temp_score) + parseInt(playerData.score);
    } else {
      return parseInt(s_temp_score) + 0;
    }
  }

  function verifyScoreDouble(playerData) {
    if (playerData.type === 'DOUBLE' && playerData.grade !== 'F') {
      return parseInt(d_temp_score) + parseInt(playerData.score);
    } else {
      return parseInt(d_temp_score) + 0;
    }
  }

  function calculateExp(playerData) {
    if (playerData.score > 0 && playerData.level.length > 0) {
      // Adiciona o total_exp atual do jogador para que ExpConfig possa usar a curva de progressão
      playerData.total_exp = parseInt(exp_temp_user);
      var expGained = ExpConfig(playerData);
      verifyLevelUp(parseInt(exp_temp_user) + expGained);
      return parseInt(exp_temp_user) + expGained;
    }
    if (playerData.score <= 0 || playerData.grade == 'F') {
      return parseInt(exp_temp_user) + 0;
    }
  }

  function countSong(playerData) {
    if (playerData.score > 0) {
      return parseInt(document.querySelector('#songsCount').innerHTML) + 1;
    }
    if (playerData.score <= 0) {
      return parseInt(document.querySelector('#songsCount').innerHTML) + 0;
    }
  }

  playerData.grade = '';
  playerData.plate = '';
  playerData.type = '';
  playerData.score = 0;
  playerData.level = 0;

  return updatePlayerData;

}

/**
 * Sistema de XP melhorado - considera dificuldade, pontuação, grade e plate
 * Agora ajustado à curva de progressão de níveis
 * @param {Object} playerData - Dados do jogador (score, level, grade, plate, type, total_exp)
 * @returns {number} - XP ganho
 */
function ExpConfig(playerData) {
  var score = parseInt(playerData.score);
  var level = parseInt(playerData.level); // Nível da MÚSICA
  var grade = playerData.grade;
  var plate = playerData.plate;
  var type = playerData.type;
  var currentPlayerExp = parseInt(playerData.total_exp) || 0; // XP atual do JOGADOR

  // Se não tiver score ou level válido, retorna 0
  if (!score || score <= 0 || !level || level <= 0) {
    return 0;
  }

  // ============================================
  // 1. OBTER INFORMAÇÕES DO NÍVEL DO JOGADOR
  // ============================================
  var playerLevelInfo = getLevelInfo(currentPlayerExp);
  var currentThreshold = playerLevelInfo.currentExpThreshold || 0;
  var nextThreshold = playerLevelInfo.nextExpThreshold;
  var expNeeded = nextThreshold ? (nextThreshold - currentThreshold) : 500000; // Delta para próximo nível
  
  // Se já está no nível máximo, usa um valor fixo para continuar ganhando XP
  if (!nextThreshold) {
    expNeeded = 500000;
  }

  // ============================================
  // 2. BASE XP - Porcentagem do XP necessário baseado na dificuldade
  // ============================================
  // Quanto maior o nível da música, maior a porcentagem de progresso
  // Nível 1: ~1.5% do progresso necessário com score perfeito
  // Nível 10: ~7% do progresso necessário com score perfeito
  // Nível 20: ~20% do progresso necessário com score perfeito
  // Nível 25+: ~30% do progresso necessário com score perfeito
  var difficultyFactor = Math.pow(level, 1.2) / 150; // Fator de dificuldade exponencial reduzido
  var scoreNormalized = score / 1000000; // Normaliza score (0.0 a 1.0 para score perfeito)
  var progressPercent = difficultyFactor * scoreNormalized; // Porcentagem do progresso
  var baseExp = expNeeded * progressPercent; // XP base = porcentagem do que falta

  // ============================================
  // 2. GRADE BONUS - Quanto melhor o grade, mais XP
  // ============================================
  var gradeBonus = 1.0;
  switch (grade) {
    case 'SSS_plus': gradeBonus = 1.8; break;  // +80% - Quase impossível
    case 'SSS':      gradeBonus = 1.6; break;  // +60%
    case 'SS_plus':  gradeBonus = 1.45; break; // +45%
    case 'SS':       gradeBonus = 1.35; break; // +35%
    case 'S_plus':   gradeBonus = 1.25; break; // +25%
    case 'S':        gradeBonus = 1.15; break; // +15%
    case 'AAA_plus': gradeBonus = 1.12; break; // +12%
    case 'AAA':      gradeBonus = 1.1; break;  // +10%
    case 'AA_plus':  gradeBonus = 1.07; break; // +7%
    case 'AA':       gradeBonus = 1.05; break; // +5%
    case 'A_plus':   gradeBonus = 1.02; break; // +2%
    case 'A':        gradeBonus = 1.0; break;  // sem bônus
    case 'B':        gradeBonus = 0.8; break;  // -20%
    case 'C':        gradeBonus = 0.6; break;  // -40%
    case 'D':        gradeBonus = 0.4; break;  // -60%
    case 'F':        gradeBonus = 0; break;    // sem XP
    default:         gradeBonus = 1.0;
  }

  // ============================================
  // 3. PLATE BONUS - Bônus como porcentagem do XP necessário
  // ============================================
  var plateBonus = 0;
  // Plates concedem uma porcentagem adicional do XP necessário para próximo nível
  // Combinado com o nível da música para escalar adequadamente
  var plateFactor = 0;
  switch (plate) {
    case 'PG': plateFactor = 0.12; break;  // Perfect Game - 12% extra do XP necessário
    case 'UG': plateFactor = 0.09; break;  // Ultimate Game - 9%
    case 'EG': plateFactor = 0.07; break;  // Extreme Game - 7%
    case 'SG': plateFactor = 0.06; break;  // Superb Game - 6%
    case 'MG': plateFactor = 0.05; break;  // Marvelous Game - 5%
    case 'TG': plateFactor = 0.04; break;  // Talented Game - 4%
    case 'RG': plateFactor = 0.02; break;  // Rough Game - 2%
    case 'FG': plateFactor = 0.01; break;  // Fair Game - 1%
    default:   plateFactor = 0;
  }
  // Ajusta o bônus pelo nível da música (músicas mais difíceis = mais bônus)
  plateBonus = Math.floor(expNeeded * plateFactor * (level / 15));


  // ============================================
  // 4. TYPE BONUS - Double é mais difícil
  // ============================================
  var typeBonus = (type === 'DOUBLE') ? 1.2 : 1.0; // +20% para double

  // ============================================
  // 5. ACCURACY BONUS - Baseado na porcentagem do score
  // ============================================
  var scorePercentage = (score / 1000000) * 100; // % de score perfeito
  var accuracyBonus = 1.0;
  
  if (scorePercentage >= 99.9) accuracyBonus = 1.3;      // 99.9%+ = +30%
  else if (scorePercentage >= 99.5) accuracyBonus = 1.2; // 99.5%+ = +20%
  else if (scorePercentage >= 99.0) accuracyBonus = 1.15; // 99%+ = +15%
  else if (scorePercentage >= 98.0) accuracyBonus = 1.08; // 98%+ = +8%
  else if (scorePercentage >= 95.0) accuracyBonus = 1.03; // 95%+ = +3%
  else if (scorePercentage < 70.0) accuracyBonus = 0.75;  // <70% = -25%

  // ============================================
  // 6. CÁLCULO FINAL
  // ============================================
  var totalExp = Math.floor((baseExp * gradeBonus * typeBonus * accuracyBonus) + plateBonus);

  // ============================================
  // 7. LIMITES DINÂMICOS (baseados na curva de progressão)
  // ============================================
  // Mínimo: 0.5% do XP necessário (para evitar valores muito baixos)
  // Máximo: 40% do XP necessário (progressão mais lenta, várias músicas necessárias)
  var minExp = Math.floor(expNeeded * 0.005);
  var maxExp = Math.floor(expNeeded * 0.4);
  
  totalExp = Math.max(minExp, Math.min(totalExp, maxExp));

  return totalExp;
}

function updatePlayerData(data) {
  // Update profile picture, username, nivel.
  document.querySelector('#nameUserLogin').innerHTML = data.username;
  document.querySelector('#nameUserGame').innerHTML = data.username;
  document.querySelector("#profileUserLogin").src = "assets/img/avatar/" + data.avatar + ".png";
  document.querySelector("#profileUserGame").src = "assets/img/avatar/" + data.avatar + ".png";
  // Update Current Level + Exp, Personal Grade and Singel/Double Score and Songs.
  var lvlInfo = getLevelInfo(data.total_exp);
  var remaining2 = lvlInfo.nextExpThreshold ? Math.max(0, lvlInfo.nextExpThreshold - data.total_exp) : 0;
  var nextText2 = lvlInfo.nextExpThreshold ? formatMilhar(lvlInfo.nextExpThreshold) + ' (faltam ' + formatMilhar(remaining2) + ')' : 'Máximo';
  var display = lvlInfo.levelName + ' — ' + formatMilhar(data.total_exp) + ' / ' + nextText2;
  document.querySelector('#levelUserGame').innerHTML = lvlInfo.levelName;
  document.querySelector('#levelUserLogin').innerHTML = lvlInfo.levelName;
  localStorage.setItem('last_playCount', JSON.stringify(data.songs_count));
  // Atualiza barra de experiência e texto
  try {
    var expLine = document.querySelector('.userData .exp-line');
    var expText = document.querySelector('#expText');
    if (expLine) {
      var percent = 100;
      if (lvlInfo.nextExpThreshold !== null) {
        var currentThreshold = lvlInfo.currentExpThreshold || 0;
        var range = lvlInfo.nextExpThreshold - currentThreshold;
        var progress = data.total_exp - currentThreshold;
        percent = range > 0 ? Math.round((progress / range) * 100) : 100;
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
      }
      expLine.style.setProperty('--exp-percent', percent + '%');
    }
    if (expText) {
      if (lvlInfo.nextExpThreshold !== null) {
        expText.innerHTML = 'XP ' + formatMilhar(data.total_exp) + ' / ' + formatMilhar(lvlInfo.nextExpThreshold);
      } else {
        expText.innerHTML = 'XP ' + formatMilhar(data.total_exp) + ' (Máximo)';
      }
    }
  } catch (e) {
    console.error('Erro ao atualizar barra de experiência', e);
  }
}

function verifyLevelUp(new_exp) {
  var modalMensagem = document.getElementById("modalMensagem");
  var piuTitle = document.getElementById("piuTitle");

  if (verifyPlayerLevel(exp_temp_user) !== verifyPlayerLevel(new_exp)) {

    piuTitle.innerHTML = verifyPlayerLevel(new_exp);
    console.log(verifyPlayerLevel(exp_temp_user) + ' -> ' + verifyPlayerLevel(new_exp));

    obj2.src = "assets/sounds/PHOENIX_USBRESULT_LEVELUP.wav";
    obj2.volume = 1.0;
    obj2.autoPlay = false;
    obj2.preLoad = true;
    obj2.play().catch(function() {});

    modalMensagem.classList.remove('hide');
    modalMensagem.style.opacity = 0;
    setTimeout(function () {
      modalMensagem.style.opacity = 1;
    }, 500);
    setTimeout(function () {
      modalMensagem.style.opacity = 0;
    }, 3000);
    setTimeout(() => {
      modalMensagem.classList.add('hide');
    }, 3300);
  }
}

function playGame(status) {
  window.PiuOpening?.unlock();
}

function showLoginScreen() {
  window.PiuOpening?.unlock();
}

window.onload = function () {
  verifyUserAgent();
  // Initialize background from localStorage (default: static)
  try {
    var bg = localStorage.getItem('background');
    if (!bg) bg = 'static';
    selectBackground(bg);
  } catch (e) {
    selectBackground('static');
  }
  // Initialize fullscreen buttons focus
  updateFullscreenButtons();
  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', updateFullscreenButtons);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButtons);
  document.addEventListener('mozfullscreenchange', updateFullscreenButtons);
  document.addEventListener('MSFullscreenChange', updateFullscreenButtons);
  // Update fullscreen buttons when settings modal is fully shown
  $('#settingsMenu').on('shown.bs.modal', function () {
    updateFullscreenButtons();
  });
  // Update background buttons when any modal is shown
  $('.modal').on('shown.bs.modal', function () {
    updateBackgroundButtons();
  });
  // initialize local defaults after everything rendered
  setTimeout(function () { initLocalSettings(); }, 300);
}

function verifyUserAgent() {
  if (matchMedia('(pointer:coarse)').matches || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    isMobile = true;
    // Settings retain the optional keyboard map for phones with a physical keyboard.
  } else {
    isMobile = false;
    // esconder controles de touch em desktop
    hideTouchControlsForDesktop();
  }
}

function hideTouchControlsForDesktop() {
  var touchContainer = document.getElementById('touchControlsContainer');
  if (touchContainer) {
    touchContainer.style.display = 'none';
  }
}

// ========== MARCAÇÃO DE DESAFIOS NO HISTÓRICO ==========

// Função para marcar uma jogada como desafio
function markHistoryAsChallenge(songTitle, score) {
  console.log('markHistoryAsChallenge chamado:', songTitle, score);
  try {
    var challenges = JSON.parse(localStorage.getItem('piu_challenge_plays') || '[]');
    var identifier = songTitle + '_' + score;
    console.log('Identificador criado:', identifier);
    if (challenges.indexOf(identifier) === -1) {
      challenges.push(identifier);
      console.log('Desafio adicionado à lista:', identifier);
      // Manter apenas os últimos 50 desafios
      if (challenges.length > 50) {
        challenges = challenges.slice(-50);
      }
      localStorage.setItem('piu_challenge_plays', JSON.stringify(challenges));
      console.log('Lista de desafios salva no localStorage');
    } else {
      console.log('Desafio já estava na lista');
    }
  } catch (e) {
    console.error('Erro ao marcar desafio:', e);
  }
}

// Função para verificar se uma entrada do histórico é um desafio
function isHistoryChallenge(songTitle, score) {
  try {
    var challenges = JSON.parse(localStorage.getItem('piu_challenge_plays') || '[]');
    var identifier = songTitle + '_' + score;
    return challenges.indexOf(identifier) !== -1;
  } catch (e) {
    return false;
  }
}

// ========================================================

// Histórico local das partidas (guardado em localStorage)
function getHistory() {
  try {
    var raw = localStorage.getItem('piu_history');
    var entries = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries : [];
  } catch (e) {
    console.error('Erro ao ler histórico local:', e);
    return [];
  }
}

function saveHistoryEntry(entry) {
  try {
    var hist = getHistory();
    hist.unshift(entry);
    // limita a 200 entradas
    if (hist.length > 200) hist = hist.slice(0, 200);
    localStorage.setItem('piu_history', JSON.stringify(hist));
  } catch (e) {
    console.warn('Erro ao gravar histórico', e);
  }
}

// Variável global para armazenar o histórico carregado
window.populateHistoryModal = function () { return window.PiuPlayerPanels?.history(); };
window.applyHistoryFilters = function () { return window.PiuPlayerPanels?.history(); };

function initLocalSettings() {
  try {
    if (localStorage.getItem('last_song') === null) localStorage.setItem('last_song', '0');
    if (localStorage.getItem('last_stage') === null) localStorage.setItem('last_stage', '0');
    if (localStorage.getItem('last_level') === null) localStorage.setItem('last_level', '0');
    if (localStorage.getItem('last_noteskin') === null) localStorage.setItem('last_noteskin', 'EXCEED2-OLD');
    if (localStorage.getItem('last_speed') === null) localStorage.setItem('last_speed', '1');
    if (localStorage.getItem('last_bga') === null) localStorage.setItem('last_bga', 'on');
    if (localStorage.getItem('last_playback') === null) localStorage.setItem('last_playback', '1');
    if (localStorage.getItem('inputTouch') === null) localStorage.setItem('inputTouch', isMobile ? 'true' : 'false');
    if (localStorage.getItem('touchpadSize') === null) localStorage.setItem('touchpadSize', isMobile ? '1' : '0');
    // Apply UI based on stored values
    // Noteskin
    var noteskin = localStorage.getItem('last_noteskin');
    if (noteskin) {
      var noteBtns = document.querySelectorAll('.noteskin-option');
      noteBtns.forEach(function (btn) {
        if (btn.value === noteskin) selectNote(btn);
      });
    }
    // Speed
    var speed = localStorage.getItem('last_speed');
    if (speed) {
      var speedBtns = document.querySelectorAll('.speed');
      speedBtns.forEach(function (btn) {
        if (btn.value === speed) selectSpeed(btn);
      });
    }
    // BGA
    var bga = localStorage.getItem('last_bga');
    if (bga) {
      var bgaBtns = document.querySelectorAll('.bga');
      bgaBtns.forEach(function (btn) {
        if (btn.value === bga) selectBGA(btn);
      });
    }
    // Playback (rush)
    var playback = localStorage.getItem('last_playback');
    if (playback) {
      var rushBtns = document.querySelectorAll('.rush');
      rushBtns.forEach(function (btn) {
        if (btn.value === playback) selectRush(btn);
      });
    }
    // touch input checkbox
    var inputTouchVal = localStorage.getItem('inputTouch');
    var touchInputEl = document.getElementById('touchInput');
    if (touchInputEl && inputTouchVal !== null) {
      touchInputEl.checked = (inputTouchVal === 'true');
    }
    // touchpad size
    var touchpadVal = localStorage.getItem('touchpadSize');
    var touchpadEl = document.getElementById('touchpadSize');
    if (touchpadEl && touchpadVal !== null) {
      touchpadEl.value = touchpadVal;
    }
    PiuScroll.changed();
  } catch (e) {
    // localStorage not available or error - ignore
  }
}

function registerNewUser() {
  if (registerBlock.classList.contains('hide')) {
    registerBlock.classList.remove('hide');
  } else {
    registerBlock.classList.add('hide');
  }
}
function resetDialog() {
  // Não resetar se estiver mostrando resultado de batalha ou desafio
  if (battleResultShowing) {
    console.log('resetDialog bloqueado - resultado de batalha ativo');
    return;
  }
  if (challengeResultShowing) {
    console.log('resetDialog bloqueado - resultado de desafio ativo');
    return;
  }

  console.log('resetDialog EXECUTADO - fechando modals');
  console.trace('Stack trace de resetDialog');
  AlertOptionTitle.innerHTML = '';
  AlertMsgTitle.innerHTML = '';
  AlertSelectedOpt1.innerHTML = '';
  AlertSelectedOpt2.innerHTML = '';
  winDialogOptionBackDrop.classList.add('hide');
  winAlertOption.classList.add('hide');
  winAlertMsg.classList.add('hide');
}

function logout() {
  AlertOptionTitle.innerHTML = 'Want to logout the\n current account?';
  AlertSelectedOpt1.innerHTML = 'Confirm';
  AlertSelectedOpt2.innerHTML = 'Cancel';
  winDialogOptionBackDrop.classList.remove('hide');
  winAlertOption.classList.remove('hide');
}

function selectedOpt(opt) {
  switch (opt) {
    case 'Confirmar':
      if (clearCacheConfirmPending) {
        clearCacheConfirmPending = false;
        executeClearCacheAndData();
      } else {
        // Ocultar botão Create Battle antes de recarregar (logout)
        var btnCreateBattle = document.querySelector('.btnCreateBattle');
        if (btnCreateBattle) {
          btnCreateBattle.style.display = 'none';
        }
        location.reload();
      }
      break;
    case 'Sair':
      // Confirma saída do app
      exitConfirmPending = false;
      // Volta para a página anterior ou fecha o app
      history.back();
      break;
    case 'Cancelar':
      clearCacheConfirmPending = false;
      exitConfirmPending = false;
      resetDialog();
      break;
  }
}

function updateFullscreenButtons() {
  var isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  try {
    var elsOn = document.querySelectorAll('.FullScreenOn');
    var elsOff = document.querySelectorAll('.FullScreenOff');
    if (elsOn.length === 0 || elsOff.length === 0) return;

    if (isFullscreen) {
      elsOn.forEach(function (el) { el.classList.add('focus'); });
      elsOff.forEach(function (el) { el.classList.remove('focus'); });
      localStorage.setItem("fullscreen", "true");
    } else {
      elsOff.forEach(function (el) { el.classList.add('focus'); });
      elsOn.forEach(function (el) { el.classList.remove('focus'); });
      localStorage.setItem("fullscreen", "false");
    }
  } catch (e) {
    // silently ignore errors in focus update
  }
}

function activedFullScreen(opt) {
  localStorage.setItem("fullscreen", opt ? "true" : "false");
  Fullscreen();
  // after requesting fullscreen, ensure buttons reflect actual state
  setTimeout(function () { updateFullscreenButtons(); }, 300);
}

function showPass() {
  let input = document.querySelector('#pwd');
  if (input.type === "password") {
    input.type = "text"
  } else {
    input.type = "password"
  }
}

function Fullscreen() {
  if (localStorage.getItem("fullscreen") === "false") {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  } else {
    if (localStorage.getItem("fullscreen") === "true" || localStorage.getItem("fullscreen") === null) {
      if ((document.fullScreenElement && document.fullScreenElement !== null) || (!document.mozFullScreen && !document.webkitIsFullScreen)) {
        if (document.documentElement.requestFullScreen) {
          document.documentElement.requestFullScreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullScreen) {
          document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
      }
    }
  }
}

document.getElementById('arrowSongLeft').addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('online-song').scrollBy({
    left: -257, // Valor do scroll para a esquerda
    behavior: 'smooth' // Movimento suave
  });
  changeSongAudio();
});

// Função para rolar a página para a direita
document.getElementById('arrowSongRight').addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('online-song').scrollBy({
    left: 257, // Valor do scroll para a direita
    behavior: 'smooth' // Movimento suave
  });
  changeSongAudio();
});

var activeBattle = null;
var activeChallenge = null;

function openFavoritesChannel() {
  if (!channelSongCount('favorites')) return;
  resetSongSelection();
  channelChartFilter = null;
  channelLevelPicker().hidden = true;
  blockSelectChannel.classList.add('hide');
  blockSelectSong.classList.remove('hide');
  btnSelectMusic.classList.remove('hide');

  currentChannel = 'favorites';

  // Limpar seleção de canais e músicas
  clear('online-song');
  clear('level');
  imageMusic = ''; // Resetar imageMusic
  imageChannel = ''; // Resetar imageChannel

  // Carregar músicas favoritas
  loadFavorites();
  document.dispatchEvent(new CustomEvent('piu:stagechange'));
}

function closeFavoritesChannel() {
  currentChannel = null;
  // Voltar para seleção normal
  var lastStage = PiuLibrary.initialStage(songsJson,localStorage.getItem('piu_last_channel_id'));
  if (typeof change_stage === 'function') {
    change_stage(lastStage);
  }
}

function loadFavorites() {
  var holder = document.getElementById('online-song');
  holder.innerHTML = '';
  document.querySelector('.favorite-unavailable')?.remove();

  try {
    var favorites = getFavorites();

    if (favorites.length === 0) {
      showEmptyChannel('SEUS FAVORITOS', 'Pressione e segure uma música para adicioná-la aos favoritos.');
      return;
    }

    console.log('Carregando', favorites.length, 'música(s) favorita(s)');

    // Verificar se songsJson está disponível
    if (typeof songsJson === 'undefined' || !songsJson || !songsJson.children) {
      holder.innerHTML = '<p class="text-center text-white">Error: Song data not loaded. Please go back and try again.</p>';
      return;
    }

    // Renderizar cada música favorita
    favorites.forEach(function (fav, idx) {
      try {
        var resolved = PiuLibrary.resolveFavorite(fav,songsJson);
        if (!resolved) {
          console.warn('Música favorita não encontrada:', fav);
          return;
        }

        fav = {...fav,stageIndex:resolved.stageIndex,songIndex:resolved.songIndex,key:resolved.key};
        var song = resolved.song;
        var banner = songBanner(song);

        // Criar elemento de link da música
        var a = document.createElement('a');
        a.href = '#';
        a.setAttribute('data-idx', idx);
        a.dataset.songIndex = fav.songIndex; a.dataset.stageIndex = fav.stageIndex; a.dataset.songKey = fav.key;
        a.setAttribute('data-bs-toggle', 'list');
        a.className = 'list-group-item list-group-item-action listSong';
        a.onclick = function (e) {
          e.preventDefault(); // Prevenir comportamento padrão do link
          // Carregar níveis diretamente no canal de favoritos sem mudar de canal
          stageIndex = fav.stageIndex;
          songIndex = fav.songIndex;

          if (typeof changeOnlineSong === 'function') {
            changeOnlineSong(fav.songIndex);
            // Manter no canal de favoritos
            currentChannel = 'favorites';
          }
        };

        var div1 = document.createElement('div');
        div1.className = 'd-flex justify-content-center';
        div1.style.position = 'relative';

        var img = document.createElement('img');
        img.className = 'bannerSong';
        img.src = banner ? libraryUrl(banner) : '';
        img.alt = song.name || 'Song';

        // Adicionar ícone de coração
        var starIcon = document.createElement('span');
        starIcon.className = 'favorite-star-icon';
        starIcon.innerHTML = '⭐';
        starIcon.style.position = 'absolute';
        starIcon.style.top = '10px';
        starIcon.style.right = '10px';
        starIcon.style.fontSize = '28px';
        starIcon.style.zIndex = '10';
        starIcon.style.textShadow = '#ffc107 0px 0px 4px';
        starIcon.style.pointerEvents = 'none';

        div1.appendChild(img);
        div1.appendChild(starIcon);
        a.appendChild(div1);

        bindFavoriteGesture(a,fav);

        holder.appendChild(a);
      } catch (err) {
        console.error('Erro ao renderizar música favorita:', err, fav);
      }
    });

    if (holder.children.length === 0) {
      showEmptyChannel('FAVORITOS INDISPONÍVEIS', 'As músicas salvas não estão nesta biblioteca. Seus favoritos foram preservados.');
    } else {
      const first = holder.querySelector('.listSong');
      stageIndex = Number(first.dataset.stageIndex);
      changeOnlineSong(Number(first.dataset.songIndex));
      if (holder.querySelectorAll('.listSong').length < favorites.length) {
        const notice = document.createElement('p'); notice.className = 'favorite-unavailable'; notice.setAttribute('role','status');
        notice.textContent = (favorites.length - holder.querySelectorAll('.listSong').length) + ' favorito(s) indisponível(is), preservado(s).'; holder.after(notice);
      }
    }

  } catch (e) {
    console.error('Erro ao carregar favoritos:', e);
    holder.innerHTML = '<p class="text-center text-white">Error loading favorites: ' + e.message + '</p>';
  }
}

function showNotification(message, type) {
  // Criar notificação toast simples
  var toast = document.createElement('div');
  toast.className = 'favorite-toast';
  toast.style.position = 'fixed';
  toast.style.width = '420px';
  toast.style.top = '50%';
  toast.style.left = '50%';
  toast.style.transform = 'translate(-50%, -50%)';
  toast.style.backgroundColor = type === 'success' ? '#198754' : '#c91526';
  toast.style.color = type === 'success' ? '#ffffff' : '#ffffff';
  toast.style.padding = '18px 20px';
  toast.style.borderRadius = '30px';
  toast.style.fontWeight = 'bold';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = 'rgb(255 255 255) 0px 0px 20px 0px';
  toast.style.border = '2px solid #ffffff';
  toast.style.fontSize = '13px';
  toast.style.textAlign = 'center';
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(function () {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
    setTimeout(function () {
      document.body.removeChild(toast);
    }, 500);
  }, 2000);
}
// === FIM CANAL DE FAVORITOS ===

function formatScore(score) {
  if (!score) return '0';

  // Converte para string e remove espaços
  var scoreStr = String(score).trim();

  // Remove pontos se existirem (caso já esteja formatado)
  scoreStr = scoreStr.replace(/\./g, '');

  // Converte para número
  var scoreNum = parseInt(scoreStr, 10);

  // Se não for um número válido, retorna 0
  if (isNaN(scoreNum)) return '0';

  // Se o score for menor que 1.000.000, remove o zero à esquerda
  // Exemplo: 0850000 vira 850000
  if (scoreNum < 1000000 && scoreStr.length === 7 && scoreStr.charAt(0) === '0') {
    scoreStr = scoreStr.substring(1);
  }

  // Retorna sem formatação de pontos
  return scoreStr;
}

function getGradeImage(grade) { return PiuResults.gradeImage(grade, /^x/i.test(grade)); }

function getPlateImage(plate) {
  if (!plate) return null;
  var plateMap = {
    'UG': '1_ug.png',
    'PG': '2_pg.png',
    'EG': '3_eg.png',
    'SG': '4_sg.png',
    'MG': '5_mg.png',
    'TG': '6_tg.png',
    'FG': '7_fg.png',
    'RG': '8_rg.png'
  };
  var filename = plateMap[plate] || plateMap[plate.toUpperCase()] || null;
  return filename ? 'assets/img/phx2/plates/' + filename : null;
}

document.getElementById('arrowChannelLeft').addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('stage').scrollBy({
    left: -225, // Value to scroll to the left
    behavior: 'smooth' // Smooth movement
  });
  changeSongAudio();
});

// Function to scroll the page to the right
document.getElementById('arrowChannelRight').addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('stage').scrollBy({
    left: 225, // Value to scroll to the right
    behavior: 'smooth' // Smooth movement
  });
  changeSongAudio();
});

function changeSongAudio() {
  obj.pause();
  const source="assets/sounds/PHOENIX_MUSIC_MOVE.mp3";
  if(obj.getAttribute('src')!==source)obj.src=source;
  else obj.currentTime=0;
  obj.volume = 1.0;
  obj.autoPlay = false;
  obj.preLoad = true;
  obj.play().catch(function() {});
}

function danceGradeSong() { PiuResults.playTheme(); }

function resetAudio() {
  window.PiuResults?.stopTheme();
  soundGame.pause();
  obj.pause();
  channelMusic.pause();
  channelMusic.currentTime = 0;
}

var item = document.getElementById("online-song");
var item2 = document.getElementById("stage");

window.addEventListener("wheel", function (e) {
  if (document.querySelector('dialog[open],.modal.show') || document.body.classList.contains('results-active')) return;
  if (!e.target.closest('#online-song,#stage')) return;
  if (e.deltaY > 0) {
    item.scrollLeft += 150;
  } else {
    item.scrollLeft -= 150;
  }
  if (e.deltaY > 0) {
    item2.scrollLeft += 150;
  } else {
    item2.scrollLeft -= 150;
  }
});


function confirmPlay() { return PiuPrestart.populate(); }

function fetchRecords() { return PiuPrestart.refreshRecords(); }

function executePlayexecutePlay() {
  try {
    // Chamar a fun\u00e7\u00e3o play() original que inicia o jogo
    if (typeof play === 'function') {
      PiuPrestart.start();
    } else {
      console.error('Fun\u00e7\u00e3o play() n\u00e3o encontrada');
    }
  } catch (e) {
    console.error('Erro ao executar play:', e);
  }
}



// ==========================================
// INTERCEPTAR BOTÃO VOLTAR DO CELULAR
// ==========================================
var exitConfirmPending = false;

// Adicionar uma entrada inicial no histórico quando a página carregar
window.addEventListener('load', function () {
  history.pushState({ page: 'app' }, '', '');
});

// Interceptar o evento popstate (botão voltar)
window.addEventListener('popstate', function (event) {
  if (window.PiuPrestart?.isOpen()) {
    PiuPrestart.close();history.pushState({page:'app'},'', '');return;
  }
  // Se já estamos mostrando a confirmação de saída, não fazer nada
  if (exitConfirmPending) {
    return;
  }

  // Adicionar novamente ao histórico para não sair imediatamente
  history.pushState({ page: 'app' }, '', '');

  // Mostrar mensagem de confirmação para sair do app
  AlertOptionTitle.innerHTML = 'Deseja sair do aplicativo?';
  AlertSelectedOpt1.innerHTML = 'Sair';
  AlertSelectedOpt2.innerHTML = 'Cancelar';
  exitConfirmPending = true;
  winDialogOptionBackDrop.classList.remove('hide');
  winAlertOption.classList.remove('hide');
});
