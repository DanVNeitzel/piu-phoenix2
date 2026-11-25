/*
 * # Copyright (C) Pedro G. Bascoy
 # This file is part of piured-engine <https://github.com/piulin/piured-engine>.
 #
 # piured-engine is free software: you can redistribute it and/or modify
 # it under the terms of the GNU General Public License as published by
 # the Free Software Foundation, either version 3 of the License, or
 # (at your option) any later version.
 #
 # piured-engine is distributed in the hope that it will be useful,
 # but WITHOUT ANY WARRANTY; without even the implied warranty of
 # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 # GNU General Public License for more details.
 #
 # You should have received a copy of the GNU General Public License
 # along with piured-engine.If not, see <http://www.gnu.org/licenses/>.
 *
 */
"use strict"; // good practice - see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode



// This class is responsible for the input of a pad (5 steps)
class TouchInput extends GameObject {

    _mesh ;
    _scaled_mesh ;
    _noteskin ;


    constructor(resourceManager, frameLog, noteskin) {

        super(resourceManager) ;

        // Connect to update lists, so it can be updated every frame and can keep track of key inputs.
        engine.addToTouchDownList(this) ;
        engine.addToTouchUpList(this) ;

        this.pads = [] ;
        this.padsDic = {} ;
        // 15 fingers???
        this.touchEvents = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] ;

        this._mesh = new THREE.Object3D() ;
        this._scaled_mesh = new THREE.Object3D() ;
        this._scaled_mesh.add(this._mesh) ;

        this.frameLog = frameLog ;
        this._noteskin = noteskin ;
    }

    getPadIds() {
        return Object.keys(this.padsDic) ;
    }

    addTouchPad(padId) {
        const pad = new TouchPad(this._resourceManager, padId, this.frameLog, this._noteskin) ;
        // pad.object.position.z = 0.05;
        // pad.object.position.y = -9;
        pad.object.scale.x = 4.0;
        pad.object.scale.y = 4.0;

        this._mesh.add(pad.object) ;

        this.pads.push( pad ) ;
        this.padsDic[padId] = pad ;

        this.adjustTouchPads() ;
    }

    adjustTouchPads() {

        let no_pads = this.pads.length ;

        if(no_pads === 1) {
            return ;
        }
        let distance = 8.1 ;

        let Xpos = -(distance*no_pads)/2 + distance/2;

        for (let i = 0 ; i < no_pads ; i++ ) {
            this.pads[i].object.position.x = Xpos ;
            Xpos += distance ;
        }

    }

    configureResponsive(size = 1, preferences = null) {
        this.responsiveSize = Math.max(0.6, Math.min(1.2, Number(size) || 1));
        this.layoutPreferences = preferences;
        // Keep controls in front when an enlarged field extends underneath them.
        this.object.position.z = 0.15;
        if (this.pads.length === 1 && !this.mirrorPad) {
            this.mirrorPad = new TouchPad(this._resourceManager, this.pads[0].padId, this.frameLog, this._noteskin);
            this._mesh.add(this.mirrorPad.object);
        }
        this.updateResponsiveLayout();
    }

    getVisiblePads() {
        return [...this.pads, ...(this.mirrorPad ? [this.mirrorPad] : [])].filter(pad => pad.object.visible);
    }

    updateResponsiveLayout() {
        if (!this.responsiveSize) return;
        this.clearTouches();
        const w = window.innerWidth, h = window.innerHeight, landscape = w > h;
        const appearance = this.layoutPreferences?.[landscape ? 'landscape' : 'portrait'] || {};
        const multiplier = appearance.size || 1;
        this.touchOpacity = appearance.opacity ?? 0.3;
        if (this.mirrorPad) this.mirrorPad.object.visible = landscape;
        engine.scene.updateMatrixWorld(true);
        engine.camera.updateMatrixWorld(true);
        const z = this._mesh.getWorldPosition(new THREE.Vector3()).z;
        const worldPoint = (x, y) => {
            const direction = new THREE.Vector3(x / w * 2 - 1, 1 - y / h * 2, 0.5).unproject(engine.camera).sub(engine.camera.position).normalize();
            return engine.camera.position.clone().addScaledVector(direction, (z - engine.camera.position.z) / direction.z);
        };
        const place = (pad, x, y, pixels, offset = {}, side = '') => {
            const minX = side === 'right' ? w / 2 + pixels / 2 + 6 : pixels / 2 + 8;
            const maxX = side === 'left' ? w / 2 - pixels / 2 - 6 : w - pixels / 2 - 8;
            x = Math.max(minX, Math.min(maxX, x + (offset.x || 0) * w));
            let minimumTop = 4;
            for (const element of document.querySelectorAll('.options-block-l,.options-block-r,#game-pause-button')) {
                const hud = element.getBoundingClientRect();
                if (x - pixels / 2 < hud.right && x + pixels / 2 > hud.left) minimumTop = Math.max(minimumTop, hud.bottom + 8);
            }
            y = Math.max(minimumTop + pixels / 2, Math.min(h - pixels / 2 - 12, y + (offset.y || 0) * h));
            const bounds = new THREE.Box3().setFromObject(pad.object);
            const width = this.halfDouble ? Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y) : bounds.max.x - bounds.min.x;
            const target = worldPoint(x + pixels / 2, y).distanceTo(worldPoint(x - pixels / 2, y));
            const scale = width > 0 ? target / width : 1;
            pad.object.scale.x *= scale; pad.object.scale.y *= scale;
            pad.object.position.copy(this._mesh.worldToLocal(worldPoint(x, y)));
            engine.scene.updateMatrixWorld(true);
            if (this.halfDouble) {
                // Three-button pads are taller than they are wide. Fit their projected
                // bounds rather than treating them as the square pads used by Double.
                for (let pass = 0; pass < 3; pass++) {
                    const box = new THREE.Box3().setFromObject(pad.object), points = [];
                    for (const bx of [box.min.x,box.max.x]) for (const by of [box.min.y,box.max.y]) for (const bz of [box.min.z,box.max.z]) {
                        const point = new THREE.Vector3(bx,by,bz).project(engine.camera);
                        points.push({x:(point.x+1)*w/2,y:(1-point.y)*h/2});
                    }
                    const left = Math.min(...points.map(p=>p.x)), right = Math.max(...points.map(p=>p.x));
                    const top = Math.min(...points.map(p=>p.y)), bottom = Math.max(...points.map(p=>p.y));
                    const fit = Math.max((right-left)/pixels,(bottom-top)/pixels);
                    if (fit > 1.001) {pad.object.scale.x/=fit;pad.object.scale.y/=fit;}
                    const a = this._mesh.worldToLocal(worldPoint((left+right)/2,(top+bottom)/2));
                    const b = this._mesh.worldToLocal(worldPoint(x,y));
                    pad.object.position.add(b.sub(a));
                    engine.scene.updateMatrixWorld(true);
                }
            }
        };
        const bottom = Math.max(28, h * 0.045);
        if (landscape) {
            const base = Math.min(h - 136, w * 0.30, Math.max(140, Math.min(360, h * 0.62, w * 0.28) * this.responsiveSize));
            const size = Math.min(h - 88, (w - 48) / 2, Math.max(90, base * multiplier));
            const margin = Math.max(14, w * 0.025), y = h - bottom - size / 2;
            place(this.pads[0], margin + size / 2, y, size, appearance.left, 'left');
            place(this.mirrorPad || this.pads[1], w - margin - size / 2, y, size, appearance.right, 'right');
        } else if (this.pads.length === 1) {
            const base = Math.min(w - 28, Math.max(150, Math.min(w * 0.82, h * 0.40, 380) * this.responsiveSize));
            const size = Math.min(w - 28, Math.max(100, base * multiplier));
            place(this.pads[0], w / 2, h - bottom - size / 2, size, appearance);
        } else {
            // Double charts keep their two independent sets together at the bottom.
            const base = Math.min((w - 36) / 2, Math.max(110, Math.min(w * 0.43, h * 0.30) * this.responsiveSize));
            const size = Math.min((w - 36) / 2, Math.max(70, base * multiplier));
            const x = Math.max(size + 14, Math.min(w - size - 14, w / 2 + (appearance.x || 0) * w));
            const y = h - bottom - size / 2 + (appearance.y || 0) * h;
            place(this.pads[0], x - size / 2 - 5, y, size);
            place(this.pads[1], x + size / 2 + 5, y, size);
        }
        for (const pad of this.getVisiblePads()) for (const tile of Object.values(pad._tiles)) tile.object.material.opacity = this.touchOpacity;
    }

    clearTouches() {
        this.touchEvents.fill(null);
        for (const pad of this.pads) for (const kind of ['dl','ul','c','ur','dr']) {
            pad[kind + 'KeyPressed'] = false; pad[kind + 'KeyHold'] = false;
        }
        for (const pad of this.getVisiblePads()) for (const tile of Object.values(pad._tiles)) {
            tile._active = false; tile.object.material.opacity = this.touchOpacity ?? 0.3;
        }
    }

    syncTouches(newHits = []) {
        const held = new Set(), active = new Set();
        for (const touch of this.touchEvents) {
            if (!touch) continue;
            for (const hit of touch.hits) { held.add(hit.padId + ':' + hit.kind); active.add(hit.tile); }
        }
        for (const pad of this.pads) for (const kind of ['dl','ul','c','ur','dr']) {
            const isHeld = held.has(pad.padId + ':' + kind);
            if (pad[kind + 'KeyHold'] !== isHeld) pad[kind + 'KeyHold'] = isHeld;
            if (newHits.some(hit => hit.padId === pad.padId && hit.kind === kind)) pad[kind + 'KeyPressed'] = true;
        }
        for (const pad of this.getVisiblePads()) for (const tile of Object.values(pad._tiles)) {
            tile._active = active.has(tile); tile.object.material.opacity = tile._active ? Math.min(1, (this.touchOpacity ?? 0.3) + 0.5) : (this.touchOpacity ?? 0.3);
        }
    }

    onTouchDown(event) {
        const rect = engine.renderer.domElement.getBoundingClientRect(), newHits = [];
        for (const touch of event.changedTouches || event.touches) {
            if (this.touchEvents[touch.identifier]) continue;
            const x = (touch.clientX ?? touch.pageX) - rect.left, y = (touch.clientY ?? touch.pageY) - rect.top, hits = [];
            for (const pad of this.getVisiblePads()) for (const [kind, tile] of Object.entries(pad._tiles)) {
                if (tile.isTouched(x, y)) hits.push({padId:pad.padId, kind, tile});
            }
            this.touchEvents[touch.identifier] = {hits}; newHits.push(...hits);
        }
        this.syncTouches(newHits);
    }

    onTouchUp(event) {
        for (const touch of event.changedTouches) this.touchEvents[touch.identifier] = null;
        this.syncTouches();
    }

    isPressed( kind, padId ) {
        return this.padsDic[padId].isPressed(kind) ;
    }

    isHeld( kind, padId ) {
        return this.padsDic[padId].isHeld(kind) ;
    }

    update(delta) {

    }


    getPressed() {

        var list = [] ;

        for ( let pad of this.pads ) {

            if ( pad.dlKeyPressed ) {
                list.push(['dl', pad.padId]) ;
            }

            if ( pad.ulKeyPressed ) {
                list.push(['ul', pad.padId]) ;
            }

            if ( pad.cKeyPressed ) {
                list.push(['c', pad.padId]) ;
            }

            if ( pad.urKeyPressed ) {
                list.push(['ur', pad.padId]) ;
            }

            if ( pad.drKeyPressed ) {
                list.push(['dr', pad.padId]) ;
            }

        }

        return list.filter(([kind,padId]) => !this.padsDic[padId].activeKinds || this.padsDic[padId].activeKinds.has(kind));
    }

    setScale(scale) {
        this._mesh.scale.x *= scale ;
        this._mesh.scale.y *= scale ;
    }

    get object () {
        return this._scaled_mesh ;
    }

}
