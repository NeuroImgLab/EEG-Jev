/* Hero constellation: one EEG window in the centre, typed questions around it.
   The three replayed questions are live: they pick what the stage below plays, the
   centre shows the window the stage has most recently answered (or the one being
   drawn), and the card shows that window's saved answer. The other cards carry no
   numbers. Nothing here reads data on its own: stage.js hands over the window and
   the text, so the hero can never disagree with the stage. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const box = $('#constellation'), svg = $('#links'), cv = $('#cv-hero'), stage = $('#stage');
  const RP = window.EEGJevReplay;
  if (!box || !svg || !cv || !stage) return;
  const TEAL = '#3dd6c6';
  const LIVE = [...box.querySelectorAll('.qcard.live')].map((c) => c.dataset.go);
  const ansOf = (task) => $('#hero-' + task);
  const IDLE = Object.fromEntries(LIVE.map((t) => [t, ansOf(t).textContent]));
  const cardOf = (task) => box.querySelector('.qcard.live[data-go="' + task + '"]');
  let last = null, key = '', visible = true;

  function links() {
    if (!RP || getComputedStyle(svg).display === 'none') { svg.innerHTML = ''; return; }
    const r0 = box.getBoundingClientRect(), st = box.querySelector('.state').getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + r0.width + ' ' + r0.height);
    const rect = (r) => ({ left: r.left - r0.left, top: r.top - r0.top, width: r.width, height: r.height });
    const on = last ? last.task : stage.dataset.task;
    svg.innerHTML = [...box.querySelectorAll('.qcard')].map((c) => {
      const line = RP.connector(rect(st), rect(c.getBoundingClientRect()), 10);
      if (!line) return '';
      const a = line.start, b = line.end, live = c.classList.contains('live');
      return '<path data-slot="' + c.dataset.slot + '" class="' + (live ? 'l-live' : 'l-vis') + (live && c.dataset.go === on ? ' is-current' : '') + '" d="M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' L' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + '"/>';
    }).join('');
  }

  function paint() {
    if (!last || !visible || !cv.clientWidth) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(141,154,167,.08)'; ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) { const x = Math.round((i / 8) * w) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.lineJoin = 'round';
    const p = last.draw(ctx, w, h);
    // A window still being drawn gets the sweep line at its edge, as in the stage.
    if (typeof p === 'number' && p < 1) { const x = p * w; ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  }

  // Called by the stage on every render; cheap when nothing changed.
  function show(s) {
    const taskChanged = !last || last.task !== s.task;
    last = s;
    LIVE.forEach((t) => {
      const c = cardOf(t), on = t === s.task;
      c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on));
      // The dot of the key's "saved model output" marks only a real saved answer, not a waiting note.
      c.classList.toggle('has-out', on && !!s.out);
      const a = ansOf(t), txt = on ? s.answer : (c.dataset.idle || IDLE[t]);
      if (a.textContent !== txt) a.textContent = txt;
    });
    const src = $('#hero-src');
    if (src.textContent !== s.caption) src.textContent = s.caption;
    box.dataset.signalTask = s.task;
    if (taskChanged) links();
    if (s.key !== key) { key = s.key; paint(); }
  }

  box.querySelectorAll('.qcard.live').forEach((b) => b.addEventListener('click', () => {
    // A trained question card chooses what the stage plays; the stage keeps its mode.
    const tab = stage.querySelector('.stage-tabs [data-task="' + b.dataset.go + '"]');
    if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
    const r = stage.getBoundingClientRect(), vh = window.innerHeight || 800;
    if (r.top > vh * 0.55 || r.bottom < 80) stage.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));

  if (window.IntersectionObserver) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { key = ''; paint(); } }).observe(box);
  if (window.ResizeObserver) new ResizeObserver(() => { links(); key = ''; paint(); }).observe(box);
  window.addEventListener('resize', () => { links(); key = ''; paint(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(links);
  links();
  window.EEGJevHero = Object.freeze({ show });
  window.EEGJevHeroQA = () => ({ task: last && last.task, caption: $('#hero-src').textContent, answers: Object.fromEntries(LIVE.map((t) => [t, ansOf(t).textContent])), links: svg.querySelectorAll('path').length, current: [...svg.querySelectorAll('path.is-current')].map((p) => p.dataset.slot) });
})();
