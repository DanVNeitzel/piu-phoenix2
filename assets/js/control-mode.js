/* The configured input mode follows the song through selection and results. */
(function(root){
  'use strict';
  function render(element,touch){
    if(!element)return;
    const label=touch?'TOUCHPAD':'TECLADO';
    const image=document.createElement('img');
    image.src='assets/img/elements/control-'+(touch?'pad':'keyboard')+'.svg';
    image.alt='';
    element.replaceChildren(image);
    element.classList.add('control-mode');
    element.setAttribute('aria-label','Controle: '+label.toLowerCase());
    element.title='Controle: '+label.toLowerCase();
  }
  root.PiuControlMode={render};
})(globalThis);
