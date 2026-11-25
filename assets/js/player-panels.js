/* Local profile and paged history share a responsive Phoenix panel. */
(function(root){
  'use strict';
  const byId=id=>document.getElementById(id), profile=byId('playerDetailsWindow'), historyPanel=byId('historyModal');
  const pageSize=20;let page=1;
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const number=value=>{if(value==null||String(value).trim()==='')return null;const s=typeof value==='number'?value:Number(String(value).replace(/[.,\s]/g,''));return Number.isFinite(s)&&s>=0?s:null;};
  const count=value=>Math.floor(number(value) || 0),fmt=value=>Number(value || 0).toLocaleString('pt-BR');
  function score(value){const n=number(value);return n!==null&&n<=1000000?Math.floor(n):null;}
  function date(value){if(!value)return null;let s=String(value);if(/^\d{4}-\d\d-\d\d \d\d:/.test(s))s=s.replace(' ','T')+'Z';const d=new Date(s);return Number.isFinite(d.getTime())?d:null;}
  function normalize(raw,index){
    const points=score(raw.score),broken=LocalRecords.isBroken(raw),passed=!broken&&raw.passed!==false&&points!==null&&points>0;
    const type=String(raw.step_type || raw.type || '');
    return{raw,index,points,broken,passed,type,style:type.includes('half')?'half':type.includes('double')?'double':type.includes('single')?'single':'unknown',level:count(raw.song_level ?? raw.level),title:String(raw.title || 'Música sem título'),artist:String(raw.artist || ''),date:date(raw.played_at || raw.date)};
  }
  function readHistory(){const rows=JSON.parse(localStorage.getItem('piu_history') || '[]');if(!Array.isArray(rows))throw new Error('Histórico inválido');return rows.filter(r=>r&&typeof r==='object').map(normalize);}
  const styleName=r=>({single:'Single',double:'Double',half:'Half Double',unknown:'Estilo não informado'})[r.style];
  const outcome=r=>r.broken?'STAGE BREAK OFF':r.passed?'STAGE PASS':'SEM RESULTADO';
  const dateText=r=>r.date?r.date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Data não informada';
  function switchPanel(from,to){from.addEventListener('hidden.bs.modal',()=>bootstrap.Modal.getOrCreateInstance(to).show(),{once:true});bootstrap.Modal.getInstance(from)?.hide();}
  for(const [panel,title,kind]of[[profile,'Perfil do jogador','profile'],[historyPanel,'Histórico de partidas','history']]){
    panel.classList.remove('fade','text-center');panel.classList.add('player-panel');panel.tabIndex=-1;panel.setAttribute('aria-labelledby',kind+'-panel-title');
    panel.querySelector('.modal-content').innerHTML='<header class="pp-header"><div><span>PIUWEB · SINGLE PLAYER</span><h2 id="'+kind+'-panel-title">'+title+'</h2></div><button type="button" class="pp-close" data-bs-dismiss="modal" aria-label="Fechar '+title.toLowerCase()+'">×</button></header><nav class="pp-tabs" aria-label="Dados do jogador"><button type="button" data-view="profile" aria-pressed="'+(kind==='profile')+'">Perfil</button><button type="button" data-view="history" aria-pressed="'+(kind==='history')+'">Histórico</button></nav><div class="pp-body" id="'+kind+'-panel-body"></div><footer class="pp-footer"><div id="'+kind+'-panel-footer"></div><button type="button" class="pp-done" data-bs-dismiss="modal">Fechar</button></footer>';
    panel.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{const target=button.dataset.view==='profile'?profile:historyPanel;if(target!==panel)switchPanel(panel,target);});
    panel.addEventListener('shown.bs.modal',()=>{panel.querySelector('.pp-body').scrollTop=0;panel.querySelector('.pp-close').focus();});
  }
  byId('profile-panel-footer').textContent='Dados salvos neste navegador.';
  const historyBody=byId('history-panel-body');
  historyBody.innerHTML='<div class="ph-filters"><label class="ph-search">Buscar música<input type="search" id="ph-search" placeholder="Nome ou artista" autocomplete="off"></label><label>Estilo<select id="filterStepType"><option value="all">Todos</option><option value="single">Single</option><option value="double">Double</option><option value="half">Half Double</option></select></label><label>Nível<select id="filterLevel"><option value="all">Todos</option><option value="1-5">1–5</option><option value="6-10">6–10</option><option value="11-15">11–15</option><option value="16-20">16–20</option><option value="21-99">21+</option></select></label><label>Resultado<select id="ph-outcome"><option value="all">Todos</option><option value="pass">Stage Pass</option><option value="break">Stage Break Off</option><option value="empty">Sem resultado</option></select></label><label>Ordenação<select id="ph-sort"><option value="recent">Mais recentes</option><option value="score">Maior pontuação</option></select></label><button type="button" id="ph-reset">Limpar filtros</button></div><p id="ph-summary" role="status" aria-live="polite"></p><div id="historyContentHolder" class="ph-list"></div>';
  byId('history-panel-footer').innerHTML='<div class="ph-pagination"><button type="button" id="ph-prev" aria-label="Página anterior">‹</button><span id="ph-page"></span><button type="button" id="ph-next" aria-label="Próxima página">›</button></div>';
  const extras=make('div','ph-extra-filters');extras.id='ph-extra-filters';extras.hidden=true;
  historyBody.querySelectorAll('.ph-filters select').forEach(select=>extras.append(select.parentElement));extras.append(byId('ph-reset'));
  const toggle=make('button','ph-filter-toggle','Filtros e ordenação');toggle.type='button';toggle.setAttribute('aria-controls',extras.id);toggle.setAttribute('aria-expanded','false');
  toggle.onclick=()=>{extras.hidden=!extras.hidden;toggle.setAttribute('aria-expanded',String(!extras.hidden));};
  historyBody.querySelector('.ph-filters').append(toggle,extras);
  function resetPage(){page=1;renderHistory();}
  historyBody.querySelectorAll('select').forEach(e=>e.addEventListener('change',resetPage));byId('ph-search').addEventListener('input',resetPage);
  byId('ph-reset').onclick=()=>{byId('ph-search').value='';historyBody.querySelectorAll('select').forEach(e=>e.selectedIndex=0);resetPage();};
  byId('ph-prev').onclick=()=>{page--;renderHistory();historyBody.scrollTop=0;};byId('ph-next').onclick=()=>{page++;renderHistory();historyBody.scrollTop=0;};
  function empty(holder,title,description){const box=make('div','pp-empty');box.append(make('h3','',title),make('p','',description));holder.append(box);}
  function card(r){
    const article=make('article','ph-card'),head=make('div','ph-card-head'),orb=make('div','ph-orb '+(r.style==='single'?'':'ph-double'));
    orb.append(make('span','',r.style==='single'?'SINGLE':r.style==='half'?'HALF':r.style==='double'?'DOUBLE':'—'),make('strong','',r.level?String(r.level).padStart(2,'0'):'—'));
    const identity=make('div','ph-identity');identity.append(make('h3','',r.title),make('p','',r.artist || styleName(r)),make('time','',dateText(r)),make('span','ph-outcome '+(r.broken?'is-broken':r.passed?'is-pass':''),outcome(r)));
    const result=make('div','ph-card-result');result.append(make('strong','ph-score',r.points===null?'—':String(r.points).padStart(7,'0')));
    if(r.points!==null){const grade=make('img','ph-grade');PiuResults.rank(grade,LocalRecords.grade(r.points),r.broken);if(!r.passed&&!r.broken)grade.alt=LocalRecords.grade(r.points)+' — Sem resultado';grade.loading='lazy';result.append(grade);}
    if(r.passed&&r.raw.plate){const plate=make('img','ph-plate');PiuResults.plate(plate,r.raw.plate);plate.loading='lazy';result.append(plate);}
    head.append(orb,identity,result);article.append(head);
    const details=make('details','ph-details');details.append(make('summary','','Julgamentos e comandos'));
    const values=make('dl','ph-judgments');
    for(const [label,value]of[['Perfect',r.raw.perfects??r.raw.performance?.p],['Great',r.raw.greats??r.raw.performance?.gr],['Good',r.raw.goods??r.raw.performance?.go],['Bad',r.raw.bads??r.raw.performance?.b],['Miss',r.raw.misses??r.raw.performance?.m],['Max combo',r.raw.max_combo??r.raw.maxCombo??r.raw.combo??r.raw.performance?.maxCombo]]){const cell=make('div');cell.append(make('dt','',label),make('dd','',value==null?'—':fmt(count(value))));values.append(cell);}
    const playback=Number(r.raw.playback ?? r.raw.config?.playback);
    const speed=r.raw.song_speed || (r.raw.config?.scrollMode==='auto'?'AV '+r.raw.config.autoVelocity:r.raw.config?.speed?'X'+r.raw.config.speed:r.raw.speed || '—');
    details.append(values,make('p','ph-commands',styleName(r)+' · Velocidade '+speed+' · Rush '+(Number.isFinite(playback)&&playback>0?Math.round(playback*100)+'%':r.raw.songRush || '—')));article.append(details);return article;
  }
  function renderHistory(){
    const holder=byId('historyContentHolder');holder.replaceChildren();let rows;
    try{rows=readHistory();}catch(_){empty(holder,'Histórico indisponível','Não foi possível ler os dados locais. Nenhum dado foi alterado.');byId('ph-summary').textContent='Erro ao ler histórico';byId('ph-page').textContent='0 / 0';byId('ph-prev').disabled=byId('ph-next').disabled=true;return;}
    const q=byId('ph-search').value.trim().toLocaleLowerCase('pt-BR'),style=byId('filterStepType').value,range=byId('filterLevel').value,result=byId('ph-outcome').value;
    const activeFilters=[style!=='all',range!=='all',result!=='all',byId('ph-sort').value!=='recent'].filter(Boolean).length;
    toggle.textContent='Filtros e ordenação'+(activeFilters?' · '+activeFilters+' ativos':'');
    const list=rows.filter(r=>{if(q&&!(r.title+' '+r.artist).toLocaleLowerCase('pt-BR').includes(q))return false;if(style!=='all'&&r.style!==style)return false;if(range!=='all'){const [min,max]=range.split('-').map(Number);if(r.level<min||r.level>max)return false;}return result==='all'||result==='pass'&&r.passed||result==='break'&&r.broken||result==='empty'&&!r.passed&&!r.broken;});
    list.sort(byId('ph-sort').value==='score'?(a,b)=>(b.points??-1)-(a.points??-1)||a.index-b.index:(a,b)=>(b.date?.getTime()||0)-(a.date?.getTime()||0)||a.index-b.index);
    const pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.max(1,Math.min(page,pages));const start=(page-1)*pageSize;
    byId('ph-summary').textContent=list.length?(start+1)+'–'+Math.min(start+pageSize,list.length)+' de '+list.length+' partidas · '+rows.length+' no histórico':'0 partidas encontradas';
    byId('ph-page').textContent=list.length?page+' / '+pages:'0 / 0';byId('ph-prev').disabled=page<=1;byId('ph-next').disabled=page>=pages;
    if(!list.length)empty(holder,rows.length?'Nenhuma partida encontrada':'Seu histórico começa aqui',rows.length?'Tente outra busca ou limpe os filtros.':'Conclua uma música para ver sua pontuação e julgamentos.');
    else holder.append(...list.slice(start,start+pageSize).map(card));
  }
  function renderProfile(){
    const body=byId('profile-panel-body');body.replaceChildren();let rows=[],records=[],error=false;
    try{rows=readHistory();records=LocalRecords.read().filter(r=>!LocalRecords.isBroken(r)&&r.passed!==false);}catch(_){error=true;}
    const identity=make('section','pp-identity');const avatar=make('img');avatar.src=byId('profileUserGame').src;avatar.alt='Avatar do jogador';const name=make('div');name.append(make('h3','',byId('nameUserGame').textContent || 'PIUWEB'),make('p','','SINGLE PLAYER · PERFIL LOCAL'));identity.append(avatar,name);body.append(identity);
    if(error){const message=make('p','pp-error','Não foi possível ler todos os dados locais. Nenhum dado foi alterado.');message.setAttribute('role','alert');body.append(message);}
    const passes=rows.filter(r=>r.passed),metrics=make('section','pp-metrics');metrics.setAttribute('aria-label','Resumo do jogador');
    let plays=rows.length;try{plays=Math.max(rows.length,count(localStorage.getItem('last_playCount')));}catch(_){}
    const combo=Math.max(0,...rows.map(r=>count(r.raw.max_combo??r.raw.combo??r.raw.performance?.maxCombo)));
    for(const [label,value]of[['Partidas jogadas',plays],['Músicas com recorde',records.length],['Stage Pass no histórico',passes.length],['Maior combo no histórico',combo]]){const metric=make('div');metric.append(make('strong','',fmt(value)),make('span','',label));metrics.append(metric);}body.append(metrics);
    const columns=make('div','pp-profile-grid'),styles=make('section','pp-section');styles.append(make('h3','','Recordes por estilo'),make('p','pp-muted','Soma dos recordes salvos em cada estilo.'));
    for(const [label,subset]of[['Single',records.filter(r=>r.type==='pump-single')],['Double / Half Double',records.filter(r=>r.type!=='pump-single')]]){const line=make('div','pp-style');line.append(make('strong','',label),make('span','',fmt(subset.length)+(subset.length===1?' música':' músicas')),make('b','',fmt(subset.reduce((sum,r)=>sum+r.score,0))+' pontos'));styles.append(line);}
    const grades=make('section','pp-section');grades.append(make('h3','','Notas em Stage Pass'),make('p','pp-muted','Distribuição das partidas mantidas no histórico.'));const gradeGrid=make('div','pp-grade-grid');
    for(const grade of ['SSS+','SSS','SS+','SS','S+','S','AAA+','AAA','AA+','AA','A+','A','B','C','D','F']){const item=make('div');item.append(make('strong','',grade),make('span','',fmt(passes.filter(r=>LocalRecords.grade(r.points)===grade).length)));gradeGrid.append(item);}grades.append(gradeGrid);columns.append(styles,grades);body.append(columns);
    const plates=make('section','pp-section');plates.append(make('h3','','Plates conquistadas'),make('p','pp-muted','Somente partidas com Stage Pass no histórico.'));const plateGrid=make('div','pp-plate-grid');
    for(const code of ['UG','PG','EG','SG','MG','TG','FG','RG']){const item=make('div'),image=make('img');PiuResults.plate(image,code);image.loading='lazy';item.append(image,make('strong','',fmt(passes.filter(r=>r.raw.plate===code).length)));plateGrid.append(item);}plates.append(plateGrid);body.append(plates);
    if(!rows.length&&!records.length)empty(body,'Nenhum resultado salvo','Conclua uma música para preencher seu perfil.');
  }
  profile.addEventListener('show.bs.modal',renderProfile);historyPanel.addEventListener('show.bs.modal',renderHistory);
  root.PiuPlayerPanels={profile:renderProfile,history:renderHistory};
})(globalThis);
