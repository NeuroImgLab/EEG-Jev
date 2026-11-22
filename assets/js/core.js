/* EEG-Jev demo: shared data access and small helpers.
   Everything shown on the page is read from material/ (built on the server by
   build_material.py): display waveforms, dataset annotations and the saved outputs of
   one checkpoint. Each file is checked against material/SHA256SUMS before use.
   No model runs in the browser. */
(function (root) {
  'use strict';
  const BASE = 'material/';
  const DIR = { sleep: 'sleep', chb: 'seizure', mi: 'motor_imagery', pain: 'pain' };
  const TASKS = ['sleep', 'chb', 'mi', 'pain'];
  const STAGES = ['W', 'N1', 'N2', 'N3', 'REM'];
  const STAGE_NAME = { W: 'Awake', N1: 'Drifting off', N2: 'Stable light sleep', N3: 'Deep sleep', REM: 'Dreaming sleep' };
  const css = getComputedStyle(document.documentElement);
  const cv = (n) => css.getPropertyValue(n).trim();
  const STAGE_COLOR = Object.fromEntries(STAGES.map((s) => [s, cv('--st-' + s) || '#8d9aa7']));
  const COLORS = { teal: '#3dd6c6', amber: '#f2b84b', cue: '#b9a6ff', dim: '#8d9aa7', text: '#e6edf3', score: '#c9a2f2' };
  const CHAIN_COLOR = { LT: '#7cc4ff', LP: '#8fe3b8', RP: '#f09ac0', RT: '#b7aeff', Z: '#cfd8e3', AUX: '#6b7785' };
  const CHAIN_NAME = { LT: 'Left temporal', LP: 'Left parasagittal', RP: 'Right parasagittal', RT: 'Right temporal', Z: 'Midline' };
  // 63-lead cap: colour by region, the same left / midline / right logic as the bipolar chains.
  const REGION_COLOR = { L: '#7cc4ff', Z: '#cfd8e3', R: '#f09ac0' };
  // Choice options that are not sleep stages: a colour by meaning where the name says it, else by position.
  const CLASS_HINT = [[/left/i, '#7cc4ff'], [/right/i, '#f09ac0'], [/both|hands$/i, '#b7aeff'], [/feet|foot/i, '#8fe3b8'], [/rest|relax/i, '#a9b4bf'], [/tongue/i, '#fbb15b']];
  const CLASS_PALETTE = ['#7cc4ff', '#f09ac0', '#b7aeff', '#8fe3b8', '#fbb15b', '#a9b4bf'];
  const classColor = (ids, id) => { if (STAGE_COLOR[id]) return STAGE_COLOR[id]; const h = CLASS_HINT.find((x) => x[0].test(id)); return h ? h[1] : CLASS_PALETTE[Math.max(0, (ids || []).indexOf(id)) % CLASS_PALETTE.length]; };
  const chainOf = (name) => { const S = root.EEGJevSignal, c = S.chbChain(name); return c === 'AUX' ? S.chbChain(name + '-0') : c; };
  const regionOf = (name) => { const m = /(\d+|Z)$/i.exec(name); if (!m || /z/i.test(m[1])) return 'Z'; return +m[1] % 2 ? 'L' : 'R'; };
  // Leads drawn for a pain trial by default (the model reads all 63).
  const PAIN_FEW = ['FZ', 'FCZ', 'CZ', 'CPZ', 'PZ', 'C3', 'C4', 'T7', 'T8'];
  // Motor imagery: leads over the sensorimotor strip shown by default, and the three used for the mu/beta measurement.
  const MI_FEW = ['FC3', 'FCZ', 'FC4', 'C5', 'C3', 'C1', 'CZ', 'C2', 'C4', 'C6', 'CP3', 'CPZ', 'CP4'];
  const MI_ERD = ['C3', 'CZ', 'C4'];

  let sums = null, manifest = null, ready = null;
  const sizes = new Map();
  const cases = new Map(), wins = new Map();
  const dec = new TextDecoder();
  const json = (buf) => JSON.parse(dec.decode(buf));

  async function loadSums() {
    const r = await fetch(BASE + 'SHA256SUMS', { cache: 'no-cache' });
    if (!r.ok) throw new Error('material list: HTTP ' + r.status);
    const m = new Map();
    for (const line of (await r.text()).split('\n')) { const k = line.trim().split(/\s+/); if (k.length === 2) m.set(k[1], k[0]); }
    return m;
  }
  // Download with progress (for the loading text) and check against the material list.
  async function verified(rel) {
    const r = await fetch(BASE + rel, { cache: 'no-cache' });
    if (!r.ok) throw new Error(rel + ': HTTP ' + r.status);
    let buf;
    const big = /\.(i16|f32)$/.test(rel);
    if (big && r.body && r.body.getReader) {
      const total = sizes.get(rel) || 0, rd = r.body.getReader(), parts = []; let got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; document.dispatchEvent(new CustomEvent('eegjev:progress', { detail: { rel, loaded: got, total } })); }
      const all = new Uint8Array(got); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
      buf = all.buffer;
    } else buf = await r.arrayBuffer();
    const want = sums.get(rel);
    if (!want || (await root.EEGJevChecksum.sha256(buf)) !== want) throw new Error(rel + ': SHA-256 does not match the material list');
    return buf;
  }
  function init() {
    if (!ready) ready = (async () => { sums = await loadSums(); manifest = json(await verified('manifest.json')); for (const k in manifest.encodings || {}) sizes.set(k, manifest.encodings[k].bytes || 0); return manifest; })();
    return ready;
  }
  const taskInfo = (task) => manifest.tasks[DIR[task]];
  // Waveform file as µV: int16 counts times the file's scale (manifest.encodings), or plain float32 in older material.
  const sampleCache = new Map();
  function samples(stem) {
    if (!sampleCache.has(stem)) sampleCache.set(stem, (async () => {
      const enc = manifest.encodings && manifest.encodings[stem + '.i16'];
      if (!enc) return new Float32Array(await verified(stem + '.f32'));
      const q = new Int16Array(await verified(stem + '.i16')), out = new Float32Array(q.length), k = enc.scale_uV_per_count;
      for (let i = 0; i < q.length; i++) out[i] = q[i] * k;
      return out;
    })().catch((e) => { sampleCache.delete(stem); throw e; }));
    return sampleCache.get(stem);
  }

  // Header of a replay case; its waveform segments are fetched separately with samples().
  const headers = new Map();
  function caseHeader(task, k = 0) {
    const key = task + '|' + k;
    if (!headers.has(key)) headers.set(key, (async () => { await init(); return json(await verified(taskInfo(task).cases[k].path + 'case.json')); })().catch((e) => { headers.delete(key); throw e; }));
    return headers.get(key);
  }
  // A continuous case (sleep, seizure) or an event case (pain): header + Float32Array.
  async function loadCase(task, k = 0) {
    const key = task + '|' + k;
    if (!cases.has(key)) cases.set(key, (async () => {
      await init();
      const c = taskInfo(task).cases[k];
      const [hb, f32] = await Promise.all([verified(c.path + 'case.json'), samples(c.path + 'signal')]);
      return { hdr: json(hb), f32 };
    })().catch((e) => { cases.delete(key); throw e; }));
    return cases.get(key);
  }
  // Window-by-window examples of one task: items + Float32Array.
  async function loadWindows(task) {
    if (!wins.has(task)) wins.set(task, (async () => {
      await init();
      const p = taskInfo(task).examples.path;
      // the replay stage is on screen first: let the first segment of its recording download before the single windows
      await caseHeader(task, 0).then((h) => samples(taskInfo(task).cases[0].path + (h.segments ? h.segments[0].file : 'signal'))).catch(() => {});
      const [hb, f32] = await Promise.all([verified(p + '.json'), samples(p)]);
      return { set: json(hb), f32 };
    })().catch((e) => { wins.delete(task); throw e; }));
    return wins.get(task);
  }

  // ── Numbers ───────────────────────────────────────
  const pct = (p) => (p >= 0.999 ? '>99.9%' : p < 0.001 ? '<0.1%' : (p * 100).toFixed(1) + '%');
  const clock = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + (x < 10 ? '0' : '') + x.toFixed(Math.abs(x - Math.round(x)) > 1e-6 ? 1 : 0); };
  const topStage = (probs) => STAGES.reduce((a, b) => (probs[b] > probs[a] ? b : a));
  // Score: support points 0..K-1. Returns the normalisation, the expected value and the mode.
  function scoreStats(p) {
    let sum = 0, e = 0, mode = 0;
    for (let k = 0; k < p.length; k++) { sum += p[k]; e += k * p[k]; if (p[k] > p[mode]) mode = k; }
    return { sum, expected: e / sum, mode, pmax: p[mode] };
  }
  const signed = (x, d = 1) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
  const leadName = (c) => c.replace(/-[01]$/, '').split('-').map((e) => (e.length > 1 ? e.charAt(0) + e.slice(1).toLowerCase() : e)).join('–');
  // Cap names arrive in capitals (FP1, FCZ): write them the conventional way (Fp1, FCz).
  const capName = (c) => c.toUpperCase().replace(/^FP/, 'Fp').replace(/Z$/, 'z');

  function fit(c, g = 0) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, g * dpr, 0); ctx.clearRect(-g, 0, w, h);
    return { ctx, w: w - g, h, g };
  }
  // Samples between t0 and t1 of one lead: every sample while there are at most 6 per pixel,
  // otherwise the min and max of each pixel column, so peaks survive.
  function envelope(ctx, x, off, fs, t0, t1, X0, pw, yOf, tEnd) {
    const a = Math.max(0, Math.floor(t0 * fs)), stop = Math.min(x.length, Math.floor(Math.min(t1, tEnd) * fs));
    if (stop - a < 2) return;
    const spp = (t1 - t0) * fs / pw;
    ctx.beginPath();
    if (spp <= 6) {
      for (let k = a; k < stop; k++) { const px = X0 + ((k / fs - t0) / (t1 - t0)) * pw, py = yOf(x[k] - off); k === a ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    } else {
      const cols = Math.ceil(((stop - a) / fs) / (t1 - t0) * pw);
      for (let i = 0; i < cols; i++) {
        const k0 = a + Math.floor(i * spp), k1 = Math.min(stop, a + Math.floor((i + 1) * spp));
        if (k1 <= k0) continue;
        let lo = Infinity, hi = -Infinity;
        for (let k = k0; k < k1; k++) { const v = x[k] - off; if (v < lo) lo = v; if (v > hi) hi = v; }
        const px = X0 + i + 0.5;
        i === 0 ? ctx.moveTo(px, yOf(hi)) : ctx.lineTo(px, yOf(hi));
        ctx.lineTo(px, yOf(lo));
      }
    }
    ctx.stroke();
  }

  // Page-level text that depends on the material (data status, questions, facts).
  function paintPage(m) {
    const st = m.data_status, test = st.kind === 'test';
    const el = document.getElementById('data-status');
    if (el) { el.hidden = false; el.textContent = test ? 'Test split · curated examples' : st.label; el.className = 'data-status ' + (st.kind === 'development' ? 'is-dev' : 'is-test'); el.title = st.note || ''; }
    const hs = document.getElementById('hero-split');
    if (hs) hs.textContent = test ? ' · curated test examples' : ' · ' + st.split + ' split';
    const sub = document.getElementById('console-sub');
    if (sub) sub.textContent = (test ? 'Curated test examples' : 'Curated ' + st.split + ' examples') + ' from other recordings and participants, with EEG traces, dataset annotations, saved model answers and signal measurements.';
    document.querySelectorAll('[data-q]').forEach((n) => { const t = m.tasks[DIR[n.dataset.q]]; if (t) n.textContent = t.question; });
    // A task without material is not offered: its tabs disappear and its card stops being a button.
    for (const t of TASKS) if (!m.tasks[DIR[t]]) {
      document.querySelectorAll('[role=tab][data-task="' + t + '"]').forEach((b) => { b.hidden = true; });
      const card = document.querySelector('.qcard.live[data-go="' + t + '"]'); if (card) { card.disabled = true; card.classList.add('no-material'); card.dataset.idle = 'replay not included in this build'; const a = document.getElementById('hero-' + t); if (a) a.textContent = card.dataset.idle; }
    }
    const mi = m.tasks.motor_imagery, mo = document.getElementById('mi-options');
    if (mi && mo) mo.innerHTML = mi.candidates.map((k) => '<li><b style="color:' + classColor(mi.candidates, k) + '">●</b>' + ((mi.candidate_texts && mi.candidate_texts[k]) || k) + '</li>').join('');
    const mt = document.getElementById('tk-mi-text'); if (mi && mt && mi.supervision_meaning) mt.textContent = mi.supervision_meaning;
    const thr = m.formal.seizure_thresholds_dev, tk = document.getElementById('tk-chb-thr');
    if (tk && thr) tk.textContent = 'The marked threshold (' + (thr.spec99 * 100).toFixed(1) + '%) is the lowest one that kept 99% of non-seizure development windows below it. It was fixed before any test evaluation.';
    const an = document.getElementById('pain-anchors'), sc = m.tasks.pain && m.tasks.pain.scale;
    if (an && sc) an.innerHTML = Object.keys(sc.anchors).map((k) => '<li><b class="mono">' + k + '</b>' + sc.anchors[k] + '</li>').join('');
    // A source left out of this build (licence not settled for public hosting): say so where its replay would be.
    const om = m.omitted || {};
    for (const t of TASKS) { const o = om[DIR[t]]; if (!o || !o.short) continue; const card = document.querySelector('.qcard.live[data-go="' + t + '"]'), a = document.getElementById('hero-' + t); if (card) card.dataset.idle = o.short; if (a) a.textContent = o.short; }
    const shown = TASKS.filter((t) => m.tasks[DIR[t]]).length, hh = document.getElementById('hero-how');
    if (hh && shown < TASKS.length) hh.textContent = (['No', 'One', 'Two', 'Three'][shown] || shown) + ' of the ' + ['zero', 'one', 'two', 'three', 'four'][TASKS.length] + ' trained questions play below on recorded EEG. Dashed cards are the next questions.';
    if (m.credits_html) document.querySelectorAll('[data-credits]').forEach((n) => { n.innerHTML = m.credits_html; });
    const on = document.getElementById('omitted-note'), keys = Object.keys(om);
    if (on && keys.length) { on.hidden = false; on.textContent = keys.map((k) => om[k].note).join(' '); }
  }
  init().then(paintPage).catch(() => {});

  root.EEGJevData = Object.freeze({ init, loadCase, loadWindows, caseHeader, samples, taskInfo, manifest: () => manifest, TASKS, DIR, STAGES, STAGE_NAME, STAGE_COLOR, COLORS, CHAIN_COLOR, CHAIN_NAME, REGION_COLOR, regionOf, chainOf, classColor, PAIN_FEW, MI_FEW, MI_ERD,
    pct, clock, topStage, scoreStats, signed, leadName, capName, fit, envelope });
})(window);
