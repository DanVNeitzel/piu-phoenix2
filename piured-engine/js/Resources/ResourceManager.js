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

class ResourceManager {

    static usesFullFrameNoteskinAtlas(noteskinId) {
        return noteskinId === 'PHOENIX' || noteskinId === 'PHOENIX2' || noteskinId.startsWith('PUMP-');
    }


    _materialsDict = { 'NOTESKINS': {} };
    _geometryDict = {};
    _textureDict = { 'NOTESKINS': {} };
    _shadersDict = {};


    constructor(resourcePath, noteskinPath, noteskinIds, stagePath) {
        this.resourcePath = resourcePath;
        this.loadGeometries();
        noteskinIds.forEach((noteskinId) => {
            this.loadNoteskinTextures(resourcePath + noteskinPath + noteskinId + '/UHD', noteskinId);
        });
        this.loadStageTextures(resourcePath + stagePath);
        this.loadMaterials();
        this.loadShaderMaterials();

    }


    loadGeometries() {
        // Geometries
        this._geometryDict['B'] = new BackgroundGeometry();
        this._geometryDict['C'] = new ComboGeometry();
        this._geometryDict['D'] = new DigitGeometry();
        this._geometryDict['S'] = new StepGeometry();
        this._geometryDict['H'] = new HoldGeometry();
        this._geometryDict['J'] = new JudgmentGeometry();
        this._geometryDict['R'] = new ReceptorGeometry();
        this._geometryDict['L'] = new LifeBarGeometry();
        this._geometryDict['DL'] = new DLifeBarGeometry();
        this._geometryDict['T'] = new TipGeometry();
        this._geometryDict['P'] = new PulseGeometry();
    }

    loadNoteskinTextures(noteskinPath, noteskinId) {

        if (noteskinId in this._textureDict['NOTESKINS']) {
            return;
        }

        let stepDic = {};
        const texture=path=>new PNGTexture(path+(noteskinId==='PHOENIX2'?'?v=0.8.58':''));
        // StepNotes

        stepDic['SDL'] = texture(noteskinPath + '/DownLeft TapNote 3x2.PNG');
        stepDic['SUL'] = texture(noteskinPath + '/UpLeft TapNote 3x2.PNG');
        stepDic['SC'] = texture(noteskinPath + '/Center TapNote 3x2.PNG');
        stepDic['SUR'] = texture(noteskinPath + '/UpRight TapNote 3x2.PNG');
        stepDic['SDR'] = texture(noteskinPath + '/DownRight TapNote 3x2.PNG');


        //Holds & EndNotes
        stepDic['HDL'] = texture(noteskinPath + '/DownLeft Hold 6x1.PNG');
        stepDic['HUL'] = texture(noteskinPath + '/UpLeft Hold 6x1.PNG');
        stepDic['HC'] = texture(noteskinPath + '/Center Hold 6x1.PNG');
        stepDic['HUR'] = texture(noteskinPath + '/UpRight Hold 6x1.PNG');
        stepDic['HDR'] = texture(noteskinPath + '/DownRight Hold 6x1.PNG');

        //Receptor
        stepDic['R'] = texture(noteskinPath + '/Center Receptor 1x2.PNG');

        //Taps
        stepDic['T'] = texture(noteskinPath + '/Tap 5x2.PNG');

        // FX
        const fullFrameAtlas = ResourceManager.usesFullFrameNoteskinAtlas(noteskinId);
        stepDic['FX'] = texture(noteskinPath + (fullFrameAtlas ? '/StepFX 6x1.PNG' : '/StepFX 5x1.PNG'));
        if(fullFrameAtlas){
            for(const [kind,name] of Object.entries({dl:'DownLeft',ul:'UpLeft',c:'Center',ur:'UpRight',dr:'DownRight'})){
                stepDic['CAP_'+kind]=texture(noteskinPath+'/'+name+' HoldCap 6x1.PNG');
            }
        }

        this._textureDict['NOTESKINS'][noteskinId] = stepDic;

    }

    loadStageTextures(stagePath) {

        // Digits Normal
        this._textureDict['DN'] = new PNGTexture(stagePath + '/Combo numbers Normal 4x4_XX.png');

        // Digits Miss
        this._textureDict['DM'] = new PNGTexture(stagePath + '/Combo numbers Miss 4x4.png');

        // Combo
        this._textureDict['C'] = new PNGTexture(stagePath + '/Combo 1x2_XX_r.png');

        // Judgment
        this._textureDict['J'] = new PNGTexture(stagePath + '/Player_Judgment Rank 1x6_XX_r.png');



        // Life meter bar
        this._textureDict['SLBACK'] = new PNGTexture(stagePath + '/LifeMeterBar_S_Back 1x2.png');
        this._textureDict['SLBAR'] = new PNGTexture(stagePath + '/LifeMeterBar_S_Bar 1x2.png');
        this._textureDict['SLBARFX'] = new PNGTexture(stagePath + '/LifeMeterBar_S_Bar_FX.png');
        this._textureDict['SLBARFXRED'] = new PNGTexture(stagePath + '/LifeMeterBar_S_Bar_FX_Red.png');
        this._textureDict['SLFRONT'] = new PNGTexture(stagePath + '/LifeMeterBar_S_Front.png');

        this._textureDict['DLBACK'] = new PNGTexture(stagePath + '/LifeMeterBar_D_Back 1x2.png');
        this._textureDict['DLBAR'] = new PNGTexture(stagePath + '/LifeMeterBar_D_Bar 1x2.png');
        this._textureDict['DLBARFX'] = new PNGTexture(stagePath + '/LifeMeterBar_D_Bar_FX.png');
        this._textureDict['DLBARFXRED'] = new PNGTexture(stagePath + '/LifeMeterBar_D_Bar_FX_Red.png');
        this._textureDict['DLFRONT'] = new PNGTexture(stagePath + '/LifeMeterBar_D_Front.png');

        this._textureDict['LP'] = new PNGTexture(stagePath + '/pulse.png');
        this._textureDict['LT'] = new PNGTexture(stagePath + '/SG-TIP 1x2.png');


    }

    loadMaterials() {
        for (const [noteskinId, textureDict] of Object.entries(this._textureDict['NOTESKINS'])) {

            let materialsDict = {};

            // StepNotes
            materialsDict['SDL'] = new TransparentMaterial(textureDict['SDL'].map);
            materialsDict['SUL'] = new TransparentMaterial(textureDict['SUL'].map);
            materialsDict['SC'] = new TransparentMaterial(textureDict['SC'].map);
            materialsDict['SUR'] = new TransparentMaterial(textureDict['SUR'].map);
            materialsDict['SDR'] = new TransparentMaterial(textureDict['SDR'].map);
            for(const [kind,key] of Object.entries({dl:'SDL',ul:'SUL',ur:'SUR',dr:'SDR'})){
                this.animatePhoenixArrow(materialsDict[key].material,kind,noteskinId,false);
            }


            //Holds & EndNotes
            materialsDict['HDL'] = new TransparentMaterial(textureDict['HDL'].map);
            materialsDict['HUL'] = new TransparentMaterial(textureDict['HUL'].map);
            materialsDict['HC'] = new TransparentMaterial(textureDict['HC'].map);
            materialsDict['HUR'] = new TransparentMaterial(textureDict['HUR'].map);
            materialsDict['HDR'] = new TransparentMaterial(textureDict['HDR'].map);

            this._materialsDict['NOTESKINS'][noteskinId] = materialsDict;
        }


    }

    loadShaderMaterials() {
        // Background
        this._shadersDict['B'] = new BackgroundMaterial(this.resourcePath);

    }


    constructStepNote(kind, noteskinId) {
        const materialsDict = this._materialsDict['NOTESKINS'][noteskinId];
        switch (kind) {
            case 'dl':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry, materialsDict['SDL'].material);
                break;
            case 'ul':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry, materialsDict['SUL'].material);
                break;
            case 'c':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry, materialsDict['SC'].material);
                break;
            case 'ur':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry, materialsDict['SUR'].material);
                break;
            case 'dr':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry, materialsDict['SDR'].material);
                break;
        }
    }

    constructStepNoteCloned(kind, noteskinId) {
        const textureDict = this._textureDict['NOTESKINS'][noteskinId];
        switch (kind) {
            case 'dl':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new TransparentMaterial(textureDict['SDL'].cloneMap()).material);
                break;
            case 'ul':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new TransparentMaterial(textureDict['SUL'].cloneMap()).material);
                break;
            case 'c':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new TransparentMaterial(textureDict['SC'].cloneMap()).material);
                break;
            case 'ur':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new TransparentMaterial(textureDict['SUR'].cloneMap()).material);
                break;
            case 'dr':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new TransparentMaterial(textureDict['SDR'].cloneMap()).material);
                break;
        }
    }

    constructSLifeBarBack() {
        return new THREE.Mesh(this._geometryDict['L'].lifeBarGeometry,
            new TransparentMaterial(this._textureDict['SLBACK'].cloneMap()).material);
    }

    constructSLifeBarBar() {
        return new THREE.Mesh(this._geometryDict['L'].lifeBarGeometry,
            new TransparentMaterial(this._textureDict['SLBAR'].cloneMap()).material);
    }

    constructSLifeBarBarFX() {
        return new THREE.Mesh(this._geometryDict['L'].lifeBarGeometry,
            new AdditiveMaterial(this._textureDict['SLBARFX'].cloneMap()).material);
    }

    constructSLifeBarBarFXRed() {
        return new THREE.Mesh(this._geometryDict['L'].lifeBarGeometry,
            new AdditiveMaterial(this._textureDict['SLBARFXRED'].cloneMap()).material);
    }
    constructSLifeBarFront() {
        return new THREE.Mesh(this._geometryDict['L'].lifeBarGeometry,
            new TransparentMaterial(this._textureDict['SLFRONT'].cloneMap()).material);
    }

    constructDLifeBarBack() {
        return new THREE.Mesh(this._geometryDict['DL'].lifeBarGeometry,
            new TransparentMaterial(this._textureDict['DLBACK'].cloneMap()).material);
    }

    constructDLifeBarBar() {
        return new THREE.Mesh(this._geometryDict['DL'].lifeBarGeometry,
            new TransparentMaterial(this._textureDict['DLBAR'].cloneMap()).material);
    }

    constructDLifeBarBarFX() {
        return new THREE.Mesh(this._geometryDict['DL'].lifeBarGeometry,
            new AdditiveMaterial(this._textureDict['DLBARFX'].cloneMap()).material);
    }

    constructDLifeBarBarFXRed() {
        return new THREE.Mesh(this._geometryDict['DL'].lifeBarGeometry,
            new AdditiveMaterial(this._textureDict['DLBARFXRED'].cloneMap()).material);
    }
    constructDLifeBarFront() {
        return new THREE.Mesh(this._geometryDict['DL'].lifeBarGeometry,
            new TransparentMaterial(this._textureDict['DLFRONT'].cloneMap()).material);
    }


    constructLifeBarTip() {
        return new THREE.Mesh(this._geometryDict['T'].tipGeometry,
            new TransparentMaterial(this._textureDict['LT'].cloneMap()).material);
    }

    constructLifeBarPulse() {
        return new THREE.Mesh(this._geometryDict['P'].pulseGeometry,
            new TransparentMaterial(this._textureDict['LP'].cloneMap()).material);
    }

    constructBackground() {
        return new THREE.Mesh(this._geometryDict['B'].backgroundGeometry,
            this._shadersDict['B'].material);
    }

    constructGenericTap(noteskinId) {
        let tex = this._textureDict['NOTESKINS'][noteskinId]['T'].cloneMap();
        return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
            new TransparentMaterial(tex).material);
    }

    constructGenericWhiteTap(noteskinId) {
        let tex = this._textureDict['NOTESKINS'][noteskinId]['T'].cloneMap();
        return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
            new AdditiveMaterial(tex).material);
    }


    constructStepBounce(kind, noteskinId) {
        const textureDict = this._textureDict['NOTESKINS'][noteskinId];
        switch (kind) {
            case 'dl':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new AdditiveMaterial(textureDict['SDL'].cloneMap()).material);
                break;
            case 'ul':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new AdditiveMaterial(textureDict['SUL'].cloneMap()).material);
                break;
            case 'c':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new AdditiveMaterial(textureDict['SC'].cloneMap()).material);
                break;
            case 'ur':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new AdditiveMaterial(textureDict['SUR'].cloneMap()).material);
                break;
            case 'dr':
                return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
                    new AdditiveMaterial(textureDict['SDR'].cloneMap()).material);
                break;
        }
    }

    constructHoldExtensible(kind, noteskinId) {
        const materialsDict = this._materialsDict['NOTESKINS'][noteskinId];
        switch (kind) {
            case 'dl':
                return new THREE.Mesh(this._geometryDict['H'].holdGeometry, materialsDict['HDL'].material);
                break;
            case 'ul':
                return new THREE.Mesh(this._geometryDict['H'].holdGeometry, materialsDict['HUL'].material);
                break;
            case 'c':
                return new THREE.Mesh(this._geometryDict['H'].holdGeometry, materialsDict['HC'].material);
                break;
            case 'ur':
                return new THREE.Mesh(this._geometryDict['H'].holdGeometry, materialsDict['HUR'].material);
                break;
            case 'dr':
                return new THREE.Mesh(this._geometryDict['H'].holdGeometry, materialsDict['HDR'].material);
                break;
        }
    }

    phoenixArrowClock(kind) {
        this._phoenixArrowClocks ??= {};
        return this._phoenixArrowClocks[kind] ??= {value:0};
    }

    animatePhoenixArrow(material,kind,noteskinId,cap) {
        if(noteskinId!=='PHOENIX2'||kind==='c')return;
        const direction={dl:[-1,-1],ul:[-1,1],ur:[1,1],dr:[1,-1]}[kind];
        const clock=this.phoenixArrowClock(kind);
        material.userData.phoenixArrowClock=clock;
        material.onBeforeCompile=shader=>{
            shader.uniforms.phoenixArrowTime=clock;
            shader.uniforms.phoenixArrowDirection={value:new THREE.Vector2(...direction)};
            shader.uniforms.phoenixArrowGrid={value:new THREE.Vector2(cap?6:3,cap?1:2)};
            shader.uniforms.phoenixArrowCap={value:cap?1:0};
            shader.fragmentShader=`uniform float phoenixArrowTime;uniform vec2 phoenixArrowDirection;uniform vec2 phoenixArrowGrid;uniform float phoenixArrowCap;
                float phoenixInteriorMask(vec4 color){
                    float blue=(1.-smoothstep(.047,.173,color.r))*smoothstep(.099,.268,color.b);
                    float red=smoothstep(.388,.700,color.r)*(1.-smoothstep(.106,.173,color.b));
                    return mix(blue,red,step(0.,phoenixArrowDirection.y))*color.a;
                }
            `+shader.fragmentShader;
            shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
                vec2 arrowUv=fract(vUv*phoenixArrowGrid);
                vec2 arrowDirection=phoenixArrowDirection*.70710678;
                // Both copies move at the same constant speed. The resetting copy
                // has zero weight, eliminating the visible jump at the loop boundary.
                float phaseA=fract(phoenixArrowTime*.24);
                float phaseB=fract(phaseA+.5);
                float blend=.5+.5*cos(phaseA*6.28318530718);
                vec2 tile=floor(vUv*phoenixArrowGrid);
                vec2 uvA=clamp(arrowUv-arrowDirection*(phaseA-.5)*.26,vec2(.005),vec2(.995));
                vec2 uvB=clamp(arrowUv-arrowDirection*(phaseB-.5)*.26,vec2(.005),vec2(.995));
                vec4 colorA=mapTexelToLinear(texture2D(map,(tile+uvA)/phoenixArrowGrid));
                vec4 colorB=mapTexelToLinear(texture2D(map,(tile+uvB)/phoenixArrowGrid));
                float weightA=(1.-blend)*phoenixInteriorMask(colorA);
                float weightB=blend*phoenixInteriorMask(colorB);
                float coverage=weightA+weightB;
                vec3 movingArt=(colorA.rgb*weightA+colorB.rgb*weightB)/max(coverage,.0001);
                float arrowMask=phoenixInteriorMask(diffuseColor)*coverage;
                arrowMask*=1.-phoenixArrowCap*smoothstep(.74,.9,arrowUv.y);
                diffuseColor.rgb=mix(diffuseColor.rgb,movingArt,arrowMask);

            `);
        };
        material.customProgramCacheKey=()=> 'phoenix2-continuous-original-flow-v4';
    }

    constructHoldCap(kind,noteskinId) {
        const source=this._textureDict['NOTESKINS'][noteskinId]['CAP_'+kind];
        if(!source)return null;
        const texture=source.cloneMap();texture.repeat.set(1/6,1);
        const material=new TransparentMaterial(texture).material;
        this.animatePhoenixArrow(material,kind,noteskinId,true);
        return new THREE.Mesh(this._geometryDict['S'].stepGeometry,material);
    }

    constructJudgmentBanner() {

        let tex = this._textureDict['J'].cloneMap();
        return new THREE.Mesh(this._geometryDict['J'].judgmentGeometry,
            new TransparentMaterial(tex).material);

    }

    constructCombo() {
        return new THREE.Mesh(this._geometryDict['C'].comboGeometry,
            new TransparentMaterial(this._textureDict['C'].cloneMap()).material);
    }

    constructDigit() {
        return new THREE.Mesh(this._geometryDict['D'].digitGeometry,
            new TransparentMaterial(this._textureDict['DN'].cloneMap()).material);
    }

    constructReceptor(noteskinId) {

        let texture = this._textureDict['NOTESKINS'][noteskinId]['R'].cloneMap();
        return new THREE.Mesh(this._geometryDict['R'].receptorGeometry, new ReceptorMaterial(texture, this.resourcePath).material);

    }

    constructExplosion(noteskinId) {
        return new THREE.Mesh(this._geometryDict['S'].stepGeometry,
            new AdditiveMaterial(this._textureDict['NOTESKINS'][noteskinId]['FX'].cloneMap(), true).material);


    }


    getStepNoteTexture(kind, noteskinId) {

        let texture;
        const textureDict = this._textureDict['NOTESKINS'][noteskinId];

        switch (kind) {
            case 'dl':
                texture = textureDict['SDL'].map;
                break;
            case 'ul':
                texture = textureDict['SUL'].map;
                break;
            case 'c':
                texture = textureDict['SC'].map;
                break;
            case 'ur':
                texture = textureDict['SUR'].map;
                break;
            case 'dr':
                texture = textureDict['SDR'].map;
                break;
        }

        return texture;
    }

    getHoldExtensibleTexture(kind, noteskinId) {

        let texture;
        const textureDict = this._textureDict['NOTESKINS'][noteskinId];
        switch (kind) {
            case 'dl':
                texture = textureDict['HDL'].map;
                break;
            case 'ul':
                texture = textureDict['HUL'].map;
                break;
            case 'c':
                texture = textureDict['HC'].map;
                break;
            case 'ur':
                texture = textureDict['HUR'].map;
                break;
            case 'dr':
                texture = textureDict['HDR'].map;
                break;
        }
        return texture;
    }


}
