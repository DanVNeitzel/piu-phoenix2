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
            self.send(json.dumps(catalog(self.server.empty)), 'application/json')
        elif path.endswith('.ssc'):
            index = int(re.search(r'Test(\d+)\.ssc', path).group(1))
            self.server.charts.append(index)
            time.sleep(self.server.delay)
            self.send(f'''#TITLE:Test {index};\n#ARTIST:PIUWeb;\n#MUSIC:Test{index}.wav;
              #BANNER:Title.PNG;\n#BACKGROUND:Title.PNG;\n#BPMS:0=120;\n#OFFSET:0;
              #NOTEDATA:;\n#STEPSTYPE:pump-single;\n#DESCRIPTION:Test;\n#DIFFICULTY:Easy;
              #METER:8;\n#CREDIT:Test;\n#NOTES:\n00000\n00000\n00100\n00000\n;''', 'text/plain')
        elif path.startswith('/piu-songs/') and path.endswith('.PNG'):
            self.send((ROOT / 'favicon.png').read_bytes(), 'image/png')
        elif path.endswith('.wav'):
            self.send(self.server.audio, 'audio/wav')
        else:
            super().do_GET()


class SelectionBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
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
        self.assertEqual(self.page.locator('#stage [aria-disabled="true"]').count(), 5)
        self.page.keyboard.press('Enter')
        self.page.keyboard.press('Escape')
        self.assertIsNone(self.page.evaluate('songIndex'))
        expect(self.page.locator('.blockSelectChannel')).not_to_have_class(re.compile(r'\bhide\b'))
        self.assertFalse(self.errors)


if __name__ == '__main__':
    unittest.main(verbosity=2)
