// Local edition: no account or authentication requests.
function formatMilhar(value) {return Number(value || 0).toLocaleString('pt-BR');}
function formatDate(value) {
  const [year,month,day] = String(value).split('-').map(Number);
  const date = new Date(year,month - 1,day);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR',{year:'numeric',month:'long',day:'numeric'});
}
function renderChangelog(data) {
  const content = document.getElementById('changelogContent');
  content.replaceChildren();
  const release = document.createElement('div');release.className='changelog-release';
  const badge = document.createElement('strong');badge.className='changelog-version';badge.textContent='VERSÃO '+data.version;
  const date = document.createElement('time');date.dateTime=data.date;date.textContent=formatDate(data.date);
  release.append(badge,date);content.append(release);
  const grid = document.createElement('div');grid.className='changelog-grid';
  for (const category of data.updates || []) {
    const section=document.createElement('section');section.className='changelog-card';
    const title=document.createElement('h3');title.textContent=category.category;
    const list=document.createElement('ul');
    for (const item of category.items || []) {const li=document.createElement('li');li.textContent=item;list.append(li);}
    section.append(title,list);grid.append(section);
  }
  content.append(grid);
  if (data.notes?.length) {
    const section=document.createElement('section');section.className='changelog-notes';
    const title=document.createElement('h3');title.textContent='Informações';
    const list=document.createElement('ul');
    for (const note of data.notes) {const li=document.createElement('li');li.textContent=note;list.append(li);}
    section.append(title,list);content.append(section);
  }
}
let changelogRequest = 0;
async function loadChangelog(manual = false) {
  if (!manual && localStorage.getItem('dontShowChangelog') === 'true') return;
  const modal=document.getElementById('changelogModal');
  const content=document.getElementById('changelogContent');
  document.getElementById('dontShowChangelogAgain').checked=localStorage.getItem('dontShowChangelog') === 'true';
  await Promise.all([...document.querySelectorAll('.modal.show')].filter(node=>node!==modal).map(node=>new Promise(resolve=>{
    node.addEventListener('hidden.bs.modal',resolve,{once:true});bootstrap.Modal.getOrCreateInstance(node).hide();
  })));
  const request=++changelogRequest;
  content.replaceChildren();content.setAttribute('aria-busy','true');
  const loading=document.createElement('p');loading.className='changelog-message';loading.textContent='Carregando novidades…';content.append(loading);
  bootstrap.Modal.getOrCreateInstance(modal).show();
  try {
    const response=await fetch('changelog.json',{cache:'no-store'});
    if (!response.ok) throw new Error('HTTP '+response.status);
    const data=await response.json();
    if (request===changelogRequest) {renderChangelog(data);content.scrollTop=0;}
  } catch (error) {
    if (request!==changelogRequest) return;
    content.replaceChildren();
    const message=document.createElement('p');message.className='changelog-message';message.setAttribute('role','alert');message.textContent='Não foi possível carregar as novidades. Tente novamente.';
    const retry=document.createElement('button');retry.type='button';retry.className='changelog-button';retry.textContent='Tentar novamente';retry.addEventListener('click',openChangelog);
    content.append(message,retry);
    console.error('Erro ao carregar changelog:',error);
  } finally {if(request===changelogRequest)content.removeAttribute('aria-busy');}
}
function showChangelogModal() {return loadChangelog(false);}
function openChangelog() {return loadChangelog(true);}
function closeChangelog() {bootstrap.Modal.getOrCreateInstance(document.getElementById('changelogModal')).hide();}
document.getElementById('changelogModal').addEventListener('hide.bs.modal',()=>{
  ++changelogRequest;
  document.getElementById('changelogContent').removeAttribute('aria-busy');
  localStorage.setItem('dontShowChangelog',String(document.getElementById('dontShowChangelogAgain').checked));
});
