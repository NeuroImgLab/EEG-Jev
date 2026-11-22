/* EEGJevSignal: dependency-free signal helpers for the offline replay demo.
 * Classic script (works from file://) and loadable in Node.
 * All inputs are plain or typed arrays in µV; all functions are pure. */
(function (root) {
  'use strict';

  // In-place iterative radix-2 complex FFT; length must be a power of two.
  function fftInPlace(re, im) {
    const n = re.length;
    if (n !== im.length || n < 1 || (n & (n - 1)) !== 0) {
      throw new Error('fftInPlace: length must be a power of two');
    }
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const ang = -2 * Math.PI / len;
      for (let k = 0; k < half; k++) {
        // Direct twiddles (no recurrence) keep rounding error at machine level.
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        for (let s = k; s < n; s += len) {
          const t = s + half;
          const xr = re[t] * wr - im[t] * wi;
          const xi = re[t] * wi + im[t] * wr;
          re[t] = re[s] - xr; im[t] = im[s] - xi;
          re[s] += xr; im[s] += xi;
        }
      }
    }
  }

  // Periodic ("DFT-even") Hann, as scipy.signal.get_window('hann', n).
  function hannPeriodic(n) {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
    return w;
  }

  // Matches scipy.signal.spectrogram(x, fs, window='hann', nperseg, noverlap,
  // nfft, detrend='constant', scaling='density', mode='psd'), one-sided.
  function spectrogram(x, fs, opts) {
    const o = opts || {};
    const nperseg = o.nperseg || 100;
    const noverlap = o.noverlap != null ? o.noverlap : 88;
    const nfft = o.nfft || 256;
    if (nfft < nperseg) throw new Error('spectrogram: nfft < nperseg');
    const step = nperseg - noverlap;
    const nTimes = x.length >= nperseg ? Math.floor((x.length - noverlap) / step) : 0;
    const nFreqs = (nfft >> 1) + 1;
    const w = hannPeriodic(nperseg);
    let wss = 0;
    for (let i = 0; i < nperseg; i++) wss += w[i] * w[i];
    const scale = 1 / (fs * wss);
    const times = new Float64Array(nTimes);
    const freqs = new Float64Array(nFreqs);
    for (let k = 0; k < nFreqs; k++) freqs[k] = k * fs / nfft;
    const psd = new Float64Array(nTimes * nFreqs);
    const re = new Float64Array(nfft), im = new Float64Array(nfft);
    for (let t = 0; t < nTimes; t++) {
      const start = t * step;
      times[t] = (start + nperseg / 2) / fs;
      let mean = 0;
      for (let i = 0; i < nperseg; i++) mean += x[start + i];
      mean /= nperseg;
      re.fill(0); im.fill(0);
      for (let i = 0; i < nperseg; i++) re[i] = (x[start + i] - mean) * w[i];
      fftInPlace(re, im);
      const row = t * nFreqs;
      for (let k = 0; k < nFreqs; k++) {
        let p = (re[k] * re[k] + im[k] * im[k]) * scale;
        // Double every bin except DC and (for even nfft) Nyquist.
        if (k > 0 && !(nfft % 2 === 0 && k === nFreqs - 1)) p *= 2;
        psd[row + k] = p;
      }
    }
    return { times, freqs, psd, nTimes, nFreqs };
  }

  // Channel-mean linear PSD, then 10*log10(p + 1e-12). traces: arrays or {values}.
  function meanSpectrogramDb(traces, fs, opts) {
    if (!traces || !traces.length) throw new Error('meanSpectrogramDb: no traces');
    let acc = null;
    for (const tr of traces) {
      const x = Array.isArray(tr) || ArrayBuffer.isView(tr) ? tr : tr.values;
      const s = spectrogram(x, fs, opts);
      if (!acc) acc = s;
      else for (let i = 0; i < acc.psd.length; i++) acc.psd[i] += s.psd[i];
    }
    const out = new Float64Array(acc.psd.length);
    for (let i = 0; i < out.length; i++) out[i] = 10 * Math.log10(acc.psd[i] / traces.length + 1e-12);
    return { times: acc.times, freqs: acc.freqs, psd: out, nTimes: acc.nTimes, nFreqs: acc.nFreqs };
  }

  // Line length per non-overlapping epoch (µV/s); trailing partial epoch dropped.
  function lineLength(x, fs, epochSec) {
    const sec = epochSec || 0.5;
    const len = Math.round(sec * fs);
    const n = len > 0 ? Math.floor(x.length / len) : 0;
    const out = new Float64Array(n);
    for (let e = 0; e < n; e++) {
      const a = e * len;
      let s = 0;
      for (let i = a; i < a + len - 1; i++) s += Math.abs(x[i + 1] - x[i]);
      out[e] = s / sec;
    }
    return out;
  }

  // Integrate a (linear) spectrogram over lo <= f < hi for each time slice.
  function bandPowerSeries(spec, bands) {
    const df = spec.nFreqs > 1 ? spec.freqs[1] - spec.freqs[0] : 0;
    const out = {};
    for (const b of bands) {
      const series = new Float64Array(spec.nTimes);
      for (let t = 0; t < spec.nTimes; t++) {
        const row = t * spec.nFreqs;
        let s = 0;
        for (let k = 0; k < spec.nFreqs; k++) {
          const f = spec.freqs[k];
          if (f >= b.lo && f < b.hi) s += spec.psd[row + k];
        }
        series[t] = s * df;
      }
      out[b.name] = series;
    }
    return out;
  }

  // numpy.percentile(arr, q) with the default 'linear' method; q in [0, 100].
  function percentile(arr, q) {
    const n = arr.length;
    if (!n) return NaN;
    const s = Float64Array.from(arr).sort();
    const pos = (n - 1) * Math.min(100, Math.max(0, q)) / 100;
    const lo = Math.floor(pos), hi = Math.min(lo + 1, n - 1), g = pos - lo;
    const a = s[lo], b = s[hi], d = b - a;
    // Same two-sided lerp as numpy for numerical parity.
    return g >= 0.5 ? b - d * (1 - g) : a + d * g;
  }

  const CHB_CHAINS = {
    LT: ['FP1-F7', 'F7-T7', 'T7-P7', 'P7-O1'],
    LP: ['FP1-F3', 'F3-C3', 'C3-P3', 'P3-O1'],
    RP: ['FP2-F4', 'F4-C4', 'C4-P4', 'P4-O2'],
    RT: ['FP2-F8', 'F8-T8', 'T8-P8-0', 'P8-O2'],
    Z: ['FZ-CZ', 'CZ-PZ']
  };
  const CHAIN_OF = {};
  for (const k of Object.keys(CHB_CHAINS)) for (const c of CHB_CHAINS[k]) CHAIN_OF[c] = k;

  function chbChain(channelName) {
    return CHAIN_OF[String(channelName).trim().toUpperCase()] || 'AUX';
  }

  // 'T8-P8-0' -> ['T8', 'P8']; bare duplicate suffixes (-0/-1) are dropped.
  function electrodePairs(channelName) {
    return String(channelName).trim().toUpperCase().split('-')
      .filter((p) => p && !/^\d+$/.test(p)).slice(0, 2);
  }

  // 2D unit-disc positions (nose up, x right). Polar 10-20 layout: Fp/F7/T/P7/O
  // on r=1 every 36 degrees, F3/C3/P3 on the inner ring, FT9/FT10 just outside.
  const ELECTRODES_1020 = (function () {
    const d2r = Math.PI / 180;
    const polar = (deg, r) => [+(r * Math.sin(deg * d2r)).toFixed(4), +(r * Math.cos(deg * d2r)).toFixed(4)];
    const left = {
      FP1: polar(-18, 1), F7: polar(-54, 1), T7: polar(-90, 1), P7: polar(-126, 1), O1: polar(-162, 1),
      F3: polar(-40, 0.65), C3: polar(-90, 0.5), P3: polar(-140, 0.65), FT9: polar(-72, 1.08)
    };
    const mirror = { FP1: 'FP2', F7: 'F8', T7: 'T8', P7: 'P8', O1: 'O2', F3: 'F4', C3: 'C4', P3: 'P4', FT9: 'FT10' };
    const pos = { FPZ: polar(0, 1), FZ: polar(0, 0.5), CZ: [0, 0], PZ: polar(180, 0.5), OZ: polar(180, 1) };
    for (const k of Object.keys(left)) {
      pos[k] = left[k];
      pos[mirror[k]] = [-left[k][0], left[k][1]];
    }
    for (const k of Object.keys(pos)) pos[k] = Object.freeze(pos[k].map((v) => v + 0));
    return Object.freeze(pos);
  })();

  const api = {
    fftInPlace, hannPeriodic, spectrogram, meanSpectrogramDb, lineLength,
    bandPowerSeries, percentile, chbChain, electrodePairs, ELECTRODES_1020, CHB_CHAINS
  };
  root.EEGJevSignal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
