/* Active commands use the same labels in selection, confirmation and gameplay. */
(function(root) {
  'use strict';
  const commands = [
    {key:'vanish',label:'VANISH',category:'display'},
    {key:'fd',label:'FD',category:'display'},
    {key:'hj',label:'HJ',category:'judge'},
    {key:'randomNote',label:'RANDOM NOTE',category:'display'}
  ];
  function render(container, state, {tag = 'button', onSelect} = {}) {
    if (!container) return;
    for (const command of commands) {
      let block = container.querySelector('[data-active-modifier="' + command.key + '"]');
      if (!block) {
        block = document.createElement(tag);
        block.dataset.activeModifier = command.key;
        block.className = 'active-command';
        const label = document.createElement('small'); label.textContent = command.label;
        const value = document.createElement('strong'); value.textContent = 'ON';
        block.append(label, value);
        block.setAttribute('aria-label',command.label + ' ON');
        block.title = command.label + ' ON';
        if (tag === 'button') {
          block.type = 'button';
          block.dataset.commandCategory = command.category;
          block.setAttribute('data-bs-toggle','modal');
          block.setAttribute('data-bs-target','#commandWindow');
        }
        if (onSelect) {
          block.dataset.psCommand = command.category;
          block.tabIndex = 0; block.setAttribute('role','button');
          block.addEventListener('click',() => onSelect(command.category,block));
          block.addEventListener('keydown',event => {
            if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();onSelect(command.category,block);}
          });
        }
        container.append(block);
      }
      block.hidden = state?.[command.key] !== true;
    }
  }
  root.PiuActiveModifiers = {render};
})(globalThis);
