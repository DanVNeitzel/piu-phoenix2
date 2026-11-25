/* Size the note field in screen pixels; leave touchpad geometry to TouchInput. */
(function(root){
  'use strict';
  function screenBox(object,engine){
    const box=new THREE.Box3().setFromObject(object),points=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new THREE.Vector3(x,y,z).project(engine.camera);points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});
    }
    return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
  }
  function union(boxes){return{left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))};}
  function apply(engine){
    const stage=engine.stage?._playerStages[0];if(!stage?._lifeBar || !stage.padReceptors['0'])return;
    const object=stage._object,life=stage._lifeBar.object,w=innerWidth,h=innerHeight,landscape=w>h;
    const preferences=stage.keyListener.layoutPreferences?.[landscape?'landscape':'portrait'] || {};
    engine.scene.updateMatrixWorld(true);engine.camera.updateMatrixWorld(true);
    const receptors=()=>union(Object.values(stage.padReceptors).map(r=>screenBox(r._receptor,engine)));
    let gap=w-32;
    if(landscape){const pads=stage.keyListener.getVisiblePads();if(pads.length===2)gap=screenBox(pads[1].object,engine).left-screenBox(pads[0].object,engine).right-20;}
    const sidebar=document.getElementById('game-modifiers')?.getBoundingClientRect();
    const fieldLeft=sidebar?sidebar.right+8:16,fieldRight=w-12;
    const customWidth=preferences.fieldWidth!=null || preferences.lifeWidth!=null;
    const fieldCenter=landscape || customWidth?w/2:(fieldLeft+fieldRight)/2;
    const available=landscape?Math.max(120,w-2*fieldLeft):Math.max(120,fieldRight-fieldLeft);
    const baseTarget=Math.min(available,landscape?Math.min(Math.max(120,gap),h*.95,480):Math.min(w*.86,420));
    // Custom widths use the entire viewport, including the area behind the pads.
    const target=preferences.fieldWidth==null?baseTarget:w*preferences.fieldWidth;
    const current=receptors(),ratio=target/(current.right-current.left);
    object.scale.x*=ratio;object.scale.y*=ratio;
    if(!stage.lifeLayoutBase)stage.lifeLayoutBase={y:life.position.y,scaleX:life.scale.x,scaleY:life.scale.y};
    life.position.y=stage.lifeLayoutBase.y;life.scale.x=stage.lifeLayoutBase.scaleX;life.scale.y=stage.lifeLayoutBase.scaleY*baseTarget/target;
    engine.scene.updateMatrixWorld(true);
    const initialBar=screenBox(life,engine),barWidth=initialBar.right-initialBar.left;
    const requestedWidth=preferences.lifeWidth==null?Math.min(available,barWidth*baseTarget/target):w*preferences.lifeWidth;
    life.scale.x*=requestedWidth/barWidth;
    engine.scene.updateMatrixWorld(true);
    const minimumHeight=landscape?14:18,bar=screenBox(life,engine);
    if(bar.bottom-bar.top<minimumHeight)life.scale.y*=minimumHeight/(bar.bottom-bar.top);
    life.scale.y*=preferences.lifeHeight || 1;
    engine.scene.updateMatrixWorld(true);
    const worldPoint=(x,y,z)=>{const direction=new THREE.Vector3(x/w*2-1,1-y/h*2,.5).unproject(engine.camera).sub(engine.camera.position);return engine.camera.position.clone().addScaledVector(direction,(z-engine.camera.position.z)/direction.z);};
    const move=(node,dx,dy)=>{
      const position=node.getWorldPosition(new THREE.Vector3()),a=worldPoint(w/2,h/2,position.z),b=worldPoint(w/2+dx,h/2+dy,position.z);
      const delta=node.parent.worldToLocal(b).sub(node.parent.worldToLocal(a));node.position.add(delta);engine.scene.updateMatrixWorld(true);
    };
    const separation=receptors().top-screenBox(life,engine).bottom;
    if(separation<8)move(life,0,separation-8);
    const hud=[...document.querySelectorAll('.options-block-l,.game-top-controls')].map(e=>e.getBoundingClientRect());
    const finalBar=screenBox(life,engine),field=receptors();
    const shift=preferences.fieldY || 0;
    const dx=fieldCenter-(field.left+field.right)/2;
    // Automatic placement avoids only HUD items in the field's actual columns.
    const left=Math.min(finalBar.left,field.left)+dx,right=Math.max(finalBar.right,field.right)+dx;
    let defaultTop=4;
    for(const box of hud)if(left<box.right&&right>box.left)defaultTop=Math.max(defaultTop,box.bottom+8);
    const groupTop=Math.min(finalBar.top,field.top),groupBottom=Math.max(finalBar.bottom,field.bottom);
    // Manual offsets may pass behind the HUD; keep only the screen-edge limits.
    const top=Math.max(0,Math.min(Math.max(0,h-(groupBottom-groupTop)),defaultTop+shift*h));
    move(object,dx,top-groupTop);
    // Moving the field toward the top changes its projected size on the tilted
    // camera. Refit automatic widths there so they stay outside the sidebar.
    if(preferences.fieldWidth==null && preferences.lifeWidth==null){
      for(let pass=0;pass<3;pass++){
        const fieldBox=receptors(),barBox=screenBox(life,engine);
        const fit=Math.min(1,baseTarget/(fieldBox.right-fieldBox.left),available/(barBox.right-barBox.left));
        if(fit<.999){object.scale.x*=fit;object.scale.y*=fit;engine.scene.updateMatrixWorld(true);}
        const adjusted=receptors(),adjustedBar=screenBox(life,engine);
        move(object,fieldCenter-(adjusted.left+adjusted.right)/2,top-Math.min(adjusted.top,adjustedBar.top));
      }
    }
  }
  root.PiuGameplayLayout={apply,bounds:screenBox};
})(globalThis);
