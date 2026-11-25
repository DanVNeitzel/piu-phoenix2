/* Adapt the original Phoenix interface to local play without account requests. */
'use strict';
function getInfoPlayer() {
  const text = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  ['nameUserGame','nameUserLogin','nameUser'].forEach(id => text(id, 'PIUWeb'));
  ['levelUserGame','levelUserLogin','levelUser'].forEach(id => text(id, 'SINGLE PLAYER'));
  const history = getHistory();
  text('expText', formatMilhar(history.length) + ' PLAYS');
  text('songsCount', formatMilhar(localStorage.getItem('last_playCount') || history.length));
  text('expUser', 'OFFLINE');
  document.querySelectorAll('[id^="personal_"]').forEach(el => {
    const grade = el.id.slice('personal_'.length);
    el.textContent = history.filter(h => LocalRecords.grade(Number(formatScore(h.score))).replace(/\+/g, '_plus') === grade).length;
  });
  let records = [];
  try { records = LocalRecords.read(); } catch (error) { showNotification('Não foi possível ler os recordes locais.', 'error'); }
  text('singleTotalScore', formatMilhar(records.filter(r => r.type === 'pump-single').reduce((sum,r) => sum + r.score, 0)));
  text('doubleTotalScore', formatMilhar(records.filter(r => r.type !== 'pump-single').reduce((sum,r) => sum + r.score, 0)));
  const plates = {perfect_game:'PG',ultimate_game:'UG',extreme_game:'EG',superb_game:'SG',marvelous_game:'MG',talented_game:'TG',rough_game:'RG',fair_game:'FG'};
  Object.entries(plates).forEach(([id,plate]) => text('plate_' + id, history.filter(h => h.plate === plate).length));
}
getInfoPlayer();
// Keep local history accessible without the old guest restrictions.
playerHistory.classList.remove('hide');
playerDetails.classList.remove('hide');
// Account data from older installations must not enable online modes.
['current_email','current_senha','current_username'].forEach(key => sessionStorage.removeItem(key));
// Keep the original two record panels, now backed entirely by local data.
document.querySelectorAll('.fw-bold').forEach(el => {
  if (el.textContent.trim() === 'GLOBAL RECORD') el.textContent = 'LOCAL RECORD';
});
const modeFilter = document.getElementById('filterGameMode');
if (modeFilter) [...modeFilter.options].filter(o => ['battle','challenge'].includes(o.value)).forEach(o => o.remove());
// Restore the results screen after returning from the game in this tab.
document.addEventListener('DOMContentLoaded', function () {
try {
  const result = JSON.parse(sessionStorage.getItem('piu_single_result') || 'null');
  if (result?.performance && result.config) {
    document.querySelector('.black_screen').style.display = 'none';
    receiveOfflineResult(result);
    sessionStorage.removeItem('piu_single_result');
  } else if (location.hash === '#selection') {
    history.replaceState(null, '', location.pathname + location.search);
    loginContinue();
  }
} catch(error) { showNotification('Não foi possível recuperar o resultado local.', 'error'); }
});
