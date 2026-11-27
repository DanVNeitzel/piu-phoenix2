/* Personal bests, independent of accounts and the server. */
(function (root) {
  'use strict';
  const storageKey = 'piu_single_records_v1';
  const key = r => JSON.stringify([r.ssc, r.chart, r.playback || 1]);
  function valid(r) {
    return r && typeof r.ssc === 'string' && r.ssc.length > 0 &&
      Number.isInteger(r.chart) && r.chart >= 0 && typeof r.title === 'string' &&
      (r.playback === undefined || (Number.isFinite(r.playback) && r.playback > 0)) &&
      (r.broken === undefined || typeof r.broken === 'boolean') &&
      (r.passed === undefined || typeof r.passed === 'boolean') &&
      typeof r.type === 'string' && typeof r.level === 'string' &&
      Number.isInteger(r.score) && r.score >= 0 && r.score <= 1000000 &&
      Number.isInteger(r.combo) && r.combo >= 0 && typeof r.grade === 'string' &&
      typeof r.date === 'string' && Number.isFinite(Date.parse(r.date));
  }
  function read() {
    const raw = root.localStorage.getItem(storageKey);
    if (!raw) return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records) || !records.every(valid)) throw new Error('Recordes locais inválidos.');
    return records;
  }
  function merge(incoming) {
    if (!Array.isArray(incoming) || incoming.length > 10000 || !incoming.every(valid)) {
      throw new Error('Arquivo de recordes inválido.');
    }
    const records = new Map(read().map(r => [key(r), r]));
    for (const r of incoming) {
      if (r.autoplay === true || r.config?.autoplay === true || isBroken(r) || r.passed === false) continue;
      const previous = records.get(key(r));
      if (!previous || r.score > previous.score) records.set(key(r), r);
    }
    root.localStorage.setItem(storageKey, JSON.stringify([...records.values()]));
  }
  function score(perf) {
    const total = perf.p + perf.gr + perf.go + perf.b + perf.m;
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, Math.min(1000000, Math.floor(
      995000 * (perf.p + 0.6 * perf.gr + 0.2 * perf.go + 0.1 * perf.b) / total +
      5000 * perf.maxCombo / total)));
  }
  function grade(points) {
    const grades = [[995000,'SSS+'],[990000,'SSS'],[985000,'SS+'],[980000,'SS'],
      [975000,'S+'],[970000,'S'],[960000,'AAA+'],[950000,'AAA'],[940000,'AA+'],
      [920000,'AA'],[900000,'A+'],[800000,'A'],[700000,'B'],[600000,'C'],[500000,'D']];
    return (grades.find(g => points >= g[0]) || [0,'F'])[1];
  }
  function isBroken(record) {
    return record?.broken === true || record?.performance?.broken === true || /^x/i.test(record?.grade || '');
  }
  function judgments(perf) { return ['p','gr','go','b','m'].reduce((sum,name) => sum + (Number(perf[name]) || 0), 0); }
  function plate(perf) {
    if (isBroken(perf) || judgments(perf) === 0) return '';
    if (perf.gr === 0 && perf.go === 0 && perf.b === 0 && perf.m === 0) return 'UG';
    if (perf.go === 0 && perf.b === 0 && perf.m === 0) return 'PG';
    if (perf.b === 0 && perf.m === 0) return 'EG';
    if (perf.m === 0) return 'SG';
    return perf.m <= 5 ? 'MG' : perf.m <= 10 ? 'TG' : perf.m <= 20 ? 'FG' : 'RG';
  }
  function evaluate(perf) {
    const points = score(perf), broken = isBroken(perf);
    return {score:points, grade:grade(points), combo:perf.maxCombo, plate:plate(perf), broken,
      passed:judgments(perf) > 0 && !broken};
  }
  function best(chart) {
    const record = read().find(record => key(record) === key(chart) && !isBroken(record) && record.passed !== false);
    return record ? {...record, grade:grade(record.score)} : null;
  }
  root.LocalRecords = { read, merge, score, grade, key, isBroken, judgments, plate, evaluate, best };
})(globalThis);
