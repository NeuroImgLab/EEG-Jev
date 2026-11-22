/* Window-by-window console: curated single windows from other recordings and
   participants. Each example binds one EEG window, the question the model was asked,
   the saved answer of that window and the dataset label. Nothing is computed about the
   answer here; the spectrogram and the scales are computed in the browser from the
   same display traces. The sweep is a drawing animation, not inference time. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const M = window.EEGJevData, A = window.EEGJevAnswers, SIG = window.EEGJevSignal, CH = window.EEGJevChannels;
  const con = $('.console'), boot = $('#boot-note');
  if (!M || !A || !SIG || !CH || !con) return;
  const { pct, clock, fit, leadName, capName } = M;
  const TEAL = M.COLORS.teal, AMBER = M.COLORS.amber, DIM = M.COLORS.dim;
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = rm.matches;
  const SLEEP_COLOR = ['#7cc4ff', '#8fe3b8'];
  const TASK = {
    sleep: { gains: [25, 50, 100, 200, 500], sweep: 4, name: 'Sleep-EDF', unit: 'epoch', spec: { nperseg: 200, noverlap: 150, nfft: 512 }, fmax: 25 },
    chb: { gains: [50, 100, 200, 300, 500, 1000], sweep: 3, name: 'CHB-MIT', unit: 'window', spec: { nperseg: 200, noverlap: 176, nfft: 512 }, fmax: 25 },
    pain: { gains: [10, 20, 40, 80, 160], sweep: 3, name: 'ds005292', unit: 'trial' },
    mi: { gains: [5, 10, 20, 40, 80, 160], sweep: 1.5, name: 'Stieger 2021', unit: 'trial' }   // 6 s of signal drawn in 1.5 s = 4x, the default of the motor-imagery replay
  };
  const isCap = (task) => task === 'pain' || task === 'mi';
  // A window is drawn at the speed set for its task in the replay (shared), never faster than in 1.2 s.
  const SP = window.EEGJevSpeed, SWEEP_MIN = 1.2;
  const sweepOf = (v) => (SP ? Math.max(SWEEP_MIN, v.dur / SP.get(v.task)) : TASK[v.task].sweep || v.dur);
  const HOLD = 4.5;
  const state = { task: 'sleep', idx: { sleep: 0, chb: 0, mi: 0, pain: 0 }, filter: null, playing: !reduce, phase: reduce ? 'hold' : 'sweep', elapsed: 0, last: 0, raf: 0, sets: {}, gain: {}, base: {}, answered: { sleep: new Set(), chb: new Set(), mi: new Set(), pain: new Set() }, err: null, thr: null, visible: false, pairLead: null };

  // ── Data ──────────────────────────────────────────
  async function loadTask(task) {
    if (state.sets[task]) return state.sets[task];
    const man = await M.init();
    state.thr = man.formal.seizure_thresholds_dev ? man.formal.seizure_thresholds_dev.spec99 : null;
    const { set, f32 } = await M.loadWindows(task);
    const items = set.items.map((it, i) => {
      const n = it.n_samples, C = it.channels.length;
      const rows = it.channels.map((name, c) => {
        const x = Float64Array.from(f32.subarray(it.offset_floats + c * n, it.offset_floats + (c + 1) * n));
        if (task !== 'pain') { let m = 0; for (const v of x) m += v; m /= n; for (let k = 0; k < n; k++) x[k] -= m; }
        return { channel: name, x, chain: task === 'chb' ? M.chainOf(name) : isCap(task) ? M.regionOf(name) : 'S' };
      });
      return { i, it, task, rows, by: new Map(rows.map((r) => [CH.keyOf(r.channel), r])), fs: it.sample_rate_hz, dur: n / it.sample_rate_hz, id: it.item_id, stats: task === 'pain' ? M.scoreStats(it.probabilities) : null };
    });
    const byId = new Map(items.map((v) => [v.id, v]));
    for (const v of items) { v.pair = v.it.reference_item ? byId.get(v.it.reference_item) : null; if (v.pair) v.pair.pair = v; }
    const s = { set, items, info: M.taskInfo(task), status: man.data_status };
    // Default sensitivity: the smallest step at which no example loses more than 5% of its samples to clipping.
    const lim = 0.5;   // half a row either side: the trace stays inside its own row
    const clipShare = (v, g) => { let over = 0, tot = 0; for (const r of defaultRows(v)) for (let k = 0; k < r.x.length; k += 2) { tot++; if (Math.abs(r.x[k]) > g * lim) over++; } return over / tot; };
    state.base[task] = TASK[task].gains.find((g) => items.filter((v) => clipShare(v, g) > 0.02).length <= items.length * 0.25) || TASK[task].gains[TASK[task].gains.length - 1];
    state.gain[task] = 'auto';
    state.sets[task] = s;
    return s;
  }
  // The rows on screen follow the shared channel state. An input slot without a lead in this recording is a flat, marked row.
  const emptyRow = (v, k) => { const c = CH.info(v.task).by.get(k); return { channel: k, x: new Float64Array(v.rows[0].x.length), chain: 'AUX', empty: true, label: c ? c.label : k }; };
  const pick = (v, keys) => keys.map((k) => v.by.get(k) || emptyRow(v, k));
  const defaultRows = (v) => pick(v, CH.info(v.task).defaults).filter((r) => !r.empty);
  const S = () => state.sets[state.task];
  const cur = () => { const s = S(); return s ? s.items[state.idx[state.task]] : null; };
  const rowsOf = (v) => { const sg = CH.sig(v.task); if (v.shownSig !== sg) { v.shownSig = sg; v.shown = pick(v, CH.shown(v.task)); } return v.shown; };
  const progress = () => { const v = cur(); return state.phase === 'hold' || !v ? 1 : Math.min(1, state.elapsed / sweepOf(v)); };
  const answered = () => progress() >= 1;
  const rowColor = (v, r, i) => { const c = CH.info(v.task).by.get(CH.keyOf(r.channel)); return c ? c.color : v.task === 'chb' ? M.CHAIN_COLOR[r.chain] : isCap(v.task) ? M.REGION_COLOR[r.chain] : SLEEP_COLOR[i % 2]; };
  const rowLabel = (v, r) => r.label || (isCap(v.task) ? capName(r.channel) : leadName(r.channel));
  // The reference event inside the displayed segment: laser stimulus (pain) or cue (motor imagery).
  const zeroOf = (v) => (v.task === 'pain' ? v.it.stimulus_time_s - v.it.start_s : v.task === 'mi' && v.it.cue_rel_s != null ? v.it.cue_rel_s : 0);
  const candLabel = (k) => { const i = S().info; return (i.candidate_labels && i.candidate_labels[k]) || k; };
  const topOf = (pr) => Object.keys(pr).reduce((a, b) => (pr[b] > pr[a] ? b : a));
  // Seizure: the part of this window covered by an annotated interval (seconds within the window).
  function annotated(v) {
    if (v.task !== 'chb') return [];
    const out = [];
    for (const z of v.it.seizures_in_record || []) { const a = Math.max(v.it.start_s, z.onset_s), b = Math.min(v.it.end_s, z.offset_s); if (b > a) out.push([a - v.it.start_s, b - v.it.start_s]); }
    return out;
  }

  // ── Canvas ────────────────────────────────────────
  const cEEG = $('#cv-eeg'), cAxis = $('#cv-axis');
  const gutter = () => (window.innerWidth < 361 ? 52 : window.innerWidth < 760 ? 58 : 64);
  const mono = (px, wt = 500) => wt + ' ' + px + 'px "IBM Plex Mono", ui-monospace, monospace';
  function timeGrid(ctx, w, h, dur) {
    const step = dur > 10 ? 1 : 0.5;
    for (let t = step; t < dur - 1e-6; t += step) {
      const x = Math.round((t / dur) * w) + 0.5, major = dur > 10 ? Math.abs(t % 5) < 1e-6 : Math.abs(t - Math.round(t)) < 1e-6;
      ctx.strokeStyle = major ? 'rgba(141,154,167,.16)' : 'rgba(141,154,167,.05)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
  }
  let hatchPat = null;
  function hatch(ctx) {
    if (hatchPat) return hatchPat;
    const p = document.createElement('canvas'); p.width = p.height = 8;
    const c = p.getContext('2d'); c.strokeStyle = 'rgba(242,184,75,.5)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-2, 10); c.lineTo(10, -2); c.moveTo(6, 10); c.lineTo(10, 6); c.moveTo(-2, 2); c.lineTo(2, -2); c.stroke();
    return (hatchPat = ctx.createPattern(p, 'repeat'));
  }
  function marks(ctx, w, h, v, p, thin) {
    // Dataset timing: annotated seizure part (amber), laser stimulus (amber dashed line).
    for (const [a, b] of annotated(v)) {
      const x0 = (a / v.dur) * w, x1 = (Math.min(b, p * v.dur) / v.dur) * w; if (x1 <= x0) continue;
      ctx.save(); ctx.fillStyle = 'rgba(242,184,75,' + (thin ? '.9' : '.05') + ')'; ctx.fillRect(x0, 0, x1 - x0, thin ? 4 : h);
      if (!thin) { ctx.fillStyle = AMBER; ctx.fillRect(x0, 0, x1 - x0, 3); }
      ctx.restore();
    }
    if (v.task === 'mi' && !thin) {
      // The part the model reads, and the trial phases from the event file.
      if (v.it.window_rel_s) { const a = v.it.window_rel_s[0] / v.dur * w, b = Math.min(v.dur, v.it.window_rel_s[1]) / v.dur * w; ctx.fillStyle = 'rgba(230,237,243,.035)'; ctx.fillRect(a, 0, b - a, h); ctx.fillStyle = 'rgba(230,237,243,.5)'; ctx.fillRect(a, 0, b - a, 1.5); }
      for (const ph of v.it.phases || []) { const a = Math.max(0, ph.t0_rel_s) / v.dur * w, b = Math.min(v.dur, ph.t1_rel_s) / v.dur * w; if (b > a) { ctx.fillStyle = AMBER; ctx.globalAlpha = ph.emphasis != null ? 0.15 + 0.8 * ph.emphasis : 0.6; ctx.fillRect(a, h - 3, b - a, 3); ctx.globalAlpha = 1; } }
    }
    const lines = v.task === 'pain' ? [{ t_rel_s: zeroOf(v), label: 'Laser stimulus' }] : v.task === 'mi' ? (v.it.marks && v.it.marks.length ? v.it.marks : [{ t_rel_s: zeroOf(v), label: 'Cue' }]) : [];
    for (const mk of lines) {
      const x = Math.round(mk.t_rel_s / v.dur * w) + 0.5;
      ctx.save(); ctx.strokeStyle = AMBER; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.setLineDash([]);
      if (!thin) { ctx.fillStyle = AMBER; ctx.font = mono(10, 600); ctx.textBaseline = 'top'; const tw = ctx.measureText(mk.label).width; ctx.fillText(mk.label, Math.min(w - tw - 2, x + 6), 4); }
      ctx.restore();
    }
  }
  function sweepLine(ctx, w, h, p) {
    if (p >= 1) return;
    const x = p * w, g = ctx.createLinearGradient(x - 46, 0, x, 0);
    g.addColorStop(0, 'rgba(61,214,198,0)'); g.addColorStop(1, 'rgba(61,214,198,.16)');
    ctx.fillStyle = g; ctx.fillRect(x - 46, 0, 46, h);
    ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.lineWidth = 1;
  }
  // Display gain (µV per row). 'auto' = the task default, widened for a window whose amplitude needs it:
  // the first 1-2-5 step at which at most 5% of the displayed samples leave their row.
  const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  function gainOf(v) {
    const g = state.gain[v.task]; if (g !== 'auto') return g;
    const key = 'gain|' + CH.sig(v.task);
    if (!v[key]) {
      const rows = rowsOf(v).filter((r) => !r.empty), base = state.base[v.task]; let n = 0; for (const r of rows) n += r.x.length;
      v[key] = [base].concat(STEPS.filter((x) => x > base)).find((x) => { let over = 0; const lim = x / 2; for (const r of rows) for (const y of r.x) if (Math.abs(y) > lim) over++; return over <= n * 0.05; }) || STEPS[STEPS.length - 1];
    }
    return v[key];
  }
  // Where a trace leaves the display range of its row: a thin grey line along the row edge and a small arrow
  // pointing outward. It marks the display range only (gain), not an event in the recording.
  function clipMarks(ctx, xs, y, dir) {
    if (!xs.length) return;
    let a = xs[0], prev = xs[0];
    const flush = () => {
      ctx.fillStyle = 'rgba(159,176,192,.45)'; ctx.fillRect(a, dir < 0 ? y : y - 1, Math.max(1, prev - a + 1), 1);
      ctx.fillStyle = 'rgba(214,223,232,.9)';
      for (let m = (a + prev) / 2 - Math.floor((prev - a) / 80) * 20; m <= prev; m += 40) {
        if (m < a - 1) continue;
        ctx.beginPath();
        if (dir < 0) { ctx.moveTo(m, y + 0.5); ctx.lineTo(m + 3.2, y + 5); ctx.lineTo(m - 3.2, y + 5); } else { ctx.moveTo(m, y - 0.5); ctx.lineTo(m + 3.2, y - 5); ctx.lineTo(m - 3.2, y - 5); }
        ctx.closePath(); ctx.fill();
      }
    };
    for (let i = 1; i < xs.length; i++) { if (xs[i] - prev > 2.5) { flush(); a = xs[i]; } prev = xs[i]; }
    flush();
  }
  // Row geometry: rows keep a readable height; when they do not fit, the row area scrolls and the time axis stays put.
  const scroller = $('#eeg-scroll'), ROW_MIN = 15;
  function rowGeom(v, h) {
    const n = rowsOf(v).length, top = isCap(v.task) ? 18 : v.task === 'chb' ? 6 : 10, bottom = v.task === 'chb' ? 4 : 10, avail = h - top - bottom;
    const rowH = Math.max(n > 24 ? ROW_MIN : 0, avail / n), total = rowH * n, max = Math.max(0, total - avail);
    return { n, top, bottom, avail, rowH, total, max, sy: Math.min(max, scroller ? scroller.scrollTop : 0) };
  }
  function drawEEG(v) {
    if (!cEEG.clientWidth || !cEEG.clientHeight) return;
    const { ctx, w: w0, h } = fit(cEEG, gutter()), w = w0 - 12;   // 12 px at the right for the amplitude bracket
    const rows = rowsOf(v), G = rowGeom(v, h), { n, top, rowH, avail, sy } = G;
    if (scroller) { const sp = scroller.firstElementChild, want = Math.round(G.total + h - avail) + 'px'; if (sp.style.height !== want) sp.style.height = want; scroller.classList.toggle('can-scroll', G.max > 0); }
    const p = progress(), gain = gainOf(v), any = CH.anyHot(v.task);
    timeGrid(ctx, w, h, v.dur);
    marks(ctx, w, h, v, p, false);
    ctx.save(); ctx.beginPath(); ctx.rect(-gutter(), top, w + gutter() + 12, avail); ctx.clip();
    // Each lead is drawn inside its own row only. Where the trace leaves the row it is cut, and a thin tick at the
    // row edge marks the cut (no flat line is drawn, so a cut cannot be mistaken for a plateau).
    ctx.lineJoin = 'round';
    const every = rowH < 9 ? 3 : rowH < 13 ? 2 : 1;
    ctx.font = mono(rowH < 14 ? 9 : 11); ctx.textBaseline = 'middle';
    rows.forEach((r, i) => {
      const y0 = top + rowH * (i + 0.5) - sy, yTop = y0 - rowH / 2, yBot = y0 + rowH / 2;
      if (yBot < top || yTop > top + avail) return;
      const N = r.x.length, end = Math.max(2, Math.floor(N * p)), lim = gain / 2, hotK = CH.hot(v.task, CH.keyOf(r.channel)), col = rowColor(v, r, i);
      if (hotK) { ctx.fillStyle = hotK === 'sel' ? 'rgba(61,214,198,.10)' : 'rgba(230,237,243,.06)'; ctx.fillRect(-gutter(), yTop, w + gutter(), rowH); }
      else if (n > 4) { ctx.strokeStyle = 'rgba(141,154,167,.09)'; ctx.beginPath(); ctx.moveTo(0, Math.round(y0) + 0.5); ctx.lineTo(w, Math.round(y0) + 0.5); ctx.stroke(); }
      ctx.globalAlpha = any && !hotK ? 0.32 : 1;
      if (r.empty) {
        ctx.strokeStyle = 'rgba(141,154,167,.55)'; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(0, Math.round(y0) + 0.5); ctx.lineTo(w, Math.round(y0) + 0.5); ctx.stroke(); ctx.setLineDash([]);
        if (rowH >= 11) { ctx.fillStyle = DIM; ctx.textAlign = 'left'; ctx.fillText('empty input slot · zero in the model input', 8, y0 - Math.min(6, rowH / 2 - 5)); }
      } else {
        ctx.save(); ctx.beginPath(); ctx.rect(0, Math.max(yTop, top), w, Math.min(yBot, top + avail) - Math.max(yTop, top)); ctx.clip();
        ctx.strokeStyle = col; ctx.lineWidth = hotK ? 1.6 : n > 4 ? 0.95 : 1.15;
        ctx.beginPath();
        for (let k = 0; k < end; k++) { const x = (k / (N - 1)) * w, y = y0 - (r.x[k] / gain) * rowH; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.restore();
        const ups = [], dns = []; let lastUp = -9, lastDn = -9;
        for (let k = 0; k < end; k++) {
          const x = Math.round((k / (N - 1)) * w);
          if (r.x[k] > lim && x !== lastUp) { ups.push(x); lastUp = x; } else if (r.x[k] < -lim && x !== lastDn) { dns.push(x); lastDn = x; }
        }
        clipMarks(ctx, ups, Math.max(yTop, top), -1); clipMarks(ctx, dns, Math.min(yBot, top + avail), 1);
      }
      if (!(i % every) || hotK) { ctx.textAlign = 'right'; ctx.fillStyle = r.empty ? DIM : col; ctx.globalAlpha = any && !hotK ? 0.45 : 1; ctx.fillText(rowLabel(v, r), -8, y0 + 0.5); }
      ctx.globalAlpha = 1;
    });
    // Amplitude scale: the bracket spans one row = the gain in µV.
    { const x = w + 5, y0 = top + rowH / 2; ctx.strokeStyle = 'rgba(230,237,243,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 3, y0 - rowH / 2 + 1); ctx.lineTo(x, y0 - rowH / 2 + 1); ctx.lineTo(x, y0 + rowH / 2 - 1); ctx.lineTo(x - 3, y0 + rowH / 2 - 1); ctx.stroke(); ctx.lineWidth = 1; }
    ctx.restore();
    ctx.textAlign = 'left';
    sweepLine(ctx, w, h, p);
    cEEG.setAttribute('aria-label', 'EEG of this ' + TASK[v.task].unit + ': ' + n + ' of ' + CH.info(v.task).n + ' input channels, ' + v.dur + ' seconds' + (p < 1 ? ', ' + (p * v.dur).toFixed(1) + ' s drawn' : ''));
  }
  // Pointer over the rows: the row under it is traced in the scalp map and the list; a click pins it.
  function rowAt(e) {
    const v = cur(); if (!v) return null;
    const r = cEEG.getBoundingClientRect(), G = rowGeom(v, r.height), y = e.clientY - r.top - G.top + G.sy;
    if (e.clientY - r.top < G.top || e.clientY - r.top > G.top + G.avail) return null;
    const row = rowsOf(v)[Math.floor(y / G.rowH)];
    return row ? CH.keyOf(row.channel) : null;
  }
  if (scroller) {
    scroller.addEventListener('scroll', () => { const v = cur(); if (v) drawEEG(v); }, { passive: true });
    scroller.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') CH.hover(state.task, rowAt(e)); });
    scroller.addEventListener('pointerleave', () => CH.hover(state.task, null));
    scroller.addEventListener('click', (e) => { const k = rowAt(e); if (k) CH.select(state.task, k); });
    scroller.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Escape') return;
      const v = cur(); if (!v) return; const keys = rowsOf(v).map((r) => CH.keyOf(r.channel)), k = keys.indexOf(CH.state(state.task).sel);
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { CH.select(state.task, null); return; }
      const next = keys[Math.max(0, Math.min(keys.length - 1, k < 0 ? 0 : k + (e.key === 'ArrowDown' ? 1 : -1)))];
      CH.select(state.task, next, { keep: true });
      const G = rowGeom(v, cEEG.clientHeight), y = keys.indexOf(next) * G.rowH; if (y < scroller.scrollTop) scroller.scrollTop = y; else if (y + G.rowH > scroller.scrollTop + G.avail) scroller.scrollTop = y + G.rowH - G.avail;
    });
  }
  function drawAxis(v) {
    if (!cAxis.clientWidth) return;
    const { ctx, w, h } = fit(cAxis, gutter());
    ctx.fillStyle = DIM; ctx.font = mono(10, 400); ctx.textBaseline = 'middle';
    const step = v.dur > 10 ? (w < 360 ? 10 : 5) : (w < 360 ? 1 : v.dur <= 3 ? 0.5 : 1), rel = zeroOf(v);
    for (let t = rel ? rel - step * Math.floor(rel / step + 1e-9) : 0; t <= v.dur + 1e-6; t += step) {
      const x = (t / v.dur) * w, val = t - rel;
      ctx.textAlign = t === 0 ? 'left' : Math.abs(t - v.dur) < 1e-6 ? 'right' : 'center';
      ctx.fillText((rel ? (val > 0 ? '+' : val < 0 ? '−' : '') + Math.abs(val).toFixed(Math.abs(val % 1) > 1e-6 ? 1 : 0) : t) + ' s', x, h / 2);
    }
  }
  // ── Scalp map ─────────────────────────────────────
  const scalp = $('#scalp'), NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const E = Object.assign({}, SIG.ELECTRODES_1020);
  const mid = (a, b) => [(E[a][0] + E[b][0]) / 2, (E[a][1] + E[b][1]) / 2];
  E.FCZ = mid('FZ', 'CZ'); E.CPZ = mid('CZ', 'PZ');
  E.C1 = mid('C3', 'CZ'); E.C2 = mid('CZ', 'C4'); E.C5 = mid('T7', 'C3'); E.C6 = mid('C4', 'T8'); E.FC3 = mid('F3', 'C3'); E.FC4 = mid('F4', 'C4'); E.CP3 = mid('C3', 'P3'); E.CP4 = mid('C4', 'P4');
  const pos = (name) => { const p = E[name.toUpperCase()]; return p ? [p[0], -p[1]] : null; };
  // Scalp map and lead list: the shared channel panel (default / all / custom leads, hover and pin).
  // Detail of a channel for the panel: its peak in this window and whether it leaves the display range.
  function leadDetail(k) {
    const v = cur(), r = v && v.by.get(k); if (!r) return '';
    const lim = gainOf(v) / 2; let peak = 0, over = 0; for (const x of r.x) { const a = Math.abs(x); if (a > peak) peak = a; if (a > lim) over++; }
    return 'peak ' + peak.toFixed(0) + ' µV in this window' + (over ? ' · outside display range ' + (over / r.x.length < 0.001 ? '<0.1' : (100 * over / r.x.length).toFixed(1)) + '% of the time at ' + gainOf(v) + ' µV/row (display only; Fit amplitude shows it in full)' : ' · inside the display range');
  }
  const panel = CH.mount($('#ch-console'), () => state.task, { detail: leadDetail, action: { label: 'Signal analysis ↓', run: (k) => openAnalysis(k) } });
  if (SP) SP.on((t) => { if (t === state.task && cur()) { renderLegend(cur()); renderTransport(); } });
  function drawScalp() { panel.render(); }
  function openAnalysis(k) {
    const v = cur(); if (!v) return; const r = v.by.get(k); if (!r) return;
    const AN = window.EEGJevAnalysis; if (AN && AN.setLead) AN.setLead(v.task, r.channel);
    const d = $('#analysis-details'); if (d) { d.open = true; analyse(v); d.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }
  }
  // Bring the pinned row into the visible part of the row area.
  function reveal(v) {
    const sel = CH.state(v.task).sel; if (!sel || !scroller || !cEEG.clientHeight) return;
    const k = rowsOf(v).findIndex((q) => CH.keyOf(q.channel) === sel), G = rowGeom(v, cEEG.clientHeight), y = k * G.rowH;
    if (k >= 0 && (y < scroller.scrollTop || y + G.rowH > scroller.scrollTop + G.avail)) { const sp = scroller.firstElementChild; sp.style.height = Math.round(G.total + cEEG.clientHeight - G.avail) + 'px'; scroller.scrollTop = Math.max(0, y - G.avail / 2 + G.rowH / 2); }
  }
  CH.on((e) => {
    if (e.task !== state.task) return; const v = cur(); if (!v) return;
    if (e.type === 'shown') { if (scroller) scroller.scrollTop = 0; renderLegend(v); renderSignals(); return; }
    const sel = CH.state(v.task).sel, r = sel && v.by.get(sel);
    if (sel !== state.lastSel) reveal(v);
    state.lastSel = sel;
    drawEEG(v);
    if (r && v.task === 'chb' && $('#pair-lead').value !== r.channel && [...$('#pair-lead').options].some((o) => o.value === r.channel)) { state.pairLead = r.channel; $('#pair-lead').value = r.channel; renderPair(v); }
  });

  // ── Text blocks ───────────────────────────────────
  function renderLegend(v) {
    const lg = $('#legend'), it = v.it, gain = gainOf(v), auto = state.gain[v.task] === 'auto', base = state.base[v.task], rows = rowsOf(v), lim = gain / 2;
    let html = '';
    if (v.task === 'chb') html += Object.keys(M.CHAIN_NAME).map((k) => '<span style="--c:' + M.CHAIN_COLOR[k] + '"><i></i>' + M.CHAIN_NAME[k] + '</span>').join('') + '<span class="lg-ann"><i></i>Annotated seizure time</span>';
    else if (isCap(v.task)) html += '<span style="--c:' + M.REGION_COLOR.L + '"><i></i>Left</span><span style="--c:' + M.REGION_COLOR.Z + '"><i></i>Midline</span><span style="--c:' + M.REGION_COLOR.R + '"><i></i>Right</span><span class="lg-ann lg-line"><i></i>' + (v.task === 'pain' ? 'Laser stimulus' : 'Cue and trial events') + '</span>';
    else html += '<span style="--c:' + SLEEP_COLOR[0] + '"><i></i>Fpz–Cz</span><span style="--c:' + SLEEP_COLOR[1] + '"><i></i>Pz–Oz</span>';
    let over = 0, total = 0;
    for (const r of rows) { total += r.x.length; for (const x of r.x) if (Math.abs(x) > lim) over++; }
    const share = over / total;
    html += '<span class="lg-gain' + (over ? ' has-clip' : '') + '">' + gain + ' µV per row (bracket at the right edge) · each trace is shown within ±' + (lim % 1 ? lim.toFixed(1) : lim) + ' µV of its baseline<br><small>' + (auto ? (gain !== base ? 'Auto gain: this window is larger than most, so it is shown at ' + gain + ' instead of ' + base + ' µV per row. ' : 'Auto gain: the default for these examples. ') : 'Fixed gain. ') + (over ? (share < 0.001 ? '<0.1' : (share * 100).toFixed(1)) + '% of the samples are outside the display range: the trace is cut at its row edge and marked ▲▼ there. This is a display limit set by the gain, not an event in the recording; Fit amplitude shows everything.' : 'Nothing is outside the display range.') + '</small></span>';
    const ao = $('#gain option[value=auto]'); if (ao) ao.textContent = 'Auto · ' + gainOf(v) + ' µV/row';
    lg.innerHTML = html;
    const split = S().status.kind === 'test' ? 'test' : it.split === 'val' ? 'development (validation)' : it.split;
    const items = ['<b class="it">' + A.esc(it.record_label) + '</b>'];
    if (v.task === 'pain') items.push('<span class="it">stimulus at +' + clock(Math.round(it.stimulus_time_s * 10) / 10) + '</span>', '<span class="it">−1 to +2 s</span>');
    else if (v.task === 'mi') items.push('<span class="it">trial ' + (it.trial_num != null ? it.trial_num : '') + (it.cue_time_s != null ? ' · cue at +' + clock(Math.round(it.cue_time_s * 10) / 10) : '') + '</span>', '<span class="it">' + v.dur + ' s shown</span>');
    else items.push('<span class="it" title="Elapsed time from recording start">record +' + clock(it.start_s) + '–' + clock(it.end_s) + '</span>', '<span class="it">' + v.dur + ' s</span>');
    items.push('<span class="it">' + TASK[v.task].name + '</span>', '<span class="it">' + split + '</span>');
    $('#src').innerHTML = items.join(' ');
    $('#montage-label').textContent = v.task === 'chb' ? 'longitudinal bipolar' : rows.length + ' of ' + CH.info(v.task).n + ' input channels';
    $('#eeg-guide').textContent = v.task === 'mi' ? 'EEG: voltage (µV) over time. The axis is seconds from the cue. ' + (S().info.window_note || '') : v.task === 'pain' ? 'EEG: voltage (µV) over time. The axis is seconds from the laser stimulus; the window the model reads runs from −1 s to +2 s.' : 'EEG: voltage (µV) over time. The axis is seconds within this ' + TASK[v.task].unit + '.';
    $('#ts-window').textContent = v.dur + ' s';
    { const sw = sweepOf(v), eff = v.dur / sw; $('#ts-play').textContent = sw.toFixed(1) + ' s per ' + TASK[v.task].unit + ' · ' + (Math.round(eff * 10) % 10 ? eff.toFixed(1) : eff.toFixed(0)) + '× recording speed' + (SP && eff < SP.get(v.task) - 0.05 ? ' (capped: at least ' + SWEEP_MIN + ' s per ' + TASK[v.task].unit + ')' : ''); }
  }
  let ansKind = '', ansView = null;
  function renderAnswer(v) {
    const body = $('#ans-body'), done = answered(), it = v.it;
    $('#ans').classList.toggle('pending', !done);
    $('#ans-status').textContent = done ? 'recorded output' : 'replaying EEG…'; $('#ans-status').classList.toggle('live', !done);
    $('#q-text').textContent = S().info.question;
    { const pm = /-(\d+)$/.exec(it.phrasing_id || ''); $('#q-kind').textContent = 'Training wording' + (pm ? ' · phrasing ' + (+pm[1] + 1) : ''); }
    const kind = v.task === 'pain' ? 'score' : v.task === 'chb' ? 'noul' : 'choice';
    if (ansKind !== kind + v.task) {
      body.innerHTML = '<div class="big"><span class="big-v"></span><span class="big-l"></span></div><div class="ans-view"></div>';
      const host = body.querySelector('.ans-view');
      ansView = kind === 'score' ? A.score(host) : kind === 'noul' ? A.noul(host, { thrLabel: 'development threshold' }) : v.task === 'mi' ? A.choice(host, { ids: S().info.candidates, label: candLabel }) : A.choice(host);
      ansKind = kind + v.task;
    }
    const bv = body.querySelector('.big-v'), bl = body.querySelector('.big-l'), wait = '<b>Waiting for the replay</b>to finish this ' + TASK[v.task].unit;
    const stamp = $('#stamp'), why = $('#gate-why');
    $('#gate').classList.toggle('pending', !done);
    stamp.className = 'stamp' + (done ? '' : ' wait');
    if (!done) { $('#stamp-text').textContent = 'Shown with the answer'; why.textContent = ''; }
    if (v.task === 'mi') {
      const pr = it.probabilities, top = topOf(pr), same = top === it.label;
      bv.textContent = done ? candLabel(top) : '—'; bv.style.color = done ? M.classColor(S().info.candidates, top) : ''; bv.classList.add('big-text');
      bl.innerHTML = done ? '<b>Top answer</b>probability ' + pct(pr[top]) : wait;
      ansView.set(pr, done);
      if (done) { stamp.classList.add(same ? 'ref-ok' : 'ref-diff'); $('#stamp-text').textContent = 'Cue: ' + candLabel(it.label); why.textContent = (same ? 'Same as the model’s top answer.' : 'The model’s top answer is ' + candLabel(top) + '.') + ' The label is the task the participant was cued to perform, not a measured movement.'; }
    } else if (kind === 'choice') {
      bv.classList.remove('big-text');
      const top = M.topStage(it.probabilities);
      bv.textContent = done ? top : '—'; bv.style.color = done ? M.STAGE_COLOR[top] : '';
      bl.innerHTML = done ? '<b>' + M.STAGE_NAME[top] + '</b>probability ' + pct(it.probabilities[top]) : wait;
      ansView.set(it.probabilities, done);
      document.querySelectorAll('.stages li').forEach((li) => li.classList.toggle('on', done && li.dataset.stage === top));
      if (done) { const same = top === it.label; stamp.classList.add(same ? 'ref-ok' : 'ref-diff'); $('#stamp-text').textContent = 'Hypnogram: ' + it.label; why.textContent = (same ? 'Same stage as the model’s top answer.' : 'The model’s top answer is ' + top + '.') + ' One scorer labelled the whole 30-s epoch.'; }
    } else if (kind === 'noul') {
      const p = it.p_yes, over = state.thr != null && p >= state.thr, yes = it.label === 'yes';
      bv.textContent = done ? pct(p) : '—'; bv.style.color = done && over ? TEAL : '';
      bl.innerHTML = done ? '<b>Model P(seizure overlap)</b>' + (state.thr == null ? 'raw model output' : (over ? 'at or above' : 'below') + ' the ' + (state.thr * 100).toFixed(1) + '% threshold') : wait;
      ansView.set(p, state.thr, done);
      if (done) {
        const same = over === yes; stamp.classList.add(same ? 'ref-ok' : 'ref-diff');   // dataset label next to the model probability
        $('#stamp-text').textContent = yes ? 'Dataset label: seizure overlap' : 'Dataset label: no seizure overlap';
        why.textContent = (yes ? 'An annotated seizure covers ' + it.annotated_overlap_s.toFixed(1).replace(/\.0$/, '') + ' of these 5 s; any overlap makes the label “yes”. ' : 'No annotated seizure overlaps this 5-second window. ') + (same ? 'The thresholded answer agrees.' : yes ? 'The model stays below the threshold: a miss.' : 'The model is above the threshold: a false alarm.');
      }
    } else {
      const st = v.stats, err = st.expected - it.rating;
      bv.textContent = done ? st.expected.toFixed(1) : '—'; bv.style.color = '';
      bl.innerHTML = done ? '<b>Expected rating</b>sum of rating × probability, 0–10' : wait;
      ansView.set(it.probabilities, it.rating, done);
      if (done) { stamp.classList.add(Math.abs(err) <= 1.5 ? 'ref-ok' : 'ref-diff'); $('#stamp-text').textContent = 'Reported ' + it.rating_raw_text; why.textContent = 'Expected − reported = ' + M.signed(err, 2) + ' rating points. The participant rated this stimulus a few seconds after it.'; }
    }
  }
  // Seizure: this window and its paired window from the same record, one lead, one scale.
  function renderPair(v) {
    const box = $('#pair'), show = v.task === 'chb' && !!v.pair;
    box.hidden = !show; if (!show) return;
    const sel = $('#pair-lead');
    if (sel.dataset.for !== v.id) { sel.innerHTML = v.rows.map((r) => '<option value="' + r.channel + '">' + leadName(r.channel) + '</option>').join(''); sel.dataset.for = v.id; if (state.pairLead && v.rows.some((r) => r.channel === state.pairLead)) sel.value = state.pairLead; }
    const name = sel.value, a = v.rows.find((r) => r.channel === name), b = v.pair.rows.find((r) => r.channel === name);
    let peak = 0; for (const r of [a, b]) for (const x of r.x) peak = Math.max(peak, Math.abs(x));
    const scale = Math.max(50, Math.ceil(peak / 50) * 50), p = progress();
    const one = (canvas, vv, r, prog) => {
      if (!canvas.clientWidth) return;
      const { ctx, w, h } = fit(canvas), left = 6, right = w - 42, top = 8, bottom = h - 20, midY = (top + bottom) / 2, X = (t) => left + (t / vv.dur) * (right - left);
      for (const [s0, s1] of annotated(vv)) { const e = Math.min(s1, prog * vv.dur); if (e > s0) { ctx.fillStyle = 'rgba(242,184,75,.08)'; ctx.fillRect(X(s0), top, X(e) - X(s0), bottom - top); ctx.fillStyle = AMBER; ctx.fillRect(X(s0), top, X(e) - X(s0), 2); } }
      ctx.font = mono(10); ctx.fillStyle = DIM;
      for (let t = 0; t <= vv.dur; t++) { const x = Math.round(X(t)) + 0.5; ctx.strokeStyle = 'rgba(141,154,167,.14)'; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); ctx.textAlign = t === 0 ? 'left' : t === vv.dur ? 'right' : 'center'; ctx.fillText(t + ' s', x, h - 5); }
      ctx.strokeStyle = 'rgba(141,154,167,.2)'; ctx.beginPath(); ctx.moveTo(left, midY); ctx.lineTo(right, midY); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
      ctx.strokeStyle = M.COLORS.cue; ctx.lineWidth = 1.2; ctx.beginPath();
      const N = r.x.length, end = Math.max(2, Math.floor(N * prog));
      for (let k = 0; k < end; k++) { const x = left + (k / (N - 1)) * (right - left), y = midY - (r.x[k] / scale) * (bottom - top) / 2; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
      ctx.textAlign = 'right'; ctx.fillStyle = DIM; ctx.fillText('+' + scale, w - 2, top + 8); ctx.fillText('µV', w - 2, midY + 3); ctx.fillText('−' + scale, w - 2, bottom - 2); ctx.textAlign = 'left';
    };
    one($('#pair-a'), v, a, p); one($('#pair-b'), v.pair, b, 1);
    const roleName = (x) => (x.it.role === 'seizure' ? 'Seizure window' : 'Non-seizure window');
    $('#pair-a-label').textContent = 'This window · ' + roleName(v).toLowerCase(); $('#pair-a-time').textContent = '+' + clock(v.it.start_s) + '–' + clock(v.it.end_s);
    $('#pair-b-label').textContent = 'Same record · ' + roleName(v.pair).toLowerCase(); $('#pair-b-time').textContent = '+' + clock(v.pair.it.start_s) + '–' + clock(v.pair.it.end_s);
    $('#pair-note').textContent = leadName(name) + ', mean removed, one voltage scale (±' + scale + ' µV) for both windows. Pairing rule: the non-seizure window is the last window of the same record that ends at least 300 s before the annotated onset (or the first one 300 s after the end); it was not chosen by its model output. Lead choice is for inspection; the dataset does not name a seizure focus.';
  }
  function chipLabel(v) {
    const it = v.it;
    if (v.task === 'sleep') return ['<b style="color:' + M.STAGE_COLOR[it.label] + '">' + it.label + '</b>', it.record_label];
    if (v.task === 'chb') return ['<b class="' + (it.role === 'seizure' ? 'c-sz' : 'c-bg') + '">' + (it.role === 'seizure' ? 'Seizure window' : 'Non-seizure window') + '</b>', it.record_label.replace(/ · ses-\d+/, '')];
    if (v.task === 'mi') return ['<b style="color:' + M.classColor(S().info.candidates, it.label) + '">' + candLabel(it.label) + '</b>', it.subject_id + (it.session ? ' · ' + it.session : '')];
    return ['<b class="c-pain">Rating ' + it.rating_raw_text + '</b>', it.subject_id];
  }
  function chipAnswer(v) {
    const it = v.it;
    if (v.task === 'sleep') { const t = M.topStage(it.probabilities); return t + ' ' + pct(it.probabilities[t]); }
    if (v.task === 'chb') return 'p ' + pct(it.p_yes);
    if (v.task === 'mi') { const t = topOf(it.probabilities); return candLabel(t) + ' ' + pct(it.probabilities[t]); }
    return 'exp. ' + v.stats.expected.toFixed(1);
  }
  const visible = (v) => !(state.task === 'mi' && state.filter) || v.it.label === state.filter;
  function renderStrip() {
    const s = S(), strip = $('#case-strip'), k = state.idx[state.task];
    const fb = $('#case-filter'), ids = state.task === 'mi' ? s.info.candidates : null;
    fb.hidden = !ids;
    if (ids) fb.innerHTML = '<span class="cf-k">Show</span>' + [null].concat(ids).map((k) => '<button type="button" class="cf-b" aria-pressed="' + (state.filter === k) + '" data-k="' + (k == null ? '' : A.esc(k)) + '">' + (k == null ? 'All' : A.esc(candLabel(k))) + '</button>').join('');
    strip.innerHTML = s.items.map((v, i) => {
      if (!visible(v)) return '';
      const [a, b] = chipLabel(v), seen = state.answered[state.task].has(v.id);
      return '<button type="button" role="option" class="case-chip' + (i === k ? ' on' : '') + (seen ? ' seen' : '') + '" data-i="' + i + '" aria-selected="' + (i === k) + '" tabindex="' + (i === k ? 0 : -1) + '"><span class="cc-n mono">' + String(i + 1).padStart(2, '0') + '</span><span class="cc-ref">' + a + '<small>' + A.esc(b) + '</small></span><span class="cc-ans mono">' + (seen ? chipAnswer(v) : '·') + '</span></button>';
    }).join('');
    const on = strip.querySelector('.on');
    if (on && strip.scrollWidth > strip.clientWidth) strip.scrollLeft += on.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - on.offsetWidth) / 2;
  }
  function renderTransport() {
    const s = S(), shown = s.items.filter(visible), n = shown.length, k = Math.max(0, shown.indexOf(s.items[state.idx[state.task]]));
    $('#counter').textContent = String(k + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    con.classList.toggle('is-paused', !state.playing);
    $('#play').setAttribute('aria-label', state.playing ? 'Pause replay' : 'Play replay');
    const u = TASK[state.task].unit;
    $('#replay-state').textContent = reduce ? 'Reduced motion · full ' + u + ' and saved answer shown' : state.phase === 'sweep' ? (state.playing ? 'Replaying' : 'Paused') + ' · drawing the saved EEG; the answer follows the full ' + u : state.playing ? 'Answer shown · next example in ' + Math.max(0, Math.ceil(HOLD - state.elapsed)) + ' s' : 'Paused · full ' + u + ' and saved answer shown';
    $('#play-status').classList.toggle('live', state.playing && state.phase === 'sweep');
  }
  const AN = window.EEGJevAnalysis;
  const analyse = (v) => { if (AN) { if (!v.annotated) v.annotated = annotated(v); AN.show(v, S(), progress()); } };
  function renderSignals() { const v = cur(); if (!v) return; drawEEG(v); drawAxis(v); analyse(v); renderPair(v); }
  function renderAll() {
    const v = cur(); if (!v) return;
    con.dataset.task = state.task;
    drawScalp(); reveal(v); renderLegend(v); renderAnswer(v); renderStrip(); renderTransport(); renderSignals();
    $('#console-foot').textContent = S().set.selection_rule;
    $('#monitor').setAttribute('aria-labelledby', 'tab-' + state.task);
  }

  // ── Clock ─────────────────────────────────────────
  function markAnswered() { const v = cur(); if (v && !state.answered[state.task].has(v.id)) { state.answered[state.task].add(v.id); renderStrip(); } }
  const onScreen = () => !document.hidden && state.visible;
  function schedule() { if (!state.raf && state.playing && !reduce) state.raf = requestAnimationFrame(tick); }
  function tick() {
    state.raf = 0;
    if (!state.playing || !S()) { state.last = 0; return; }
    if (!onScreen()) { state.last = 0; setTimeout(schedule, 400); return; }
    const now = performance.now(), dt = state.last ? Math.min(0.25, (now - state.last) / 1000) : 0; state.last = now;
    state.elapsed += dt;
    if (state.phase === 'sweep') {
      if (state.elapsed >= sweepOf(cur())) { state.phase = 'hold'; state.elapsed = 0; markAnswered(); const v = cur(); renderAnswer(v); renderTransport(); renderSignals(); }
      else { const v = cur(); drawEEG(v); analyse(v); if (v.task === 'chb') renderPair(v); }
    } else if (state.elapsed >= HOLD) { go(state.idx[state.task] + 1, true); return; }
    schedule();
  }
  function go(k, fromPlay) {
    const s = S(); if (!s) return;
    if (typeof G !== 'undefined' && G.on) { G.on = false; guideShow(); }
    const n = s.items.length, dir = k < state.idx[state.task] ? -1 : 1;
    k = ((k % n) + n) % n;
    for (let tries = 0; tries < n && !visible(s.items[k]); tries++) k = (((k + dir) % n) + n) % n;   // skip trials hidden by the class filter
    state.idx[state.task] = k;
    state.phase = reduce ? 'hold' : 'sweep'; state.elapsed = 0; state.last = 0;
    if (!fromPlay && !reduce) state.playing = true;
    if (reduce) markAnswered();
    renderAll(); schedule();
  }
  function settle() { state.phase = 'hold'; state.elapsed = 0; state.playing = false; markAnswered(); }
  function setPlaying(on) {
    state.playing = on && !reduce; state.last = 0;
    if (state.playing && state.phase === 'hold') { state.phase = 'sweep'; state.elapsed = 0; }
    renderAll(); schedule();
  }
  let req = 0;
  async function setTask(task, quiet) {
    const r = ++req;
    state.task = task; state.err = null; state.filter = null;
    document.querySelectorAll('.console .types [role=tab]').forEach((b) => { const on = b.dataset.task === task; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    con.dataset.task = task; con.classList.add('is-loading'); con.classList.remove('is-error');
    if (!quiet) document.dispatchEvent(new CustomEvent('eegjev:taskchange', { detail: { task } }));
    try { await loadTask(task); }
    catch (e) { if (r !== req) return; con.classList.remove('is-loading'); con.classList.add('is-error'); boot.hidden = false; boot.innerHTML = 'The recorded examples could not be loaded (' + A.esc(e.message) + '). <button type="button" class="btn-ghost" id="retry">Try again</button>'; $('#retry').onclick = () => setTask(task, true); return; }
    if (r !== req) return;
    con.classList.remove('is-loading'); boot.hidden = true;
    const sel = $('#gain'); sel.innerHTML = '<option value="auto"' + (state.gain[task] === 'auto' ? ' selected' : '') + '>Auto</option>' + TASK[task].gains.map((g) => '<option value="' + g + '"' + (g === state.gain[task] ? ' selected' : '') + '>' + g + ' µV/row</option>').join('');
    state.phase = reduce ? 'hold' : 'sweep'; state.elapsed = 0; state.last = 0; state.playing = !reduce;
    if (reduce) markAnswered();
    renderAll(); schedule();
  }

  // ── Controls ──────────────────────────────────────
  const tabs = [...document.querySelectorAll('.console .types [role=tab]')];
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { if (t.dataset.task !== state.task) setTask(t.dataset.task); });
    t.addEventListener('keydown', (e) => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -i : e.key === 'End' ? tabs.length - 1 - i : 0;
      if (!k) return; e.preventDefault(); e.stopPropagation();
      const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); n.click();
    });
  });
  document.addEventListener('eegjev:stagetask', (e) => { if (e.detail.task !== state.task) setTask(e.detail.task, true); });
  $('#play').addEventListener('click', () => setPlaying(!state.playing));
  $('#prev').addEventListener('click', () => go(state.idx[state.task] - 1));
  $('#next').addEventListener('click', () => go(state.idx[state.task] + 1));
  $('#replay-window').addEventListener('click', () => { if (reduce) return; state.phase = 'sweep'; state.elapsed = 0; state.last = 0; state.playing = true; renderAll(); schedule(); });
  $('#show-full').addEventListener('click', () => { settle(); renderAll(); });
  const setGain = (g) => { state.gain[state.task] = g; panel.refresh(); const sel = $('#gain'), num = (o) => (o.value === 'auto' ? -1 : +o.value); if (g !== 'auto' && ![...sel.options].some((o) => +o.value === g)) { const o = document.createElement('option'); o.value = String(g); o.textContent = g + ' µV/row'; sel.appendChild(o); [...sel.options].sort((a, b) => num(a) - num(b)).forEach((x) => sel.appendChild(x)); } sel.value = String(g); const v = cur(); renderLegend(v); renderSignals(); };
  $('#gain').addEventListener('change', (e) => setGain(e.target.value === 'auto' ? 'auto' : +e.target.value));
  // Fit amplitude: the smallest 1-2-5 step at which no sample of the window on screen leaves its row.
  $('#fit-amp').addEventListener('click', () => { const v = cur(); if (!v) return; let peak = 0; for (const r of rowsOf(v)) for (const x of r.x) peak = Math.max(peak, Math.abs(x)); const need = Math.max(peak, 1e-6) * 2, e = Math.pow(10, Math.floor(Math.log10(need))), g = [1, 2, 5, 10].map((m) => m * e).find((x) => x >= need); setGain(g); });
  $('#pair-lead').addEventListener('change', (e) => { state.pairLead = e.target.value; renderPair(cur()); });
  const strip = $('#case-strip');
  strip.addEventListener('click', (e) => { const b = e.target.closest('.case-chip'); if (b) go(+b.dataset.i); });
  $('#case-filter').addEventListener('click', (e) => { const b = e.target.closest('.cf-b'); if (!b) return; state.filter = b.dataset.k || null; const v = cur(); if (v && !visible(v)) go(state.idx[state.task] + 1); else { renderStrip(); renderTransport(); } });
  strip.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0, s = S();
    if (!s) return;
    let k = state.idx[state.task];
    if (d) k += d; else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = s.items.length - 1; else return;
    e.preventDefault(); e.stopPropagation();
    go(k); const b = strip.querySelector('.case-chip.on'); if (b) b.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !state.visible) return;
    const t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'SUMMARY' || (t && t.closest && (t.closest('#stage') || t.closest('.score')))) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.idx[state.task] - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(state.idx[state.task] + 1); }
    else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); setPlaying(!state.playing); }
  });
  new IntersectionObserver((en) => { state.visible = en[0].isIntersecting && en[0].intersectionRatio >= 0.15; if (state.visible) { state.last = 0; schedule(); } }, { threshold: [0, 0.15, 0.5] }).observe(con);
  document.addEventListener('visibilitychange', () => { state.last = 0; if (!document.hidden) schedule(); });
  if (rm.addEventListener) rm.addEventListener('change', (e) => { reduce = e.matches; if (reduce) settle(); if (S()) renderAll(); });
  let rz = 0; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (S()) { renderSignals(); renderStrip(); } }); });
  // Guide: four steps over the example on screen. It only points and explains; every number stays the saved one.
  const G = { on: false, k: 0 };
  const GUIDE = [
    { sel: '.monitor .scope', title: 'The recorded EEG', text: (v) => ({ sleep: 'One 30-second epoch of two EEG leads, in microvolts. The model receives exactly this stretch, nothing before or after it.', chb: 'One 5-second window of 18 bipolar leads. The amber strip at the top marks the part an annotated seizure covers, if any.', mi: 'One trial around the moment the target appears (0 s). The lighter band is the 4 seconds the model reads; the amber bar underneath shows pause, target and cursor control.', pain: 'One laser trial: 1 second before the stimulus (dashed line) and 2 seconds after it, here for nine of the 63 leads the model reads.' }[v.task]) },
    { sel: '.decide .q', also: '#ans', title: 'The question and the typed answer', text: (v) => ({ sleep: 'The question asks for one of five stages, so the answer type is Choice: one probability per stage. The stage shown large is simply the most probable one.', chb: 'The question is a yes-or-no statement about this window, so the answer type is Noul: one probability. The dashed mark is a threshold fixed on development data.', mi: 'The question lists four conditions, so the answer type is Choice: one probability for each. The option shown large is the most probable one.', pain: 'The question asks for a rating on a scale, so the answer type is Score: a probability for each rating from 0 to 10. The large number is the expected value of that distribution.' }[v.task]) },
    { sel: '#gate', title: 'The dataset’s own label', text: (v) => ({ sleep: 'The hypnogram stage a human scorer gave this epoch. It is shown next to the answer; the model never saw it.', chb: 'Whether an annotated seizure interval touches these 5 seconds at all. Compare it with the answer and the threshold.', mi: 'The target the participant was cued with. It says what they were asked to do, not what the brain did.', pain: 'The rating the participant gave a few seconds after this stimulus, and how far the expected value is from it.' }[v.task]) },
    { sel: '#analysis-details', title: 'What the signal itself shows', text: (v) => ({ sleep: 'A spectrogram and the share of slow and fast rhythms. Deep sleep shows as strong slow power; relaxed wakefulness as an 8–12 Hz band.', chb: 'A spectrogram and the line length of every lead. During a seizure the traces usually travel much further per second than in the paired background window.', mi: 'A spectrogram and the change of 8–13 Hz and 13–30 Hz power at C3, Cz and C4 relative to the pause before the target. These are measurements, not the model’s reasons.', pain: 'A stimulus-aligned spectrogram and simple amplitude statistics around the stimulus. In a single trial the evoked response is often hidden in the background activity.' }[v.task]) }
  ];
  function guideShow() {
    const v = cur(); if (!v) return;
    document.querySelectorAll('.guide-focus').forEach((e) => e.classList.remove('guide-focus'));
    $('#guide-card').hidden = !G.on; $('#guide-start').setAttribute('aria-expanded', String(G.on));
    if (!G.on) return;
    const s = GUIDE[G.k];
    if (s.sel === '#analysis-details') $('#analysis-details').open = true;
    $('#guide-step').textContent = (G.k + 1) + ' / ' + GUIDE.length; $('#guide-title').textContent = s.title; $('#guide-copy').textContent = s.text(v);
    $('#guide-prev').disabled = G.k === 0; $('#guide-next').textContent = G.k === GUIDE.length - 1 ? 'Finish' : 'Next step';
    for (const q of [s.sel, s.also]) { const e = q && document.querySelector(q); if (e) e.classList.add('guide-focus'); }
    const t = document.querySelector(s.sel); if (t) t.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  $('#guide-start').addEventListener('click', () => { G.on = !G.on; G.k = 0; if (G.on) { settle(); renderAll(); } guideShow(); });
  $('#guide-prev').addEventListener('click', () => { G.k = Math.max(0, G.k - 1); guideShow(); });
  $('#guide-next').addEventListener('click', () => { if (G.k === GUIDE.length - 1) { G.on = false; guideShow(); $('#guide-start').focus(); } else { G.k++; guideShow(); } });
  $('#guide-exit').addEventListener('click', () => { G.on = false; guideShow(); $('#guide-start').focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && G.on) { G.on = false; guideShow(); } });
  window.EEGJevGuideQA = () => ({ on: G.on, step: G.k, title: $('#guide-title').textContent, focus: [...document.querySelectorAll('.guide-focus')].map((e) => e.id || e.className) });
  const bib = $('#copy-bib');
  if (bib) bib.addEventListener('click', async (e) => { try { await navigator.clipboard.writeText($('#bib').textContent); e.target.textContent = 'Copied'; } catch (_) { e.target.textContent = 'Select the text to copy'; } setTimeout(() => { e.target.textContent = 'Copy BibTeX'; }, 1800); });

  window.EEGJevConsoleView = () => cur();
  window.EEGJevConsoleQA = () => { const v = cur(); return { task: state.task, index: state.idx[state.task], n: S() ? S().items.length : null, item: v ? v.id : null, phase: state.phase, playing: state.playing, progress: progress(), sweep: v ? sweepOf(v) : null, hold: HOLD, state: $('#replay-state').textContent, rows: v ? rowsOf(v).map((r) => CH.keyOf(r.channel)) : null, scroll: v && scroller ? { top: scroller.scrollTop, max: rowGeom(v, cEEG.clientHeight).max, rowH: rowGeom(v, cEEG.clientHeight).rowH, y0: rowGeom(v, cEEG.clientHeight).top } : null, gain: v ? gainOf(v) : null, gainMode: state.gain[state.task], gainBase: state.base[state.task], err: state.err,
    big: $('#ans-body .big-v') ? $('#ans-body .big-v').textContent : null, stamp: $('#stamp-text').textContent, why: $('#gate-why').textContent, question: $('#q-text').textContent, window_id: v ? v.it.window_id : null, dur: v ? v.dur : null, leads: v ? rowsOf(v).length : null }; };
  setTask('sleep', true);
})();
