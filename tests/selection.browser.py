"""Run with: python tests/selection.browser.py (requires Playwright Chromium)."""
import io
import json
import re
import time
import unittest
import wave
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
TRACKS = 12


def track(index):
    folder = f'Songs/Test{index}'
    return {'name': f'Test {index}', 'path': folder, 'children': [
        {'name': f'Test{index}.ssc', 'path': f'{folder}/Test{index}.ssc', 'type': 'file'},
        {'name': f'Test{index}.wav', 'path': f'{folder}/Test{index}.wav', 'type': 'file'},
        {'name': 'Title.PNG', 'path': f'{folder}/Title.PNG', 'type': 'file'}
    ]}


def catalog(empty=False):
    return {'children': [{'name': 'Songs', 'children': [
        {'name': 'Arcade Mix', 'channelId': 'arcade-mix', 'children': [] if empty else [track(i) for i in range(TRACKS)]},
        {'name': 'Empty', 'channelId': 'empty', 'children': []},
        {'name': 'No charts', 'channelId': 'no-charts', 'children': [{'name': 'Artwork only', 'children': [{'name': 'Title.PNG'}]}]},
        {'name': 'Difficulty Zone Single', 'channelId': 'difficulty-single', 'children': []}
    ]}]}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            pass

    def send(self, data, content_type):
        if isinstance(data, str):
            data = data.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/piu-songs/songs.json':
            data=catalog(self.server.empty)
            if self.server.difficulty_style:
                mode={'pump-single':'single','pump-double':'double','pump-halfdouble':'half-double'}[self.server.difficulty_style]
                data['children'][0]['children'][3]={'name':'Difficulty Zone '+mode,'channelId':'difficulty-'+mode,'children':[track(i) for i in range(4)]}
            self.send(json.dumps(data), 'application/json')
        elif path.startswith('/piu-songs/difficulty-zone/') and path.endswith('.json'):
            self.server.index_requests.append(path)
            time.sleep(self.server.index_delay)
            if self.server.index_error:
                self.send_error(self.server.index_error)
                return
            wanted='27-plus' if self.server.meter>=27 else str(self.server.meter)
            entries=[{'songPath':track(i)['path']} for i in range(4)] if path.endswith('/'+wanted+'.json') else []
            self.send(json.dumps(entries), 'application/json')
        elif path.endswith('.ssc'):
            index = int(re.search(r'Test(\d+)\.ssc', path).group(1))
            self.server.charts.append(index)
            time.sleep(self.server.delay)
            chart=f'''#NOTEDATA:;\n#STEPSTYPE:{self.server.difficulty_style or 'pump-single'};
              #DESCRIPTION:Test;\n#DIFFICULTY:Easy;\n#METER:{self.server.meter};\n#CREDIT:Test;
              #NOTES:\n00000\n00000\n00100\n00000\n;'''
            self.send(f'''#TITLE:Test {index};\n#ARTIST:PIUWeb;\n#MUSIC:Test{index}.wav;
              #BANNER:Title.PNG;\n#BACKGROUND:Title.PNG;\n#BPMS:0=120;\n#OFFSET:0;
              '''+chart+(chart if self.server.difficulty_style else ''), 'text/plain')
        elif path.startswith('/piu-songs/') and path.endswith('.PNG'):
            self.send((ROOT / 'favicon.png').read_bytes(), 'image/png')
        elif path.endswith('.wav'):
            self.send(self.server.audio, 'audio/wav')
        else:
            super().do_GET()


class SelectionHTTPServer(ThreadingHTTPServer):
    request_queue_size = 128


class SelectionBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = SelectionHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
        audio = io.BytesIO()
        with wave.open(audio, 'wb') as sound:
            sound.setnchannels(1)
            sound.setsampwidth(2)
            sound.setframerate(8000)
            sound.writeframes(b'\0\0' * 8000 * 20)
        cls.server.audio = audio.getvalue()
        Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.server.empty = False
        self.server.delay = 0
        self.server.charts = []
        self.server.difficulty_style = None
        self.server.meter = 8
        self.server.index_requests = []
        self.server.index_delay = 0
        self.server.index_error = 0
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 800})
        self.context.route('https://**/*', lambda route: route.abort())
        self.page = self.context.new_page()
        self.page.set_default_timeout(6000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()

    def load(self):
        self.page.goto(self.origin + '/index.html?library=local')
        self.page.wait_for_function("typeof songsJson!=='undefined' && songsJson?.children.length")
        if not self.server.empty:
            self.page.wait_for_function("selsong?.levels.length && chart_level!==null")
        self.page.locator('#arcade-insert').click()
        self.page.evaluate('loginContinue(false)')

    def aligned(self):
        self.page.wait_for_function("""()=>{
          const wheel=document.querySelector('#online-song');
          const selected=wheel.querySelector('.listSong.active:not(.wheel-ghost)');
          if(!selected || wheel.classList.contains('song-wheel-moving'))return false;
          const a=wheel.getBoundingClientRect(),b=selected.getBoundingClientRect();
          return Math.abs((a.left+a.width/2)-(b.left+b.width/2))<2;
        }""")
        self.assertEqual(self.page.locator('#online-song .listSong.active').count(), 1)
        self.assertEqual(self.page.locator('#online-song .wheel-ghost.active').count(), 0)

    def open_frozen_stage(self, style, touch, modifiers=None):
        self.load()
        self.page.evaluate("""({style,touch,modifiers})=>{
          const config=createSingleConfig();
          const width=style==='pump-halfdouble'?6:style==='pump-double'?10:5;
          const rows=Array.from({length:width},(_,i)=>'0'.repeat(i)+'1'+'0'.repeat(width-i-1)).join('\\n');
          config.sscContent='#TITLE:Test;\\n#ARTIST:PIUWeb;\\n#MUSIC:Test0.wav;\\n#BPMS:0=120;\\n#OFFSET:0;\\n'+
            '#NOTEDATA:;\\n#STEPSTYPE:'+style+';\\n#METER:8;\\n#DESCRIPTION:Test;\\n#DIFFICULTY:Easy;\\n#NOTES:\\n'+rows+'\\n;';
          config.chartLevel=0;config.record.type=style;config.useTouchInput=touch;config.touchLayout=PiuTouchLayout.read(style);
          Object.assign(config,modifiers || {});
          sessionStorage.setItem('piu_touch_preview_config',JSON.stringify(config));
        }""", {'style':style,'touch':touch,'modifiers':modifiers})
        self.page.goto(self.origin+'/localStage.html?preview=touchpad')
        self.page.wait_for_function("typeof engine!=='undefined' && engine?.stage?._playerStages[0]?.padReceptors['0']")

    def test_half_double_receptors_notes_and_keyboard(self):
        self.open_frozen_stage('pump-halfdouble',False)
        actual=self.page.evaluate("""()=>{
          const stage=engine.stage._playerStages[0],input=stage.keyListener;
          const maps=config.leftKeyMap,right=config.rightKeyMap;
          for(const key of [...Object.values(maps),...Object.values(right)])input.onKeyDown({key:key.toUpperCase()});
          const pressed=input.getPressed().map(([kind,pad])=>pad+':'+kind).sort();
          const notes=stage._steps.stepList.map(step=>({pad:step.padId,kind:step.kind,x:stage._steps.padSteps[step.padId].position.x+step.object.position.x}));
          for(const key of [...Object.values(maps),...Object.values(right)])input.onKeyUp({key:key.toUpperCase()});
          const held=input.pads.flatMap(pad=>['dl','ul','c','ur','dr'].filter(kind=>pad[kind+'KeyHold']));
          return {pressed,notes,held,outerFX:stage.padReceptors['0'].dlTap.object.visible,
            rightFX:stage.padReceptors['1'].drTap.object.visible,
            cropped:stage.padReceptors['0']._receptor.geometry!==stage.padReceptors['1']._receptor.geometry};
        }""")
        expected=['0:c','0:dr','0:ur','1:c','1:dl','1:ul']
        self.assertEqual(actual['pressed'],expected)
        self.assertEqual([note['pad']+':'+note['kind'] for note in actual['notes']],['0:c','0:ur','0:dr','1:dl','1:ul','1:c'])
        for actual_x,expected_x in zip([note['x'] for note in actual['notes']],[-1.96,-1.18,-.4,.4,1.18,1.96]):
            self.assertAlmostEqual(actual_x,expected_x,places=6)
        self.assertEqual(actual['held'],[])
        self.assertFalse(actual['outerFX'])
        self.assertFalse(actual['rightFX'])
        self.assertTrue(actual['cropped'])
        self.assertFalse(self.errors)

    def test_double_99_coop_notes_and_orphan_hold_ends(self):
        ssc='''#TITLE:Double 99;\n#ARTIST:PIUWeb;\n#MUSIC:Test0.wav;\n#BPMS:0=120;\n#OFFSET:0;
          #NOTEDATA:;\n#STEPSTYPE:pump-double;\n#METER:99;\n#DESCRIPTION:CO-OP;\n#DIFFICULTY:Edit;
          #NOTES:\nXYZ0000000\nxyz0000000\n3330000000\n00000123XY\n0000003000\n0000003000\n;'''
        self.open_frozen_stage('pump-double',False,{'sscContent':ssc})
        actual=self.page.evaluate("""()=>{
          const stage=engine.stage._playerStages[0],steps=stage._steps;
          const holds=steps.stepList.filter(step=>step instanceof StepHold);
          const other=sscParser.parse(config.sscContent.replace('XYZ0000000','XYZM000000')).levels[0];
          return {level:engine.song.getLevelDifficulty(0),taps:steps.stepList.filter(step=>step instanceof StepNote).length,
            holds:holds.length,complete:holds.every(hold=>hold._holdExtensible && Number.isFinite(hold.endTimeStamp)),
            ignored:steps.ignoredHoldEnds,rightEnd:holds.find(hold=>hold.padId==='1' && hold.kind==='ul').endTimeStamp,
            special:[...engine.song.levels[0].SPECIALNOTES],otherSpecial:[...other.SPECIALNOTES]};
        }""")
        self.assertEqual(actual['level'],99)
        self.assertEqual(actual['taps'],6)
        self.assertEqual(actual['holds'],4)
        self.assertTrue(actual['complete'])
        self.assertEqual(actual['ignored'],2)
        self.assertAlmostEqual(actual['rightEnd'],4/3,places=6)
        self.assertEqual(actual['special'],[])
        self.assertEqual(actual['otherSpecial'],['M'])
        self.assertFalse(self.errors)

    def test_coop_colored_notes_holds_and_shared_keyboard(self):
        ssc='''#TITLE:CO-OP;\n#MUSIC:Test0.wav;\n#BPMS:0=120;\n#OFFSET:0;
          #NOTEDATA:;\n#STEPSTYPE:pump-double;\n#METER:18;\n#DESCRIPTION:Team;\n#DIFFICULTY:Edit;
          #NOTES:\nXY00000000\nxy00000000\n3300000000\n;'''
        self.open_frozen_stage('pump-double',False,{'sscContent':ssc})
        actual=self.page.evaluate("""()=>{
          const stage=engine.stage._playerStages[0],input=stage.keyListener,maps=PiuCoop.bindings();
          input.onKeyDown({code:maps[0][0]});input.onKeyDown({code:maps[1][0]});
          input.onKeyUp({code:maps[0][0]});const stillHeld=input.isHeld('dl','0');
          input.onKeyUp({code:maps[1][0]});const released=!input.isHeld('dl','0');
          return {coop:config.coop,stillHeld,released,
            taps:stage._steps.stepList.filter(step=>step instanceof StepNote).map(step=>[step.player,step.object.material.color.getHexString()]),
            holds:stage._steps.stepList.filter(step=>step instanceof StepHold).map(step=>[step.stepNote.player,step._holdExtensible.object.material.color.getHexString()])};
        }""")
        self.assertEqual(actual['coop']['players'],[1,2])
        self.assertTrue(actual['stillHeld'])
        self.assertTrue(actual['released'])
        self.assertEqual(actual['taps'],[[1,'ff527d'],[2,'51cfff']])
        self.assertEqual(actual['holds'],actual['taps'])
        expect(self.page.locator('#game-coop>span')).to_have_text(['P1','P2'])
        self.assertFalse(self.errors)

    def test_coop_routes_selection_controls_result_and_return(self):
        ssc='''#TITLE:Mixed;\n#ARTIST:PIUWeb;\n#MUSIC:Test0.wav;\n#BPMS:0=120;\n#OFFSET:0;
          #NOTEDATA:;\n#STEPSTYPE:pump-double;\n#METER:99;\n#DESCRIPTION:Solo;\n#DIFFICULTY:Edit;
          #NOTES:\n1000000000\n0000000000\n;
          #NOTEDATA:;\n#STEPSTYPE:pump-double;\n#METER:18;\n#DESCRIPTION:Team;\n#DIFFICULTY:Edit;
          #NOTES:\nXY00000000\n0000000000\n;'''
        self.context.route('**/Test0.ssc',lambda route:route.fulfill(status=200,body=ssc,content_type='text/plain'))
        self.load()
        expect(self.page.locator('#level .listStep')).to_have_count(1)
        self.assertEqual(self.page.evaluate('chart_level'),0)
        self.page.locator('#song-coop-link').click()
        self.page.wait_for_function('chart_level===1 && channelChartFilter.coop')
        expect(self.page.locator('#level .circle-coop')).to_have_text(re.compile('×2'))
        self.page.evaluate("new bootstrap.Modal(document.getElementById('confirmPlayModal')).show()")
        expect(self.page.locator('#ps-type')).to_have_text('CO-OP')
        expect(self.page.locator('#ps-coop-panel .coop-legend>span')).to_have_text(['P1','P2'])
        for width,height in [(1280,800),(390,844),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.locator('#ps-coop-panel button').click()
            expect(self.page.locator('.coop-controls')).to_be_visible()
            expect(self.page.locator('.coop-controls fieldset')).to_have_count(2)
            self.page.locator('.coop-controls fieldset button').first.click()
            self.page.keyboard.press('BracketLeft')
            self.page.get_by_role('button',name='SALVAR E VOLTAR').click()
        saved=self.page.evaluate("""()=>{
          const config=createSingleConfig();
          sessionStorage.setItem('piu_single_result',JSON.stringify({...config.record,config,score:900000,
            performance:{p:10,gr:0,go:0,b:0,m:0,maxCombo:10}}));return config;
        }""")
        self.assertEqual(saved['selection']['channelId'],'co-op')
        self.assertEqual(saved['coop']['count'],2)
        self.assertEqual(saved['coopBindings'][0][0],'BracketLeft')
        self.page.goto(self.origin+'/index.html')
        expect(self.page.locator('#stepType')).to_have_text('CO-OP')
        expect(self.page.locator('#songLevel')).to_have_text('×2')
        self.page.locator('#resultNext').click()
        self.page.wait_for_function('chart_level===1 && channelChartFilter.coop')
        expect(self.page.locator('#level .listStep')).to_have_count(1)
        self.page.evaluate('selectionBack()')
        expect(self.page.locator('.blockSelectChannel')).not_to_have_class(re.compile(r'\bhide\b'))
        self.assertFalse(self.page.evaluate('PiuChannels.isLevelPicker()'))
        self.assertFalse(self.errors)

    def test_coop_channel_keeps_valid_charts_when_an_entry_is_missing(self):
        data=catalog()
        data['children'][0]['children'].append({'name':'CO-OP','channelId':'co-op','children':[track(1),track(2),track(3)]})
        self.context.route('**/piu-songs/songs.json',lambda route:route.fulfill(status=200,body=json.dumps(data),content_type='application/json'))
        ssc='''#TITLE:Team;\n#MUSIC:Test1.wav;\n#BPMS:0=120;\n#OFFSET:0;
          #NOTEDATA:;\n#STEPSTYPE:pump-double;\n#METER:18;\n#DESCRIPTION:Team;\n#DIFFICULTY:Edit;
          #NOTES:\nXY00000000\n0000000000\n;'''
        self.context.route('**/Test1.ssc',lambda route:route.fulfill(status=200,body=ssc,content_type='text/plain'))
        self.context.route('**/Test2.ssc',lambda route:route.fulfill(status=404,body='Not found'))
        for width,height in [(1280,800),(390,844)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.load()
            self.page.evaluate('selectChannel(true)')
            card=self.page.locator('#stage [data-channel-id="co-op"]')
            card.focus()
            expect(card).to_have_class(re.compile(r'\bchannel-highlight\b'))
            card.click()
            self.page.wait_for_function("selsong?.meta.TITLE==='Team' && chart_level===0 && channelChartFilter?.coop")
            expect(self.page.locator('.blockSelectChannel')).to_have_class(re.compile(r'\bhide\b'))
            expect(self.page.locator('#online-song .listSong:not(.wheel-ghost)')).to_have_count(1)
            expect(self.page.locator('#level .circle-coop')).to_have_count(1)
            self.assertEqual(self.page.evaluate('channelSongCount(stageIndex)'),1)
        self.assertFalse(self.errors)

    def test_coop_failed_downloads_can_retry_without_false_empty_lock(self):
        self.load()
        self.page.evaluate("songsJson.children.find(stage=>stage.channelId==='co-op').children.push(songsJson.children[0].children[1])")
        def failed(route):
            route.fulfill(status=404,body='Not found')
        self.context.route('**/Test1.ssc',failed)
        self.page.evaluate("change_stage(songsJson.children.findIndex(stage=>stage.channelId==='co-op'))")
        expect(self.page.locator('.channel-empty strong')).to_have_text('CO-OP INDISPONÍVEL')
        self.assertEqual(self.page.evaluate('channelSongCount(stageIndex)'),1)
        self.context.unroute('**/Test1.ssc',failed)
        ssc='''#TITLE:Restored;\n#MUSIC:Test1.wav;\n#BPMS:0=120;\n#OFFSET:0;
          #NOTEDATA:;\n#STEPSTYPE:pump-double;\n#METER:18;\n#DESCRIPTION:Team;\n#DIFFICULTY:Edit;
          #NOTES:\nXY00000000\n0000000000\n;'''
        self.context.route('**/Test1.ssc',lambda route:route.fulfill(status=200,body=ssc,content_type='text/plain'))
        self.page.evaluate('change_stage(stageIndex)')
        self.page.wait_for_function("selsong?.meta.TITLE==='Restored' && chart_level===0")
        expect(self.page.locator('#level .circle-coop')).to_have_count(1)
        self.assertFalse(self.errors)

    def test_native_routine_and_four_player_touch(self):
        header='#TITLE:Team;\n#MUSIC:Test0.wav;\n#BPMS:0=120;\n#OFFSET:0;\n#NOTEDATA:;\n'
        for style,rows,players in [('pump-routine','1000000000\n&\n0000010000\n&\n0000000001',[1,2,3]),
                                   ('pump-double','XYZ1000000',[1,2,3,4])]:
            ssc=header+f'#STEPSTYPE:{style};\n#METER:20;\n#DESCRIPTION:Team;\n#DIFFICULTY:Edit;\n#NOTES:\n{rows}\n;'
            self.open_frozen_stage('pump-double',True,{'sscContent':ssc})
            actual=self.page.evaluate("""()=>({players:config.coop.players,
              owners:engine.stage._playerStages[0]._steps.stepList.map(step=>step.player),
              pads:engine.stage._playerStages[0].keyListener.getPadIds().length})""")
            self.assertEqual(actual['players'],players)
            self.assertEqual(actual['owners'],players)
            self.assertEqual(actual['pads'],2)
        self.assertFalse(self.errors)

    def test_double_difficulty_excludes_coop_by_notes(self):
        self.server.difficulty_style='pump-double'
        self.server.meter=99
        ssc='''#TITLE:Team;\n#MUSIC:Test0.wav;\n#BPMS:0=120;\n#OFFSET:0;
          #NOTEDATA:;\n#STEPSTYPE:pump-double;\n#METER:99;\n#DESCRIPTION:Team;\n#DIFFICULTY:Edit;
          #NOTES:\nXY00000000\n0000000000\n;'''
        self.context.route('**/Test0.ssc',lambda route:route.fulfill(status=200,body=ssc,content_type='text/plain'))
        self.load()
        paths=self.page.evaluate("async ()=>[...await difficultyPaths(songsJson.children[3],{type:'pump-double',mode:'double',level:'27+'})]")
        self.assertEqual(paths,['Songs/Test1','Songs/Test2','Songs/Test3'])
        self.assertFalse(self.errors)

    def test_half_double_touch_six_panels_and_separate_preferences(self):
        self.open_frozen_stage('pump-halfdouble',True)
        for width,height in [(390,844),(844,390),(1280,800)]:
            self.page.set_viewport_size({'width':width,'height':height})
            actual=self.page.evaluate("""()=>{
              const input=engine.stage._playerStages[0].keyListener;
              input.updateResponsiveLayout();PiuGameplayLayout.apply(engine);input.updateResponsiveLayout();
              engine.scene.updateMatrixWorld(true);engine.camera.updateMatrixWorld(true);
              const tiles=input.getVisiblePads().flatMap(pad=>Object.entries(pad._tiles).filter(([,tile])=>tile.object.visible).map(([kind,tile])=>({pad,kind,tile})));
              tiles.forEach(({tile},id)=>{
                const [left,top,right,bottom]=tile.getScreenPositionInPixels();
                input.onTouchDown({changedTouches:[{identifier:id,clientX:(left+right)/2,clientY:(top+bottom)/2}]});
              });
              const pressed=input.getPressed().map(([kind,pad])=>pad+':'+kind).sort();
              const hidden=input.pads[0]._tiles.dl.isTouched(0,0);
              const bounds=tiles.map(({tile})=>tile.getScreenPositionInPixels());
              input.clearTouches();
              return {count:tiles.length,pressed,hidden,bounds};
            }""")
            self.assertEqual(actual['count'],6)
            self.assertEqual(actual['pressed'],['0:c','0:dr','0:ur','1:c','1:dl','1:ul'])
            self.assertFalse(actual['hidden'])
            for left,top,right,bottom in actual['bounds']:
                self.assertGreaterEqual(left,-1)
                self.assertGreaterEqual(top,-1)
                self.assertLessEqual(right,width+1)
                self.assertLessEqual(bottom,height+1)
        saved=self.page.evaluate("""()=>{
          const normal=PiuTouchLayout.defaults(),half=PiuTouchLayout.defaults();
          normal.portrait.opacity=.4;half.portrait.opacity=.7;
          PiuTouchLayout.save(normal);PiuTouchLayout.save(half,'pump-halfdouble');
          return [PiuTouchLayout.read().portrait.opacity,PiuTouchLayout.read('pump-halfdouble').portrait.opacity];
        }""")
        self.assertEqual(saved,[.4,.7])
        self.assertFalse(self.errors)

    def test_single_and_double_keep_full_receptor_geometry(self):
        for style,count in [('pump-single',1),('pump-double',2)]:
            self.open_frozen_stage(style,True)
            actual=self.page.evaluate("""()=>{
              const stage=engine.stage._playerStages[0];
              return {pads:stage.keyListener.pads.length,
                tiles:stage.keyListener.pads.map(pad=>Object.values(pad._tiles).filter(tile=>tile.object.visible).length),
                widths:Object.values(stage.padReceptors).map(receptor=>{
                  const geometry=receptor._receptor.geometry;geometry.computeBoundingBox();
                  return geometry.boundingBox.max.x-geometry.boundingBox.min.x;
                })};
            }""")
            self.assertEqual(actual['pads'],count)
            self.assertEqual(actual['tiles'],[5]*count)
            self.assertEqual(actual['widths'],[5]*count)
        self.assertFalse(self.errors)

    def test_gameplay_hud_side_column_and_right_controls(self):
        self.open_frozen_stage('pump-single',True,{'bga':'off','playback':1.2,'vanish':True,'fd':True,'hj':True,'randomNote':True})
        for width,height in [(1440,900),(390,844),(320,568),(844,390),(568,320)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.evaluate("""()=>{
              engine.onWindowResize();updateHudLayout();
              const input=engine.stage._playerStages[0].keyListener;
              input.updateResponsiveLayout();PiuGameplayLayout.apply(engine);input.updateResponsiveLayout();
            }""")
            actual=self.page.evaluate("""()=>{
              const rect=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};
              const stage=engine.stage._playerStages[0];
              const receptors=Object.values(stage.padReceptors).map(r=>PiuGameplayLayout.bounds(r._receptor,engine));
              return {stage:rect(document.querySelector('.options-block-l')),
                modifiers:[...document.querySelectorAll('#game-modifiers>p:not([hidden])')].map(rect),
                control:rect(document.querySelector('#playControlMode')),pause:rect(document.querySelector('#game-pause-button')),
                field:{left:Math.min(...receptors.map(r=>r.left)),right:Math.max(...receptors.map(r=>r.right)),top:Math.min(...receptors.map(r=>r.top)),bottom:Math.max(...receptors.map(r=>r.bottom))},life:PiuGameplayLayout.bounds(stage._lifeBar.object,engine),
                pads:stage.keyListener.getVisiblePads().map(pad=>PiuGameplayLayout.bounds(pad.object,engine))};
            }""")
            self.assertEqual(len(actual['modifiers']),8)
            self.assertAlmostEqual(actual['control']['top'],actual['pause']['top'],delta=1)
            self.assertLess(actual['control']['right'],actual['pause']['left'])
            for icon in actual['modifiers']:
                self.assertGreater(icon['top'],actual['stage']['bottom'])
                self.assertGreaterEqual(icon['left'],0)
                self.assertLessEqual(icon['right'],width)
                self.assertLessEqual(icon['bottom'],height)
                for other in [actual['field'],actual['life'],*actual['pads']]:
                    overlap=min(icon['right'],other['right'])-max(icon['left'],other['left'])>1 and min(icon['bottom'],other['bottom'])-max(icon['top'],other['top'])>1
                    self.assertFalse(overlap,(width,height,icon,other))
        self.assertFalse(self.errors)

    def test_touch_editor_saves_resets_and_cancels_per_mode(self):
        profiles=[('pump-single','SINGLE',65,.35),('pump-double','DOUBLE',50,.5),('pump-halfdouble','HALFDOUBLE',25,.75)]
        for style,label,transparency,opacity in profiles:
            self.open_frozen_stage(style,True)
            expect(self.page.locator('#te-title')).to_have_text('Ajustar touchpad · '+label)
            self.page.locator('#te-opacity').evaluate("(e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}",transparency)
            self.page.locator('#te-save').click()
            self.assertAlmostEqual(self.page.evaluate('style=>PiuTouchLayout.read(style).landscape.opacity',style),opacity)
        self.load()
        configurations=self.page.evaluate("""()=>{
          const values=['pump-single','pump-double','pump-halfdouble'].map(style=>{
            selsong.levels[chart_level].STEPSTYPE=style;
            const settings=PiuGameSettings.read(),config=createSingleConfig(settings);
            return {style:settings.touchLayoutStyle,opacity:settings.touchLayout.landscape.opacity,preview:config.touchLayout.landscape.opacity};
          });
          selsong.levels[chart_level].STEPSTYPE='pump-double';
          const double=PiuGameSettings.read();
          selsong.levels[chart_level].STEPSTYPE='pump-halfdouble';
          PiuGameSettings.apply(double);
          return values;
        }""")
        self.assertEqual(configurations,[{'style':style,'opacity':opacity,'preview':opacity} for style,_,_,opacity in profiles])
        for style,label,_,_ in profiles:
            self.open_frozen_stage(style,True)
            expect(self.page.locator('#te-title')).to_have_text('Ajustar touchpad · '+label)
            self.assertEqual(self.page.locator('#te-opacity').input_value(),str(next(p[2] for p in profiles if p[0]==style)))
        self.page.locator('#te-cancel').click()
        self.open_frozen_stage('pump-double',True)
        self.page.locator('#te-reset').click()
        self.page.locator('#te-save').click()
        self.assertEqual(self.page.evaluate("['pump-single','pump-double','pump-halfdouble'].map(style=>PiuTouchLayout.read(style).landscape.opacity)"),[.35,.3,.75])
        self.open_frozen_stage('pump-single',True)
        self.page.locator('#te-opacity').evaluate("e=>{e.value=90;e.dispatchEvent(new Event('input',{bubbles:true}));}")
        self.page.locator('#te-cancel').click()
        self.assertAlmostEqual(self.page.evaluate("PiuTouchLayout.read('pump-single').landscape.opacity"),.35)
        self.assertFalse(self.errors)

    def test_fast_navigation_wrap_clones_and_resize(self):
        self.load()
        self.server.delay = .25
        for _ in range(29):
            self.page.keyboard.press('ArrowRight')
        self.page.wait_for_function('songIndex===5 && selsong?.meta.TITLE==="Test 5"')
        self.aligned()
        self.page.wait_for_function("actualMusic.src.endsWith('Test5.wav')")
        for _ in range(18):
            self.page.keyboard.press('ArrowLeft')
        self.page.wait_for_function('songIndex===11 && selsong?.meta.TITLE==="Test 11"')
        self.aligned()
        # The next clone represents the first real song; it must never become active.
        self.page.locator('#online-song .wheel-ghost').last.evaluate('element=>element.click()')
        self.page.wait_for_function('songIndex===2 && selsong?.meta.TITLE==="Test 2"')
        self.aligned()
        for width, height in [(390, 844), (844, 390), (1280, 800)]:
            self.page.set_viewport_size({'width': width, 'height': height})
            self.aligned()
        self.assertFalse(self.errors)

    def test_touch_scroll_and_late_chart_do_not_pull_selection_back(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.load()
        self.server.delay = .4
        self.page.locator('#arrowSongRight').click()
        self.page.evaluate("""()=>{
          const wheel=document.querySelector('#online-song');
          wheel.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true}));
          const target=wheel.querySelectorAll('.listSong:not(.wheel-ghost)')[7];
          wheel.scrollTo({left:target.offsetLeft-(wheel.clientWidth-target.offsetWidth)/2,behavior:'instant'});
        }""")
        # Wait for the previous chart to finish while the finger still holds the wheel.
        self.page.wait_for_function('selsong?.meta.TITLE==="Test 1"')
        self.page.evaluate("window.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',bubbles:true}))")
        self.page.wait_for_function('songIndex===7 && selsong?.meta.TITLE==="Test 7"')
        self.aligned()
        self.page.wait_for_function("actualMusic.src.endsWith('Test7.wav')")
        self.assertFalse(self.errors)

    def test_empty_channels_block_mouse_keyboard_and_direct_entry(self):
        self.load()
        self.page.evaluate('selectChannel(true)')
        for width, height in [(1280, 800), (390, 844)]:
            self.page.set_viewport_size({'width': width, 'height': height})
            for index in ['1', '2', '3', 'favorites']:
                card = self.page.locator(f'#stage [data-idx="{index}"]')
                # A disabled channel remains focusable to explain why it cannot open.
                card.evaluate('element=>element.focus({preventScroll:true})')
                expect(card).to_have_attribute('aria-disabled', 'true')
                expect(card.locator('.channel-lock')).to_be_visible()
                card.scroll_into_view_if_needed()
                card.click(force=True)  # Simulate a pointer click despite aria-disabled.
                self.page.keyboard.press('Enter')
                self.page.keyboard.press('s')
                expect(self.page.locator('.blockSelectChannel')).not_to_have_class(re.compile(r'\bhide\b'))
                self.assertEqual(self.page.evaluate('stageIndex'), 0)
        self.page.evaluate('change_stage(1);change_stage(3);openFavoritesChannel()')
        self.assertEqual(self.page.evaluate('stageIndex'), 0)
        self.assertIsNone(self.page.evaluate('currentChannel'))
        self.assertFalse(self.errors)

    def test_favorites_unlock_and_lock_after_last_removal(self):
        self.load()
        self.page.evaluate("toggleFavorite({key:PiuLibrary.songKey(songsJson.children[0].children[0]),name:'Test 0',stageIndex:0,songIndex:0})")
        self.page.evaluate('selectChannel(true)')
        self.page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        card = self.page.locator('#stage [data-idx="favorites"]')
        card.evaluate('element=>element.focus({preventScroll:true})')
        expect(card).to_have_attribute('aria-disabled', 'false')
        card.click()
        self.page.wait_for_function('currentChannel==="favorites" && selsong?.levels.length')
        self.page.evaluate("toggleFavorite({key:PiuLibrary.songKey(songsJson.children[0].children[0]),name:'Test 0',stageIndex:0,songIndex:0})")
        expect(card).to_have_attribute('aria-disabled', 'true')
        expect(self.page.locator('.blockSelectChannel')).not_to_have_class(re.compile(r'\bhide\b'))
        self.assertFalse(self.errors)

    def test_library_with_no_songs_stays_in_locked_channels(self):
        self.server.empty = True
        self.load()
        expect(self.page.locator('.blockSelectChannel')).not_to_have_class(re.compile(r'\bhide\b'))
        self.assertEqual(self.page.locator('#stage [aria-disabled="true"]').count(), 6)
        self.page.keyboard.press('Enter')
        self.page.keyboard.press('Escape')
        self.assertIsNone(self.page.evaluate('songIndex'))
        expect(self.page.locator('.blockSelectChannel')).not_to_have_class(re.compile(r'\bhide\b'))
        self.assertFalse(self.errors)

    def test_difficulty_result_returns_to_same_song_filter_and_chart(self):
        for style, meter in [('pump-single',8),('pump-double',28),('pump-halfdouble',8)]:
            with self.subTest(style=style, meter=meter):
                self.server.difficulty_style=style
                self.server.meter=meter
                self.server.delay=0
                self.page.set_viewport_size({'width':1280 if style=='pump-single' else 390,'height':800 if style=='pump-single' else 844})
                self.load()
                level='27+' if meter>=27 else meter
                self.page.evaluate('change_stage(3)')
                self.page.evaluate('level=>selectChannelLevel(level)',level)
                self.page.evaluate('changeOnlineSong(2,1)')
                saved=self.page.evaluate("""()=>{
                  const config=createSingleConfig();
                  sessionStorage.setItem('piu_single_result',JSON.stringify({
                    ...config.record,config,score:900000,previousBest:null,
                    performance:{p:10,gr:0,go:0,b:0,m:0,maxCombo:10}
                  }));
                  return config.selection;
                }""")
                self.assertEqual(saved['chart'],1)
                self.assertEqual(saved['difficultyLevel'],level)
                # Gameplay returns to index without the original library query string.
                self.server.delay=.25
                self.page.goto(self.origin+'/index.html')
                expect(self.page.locator('#performance')).to_be_visible()
                self.page.locator('#resultNext').click()
                expect(self.page.locator('#performance')).to_be_hidden()
                expect(self.page.locator('.blockSelectChannel')).to_have_class(re.compile(r'\bhide\b'))
                expect(self.page.locator('.blockSelectSong')).not_to_have_class(re.compile(r'\bhide\b'))
                restored=self.page.evaluate('({songKey:PiuLibrary.songKey(song),chart:chart_level,level:channelChartFilter.level,type:channelChartFilter.type,title:selsong.meta.TITLE})')
                self.assertEqual(restored,{'songKey':saved['songKey'],'chart':1,'level':level,'type':style,'title':'Test 2'})
                self.aligned()
        self.assertFalse(self.errors)

    def test_empty_difficulty_levels_are_locked_for_all_styles(self):
        for style,meter in [('pump-single',8),('pump-double',28),('pump-halfdouble',8)]:
            with self.subTest(style=style):
                self.server.difficulty_style=style
                self.server.meter=meter
                self.page.set_viewport_size({'width':1280 if style=='pump-single' else 390,'height':800 if style=='pump-single' else 844})
                self.load()
                self.page.evaluate('change_stage(3)')
                empty=self.page.locator('#stage [data-level="1"]')
                expect(empty).to_have_attribute('data-availability','empty')
                empty.evaluate('e=>e.focus({preventScroll:true})')
                empty.scroll_into_view_if_needed()
                expect(empty.locator('.channel-lock')).to_be_visible()
                expect(empty).to_have_attribute('aria-disabled','true')
                empty.click(force=True)
                self.page.keyboard.press('Enter')
                self.page.keyboard.press('s')
                self.page.evaluate('selectChannelLevel(1)')
                self.assertTrue(self.page.evaluate('PiuChannels.isLevelPicker()'))
                expect(self.page.locator('.blockSelectSong')).to_have_class(re.compile(r'\bhide\b'))
                level='27+' if meter>=27 else '8'
                ready=self.page.locator(f'#stage [data-level="{level}"]')
                expect(ready).to_have_attribute('data-availability','ready')
                self.page.evaluate('delta=>PiuChannels.move(delta)',26 if level=='27+' else 7)
                ready.scroll_into_view_if_needed()
                expect(ready).to_have_attribute('aria-disabled','false')
                ready.click()
                self.page.wait_for_function('selsong?.levels.length && songIndex!==null')
                expect(self.page.locator('.blockSelectChannel')).to_have_class(re.compile(r'\bhide\b'))
                self.assertEqual(self.page.locator('#online-song .listSong:not(.wheel-ghost)').count(),4)
                self.assertFalse(self.errors)

    def test_difficulty_query_failure_stays_locked_and_can_retry(self):
        self.server.difficulty_style='pump-single'
        self.server.index_error=503
        self.load()
        self.page.evaluate('change_stage(3)')
        card=self.page.locator('#stage [data-level="8"]')
        expect(card).to_have_attribute('data-availability','error')
        expect(card).to_have_attribute('aria-disabled','true')
        self.page.evaluate('PiuChannels.move(7)')
        card.scroll_into_view_if_needed()
        self.server.index_error=0
        card.click(force=True)
        expect(card).to_have_attribute('data-availability','ready')
        self.assertTrue(self.page.evaluate('PiuChannels.isLevelPicker()'))
        card.click()
        self.page.wait_for_function('selsong?.levels.length && songIndex!==null')
        self.assertFalse(self.errors)

    def test_late_difficulty_query_cannot_enter_after_back(self):
        self.server.difficulty_style='pump-single'
        self.server.index_delay=.3
        self.load()
        self.page.evaluate('change_stage(3)')
        with self.page.expect_event('requestfinished',predicate=lambda request: '/single/8.json' in request.url):
            self.page.evaluate('selectChannelLevel(8);selectChannel(true)')
        self.assertFalse(self.page.evaluate('PiuChannels.isLevelPicker()'))
        expect(self.page.locator('.blockSelectChannel')).not_to_have_class(re.compile(r'\bhide\b'))
        expect(self.page.locator('.blockSelectSong')).to_have_class(re.compile(r'\bhide\b'))
        self.assertFalse(self.errors)


if __name__ == '__main__':
    unittest.main(verbosity=2)
