"""Capture the real app with Final Audition 2 from a sibling piu-songs library.

Requires Playwright Chromium. Playback is advanced deterministically through the
real chart in AUTOPLAY; screenshots never write player records or play history.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'docs/images'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            pass


def main():
    if not (ROOT.parent / 'piu-songs/songs.json').exists():
        raise SystemExit('Expected ../piu-songs/songs.json and the actual song media.')
    TARGET.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT.parent)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            context = browser.new_context(viewport={'width': 1280, 'height': 800}, reduced_motion='reduce')
            page = context.new_page()
            page.set_default_timeout(30000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            def shot(name):
                page.evaluate('document.fonts.ready')
                page.wait_for_timeout(300)
                page.screenshot(path=str(TARGET / name), type='jpeg', quality=90)
                print('Captured', name, flush=True)

            page.goto(base + 'index.html?library=local')
            page.wait_for_function("typeof songsJson!=='undefined' && songsJson?.children.length")
            page.wait_for_timeout(800)
            shot('tela-inicial.jpg')
            page.locator('#arcade-insert').click()
            page.evaluate('loginContinue(false)')
            page.evaluate("""async()=>{
                const i=songsJson.children.findIndex(s=>s.children?.some(song=>song.name==='01 Final Audition 2'));
                if(i<0)throw new Error('Final Audition 2 is missing');
                const j=songsJson.children[i].children.findIndex(song=>song.name==='01 Final Audition 2');
                await change_stage(i,j);choiceChannel();
                const chart=selsong.levels.findIndex(l=>l.STEPSTYPE==='pump-single'&&Number(l.METER)>=10&&!l.COOP);
                change_level(chart>=0?chart:0);
                PiuGameSettings.apply({...PiuGameSettings.read(),skin:'PHOENIX2',speed:3,autoplay:true,bga:'dark',touch:false});
                stopMusicPreview();
            }""")
            page.wait_for_function('selsong?.levels.length && chart_level!==null')
            shot('selecao-musica.jpg')
            page.evaluate("bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmPlayModal')).show()")
            page.wait_for_timeout(400)
            shot('selecao-nivel.jpg')
            page.evaluate('PiuPrestart.close()')
            page.wait_for_timeout(300)
            page.set_viewport_size({'width': 844, 'height': 390})
            page.evaluate("PiuMobileCommand.open('autoplay')")
            shot('command-window.jpg')
            page.evaluate('PiuMobileCommand.close()')
            config = page.evaluate('createSingleConfig()')
            print('Chart:', config['record'], flush=True)

            def stage(touch):
                config['useTouchInput'] = touch
                page.evaluate("config=>sessionStorage.setItem('piu_touch_preview_config',JSON.stringify(config))", config)
                page.goto(base + 'localStage.html?preview=touchpad')
                page.wait_for_function("typeof engine!=='undefined'&&engine?.stage?._playerStages[0]?.stepQueue")
                page.wait_for_function("engine.stage._playerStages[0].padReceptors['0']._receptor.material.uniforms.textureReceptor.value.image?.complete")
                page.evaluate("""()=>{
                    document.getElementById('touch-editor').close();
                    window.captureTime=-.5;engine.song.getCurrentAudioTime=()=>captureTime;
                    window.advanceCapture=(end)=>{
                        while(captureTime<end){captureTime+=1/60;
                            for(const o of engine._updateList)o.update(1/60);
                            TWEEN.update(performance.now());
                        }
                        engine.renderer.render(engine.scene,engine.camera);
                        return {...engine.stage._playerStages[0].judgment.stats};
                    };
                    advanceCapture(32);updateAutoplayLabel();
                    // Freeze a readable frame after the real judgments, outside
                    // the instantaneous receptor flash. Keep the actual combo.
                    TWEEN.removeAll();
                    const stage=engine.stage._playerStages[0];
                    for(const receptor of Object.values(stage.padReceptors)){
                        for(const kind of ['dl','ul','c','ur','dr']){
                            for(const effect of ['Bounce','Tap','WhiteTap','FX']){
                                receptor[kind+effect].object.material.opacity=0;
                            }
                        }
                    }
                    stage.judgment._judgment.animate('p',stage.judgment.comboCount);
                    TWEEN.update(performance.now()+100);
                    engine.renderer.render(engine.scene,engine.camera);
                }""")

            page.set_viewport_size({'width': 1280, 'height': 800})
            stage(False)
            shot('jogando.jpg')
            performance = page.evaluate("""()=>{
                const q=engine.stage._playerStages[0].stepQueue;
                const end=Math.max(...Object.values(q._stepDict).map(s=>s.endTimeStamp||s.timeStamp||0))+2;
                return advanceCapture(end);
            }""")
            print('Autoplay performance:', performance, flush=True)
            page.set_viewport_size({'width': 844, 'height': 390})
            stage(True)
            shot('jogando-mobile.jpg')
            page.goto(base + 'index.html?library=local')
            page.wait_for_function("typeof PiuResults!=='undefined'&&typeof songsJson!=='undefined'&&songsJson?.children.length")
            for width, height, name in [(1280, 800, 'score.jpg'), (844, 390, 'score-mobile.jpg')]:
                page.set_viewport_size({'width': width, 'height': height})
                page.evaluate("""({config,performance})=>{
                    PiuOpening.close();loginContinue(false);
                    PiuResults.show({...config.record,config,performance,score:LocalRecords.score(performance),autoplay:true,previousBest:null,newRecord:false});
                    PiuResults.finishCount();
                }""", {'config': config, 'performance': performance})
                page.wait_for_function("document.getElementById('performance').classList.contains('awards-ready')")
                shot(name)
            if errors:
                raise RuntimeError(errors)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
