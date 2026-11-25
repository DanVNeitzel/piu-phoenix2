const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const songCode = fs.readFileSync(path.join(__dirname, '../piured-engine/js/Song/Song.js'), 'utf8');

function setup(responses, {decodeError = false, legacy = false} = {}) {
    const calls = [], contexts = [], errors = [];
    let ready = 0;
    const decoded = {duration: 120};
    class AudioContext {
        constructor() { this.state = 'suspended'; contexts.push(this); }
        decodeAudioData(data, resolve, reject) {
            this.decodedData = data;
            decodeError ? reject(new Error('EncodingError')) : resolve(decoded);
        }
        createBufferSource() { return {playbackRate: {}, connect() {}}; }
        async close() { this.state = 'closed'; }
    }
    const sandbox = {
        window: legacy ? {webkitAudioContext: AudioContext} : {AudioContext},
        console: {error() {}}, AbortController, setTimeout, clearTimeout,
        readFileContent() {},
        fetch: async (url, options) => {
            calls.push({url, options});
            const result = responses[Math.min(calls.length - 1, responses.length - 1)];
            if (result instanceof Error) throw result;
            return {
                ok: result.status >= 200 && result.status < 300, status: result.status,
                headers: {get: () => result.type || 'audio/mpeg'},
                arrayBuffer: async () => new ArrayBuffer(result.empty ? 0 : 16)
            };
        }
    };
    vm.createContext(sandbox);
    const Song = vm.runInContext(songCode + '\nSong;', sandbox);
    const song = new Song('chart.ssc', 'https://library.test/song.mp3', 0, 1, () => ready++);
    song.onLoadError = error => errors.push(error);
    return {song, calls, contexts, errors, decoded, ready: () => ready};
}

test('decodes and prepares playback in one context, including Safari fallback', async () => {
    for (const legacy of [false, true]) {
        const state = setup([{status: 200}], {legacy});
        await state.song.play();
        assert.equal(state.contexts.length, 1);
        assert.equal(state.song.context, state.contexts[0]);
        assert.equal(state.song.source.buffer, state.decoded);
        assert.equal(state.song.source.playbackRate.value, 1);
        assert.equal(state.ready(), 1);
        assert.equal(state.errors.length, 0);
    }
});

test('retries network and server failures once with cache reload', async () => {
    for (const first of [new TypeError('Network error'), {status: 503}]) {
        const state = setup([first, {status: 200}]);
        await state.song.play();
        assert.equal(state.calls.length, 2);
        assert.equal(state.calls[1].options.cache, 'reload');
        assert.equal(state.ready(), 1);
    }
});

test('reports HTTP, invalid content, decode, network and timeout failures', async () => {
    const cases = [
        [[{status: 404}], {}, /HTTP 404/, 1],
        [[{status: 403}], {}, /HTTP 403/, 1],
        [[{status: 503}], {}, /HTTP 503/, 2],
        [[{status: 200, type: 'text/html'}], {}, /HTML/, 1],
        [[{status: 200, empty: true}], {}, /vazio/, 1],
        [[{status: 200}], {decodeError: true}, /decodificar/, 1],
        [[new TypeError('Network error')], {}, /CORS/, 2],
        [[Object.assign(new Error('Timeout'), {name: 'AbortError'})], {}, /demorou/, 2]
    ];
    for (const [responses, options, message, attempts] of cases) {
        const state = setup(responses, options);
        await state.song.play();
        assert.equal(state.ready(), 0);
        assert.equal(state.errors.length, 1);
        assert.match(state.errors[0].message, message);
        assert.equal(state.calls.length, attempts);
        assert.equal(state.song.context.state, 'closed');
    }
});

test('leaving the stage during a download never starts playback', async () => {
    const state = setup([{status: 200}]);
    const loading = state.song.play();
    await state.song.context.close();
    await loading;
    assert.equal(state.ready(), 0);
    assert.equal(state.errors.length, 0);
});
