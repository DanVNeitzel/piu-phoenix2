/* The approved electric effect follows the real life bar inside the scene. */
class LFBarElectric extends GameObject {
    constructor(resourceManager,kind) {
        super(resourceManager);
        this._active=false;this._time=0;this._elapsed=0;this._life=0.5;
        const width=kind==='double'?8:4,height=68/194;
        this._canvas=document.createElement('canvas');
        this._canvas.width=1024;
        this._canvas.height=Math.ceil(1024/(width/height*1.12/2.8));
        this._context=this._canvas.getContext('2d');
        this._texture=new THREE.CanvasTexture(this._canvas);
        this._texture.minFilter=THREE.LinearFilter;
        this._texture.magFilter=THREE.LinearFilter;
        this._texture.generateMipmaps=false;
        this._motion=matchMedia('(prefers-reduced-motion:reduce)');
        const material=new THREE.ShaderMaterial({
            uniforms:{electricMap:{value:this._texture}},
            vertexShader:`varying vec2 electricUv;
                void main(){
                    electricUv=uv;
                    vec3 expanded=position;
                    expanded.xy*=vec2(1.12,2.8);
                    gl_Position=projectionMatrix*modelViewMatrix*vec4(expanded,1.0);
                }`,
            fragmentShader:`uniform sampler2D electricMap;varying vec2 electricUv;
                void main(){
                    vec4 energy=texture2D(electricMap,electricUv);
                    gl_FragColor=vec4(energy.rgb*energy.a,energy.a);
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
        const w=this._canvas.width,h=this._canvas.height;
        this._context.clearRect(0,0,w,h);
        PiuLifeElectric.draw(this._context,{
            x:w*(1-1/1.12)/2,y:h*(1-1/2.8)/2,
            width:w/1.12,height:h/2.8
        },this._motion.matches?0:this._time,this._life);
        this._texture.needsUpdate=true;
    }
    update(delta) {
        if(!this._active||this._motion.matches)return;
        const step=Math.max(0,Math.min(Number(delta)||0,.1));
        this._time+=step;this._elapsed+=step;
        if(this._elapsed>=1/30){this._elapsed%=1/30;this.paint();}
    }
    get object(){return this._mesh;}
}
