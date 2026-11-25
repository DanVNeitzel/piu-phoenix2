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

$.ajaxSetup({
    async: false
});
let engine = null
let audioBuf = null
let chart_level = null
let speed = null
let bga = null
let songsJson = null
let stageIndex = null
let songIndex = null
let mp3path = null
let sscpath = null
let selsong = null
let song = null
let imgpath = null

// document.addEventListener('wheel', (e) => {
//     console.log(e.deltaX,e.deltaY,e.deltaZ,e.deltaMode,e.detail) ;
//     // engine.tunePlayBackSpeed( 1.0 + speed/100.0 ) ;
// }, false);

let leftKeyMap = {
    dl: 'Z',
    ul: 'Q',
    c: 'S',
    ur: 'E',
    dr: 'C'
}

let rightKeyMap = {
    dl: 'V',
    ul: 'R',
    c: 'G',
    ur: 'Y',
    dr: 'N'
}

$(window).on('pagehide', function () {
    if (engine != null) {
        engine.song.closeBuff();
    }

});

function createSingleConfig(settings = null) {
    if (!selsong || !selsong.levels[chart_level] || !mp3path) {
        showNotification('Selecione uma música com áudio e uma dificuldade.', 'error'); return null;
    }
    const level = selsong.levels[chart_level];
    const scroll = PiuScroll.resolve(selsong, chart_level, document.querySelector('.rush-option.focus').value);
    const config = {
        speed: scroll.speed, scrollMode:scroll.mode, autoVelocity:scroll.target, referenceBpm:scroll.referenceBpm,
        bga: document.querySelector('.bga-option.focus').value,
        vanish: PiuGameSettings.read().vanish,
        fd: PiuGameSettings.read().fd,
        hj: PiuGameSettings.read().hj,
        randomNote: PiuGameSettings.read().randomNote,
        playback: Number(document.querySelector('.rush-option.focus').value),
        offset: Number(document.getElementById('offset').value),
        noteskin: PiuGameSettings.read().skin,
        touchpadSize: 1.2 - Number(document.getElementById('touchpadSize').value) / 10,
        useTouchInput: document.getElementById('touchInput').checked,
        resources:'', sscpath:libraryUrl(sscpath), mp3path:libraryUrl(mp3path), resourcePath: 'piured-engine/',
        sscContent: chartCache.get(libraryUrl(sscpath)),
        leftKeyMap, rightKeyMap, chartLevel: chart_level,
        coop:level.COOP, coopBindings:level.COOP ? PiuCoop.bindings() : null,
        selection: {library:resources, channelId:songsJson.children[stageIndex].channelId || songsJson.children[stageIndex].path,
            channelName:songsJson.children[stageIndex].name, songKey:PiuLibrary.songKey(song),
            difficultyLevel:channelChartFilter?.level ?? null, chart:chart_level},
        record: { ssc:sscpath, chart:chart_level, title:selsong.meta.TITLE,
            artist:selsong.meta.ARTIST || '', type:level.STEPSTYPE, level:String(level.METER), coop:level.COOP,
            channel:songsJson.children[stageIndex].name, stage_index:stageIndex, song_index:songIndex,
            banner_path:imgpath ? libraryUrl(imgpath) : '',
            background_path:libraryUrl(song.children.find(f => /(?:_B|background)\.(png|jpe?g|webp)$/i.test(f.name))?.path || imgpath || songBanner(song)) }
    };
    if (settings) {
        Object.assign(config, {scrollMode:settings.mode,autoVelocity:settings.av,noteskin:settings.skin,
            bga:settings.bga,vanish:settings.vanish === true,fd:settings.fd === true,hj:settings.hj === true,randomNote:settings.randomNote === true,playback:settings.rush,offset:settings.offset,
            touchpadSize:1.2-Number(settings.size)/10,touchLayout:settings.touchLayout});
        config.speed = settings.mode === 'auto' ? settings.av / (config.referenceBpm || 120) : settings.speed;
    }
    config.touchLayout = PiuTouchLayout.read(level.STEPSTYPE);
    config.record.playback = config.playback;
    config.noteskin = PiuGameSettings.resolveNoteskin({skin:config.noteskin,randomNote:config.randomNote});
    if(level.COOP){config.noteskin=PiuCoop.noteskin;config.randomNote=false;}
    return config;
}

function play() {
    const config = createSingleConfig();
    if (!config) return false;
    try {
        // Check availability before starting a song.
        localStorage.setItem('last_bga', config.bga);
        sessionStorage.setItem('piu_single_config', JSON.stringify(config));
    } catch(error) { showNotification('Não foi possível acessar o armazenamento local.', 'error'); return false; }
    stopMusicPreview(); resetAudio();
    location.href = 'localStage.html';
    return true;
}

function receiveOfflineResult(result) {
    if (!result.performance || !result.config) return;
    loginContinue(false); hideElements();
    infoPlay = PiuResults.show(result);
    getInfoPlayer();
}

function selStyleType(type) {
    let imgPathElements = 'assets/img/elements/';
    if (type == 'pump-single') {
        $('.levelGrade').css('background-image', 'url(' + imgPathElements + 'eval_single.png)');
    } else {
        $('.levelGrade').css('background-image', 'url(' + imgPathElements + 'eval_double.png)');
    }
    switch (type) {
        case 'pump-single':
            return 'Single';
            break;

        case 'pump-double':
            return 'Double';
            break;

        default:
            return '????';
            break;
    }
}

function rushStatus(rush) {
    switch (rush) {
        case '0.8':
            $('#songRush').html('RUSH<br>80%');
            break;

        case '0.9':
            $('#songRush').html('RUSH<br>90%');
            break;

        case '1':
            $('#songRush').html('RUSH<br>100%');
            break;

        case '1.1':
            $('#songRush').html('RUSH<br>110%');
            break;

        case '1.2':
            $('#songRush').html('RUSH<br>120%');
            break;

        case '1.3':
            $('#songRush').html('RUSH<br>130%');
            break;

        case '1.4':
            $('#songRush').html('RUSH<br>140%');
            break;

        case '1.5':
            $('#songRush').html('RUSH<br>150%');
            break;

        default:
            $('#songRush').html('---');
            break;
    }
}

function bgaStatus(bga) {
    switch (bga) {
        case 'on':
            $('#bgaStatus').html('ON');
            break;

        case 'off':
            $('#bgaStatus').html('OFF');
            break;

        case 'dark':
            $('#bgaStatus').html('DARK');
            break;

        default:
            $('#bgaStatus').html('---');
            break;
    }
}

function calculatePhoenixScore(perf) { return LocalRecords.score(perf); }

function insertDGStats(perf) {
    $('#perfect').html(perf.p);
    $('#great').html(perf.gr);
    $('#good').html(perf.go);
    $('#bad').html(perf.b);
    $('#miss').html(perf.m);
    $('#maxCombo').html(perf.maxCombo);
    $('#score').html(calculatePhoenixScore(perf));
    $('#perfect').attr('data-count-to', perf.p);
    $('#great').attr('data-count-to', perf.gr);
    $('#good').attr('data-count-to', perf.go);
    $('#bad').attr('data-count-to', perf.b);
    $('#miss').attr('data-count-to', perf.m);
    $('#maxCombo').attr('data-count-to', perf.maxCombo);
    $('#score').attr('data-count-to', calculatePhoenixScore(perf));
}

function resetDG() {
    $('.counter-up').html('');
    $('.counter-up').removeAttr('data-count-to');
}

function processCounterUp() {
    danceGradeSong();
    const tempo_intervalo = 10; //ms -> define a velocidade da animação
    const tempo = 2000; //ms -> define o tempo total da animaçao

    $('.counter-up').each(function () {
        let count_to = $(this).removeData("countTo");
        count_to = parseInt($(this).data('countTo'));
        let intervalos = tempo / tempo_intervalo; //quantos passos de animação tem
        let incremento = count_to / intervalos; //quanto cada contador deve aumentar
        let valor = 0;
        let el = $(this);

        let timer = setInterval(function () {
            if (valor >= count_to) { //se já contou tudo tem de parar o timer
                valor = count_to;
                clearInterval(timer);
            }

            let texto = valor.toFixed(0).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1");
            el.text(texto);
            valor += incremento;
        }, tempo_intervalo);
    });
}

function hideElements() {
    $('.blockSelectSong').addClass('hide');
    $('.blockCommands').addClass('hide');
    $('.blockAllChannel').addClass('hide');
}

$(".rush-option").click(function () {
    localStorage.setItem("last_playback", $(this).val());
});

$(".bga-option").click(function () {
    localStorage.setItem("last_bga", $(this).val());
});

$(".speed-option").click(function () {
    PiuScroll.setMultiplier($(this).val());
});

$(".noteskin-option").click(function () {
    localStorage.setItem("last_noteskin", $(this).val());
});

$("#noteskin").on("change", function () {
    localStorage.setItem("last_noteskin", $(this).val());
});

$("#touchpadSize").on("change", function () {
    localStorage.setItem("touchpadSize", $(this).val());
});

$("#speed").on("change", function () {
    PiuScroll.setMultiplier($(this).val());
});

$("#offset").on("change", function () {
    localStorage.setItem("last_offset", $(this).val());
});

$("#touchInput").on("change", function () {
    localStorage.setItem("inputTouch", this.checked ? "true" : "false")
});



/* Load dynamic values and set thise defaults */

document.addEventListener('DOMContentLoaded', function() { selectionReady = readSongList(); });

/* Set default selection for static values: Noteskin, Speed and Offset */

let inputTouch = localStorage.getItem("inputTouch") !== null ? JSON.parse(localStorage.getItem("inputTouch")) : false;
$("#touchInput").prop('checked', inputTouch);

let default_noteskin = localStorage.getItem("last_noteskin") !== null ? localStorage.getItem("last_noteskin") : "EXCEED2-OLD";
$("#noteskin").val(default_noteskin);

let default_speed = localStorage.getItem("last_speed") !== null ? parseFloat(localStorage.getItem("last_speed")) : 3;
$("#speed").val(default_speed);

let touchpadSize = localStorage.getItem("touchpadSize") !== null ? parseFloat(localStorage.getItem("touchpadSize")) : 2;
$("#touchpadSize").val(touchpadSize);

let default_offset = localStorage.getItem("last_offset") !== null ? parseFloat(localStorage.getItem("last_offset")) : "0.0";
$("#offset").val(default_offset);

let default_playback = localStorage.getItem("last_playback") !== null ? parseFloat(localStorage.getItem("last_playback")) : "1.0";
$("#playback").val(default_playback);


if (JSON.parse(localStorage.getItem("last_lpad")) !== null) {
    leftKeyMap = JSON.parse(localStorage.getItem("last_lpad"));
}

if (JSON.parse(localStorage.getItem("last_rpad")) !== null) {
    rightKeyMap = JSON.parse(localStorage.getItem("last_rpad"));
}

function updateMappings() {
    $('#ldlmap').val(leftKeyMap['dl']);
    $('#lulmap').val(leftKeyMap['ul']);
    $('#lcmap').val(leftKeyMap['c']);
    $('#lurmap').val(leftKeyMap['ur']);
    $('#ldrmap').val(leftKeyMap['dr']);

    $('#rdlmap').val(rightKeyMap['dl']);
    $('#rulmap').val(rightKeyMap['ul']);
    $('#rcmap').val(rightKeyMap['c']);
    $('#rurmap').val(rightKeyMap['ur']);
    $('#rdrmap').val(rightKeyMap['dr']);
}

function processPhoenixGrade(points, broken = false) {
    const grade = LocalRecords.grade(points);
    phoenixGrade = grade.replace(/\+/g, '_plus');
    PiuResults.rank(document.getElementById('gradeResult'), grade, broken);
}
function processPlate(perf) {
    phoenixPlate = LocalRecords.plate(perf);
    PiuResults.plate(document.getElementById('plateResult'), phoenixPlate);
}

updateMappings();
