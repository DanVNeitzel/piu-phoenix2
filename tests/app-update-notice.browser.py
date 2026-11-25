"""Run with: python tests/app-update-notice.browser.py (requires Playwright Chromium)."""
import html
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs, quote, urlparse
import unittest

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
LOADED = json.loads((ROOT / 'changelog.json').read_text(encoding='utf-8'))['version']
MAJOR, MINOR, PATCH = map(int, LOADED.split('.'))
NEXT = f'{MAJOR}.{MINOR}.{PATCH + 1}'
AFTER_NEXT = f'{MAJOR}.{MINOR}.{PATCH + 2}'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            pass  # Navigation may close a media request still being served.

    def send(self, body, content_type='text/html', status=200):
        data = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        state = self.server.state
        state['requests'].append(self.path)
        if url.path == '/changelog.json':
            self.send(json.dumps({'version': state['version']}), 'application/json', state['status'])
        elif url.path == state['failed_asset']:
            self.send('Unavailable', status=503)
        elif url.path == '/__update_fixture__':
            loaded = html.escape(parse_qs(url.query).get('loaded', [LOADED])[0])
            self.send('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <link rel="stylesheet" href="/assets/css/bootstrap.min.css">
              <link rel="stylesheet" href="/assets/app-update-notice.css">
              <script src="/assets/js/bootstrap.min.js"></script></head><body>
              <span data-app-version>v''' + loaded + '''</span>
              <div class="container-mob"><div class="blockSelectSong">Músicas</div>
                <div class="blockSelectChannel hide">Canais</div></div>
              <section id="performance"></section>
              <div class="modal" id="confirmPlayModal" tabindex="-1"><div class="modal-dialog">
                <div class="modal-content"><button id="fixture-song">Jogar</button></div></div></div>
              <div class="modal" id="fixture-settings" tabindex="-1"><div class="modal-dialog">
                <div class="modal-content">Configurações</div></div></div>
              <script>window.fixtureKeys=0;document.addEventListener('keydown',()=>fixtureKeys++,true);</script>
              <script src="/assets/js/app-update.js"></script>
              <script src="/assets/js/app-update-notice.js"></script></body></html>''')
        elif url.path in ['/', '/index.html']:
            content = (ROOT / 'index.html').read_text(encoding='utf-8')
            self.send(content.replace('v' + LOADED, 'v' + state['version']))
        else:
            super().do_GET()


class UpdateNoticeBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
        Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.origin = 'http://127.0.0.1:' + str(cls.server.server_port)
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.server.state = {'version': LOADED, 'status': 200, 'failed_asset': None, 'requests': []}
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 800})
        self.context.route('https://**/*', lambda route: route.abort())
        self.page = self.context.new_page()
        self.page.set_default_timeout(6000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.clock.install()

    def tearDown(self):
        self.context.close()

    def load(self, version=LOADED):
        with self.page.expect_event('requestfinished', predicate=lambda request: 'version-check' in request.url):
            self.page.goto(self.origin + '/__update_fixture__?loaded=' + quote(version, safe=''))
        self.page.wait_for_function("document.querySelector('#app-update-notice') !== null")

    def publish(self, version):
        self.server.state['version'] = version
        with self.page.expect_response(lambda r: 'version-check' in r.url):
            self.page.clock.fast_forward(60001)

    def test_polling_versions_and_dismissal(self):
        self.load()
        expect(self.page.locator('#app-update-notice')).to_be_hidden()
        self.publish(NEXT)
        expect(self.page.locator('.app-update-toast')).to_be_visible()
        expect(self.page.locator('#app-update-current')).to_have_text('v' + LOADED)
        expect(self.page.locator('#app-update-latest')).to_have_text('v' + NEXT)
        self.page.locator('#app-update-later').click()
        expect(self.page.locator('.app-update-toast')).to_be_hidden()
        expect(self.page.locator('#app-update-recall')).to_be_visible()
        self.publish(NEXT)
        expect(self.page.locator('.app-update-toast')).to_be_hidden()
        self.publish(AFTER_NEXT)
        expect(self.page.locator('.app-update-toast')).to_be_visible()
        expect(self.page.locator('#app-update-latest')).to_have_text('v' + AFTER_NEXT)
        self.server.state['status'] = 503
        self.publish(AFTER_NEXT)
        expect(self.page.locator('.app-update-toast')).to_be_visible()
        self.server.state['status'] = 200
        self.publish('<script>alert(1)</script>')
        expect(self.page.locator('#app-update-latest')).to_have_text('v' + AFTER_NEXT)
        self.publish(LOADED)
        expect(self.page.locator('#app-update-notice')).to_be_hidden()
        self.assertFalse(self.errors)

    def test_numeric_and_prerelease_comparison(self):
        for installed, published, visible in [
            ('0.8.9', '0.8.10', True), ('0.8.10', '0.8.9', False),
            ('0.8.8-beta.2', '0.8.8-beta.10', True), ('0.8.8-beta.2', '0.8.8', True),
            ('0.8.8', '0.8.8-beta.2', False), ('0.8.8+one', '0.8.8+two', False)
        ]:
            with self.subTest(installed=installed, published=published):
                self.server.state['version'] = published
                self.load(installed)
                if visible:
                    expect(self.page.locator('#app-update-notice')).to_be_visible()
                else:
                    expect(self.page.locator('#app-update-notice')).to_be_hidden()

    def test_menus_focus_and_responsive_layout(self):
        self.server.state['version'] = NEXT
        self.load()
        expect(self.page.locator('.app-update-toast')).to_be_visible()
        self.page.evaluate("document.querySelector('.blockSelectSong').classList.add('hide');document.querySelector('.blockSelectChannel').classList.remove('hide')")
        expect(self.page.locator('.app-update-toast')).to_be_visible()
        self.page.evaluate("bootstrap.Modal.getOrCreateInstance(document.querySelector('#confirmPlayModal')).show()")
        self.page.wait_for_function("document.querySelector('#app-update-notice').parentElement.id==='confirmPlayModal'")
        self.page.locator('#app-update-later').focus()
        self.page.keyboard.press('Enter')
        expect(self.page.locator('#app-update-recall')).to_be_focused()
        self.page.keyboard.press('Space')
        expect(self.page.locator('#app-update-now')).to_be_focused()
        self.assertEqual(self.page.evaluate('fixtureKeys'), 0)
        self.page.evaluate("bootstrap.Modal.getInstance(document.querySelector('#confirmPlayModal')).hide()")
        self.page.wait_for_function("document.querySelector('#app-update-notice').parentElement===document.body")
        self.page.evaluate("bootstrap.Modal.getOrCreateInstance(document.querySelector('#fixture-settings')).show()")
        expect(self.page.locator('#app-update-notice')).to_be_hidden()
        self.page.evaluate("bootstrap.Modal.getInstance(document.querySelector('#fixture-settings')).hide()")
        expect(self.page.locator('#app-update-notice')).to_be_visible()
        for class_name in ['results-active', 'index-gameplay-suspended']:
            self.page.evaluate('(name)=>document.body.classList.add(name)', class_name)
            expect(self.page.locator('#app-update-notice')).to_be_hidden()
            self.page.evaluate('(name)=>document.body.classList.remove(name)', class_name)
            expect(self.page.locator('#app-update-notice')).to_be_visible()
        self.page.evaluate("document.querySelector('.container-mob').classList.add('hide')")
        expect(self.page.locator('#app-update-notice')).to_be_hidden()
        self.page.evaluate("document.querySelector('.container-mob').classList.remove('hide')")
        expect(self.page.locator('#app-update-notice')).to_be_visible()
        for width, height in [(1280, 800), (390, 844), (320, 568), (844, 390), (568, 320)]:
            self.page.set_viewport_size({'width': width, 'height': height})
            box = self.page.locator('.app-update-toast').bounding_box()
            self.assertGreaterEqual(box['x'], 0)
            self.assertLessEqual(box['x'] + box['width'], width)
            self.assertGreaterEqual(box['y'], 0)
            self.assertLessEqual(box['y'] + box['height'], height)
        self.assertFalse(self.errors)

    def test_update_failure_retry_navigation_and_records(self):
        self.server.state['version'] = NEXT
        self.load()
        self.page.evaluate("""localStorage.setItem('piu_single_records_v1', JSON.stringify([{
          ssc:'Songs/Test/Test.ssc',chart:0,title:'Test',type:'pump-single',level:'8',
          score:950000,combo:100,grade:'S',date:'2026-11-25T12:00:00Z'
        }]));localStorage.setItem('piu_history','[]');localStorage.setItem('last_noteskin','NX2');
        sessionStorage.setItem('piu_single_config','transient')""")
        original = self.page.evaluate('Object.assign({},localStorage)')
        self.server.state['failed_asset'] = '/assets/js/app-update-notice.js'
        self.page.locator('#app-update-now').click()
        expect(self.page.locator('#app-update-heading')).to_have_text('Não foi possível atualizar')
        expect(self.page.locator('#app-update-now')).to_have_text('Tentar novamente')
        self.assertEqual(self.page.evaluate('Object.assign({},localStorage)'), original)
        self.assertEqual(self.page.evaluate("sessionStorage.getItem('piu_single_config')"), 'transient')
        self.server.state['failed_asset'] = None
        self.page.locator('#app-update-now').click()
        self.page.wait_for_url('**/index.html?*update=*')
        expect(self.page.locator('[data-app-version]').first).to_have_text('v' + NEXT)
        self.assertIsNone(self.page.evaluate("sessionStorage.getItem('piu_single_config')"))
        for key, value in original.items():
            self.assertEqual(self.page.evaluate('(key)=>localStorage.getItem(key)', key), value)
        self.assertTrue(any('app-update-notice.css' in url for url in self.server.state['requests']))

    def test_real_page_selection_and_level_modal(self):
        entry = {'name': 'Test', 'path': 'Songs/Test', 'children': [
            {'name': 'Test.ssc', 'path': 'Songs/Test/Test.ssc', 'type': 'file'},
            {'name': 'Test.mp3', 'path': 'Songs/Test/Test.mp3', 'type': 'file'},
            {'name': 'Title.PNG', 'path': 'Songs/Test/Title.PNG', 'type': 'file'}
        ]}
        catalog = {'children': [{'name': 'Songs', 'children': [
            {'name': 'Arcade Mix', 'channelId': 'arcade-mix', 'children': [entry]}
        ]}]}
        ssc = '''#TITLE:Test;\n#ARTIST:PIUWeb;\n#MUSIC:Test.mp3;\n#BANNER:Title.PNG;
          #BACKGROUND:Title.PNG;\n#BPMS:0=120;\n#OFFSET:0;\n#SAMPLESTART:0;\n#SAMPLELENGTH:10;
          #NOTEDATA:;\n#STEPSTYPE:pump-single;\n#DESCRIPTION:Test;\n#DIFFICULTY:Easy;
          #METER:8;\n#CREDIT:Test;\n#NOTES:\n00000\n00000\n00100\n00000\n;'''

        def library(route):
            if route.request.url.endswith('songs.json'):
                route.fulfill(json=catalog)
            elif route.request.url.endswith('.ssc'):
                route.fulfill(body=ssc, content_type='text/plain')
            elif route.request.url.endswith('.PNG'):
                route.fulfill(path=str(ROOT / 'favicon.png'))
            else:
                route.abort()

        self.page.route('https://danvneitzel.github.io/piu-songs/**', library)
        self.page.goto(self.origin + '/index.html')
        self.page.wait_for_function("typeof selsong!=='undefined' && selsong?.levels.length && chart_level!==null")
        self.page.evaluate('loginContinue(false)')
        self.publish(NEXT)
        expect(self.page.locator('.app-update-toast')).to_be_visible()
        expect(self.page.locator('[data-app-version]').first).to_have_text('v' + LOADED)
        self.page.locator('#app-update-later').focus()
        self.page.keyboard.press('Enter')
        expect(self.page.locator('#app-update-recall')).to_be_visible()
        expect(self.page.locator('#confirmPlayModal')).to_be_hidden()
        self.page.locator('#app-update-recall').click()
        self.page.locator('#online-song .listSong.active:not(.wheel-ghost)').click()
        expect(self.page.locator('#confirmPlayModal')).to_be_visible()
        self.page.wait_for_function("document.querySelector('#app-update-notice').parentElement.id==='confirmPlayModal'")
        self.page.locator('#app-update-later').focus()
        self.page.keyboard.press('Enter')
        expect(self.page.locator('#app-update-recall')).to_be_focused()
        self.assertEqual(self.page.locator('#app-update-now').evaluate("element=>getComputedStyle(element).fontFamily"), 'Arial, sans-serif')
        self.assertFalse(self.errors)


if __name__ == '__main__':
    unittest.main(verbosity=2)
