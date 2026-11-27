/* The approved electric effect follows the real life bar inside the scene. */
class LFBarElectric extends GameObject {
    constructor(resourceManager,kind) {
        super(resourceManager);
        this._active=false;this._time=0;this._elapsed=0;this._life=0.5;
        const width=kind==='double'?8:4,height=68/194;
        // All expensive canvas strokes and blurs are baked at build time.
        // Changing a frame updates one uniform, never uploads another texture.
        this._texture=new THREE.TextureLoader().load('assets/img/gameplay/life-electric-'+(kind==='double'?'double':'single')+'.png');
        this._texture.minFilter=THREE.LinearFilter;
        this._texture.magFilter=THREE.LinearFilter;
        this._texture.generateMipmaps=false;
        this._motion=matchMedia('(prefers-reduced-motion:reduce)');
        const material=new THREE.ShaderMaterial({
            uniforms:{electricMap:{value:this._texture},electricFrame:{value:0},lifeFill:{value:this._life}},
            vertexShader:`varying vec2 electricUv;
                void main(){
                    electricUv=uv;
                    vec3 expanded=position;
                    expanded.xy*=vec2(1.12,2.8);
                    gl_Position=projectionMatrix*modelViewMatrix*vec4(expanded,1.0);
                }`,
            fragmentShader:`uniform sampler2D electricMap;
                uniform float electricFrame;uniform float lifeFill;varying vec2 electricUv;
                vec3 energyColor(float x){
                    if(x<.2)return mix(vec3(.929,.145,.980),vec3(.510,.239,1.),x/.2);
                    if(x<.4)return mix(vec3(.510,.239,1.),vec3(.188,.906,1.),(x-.2)/.2);
                    if(x<.6)return mix(vec3(.188,.906,1.),vec3(.443,1.,.969),(x-.4)/.2);
                    if(x<.78)return mix(vec3(.443,1.,.969),vec3(.941,1.,.690),(x-.6)/.18);
                    return mix(vec3(.941,1.,.690),vec3(1.,.345,.624),(x-.78)/.22);
                }
                void main(){
                    vec2 frame=vec2(mod(electricFrame,4.),5.-floor(electricFrame/4.));
                    vec4 energy=texture2D(electricMap,(frame+electricUv)/vec2(4.,6.));
                    vec3 color=energy.rgb*energy.a;float alpha=energy.a;
                    // The fill is separate from the baked arcs so every life change is immediate.
                    float x=(electricUv.x-.074107)/.851786;
                    if(x>=0.&&x<=lifeFill&&electricUv.y>=.410714&&electricUv.y<=.589286){
                        color=1.-(1.-color)*(1.-energyColor(x)*.8);
                        alpha=1.-(1.-alpha)*.2;
                    }
                    gl_FragColor=vec4(color,alpha);
                }`,
            transparent:true,depthWrite:false,depthTest:false,
            blending:THREE.CustomBlending,
            blendEquation:THREE.AddEquation,
            blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcColorFactor,
            blendSrcAlpha:THREE.OneFactor,blendDstAlpha:THREE.OneMinusSrcAlphaFactor
        });
        this._onMotionChange=()=>{if(this._active)this.paint();};
        this._motion.addEventListener('change',this._onMotionChange);
        material.addEventListener('dispose',()=>{
            this._motion.removeEventListener('change',this._onMotionChange);
            this._texture.dispose();
        });
        // Overscan happens only in the vertex shader. Layout measurements keep the
        // original bar bounds, so enabling the glow never shifts the field or HUD.
        this._mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
        this._mesh.position.z=.08;this._mesh.renderOrder=100;
        this._mesh.frustumCulled=false;this._mesh.visible=false;
    }
    setCombo(combo) {
        const active=Number(combo)>90;
        if(active===this._active)return;
        this._active=active;this._mesh.visible=active;
        if(active){this._time=0;this._elapsed=0;this.paint();}
    }
    setLife(value) {
        const life=Math.max(0,Math.min(1,Number(value)||0));
        if(life===this._life)return;
        this._life=life;
        if(this._active)this.paint();
    }
    paint() {
        const uniforms=this._mesh.material.uniforms;
        uniforms.electricFrame.value=this._motion.matches?0:Math.floor(this._time*15)%24;
        uniforms.lifeFill.value=this._life;
    }
    update(delta) {
        if(!this._active||this._motion.matches)return;
        const step=Math.max(0,Math.min(Number(delta)||0,.1));
        this._time+=step;this._elapsed+=step;
        if(this._elapsed>=1/15){this._elapsed%=1/15;this.paint();}
    }
    get object(){return this._mesh;}
}
