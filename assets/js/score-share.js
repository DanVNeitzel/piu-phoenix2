/* Generate a complete result before sharing or downloading its PNG. */
(function(root){
  'use strict';
  const loading=document.createElement('div');
  loading.id='result-share-loading';loading.hidden=true;
  loading.setAttribute('role','status');loading.setAttribute('aria-live','polite');
  loading.setAttribute('data-html2canvas-ignore','true');
  loading.innerHTML='<div><span class="score-share-spinner" aria-hidden="true"></span><strong>Gerando imagem da pontuação</strong><p>Aguarde um instante…</p></div>';
  document.body.append(loading);
  const preview=document.createElement('dialog');
  preview.id='result-share-preview';
  preview.setAttribute('aria-labelledby','result-share-title');
  preview.setAttribute('data-html2canvas-ignore','true');
  preview.innerHTML='<header><h2 id="result-share-title">Sua pontuação</h2><button type="button" id="result-share-close" aria-label="Fechar prévia">×</button></header><div class="score-share-image"><img id="result-share-image" alt="Captura da tela de pontuação"></div><footer><p id="result-share-status" role="status" aria-live="polite"></p><div><button type="button" id="result-share-download">Baixar imagem</button><button type="button" id="result-share-send">Compartilhar</button></div></footer>';
  document.body.append(preview);
  const image=preview.querySelector('#result-share-image');
  const status=preview.querySelector('#result-share-status');
  const send=preview.querySelector('#result-share-send');
  const save=preview.querySelector('#result-share-download');
  let busy=false,sharing=false,cached=null;
  function key(){return document.getElementById('performance').dataset.resultVersion;}
  function canShare(file){
    if(!navigator.share)return false;
    try{return !navigator.canShare||navigator.canShare({files:[file]});}catch(_){return false;}
  }
  function download(capture){
    const link=document.createElement('a');link.href=capture.url;link.download=capture.file.name;
    document.body.append(link);link.click();link.remove();
  }
  function showPreview(capture){
    image.src=capture.url;image.alt='Pontuação: '+capture.text;
    send.disabled=!canShare(capture.file);
    status.textContent=send.disabled?'Compartilhamento indisponível neste navegador. Você pode baixar a imagem.':'Imagem pronta para baixar ou compartilhar.';
    if(!preview.open)preview.showModal();
  }
  async function share(){
    if(!cached || sharing || !canShare(cached.file))return;
    sharing=true;send.disabled=true;save.disabled=true;
    send.setAttribute('aria-busy','true');
    try{
      await navigator.share({files:[cached.file],title:'Pontuação PIUWEB',text:cached.text});
      status.textContent='Imagem compartilhada.';
    }catch(error){
      if(error.name==='AbortError')return;
      status.textContent='Não foi possível compartilhar. Tente novamente ou baixe a imagem.';
    }finally{
      sharing=false;send.disabled=!cached || !canShare(cached.file);save.disabled=false;
      send.removeAttribute('aria-busy');
    }
  }
  preview.querySelector('#result-share-close').addEventListener('click',()=>preview.close());
  save.addEventListener('click',()=>{if(cached && !sharing)download(cached);});
  send.addEventListener('click',share);
  function paint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
  async function capture(){
    if(busy||sharing||root.PiuResults.isLeaving?.()||!document.body.classList.contains('results-active'))return;
    const result=document.getElementById('performance'),version=key();
    const shareButton=document.getElementById('resultExport'),nextButton=document.getElementById('resultNext');
    const nextDisabled=nextButton.disabled;
    busy=true;shareButton.disabled=true;shareButton.setAttribute('aria-busy','true');nextButton.disabled=true;
    try{
      if(cached?.key===version){showPreview(cached);return;}
      loading.hidden=false;result.setAttribute('aria-busy','true');
      PiuResults.finishCount();await paint();
      if(document.fonts)await document.fonts.ready;
      const fullHeight=result.scrollHeight;
      const canvas=await html2canvas(result,{
        useCORS:true,scale:Math.min(devicePixelRatio||1,2),backgroundColor:'#03080b',height:fullHeight,imageTimeout:10000,
        onclone:async function(doc){
          const clone=doc.getElementById('performance');
          clone.classList.remove('results-revealing','results-leaving','awards-pending','awards-ready');
          clone.style.position='relative';clone.style.inset='auto';clone.style.height=fullHeight+'px';clone.style.overflow='visible';clone.scrollTop=0;
          clone.querySelector('.result-stage').style.minHeight=fullHeight+'px';
          clone.querySelector('.result-controls').style.position='static';
          clone.querySelectorAll('.result-background,.result-vignette').forEach(el=>el.style.position='absolute');
          clone.querySelectorAll('#resultNext,#resultExport').forEach(el=>el.style.visibility='hidden');
          const originals=[...result.querySelectorAll('img')];
          await Promise.all([...clone.querySelectorAll('img')].map(async (image,index)=>{
            if(image.hidden||!image.matches('.result-rank,.result-plate,.result-background,.result-modifier>img'))return;
            const size=image.classList.contains('result-background')?{width:result.clientWidth,height:fullHeight}:{};
            image.src=await PiuResults.exportGrade(originals[index],size);image.classList.remove('grade-broken');image.style.filter='none';await image.decode();
          }));
        }
      });
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG vazio.')),'image/png'));
      if(key()!==version||!document.body.classList.contains('results-active'))return;
      const title=document.getElementById('performanceSong').textContent||'PIUWEB';
      const filename=title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').trim()||'PIUWEB';
      const file=new File([blob],filename+'_pontuacao.png',{type:'image/png'});
      if(cached)URL.revokeObjectURL(cached.url);
      cached={key:version,file,url:URL.createObjectURL(file),text:title+' · '+document.getElementById('score').textContent+' pontos · '+document.getElementById('gradeResult').alt};
      loading.hidden=true;result.removeAttribute('aria-busy');showPreview(cached);
    }catch(error){
      console.error('Falha ao gerar imagem da pontuação:',error);
      showNotification('Não foi possível gerar a imagem da pontuação. Tente novamente.','error');
    }finally{
      loading.hidden=true;result.removeAttribute('aria-busy');shareButton.disabled=false;shareButton.removeAttribute('aria-busy');nextButton.disabled=nextDisabled;busy=false;
    }
  }
  window.addEventListener('pagehide',()=>{if(cached)URL.revokeObjectURL(cached.url);cached=null;});
  root.PiuScoreShare={capture,isBusy:()=>busy||sharing};
})(globalThis);
