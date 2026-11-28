/* Guided timing calibration using the same offset and input compensation as gameplay. */
(() => {
  'use strict';

  const interval = 0.6; // 100 BPM
  const countIn = 4;
  const sampleCount = 12;
  const minimumSamples = 8;
  const maxTapError = 0.25;
  const maxSpread = 0.045;

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return (sorted[middle] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2;
  }

  function ms(seconds) {
    const value = Math.round(seconds * 1000);
    return (value > 0 ? '+' : '') + value + ' ms';
  }

  function clickAt(audio, at, accent) {
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.frequency.value = accent ? 1100 : 770;
    volume.gain.setValueAtTime(0.0001, at);
    volume.gain.exponentialRampToValueAtTime(0.22, at + 0.003);
    volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.065);
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.07);
  }

  function mount(modal, settingsStatus) {
    const card = document.createElement('section');
    card.className = 'settings-card settings-calibration';
    card.innerHTML = `
      <h3>Calibração guiada de áudio</h3>
      <p class="calibration-intro">Toque junto com o metrônomo para ajustar a sincronia das notas.</p>
      <button type="button" class="settings-secondary" data-calibration-open
        aria-expanded="false" aria-controls="settings-calibration-flow">Calibrar áudio</button>
      <div id="settings-calibration-flow" hidden>
        <p class="calibration-instructions">Use a mesma saída de áudio da partida. Após quatro batidas de preparação, pressione Espaço ou toque no botão a cada batida.</p>
        <dl class="calibration-values">
          <div><dt>Offset atual</dt><dd data-calibration-current></dd></div>
          <div><dt>Sugestão</dt><dd data-calibration-suggestion>—</dd></div>
        </dl>
        <div class="calibration-run" hidden>
          <button type="button" class="settings-secondary calibration-tap">Marcar batida</button>
          <progress max="${sampleCount}" value="0" aria-label="Batidas registradas"></progress>
          <span class="calibration-count" aria-hidden="true"></span>
          <span class="calibration-feedback" aria-hidden="true"></span>
        </div>
        <p class="calibration-status" role="status" aria-live="polite"></p>
        <div class="settings-options">
          <button type="button" class="settings-secondary" data-calibration-start>Iniciar medição</button>
          <button type="button" class="settings-secondary" data-calibration-test hidden>Testar sugestão</button>
          <button type="button" class="settings-secondary calibration-save" hidden>Salvar offset</button>
          <button type="button" class="settings-secondary" data-calibration-cancel>Voltar</button>
        </div>
      </div>`;

    modal.querySelector('#settings-fullscreen').closest('section').before(card);
    const find = selector => card.querySelector(selector);
    const open = find('[data-calibration-open]');
    const flow = find('#settings-calibration-flow');
    const start = find('[data-calibration-start]');
    const test = find('[data-calibration-test]');
    const save = find('.calibration-save');
    const cancel = find('[data-calibration-cancel]');
    const tap = find('.calibration-tap');
    const progress = find('progress');
    const feedback = find('.calibration-feedback');
    const status = find('.calibration-status');
    let session = null;
    let suggestion = null;

    function render() {
      const running = !!session;
      start.disabled = running;
      start.textContent = suggestion === null ? 'Iniciar medição' : 'Medir novamente';
      test.hidden = save.hidden = suggestion === null;
      test.disabled = save.disabled = running;
      cancel.textContent = running ? 'Parar' : 'Voltar';
      find('.calibration-run').hidden = !running || !session?.beats;
      find('.calibration-instructions').hidden = !running && suggestion !== null;
      find('[data-calibration-current]').textContent = ms(PiuGameSettings.read().offset);
      find('[data-calibration-suggestion]').textContent = suggestion === null ? '—' : ms(suggestion);
      progress.value = session?.taps.size ?? 0;
      find('.calibration-count').textContent = progress.value + ' / ' + sampleCount;
    }

    function stop() {
      const previous = session;
      session = null;
      if (!previous) return;
      clearTimeout(previous.countInTimer);
      clearTimeout(previous.endTimer);
      if (previous.audio.state !== 'closed') previous.audio.close().catch(() => {});
    }

    function finish(run) {
      if (session !== run) return;
      stop();
      const samples = [...run.taps.values()];
      if (samples.length < minimumSamples) {
        status.textContent = 'Poucas batidas registradas. Repita e marque pelo menos 8 batidas.';
      } else {
        const timing = median(samples);
        const spread = median(samples.map(value => Math.abs(value - timing)));
        if (spread > maxSpread) {
          status.textContent = 'As batidas variaram bastante. Tente novamente mantendo o ritmo.';
        } else {
          // Gameplay subtracts both the global offset and the built-in input compensation.
          const measuredOffset = timing - StageConfig.inputCompensationSeconds;
          if (run.testing) {
            const currentError = measuredOffset - run.currentOffset;
            const testError = measuredOffset - run.testOffset;
            status.textContent = 'Diferença no teste — atual ' + ms(currentError) +
              ' · com a sugestão ' + ms(testError) + '.';
          } else {
            suggestion = Math.round(measuredOffset * 1000) / 1000;
            status.textContent = 'Medição concluída. Você pode testar a sugestão antes de salvar.';
          }
        }
      }
      render();
      (suggestion === null ? start : run.testing ? save : test).focus();
    }

    async function begin(testing) {
      if (session || (testing && suggestion === null)) return;
      const Audio = window.AudioContext || window.webkitAudioContext;
      const currentOffset = PiuGameSettings.read().offset;
      if (!testing) suggestion = null;
      feedback.textContent = '';
      let run;
      try {
        if (!Audio) throw new Error('Web Audio indisponível');
        run = {audio: new Audio(), testing, testOffset: suggestion, currentOffset, taps: new Map()};
        session = run;
        stopMusicPreview();
        status.textContent = 'Preparando o metrônomo…';
        render();
        await run.audio.resume();
        if (session !== run) return;

        const first = run.audio.currentTime + 0.2;
        const leadIn = Array.from({length: countIn}, (_, i) => first + i * interval);
        run.beats = Array.from({length: sampleCount}, (_, i) => first + (i + countIn) * interval);
        leadIn.forEach(at => clickAt(run.audio, at, true));
        run.beats.forEach(at => clickAt(run.audio, at, false));
        run.countInTimer = setTimeout(() => {
          if (session === run) status.textContent = testing
            ? 'Teste em andamento. Marque cada batida.'
            : 'Agora marque cada batida.';
        }, Math.max(0, (run.beats[0] - maxTapError - run.audio.currentTime) * 1000));
        const end = run.beats[run.beats.length - 1] + maxTapError;
        run.endTimer = setTimeout(() => finish(run), Math.max(0, (end - run.audio.currentTime) * 1000));
        status.textContent = 'Escute as quatro batidas de preparação.';
        render();
        tap.focus({preventScroll: true});
      } catch (_) {
        if (run && session !== run) return;
        stop();
        status.textContent = 'Não foi possível iniciar o áudio. Verifique a saída e tente novamente.';
        render();
        start.focus();
      }
    }

    function record(event) {
      if (!session?.beats) return;
      const {audio, beats, taps} = session;
      // Translate the event timestamp into the audio clock without counting handler delay.
      const eventAge = Math.max(0, performance.now() - event.timeStamp) / 1000;
      const audioTime = audio.currentTime - eventAge;
      const index = Math.round((audioTime - beats[0]) / interval);
      const error = audioTime - beats[index];
      if (index < 0 || index >= beats.length || taps.has(index) || Math.abs(error) > maxTapError) return;
      taps.set(index, error);
      progress.value = taps.size;
      find('.calibration-count').textContent = taps.size + ' / ' + sampleCount;
      if (session.testing) {
        const adjusted = error - StageConfig.inputCompensationSeconds - session.testOffset;
        feedback.textContent = Math.abs(adjusted) < 0.02 ? 'No tempo' : ms(adjusted);
      }
    }

    function collapse() {
      if (flow.hidden) return;
      stop();
      suggestion = null;
      status.textContent = '';
      flow.hidden = true;
      open.hidden = false;
      open.setAttribute('aria-expanded', 'false');
      card.classList.remove('calibration-expanded');
      settingsStatus('As alterações são salvas automaticamente.');
    }

    open.addEventListener('click', () => {
      flow.hidden = false;
      open.hidden = true;
      open.setAttribute('aria-expanded', 'true');
      card.classList.add('calibration-expanded');
      settingsStatus('A sugestão só é aplicada ao salvar o offset.');
      render();
      start.focus();
    });
    start.addEventListener('click', () => begin(false));
    test.addEventListener('click', () => begin(true));
    cancel.addEventListener('click', () => {
      if (session) {
        stop();
        status.textContent = 'Metrônomo parado.';
        render();
        start.focus();
      } else {
        collapse();
        open.focus();
      }
    });
    save.addEventListener('click', () => {
      if (session || suggestion === null) return;
      try {
        PiuGameSettings.setOffset(suggestion);
        status.textContent = 'Offset salvo: ' + ms(suggestion) + '.';
        render();
      } catch (_) {
        status.textContent = 'Não foi possível salvar o offset neste navegador.';
      }
    });
    tap.addEventListener('pointerdown', event => {
      if (event.isPrimary && event.button === 0) record(event);
    });
    tap.addEventListener('click', event => {
      if (event.detail === 0) record(event);
    });
    document.addEventListener('keydown', event => {
      if (!session || event.code !== 'Space') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) record(event);
    }, true);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden || !session) return;
      stop();
      status.textContent = 'Medição interrompida. Inicie novamente ao voltar para o jogo.';
      render();
    });
    modal.addEventListener('hide.bs.modal', collapse);
  }

  window.PiuAudioCalibration = {mount};
})();
