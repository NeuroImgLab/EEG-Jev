/* Typed answer views shared by the replay stage and the window-by-window console.
   Choice: one bar per option. Noul: one probability on a 0–100% track with the
   development threshold marked. Score: one bar per rating level with the expected
   value and the reported rating marked on the same axis.
   Every number comes from the saved prediction of the window; nothing is fitted here. */
(function (root) {
  'use strict';
  const M = root.EEGJevData;
  if (!M) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ── Score ─────────────────────────────────────────
  // host: element; opts.compact for the stage card. Returns { set(probs|null, rating|null, done) }.
  function score(host, opts = {}) {
    const K = 11;
    host.classList.add('score');
    if (opts.compact) host.classList.add('score-compact');
    host.innerHTML =
      '<div class="score-plot" role="group" aria-label="Probability of each rating from 0 to 10">' +
        '<div class="score-cols">' + Array.from({ length: K }, (_, k) => '<button type="button" class="score-col" data-k="' + k + '"><span class="score-bar"><i></i></span><b class="mono">' + k + '</b></button>').join('') + '</div>' +
        '<span class="score-mark score-exp" hidden><i></i><em class="mono"></em></span>' +
        '<span class="score-mark score-ref" hidden><i></i><em class="mono"></em></span>' +
      '</div>' +
      '<p class="score-read mono" aria-live="polite"></p>';
    const cols = [...host.querySelectorAll('.score-col')], exp = host.querySelector('.score-exp'), ref = host.querySelector('.score-ref'), read = host.querySelector('.score-read');
    let cur = null, pinned = null;
    const pos = (v) => ((v + 0.5) / K * 100).toFixed(3) + '%';
    const idle = () => {
      if (!cur || !cur.done) { read.textContent = cur && !cur.done ? 'Distribution appears when the window is complete.' : ''; return; }
      const s = cur.stats;
      read.innerHTML = opts.compact ? 'Hover or tap a bar for its probability.' : 'Expected value Σ k·p(k) = <b>' + s.expected.toFixed(2) + '</b> · hover or tap a bar for its probability.';
    };
    const show = (k) => {
      if (!cur || !cur.done) { cols.forEach((c) => c.classList.remove('on')); return idle(); }
      cols.forEach((c, i) => c.classList.toggle('on', i === k));
      if (k == null) return idle();
      read.innerHTML = 'p(rating = ' + k + ') = <b>' + M.pct(cur.p[k]) + '</b>' + (cur.rating != null && Math.round(cur.rating) === k ? ' · reported rating' : '');
    };
    cols.forEach((c, k) => {
      c.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') show(k); });
      c.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') show(pinned); });
      c.addEventListener('focus', () => show(k));
      c.addEventListener('blur', () => show(pinned));
      c.addEventListener('click', () => { pinned = pinned === k ? null : k; show(pinned); });
      c.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault(); e.stopPropagation();
        cols[Math.max(0, Math.min(K - 1, k + d))].focus();
      });
    });
    function set(p, rating, done) {
      if (!p) { cur = null; pinned = null; cols.forEach((c) => { c.querySelector('i').style.height = '0%'; c.classList.remove('on', 'is-ref', 'is-mode'); c.setAttribute('aria-label', 'Rating ' + c.dataset.k); }); exp.hidden = ref.hidden = true; read.textContent = ''; return; }
      const stats = M.scoreStats(p), max = Math.max(stats.pmax, 0.25);
      const changed = !cur || cur.p !== p;
      if (changed) pinned = null;
      cur = { p, rating, done, stats };
      host.classList.toggle('pending', !done);
      cols.forEach((c, k) => {
        c.querySelector('i').style.height = done ? Math.max(1.5, p[k] / max * 100) + '%' : '0%';
        c.classList.toggle('is-mode', done && k === stats.mode);
        c.classList.toggle('is-ref', done && rating != null && Math.round(rating) === k);
        c.setAttribute('aria-label', done ? 'Rating ' + k + ': probability ' + M.pct(p[k]) : 'Rating ' + k + ': pending');
        c.tabIndex = done ? 0 : -1;
      });
      exp.hidden = !done; ref.hidden = !done || rating == null;
      if (done) {
        exp.style.left = pos(stats.expected); exp.querySelector('em').textContent = stats.expected.toFixed(1);
        if (rating != null) { ref.style.left = pos(rating); ref.querySelector('em').textContent = String(+rating.toFixed(2)); }
        // When the two markers are close, the labels move apart instead of overlapping.
        const near = rating != null && Math.abs(stats.expected - rating) < 1.15;
        exp.classList.toggle('nudge-l', near && stats.expected <= rating); exp.classList.toggle('nudge-r', near && stats.expected > rating);
        ref.classList.toggle('nudge-l', near && rating < stats.expected); ref.classList.toggle('nudge-r', near && rating >= stats.expected);
      }
      host.querySelector('.score-plot').setAttribute('aria-label', done
        ? 'Probability of each rating from 0 to 10. Expected value ' + stats.expected.toFixed(2) + (rating != null ? '; reported rating ' + (+rating.toFixed(2)) : '') + '.'
        : 'Probability of each rating from 0 to 10: pending');
      show(pinned);
    }
    return { set };
  }

  // ── Noul ──────────────────────────────────────────
  // One probability on a 0–100% track with the development threshold marked.
  function noul(host, opts = {}) {
    host.classList.add('noul');
    host.innerHTML = '<div class="noul-track" role="img"><i class="noul-fill"></i><span class="noul-thr" hidden><em class="mono"></em></span></div>' +
      '<div class="noul-scale mono" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>';
    const fill = host.querySelector('.noul-fill'), thr = host.querySelector('.noul-thr'), track = host.querySelector('.noul-track');
    function set(p, threshold, done) {
      host.classList.toggle('pending', !done);
      fill.style.width = done && p != null ? Math.max(0.6, p * 100) + '%' : '0%';
      const over = done && threshold != null && p >= threshold;
      host.classList.toggle('over', !!over);
      thr.hidden = threshold == null;
      if (threshold != null) { thr.style.left = (threshold * 100).toFixed(2) + '%'; thr.querySelector('em').textContent = opts.thrLabel || 'threshold'; }
      track.setAttribute('aria-label', done && p != null ? 'Probability ' + M.pct(p) + (threshold != null ? '; development threshold ' + (threshold * 100).toFixed(1) + '%' : '') : 'pending');
    }
    return { set };
  }

  // ── Choice (five sleep stages) ────────────────────
  function choice(host, opts = {}) {
    const ids = opts.ids || M.STAGES, label = opts.label || ((k) => k);
    host.classList.add('bars'); host.classList.toggle('bars-wide', !!opts.ids);
    host.innerHTML = ids.map((s) => '<div class="bar-row" data-s="' + esc(s) + '"><b>' + esc(label(s)) + '</b><span class="track-bar" style="--c:' + M.classColor(ids, s) + '"><i></i></span><span class="v"></span></div>').join('');
    function set(probs, done) {
      const top = probs ? ids.reduce((a, b) => (probs[b] > probs[a] ? b : a)) : null;
      for (const row of host.querySelectorAll('.bar-row')) {
        const s = row.dataset.s, p = probs ? probs[s] : 0;
        row.querySelector('i').style.width = (done ? p * 100 : 0) + '%';
        row.querySelector('.v').textContent = done ? M.pct(p) : '··';
        row.classList.toggle('top', !!done && s === top);
        row.classList.toggle('dim', !!done && s !== top);
      }
    }
    return { set };
  }

  root.EEGJevAnswers = Object.freeze({ score, noul, choice, esc });
})(window);
