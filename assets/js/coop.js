/* Chart ownership is data, never inferred from METER or the song title.
 * StepF2 symbols: github.com/RhythmLunatic/stepmania/wiki/Note-Types
 * Native SSC routine fields are separated by & (StepMania NoteDataUtil).
 */
(function(root){
  'use strict';
  const colors=['#ff3030','#00bfff','#ffe230','#35ed65'];
  const noteskin='FIESTA';
  const kinds=['dl','ul','c','ur','dr'];
  const symbols={X:1,x:1,Y:2,y:2,Z:3,z:3};
  const type=note=>typeof note==='object' && note ? note.type : note;
  function analyze(chart){
    const notes=(chart.NOTES || []).flat(2),players=new Set();
    notes.forEach(note=>{const player=note?.player || symbols[type(note)];if(player)players.add(player);});
    if([1,2,3].every(player=>players.has(player)) && notes.some(note=>!note?.player && ['1','2'].includes(type(note))))players.add(4);
    const routine=chart.SOURCE_STEPSTYPE==='pump-routine' || chart.STEPSTYPE==='pump-routine';
    if(!routine && !players.size)return null;
    if(routine && !notes.some(note=>symbols[type(note)]))for(let player=1;player<=Math.max(2,chart.ROUTINE_PLAYERS || 0);player++)players.add(player);
    return {players:[...players].sort((a,b)=>a-b),count:players.size,format:routine?'routine':'stepf2'};
  }
  function owner(note,coop){
    return note?.player || symbols[type(note)] || (coop?.players.includes(4) && ['1','2'].includes(type(note))?4:0);
  }
  function summaries(content){
    return content.replace(/\/\/[^\r\n]*/g,'').split(/#NOTEDATA\s*:\s*;/i).slice(1).map(section=>{
      const chart={STEPSTYPE:section.match(/#STEPSTYPE\s*:\s*([^;]*);/i)?.[1].trim(),
        METER:section.match(/#METER\s*:\s*([^;]*);/i)?.[1].trim()};
      const body=section.match(/#NOTES\s*:([\s\S]*?);/i)?.[1] || '';
      if(chart.STEPSTYPE==='pump-routine')chart.ROUTINE_PLAYERS=body.split('&').length;
      const fields=body.split('&').map(field=>[...field.matchAll(/\{([^}]*)\}|([0-9A-Za-z])/g)].map(match=>match[1]?match[1].split('|')[0]:match[2]));
      const stepf2=fields.length===1 && fields[0].some(note=>symbols[note]);
      chart.NOTES=[fields.flatMap((field,player)=>field.map(note=>({type:note,
        player:chart.STEPSTYPE==='pump-routine' && !stepf2 && !['0','3'].includes(note)?player+1:0})))];
      chart.COOP=analyze(chart);delete chart.NOTES;return chart;
    });
  }
  function parse(content,parser){
    // Parse each native player's field separately; merge at exact rational beats.
    const sections=content.replace(/\/\/[^\r\n]*/g,'').split(/#NOTEDATA\s*:\s*;/i);
    const native=[];
    const prepared=sections.map((section,index)=>{
      if(!index || !/#STEPSTYPE\s*:\s*pump-routine\s*;/i.test(section))return section;
      return section.replace(/#NOTES\s*:([\s\S]*?);/i,(_,body)=>{
        native[index-1]={section,fields:body.split('&')};
        return '#NOTES:'+body.split('&')[0]+';';
      });
    }).join('#NOTEDATA:;');
    const parsed=parser.parse(prepared);
    parsed.levels.forEach((chart,index)=>{
      const source=native[index];
      if(source){
        chart.SOURCE_STEPSTYPE='pump-routine';chart.STEPSTYPE='pump-double';
        chart.ROUTINE_PLAYERS=source.fields.length;
        if(source.fields.length>4)throw new Error('Routine suporta até quatro participantes nesta versão.');
        const playerCharts=source.fields.map(field=>parser.parse(sections[0]+'#NOTEDATA:;'+source.section.replace(/#NOTES\s*:[\s\S]*?;/i,'#NOTES:'+field+';')).levels[0]);
        chart.SPECIALNOTES=new Set(playerCharts.flatMap(player=>[...player.SPECIALNOTES]));
        const fields=playerCharts.map(player=>player.NOTES);
        const stepf2=fields.length===1 && fields[0].flat(2).some(note=>symbols[type(note)]);
        const gcd=(a,b)=>b?gcd(b,a%b):a;
        chart.NOTES=Array.from({length:Math.max(...fields.map(field=>field.length))},(_,bar)=>{
          const rows=fields.reduce((n,field)=>{const size=field[bar]?.length || 1;return n*size/gcd(n,size);},1);
          if(rows>65536)throw new Error('Resolução do chart Routine não suportada.');
          const measure=Array.from({length:rows},()=>Array(10).fill('0'));
          fields.forEach((field,player)=>{
            const sourceRows=field[bar] || [];
            sourceRows.forEach((row,r)=>row.forEach((note,lane)=>{
              if(type(note)==='0')return;
              const target=measure[r*rows/sourceRows.length];
              if(type(target[lane])!=='0')throw new Error('Chart Routine com notas sobrepostas no mesmo sensor.');
              target[lane]={...(typeof note==='object'?note:{type:note}),player:stepf2?0:player+1};
            }));
          });
          return measure;
        });
      }
      chart.COOP=analyze(chart);
    });
    return parsed;
  }
  const defaults=[['KeyZ','KeyQ','KeyS','KeyE','KeyC','KeyV','KeyR','KeyG','KeyY','KeyN'],
    ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'],
    ['KeyW','KeyA','KeyD','KeyF','KeyH','KeyJ','KeyK','KeyL','KeyT','KeyU'],
    ['KeyB','KeyI','KeyM','KeyO','KeyP','KeyX','Comma','Period','Minus','Equal']];
  function bindings(){
    try {const saved=JSON.parse(localStorage.getItem('piu_coop_keys'));if(validBindings(saved))return saved;}catch(_){}
    return defaults.map(row=>row.slice());
  }
  function validBindings(value){
    return Array.isArray(value) && value.length===4 && value.every(row=>Array.isArray(row) && row.length===10 && row.every(code=>/^(Key[A-Z]|Digit[0-9]|Comma|Period|Minus|Equal|Semicolon|Quote|BracketLeft|BracketRight|Backslash|IntlBackslash)$/.test(code))) && new Set(value.flat()).size===40;
  }
  function legend(holder,coop){
    holder.replaceChildren();holder.hidden=!coop;if(!coop)return;
    coop.players.forEach(player=>{const item=document.createElement('span');item.textContent='P'+player;item.style.color=colors[player-1];holder.append(item);});
  }
  function controls(coop,onSave){
    const dialog=document.createElement('dialog');dialog.className='coop-controls';
    const title=document.createElement('h2');title.textContent='CO-OP · '+coop.count+' jogadores';
    const help=document.createElement('p');help.textContent='Plataforma de 10 sensores compartilhada, com vida e pontuação da equipe. No touch, todos usam os mesmos sensores. No teclado, cada participante pode usar os dois lados. Clique em uma tecla para alterar.';
    const error=document.createElement('p');error.setAttribute('role','alert');
    const maps=bindings();let capture=null;
    const punctuation={Comma:',',Period:'.',Minus:'-',Equal:'=',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Backslash:'\\',IntlBackslash:'\\'};
    const label=code=>punctuation[code] || code.replace(/^Key|^Digit/,'');
    dialog.append(title,help);
    coop.players.forEach(player=>{
      const group=document.createElement('fieldset'),heading=document.createElement('legend');heading.textContent='P'+player;heading.style.color=colors[player-1];group.append(heading);
      maps[player-1].forEach((code,lane)=>{
        const button=document.createElement('button');button.type='button';
        const sensor=(lane<5?'E ':'D ')+['↙','↖','●','↗','↘'][lane%5];
        button.textContent=sensor+' '+label(code);button.setAttribute('aria-label','P'+player+', '+sensor+', '+label(code));
        button.onclick=()=>{capture={player,lane,button,sensor};error.textContent='Pressione a nova tecla (Esc cancela).';};group.append(button);
      });dialog.append(group);
    });
    const close=document.createElement('button');close.type='button';close.textContent='SALVAR E VOLTAR';
    close.onclick=()=>{try{localStorage.setItem('piu_coop_keys',JSON.stringify(maps));onSave?.(maps);dialog.close();}catch(_){error.textContent='Não foi possível salvar os controles.';}};
    dialog.append(error,close);document.body.append(dialog);
    const keydown=event=>{
      if(!dialog.open)return;
      event.stopImmediatePropagation();
      if(event.key==='Escape'){if(capture){event.preventDefault();capture=null;error.textContent='';}return;}
      if(!capture)return;
      event.preventDefault();
      const candidate=maps.map(row=>row.slice());candidate[capture.player-1][capture.lane]=event.code;
      if(!validBindings(candidate)){error.textContent='Use uma letra, número ou pontuação que ainda não esteja em uso.';return;}
      maps[capture.player-1][capture.lane]=event.code;capture.button.textContent=capture.sensor+' '+label(event.code);
      capture.button.setAttribute('aria-label','P'+capture.player+', '+capture.sensor+', '+label(event.code));capture=null;error.textContent='';
    };
    window.addEventListener('keydown',keydown,true);
    dialog.addEventListener('close',()=>{window.removeEventListener('keydown',keydown,true);dialog.remove();},{once:true});dialog.showModal();
  }
  const tintCache=new WeakMap();
  function tint(object,player){
    if(!colors[player-1])return;
    object.traverse(mesh=>{
      if(!mesh.material)return;
      function material(source){
        let cache=tintCache.get(source);if(!cache){cache=new Map();tintCache.set(source,cache);}
        if(!cache.has(player)){
          const value=source.clone();value.color.set(colors[player-1]);
          value.onBeforeCompile=shader=>{
            shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
              '#ifdef USE_MAP\n'+
              'vec4 texelColor=mapTexelToLinear(texture2D(map,vUv));\n'+
              'float hi=max(max(texelColor.r,texelColor.g),texelColor.b);\n'+
              'float lo=min(min(texelColor.r,texelColor.g),texelColor.b);\n'+
              'float fill=smoothstep(0.08,0.28,(hi-lo)/max(hi,0.0001));\n'+
              'vec3 neutral=vec3(dot(texelColor.rgb,vec3(0.299,0.587,0.114)));\n'+
              'diffuseColor.rgb=mix(neutral,diffuseColor.rgb*(0.35+0.65*hi),fill);\n'+
              'diffuseColor.a*=texelColor.a;\n#endif');
          };
          value.customProgramCacheKey=()=> 'coop-white-outline-v2';cache.set(player,value);
        }
        return cache.get(player);
      }
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(material):material(mesh.material);
    });
  }
  function neutralReceptor(mesh){
    const material=mesh.material.clone();
    // Keep the loader-owned texture: a clone made before its image arrives would
    // never receive PNGTexture's asynchronous image update.
    material.uniforms.textureReceptor.value=mesh.material.uniforms.textureReceptor.value;
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace(/}\s*$/,
        'gl_FragColor.rgb=vec3(dot(gl_FragColor.rgb,vec3(0.299,0.587,0.114)));\n}');
    };
    material.customProgramCacheKey=()=> 'coop-neutral-receptor-v1';
    material.userData.coopNeutralReceptor=true;mesh.material=material;
  }
  root.PiuCoop={analyze,owner,parse,summaries,type,colors,noteskin,kinds,bindings,validBindings,legend,controls,tint,neutralReceptor};
  if(typeof module!=='undefined')module.exports=root.PiuCoop;
})(globalThis);
