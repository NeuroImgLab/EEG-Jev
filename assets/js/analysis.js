/* Signal analysis for the window-by-window console.
   Everything here is computed in the browser from the display traces of the window on
   screen: a short-time Fourier spectrogram and one task-specific measurement
   (sleep: relative band power; seizure: line length; motor imagery: mu and beta power
   relative to the pre-cue baseline; pain: stimulus-aligned amplitude statistics).
   These are measurements of the signal. They never read the model's answer or the
   label, and they are not the model's reasons.
   All values are computed on the whole window; the pictures are revealed up to the
   playhead while the window is drawn. */
(function (root) {
  'use strict';
  const M = root.EEGJevData, SIG = root.EEGJevSignal;
  if (!M || !SIG) return;
  const $ = (id) => document.getElementById(id);
  const DIM = M.COLORS.dim, TEAL = M.COLORS.teal, AMBER = M.COLORS.amber;
  const mono = (px, wt = 500) => wt + ' ' + px + 'px "IBM Plex Mono", ui-monospace, monospace';

  // STFT settings in seconds; samples follow from the display sampling rate of the window.
  const CFG = {
    sleep: { win: 2, hop: 0.5, nfft: 512, fmax: 30, bands: [{ name: 'δ', key: 'delta', lo: 1, hi: 4, color: '#b7aeff' }, { name: 'θ', key: 'theta', lo: 4, hi: 8, color: '#7cc4ff' }, { name: 'α', key: 'alpha', lo: 8, hi: 12, color: '#f09ac0' }, { name: 'σ', key: 'sigma', lo: 11, hi: 16, color: '#8fe3b8' }], total: [1, 25] },
    chb: { win: 1, hop: 0.125, nfft: 512, fmax: 30, epoch: 0.5 },
    mi: { win: 1, hop: 0.1, nfft: 512, fmax: 40, bands: [{ name: 'μ', key: 'mu', lo: 8, hi: 13, color: '#8fe3b8' }, { name: 'β', key: 'beta', lo: 13, hi: 30, color: '#f09ac0' }] },
    pain: { win: 0.64, hop: 0.08, nfft: 256, fmax: 30, pre: [-1, 0], post: [0, 1], lep: [0.15, 0.6] }
  };
  const MEAN = '__mean__';
  const lut = (stops) => { const rgb = stops.map((s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))), out = new Uint8ClampedArray(768); for (let i = 0; i < 256; i++) { const f = (i / 255) * (rgb.length - 1), k = Math.min(rgb.length - 2, Math.floor(f)), u = f - k; for (let c = 0; c < 3; c++) out[i * 3 + c] = rgb[k][c] + (rgb[k + 1][c] - rgb[k][c]) * u; } return out; };
  const MAGMA = lut(['#090d12', '#1d1238', '#4a1767', '#8a2870', '#c9405f', '#f0734a', '#fbb15b', '#fcf0c0']);
  const TEALMAP = lut(['#0e141b', '#0f2f38', '#14595a', '#1f9488', '#3dd6c6', '#c9fff6']);

  const st = { v: null, set: null, lead: {}, p: 1, hover: null, scale: {} };
  const cfgOf = (v) => CFG[v.task];
  const sp = (v) => { const c = cfgOf(v), n = Math.round(c.win * v.fs); return { nperseg: n, noverlap: n - Math.round(c.hop * v.fs), nfft: Math.max(c.nfft, 1 << Math.ceil(Math.log2(n))) }; };
  const rowOf = (v, name) => v.rows.find((r) => r.channel === name);

  // Which leads can be analysed, and the default.
  function leadOptions(v) {
    if (v.task === 'sleep') return v.rows.map((r) => [r.channel, M.leadName(r.channel)]);
    if (v.task === 'chb') return [[MEAN, 'Mean of ' + v.rows.length + ' leads']].concat(v.rows.map((r) => [r.channel, M.leadName(r.channel)]));
    const few = v.task === 'pain' ? M.PAIN_FEW : M.MI_FEW;
    const have = few.filter((n) => rowOf(v, n));
    const rest = v.rows.map((r) => r.channel).filter((n) => !have.includes(n));
    return have.concat(rest).map((n) => [n, M.capName(n)]);
  }
  function leadOf(v) {
    const opts = leadOptions(v), want = st.lead[v.task];
    if (want && opts.some((o) => o[0] === want)) return want;
    const cz = opts.find((o) => o[0].toUpperCase() === (v.task === 'mi' ? 'C3' : 'CZ'));
    return (v.task === 'pain' || v.task === 'mi') && cz ? cz[0] : opts[0][0];
  }
  // Linear one-sided PSD (µV²/Hz) of the chosen lead, or the mean PSD over all leads.
  function linSpec(v, lead) {
    const key = 'lin|' + lead; v.an = v.an || {};
    if (v.an[key]) return v.an[key];
    const o = sp(v);
    let s;
    if (lead === MEAN) {
      for (const r of v.rows) { const q = SIG.spectrogram(r.x, v.fs, o); if (!s) s = q; else for (let i = 0; i < s.psd.length; i++) s.psd[i] += q.psd[i]; }
      for (let i = 0; i < s.psd.length; i++) s.psd[i] /= v.rows.length;
    } else s = SIG.spectrogram(rowOf(v, lead).x, v.fs, o);
    return (v.an[key] = s);
  }
  const dB = (p) => 10 * Math.log10(p + 1e-12);
  // One colour scale per task and lead choice, over every example of the task: 2nd to 99th percentile of the dB values shown.
  function specScale(v, lead) {
    const key = v.task + '|' + (lead === MEAN ? MEAN : 'single');
    if (st.scale[key]) return st.scale[key];
    const c = cfgOf(v), vals = [];
    for (const u of st.set.items) {
      const leads = lead === MEAN ? [MEAN] : leadOptions(u).map((o) => o[0]).filter((n) => n !== MEAN).slice(0, 4);
      for (const L of leads) { const s = linSpec(u, L); for (let i = 0; i < s.psd.length; i += 5) { const f = s.freqs[i % s.nFreqs]; if (f >= 0.5 && f <= c.fmax) vals.push(dB(s.psd[i])); } }
    }
    return (st.scale[key] = { lo: SIG.percentile(vals, 2), hi: SIG.percentile(vals, 99) });
  }

  // ── Task measurements (whole window) ──────────────
  function feature(v) {
    const lead = leadOf(v), key = 'feat|' + lead; v.an = v.an || {};
    if (v.an[key]) return v.an[key];
    const c = cfgOf(v); let f;
    if (v.task === 'sleep') {
      const s = linSpec(v, lead), bp = SIG.bandPowerSeries(s, c.bands.map((b) => ({ name: b.key, lo: b.lo, hi: b.hi })).concat([{ name: 'total', lo: c.total[0], hi: c.total[1] }]));
      const series = c.bands.map((b) => Array.from(bp[b.key], (p, i) => p / bp.total[i]));
      // Whole-epoch share: band power summed over frames ÷ total power summed over frames.
      const tot = bp.total.reduce((a, x) => a + x, 0), share = c.bands.map((b) => bp[b.key].reduce((a, x) => a + x, 0) / tot);
      f = { kind: 'bands', times: s.times, series, share, lead };
    } else if (v.task === 'chb') {
      const ll = v.rows.map((r) => SIG.lineLength(r.x, v.fs, c.epoch)), n = ll[0].length;
      const mean = Array.from({ length: n }, (_, k) => ll.reduce((a, r) => a + r[k], 0) / ll.length);
      f = { kind: 'linelength', ll, mean, overall: mean.reduce((a, x) => a + x, 0) / n, epoch: c.epoch };
    } else if (v.task === 'mi') {
      // Band power per STFT frame; change relative to the mean of the frames that lie wholly before the cue.
      const leads = M.MI_ERD.filter((n) => rowOf(v, n)), t0 = v.it.cue_rel_s != null ? v.it.cue_rel_s : null, half = c.win / 2;
      const out = leads.map((n) => {
        const s = linSpec(v, n), bp = SIG.bandPowerSeries(s, c.bands.map((b) => ({ name: b.key, lo: b.lo, hi: b.hi })));
        const base = t0 == null ? [] : Array.from(s.times, (t, i) => i).filter((i) => s.times[i] + half <= t0 + 1e-9);
        return { lead: n, times: s.times, bands: c.bands.map((b) => { const p = bp[b.key], ref = base.length ? base.reduce((a, i) => a + p[i], 0) / base.length : null; return { key: b.key, power: Array.from(p), ref, rel: ref ? Array.from(p, (x) => (x - ref) / ref * 100) : null }; }) };
      });
      f = { kind: 'mubeta', leads: out, baselineFrames: out.length && t0 != null ? out[0].times.filter((t) => t + half <= t0 + 1e-9).length : 0, cue: t0 };
    } else {
      const r = rowOf(v, lead), fs = v.fs, zero = v.it.stimulus_time_s - v.it.start_s;
      const seg = (a, b) => r.x.subarray(Math.max(0, Math.round((zero + a) * fs)), Math.min(r.x.length, Math.round((zero + b) * fs)));
      const rms = (x) => { let m = 0; for (const q of x) m += q; m /= x.length; let s = 0; for (const q of x) s += (q - m) * (q - m); return Math.sqrt(s / x.length); };
      const pre = seg(c.pre[0], c.pre[1]), post = seg(c.post[0], c.post[1]), w = seg(c.lep[0], c.lep[1]);
      let m = 0; for (const q of pre) m += q; m /= pre.length;   // pre-stimulus mean as the zero level
      let lo = 0, hi = 0; for (let i = 0; i < w.length; i++) { if (w[i] < w[lo]) lo = i; if (w[i] > w[hi]) hi = i; }
      f = { kind: 'painstats', lead, rmsPre: rms(pre), rmsPost: rms(post), trough: w[lo] - m, troughT: c.lep[0] + lo / fs, peak: w[hi] - m, peakT: c.lep[0] + hi / fs, base: m, zero };
    }
    return (v.an[key] = f);
  }
  function llScale() {
    if (st.scale.ll) return st.scale.ll;
    const vals = [];
    for (const u of st.set.items) for (const r of feature(u).ll) for (const x of r) vals.push(x);
    return (st.scale.ll = SIG.percentile(vals, 98));
  }
  const erdScale = () => 200;   // percent; larger increases are drawn at the top edge

  // ── Drawing ───────────────────────────────────────
  const gutter = () => (window.innerWidth < 361 ? 52 : window.innerWidth < 760 ? 58 : 64);
  function marks(ctx, w, h, v, p) {
    if (v.task === 'chb') for (const [a, b] of v.annotated || []) { const x0 = a / v.dur * w, x1 = Math.min(b, p * v.dur) / v.dur * w; if (x1 > x0) { ctx.fillStyle = AMBER; ctx.fillRect(x0, 0, x1 - x0, 3); } }
    const lines = v.task === 'pain' ? [[v.it.stimulus_time_s - v.it.start_s, AMBER]] : v.task === 'mi' ? (v.it.marks || []).map((m) => [m.t_rel_s, AMBER]) : [];
    for (const [t, col] of lines) { const x = Math.round(t / v.dur * w) + 0.5; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.restore(); }
  }
  function cursor(ctx, w, h, v, p) {
    if (p < 1) { const x = p * w; ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.lineWidth = 1; }
    if (st.hover && st.hover.t != null) { const x = Math.round(st.hover.t / v.dur * w) + 0.5; ctx.strokeStyle = 'rgba(230,237,243,.55)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.setLineDash([]); }
  }
  function drawSpec(v, p) {
    const c = $('cv-spec'); if (!c.clientWidth || !c.clientHeight) return;
    const { ctx, w, h } = M.fit(c, gutter()), cf = cfgOf(v), lead = leadOf(v), s = linSpec(v, lead), sc = specScale(v, lead), fMin = 0.5, fMax = cf.fmax;
    const rows = []; for (let j = 0; j < s.nFreqs; j++) if (s.freqs[j] >= fMin && s.freqs[j] <= fMax) rows.push(j);
    const ik = 'img|' + lead;
    if (!v.an[ik]) {
      const off = document.createElement('canvas'); off.width = Math.max(1, s.nTimes); off.height = rows.length;
      const o = off.getContext('2d'), img = o.createImageData(off.width, off.height);
      for (let t = 0; t < s.nTimes; t++) rows.forEach((j, r) => { const u = Math.max(0, Math.min(255, Math.round((dB(s.psd[t * s.nFreqs + j]) - sc.lo) / (sc.hi - sc.lo) * 255))), q = ((rows.length - 1 - r) * off.width + t) * 4; img.data[q] = MAGMA[u * 3]; img.data[q + 1] = MAGMA[u * 3 + 1]; img.data[q + 2] = MAGMA[u * 3 + 2]; img.data[q + 3] = 255; });
      o.putImageData(img, 0, 0); v.an[ik] = off;
    }
    const hop = cf.hop, x0 = (s.times[0] - hop / 2) / v.dur * w, x1 = (s.times[s.nTimes - 1] + hop / 2) / v.dur * w;
    ctx.fillStyle = '#0b1016'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p * w, h); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(v.an[ik], x0, 0, x1 - x0, h); ctx.restore();
    // Edges without a complete analysis window stay empty (hatched), never extrapolated.
    for (const [a, b] of [[0, x0], [x1, w]]) { ctx.save(); ctx.fillStyle = '#0e141b'; ctx.fillRect(a, 0, b - a, h); ctx.beginPath(); ctx.rect(a, 0, b - a, h); ctx.clip(); ctx.strokeStyle = 'rgba(141,154,167,.16)'; ctx.beginPath(); for (let x = a - h; x < b; x += 6) { ctx.moveTo(x, h); ctx.lineTo(x + h, 0); } ctx.stroke(); ctx.restore(); }
    const ys = (f) => h - (f - fMin) / (fMax - fMin) * h;
    if (cf.bands) for (const b of cf.bands) { ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.setLineDash([2, 4]); for (const f of [b.lo, b.hi]) { ctx.beginPath(); ctx.moveTo(0, ys(f) + 0.5); ctx.lineTo(w, ys(f) + 0.5); ctx.stroke(); } ctx.setLineDash([]); }
    marks(ctx, w, h, v, p);
    ctx.font = mono(9.5, 400); ctx.textBaseline = 'middle'; ctx.fillStyle = DIM; ctx.textAlign = 'right';
    for (const f of (fMax > 30 ? [10, 20, 30, 40] : [5, 10, 15, 20, 25])) if (f < fMax) ctx.fillText(f + ' Hz', -8, ys(f));
    ctx.textAlign = 'left';
    cursor(ctx, w, h, v, p);
    if (st.hover && st.hover.f != null && st.hover.src === 'spec') { const y = Math.round(ys(st.hover.f)) + 0.5; ctx.strokeStyle = 'rgba(230,237,243,.4)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); ctx.setLineDash([]); }
    $('spec-low').textContent = sc.lo.toFixed(0); $('spec-high').textContent = sc.hi.toFixed(0) + ' dB';
    c.setAttribute('aria-label', 'Spectrogram of ' + leadLabel(v) + ', 0.5 to ' + fMax + ' hertz, colour from ' + sc.lo.toFixed(0) + ' to ' + sc.hi.toFixed(0) + ' decibels');
    st.geom = { x0, x1, fMin, fMax, s };
  }
  const leadLabel = (v) => { const L = leadOf(v); return L === MEAN ? 'the mean of ' + v.rows.length + ' leads' : (v.task === 'pain' || v.task === 'mi' ? M.capName(L) : M.leadName(L)); };
  function lineChart(ctx, w, h, v, p, series, yMin, yMax, ticks, fmt) {
    const Y = (x) => h - 6 - (Math.max(yMin, Math.min(yMax, x)) - yMin) / (yMax - yMin) * (h - 14);
    ctx.fillStyle = '#0b1016'; ctx.fillRect(0, 0, w, h);
    ctx.font = mono(9.5, 400); ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (const t of ticks) { const y = Math.round(Y(t)) + 0.5; ctx.strokeStyle = t === 0 && yMin < 0 ? 'rgba(230,237,243,.3)' : 'rgba(141,154,167,.12)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); ctx.fillStyle = DIM; ctx.fillText(fmt(t), -8, y); }
    ctx.textAlign = 'left';
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p * w, h); ctx.clip(); ctx.lineJoin = 'round';
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; ctx.setLineDash(s.dash || []); ctx.beginPath();
      s.y.forEach((y, i) => { const x = s.t[i] / v.dur * w; i ? ctx.lineTo(x, Y(y)) : ctx.moveTo(x, Y(y)); });
      ctx.stroke(); ctx.setLineDash([]);
      if (st.hover && st.hover.t != null) { const i = nearest(s.t, st.hover.t); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.t[i] / v.dur * w, Y(s.y[i]), 3, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    marks(ctx, w, h, v, p); cursor(ctx, w, h, v, p);
  }
  const nearest = (ts, t) => { let b = 0; for (let i = 1; i < ts.length; i++) if (Math.abs(ts[i] - t) < Math.abs(ts[b] - t)) b = i; return b; };
  function drawFeat(v, p) {
    const c = $('cv-feat'), f = feature(v);
    $('feat-wrap').dataset.kind = f.kind;
    if (f.kind === 'painstats') return;
    if (!c.clientWidth || !c.clientHeight) return;
    const { ctx, w, h } = M.fit(c, gutter()), cf = cfgOf(v);
    if (f.kind === 'bands') {
      lineChart(ctx, w, h, v, p, cf.bands.map((b, i) => ({ color: b.color, t: f.times, y: f.series[i].map((x) => x * 100) })), 0, 100, [0, 25, 50, 75, 100], (t) => t + '%');
    } else if (f.kind === 'linelength') {
      // Upper part: one row per lead (0.5-s cells). Lower part: the mean over leads as a line.
      const n = f.ll.length, m = f.ll[0].length, top = Math.round(h * 0.62), cw = w / m, rh = top / n, max = llScale();
      ctx.fillStyle = '#0b1016'; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p * w, h); ctx.clip();
      for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) { const u = Math.max(0, Math.min(255, Math.round(f.ll[i][k] / max * 255))); ctx.fillStyle = 'rgb(' + TEALMAP[u * 3] + ',' + TEALMAP[u * 3 + 1] + ',' + TEALMAP[u * 3 + 2] + ')'; ctx.fillRect(k * cw, i * rh, cw - 1, Math.max(1, rh - 1)); }
      const y0 = top + 8, y1 = h - 4, Y = (x) => y1 - Math.min(1, x / max) * (y1 - y0);
      ctx.strokeStyle = '#c9fff6'; ctx.lineWidth = 1.6; ctx.beginPath();
      f.mean.forEach((x, k) => { const px = (k + 0.5) * cw; k ? ctx.lineTo(px, Y(x)) : ctx.moveTo(px, Y(x)); }); ctx.stroke();
      ctx.restore();
      ctx.font = mono(10, 600); ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
      const spans = {}; v.rows.forEach((r, i) => { (spans[r.chain] = spans[r.chain] || []).push(i); });
      for (const k in spans) { const q = spans[k]; ctx.fillStyle = M.CHAIN_COLOR[k]; ctx.fillText(k, -8, rh * ((q[0] + q[q.length - 1]) / 2 + 0.5)); }
      ctx.fillStyle = DIM; ctx.font = mono(9.5, 400); ctx.fillText('mean', -8, (y0 + y1) / 2);
      ctx.textAlign = 'left';
      if (st.hover && st.hover.row != null && st.hover.src === 'feat') { ctx.strokeStyle = '#e6edf3'; ctx.strokeRect(0.5, st.hover.row * rh + 0.5, w - 1, rh - 1); }
      marks(ctx, w, h, v, p); cursor(ctx, w, h, v, p);
      st.fgeom = { top, rh, cw, n, m };
    } else if (f.kind === 'mubeta') {
      const lim = erdScale(), col = ['#7cc4ff', '#cfd8e3', '#f09ac0'], series = [];
      f.leads.forEach((L, i) => L.bands.forEach((b, k) => { if (b.rel) series.push({ color: col[i % 3], dash: k ? [5, 3] : [], t: L.times, y: b.rel }); }));
      lineChart(ctx, w, h, v, p, series, -100, lim, [-100, 0, 100, 200], (t) => (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + '%');
    }
  }

  // ── Text ──────────────────────────────────────────
  function describe(v) {
    const cf = cfgOf(v), o = sp(v), f = feature(v), lead = leadLabel(v);
    const sel = $('an-lead'), opts = leadOptions(v), cur = leadOf(v);
    const sig = v.task + '|' + opts.map((x) => x[0]).join(',');
    if (sel.dataset.sig !== sig) { sel.innerHTML = opts.map((x) => '<option value="' + x[0] + '">' + x[1] + '</option>').join(''); sel.dataset.sig = sig; }
    sel.value = cur; sel.parentElement.hidden = opts.length < 2;
    $('spec-lead').innerHTML = '<b>Lead</b><span>' + lead + '.</span>';
    $('an-params').textContent = 'Short-time Fourier transform of the display signal (' + v.fs + ' Hz, Nyquist ' + v.fs / 2 + ' Hz): Hann window of ' + cf.win + ' s (' + o.nperseg + ' samples), a new frame every ' + cf.hop + ' s, zero-padded to ' + o.nfft + ' points (' + (v.fs / o.nfft).toFixed(2) + ' Hz per bin), mean removed per frame. Power spectral density in µV²/Hz, shown as 10·log10 (dB re 1 µV²/Hz) from 0.5 to ' + cf.fmax + ' Hz. Frames need a complete window, so the first and last ' + (cf.win / 2) + ' s are hatched. Computed on the whole window; revealed as the window plays.';
    const key = $('feat-key'), lab = $('feat-label'), sum = $('feat-sum'), leg = $('feat-legend');
    if (f.kind === 'bands') {
      lab.innerHTML = 'Relative band power <small>share of each rhythm in ' + lead + ', frame by frame</small>';
      key.innerHTML = '<li><b>Lines</b><span>' + cf.bands.map((b) => b.name + ' ' + b.lo + '–' + b.hi + ' Hz').join(', ') + '.</span></li><li><b>Up</b><span>band power ÷ power in ' + cf.total[0] + '–' + cf.total[1] + ' Hz of the same frame, 0–100%. α and σ overlap at 11–12 Hz and 16–25 Hz has no line, so the lines need not add up to 100%.</span></li>';
      leg.innerHTML = cf.bands.map((b) => '<span style="--c:' + b.color + '"><i></i>' + b.name + '</span>').join('');
      sum.innerHTML = 'Whole epoch: ' + cf.bands.map((b, i) => '<span class="an-chip" style="--c:' + b.color + '"><b>' + b.name + '</b> ' + (f.share[i] * 100).toFixed(0) + '%</span>').join(' ') + ' <small>of ' + cf.total[0] + '–' + cf.total[1] + ' Hz power</small>';
    } else if (f.kind === 'linelength') {
      lab.innerHTML = 'Line length <small>how far each trace travels, every ' + cf.epoch + ' s</small>';
      key.innerHTML = '<li><b>Rows</b><span>the ' + v.rows.length + ' leads, grouped by chain; below them, the mean over leads.</span></li><li><b>Value</b><span>sum of |sample-to-sample change| within a ' + cf.epoch + '-s segment ÷ ' + cf.epoch + ' s, in µV/s. Not normalised; one colour and line scale for every window, 0–' + Math.round(llScale()) + ' µV/s (larger values saturate).</span></li>';
      leg.innerHTML = '<span class="an-ramp"><i></i>0 → ' + Math.round(llScale()) + ' µV/s</span><span style="--c:#c9fff6"><i></i>mean of leads</span>';
      const bg = v.pair ? feature(v.pair).overall : null, isBg = v.it.role === 'background';
      sum.innerHTML = 'Mean line length of this window: <b>' + Math.round(f.overall) + ' µV/s</b>' + (bg ? (isBg ? ' · paired seizure window: ' : ' · paired background window: ') + Math.round(bg) + ' µV/s (' + (f.overall / bg >= 1 ? (f.overall / bg).toFixed(1) + '× ' : '1/' + (bg / f.overall).toFixed(1) + ' of ') + 'it)' : '') + '. <small>Large line length also occurs with movement and muscle activity.</small>';
    } else if (f.kind === 'mubeta') {
      lab.innerHTML = 'Mu and beta power <small>change from the pause before the target, at the leads over the hand areas</small>';
      key.innerHTML = '<li><b>Lines</b><span>solid μ ' + cf.bands[0].lo + '–' + cf.bands[0].hi + ' Hz, dashed β ' + cf.bands[1].lo + '–' + cf.bands[1].hi + ' Hz; one colour per lead.</span></li><li><b>Up</b><span>(P − R) ÷ R × 100%, where P is the band power of a frame and R the mean band power of the ' + f.baselineFrames + ' frames that end before the cue. Below zero is a decrease (desynchronisation). One scale for every trial and lead, −100% to +200%; larger increases are drawn at the top edge.</span></li>';
      leg.innerHTML = f.leads.map((L, i) => '<span style="--c:' + ['#7cc4ff', '#cfd8e3', '#f09ac0'][i % 3] + '"><i></i>' + M.capName(L.lead) + '</span>').join('');
      const after = (L, b) => { const idx = L.times.map((t, i) => i).filter((i) => f.cue != null && L.times[i] - cf.win / 2 >= f.cue - 1e-9); return b.rel && idx.length ? idx.reduce((a, i) => a + b.rel[i], 0) / idx.length : null; };
      sum.innerHTML = f.baselineFrames ? 'Mean change after the target appears: ' + f.leads.map((L) => '<span class="an-chip"><b>' + M.capName(L.lead) + '</b> μ ' + fmtPct(after(L, L.bands[0])) + ' · β ' + fmtPct(after(L, L.bands[1])) + '</span>').join(' ') : 'This window has no complete pre-cue frame, so no relative change is shown.';
    } else {
      lab.innerHTML = 'Around the stimulus <small>amplitude statistics of ' + lead + '</small>';
      key.innerHTML = ''; leg.innerHTML = '';
      const r = f.rmsPost / f.rmsPre;
      $('pain-stats').innerHTML =
        '<div><dt>Before the stimulus</dt><dd><b class="mono">' + f.rmsPre.toFixed(1) + ' µV</b><small>RMS around the mean, −1 to 0 s</small></dd></div>' +
        '<div><dt>After the stimulus</dt><dd><b class="mono">' + f.rmsPost.toFixed(1) + ' µV</b><small>RMS around the mean, 0 to +1 s · ' + r.toFixed(2) + '× before</small></dd></div>' +
        '<div><dt>Lowest point</dt><dd><b class="mono">' + M.signed(f.trough, 1) + ' µV</b><small>at +' + f.troughT.toFixed(2) + ' s, within +0.15 to +0.6 s</small></dd></div>' +
        '<div><dt>Highest point</dt><dd><b class="mono">' + M.signed(f.peak, 1) + ' µV</b><small>at +' + f.peakT.toFixed(2) + ' s, within +0.15 to +0.6 s</small></dd></div>';
      sum.innerHTML = 'Levels are relative to the mean of the second before the stimulus. The display signal is low-passed at 40 Hz. Laser-evoked responses at the vertex are usually sought between about 0.15 and 0.6 s; in one trial they are often within the background activity.';
    }
  }
  const fmtPct = (x) => (x == null ? 'n/a' : (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(0) + '%');
  function readout() {
    const v = st.v, el = $('an-read'); if (!v || !el) return;
    const h = st.hover;
    if (!h || h.t == null) { el.textContent = 'Point at a picture to read a value.'; return; }
    const f = feature(v), cf = cfgOf(v), rel = v.task === 'pain' ? v.it.stimulus_time_s - v.it.start_s : 0, tt = (t) => (rel ? M.signed(t - rel, 2) : t.toFixed(2)) + ' s';
    if (h.src === 'spec') {
      const s = st.geom.s, i = nearest(s.times, h.t); let j = 0; for (let k = 1; k < s.nFreqs; k++) if (Math.abs(s.freqs[k] - h.f) < Math.abs(s.freqs[j] - h.f)) j = k;
      el.innerHTML = 'frame centred at ' + tt(s.times[i]) + ' · ' + s.freqs[j].toFixed(1) + ' Hz · <b>' + dB(s.psd[i * s.nFreqs + j]).toFixed(1) + ' dB</b>';
    } else if (f.kind === 'bands') { const i = nearest(f.times, h.t); el.innerHTML = 'frame centred at ' + tt(f.times[i]) + ' · ' + cf.bands.map((b, k) => b.name + ' <b>' + (f.series[k][i] * 100).toFixed(0) + '%</b>').join(' · '); }
    else if (f.kind === 'linelength') { const k = Math.max(0, Math.min(f.mean.length - 1, Math.floor(h.t / f.epoch))), r = h.row; el.innerHTML = (k * f.epoch).toFixed(1) + '–' + ((k + 1) * f.epoch).toFixed(1) + ' s · ' + (r != null ? M.leadName(v.rows[r].channel) + ' <b>' + Math.round(f.ll[r][k]) + ' µV/s</b> · ' : '') + 'mean of leads <b>' + Math.round(f.mean[k]) + ' µV/s</b>'; }
    else if (f.kind === 'mubeta') { const L0 = f.leads[0]; if (!L0) return; const i = nearest(L0.times, h.t); el.innerHTML = 'frame centred at ' + tt(L0.times[i]) + ' · ' + f.leads.map((L) => M.capName(L.lead) + ' μ <b>' + fmtPct(L.bands[0].rel && L.bands[0].rel[i]) + '</b> β <b>' + fmtPct(L.bands[1].rel && L.bands[1].rel[i]) + '</b>').join(' · '); }
  }
  function redraw() { if (!st.v || !$('analysis-details').open) return; drawSpec(st.v, st.p); drawFeat(st.v, st.p); }
  function show(v, set, p) {
    const changed = st.v !== v;
    st.v = v; st.set = set; st.p = p;
    if (!$('analysis-details').open) return;
    if (changed || st.described !== v.id + '|' + leadOf(v)) { st.hover = null; describe(v); st.described = v.id + '|' + leadOf(v); readout(); }
    redraw();
  }
  function point(e, src) {
    const v = st.v; if (!v) return;
    const c = e.currentTarget, r = c.getBoundingClientRect(), g = gutter(), w = r.width - g, x = e.clientX - r.left - g, y = e.clientY - r.top;
    if (x < 0 || x > w) { st.hover = null; } else {
      st.hover = { src, t: x / w * v.dur };
      if (src === 'spec') st.hover.f = st.geom.fMax - y / r.height * (st.geom.fMax - st.geom.fMin);
      else if (st.fgeom && feature(v).kind === 'linelength') st.hover.row = y < st.fgeom.top ? Math.max(0, Math.min(st.fgeom.n - 1, Math.floor(y / st.fgeom.rh))) : null;
    }
    readout(); redraw();
  }
  function bind() {
    for (const [id, src] of [['cv-spec', 'spec'], ['cv-feat', 'feat']]) {
      const c = $(id); if (!c) continue;
      c.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') point(e, src); });
      c.addEventListener('pointerdown', (e) => point(e, src));
      c.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') { st.hover = null; readout(); redraw(); } });
    }
    $('an-lead').addEventListener('change', (e) => { if (!st.v) return; st.lead[st.v.task] = e.target.value; st.described = ''; show(st.v, st.set, st.p); });
    $('analysis-details').addEventListener('toggle', () => requestAnimationFrame(() => { st.described = ''; if (st.v) show(st.v, st.set, st.p); }));
  }
  bind();
  // Values for the numerical cross-check (qa/verify_analysis.py).
  function qa(v) {
    const lead = leadOf(v), s = linSpec(v, lead), f = feature(v), o = sp(v);
    const out = { task: v.task, id: v.id, lead, fs: v.fs, opts: o, nTimes: s.nTimes, nFreqs: s.nFreqs, times: Array.from(s.times), psd_db_frame0: Array.from(s.psd.subarray(0, s.nFreqs), dB), psd_db_mid: Array.from(s.psd.subarray(Math.floor(s.nTimes / 2) * s.nFreqs, (Math.floor(s.nTimes / 2) + 1) * s.nFreqs), dB), kind: f.kind };
    if (f.kind === 'bands') { out.share = f.share; out.series = f.series; }
    if (f.kind === 'linelength') { out.ll_mean = f.mean; out.ll_first = Array.from(f.ll[0]); out.overall = f.overall; }
    if (f.kind === 'mubeta') out.leads = f.leads.map((L) => ({ lead: L.lead, bands: L.bands.map((b) => ({ key: b.key, ref: b.ref, rel: b.rel, power: b.power })) }));
    if (f.kind === 'painstats') Object.assign(out, { rmsPre: f.rmsPre, rmsPost: f.rmsPost, trough: f.trough, troughT: f.troughT, peak: f.peak, peakT: f.peakT });
    return out;
  }
  root.EEGJevAnalysis = Object.freeze({ show, qa, CFG, MEAN, setLead: (task, lead) => { st.lead[task] = lead; st.described = ''; } });
})(window);
