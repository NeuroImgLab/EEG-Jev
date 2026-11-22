/* Replay stage: one recording keeps running on its own time axis, with a saved
   answer for every model window.
   Sleep and seizure: one continuous excerpt whose windows tile it (30-s epochs; 5-s
   windows, 5-s stride). Pain and motor imagery: continuous recordings in segments
   (blocks, runs) with the model windows where the dataset events put them: 3 s around
   each laser stimulus, 4 s from each target. The EEG between the windows is played too;
   segments are separate stretches and their boundary is marked.
   Waveform: the display signal exported for these stretches (µV), drawn with per-pixel
   min/max so peaks survive. Annotation: the dataset's own events and labels. Answers:
   saved outputs of one checkpoint; an answer appears only once its whole window has
   been drawn. Every file is checked against the material's SHA-256 list first. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const root = $('#stage'), M = window.EEGJevData, A = window.EEGJevAnswers, CUES = window.EEGJevCues, SIG = window.EEGJevSignal;
  if (!root || !M || !A) return;
  const { pct, clock, fit, envelope, leadName, capName } = M;
  const TEAL = M.COLORS.teal, AMBER = M.COLORS.amber, CUE = M.COLORS.cue, DIM = M.COLORS.dim;
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const stageColor = (s) => M.STAGE_COLOR[s] || DIM;
  const SEG = {
    chb: { view: 20, speeds: [1, 4, 16], speed: 4, gains: [50, 100, 200, 400, 800, 1600, 3200], low: 40 },
    sleep: { view: 30, speeds: [1, 10, 30], speed: 10, gains: [25, 50, 100, 200, 400], low: 90 },
    pain: { view: 12, speeds: [1, 4, 16], speed: 4, gains: [10, 20, 40, 80, 160, 320], low: 12 },
    mi: { view: 12, speeds: [1, 4, 8, 16], speed: 4, gains: [5, 10, 20, 40, 80, 160], low: 12 }
  };
  const DWELL = 5, ROW_MIN = 15;
  // Playback speed: one value per task, kept for the life of the page; slider, number and presets all read and write it.
  const Speed = (() => {
    const defaults = { sleep: 10, chb: 4, mi: 2, pain: 4 }, presets = [1, 4, 8, 16], mem = {}, subs = new Set();
    const get = (t) => (mem[t] != null ? mem[t] : defaults[t]);
    const set = (t, v) => { v = Math.max(1, Math.min(16, Math.round(+v * 10) / 10)); if (!isFinite(v) || get(t) === v) return; mem[t] = v; subs.forEach((f) => f(t, v)); };
    return { get, set, defaults, presets, on: (f) => subs.add(f) };
  })();
  window.EEGJevSpeed = Speed;
  const rateText = (v) => (Math.round(v * 10) % 10 ? v.toFixed(1) : v.toFixed(0)) + '×';
  const gainOf = (d) => d.gainManual || d.gain.few;
  const PHASE_NAME = { 'pause': 'Pause', 'target shown': 'Target shown', 'cursor control': 'Cursor control', 'after the result': 'After the result' };
  const PHASE_NOTE = { 'pause': 'Blank screen between trials (2 s).', 'target shown': 'The target is on screen for 2 s; the cursor has not started to move.', 'cursor control': 'The participant steers the cursor by imagery or rest until it reaches a target or the time runs out.', 'after the result': 'The result stays on screen for 1 s.' };
  const CH = window.EEGJevChannels;
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = rm.matches;
  const S = { task: 'sleep', T: 0, playing: !reduce, last: 0, raf: 0, timer: 0, visible: false, dwell: 0, data: {}, err: null, thr: null, progress: '' };
  const sec = $('#continuous');
  const median = (a) => SIG.percentile(a, 50);
  const TASK_NAME = { sleep: 'Sleep-EDF', chb: 'CHB-MIT', pain: 'Laser pain (ds005292)', mi: 'Stieger 2021' };
  const isScore = (d) => d.info.answer_type === 'score';
  const classColor = (d, id) => M.classColor(d.info.candidates, id);
  const className = (d, id) => (d.info.candidate_labels && d.info.candidate_labels[id]) || id;
  const topOf = (pr) => Object.keys(pr).reduce((a, b) => (pr[b] > pr[a] ? b : a));
  const rowName = (d, c) => c.label || (d.sparse ? capName(c.name) : leadName(c.name));

  // ── Loading (segment by segment) ──────────────────
  async function load(task) {
    if (S.data[task]) return S.data[task];
    const man = await M.init();
    S.thr = man.formal.seizure_thresholds_dev ? man.formal.seizure_thresholds_dev.spec99 : null;
    const hdr = await M.caseHeader(task, 0), info = M.taskInfo(task), fs = hdr.sample_rate_hz, path = info.cases[0].path;
    const d = { task, hdr, info, fs, cue: new Map(), status: man.data_status, sparse: !!hdr.sparse, L: hdr.window_length_s, word: hdr.segment_word || 'segment' };
    let acc = 0;
    d.segs = (hdr.segments || [{ name: '', label: '', file: 'signal', n_samples: hdr.n_samples, t0_record_s: hdr.t0_record_s }]).map((g, i) => {
      const o = { i, name: g.name, label: g.label, stem: path + g.file, n: g.n_samples, s0: acc, a: acc / fs, b: (acc + g.n_samples) / fs, rec0: g.t0_record_s, loaded: false, err: null };
      acc += g.n_samples; return o;
    });
    d.n = acc; d.D = acc / fs;
    d.ch = hdr.channels.map((name) => ({ name, key: CH.keyOf(name), x: new Float32Array(acc), off: 0 }));
    d.lead = new Map(d.ch.map((c) => [c.key, c]));
    // Input leads outside the default file: time chunks per segment, fetched when such a lead is on screen.
    d.rest = hdr.rest ? { keys: hdr.rest.channels.map(CH.keyOf), ready: false, busy: 0,
      chunks: hdr.rest.chunks.map((c) => { const g = d.segs[c.seg]; return { s: g.s0 + c.s0, n: c.n_samples, a: (g.s0 + c.s0) / fs, b: (g.s0 + c.s0 + c.n_samples) / fs, stem: path + c.file, state: 0, at: 0 }; }) } : null;
    const V = (g, rec) => g.a + (rec - g.rec0);   // record time inside a segment -> position on the replay axis
    const sc = info.answer_type === 'score';
    d.windows = hdr.windows.map((w, i) => {
      const g = d.segs[w.seg || 0];
      return { i, id: w.window_id, seg: g, t0: V(g, w.start_s), t1: V(g, w.end_s), rec0: w.start_s, rec1: w.end_s, w,
        pred: task === 'chb' ? w.p_yes : w.probabilities, lab: sc ? w.rating : w.label, stats: sc ? M.scoreStats(w.probabilities) : null,
        zero: sc ? V(g, w.stimulus_time_s) : V(g, w.start_s) };
    });
    d.marks = (hdr.marks || []).map((m) => ({ t: V(d.segs[m.seg], m.t_s), rec: m.t_s, label: m.label, value: m.value, kind: m.kind }));
    d.phases = (hdr.phases || []).map((p) => ({ t0: V(d.segs[p.seg], p.t0_s), t1: V(d.segs[p.seg], p.t1_s), name: p.name, emphasis: p.emphasis }));
    d.trials = (hdr.trials || []).map((t) => ({ t0: V(d.segs[t.seg], t.t0_s), t1: V(d.segs[t.seg], t.t1_s), num: t.trial_num, retained: t.retained, target: t.target, result: t.bci_result }));
    d.seiz = ((hdr.annotations && hdr.annotations.seizures) || []).map((z) => ({ on: z.onset_s - hdr.t0_record_s, off: z.offset_s - hdr.t0_record_s, rec0: z.onset_s, rec1: z.offset_s }));
    await loadSeg(d, d.segs[0]);
    for (const c of d.ch) { const n = d.segs[0].n, m = Math.min(2000, n); c.off = d.sparse ? 0 : median(Array.from({ length: m }, (_, k) => c.x[Math.floor(k * n / m)])); }
    d.gain = { few: gainFor(d, 0.5), panel: gainFor(d, 0.5) };
    S.data[task] = d;
    // The remaining segments arrive in the background, in order; playback waits at a boundary if needed.
    (async () => { for (const g of d.segs.slice(1)) { try { await loadSeg(d, g); } catch (e) { g.err = e.message; } if (S.task === task) { paint(); if (S.playing) schedule(); } } })();
    return d;
  }
  async function loadSeg(d, g) {
    g.err = null;
    const x = await M.samples(g.stem), C = d.ch.length;
    if (x.length !== C * g.n) throw new Error(g.stem + ': unexpected length');
    d.ch.forEach((c, k) => c.x.set(x.subarray(k * g.n, (k + 1) * g.n), g.s0));
    g.loaded = true;
  }
  // One fixed scale per case, from its first segment: the smallest step at which at most
  // 1% of the shown samples would leave their own row (half a row either side).
  function gainFor(d, lim) {
    const n = d.segs[0].n, step = Math.max(1, Math.floor(n / 20000));
    for (const g of SEG[d.task].gains) {
      let over = 0, tot = 0;
      for (const c of d.ch) for (let k = 0; k < n; k += step) { tot++; if (Math.abs((c.x[k] - c.off) / g) > lim) over++; }
      if (over / tot <= 0.01) return g;
    }
    return SEG[d.task].gains[SEG[d.task].gains.length - 1];
  }
  const segAt = (d, t) => d.segs.find((g) => t < g.b - 1e-9) || d.segs[d.segs.length - 1];
  const recAt = (d, t) => { const g = segAt(d, t); return g.rec0 + (t - g.a); };

  // ── Windows ───────────────────────────────────────
  const current = (d) => { let w = null; for (const x of d.windows) if (x.t1 <= S.T + 1e-6) w = x; else break; return w; };
  const nextWin = (d) => d.windows.find((x) => x.t1 > S.T + 1e-6) || null;
  const spanOf = (d, w) => '+' + clock(w.rec0) + '–' + clock(w.rec1);
  function cues(d, w) {
    if (d.cue.has(w.id)) return d.cue.get(w.id);
    let out = [];
    if (d.task === 'sleep' && CUES) {
      const a = Math.round(w.t0 * d.fs), b = Math.round(w.t1 * d.fs);
      out = CUES.describeSleep(CUES.sleep({ fs: d.fs, duration_s: 30, traces: d.ch.map((c) => ({ channel: c.name, values: Array.from(c.x.subarray(a, b)) })) }), 30);
    }
    d.cue.set(w.id, out);
    return out;
  }
  const overlapOf = (d, w) => { for (const z of d.seiz) { const a = Math.max(w.t0, z.on), b = Math.min(w.t1, z.off); if (b > a) return { start: a + d.hdr.t0_record_s, end: b + d.hdr.t0_record_s, seconds: b - a }; } return null; };
  // What the playhead is in right now (sparse recordings): a model window, a trial phase, or the stretch between events.
  function phaseAt(d, T) {
    const w = d.windows.find((x) => T >= x.t0 && T < x.t1), nx = d.windows.find((x) => x.t0 > T), tr = d.trials.find((x) => T >= x.t0 && T < x.t1), ph = d.phases.find((x) => T >= x.t0 && T < x.t1);
    return { w, nx, tr, ph, wait: nx ? nx.t0 - T : null };
  }

  // Seizure: the latest 20 s of one selectable lead, following playback.
  function comparison(d) {
    if (d.task !== 'chb' || S.T <= 0) return null;
    const seconds = Math.min(20, d.D), playedEnd = Math.min(S.T, d.D);
    const start = Math.max(0, playedEnd - seconds), stop = start + seconds;
    const c = d.ch.find((x) => x.name === d.detailLead) || d.ch[0];
    if (!d.detailScale) {
      let peak = 0;
      for (const ch of d.ch) for (let k = 0; k < ch.x.length; k += 2) peak = Math.max(peak, Math.abs(ch.x[k] - ch.off));
      d.detailScale = Math.max(100, Math.ceil(peak / 100) * 100);
    }
    return { start, stop, seconds, playedEnd, lead: c, scale: d.detailScale };
  }
  function drawComparison(d) {
    const q = comparison(d); if (!q) return;
    const canvas = $('#wc-onset'); if (!canvas.clientWidth) return;
    const { ctx, w, h } = fit(canvas), left = 8, right = w - 45, top = 26, bottom = h - 27, mid = (top + bottom) / 2;
    const X = (t) => left + (t - q.start) / q.seconds * (right - left);
    for (const z of d.seiz) { const a = Math.max(q.start, z.on), b = Math.min(q.playedEnd, z.off); if (b > a) { ctx.fillStyle = 'rgba(242,184,75,.05)'; ctx.fillRect(X(a), top, X(b) - X(a), bottom - top); } }
    ctx.font = '500 10px ' + MONO;
    for (let dt = 0; dt <= q.seconds; dt += 5) {
      const x = X(q.start + dt); ctx.strokeStyle = 'rgba(141,154,167,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      ctx.fillStyle = DIM; ctx.textAlign = dt === 0 ? 'left' : dt === q.seconds ? 'right' : 'center'; ctx.fillText(dt + ' s', x, h - 8);
    }
    ctx.strokeStyle = 'rgba(141,154,167,.2)'; ctx.beginPath(); ctx.moveTo(left, mid); ctx.lineTo(right, mid); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
    ctx.strokeStyle = CUE; ctx.lineWidth = 1.2;
    envelope(ctx, q.lead.x, q.lead.off, d.fs, q.start, q.stop, left, right - left, (v) => mid - v / q.scale * (bottom - top) / 2, q.playedEnd);
    ctx.restore();
    for (const z of d.seiz) for (const [t, label] of [[z.on, 'Annotated onset'], [z.off, 'Annotated end']]) {
      if (t < q.start || t > q.playedEnd) continue;
      const x = X(t); ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top - 8); ctx.lineTo(x, bottom); ctx.stroke();
      ctx.fillStyle = AMBER; ctx.textAlign = 'center'; ctx.fillText(label, Math.max(left + 50, Math.min(right - 50, x)), 13);
    }
    if (q.playedEnd < q.stop) { const x = X(q.playedEnd); ctx.strokeStyle = TEAL; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); }
    ctx.fillStyle = DIM; ctx.textAlign = 'right'; ctx.fillText('+' + q.scale, w - 2, top + 6); ctx.fillText('µV', w - 2, mid + 3); ctx.fillText('−' + q.scale, w - 2, bottom); ctx.textAlign = 'left';
    canvas.setAttribute('aria-label', leadName(q.lead.name) + ', current continuous detail, ' + (q.playedEnd - q.start).toFixed(1) + ' of ' + q.seconds + ' seconds drawn');
  }
  function drawSeizureEvent(ctx, d, X, left, right, top, bottom) {
    for (const z of d.seiz) {
      if (S.T < z.on) continue;
      const a = Math.max(left, X(z.on)), b = Math.min(right, X(Math.min(z.off, S.T)));
      if (b > a) {
        ctx.fillStyle = 'rgba(242,184,75,.04)'; ctx.fillRect(a, top, b - a, bottom - top);
        ctx.fillStyle = AMBER; ctx.fillRect(a, 2, b - a, 3);
        ctx.font = '500 10px ' + MONO; ctx.fillText('Annotated seizure interval', Math.max(left + 5, a + 5), 16, right - left - 10);
      }
      for (const [t, label] of [[z.on, 'Onset'], [z.off, 'End']]) {
        const x = X(t); if (t > S.T || x < left || x > right) continue;
        ctx.strokeStyle = AMBER; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = AMBER; ctx.font = '600 10px ' + MONO;
        const tw = ctx.measureText(label).width; ctx.fillText(label, Math.max(left + 3, Math.min(right - tw - 3, x + 5)), 32);
      }
    }
  }

  // ── Drawing ───────────────────────────────────────
  const cv = $('#cv-stage'), co = $('#cv-over-st'), stScroll = $('#st-scroll');
  function draw() {
    const d = S.data[S.task];
    if (!d || !cv.clientWidth) return;
    drawMain(d); drawOverview(d); drawComparison(d);
  }
  function timeGrid(ctx, d, X, v0, v1, g, pw, w, top, h, bottom, minPx) {
    const V = v1 - v0, step = [1, 2, 5, 10, 15, 30, 60].find((s) => (s / V) * pw >= minPx) || 60;
    for (const sg of d.segs) {
      if (sg.b <= v0 || sg.a >= v1) continue;
      const r0 = sg.rec0 + Math.max(v0, sg.a) - sg.a, r1 = sg.rec0 + Math.min(v1, sg.b) - sg.a;
      for (let t = Math.ceil(r0 / step) * step; t <= r1 + 1e-6; t += step) {
        const x = Math.round(X(sg.a + t - sg.rec0)) + 0.5;
        ctx.strokeStyle = 'rgba(141,154,167,.12)'; ctx.beginPath(); ctx.moveTo(x, top - 6); ctx.lineTo(x, h - bottom); ctx.stroke();
        const lb = '+' + clock(Math.round(t * 10) / 10), tw = ctx.measureText(lb).width;
        if (x - tw / 2 > g - 4 && x + tw / 2 < w) { ctx.fillStyle = DIM; ctx.fillText(lb, x - tw / 2, h - 7); }
      }
    }
  }
  // ── Leads on screen (shared channel state) ────────
  function leadsOf(d) {
    const sg = CH.sig(d.task); if (d.shownSig === sg) return d.shown;
    const I = CH.info(d.task);
    d.shownSig = sg;
    d.shown = CH.shown(d.task).map((k) => {
      let c = d.lead.get(k);
      if (!c) {
        const rest = !!(d.rest && d.rest.keys.includes(k));
        if (rest && !d.rest.ready) { for (const q of d.rest.keys) d.lead.set(q, { name: q, key: q, label: I.by.get(q) ? I.by.get(q).label : q, x: new Float32Array(d.n), off: 0, rest: true }); d.rest.ready = true; c = d.lead.get(k); }
        else { c = { name: k, key: k, label: I.by.get(k) ? I.by.get(k).label : k, x: null, off: 0, empty: true }; d.lead.set(k, c); }
      }
      return c;
    });
    return d.shown;
  }
  const colorOfLead = (d, c, i) => { const q = CH.info(d.task).by.get(c.key); return q ? q.color : '#cfd8e3'; };
  // Fetch the chunks under the view (and a little ahead) when a lead from them is shown; at most two at a time.
  function ensureChunks(d, v0, v1) {
    const R = d.rest; if (!R || !R.ready || !leadsOf(d).some((c) => c.rest)) return;
    const ahead = (v1 - v0) * 1.5, now = performance.now();
    for (const c of R.chunks) {
      if (R.busy >= 2) break;
      if (c.state === 2 || c.state === 1 || c.b < v0 - 1 || c.a > v1 + ahead) continue;
      if (c.state === 3 && now - c.at < 4000) continue;
      c.state = 1; R.busy++;
      M.samples(c.stem).then((x) => {
        const K = R.keys.length; if (x.length !== K * c.n) throw new Error('unexpected length');
        R.keys.forEach((k, j) => d.lead.get(k).x.set(x.subarray(j * c.n, (j + 1) * c.n), c.s));
        c.state = 2;
      }).catch(() => { c.state = 3; c.at = performance.now(); }).then(() => { R.busy--; if (S.task === d.task) { draw(); if (S.playing) schedule(); } });
    }
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
  // Traces up to the playhead. Each lead is drawn inside its own row only; where the trace
  // leaves the row, a thin tick at the row edge marks the cut (no flat line is drawn).
  // o: { sy, avail } when the rows scroll under a fixed time axis; hot rows follow the shared selection.
  function traces(ctx, d, leads, colorOf, gain, v0, v1, g, pw, top, rh, T, lw, o) {
    const sy = o ? o.sy : 0, avail = o ? o.avail : rh * leads.length, any = !!o && CH.anyHot(d.task);
    ctx.lineJoin = 'round';
    ctx.save(); ctx.beginPath(); ctx.rect(g, top, pw + 1, avail); ctx.clip();
    leads.forEach((c, i) => {
      const y0 = top + rh * (i + 0.5) - sy, half = rh * 0.5, yTop = y0 - half, yBot = y0 + half;
      if (yBot < top || yTop > top + avail) return;
      const hk = o ? CH.hot(d.task, c.key) : null;
      if (hk) { ctx.fillStyle = hk === 'sel' ? 'rgba(61,214,198,.10)' : 'rgba(230,237,243,.06)'; ctx.fillRect(g, yTop, pw, rh); }
      ctx.globalAlpha = any && !hk ? 0.32 : 1;
      if (c.empty) {
        ctx.strokeStyle = 'rgba(141,154,167,.55)'; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(g, Math.round(y0) + 0.5); ctx.lineTo(g + pw, Math.round(y0) + 0.5); ctx.stroke(); ctx.setLineDash([]);
        if (rh >= 11) { ctx.fillStyle = DIM; ctx.font = '500 9.5px ' + MONO; ctx.fillText('empty input slot · zero in the model input', g + 8, y0 - 3); }
        ctx.globalAlpha = 1; return;
      }
      ctx.save(); ctx.beginPath(); ctx.rect(g, Math.max(yTop, top), pw, Math.min(yBot, top + avail) - Math.max(yTop, top)); ctx.clip();
      ctx.strokeStyle = colorOf(c, i); ctx.lineWidth = hk ? lw + 0.6 : lw;
      envelope(ctx, c.x, c.off, d.fs, v0, v1, g, pw, (v) => y0 - (v / gain) * rh, T);
      ctx.restore();
      // cut marks, one per pixel column at most
      const a = Math.max(0, Math.floor(v0 * d.fs)), b = Math.min(c.x.length, Math.floor(Math.min(v1, T) * d.fs)), spp = Math.max(1, (v1 - v0) * d.fs / pw), lim = gain * 0.5;
      const ups = [], dns = [];
      for (let k = a; k < b; k += spp) {
        let up = false, dn = false;
        for (let j = Math.floor(k); j < Math.min(b, Math.floor(k + spp)); j++) { const v = c.x[j] - c.off; if (v > lim) up = true; else if (v < -lim) dn = true; }
        const px = g + ((k / d.fs - v0) / (v1 - v0)) * pw;
        if (up) ups.push(px); if (dn) dns.push(px);
      }
      if (ups.length || dns.length) { clipMarks(ctx, ups, Math.max(yTop, top), -1); clipMarks(ctx, dns, Math.min(yBot, top + avail), 1); if (o) o.clipped = true; }
      // a lead whose chunk has not arrived yet: say so instead of showing a flat line
      if (c.rest && d.rest) for (const q of d.rest.chunks) {
        if (q.state === 2 || q.b <= v0 || q.a >= Math.min(v1, T)) continue;
        const xa = g + ((Math.max(q.a, v0) - v0) / (v1 - v0)) * pw, xb = g + ((Math.min(q.b, v1, T) - v0) / (v1 - v0)) * pw;
        ctx.fillStyle = '#0c1218'; ctx.fillRect(xa, yTop + 1, xb - xa, rh - 2);
        ctx.strokeStyle = 'rgba(141,154,167,.4)'; ctx.setLineDash([1, 4]); ctx.beginPath(); ctx.moveTo(xa, Math.round(y0) + 0.5); ctx.lineTo(xb, Math.round(y0) + 0.5); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }
  // Trial phases of the original experiment as a strip with text under the plot (motor imagery).
  const phBox = $('#st-phases'); let phPool = [];
  function phaseStrip(d, v0, v1, T, g, pw) {
    const on = d.sparse && d.phases.length > 0; phBox.hidden = !on; if (!on) return;
    phBox.style.marginLeft = g + 'px'; phBox.style.width = pw + 'px';
    const vis = d.phases.filter((p) => p.t1 > v0 && p.t0 < Math.min(v1, T));
    while (phPool.length < vis.length) { const e = document.createElement('span'); phBox.appendChild(e); phPool.push(e); }
    phPool.forEach((e, i) => {
      const p = vis[i]; if (!p) { e.hidden = true; return; }
      const a = Math.max(v0, p.t0), b = Math.min(v1, T, p.t1), x = ((a - v0) / (v1 - v0)) * pw, wd = Math.max(1, ((b - a) / (v1 - v0)) * pw), nm = PHASE_NAME[p.name] || p.name, mid = (p.t0 + p.t1) / 2, tr = d.trials.find((t) => mid >= t.t0 && mid < t.t1), sg = segAt(d, mid);
      const key = p.t0 + '|' + (S.playing ? 1 : 0);
      if (e.dataset.k !== key) {
        e.dataset.k = key; e.className = 'ph ph-' + p.name.replace(/ /g, '-'); e.textContent = nm;
        const tip = nm + (tr ? ' · trial ' + tr.num : '') + ' · +' + clock(Math.round((sg.rec0 + p.t0 - sg.a) * 10) / 10) + '–' + clock(Math.round((sg.rec0 + p.t1 - sg.a) * 10) / 10) + ' (' + (p.t1 - p.t0).toFixed(1) + ' s). ' + (PHASE_NOTE[p.name] || '');
        e.title = tip; e.setAttribute('aria-label', tip); e.tabIndex = S.playing ? -1 : 0;
      }
      e.hidden = false; e.style.left = x.toFixed(1) + 'px'; e.style.width = wd.toFixed(1) + 'px'; e.classList.toggle('is-now', T >= p.t0 && T < p.t1); e.classList.toggle('is-tight', wd < nm.length * 6.4 + 10);
    });
  }
  // Fit amplitude: the smallest 1-2-5 step at which no shown lead leaves its row in the span on screen.
  function fitGain(d) {
    const V = S.view; if (!V) return null; const a = Math.max(0, Math.floor(V.v0 * d.fs)), b = Math.min(d.n, Math.ceil(Math.min(V.v1, S.T) * d.fs)); let peak = 0;
    for (const c of leadsOf(d)) { if (!c.x) continue; for (let k = a; k < b; k++) { const v = Math.abs(c.x[k] - c.off); if (v > peak) peak = v; } }
    if (!peak) return null; const need = peak * 2, e = Math.pow(10, Math.floor(Math.log10(need)));
    return [1, 2, 5, 10].map((m) => m * e).find((x) => x >= need);
  }
  function drawMain(d) {
    const seg = SEG[S.task], leads = leadsOf(d), gain = gainOf(d), sp = d.sparse;
    cv.setAttribute('aria-label', 'Recorded EEG: ' + leads.length + ' of ' + CH.info(d.task).n + ' input channels shown, ' + gain + ' microvolts per row');
    const { ctx, w, h } = fit(cv);
    const g = w < 420 ? 52 : 64, top = S.task === 'sleep' ? 22 : 50, bottom = 26, pw = w - g - 14, avail = h - top - bottom, rh = Math.max(leads.length > 24 ? ROW_MIN : 0, avail / leads.length);
    const maxSy = Math.max(0, rh * leads.length - avail), sy = Math.min(maxSy, stScroll ? stScroll.scrollTop : 0);
    if (stScroll) { const want = Math.round(rh * leads.length + h - avail) + 'px', sp2 = stScroll.firstElementChild; if (sp2.style.height !== want) sp2.style.height = want; stScroll.classList.toggle('can-scroll', maxSy > 0); }
    S.geom = { top, avail, rh, sy, maxSy };
    const T = Math.min(S.T, d.D), V = Math.min(seg.view, d.D), v1 = Math.max(V, T), v0 = v1 - V;
    ensureChunks(d, v0, v1);
    const X = (t) => g + ((t - v0) / V) * pw;
    ctx.font = '500 10.5px ' + MONO;
    timeGrid(ctx, d, X, v0, v1, g, pw, w, top, h, bottom, 78);
    const cw = current(d);
    if (S.task === 'chb') {
      for (const x of d.windows) { if (x.t0 <= v0 || x.t0 >= v1) continue; const xx = Math.round(X(x.t0)) + 0.5; ctx.strokeStyle = 'rgba(230,237,243,.13)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(xx, top - 6); ctx.lineTo(xx, h - bottom); ctx.stroke(); ctx.setLineDash([]); }
      drawSeizureEvent(ctx, d, X, g, g + pw, top - 6, h - bottom);
    } else if (S.task === 'sleep') {
      for (const x of d.windows) {
        if (x.t1 <= v0 || x.t0 >= v1) continue;
        const a = Math.max(g, X(x.t0)), b = Math.min(g + pw, X(x.t1));
        ctx.fillStyle = stageColor(x.lab); ctx.fillRect(a + 1, 2, b - a - 2, 4);
        if (b - a > 28) { ctx.font = '600 10px ' + MONO; ctx.fillText(x.lab, a + 4, 17); ctx.font = '500 10.5px ' + MONO; }
      }
    } else {
      // Sparse recordings: every model window reached so far is outlined; trial boundaries and dataset events are marked.
      for (const x of d.windows) {
        if (x.t1 <= v0 || x.t0 >= v1 || x.t0 > T) continue;
        const a = Math.max(g, X(x.t0)), b = Math.min(g + pw, X(Math.min(x.t1, v1)));
        ctx.fillStyle = 'rgba(230,237,243,.035)'; ctx.fillRect(a, top - 6, b - a, h - bottom - top + 6);
        ctx.fillStyle = 'rgba(230,237,243,.55)'; ctx.fillRect(a, top - 6, b - a, 1.5);
        ctx.font = '500 9.5px ' + MONO; ctx.fillStyle = 'rgba(230,237,243,.75)'; const lb = 'model window · ' + d.L + ' s'; if (b - a > ctx.measureText(lb).width + 8) ctx.fillText(lb, a + 4, top - 10);
      }
      for (const tr of d.trials) {
        if (tr.t0 <= v0 || tr.t0 >= v1 || tr.t0 > T) continue;
        const x = Math.round(X(tr.t0)) + 0.5; ctx.strokeStyle = 'rgba(230,237,243,.22)'; ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h - bottom); ctx.stroke();
        ctx.font = '500 9.5px ' + MONO; ctx.fillStyle = DIM; { const lb = 'trial ' + tr.num + (tr.retained ? '' : ' · no saved answer'), tw = ctx.measureText(lb).width; if (x + 4 + tw <= g + pw) ctx.fillText(lb, x + 4, 42); else if (x - 4 - tw >= g) ctx.fillText(lb, x - 4 - tw, 42); }
      }
      for (const m of d.marks) {
        if (m.t < v0 || m.t > v1 || m.t > T) continue;
        const x = Math.round(X(m.t)) + 0.5;
        ctx.strokeStyle = AMBER; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, top - 6); ctx.lineTo(x, h - bottom); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
        ctx.fillStyle = AMBER; ctx.font = '600 10px ' + MONO;
        const lb = m.kind === 'target' ? 'Target shown: ' + className(d, m.value) : m.label, tw = ctx.measureText(lb).width; ctx.fillText(lb, Math.min(g + pw - tw - 2, x + 5), 14);
      }
      for (const p of d.phases) {
        if (p.name !== 'cursor control' || p.t0 <= v0 || p.t0 >= v1 || p.t0 > T) continue;
        const x = Math.round(X(p.t0)) + 0.5;
        ctx.strokeStyle = 'rgba(255,181,71,.6)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x, top - 6); ctx.lineTo(x, h - bottom); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,181,71,.9)'; ctx.font = '500 9.5px ' + MONO; const lb = 'Cursor control', tw = ctx.measureText(lb).width; if (x + 4 + tw <= g + pw) ctx.fillText(lb, x + 4, 30);
      }
    }
    for (const sg of d.segs) {
      if (sg.i && sg.a > v0 && sg.a < v1 && sg.a <= T) {
        const x = Math.round(X(sg.a)) + 0.5;
        ctx.strokeStyle = 'rgba(230,237,243,.7)'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x - 2, 0); ctx.lineTo(x - 2, h - bottom); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, h - bottom); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#e6edf3'; ctx.font = '600 10px ' + MONO; const lb = sg.label + ' begins · the time before it is not recorded', tw = ctx.measureText(lb).width; { const lx = Math.max(g + 2, Math.min(g + pw - tw - 2, x + 8)); ctx.fillStyle = 'rgba(11,17,23,.88)'; ctx.fillRect(lx - 4, h - bottom - 17, tw + 8, 15); ctx.fillStyle = '#e6edf3'; ctx.fillText(lb, lx, h - bottom - 6); }
      }
      if (!sg.loaded && sg.b > v0 && sg.a < v1) { const a = Math.max(g, X(sg.a)), b = Math.min(g + pw, X(sg.b)); ctx.fillStyle = 'rgba(141,154,167,.06)'; ctx.fillRect(a, top, b - a, h - bottom - top); ctx.fillStyle = DIM; ctx.font = '500 11px ' + MONO; ctx.fillText(sg.err ? 'This ' + d.word + ' could not be loaded' : 'Loading ' + sg.label + '…', a + 10, top + 20); }
    }
    if (cw && cw.t1 > v0) {
      const a = Math.max(g, X(cw.t0)), b = X(cw.t1);
      ctx.fillStyle = 'rgba(61,214,198,.06)'; ctx.fillRect(a, top - 6, b - a, h - bottom - top + 6);
      ctx.strokeStyle = 'rgba(61,214,198,.55)'; ctx.lineWidth = 1; ctx.strokeRect(a + 0.5, top - 6.5, b - a - 1, h - bottom - top + 7);
    }
    const tro = { sy, avail, clipped: false };
    traces(ctx, d, leads, (c, i) => (S.task === 'chb' ? '#cfd8e3' : colorOfLead(d, c, i)), gain, v0, v1, g, pw, top, rh, T, 1, tro);
    S.view = { v0, v1, g, pw, w }; $('#st-clipkey').hidden = !tro.clipped; phaseStrip(d, v0, v1, T, g, pw);
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, g, avail); ctx.clip();
    const anyHot = CH.anyHot(d.task);
    leads.forEach((c, i) => {
      const y0 = top + rh * (i + 0.5) - sy, hk = CH.hot(d.task, c.key);
      if (y0 < top - rh || y0 > top + avail + rh || (rh < 11 && i % 2 && !hk)) return;
      ctx.fillStyle = hk ? '#e6edf3' : DIM; ctx.globalAlpha = anyHot && !hk ? 0.5 : 1; ctx.font = (hk ? '600 ' : '500 ') + (rh < 14 ? '9.5px' : '11px') + ' ' + MONO; ctx.fillText(rowName(d, c), 4, y0 + 4);
    });
    ctx.globalAlpha = 1; ctx.restore();
    // Amplitude scale: a bar one row high equals the gain in µV.
    { const x = g + pw + 6, y = top + rh / 2; ctx.strokeStyle = 'rgba(230,237,243,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 3, y - rh / 2 + 1); ctx.lineTo(x, y - rh / 2 + 1); ctx.lineTo(x, y + rh / 2 - 1); ctx.lineTo(x - 3, y + rh / 2 - 1); ctx.stroke(); ctx.lineWidth = 1; }
    if (T < d.D && T >= v0) { const x = X(T); ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top - 6); ctx.lineTo(x, h - bottom); ctx.stroke(); }
    const detail = comparison(d);
    if (detail) {
      const i = leads.findIndex((c) => c.name === detail.lead.name), topD = top - sy;
      const a = Math.max(g, X(detail.start)), b = Math.min(g + pw, X(detail.playedEnd));
      if (i >= 0 && b > a) { ctx.strokeStyle = CUE; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.strokeRect(a, topD + rh * i + 1, b - a, rh - 2); ctx.setLineDash([]); }
    }
  }
  function drawOverview(d) {
    if (!co.clientWidth) return;
    const { ctx, w, h } = fit(co);
    const g = 70, pw = w - g - 8, X = (t) => g + (t / d.D) * pw, T = Math.min(S.T, d.D);
    ctx.font = '500 10px ' + MONO; ctx.fillStyle = DIM;
    const c = d.ch[d.sparse ? Math.floor(d.ch.length / 2) : 0], amp = gainOf(d) * 1.2;
    ctx.fillText('EEG', 4, 15);
    ctx.strokeStyle = 'rgba(207,216,227,.55)'; ctx.lineWidth = 1;
    envelope(ctx, c.x, c.off, d.fs, 0, d.D, g, pw, (v) => 13 - Math.max(-11, Math.min(11, (v / amp) * 11)), d.D);
    ctx.fillStyle = 'rgba(9,13,18,.55)'; if (T < d.D) ctx.fillRect(X(T), 0, g + pw - X(T), 26);
    for (const sg of d.segs) {
      if (sg.i) { const x = Math.round(X(sg.a)) + 0.5; ctx.strokeStyle = 'rgba(230,237,243,.6)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.setLineDash([]); }
      if (d.sparse) { ctx.fillStyle = DIM; ctx.font = '500 9px ' + MONO; ctx.fillText(sg.label, X(sg.a) + 4, h - 3); ctx.font = '500 10px ' + MONO; }
      if (!sg.loaded) { ctx.fillStyle = 'rgba(141,154,167,.12)'; ctx.fillRect(X(sg.a), 0, X(sg.b) - X(sg.a), h); }
    }
    if (d.sparse && isScore(d)) {
      const y0 = 30, y1 = h - 14, Y = (v) => y1 - (v / 10) * (y1 - y0);
      ctx.fillStyle = AMBER; ctx.fillText('◆ rating', 4, 40); ctx.fillStyle = TEAL; ctx.fillText('● model', 4, 54);
      ctx.strokeStyle = 'rgba(141,154,167,.14)'; for (const v of [0, 10]) { ctx.beginPath(); ctx.moveTo(g, Math.round(Y(v)) + 0.5); ctx.lineTo(g + pw, Math.round(Y(v)) + 0.5); ctx.stroke(); }
      for (const x of d.windows) {
        const cx = X(x.zero), done = x.t1 <= S.T + 1e-6;
        if (done) { ctx.strokeStyle = 'rgba(230,237,243,.28)'; ctx.beginPath(); ctx.moveTo(cx, Y(x.lab)); ctx.lineTo(cx, Y(x.stats.expected)); ctx.stroke(); }
        ctx.fillStyle = AMBER; ctx.beginPath(); const yr = Y(x.lab); ctx.moveTo(cx, yr - 3.4); ctx.lineTo(cx + 3.4, yr); ctx.lineTo(cx, yr + 3.4); ctx.lineTo(cx - 3.4, yr); ctx.closePath(); ctx.fill();
        if (done) { ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(cx, Y(x.stats.expected), 2.8, 0, 7); ctx.fill(); }
      }
    } else if (d.sparse) {
      ctx.fillText('target', 4, 38); ctx.fillText('model', 4, 54);
      for (const tr of d.trials) { const cx = X(tr.t0 + 2); ctx.fillStyle = classColor(d, tr.target); ctx.globalAlpha = tr.retained ? 1 : 0.35; ctx.fillRect(cx - 1.5, 30, 3, 11); ctx.globalAlpha = 1; }
      for (const x of d.windows) {
        if (x.t1 > S.T + 1e-6) continue;
        const top = topOf(x.pred), cx = X(x.t0); ctx.fillStyle = classColor(d, top); ctx.fillRect(cx - 1.5, 46, 3, 11);
        if (top !== x.lab) { ctx.fillStyle = '#ffb547'; ctx.beginPath(); ctx.arc(cx, 61, 1.8, 0, 7); ctx.fill(); }
      }
    } else if (S.task === 'chb') {
      ctx.fillText('annotation', 4, 36); ctx.fillText('model', 4, 56);
      for (const z of d.seiz) {
        const a = X(Math.max(0, z.on)), b = X(Math.min(d.D, z.off));
        ctx.fillStyle = 'rgba(242,184,75,.9)'; ctx.fillRect(a, 30, b - a, 8);
        ctx.font = '500 9px ' + MONO; ctx.fillStyle = AMBER;
        ctx.textAlign = 'right'; ctx.fillText('+' + clock(z.rec0), a - 4, 37);
        ctx.textAlign = 'left'; ctx.fillText('+' + clock(z.rec1), b + 4, 37);
      }
      if (S.thr != null) { const y = Math.round(66 - S.thr * 20) + 0.5; ctx.strokeStyle = 'rgba(230,237,243,.3)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(g, y); ctx.lineTo(g + pw, y); ctx.stroke(); ctx.setLineDash([]); }
      for (const x of d.windows) { if (x.t1 > S.T + 1e-6) continue; const p = x.pred, a = X(x.t0) + 0.5, b = X(x.t1) - 0.5; ctx.fillStyle = S.thr != null && p >= S.thr ? TEAL : 'rgba(61,214,198,.5)'; ctx.fillRect(a, 66 - p * 20, Math.max(1.5, b - a), Math.max(1, p * 20)); }
    } else {
      ctx.fillText('annotation', 4, 36); ctx.fillText('model', 4, 56);
      for (const x of d.windows) {
        const a = X(x.t0) + 0.5, b = X(x.t1) - 0.5;
        ctx.fillStyle = stageColor(x.lab); ctx.globalAlpha = .3; ctx.fillRect(a, 29, b - a, 11); ctx.globalAlpha = 1;
        if (b - a > 12) ctx.fillText(x.lab.replace('REM', 'R'), a + 2, 38);
        if (x.t1 > S.T + 1e-6) continue;
        const top = M.topStage(x.pred);
        ctx.fillStyle = stageColor(top); ctx.globalAlpha = .3; ctx.fillRect(a, 47, b - a, 13); ctx.globalAlpha = 1;
        if (b - a > 12) ctx.fillText(top.replace('REM', 'R'), a + 2, 57);
        if (x.lab !== top) { ctx.fillStyle = '#ffb547'; ctx.beginPath(); ctx.arc((a + b) / 2, 66, 2.2, 0, 7); ctx.fill(); }
      }
    }
    const V = Math.min(SEG[S.task].view, d.D), v1 = Math.max(V, T);
    ctx.strokeStyle = 'rgba(230,237,243,.5)'; ctx.lineWidth = 1; ctx.strokeRect(X(v1 - V) + 0.5, 0.5, Math.max(3, X(v1) - X(v1 - V)), h - 1);
    ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(T), 0); ctx.lineTo(X(T), h); ctx.stroke();
  }

  // ── Text ──────────────────────────────────────────
  let meterKind = '', meter = null;
  function meterFor(kind) {
    const host = $('#st-meter');
    if (meterKind !== kind) { host.className = 'st-meter'; host.innerHTML = ''; meterKind = kind; meter = kind === 'score' ? A.score(host, { compact: true }) : kind === 'noul' ? A.noul(host, { thrLabel: 'dev threshold' }) : null; }
    return meter;
  }
  function render() {
    const d = S.data[S.task];
    root.dataset.task = S.task; root.dataset.mode = 'record';
    root.classList.toggle('is-paused', !S.playing);
    $('#st-play').setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
    $('#st-q').textContent = (M.manifest() && M.taskInfo(S.task)) ? M.taskInfo(S.task).question : '';
    const trialTask = S.task === 'pain' || S.task === 'mi';
    $('#st-mode').textContent = 'Continuous replay';
    $('#st-mode-note').textContent = S.task === 'pain' ? 'Three recorded blocks of one participant on their real time axis; the model answers once per rated laser stimulus.' : S.task === 'mi' ? 'Consecutive trials of one session as the file stores them; the model answers once per retained trial.' : 'One recording, end to end, with a saved answer for every window.';
    root.classList.toggle('is-sparse', trialTask);
    if (S.err) { root.classList.add('is-error'); root.classList.remove('is-loading'); $('#st-rec').textContent = ''; $('#st-ans').textContent = 'Material not shown'; $('#st-ans').style.color = ''; $('#st-ans-sub').textContent = S.err; $('#st-meter').innerHTML = ''; meterKind = ''; $('#st-gate').textContent = ''; $('#st-next-at').innerHTML = '<button type="button" class="st-retry" id="st-retry">Try again</button>'; $('#st-retry').onclick = () => { S.err = null; setTask(S.task, true); }; return; }
    root.classList.remove('is-error');
    if (!d) { root.classList.add('is-loading'); $('#st-rec').textContent = 'Loading the recording…'; $('#st-time').textContent = S.progress || 'loading and checking SHA-256'; $('#st-ans').textContent = 'Loading…'; $('#st-ans').style.color = ''; $('#st-ans-sub').textContent = 'The recording is downloaded once and checked before it is shown.'; $('#st-meter').innerHTML = ''; meterKind = ''; $('#st-gate').textContent = ''; $('#st-next-at').textContent = ''; $('#st-ref').textContent = ''; $('#st-agree').textContent = ''; return; }
    root.classList.remove('is-loading');
    const seg = SEG[S.task], T = Math.min(S.T, d.D), sp = d.sparse, sg = segAt(d, T), rate = Speed.get(S.task);
    const split = d.status.kind === 'test' ? 'test' : d.hdr.split === 'val' ? 'development (validation)' : d.hdr.split;
    $('#st-rec').textContent = sp
      ? d.hdr.record_label + ' · ' + TASK_NAME[S.task] + ' ' + split + ' · ' + d.segs.length + ' ' + d.word + 's, ' + d.windows.length + ' model windows'
      : d.hdr.record_label + ' · ' + TASK_NAME[S.task] + ' ' + split + ' · continuous +' + clock(d.hdr.t0_record_s) + '–' + clock(d.hdr.t1_record_s);
    const cw = current(d), nx = nextWin(d);
    $('#st-time').textContent = (sp ? sg.label + ' · ' : '') + '+' + clock(Math.round(recAt(d, T) * 10) / 10) + ' · ' + T.toFixed(0) + ' / ' + d.D.toFixed(0) + ' s · ' + rateText(rate) + ' recording speed · ' + gainOf(d) + ' µV per row (bracket at right)';
    { const n = leadsOf(d).length, N = CH.info(d.task).n; $('#st-chcount').textContent = n + ' of ' + N; $('#st-chbtn').title = 'Showing ' + n + ' of ' + N + ' input channels'; }
    const sc = $('#st-scrub'); sc.value = String(Math.round((T / d.D) * 1000));
    sc.setAttribute('aria-valuetext', T.toFixed(0) + ' of ' + d.D.toFixed(0) + ' seconds');
    { const sl = $('#st-rate'); if (document.activeElement !== sl || +sl.value !== rate) sl.value = String(rate);
      sl.setAttribute('aria-valuetext', rateText(rate) + ' recording speed'); $('#st-rate-val').textContent = rateText(rate);
      root.querySelectorAll('.st-speed button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.sp === rate)));
      const gs = $('#st-gain'), gk = S.task + '|' + (d.gainManual || 'auto') + '|' + d.gain.few;
      if (gs.dataset.k !== gk) { gs.dataset.k = gk; const list = seg.gains.slice(); if (d.gainManual && !list.includes(d.gainManual)) list.push(d.gainManual); list.sort((a, b) => a - b);
        gs.innerHTML = '<option value="auto">Auto · ' + d.gain.few + ' µV/row</option>' + list.map((v) => '<option value="' + v + '">' + v + ' µV/row</option>').join(''); gs.value = d.gainManual ? String(d.gainManual) : 'auto'; }
      // Who and where: participant, session, the run or block under the playhead, and the phase of the original experiment.
      const ph = sp ? phaseAt(d, T) : null, unitN = S.task === 'sleep' ? 'epoch' : 'window';
      let where = '<b>' + esc(d.hdr.record_label) + '</b>' + (sp ? ' · <b>' + esc(sg.label) + '</b> <span>(' + (sg.i + 1) + ' of ' + d.segs.length + ' ' + d.word + 's)</span>' : ' <span>· ' + unitN + ' ' + (Math.min(d.windows.length, Math.floor(T / d.L) + 1)) + ' of ' + d.windows.length + '</span>');
      if (sp && !isScore(d)) where += ' · <em class="ph-now ph-' + (ph.ph ? ph.ph.name.replace(/ /g, '-') : 'none') + '">' + (ph.ph ? PHASE_NAME[ph.ph.name] : 'Between trials') + '</em>' + (ph.tr ? ' <span>trial ' + ph.tr.num + (ph.ph ? ' · ' + (T - ph.ph.t0).toFixed(1) + ' of ' + (ph.ph.t1 - ph.ph.t0).toFixed(1) + ' s</span>' : '</span>') : '');
      else if (sp) where += ' · <em class="ph-now">' + (ph.w ? 'Model window around the laser stimulus' : ph.nx ? 'Between stimuli' : 'After the last rated stimulus') + '</em>';
      if ($('#st-where').dataset.h !== where) { $('#st-where').dataset.h = where; $('#st-where').innerHTML = where; } }
    const unit = S.task === 'sleep' ? 'epoch' : sp ? 'trial' : 'window';
    $('#st-count').textContent = (sp ? 'answer ' : unit + ' ') + (cw ? String(cw.i + 1).padStart(2, '0') : '··') + ' / ' + d.windows.length;
    const stepName = sp ? (isScore(d) ? 'stimulus' : 'model window') : unit;
    $('#st-prev').setAttribute('aria-label', 'Previous ' + stepName); $('#st-next').setAttribute('aria-label', 'Next ' + stepName);
    $('#st-prev').title = 'Previous ' + stepName; $('#st-next').title = 'Next ' + stepName;

    const ans = $('#st-ans'), sub = $('#st-ans-sub'), gate = $('#st-gate'), ansCard = root.querySelector('.sr-ans'), cueCard = root.querySelector('.sr-cue'), refCard = root.querySelector('.sr-ref');
    const aw = cw;
    ansCard.classList.remove('missing'); ansCard.classList.toggle('waiting', !aw);
    const detail = comparison(d);
    if (S.task === 'chb') { const sel = $('#wc-lead'); if (!sel.options.length) sel.innerHTML = d.ch.map((c) => '<option value="' + c.name + '">' + leadName(c.name) + '</option>').join(''); }
    cueCard.hidden = S.task === 'chb' && !detail;
    $('#st-comparison').hidden = !detail;
    $('#st-cue').hidden = S.task === 'chb';
    $('#st-cue-title').textContent = S.task === 'chb' ? 'Current waveform detail' : S.task === 'pain' ? 'Rating scale' : S.task === 'mi' ? 'The cued tasks' : 'Signal cue';
    $('#st-cue-source').textContent = S.task === 'chb' ? 'continuous EEG' : S.task === 'pain' ? 'dataset instructions' : S.task === 'mi' ? 'dataset protocol' : 'rule-based measurement';
    if (detail) {
      $('#wc-lead').value = detail.lead.name;
      $('#wc-onset-time').textContent = '+' + clock(d.hdr.t0_record_s + detail.start) + '–' + clock(d.hdr.t0_record_s + detail.stop) + ' · same scale for all leads';
      $('#wc-text').textContent = detail.playedEnd < detail.stop ? (detail.playedEnd - detail.start).toFixed(1) + ' / ' + detail.seconds + ' s drawn. The remaining signal appears as playback reaches it.' : 'Follows playback · purple box marks this lead and time range.';
    }
    cueCard.classList.toggle('pending', S.task === 'sleep' && !aw); refCard.classList.toggle('pending', !aw);
    // Where the playhead is: inside a model window, in a trial phase, or between events.
    if (sp) {
      const ph = phaseAt(d, T); let now;
      if (!sg.loaded) now = sg.err ? 'This ' + d.word + ' could not be loaded.' : 'Waiting for ' + sg.label + ' to download…';
      else if (ph.w) now = 'Now: model window being read · ' + (T - ph.w.t0).toFixed(1) + ' of ' + d.L + ' s';
      else if (isScore(d)) now = ph.nx ? 'Now: between stimuli · next stimulus in ' + Math.max(0, ph.nx.zero - T).toFixed(0) + ' s' : 'Now: after the last rated stimulus';
      else now = 'Now: ' + (ph.ph ? ph.ph.name : 'between trials') + (ph.tr ? ' · trial ' + ph.tr.num + (ph.tr.retained ? '' : ' (not in the benchmark split: no saved answer)') : '') + (ph.nx ? ' · next model window in ' + ph.wait.toFixed(0) + ' s' : '');
      if (aw && !ph.w && sg.loaded) now += ' · the card shows the answer for ' + (isScore(d) ? 'stimulus ' + (aw.i + 1) : 'trial ' + aw.w.trial_num);
      if (sg.err) { $('#st-next-at').innerHTML = now + ' <button type="button" class="st-retry" id="st-retry-seg">Try again</button>'; $('#st-retry-seg').onclick = () => { loadSeg(d, sg).catch((e) => { sg.err = e.message; }).then(() => { paint(); if (S.playing) schedule(); }); sg.err = null; paint(); }; }
      else $('#st-next-at').textContent = now;
    } else $('#st-next-at').textContent = aw && nx ? 'Next answer at +' + clock(nx.rec1) + ' (' + unit + ' ' + (nx.i + 1) + ')' : aw ? 'Last ' + unit + ' of the excerpt' : '';
    const kind = S.task === 'pain' ? 'score' : S.task === 'chb' ? 'noul' : 'choice', mt = meterFor(kind);
    $('#st-meter').style.gridTemplateColumns = '';
    const bars = (ids, pr, top, colorOf, short) => ids.map((k) => '<span class="m-st' + (k === top ? ' on' : '') + '" title="' + short(k) + ' ' + pct(pr[k]) + '"><i style="height:' + Math.max(4, pr[k] * 100) + '%;background:' + colorOf(k) + '"></i><b>' + short(k) + '</b></span>').join('');
    if (!aw) {
      const w0 = d.windows[0], f = Math.max(0, Math.min(1, (T - w0.t0) / (w0.t1 - w0.t0)));
      ans.textContent = sp ? 'First answer after the first model window' : 'First answer at +' + clock(w0.rec1);
      ans.style.color = '';
      sub.textContent = 'One answer per whole ' + d.L + '-s ' + (sp ? 'model window' : unit) + (f > 0 ? ' · ' + (f * d.L).toFixed(1) + ' of ' + d.L + ' s drawn' : '');
      if (kind === 'score') mt.set(w0.pred, null, false);
      else if (kind === 'noul') mt.set(null, S.thr, false);
      else $('#st-meter').innerHTML = '<span class="m-wait"><i style="width:' + (f * 100).toFixed(1) + '%"></i></span>';
      gate.textContent = '';
      if (S.task === 'sleep') $('#st-cue').innerHTML = '<p class="ph">Computed for each epoch once it is complete.</p>';
      $('#st-ref').textContent = ''; $('#st-ref').style.color = '';
      $('#st-agree').textContent = S.task === 'mi' ? 'The cued target appears with the answer.' : S.task === 'pain' ? 'The reported rating appears with the answer.' : S.task === 'chb' ? 'Compared with the answer once the window is complete; the amber strip on the plot is the annotation itself.' : 'Compared with the answer once the epoch is complete.';
      $('#st-agree').className = 'st-agree ph';
    } else if (S.task === 'chb') {
      const p = aw.pred, over = S.thr != null && p >= S.thr, yes = aw.lab === 'yes', ov = overlapOf(d, aw);
      ans.textContent = pct(p); ans.style.color = over ? TEAL : '#e6edf3';
      sub.textContent = 'model P(seizure overlap) for window ' + spanOf(d, aw);
      mt.set(p, S.thr, true);
      gate.textContent = S.thr == null ? '' : (over ? 'At or above' : 'Below') + ' the development threshold (' + (S.thr * 100).toFixed(1) + '%)';
      $('#st-ref').style.color = '';
      $('#st-ref').textContent = yes ? 'Dataset label: seizure overlap' : 'Dataset label: no seizure overlap';
      const same = over === yes;
      $('#st-agree').textContent = (yes && ov ? 'An annotated seizure covers ' + ov.seconds.toFixed(0) + ' of these 5 s (+' + clock(ov.start) + '–' + clock(ov.end) + '); any overlap makes the label “yes”. ' : 'No annotated seizure overlaps this 5-second window. ') +
        (S.thr == null ? '' : same ? 'The thresholded answer agrees with the label.' : yes ? 'The model stays below the threshold here: a miss.' : 'The model is above the threshold without an annotation: a false alarm.');
      $('#st-agree').className = 'st-agree ' + (same ? 'ok' : 'differ');
    } else if (S.task === 'mi') {
      const pr = aw.pred, ids = d.info.candidates, top = topOf(pr), second = ids.filter((k) => k !== top).reduce((a, b) => (pr[b] > pr[a] ? b : a)), same = top === aw.lab;
      ans.textContent = className(d, top); ans.style.color = classColor(d, top);
      sub.textContent = 'Saved answer for trial ' + aw.w.trial_num + ' · probability ' + pct(pr[top]) + ' · model window +' + clock(Math.round(aw.rec0 * 10) / 10) + '–' + clock(Math.round(aw.rec1 * 10) / 10) + ' (4 s from the target)';
      $('#st-meter').style.gridTemplateColumns = 'repeat(' + ids.length + ', 1fr)';
      $('#st-meter').innerHTML = bars(ids, pr, top, (k) => classColor(d, k), (k) => (d.info.candidate_short && d.info.candidate_short[k]) || className(d, k));
      gate.textContent = 'Runner-up ' + className(d, second) + ' ' + pct(pr[second]);
      $('#st-ref').style.color = classColor(d, aw.lab); $('#st-ref').textContent = 'Target: ' + className(d, aw.lab);
      $('#st-agree').textContent = (same ? 'Same as the model’s top answer. ' : 'Differs from the model (' + className(d, top) + '). ') + 'The label is the cued target, not a measured movement.';
      $('#st-agree').className = 'st-agree ' + (same ? 'ok' : 'differ');
    } else if (S.task === 'pain') {
      const st = aw.stats, err = st.expected - aw.lab;
      ans.textContent = st.expected.toFixed(1); ans.style.color = '';
      sub.textContent = 'Saved answer for stimulus ' + (aw.i + 1) + ' at +' + clock(Math.round(aw.w.stimulus_time_s * 10) / 10) + ' (' + aw.seg.label + ') · expected rating · model window 1 s before to 2 s after';
      mt.set(aw.pred, aw.lab, true);
      gate.textContent = 'Most likely single rating: ' + st.mode + ' (' + pct(st.pmax) + ')';
      $('#st-ref').style.color = ''; $('#st-ref').textContent = 'Reported ' + aw.w.rating_raw_text;
      $('#st-agree').textContent = 'Expected − reported = ' + M.signed(err, 1) + ' rating points. The participant gave this rating a few seconds after the stimulus.';
      $('#st-agree').className = 'st-agree ' + (Math.abs(err) <= 1.5 ? 'ok' : 'differ');
    } else {
      const pr = aw.pred, top = M.topStage(pr), second = M.STAGES.filter((s) => s !== top).reduce((a, b) => (pr[b] > pr[a] ? b : a));
      ans.textContent = top + ' · ' + M.STAGE_NAME[top]; ans.style.color = '';
      sub.textContent = 'probability ' + pct(pr[top]) + ' for epoch ' + spanOf(d, aw);
      $('#st-meter').innerHTML = bars(M.STAGES, pr, top, (k) => M.STAGE_COLOR[k], (k) => k);
      gate.textContent = 'Runner-up ' + second + ' ' + pct(pr[second]);
      $('#st-cue').innerHTML = cues(d, aw).map((c) => '<p>' + c.text + '</p>').join('');
      const st = aw.lab, same = top === st;
      $('#st-ref').style.color = stageColor(st); $('#st-ref').textContent = st + ' · ' + M.STAGE_NAME[st];
      $('#st-agree').textContent = (same ? 'Same stage as the model. ' : 'Differs from the model (' + top + '): worth a second look. ') + 'One scorer, one stage per 30 s.';
      $('#st-agree').className = 'st-agree ' + (same ? 'ok' : 'differ');
    }
    if (S.task === 'pain') {
      const sc2 = d.info.scale;
      if ($('#st-cue').dataset.k !== 'scale') { $('#st-cue').dataset.k = 'scale'; $('#st-cue').innerHTML = '<ul class="st-anchors">' + Object.keys(sc2.anchors).map((k) => '<li><b class="mono">' + k + '</b>' + sc2.anchors[k] + '</li>').join('') + '</ul><p class="ph">The model answers with a probability for each of the 11 ratings.</p><dl class="st-terms"><dt>Laser stimulus</dt><dd>A brief laser heat pulse to the skin. The participant rates it a few seconds later; that rating is the label.</dd></dl>'; }
    } else if (S.task === 'mi') {
      if ($('#st-cue').dataset.k !== 'mi') { $('#st-cue').dataset.k = 'mi'; $('#st-cue').innerHTML = '<ul class="st-anchors st-classes">' + d.info.candidates.map((k) => '<li><b style="color:' + classColor(d, k) + '">●</b>' + ((d.info.candidate_texts && d.info.candidate_texts[k]) || className(d, k)) + '</li>').join('') + '</ul><p class="ph">' + (d.info.protocol_note || '') + '</p><dl class="st-terms"><dt>Target shown</dt><dd>The target appears on screen for 2 s; the cursor has not started to move.</dd><dt>Cursor control</dt><dd>The participant steers the cursor by imagery or rest until it reaches a target or the time runs out (about 6 s).</dd></dl>'; }
    } else $('#st-cue').dataset.k = '';
    $('#st-context').textContent = S.task === 'chb'
      ? 'One recording played through an annotated seizure and the non-seizure EEG around it, in 5-s windows. Amber marks dataset timing; teal shows saved model outputs.'
      : S.task === 'pain' ? 'The EEG between stimuli is played as recorded (' + leadsOf(d).length + ' of the ' + d.hdr.channels_model_input + ' input channels shown). The model reads only the outlined 3 s around each rated laser stimulus, 1 s before and 2 s after; its answer stays on the card until the next one. Dashed double lines separate the blocks.'
      : S.task === 'mi' ? 'Every trial of the two runs, laid end to end as the file stores them (not clock time). Pause, target shown, cursor control and the second after the result are phases of the original BCI experiment; the strip under the plot names them. The answers are saved EEG-Jev outputs for the outlined 4 s after each target.'
      : 'Ten continuous minutes of one night · ' + d.windows.length + ' consecutive 30-s epochs, one saved answer each.';
    $('#st-more').hidden = sp;
    if (sp && sec && !sec.hidden) { sec.hidden = true; more.setAttribute('aria-expanded', 'false'); root.classList.remove('is-more'); }
    draw();
    hero(d, cw);
  }
  // The hero's centre shows the window the stage has just answered (or the first one
  // while it is drawn); its card shows that window's saved answer, nothing else.
  function hero(d, cw) {
    const H = window.EEGJevHero; if (!H) return;
    const T = Math.min(S.T, d.D), w = cw || d.windows[0], done = !!cw, p = done ? 1 : Math.max(0, Math.min(1, (T - w.t0) / (w.t1 - w.t0)));
    let answer;
    if (!done) answer = d.sparse ? 'First answer after the first model window' : 'First answer at +' + clock(w.rec1);
    else if (S.task === 'chb') answer = 'Window ' + (w.i + 1) + '/' + d.windows.length + ' · P(seizure overlap) ' + pct(w.pred);
    else if (S.task === 'mi') { const top = topOf(w.pred); answer = 'Trial ' + w.w.trial_num + ' · ' + className(d, top) + ' ' + pct(w.pred[top]) + ' · target ' + className(d, w.lab); }
    else if (S.task === 'pain') answer = 'Stimulus ' + (w.i + 1) + '/' + d.windows.length + ' · expected ' + w.stats.expected.toFixed(1) + ' · reported ' + w.w.rating_raw_text;
    else { const top = M.topStage(w.pred); answer = 'Epoch ' + (w.i + 1) + '/' + d.windows.length + ' · ' + top + ' ' + pct(w.pred[top]); }
    const leads = d.ch, gain = gainOf(d);
    H.show({
      task: S.task, answer, out: done,
      caption: d.hdr.record_label.replace(/ · /g, ' ') + ' · +' + clock(Math.round(w.rec0 * 10) / 10) + '–' + clock(Math.round(w.rec1 * 10) / 10) + (done ? '' : ' · being drawn'),
      key: 'rec|' + S.task + '|' + w.id + '|' + (p < 1 ? Math.floor(p * 200) : 'done'),
      draw: (ctx, cw2, h) => {
        const rh = h / leads.length, t1 = w.t0 + (w.t1 - w.t0) * p;
        leads.forEach((c, i) => {
          const y0 = rh * (i + 0.5);
          const yOf = (v) => y0 - (v / gain) * rh;
          ctx.save(); ctx.beginPath(); ctx.rect(0, y0 - rh / 2, cw2, rh); ctx.clip();   // each lead stays in its own row
          ctx.strokeStyle = S.task === 'sleep' ? (i ? '#8fe3b8' : '#7cc4ff') : '#cfd8e3'; ctx.lineWidth = 1.05;
          if (p < 1) { ctx.globalAlpha = 0.16; envelope(ctx, c.x, c.off, d.fs, w.t0, w.t1, 0, cw2, yOf, w.t1); ctx.globalAlpha = 1; }
          envelope(ctx, c.x, c.off, d.fs, w.t0, w.t1, 0, cw2, yOf, t1);
          ctx.restore();
        });
        return p;
      }
    });
  }

  // ── Every lead, opened inside the stage (#continuous; sleep and seizure) ──
  const cC = $('#cv-cont');
  function lowVisible() {
    if (!sec || sec.hidden || document.hidden) return false;
    const r = sec.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
    return Math.min(r.bottom, vh) - Math.max(r.top, 0) >= Math.min(160, 0.2 * vh);
  }
  function drawLowEEG(d, cw, nx) {
    if (!cC.clientWidth) return;
    const { ctx, w, h } = fit(cC);
    const leads = d.ch, gain = d.gain.panel;
    const g = w < 420 ? 52 : 70, top = d.task === 'chb' ? 50 : 24, bottom = 24, pw = w - g - 8, rh = (h - top - bottom) / leads.length;
    const T = Math.min(S.T, d.D), V = Math.min(SEG[d.task].low, d.D), v1 = Math.max(V, T), v0 = v1 - V;
    const X = (t) => g + ((t - v0) / V) * pw;
    ctx.font = '500 10.5px ' + MONO;
    timeGrid(ctx, d, X, v0, v1, g, pw, w, top + 2, h, bottom, 84);
    if (d.task === 'chb') drawSeizureEvent(ctx, d, X, g, g + pw, top - 4, h - bottom);
    else for (const x of d.windows) {
      if (x.t1 <= v0 || x.t0 >= v1) continue;
      const a = Math.max(g, X(x.t0)), b = Math.min(g + pw, X(x.t1));
      ctx.fillStyle = stageColor(x.lab); ctx.fillRect(a + 1, 3, b - a - 2, 4);
      if (b - a > ctx.measureText(x.lab).width + 10) ctx.fillText(x.lab, a + 4, 18);
    }
    for (const x of d.windows) {
      if (x.t0 <= v0 || x.t0 >= v1) continue;
      const xx = Math.round(X(x.t0)) + 0.5;
      ctx.strokeStyle = 'rgba(230,237,243,.16)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(xx, top - 4); ctx.lineTo(xx, h - bottom); ctx.stroke(); ctx.setLineDash([]);
    }
    if (cw && cw.t1 > v0) { const a = Math.max(g, X(cw.t0)), b = X(cw.t1); ctx.fillStyle = 'rgba(61,214,198,.07)'; ctx.fillRect(a, top - 4, b - a, h - bottom - top + 4); ctx.strokeStyle = 'rgba(61,214,198,.55)'; ctx.strokeRect(a + 0.5, top - 3.5, b - a - 1, h - bottom - top + 3); }
    if (nx && nx.t0 < v1 && T > nx.t0) { const a = Math.max(g, X(nx.t0)), b = Math.min(g + pw, X(Math.min(nx.t1, v1))); ctx.strokeStyle = 'rgba(61,214,198,.45)'; ctx.setLineDash([5, 4]); ctx.strokeRect(a + 0.5, top - 3.5, b - a - 1, h - bottom - top + 3); ctx.setLineDash([]); }
    traces(ctx, d, leads, (c, i) => (d.task === 'chb' ? M.CHAIN_COLOR[M.chainOf(c.name)] : (i ? '#8fe3b8' : '#7cc4ff')), gain, v0, v1, g, pw, top, rh, T, d.task === 'chb' ? 0.95 : 1.1);
    leads.forEach((c, i) => {
      const y0 = top + rh * (i + 0.5);
      if (rh < 10 && i % 2) return;
      ctx.fillStyle = d.task === 'chb' ? M.CHAIN_COLOR[M.chainOf(c.name)] : DIM;
      ctx.font = '500 ' + (rh < 16 ? '9.5px' : '11px') + ' ' + MONO; ctx.fillText(leadName(c.name), 4, y0 + 4);
    });
    if (T < d.D && T >= v0) { const x = X(T); ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, h - bottom); ctx.stroke(); ctx.lineWidth = 1; }
    $('#c-gain').textContent = gain + ' µV per row · one fixed scale for the whole excerpt · ' + d.fs + ' Hz display signal, per-pixel min/max · ' + leads.length + ' leads · a trace that leaves its row is cut there, with a red tick at the row edge';
  }
  let cardKey = '';
  function lowCards(d, cw) {
    const T = Math.min(S.T, d.D), k = cw ? cw.i : -1;
    const vw = window.innerWidth || 1200, n = Math.min(d.windows.length, vw > 1180 ? 5 : vw >= 760 ? 3 : 2), before = n === 5 ? 2 : n === 3 ? 1 : 0;
    const from = Math.max(0, Math.min(k - before, d.windows.length - n)), list = d.windows.slice(from, from + n);
    const key = d.task + '|' + n + '|' + k + '|' + list.map((x) => (x.t1 <= S.T + 1e-6 ? 'a' : Math.floor(Math.max(0, Math.min(1, (T - x.t0) / (x.t1 - x.t0))) * 40))).join(',');
    if (key === cardKey) return; cardKey = key;
    const unit = d.task === 'chb' ? 'Window' : 'Epoch';
    $('#c-ans').innerHTML = list.map((x) => {
      const head = '<span class="ca-t mono">' + unit + ' ' + (x.i + 1) + ' · ' + spanOf(d, x) + '</span>';
      if (x.t1 > S.T + 1e-6) {
        const f = Math.max(0, Math.min(1, (T - x.t0) / (x.t1 - x.t0)));
        return '<li class="waiting' + (f > 0 ? ' drawing' : '') + '">' + head + '<span class="ca-wait">Answer at +' + clock(x.rec1) + '</span><span class="ca-prog" aria-hidden="true"><i style="width:' + (f * 100).toFixed(0) + '%"></i></span><small>' + (f > 0 ? (f * d.L).toFixed(1) + ' of ' + d.L + ' s drawn' : 'not started') + '</small></li>';
      }
      let model, ref;
      if (d.task === 'chb') { model = '<b class="mono">' + pct(x.pred) + '</b> P(overlap)' + (S.thr != null ? (x.pred >= S.thr ? ' · above threshold' : ' · below threshold') : ''); ref = x.lab === 'yes' ? 'seizure overlap, ' + x.w.annotated_overlap_s.toFixed(0) + ' of 5 s' : 'no seizure overlap'; }
      else { const top = M.topStage(x.pred); model = '<b class="mono">' + top + ' ' + pct(x.pred[top]) + '</b>'; ref = x.lab; }
      return '<li class="' + (x === cw ? 'cur' : '') + '">' + head + '<span class="ca-model"><span class="src-tag tag-model">Model</span>' + model + '</span><span class="ca-ref"><span class="src-tag tag-ref">Dataset label</span>' + ref + '</span></li>';
    }).join('');
  }
  function renderLow(force) {
    if (!sec) return;
    const d = S.data[S.task];
    sec.dataset.task = S.task;
    if (!d || sec.hidden || S.err || d.sparse) return;
    if (!force && !lowVisible()) return;
    const cw = current(d), nx = nextWin(d);
    drawLowEEG(d, cw, nx); lowCards(d, cw);
  }

  // ── Clock ─────────────────────────────────────────
  const heroEl = $('#constellation');
  function heroVisible() {
    if (!heroEl || document.hidden) return false;
    const r = heroEl.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > 0 && r.top < vh;
  }
  const onScreen = () => !document.hidden && (S.visible || heroVisible() || lowVisible());
  function paint() { render(); renderLow(); }
  function schedule() {
    if (S.raf) return;
    S.raf = requestAnimationFrame(tick);
    clearTimeout(S.timer);
    S.timer = setTimeout(() => { if (S.raf) { cancelAnimationFrame(S.raf); tick(); } }, 120);
  }
  function tick() {
    S.raf = 0; clearTimeout(S.timer);
    if (!S.playing) { S.last = 0; return; }
    if (!onScreen()) { S.last = 0; setTimeout(() => { if (S.playing && !S.raf) schedule(); }, 400); return; }
    const now = performance.now(), dt = S.last ? Math.min(0.25, (now - S.last) / 1000) : 0; S.last = now;
    const d = S.data[S.task]; if (!d) return;
    if (S.T >= d.D) { S.dwell += dt; if (S.dwell >= DWELL) { S.T = d.sparse ? Math.max(0, d.windows[0].t0 - 2.5) : 0; S.dwell = 0; paint(); } }
    else {
      // Never play into a segment that has not arrived yet: wait at its boundary.
      const next = Math.min(d.D, S.T + dt * Speed.get(S.task)), sg = segAt(d, next);
      S.T = sg.loaded ? next : Math.min(next, sg.a); paint();
    }
    schedule();
  }
  // Reduced motion: no sweep, so rest where the case is most telling.
  function restT(d) {
    if (d.sparse) { const ws = d.windows.filter((w) => w.seg.loaded); let best = ws[0]; if (isScore(d)) { for (const w of ws) if (w.lab > best.lab) best = w; } else best = ws.find((w) => topOf(w.pred) === w.lab) || best; return best.t1 + 0.01; }
    if (d.task !== 'chb' || !d.seiz.length) return d.D;
    const mid = (d.seiz[0].on + d.seiz[0].off) / 2;
    let best = d.windows[d.windows.length - 1];
    for (const w of d.windows) if (Math.abs((w.t0 + w.t1) / 2 - mid) < Math.abs((best.t0 + best.t1) / 2 - mid)) best = w;
    return best.t1;
  }
  function seek(t) { const d = S.data[S.task]; if (!d) return; S.T = Math.max(0, Math.min(d.D, t)); S.dwell = 0; S.last = 0; paint(); }
  function setPlaying(on) { S.playing = on && !reduce; S.last = 0; const d = S.data[S.task]; if (S.playing && d && S.T >= d.D) S.T = 0; paint(); if (S.playing) schedule(); }
  let taskRequest = 0;
  async function setTask(task, force) {
    if (!force && task === S.task) return;
    const request = ++taskRequest;
    S.playing = !reduce; S.last = 0; S.task = task; S.dwell = 0; S.err = null; S.progress = '';
    S.T = reduce ? Infinity : 0;
    root.querySelectorAll('.stage-tabs [role=tab]').forEach((b) => { const on = b.dataset.task === task; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    cardKey = ''; paint();
    try { const d = await load(task); if (request !== taskRequest) return; if (!isFinite(S.T)) S.T = restT(d); else if (d.sparse && S.T === 0) S.T = Math.max(0, d.windows[0].t0 - 2.5); }
    catch (e) { if (request !== taskRequest) return; S.err = 'The recorded material could not be loaded (' + e.message + ').'; S.playing = false; paint(); return; }
    paint(); if (S.playing) schedule();
  }

  // ── Controls ──────────────────────────────────────
  const tabs = [...root.querySelectorAll('.stage-tabs [role=tab]')];
  tabs.forEach((b) => {
    b.addEventListener('click', () => { setTask(b.dataset.task); document.dispatchEvent(new CustomEvent('eegjev:stagetask', { detail: { task: b.dataset.task } })); });
    b.addEventListener('keydown', (e) => {
      const live = tabs.filter((t) => !t.hidden), j = live.indexOf(b);
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -j : e.key === 'End' ? live.length - 1 - j : 0;
      if (!k) return; e.preventDefault();
      const t = live[(j + k + live.length) % live.length]; t.focus(); t.click();
    });
  });
  document.addEventListener('eegjev:progress', (e) => { const p = e.detail; if (S.data[S.task] || p.rel.indexOf(M.DIR[S.task] + '/') !== 0) return; S.progress = 'downloading ' + (p.loaded / 1e6).toFixed(1) + (p.total ? ' of ' + (p.total / 1e6).toFixed(1) : '') + ' MB'; $('#st-time').textContent = S.progress; });
  // The console and the stage keep the same task; neither moves focus or scroll for the other.
  document.addEventListener('eegjev:taskchange', (e) => setTask(e.detail.task));
  $('#wc-lead').addEventListener('change', (e) => { const d = S.data[S.task]; if (!d || d.task !== 'chb') return; d.detailLead = e.target.value; paint(); });
  $('#st-play').addEventListener('click', () => setPlaying(!S.playing));
  $('#st-replay').addEventListener('click', () => { const d = S.data[S.task]; S.T = d && d.sparse ? Math.max(0, d.windows[0].t0 - 2.5) : 0; S.dwell = 0; S.last = 0; if (reduce) { paint(); } else setPlaying(true); });
  // Step. Dense recordings: one window, to the moment its answer appears, paused.
  // Sparse recordings: to just before the next (or previous) model window, keeping the play state;
  // when paused or with reduced motion, straight to that window's answer.
  function step(dk) {
    const d = S.data[S.task]; if (!d) return;
    if (d.sparse) {
      const T = S.T, lead = d.task === 'pain' ? 1.5 : 2.5;
      const still = reduce || !S.playing;   // paused: straight to the next answer that is not shown yet
      const w = dk > 0 ? d.windows.find((x) => (still ? x.t1 > T + 0.005 : x.t0 - lead > T + 0.05)) : [...d.windows].reverse().find((x) => x.t1 < T - 0.5 && x !== current(d)) || d.windows[0];
      if (!w) { seek(d.D); return; }
      seek(still ? w.t1 + 0.01 : Math.max(0, w.t0 - lead)); if (S.playing) schedule(); return;
    }
    S.playing = false;
    const cw = current(d), k = cw ? cw.i + dk : 0; seek(d.windows[Math.max(0, Math.min(d.windows.length - 1, k))].t1);
  }
  $('#st-prev').addEventListener('click', () => step(-1));
  $('#st-next').addEventListener('click', () => step(1));
  $('#st-scrub').addEventListener('input', (e) => { const d = S.data[S.task]; if (!d) return; S.playing = false; seek((+e.target.value / 1000) * d.D); });
  // Speed: slider, number and presets write the same per-task value; the position on the recording is kept.
  root.querySelector('.st-speed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) Speed.set(S.task, +b.dataset.sp); });
  $('#st-rate').addEventListener('input', (e) => Speed.set(S.task, +e.target.value));
  Speed.on((t) => { if (t !== S.task) return; S.last = 0; paint(); if (S.playing) schedule(); });
  $('#st-gain').addEventListener('change', (e) => { const d = S.data[S.task]; if (!d) return; d.gainManual = e.target.value === 'auto' ? null : +e.target.value; paint(); });
  $('#st-fit').addEventListener('click', () => { const d = S.data[S.task]; if (!d) return; const gv = fitGain(d); if (gv) { d.gainManual = gv; paint(); } });
  function overSeek(e) {
    const d = S.data[S.task]; if (!d) return;
    const r = co.getBoundingClientRect(), g = 70, pw = r.width - g - 8, f = Math.max(0, Math.min(1, (e.clientX - r.left - g) / pw));
    S.playing = false; seek(f * d.D);
  }
  co.addEventListener('pointerdown', (e) => { overSeek(e); co.setPointerCapture(e.pointerId); });
  co.addEventListener('pointermove', (e) => { if (e.buttons) overSeek(e); });
  co.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation(); step(e.key === 'ArrowRight' ? 1 : -1); });
  new IntersectionObserver((en) => { S.visible = en[0].isIntersecting && en[0].intersectionRatio >= 0.2; if (S.visible && S.playing) { S.last = 0; schedule(); } }, { threshold: [0, 0.2, 0.5, 1] }).observe(root);
  if (heroEl && window.IntersectionObserver) new IntersectionObserver((en) => { if (en[0].isIntersecting && S.playing) { S.last = 0; schedule(); } }, { threshold: [0, 0.1] }).observe(heroEl);
  document.addEventListener('visibilitychange', () => { S.last = 0; if (!document.hidden && S.playing) schedule(); });
  if (rm.addEventListener) rm.addEventListener('change', (e) => { reduce = e.matches; if (reduce) { S.playing = false; const d = S.data[S.task]; if (d) S.T = restT(d); } paint(); renderLow(true); });
  let rz = 0; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { cardKey = ''; draw(); renderLow(); }); });
  const more = $('#st-more');
  if (more && sec) {
    more.addEventListener('click', () => {
      const open = sec.hidden; sec.hidden = !open; more.setAttribute('aria-expanded', String(open));
      root.classList.toggle('is-more', open); cardKey = ''; renderLow(true);
    });
    window.addEventListener('scroll', () => { if (S.playing && !S.raf && lowVisible()) schedule(); else if (!S.playing && lowVisible()) renderLow(); }, { passive: true });
  }

  // Rows of the main plot: point to trace a lead in the map and the list, click to pin, scroll when they do not fit.
  function rowAt(e) {
    const d = S.data[S.task], G = S.geom; if (!d || !G) return null;
    const r = cv.getBoundingClientRect(), y = e.clientY - r.top;
    if (y < G.top || y > G.top + G.avail) return null;
    const c = leadsOf(d)[Math.floor((y - G.top + G.sy) / G.rh)];
    return c ? c.key : null;
  }
  if (stScroll) {
    stScroll.addEventListener('scroll', () => draw(), { passive: true });
    stScroll.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') CH.hover(S.task, rowAt(e)); });
    stScroll.addEventListener('pointerleave', () => CH.hover(S.task, null));
    stScroll.addEventListener('click', (e) => { const k = rowAt(e); if (k) CH.select(S.task, k); });
    stScroll.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Escape') return;
      const d = S.data[S.task]; if (!d) return; const keys = leadsOf(d).map((c) => c.key), k = keys.indexOf(CH.state(S.task).sel);
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { CH.select(S.task, null); return; }
      const next = keys[Math.max(0, Math.min(keys.length - 1, k < 0 ? 0 : k + (e.key === 'ArrowDown' ? 1 : -1)))];
      CH.select(S.task, next, { keep: true });
      const G = S.geom, y = keys.indexOf(next) * G.rh; if (y < stScroll.scrollTop) stScroll.scrollTop = y; else if (y + G.rh > stScroll.scrollTop + G.avail) stScroll.scrollTop = y + G.rh - G.avail;
    });
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Detail of a channel for the panel: its peak and whether it leaves the display range in the span on screen.
  function leadDetail(k) {
    const d = S.data[S.task], V = S.view, c = d && d.lead.get(k); if (!c || !c.x || !V) return '';
    const a = Math.max(0, Math.floor(V.v0 * d.fs)), b = Math.min(d.n, Math.ceil(Math.min(V.v1, S.T) * d.fs)), lim = gainOf(d) / 2; let peak = 0, over = 0;
    for (let i = a; i < b; i++) { const v = Math.abs(c.x[i] - c.off); if (v > peak) peak = v; if (v > lim) over++; }
    return 'peak ' + peak.toFixed(0) + ' µV on screen' + (over ? ' · outside display range ' + (over / Math.max(1, b - a) < 0.001 ? '<0.1' : (100 * over / Math.max(1, b - a)).toFixed(1)) + '% of the time at ' + gainOf(d) + ' µV/row (display only; Fit amplitude shows it in full)' : ' · inside the display range');
  }
  const chPanel = CH.mount($('#ch-stage'), () => S.task, { detail: leadDetail });
  const chBtn = $('#st-chbtn'), chBox = $('#st-chp');
  chBtn.addEventListener('click', () => { const open = chBox.hidden; chBox.hidden = !open; chBtn.setAttribute('aria-expanded', String(open)); if (open) chPanel.render(); });
  CH.on((e) => {
    if (e.task !== S.task) return; const d = S.data[S.task]; if (!d) return;
    if (e.type === 'shown') { if (stScroll) stScroll.scrollTop = 0; paint(); return; }
    const sel = CH.state(d.task).sel;
    if (sel && sel !== S.lastSel && stScroll && S.geom) { const k = leadsOf(d).findIndex((c) => c.key === sel), G = S.geom, y = k * G.rh; if (k >= 0 && (y < stScroll.scrollTop || y + G.rh > stScroll.scrollTop + G.avail)) stScroll.scrollTop = Math.max(0, y - G.avail / 2 + G.rh / 2); }
    S.lastSel = sel;
    if (d.task === 'chb' && sel && d.ch.some((c) => c.key === sel) && d.detailLead !== d.lead.get(sel).name) { d.detailLead = d.lead.get(sel).name; paint(); return; }
    draw();
  });
  const r0 = root.getBoundingClientRect(); S.visible = r0.top < (window.innerHeight || 800) && r0.bottom > 0;
  window.EEGJevStageQA = () => {
    const d = S.data[S.task], cw = d && current(d), nx = d && nextWin(d);
    return { task: S.task, T: S.T, D: d ? d.D : null, playing: S.playing, kind: d ? (d.sparse ? 'sparse' : 'dense') : null, fs: d ? d.fs : null, windowLength: d ? d.L : null, window: cw ? cw.id : null, windowIndex: cw ? cw.i : null,
      next: nx ? nx.id : null, windows: d ? d.windows.length : null, ends: d ? d.windows.map((w) => w.t1) : null, starts: d ? d.windows.map((w) => w.t0) : null, segments: d ? d.segs.map((g) => ({ label: g.label, a: g.a, b: g.b, loaded: g.loaded, err: g.err })) : null,
      leads: d ? leadsOf(d).length : null, shown: d ? leadsOf(d).map((c) => c.key) : null, fileLeads: d ? d.ch.length : null, speed: Speed.get(S.task), speeds: Speed.presets, speedDefault: Speed.defaults[S.task], gainNow: d ? gainOf(d) : null, gainAuto: d ? d.gain.few : null, where: $('#st-where').textContent, phases: [...document.querySelectorAll('#st-phases .ph:not([hidden])')].map((e) => e.textContent + '|' + e.title), scroll: S.geom ? { top: stScroll ? stScroll.scrollTop : 0, max: S.geom.maxSy, rowH: S.geom.rh, y0: S.geom.top } : null,
      rest: d && d.rest ? { leads: d.rest.keys.length, chunks: d.rest.chunks.length, loaded: d.rest.chunks.filter((c) => c.state === 2).length, failed: d.rest.chunks.filter((c) => c.state === 3).length } : null, gain: d ? d.gain : null, err: S.err, threshold: S.thr, now: $('#st-next-at').textContent,
      answer: $('#st-ans').textContent, reference: $('#st-ref').textContent, agree: $('#st-agree').textContent };
  };
  // One sample of a lead on the replay axis (checks compare it with the stored file).
  window.EEGJevStageProbe = (key, t) => { const d = S.data[S.task], c = d && d.lead.get(key); return c && c.x ? c.x[Math.round(t * d.fs)] : null; };
  window.EEGJevStage = Object.freeze({ setTask: (t) => setTask(t), seek, setPlaying, step, task: () => S.task });
  setTask('sleep', true);
})();
