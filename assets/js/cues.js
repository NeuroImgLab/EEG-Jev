/* Signal cues: rule-based descriptions computed from recorded traces (50 Hz display
   traces of the replay package, or 200 Hz model-input-domain arrays when available).
   They never read the model's answer or the reference label. They describe what a
   reader can see (rhythm, where, how much the trace moves); they are not the
   model's reasons and not a diagnosis. Thresholds are fixed in this file. */
(function (root) {
  'use strict';
  const SIG = root.EEGJevSignal;
  // Sampling rate of the traces being described: 50 Hz display traces in the replay
  // package, 200 Hz model-input-domain arrays in the continuous material.
  let FS = 50;
  const specFor = (fs) => ({ nperseg: 2 * fs, noverlap: 1.5 * fs, nfft: fs <= 64 ? 256 : 1024 });

  const demean = (v) => { const x = Float64Array.from(v); let m = 0; for (const a of x) m += a; m /= x.length; for (let i = 0; i < x.length; i++) x[i] -= m; return x; };
  const median = (a) => SIG.percentile(a, 50);
  const mean = (a) => { let s = 0; for (const v of a) s += v; return a.length ? s / a.length : NaN; };

  // Zero-phase FFT band-pass (rectangular in frequency, for description only).
  function bandpass(x, lo, hi) {
    let n = 1; while (n < x.length) n <<= 1;
    const re = new Float64Array(n), im = new Float64Array(n);
    re.set(x);
    SIG.fftInPlace(re, im);
    for (let k = 0; k < n; k++) {
      const f = (k <= n / 2 ? k : n - k) * FS / n;
      if (f < lo || f > hi) { re[k] = 0; im[k] = 0; }
    }
    // Inverse via conjugation.
    for (let k = 0; k < n; k++) im[k] = -im[k];
    SIG.fftInPlace(re, im);
    const out = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) out[i] = re[i] / n;
    return out;
  }
  function movingRms(x, win) {
    const out = new Float64Array(x.length), h = Math.floor(win / 2);
    const pre = new Float64Array(x.length + 1);
    for (let i = 0; i < x.length; i++) pre[i + 1] = pre[i] + x[i] * x[i];
    for (let i = 0; i < x.length; i++) { const a = Math.max(0, i - h), b = Math.min(x.length, i + h + 1); out[i] = Math.sqrt((pre[b] - pre[a]) / (b - a)); }
    return out;
  }
  // Runs where pred(i) holds, as [startSample, endSample) pairs.
  function runs(n, pred) {
    const out = []; let a = -1;
    for (let i = 0; i <= n; i++) { const on = i < n && pred(i); if (on && a < 0) a = i; if (!on && a >= 0) { out.push([a, i]); a = -1; } }
    return out;
  }
  // ── CHB ──────────────────────────────────────────────
  const CHB_RULES = { ratioStandOut: 1.5, binRatio: 2, minBins: 2, rhythmProminence: 3, driftHz: 1 };
  const CHAIN_NAME = { LT: 'left temporal', LP: 'left parasagittal', RP: 'right parasagittal', RT: 'right temporal', Z: 'midline' };

  function leadLL(sample) {
    const out = {};
    for (const t of sample.traces) out[t.channel] = SIG.lineLength(demean(t.values), FS, 0.5);
    return out;
  }
  // bgSamples: background windows of the same patient (preferred) or of the package.
  function chb(sample, bgSamples) {
    const R = CHB_RULES;
    FS = sample.fs || 50; const spec = specFor(FS);
    const ll = leadLL(sample);
    const bgLL = {};
    for (const b of bgSamples) { const m = leadLL(b); for (const c in m) (bgLL[c] = bgLL[c] || []).push(mean(m[c])); }
    const ratio = {};
    for (const c in ll) if (SIG.chbChain(c) !== 'AUX' && bgLL[c]) ratio[c] = mean(ll[c]) / median(bgLL[c]);
    const chains = Object.keys(SIG.CHB_CHAINS).map((k) => ({ k, leads: SIG.CHB_CHAINS[k].filter((c) => ratio[c] != null) }))
      .filter((c) => c.leads.length).map((c) => ({ ...c, score: median(c.leads.map((l) => ratio[l])) }));
    chains.sort((a, b) => b.score - a.score);
    const top = chains[0];
    const focus = top.leads.slice().sort((a, b) => ratio[b] - ratio[a]).slice(0, 2);
    const fx = focus.map((c) => demean(sample.traces.find((t) => t.channel === c).values));
    // Time span: 0.5-s bins where the two focus leads together move ≥ 2× their background.
    const nb = ll[focus[0]].length;
    const binR = Array.from({ length: nb }, (_, i) => mean(focus.map((c) => ll[c][i] / median(bgLL[c]))));
    const rs = runs(nb, (i) => binR[i] >= R.binRatio).filter(([a, b]) => b - a >= R.minBins).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
    const span = rs.length ? [rs[0][0] * 0.5, rs[0][1] * 0.5] : null;
    // Rhythm: the dominant 2–12 Hz peak of the two focus leads, called regular only when it
    // stands ≥ 3× above its own neighbourhood (1.5–3 Hz away), i.e. a narrow peak.
    const specs = fx.map((x) => SIG.spectrogram(x, FS, spec)), sp = specs[0];
    const avg = new Float64Array(sp.nFreqs);
    for (const s of specs) for (let t = 0; t < s.nTimes; t++) for (let k = 0; k < s.nFreqs; k++) avg[k] += s.psd[t * s.nFreqs + k];
    let pkK = -1;
    for (let k = 0; k < sp.nFreqs; k++) if (sp.freqs[k] >= 2 && sp.freqs[k] <= 12 && (pkK < 0 || avg[k] > avg[pkK])) pkK = k;
    const fpk = sp.freqs[pkK], side = [];
    for (let k = 0; k < sp.nFreqs; k++) { const d = Math.abs(sp.freqs[k] - fpk); if (d >= 1.5 && d <= 3) side.push(avg[k]); }
    const localProm = avg[pkK] / median(side);
    const rhythmic = localProm >= R.rhythmProminence;
    // Dominant 2–12 Hz frequency in the first vs last 2 s of the window.
    const band = [];
    for (let k = 0; k < sp.nFreqs; k++) if (sp.freqs[k] >= 2 && sp.freqs[k] <= 12) band.push(k);
    const frameF = [], framePk = [];
    for (let t = 0; t < sp.nTimes; t++) {
      let best = band[0], bv = -1;
      for (const k of band) { let v = 0; for (const s of specs) v += s.psd[t * sp.nFreqs + k]; if (v > bv) { bv = v; best = k; } }
      frameF.push(sp.freqs[best]);
      let vp = 0; for (const s of specs) vp += s.psd[t * sp.nFreqs + pkK]; framePk.push(vp);
    }
    const k3 = Math.min(3, frameF.length);
    const f0 = mean(frameF.slice(0, k3)), f1 = mean(frameF.slice(-k3));
    // A drift is only described when both ends stay near the window's dominant rhythm.
    const near = (f) => Math.abs(f - fpk) <= 3;
    const drift = rhythmic && near(f0) && near(f1) && Math.abs(f1 - f0) >= R.driftHz ? { from: f0, to: f1 } : null;
    // Zoom: the 2-s stretch where the peak frequency is strongest on the first focus lead.
    let zt = 0; for (let t = 1; t < framePk.length; t++) if (framePk[t] > framePk[zt]) zt = t;
    const zc = sp.times[zt], dur = sample.duration_s;
    const zoom = { lead: focus[0], t0: Math.max(0, Math.min(dur - 2, zc - 1)), t1: Math.max(2, Math.min(dur, zc + 1)) };
    return { focusChain: top.k, chainName: CHAIN_NAME[top.k], chainLeads: SIG.CHB_CHAINS[top.k].slice(), focus, ratio: mean(focus.map((c) => ratio[c])), chainScore: top.score,
      span, rhythm: { freq: fpk, localProminence: localProm, rhythmic }, drift, zoom, standsOut: top.score >= R.ratioStandOut, bgCount: bgSamples.length, rules: R };
  }

  // ── Sleep (Sleep-EDF: Fpz–Cz and Pz–Oz) ──────────────
  const SLEEP_RULES = { alphaShare: 0.3, thetaShare: 0.3, sigmaFactor: 3, sigmaMin: [0.5, 3], swP2P: 75, swDur: [0.5, 2], swFracN3: 0.2 };
  function shares(x) {
    const spec = specFor(FS), s = SIG.spectrogram(x, FS, spec);
    const bp = SIG.bandPowerSeries(s, [{ name: 'd', lo: 1, hi: 4 }, { name: 't', lo: 4, hi: 8 }, { name: 'a', lo: 8, hi: 12 }, { name: 's', lo: 11, hi: 16 }, { name: 'tot', lo: 1, hi: 25 }]);
    const n = s.nTimes, step = (spec.nperseg - spec.noverlap) / FS;
    return { n, step, t: s.times, a: Array.from(bp.a, (v, i) => v / bp.tot[i]), th: Array.from(bp.t, (v, i) => v / bp.tot[i]), d: Array.from(bp.d, (v, i) => v / bp.tot[i]) };
  }
  function framesToSpans(sh, pred) {
    return runs(sh.n, pred).map(([a, b]) => [Math.max(0, sh.t[a] - sh.step / 2), sh.t[b - 1] + sh.step / 2]);
  }
  const spanSec = (sp) => sp.reduce((s, [a, b]) => s + (b - a), 0);
  function sleep(sample) {
    const R = SLEEP_RULES;
    FS = sample.fs || 50;
    const byName = (n) => demean((sample.traces.find((t) => t.channel === n) || sample.traces[0]).values);
    const fpz = byName('FPZ-CZ'), pz = byName('PZ-OZ');
    const out = {};
    // Alpha (8–12 Hz) carrying ≥ 30% of 1–25 Hz power on Pz–Oz.
    const shP = shares(pz);
    out.alpha = { lead: 'Pz–Oz', spans: framesToSpans(shP, (i) => shP.a[i] >= R.alphaShare) };
    out.alpha.sec = spanSec(out.alpha.spans);
    // Theta (4–8 Hz) ≥ 30% on Fpz–Cz with little alpha.
    const shF = shares(fpz);
    out.theta = { lead: 'Fpz–Cz', spans: framesToSpans(shF, (i) => shF.th[i] >= R.thetaShare && shF.a[i] < R.alphaShare) };
    out.theta.sec = spanSec(out.theta.spans);
    // Spindle-like bursts: 11–16 Hz envelope ≥ 3× its epoch median for 0.5–3 s (Fpz–Cz).
    const sg = bandpass(fpz, 11, 16), env = movingRms(sg, Math.round(0.25 * FS)), thr = R.sigmaFactor * median(env);
    out.sigma = { lead: 'Fpz–Cz', spans: runs(env.length, (i) => env[i] >= thr).map(([a, b]) => [a / FS, b / FS]).filter(([a, b]) => b - a >= R.sigmaMin[0] && b - a <= R.sigmaMin[1]) };
    // Slow waves: 0.5–2 Hz, peak-to-peak ≥ 75 µV, one full cycle 0.5–2 s (Fpz–Cz).
    const lp = bandpass(fpz, 0.5, 2), zc = [];
    for (let i = 1; i < lp.length; i++) if (lp[i - 1] > 0 && lp[i] <= 0) zc.push(i);
    const sw = [];
    for (let j = 1; j < zc.length; j++) {
      const a = zc[j - 1], b = zc[j], d = (b - a) / FS;
      if (d < R.swDur[0] || d > R.swDur[1]) continue;
      let lo = Infinity, hi = -Infinity; for (let i = a; i < b; i++) { lo = Math.min(lo, fpz[i]); hi = Math.max(hi, fpz[i]); }
      if (hi - lo >= R.swP2P) sw.push([a / FS, b / FS]);
    }
    out.slow = { lead: 'Fpz–Cz', spans: sw, sec: spanSec(sw) };
    out.slow.frac = out.slow.sec / sample.duration_s;
    out.rules = R;
    return out;
  }

  // ── Plain-language cue sentences (at most two per case) ──
  const lead = (c) => c.replace(/-0$/, '').split('-').map((e) => e.charAt(0) + e.slice(1).toLowerCase()).join('–');
  const x1 = (r) => (r >= 10 ? r.toFixed(0) : r.toFixed(1)) + '×';
  function describeChb(c, base) {
    const bgName = base || 'this patient’s background windows';
    const out = [];
    const where = lead(c.focus[0]) + ' and ' + lead(c.focus[1]);
    if (c.standsOut) {
      out.push({ kind: 'where', leads: c.focus, span: c.span,
        text: where + ' (' + c.chainName + '): the trace moves ' + x1(c.ratio) + ' as much as in ' + bgName + (c.span && c.span[1] - c.span[0] < 7.5 ? ', from ' + c.span[0].toFixed(1) + ' to ' + c.span[1].toFixed(1) + ' s.' : ', across the window.') });
    } else {
      out.push({ kind: 'where', leads: [], span: null,
        text: 'No group of leads stands out: the traces move about as much as in ' + bgName + ' (' + x1(c.chainScore) + ' at most).' });
    }
    if (c.rhythm.rhythmic && !c.standsOut) {
      const f = c.rhythm.freq;
      out.push({ kind: 'rhythm', leads: [c.zoom.lead], zoom: c.zoom,
        text: 'A steady rhythm near ' + f.toFixed(1) + ' Hz is visible on ' + lead(c.zoom.lead) + '; rhythms like this also occur in normal background.' });
    } else if (c.rhythm.rhythmic) {
      const f = c.rhythm.freq;
      out.push({ kind: 'rhythm', leads: [c.zoom.lead], zoom: c.zoom,
        text: 'A regular rhythm near ' + f.toFixed(1) + ' Hz (about ' + Math.round(f) + ' waves a second) is visible on ' + lead(c.zoom.lead) + (c.drift ? ', drifting from ' + c.drift.from.toFixed(1) + ' to ' + c.drift.to.toFixed(1) + ' Hz within these 8 s.' : '.') });
    } else if (c.standsOut) {
      out.push({ kind: 'rhythm', leads: [], text: 'No single regular rhythm dominates these leads.' });
    }
    return out;
  }
  function describeSleep(c, dur) {
    const R = c.rules, out = [];
    const sec = (v) => Math.round(v) + ' of ' + Math.round(dur) + ' s';
    if (c.sigma.spans.length) out.push({ kind: 'sigma', lead: c.sigma.lead, spans: c.sigma.spans.slice(0, 2),
      text: (c.sigma.spans.length > 1 ? 'Spindle-like bursts' : 'A spindle-like burst') + ' (11–16 Hz, about ' + (c.sigma.spans[0][1] - c.sigma.spans[0][0]).toFixed(1) + ' s) at ' + c.sigma.spans.slice(0, 2).map((x) => x[0].toFixed(1) + ' s').join(' and ') + ' on Fpz–Cz. Sleep spindles are typical of light N2 sleep.' });
    if (c.alpha.sec >= 10) out.push({ kind: 'alpha', lead: c.alpha.lead, spans: c.alpha.spans,
      text: 'Alpha rhythm (8–12 Hz) at the back of the head (Pz–Oz) for ' + sec(c.alpha.sec) + ': the rhythm of relaxed wakefulness with the eyes closed.' });
    if (out.length < 2 && c.slow.frac >= R.swFracN3) out.push({ kind: 'slow', lead: c.slow.lead, spans: c.slow.spans,
      text: 'Large slow deflections (under 2 Hz, at least 75 µV) over ' + Math.round(c.slow.frac * 100) + '% of the epoch on Fpz–Cz. Deep N3 sleep needs at least 20% (eye movements look similar at this front lead).' });
    if (out.length < 2 && c.theta.sec >= 10) out.push({ kind: 'theta', lead: c.theta.lead, spans: c.theta.spans,
      text: 'Slower 4–8 Hz activity with little alpha for ' + sec(c.theta.sec) + ' on Fpz–Cz, as in drowsy N1 sleep.' });
    if (!out.length) out.push({ kind: 'none', lead: null, spans: [],
      text: 'No alpha run, spindle-like burst or large slow wave by these rules: low-voltage, mixed-frequency activity (eye and chin channels not shown).' });
    return out.slice(0, 2);
  }

  root.EEGJevCues = { chb, sleep, describeChb, describeSleep, CHB_RULES, SLEEP_RULES };
})(typeof window !== 'undefined' ? window : globalThis);
