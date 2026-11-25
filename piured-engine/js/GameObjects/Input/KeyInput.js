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
class KeyInput extends GameObject {

    _mesh ;

    constructor(resourceManager, frameLog) {

        super(resourceManager) ;

        // Connect to update lists, so it can be updated every frame and can keep track of key inputs.
        engine.addToKeyDownList(this) ;
        engine.addToKeyUpList(this) ;

        this.frameLog = frameLog ;

        this.pads = [] ;
        this.padsDic = {} ;

        this._mesh = new THREE.Object3D() ;


    }

    getPadIds() {
        return Object.keys(this.padsDic) ;
    }

    addPad(keyMap, padId) {

        const pad = new Pad(this._resourceManager, keyMap, padId, this.frameLog) ;
        this.pads.push( pad ) ;
        this.padsDic[padId] = pad ;
    }


    onKeyDown(event) {
        if (this.coopBindings) {this.coopKey(event,true);return;}
        const key = event.key.toLowerCase();
        for (const pad of this.pads) for (const kind of pad.activeKinds || ['dl','ul','c','ur','dr']) {
            if (key === pad[kind + 'Key'] && !pad[kind + 'KeyHold']) {
                pad[kind + 'KeyHold'] = true;
                pad[kind + 'KeyPressed'] = true;
            }
        }
    }

    onKeyUp(event) {
        if (this.coopBindings) {this.coopKey(event,false);return;}
        const key = event.key.toLowerCase();
        for (const pad of this.pads) for (const kind of pad.activeKinds || ['dl','ul','c','ur','dr']) {
            if (key === pad[kind + 'Key']) pad[kind + 'KeyHold'] = false;
        }
    }

    configureCoop(coop,bindings) {
        this.coopBindings = new Map();this.coopHeld = new Set();
        coop.players.forEach(player => bindings[player-1].forEach((code,lane) => this.coopBindings.set(code,lane)));
    }

    clearCoop() {this.coopHeld?.clear();}

    coopKey(event,down) {
        const lane = this.coopBindings.get(event.code);
        if (lane === undefined) return;
        event.preventDefault?.();
        const pad = this.pads[Math.floor(lane/5)],kind = PiuCoop.kinds[lane%5];
        if (down) {
            if (!this.coopHeld.has(event.code)) pad[kind+'KeyPressed'] = true;
            this.coopHeld.add(event.code);
        } else this.coopHeld.delete(event.code);
        pad[kind+'KeyHold'] = [...this.coopHeld].some(code => this.coopBindings.get(code) === lane);
    }

    isPressed( kind, padId ) {
        return this.padsDic[padId].isPressed(kind) ;
    }

    isHeld( kind, padId ) {
        return this.padsDic[padId].isHeld(kind) ;
    }


    ready() {

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

    get object () {
        return this._mesh ;
    }

}
