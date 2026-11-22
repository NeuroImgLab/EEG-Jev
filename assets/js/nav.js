/* Section navigation: a bar that stays at the top, with the section in view marked
   (aria-current). The marked section is the one crossing a line 40% down the
   viewport; links scroll smoothly unless reduced motion is requested. */
(function () {
  'use strict';
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('.sn-links a')];
  const blocks = [...document.querySelectorAll('[data-sec]')].filter((e) => !e.closest('#site-nav'));
  let cur = '';
  function mark() {
    const line = (window.innerHeight || 800) * 0.4;
    let on = blocks.length ? blocks[0].dataset.sec : '';
    for (const b of blocks) { const r = b.getBoundingClientRect(); if (r.top <= line && r.bottom > 0) on = b.dataset.sec; }
    // At the very bottom the last section is current even when it is short.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) on = blocks[blocks.length - 1].dataset.sec;
    if (on === cur) return;
    cur = on;
    links.forEach((a) => { if (a.dataset.sec === on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    const a = links.find((x) => x.dataset.sec === on), ol = nav.querySelector('.sn-links');
    // Keep the current link visible when the bar scrolls sideways on phones.
    if (a && ol.scrollWidth > ol.clientWidth) ol.scrollLeft += a.getBoundingClientRect().left - ol.getBoundingClientRect().left - 4;
  }
  let raf = 0;
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; mark(); nav.classList.toggle('is-scrolled', window.scrollY > 8); }); }, { passive: true });
  window.addEventListener('resize', mark);
  nav.classList.toggle('is-scrolled', window.scrollY > 8);
  mark();
  // In-page links land with the target just below the bar. The landing is re-checked
  // once scrolling stops, because canvases, fonts or an opened panel above the target
  // can change height while a smooth scroll is running. Any user scroll input cancels it.
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const below = () => nav.offsetHeight + 12;
  let landing = 0;
  const cancel = () => { clearTimeout(landing); landing = 0; };
  ['wheel', 'touchstart', 'keydown', 'pointerdown', 'mousedown'].forEach((t) => window.addEventListener(t, cancel, { passive: true }));
  function land(t) {
    cancel();
    // Sections with padding above their eyebrow land on the eyebrow, so every section head sits just below the bar.
    t = t.querySelector(':scope > .eyebrow-l') || t;
    const go = (how) => window.scrollTo({ top: Math.max(0, Math.round(t.getBoundingClientRect().top + window.scrollY - below())), behavior: how });
    go(reduce() ? 'auto' : 'smooth');
    let last = -1, still = 0, fixes = 0, polls = 0;
    const check = () => {
      const y = window.scrollY;
      // A jump away from the target (scrollbar drag, scripted scroll) is the reader's own
      // move: stop checking. Layout shifts move the target with the page and do not count.
      const want = t.getBoundingClientRect().top + y - below();
      if (last >= 0 && Math.abs(y - want) > Math.abs(last - want) + 40) { landing = 0; return; }
      still = Math.abs(y - last) < 0.5 ? still + 1 : 0; last = y;
      if (still >= 3) {
        const off = t.getBoundingClientRect().top - below();
        const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 2;
        if (Math.abs(off) <= 2 || (off > 0 && atEnd) || (off < 0 && y <= 0) || fixes >= 3) { landing = 0; return; }
        fixes++; still = 0; go('auto');
      }
      if (++polls < 80) landing = setTimeout(check, 80); else landing = 0;
    };
    landing = setTimeout(check, 80);
  }
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    land(t);
    // Move the reading position for keyboard and screen-reader users without a second jump.
    const f = t.matches('a, button, input, select, textarea, [tabindex]') ? t : (t.closest('section, header') || t);
    if (!f.hasAttribute('tabindex') && !f.matches('a, button, input, select, textarea')) f.setAttribute('tabindex', '-1');
    f.focus({ preventScroll: true });
  });
  window.EEGJevNavQA = () => ({ current: cur, links: links.map((a) => a.textContent), height: Math.round(nav.getBoundingClientRect().height), top: Math.round(nav.getBoundingClientRect().top) });
})();
