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

'use strict';
let engine = null;
let fpsCounter = null;
let config = null;
let finished = false;
let gameplayProtected = false;
const touchPreview = new URLSearchParams(location.search).get('preview') === 'touchpad';
function protectGameplay() {return gameplayProtected && !touchPreview && !finished;}
window.addEventListener('keydown', event => {
    const refresh = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
    if (protectGameplay() && refresh) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}, true);
window.addEventListener('beforeunload', event => {
    if (!protectGameplay()) return;
    event.preventDefault();
    event.returnValue = '';
});
function revealGameScreen(){
    requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.remove('stage-loading')));
}
function showStageLoadError(message){
    fpsCounter?.stop();
    gameplayProtected = false;
    document.documentElement.classList.remove('stage-loading');
    gameStatus.textContent=message;
}
if(touchPreview)document.documentElement.classList.remove('stage-loading');
let previewDisposed = false;
function disposePreview() {if (touchPreview && engine && !previewDisposed) {previewDisposed = true;engine.freeEngineResources();}}
function previewMessage(value) {if (touchPreview && window.parent !== window) window.parent.postMessage({type:'piu-touch-preview',...value},location.origin);}
const gameStatus = document.getElementById('game-status');
const pauseDialog = document.getElementById('game-pause');
const abandonDialog = document.getElementById('game-abandon-confirm');
const resumeButton = document.getElementById('game-resume');
let pausePending = Promise.resolve(), resuming = false, startWhenReady = null, pendingClear = null, completeStage = null;
function clearGameInput() {
    const inputs = new Set([...(engine?._onKeyDownList || []), ...(engine?._onTouchDownList || [])]);
    for (const input of inputs) {
        for (const pad of input.pads || []) for (const kind of ['dl','ul','c','ur','dr']) {
            pad[kind + 'KeyPressed'] = false; pad[kind + 'KeyHold'] = false;
        }
        input.touchEvents?.fill(null);
        input.clearTouches?.();
    }
}
function pauseGame() {
    if (finished || pauseDialog.open) return;
    if (engine) engine.paused = true;
    fpsCounter?.reset();
    clearGameInput();
    document.getElementById('game-pause-error').hidden = true;
    resumeButton.disabled = true; pauseDialog.showModal();
    const context = engine?.song?.context;
    pausePending = context?.state === 'running' ? context.suspend() : Promise.resolve();
    pausePending = pausePending.catch(error => {
        const message = document.getElementById('game-pause-error');
        message.textContent = 'Não foi possível pausar o áudio: ' + error.message; message.hidden = false;
    }).finally(() => { if (pauseDialog.open) {resumeButton.disabled = false; resumeButton.focus();} });
}
async function resumeGame() {
    if (finished || !pauseDialog.open || resuming) return;
    resuming = true; resumeButton.disabled = true;
    try {
        await pausePending;
        const context = engine?.song?.context;
        if (context && context.state !== 'closed') await context.resume();
        if (finished) return;
        clearGameInput(); fpsCounter?.reset(); if (engine) engine.paused = false;
        pauseDialog.close(); document.getElementById('game-pause-button').focus();
        if (pendingClear) {const result = pendingClear; pendingClear = null; completeStage(result);}
        else if (startWhenReady) await startWhenReady();
    } catch(error) {
        if (engine) engine.paused = true;
        const message = document.getElementById('game-pause-error');
        message.textContent = 'Não foi possível continuar: ' + error.message; message.hidden = false;
    } finally {resuming = false; resumeButton.disabled = false;}
}
function leaveGame() {
    if (finished) return;
    finished = true; clearGameInput();
    fpsCounter?.stop();
    if (touchPreview) {disposePreview();previewMessage({closed:true,saved:false});return;}
    if (engine) engine.paused = true;
    const context = engine?.song?.context;
    if (context && context.state !== 'closed') context.close().catch(()=>{});
    try {sessionStorage.removeItem('piu_single_config'); sessionStorage.removeItem('piu_single_result');} catch(_) {}
    location.replace('index.html#selection');
}
document.getElementById('exit')?.addEventListener('click', pauseGame);
document.getElementById('game-pause-button').addEventListener('click', pauseGame);
resumeButton.addEventListener('click', resumeGame);
function cancelAbandon() {abandonDialog.close();document.getElementById('game-abandon').focus();}
document.getElementById('game-abandon').addEventListener('click', () => {
    if (!finished && !abandonDialog.open) {abandonDialog.showModal();document.getElementById('game-abandon-cancel').focus();}
});
document.getElementById('game-abandon-cancel').addEventListener('click', cancelAbandon);
document.getElementById('game-abandon-confirm-button').addEventListener('click', () => {
    document.getElementById('game-abandon-confirm-button').disabled = true;
    leaveGame();
});
abandonDialog.addEventListener('cancel', event => {event.preventDefault();cancelAbandon();});
pauseDialog.addEventListener('cancel', event => {event.preventDefault(); resumeGame();});
window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!event.repeat) {
            if (abandonDialog.open) cancelAbandon();
            else if (window.PiuTouchEditor?.isOpen()) PiuTouchEditor.cancel();
            else pauseDialog.open ? resumeGame() : pauseGame();
        }
    } else if (pauseDialog.open) event.stopImmediatePropagation();
}, true);
window.addEventListener('pagehide', () => {
    fpsCounter?.stop();
    disposePreview();
    if (engine?.song?.context && engine.song.context.state !== 'closed') engine.song.context.close();
});
try {
    config = window.config || JSON.parse(sessionStorage.getItem(touchPreview ? 'piu_touch_preview_config' : 'piu_single_config') || 'null');
    if (touchPreview) {
        document.body.classList.add('touch-preview');
        THREE.DefaultLoadingManager.onLoad = () => {PiuTouchEditor.refresh();previewMessage({ready:true});};
    }
    if (!config?.record || !config.sscpath || !config.mp3path) {
        location.replace('index.html');
    } else {
        gameplayProtected = true;
        PiuActiveModifiers.render(document.querySelector('.options-block-r'),config,{tag:'p'});
        window.PIU_SSC = {path:config.resources + config.sscpath, text:config.sscContent};
        engine = new Engine({transparentBackground:config.bga === 'dark'});
        fpsCounter = PiuGameplayFPS.mount(engine,touchPreview);
        const stageConfig = new StageConfig(config.resources + config.sscpath, config.resources + config.mp3path, config.playback,
            config.offset, config.resourcePath, [config.noteskin], () => {
                const start = async () => {
                    if (finished) return;
                    if (engine.paused) {startWhenReady = start; return;}
                    await engine.song.context.resume();
                    if (finished) return;
                    if (engine.paused) {startWhenReady = start; await engine.song.context.suspend(); return;}
                    startWhenReady = null;
                    engine.startPlayBack(new Date(Date.now() + 1500));
                    revealGameScreen();
                    gameStatus.textContent = '';
                    document.getElementById('start-game')?.remove();
                };
                if (engine.paused) {startWhenReady = start; return;}
                if (engine.song.context.state === 'running') {
                    start().catch(error => showStageLoadError(error.message)); return;
                }
                const button = document.createElement('button');
                button.id = 'start-game'; button.textContent = 'Iniciar partida';
                button.style.cssText = 'position:fixed;z-index:20;top:45%;left:50%;transform:translateX(-50%);padding:20px;font:20px system-ui';
                button.addEventListener('click', () => {
                    button.disabled = true;
                    start().catch(error => { showStageLoadError(error.message); button.disabled = false; });
                });
                document.body.append(button);
                gameStatus.textContent = 'Tudo pronto. Toque em Iniciar partida.';
                revealGameScreen();
            });
        engine.configureStage(stageConfig);
        engine.song.onLoadError = error => {
            showStageLoadError('Áudio indisponível. ' + (error?.message || 'Não foi possível carregar o arquivo da biblioteca.'));
            const retry = document.createElement('button');
            retry.type = 'button'; retry.textContent = 'Tentar novamente';
            retry.addEventListener('click', () => location.reload());
            const back = document.createElement('button');
            back.type = 'button'; back.textContent = 'Escolher outra música';
            back.addEventListener('click', leaveGame);
            gameStatus.append(document.createElement('br'), retry, ' ', back);
        };
        const style = engine.queryStageType(config.chartLevel);
        let input;
        PiuControlMode.render(document.getElementById('playControlMode'),!!config.useTouchInput);
        if (config.useTouchInput) {
            const single = style === 'pump-single';
            const half = style === 'pump-halfdouble';
            input = new TouchInputConfig((single ? 0.8 : half ? 0.65 : 0.55) * config.touchpadSize, 0, single ? -9 : half ? -10.5 : -12);
            engine.setCameraPosition(0, single ? -6 : half ? -7 : -8, single ? 17 : half ? 19 : 22);
            document.addEventListener('touchstart', event => {
                if (!engine.paused && !event.target.closest('button,dialog')) onTouchDown(event);
            }, {passive:false});
            document.addEventListener('touchend', event => {
                if (!engine.paused && !event.target.closest('button,dialog')) onTouchUp(event);
            }, {passive:false});
            document.addEventListener('touchcancel', event => {if (!engine.paused) onTouchUp(event);}, {passive:false});
        } else {
            input = new KeyInputConfig(config.leftKeyMap, config.rightKeyMap);
            window.addEventListener('keydown', event => {if (!engine.paused) onKeyDown(event);});
            window.addEventListener('keyup', event => {if (!engine.paused) onKeyUp(event);});
        }
        const playerConfig = new PlayerConfig(input, config.noteskin, config.chartLevel, config.speed, config.useTouchInput ? 0.15 : 0.25);
        playerConfig.vanish = config.vanish === true;
        playerConfig.fd = config.fd === true;
        playerConfig.hardJudgment = config.hj === true;
        engine.addPlayer(playerConfig);
        if (config.bga === 'dark') {
            // The dark layer sits behind the WebGL notes, so it never dims the arrows.
            if (engine.stage._bg) engine.stage._bg.object.visible = false;
            const banner = config.record.banner_path || config.record.background_path;
            if (banner) {
                const canvas = engine.renderer.domElement;
                canvas.style.backgroundImage = 'linear-gradient(rgba(0,0,0,.75),rgba(0,0,0,.75)),url(' + JSON.stringify(banner) + ')';
                canvas.style.backgroundSize = 'cover';
                canvas.style.backgroundPosition = 'center';
                canvas.style.backgroundRepeat = 'no-repeat';
            }
        }
        engine.addToDOM('container');
        const touchControls = config.useTouchInput ? engine.stage._playerStages[0].keyListener : null;
        touchControls?.configureResponsive(config.touchpadSize, touchPreview ? PiuTouchLayout.normalize(config.touchLayout) : PiuTouchLayout.read(style));
        if (touchControls) config.touchLayout = touchControls.layoutPreferences;
        function updateTouchLayout() {
            if (finished || !touchControls) return;
            touchControls.updateResponsiveLayout();
            PiuGameplayLayout.apply(engine);
            touchControls.updateResponsiveLayout();
        }
        window.addEventListener('resize', () => {
            engine.onWindowResize();
            updateTouchLayout();
        });
        engine.onStageCleared = completeStage = performances => {
            if (finished) return;
            if (engine.paused) {pendingClear = performances; return;}
            finished = true;
            fpsCounter?.stop();
            const perf = performances[0], outcome = LocalRecords.evaluate(perf), points = outcome.score;
            const result = {...config.record, ...outcome, date:new Date().toISOString(), performance:{...perf}, config,
                previousBest:null, newRecord:false};
            try {
                result.previousBest = LocalRecords.best(config.record);
                result.newRecord = result.passed && (!result.previousBest || points > result.previousBest.score);
                LocalRecords.merge([{...config.record, score:points, combo:perf.maxCombo,
                    plate:result.plate, grade:result.grade, date:result.date, broken:result.broken, passed:result.passed,
                    performance:{p:perf.p,gr:perf.gr,go:perf.go,b:perf.b,m:perf.m,maxCombo:perf.maxCombo,broken:result.broken}}]);
                const history = JSON.parse(localStorage.getItem('piu_history') || '[]');
                history.unshift({...config.record, score:points, grade:result.grade.replace(/\+/g, '_plus'),
                    plate:result.plate, broken:result.broken, passed:result.passed, date:result.date, step_type:result.type, song_level:result.level,
                    song_speed:config.scrollMode === 'auto' ? 'AV ' + config.autoVelocity : config.speed + 'X', ssc_path:result.ssc, max_combo:perf.maxCombo,
                    perfects:perf.p, greats:perf.gr, goods:perf.go, bads:perf.b, misses:perf.m});
                localStorage.setItem('piu_history', JSON.stringify(history.slice(0,200)));
                localStorage.setItem('last_playCount', String((Number(localStorage.getItem('last_playCount')) || 0) + 1));
            } catch (error) { result.error = 'Não foi possível salvar os dados locais: ' + error.message; }
            sessionStorage.removeItem('piu_single_config');
            try {
                sessionStorage.setItem('piu_single_result', JSON.stringify(result));
                location.replace('index.html');
            } catch(error) {
                gameStatus.textContent = result.score + ' pontos · ' + result.grade + (result.error || ' · Recorde salvo.');
            }
        };
        gameStatus.textContent = 'Carregando áudio…';
        if (touchPreview) {engine.performReady();engine.paused=true;}
        else engine.start();
        updateTouchLayout();
        if (touchControls) PiuTouchEditor.init({
            engine, input:touchControls, config, layout:updateTouchLayout,preview:touchPreview,
            pause:async()=>{if(!touchPreview){pauseGame();await pausePending;}},
            hidePause:()=>{if(pauseDialog.open)pauseDialog.close();},
            back:(layout,saved)=>{
                if(touchPreview){finished=true;disposePreview();previewMessage({closed:true,saved,layout});}
                else pauseGame();
            },
            canEdit:()=>!finished&&!pendingClear
        });
        if (touchPreview) {gameStatus.textContent='';PiuTouchEditor.open();}
    }
} catch (error) { showStageLoadError('Não foi possível iniciar a partida: ' + error.message);previewMessage({error:gameStatus.textContent}); }
