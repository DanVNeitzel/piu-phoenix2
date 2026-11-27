const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../assets/js/touch-layout-settings.js'), 'utf8');

function setup(seed = {}, rejectWrites = false) {
    const data = new Map(Object.entries(seed));
    const scope = {localStorage: {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => {if (rejectWrites) throw new Error('Storage unavailable'); data.set(key, value);}
    }};
    vm.createContext(scope);
    vm.runInContext(code, scope);
    return {layout: scope.PiuTouchLayout, data};
}

test('migrates shared Single/Double settings independently and preserves existing Half Double', () => {
    const shared = JSON.stringify({portrait: {size: 1.2, opacity: .6}, landscape: {left: {x: .1}}});
    const half = JSON.stringify({portrait: {opacity: .8}});
    const {layout, data} = setup({piu_touch_layout_v1: shared, piu_touch_layout_halfdouble_v1: half});
    assert.equal(layout.read('pump-single').portrait.opacity, .6);
    const single = layout.read('pump-single');
    single.portrait.opacity = .2;
    layout.save(single, 'pump-single');
    assert.equal(layout.read('pump-double').portrait.opacity, .6);
    assert.equal(layout.read('pump-double').portrait.size, 1.2);
    assert.equal(layout.read('pump-double').landscape.left.x, .1);
    assert.equal(layout.read('pump-halfdouble').portrait.opacity, .8);
    assert.equal(data.get('piu_touch_layout_v1'), shared);
    assert.equal(data.get('piu_touch_layout_halfdouble_v1'), half);
});

test('saving or resetting one profile does not change another profile or orientation', () => {
    const {layout} = setup();
    for (const [style, opacity] of [['pump-single', .2], ['pump-double', .5], ['pump-halfdouble', .8]]) {
        const value = layout.defaults();
        value.portrait.opacity = opacity;
        value.landscape.opacity = Number((opacity + .1).toFixed(2));
        layout.save(value, style);
    }
    const double = layout.read('pump-double');
    double.landscape = layout.defaults().landscape;
    layout.save(double, 'pump-double');
    assert.equal(layout.read('pump-single').portrait.opacity, .2);
    assert.equal(layout.read('pump-single').landscape.opacity, .3);
    assert.equal(layout.read('pump-double').portrait.opacity, .5);
    assert.equal(layout.read('pump-double').landscape.opacity, .3);
    assert.equal(layout.read('pump-halfdouble').portrait.opacity, .8);
});

test('legacy preferences remain readable if migration cannot write to storage', () => {
    const {layout} = setup({piu_touch_layout_v1: JSON.stringify({portrait: {opacity: .65}})}, true);
    assert.equal(layout.read('pump-single').portrait.opacity, .65);
    assert.equal(layout.read('pump-double').portrait.opacity, .65);
    assert.throws(() => layout.save(layout.defaults(), 'pump-single'), /Storage unavailable/);
});

test('vertical offsets cover the full screen and survive saving in each orientation', () => {
    const {layout} = setup();
    for (const style of ['pump-single','pump-double','pump-halfdouble']) {
        const value=layout.defaults();
        value.portrait.y=-1;value.landscape.left.y=-1;value.landscape.right.y=1;
        layout.save(value,style);
        const saved=layout.read(style);
        assert.equal(saved.portrait.y,-1);
        assert.equal(saved.landscape.left.y,-1);
        assert.equal(saved.landscape.right.y,1);
    }
});
