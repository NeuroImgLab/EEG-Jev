/* EEG-Jev demo · channels: which model-input channels are shown, and the one selection shared by the
   scalp map, the lead list and the waveforms of both the replay and the single windows.

   The channel lists, their order and the electrode positions come from material/manifest.json
   (tasks.<task>.input_channels), which the builder reads from the source registry and from the
   positions stored with the encoder features. "Default" is a display subset only; the model
   always reads every input channel. */
(function (root) {
  'use strict';
  const M = root.EEGJevData;
  if (!M) return;
  const NS = 'http://www.w3.org/2000/svg';
  const SLEEP_COLOR = ['#7cc4ff', '#8fe3b8'];
  const cache = {}, states = {}, listeners = new Set();
  const keyOf = (name) => String(name).toUpperCase();
  const isCap = (task) => task === 'pain' || task === 'mi';

  // Azimuthal projection of a head position (metres; x right, y front, z up): the vertex is the centre,
  // the plane through the origin is the unit circle. SVG y points down, so the front of the head is up.
  function flat(p) {
    if (!p) return null;
    const r = Math.hypot(p[0], p[1], p[2]), h = Math.hypot(p[0], p[1]);
    if (!r) return null;
    const rho = Math.acos(Math.max(-1, Math.min(1, p[2] / r))) / (Math.PI / 2);
    return h ? [rho * p[0] / h, -rho * p[1] / h] : [0, 0];
  }
  function info(task) {
    if (cache[task]) return cache[task];
    const man = M.manifest(), t = man && man.tasks[M.DIR[task]], ic = t && t.input_channels;
    if (!ic) return null;
    const el = new Map(Object.keys(ic.electrodes).map((n) => [n, flat(ic.electrodes[n])]));
    const list = ic.channels.map((c, i) => {
      const k = keyOf(c.name), ends = c.electrodes.map(keyOf);
      const label = isCap(task) ? M.capName(c.name) : M.leadName(k);
      return { key: k, label, idx: i, recorded: c.recorded !== false, bipolar: !!c.bipolar, ends, a: el.get(ends[0]) || null, b: c.bipolar ? (el.get(ends[1]) || null) : null,
        p: flat(c.model_position_m), mm: c.model_position_m ? c.model_position_m.map((v) => Math.round(v * 1000)) : null, group: task === 'chb' ? M.chainOf(k) : isCap(task) ? M.regionOf(k) : 'S' + (i % 2), hasPos: !!c.model_position_m && (!c.bipolar || (el.has(ends[0]) && el.has(ends[1]))),
        color: task === 'chb' ? M.CHAIN_COLOR[M.chainOf(k)] || M.CHAIN_COLOR.AUX : isCap(task) ? M.REGION_COLOR[M.regionOf(k)] : SLEEP_COLOR[i % 2] };
    });
    const by = new Map(list.map((c) => [c.key, c]));
    const defaults = ic.default_leads.map(keyOf).filter((k) => by.has(k));
    cache[task] = { task, list, by, defaults, n: list.length, nRecorded: list.filter((c) => c.recorded).length, electrodes: el, bipolar: list.some((c) => c.bipolar), source: ic.source, note: ic.position_note, emptyNote: ic.empty_slot_note };
    return cache[task];
  }
  function st(task) {
    if (!states[task]) { const I = info(task); states[task] = { mode: 'default', custom: new Set(I ? I.defaults : []), sel: null, hover: null, group: null }; }
    return states[task];
  }
  function shown(task) {
    const I = info(task); if (!I) return [];
    const s = st(task);
    if (s.mode === 'all') return I.list.map((c) => c.key);
    const set = s.mode === 'custom' ? s.custom : new Set(I.defaults);
    return I.list.filter((c) => set.has(c.key)).map((c) => c.key);
  }
  const sig = (task) => { const s = st(task); return s.mode === 'custom' ? 'c:' + shown(task).join(',') : s.mode; };
  const emit = (type, task) => { for (const f of [...listeners]) { try { f({ type, task }); } catch (e) { /* a view that failed to redraw must not stop the others */ } } };
  function setMode(task, mode) { const s = st(task); if (s.mode === mode) return; s.mode = mode; if (s.sel && !shown(task).includes(s.sel)) s.sel = null; emit('shown', task); }
  function toggle(task, key, on) {
    const s = st(task), has = s.custom.has(key), want = on == null ? !has : on;
    if (want === has) return;
    if (!want && s.custom.size <= 1) return;   // at least one channel stays on screen
    if (want) s.custom.add(key); else s.custom.delete(key);
    if (s.mode !== 'custom') s.mode = 'custom';
    if (s.sel && !shown(task).includes(s.sel)) s.sel = null;
    emit('shown', task);
  }
  function reset(task) { const s = st(task), I = info(task); s.custom = new Set(I.defaults); s.mode = 'default'; if (s.sel && !shown(task).includes(s.sel)) s.sel = null; emit('shown', task); }
  // Pin a channel (click, Enter, tap). The same channel again releases it. A pinned channel that is not on screen is added to it.
  function select(task, key, opts) {
    const s = st(task), keep = opts && opts.keep;
    const next = key && !(s.sel === key && !keep) ? key : null;
    if (next === s.sel) return;
    s.sel = next;
    if (next && !shown(task).includes(next)) { if (s.mode === 'default') s.custom = new Set(info(task).defaults); s.custom.add(next); s.mode = 'custom'; emit('shown', task); return; }
    emit('hot', task);
  }
  function hover(task, key, group) {
    const s = st(task), g = group && group.length ? group.join('|') : null;
    if (s.hover === (key || null) && (s.group ? s.group.join('|') : null) === g) return;
    s.hover = key || null; s.group = group && group.length ? group : null; emit('hot', task);
  }
  // 'sel' | 'hover' | 'group' | null for a channel; anyHot says whether the others should step back.
  const hot = (task, key) => { const s = st(task); return s.sel === key ? 'sel' : s.hover === key ? 'hover' : s.group && s.group.includes(key) ? 'group' : null; };
  const anyHot = (task) => { const s = st(task); return !!(s.sel || s.hover || s.group); };
  const countText = (task) => { const I = info(task), n = shown(task).length; return 'Showing ' + n + ' of ' + I.n + ' input channels'; };
  const GROUP_NAME = { L: 'left hemisphere', Z: 'midline', R: 'right hemisphere', LT: 'left temporal chain', LP: 'left parasagittal chain', RP: 'right parasagittal chain', RT: 'right temporal chain', AUX: 'alternative lead name' };
  // One sentence about a channel: what it is, where it sits, how it enters the model.
  function describe(task, key) {
    const I = info(task), c = I && I.by.get(key); if (!c) return '';
    const at = c.mm ? 'x ' + c.mm[0] + ', y ' + c.mm[1] + ', z ' + c.mm[2] + ' mm' : 'no position available';
    const grp = task === 'sleep' ? '' : ' · ' + (GROUP_NAME[c.group] || '');
    if (!c.recorded) return c.label + ' · empty input slot: no such lead in this recording, zero in the model input';
    return c.bipolar
      ? c.label + grp + ' · bipolar lead between ' + c.ends.map(M.capName).join(' and ') + ' · enters the model at ' + M.capName(c.ends[0]) + ' (' + at + ')'
      : c.label + grp + ' · single electrode at ' + at + (I.defaults.includes(key) ? ' · default lead' : '');
  }
  // Labels sit in two columns outside the head, joined to their electrodes by leader lines, so dense maps stay readable.
  function layoutLabels(points) {
    const L = [], R = [];
    for (const q of [...points].sort((a, b) => a.y - b.y)) (q.x < -0.03 ? L : q.x > 0.03 ? R : (L.length <= R.length ? L : R)).push(q);
    const GAP = 0.225, TOP = -1.3, BOT = 1.2;
    for (const col of [L, R]) {
      col.sort((a, b) => a.y - b.y);
      const n = col.length, gap = Math.min(GAP, n > 1 ? (BOT - TOP) / (n - 1) : GAP);
      let y = TOP - gap;
      for (const q of col) { q.ly = Math.max(q.y, y + gap); y = q.ly; }
      y = BOT + gap;
      for (let i = n - 1; i >= 0; i--) { col[i].ly = Math.min(col[i].ly, y - gap); y = col[i].ly; }
    }
    L.forEach((q) => { q.side = -1; }); R.forEach((q) => { q.side = 1; });
    return L.concat(R);
  }

  // ── Panel: scalp map, count, mode buttons, search, list ──
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let uid = 0;
  function mount(host, getTask, opts) {
    opts = opts || {};
    const id = 'chp' + (++uid);
    host.classList.add('chp');
    host.innerHTML =
      '<div class="chp-map"><svg class="chp-scalp" viewBox="-2.06 -1.44 4.12 2.76" role="group" aria-label="Electrode map; each electrode or lead can be focused and pinned"></svg>' +
      '<ul class="chp-legend mono" aria-label="Colours"></ul></div>' +
      '<div class="chp-body">' +
      '<p class="chp-count mono" id="' + id + '-count" aria-live="polite"></p>' +
      '<div class="chp-modes" role="radiogroup" aria-label="Channels shown"><button type="button" role="radio" data-m="default">Default</button><button type="button" role="radio" data-m="all">All</button><button type="button" role="radio" data-m="custom">Custom</button></div>' +
      '<div class="chp-custom" hidden><input type="search" class="chp-search mono" placeholder="Search by name" aria-label="Search channels by name" autocomplete="off" spellcheck="false"><button type="button" class="chp-reset">Restore default</button></div>' +
      '<ul class="chp-list mono" aria-label="Channels"></ul>' +
      '<p class="chp-sel" role="status"></p></div>';
    const svg = host.querySelector('svg'), list = host.querySelector('.chp-list'), search = host.querySelector('.chp-search'), selBox = host.querySelector('.chp-sel');
    let built = '', query = '', labKey = '', gLab = null, tipText = '';
    const task = () => getTask();
    const bindHot = (node, key, group, text) => {
      const on = () => { tipText = text || ''; hover(task(), key, group); paintSel(); }, off = () => { tipText = ''; hover(task(), null); paintSel(); };
      node.addEventListener('pointerenter', on); node.addEventListener('pointerleave', off); node.addEventListener('focus', on); node.addEventListener('blur', off);
    };
    const press = (node, fn) => { node.addEventListener('click', fn); node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); };
    // Which electrodes carry a label: everything on screen when there is room, otherwise the default set; hot ones always.
    function labelSet(T) {
      const I = info(T), s = st(T), vis = new Set(shown(T)), want = new Map();
      const add = (name, p) => { if (p && !want.has(name)) want.set(name, { name, x: p[0], y: p[1] }); };
      const base = vis.size <= 22 ? [...vis] : I.defaults.filter((k) => vis.has(k));
      const hotKeys = [s.sel, s.hover].concat(s.group || []).filter(Boolean);
      for (const k of base.concat(hotKeys)) { const c = I.by.get(k); if (!c) continue; if (c.bipolar) { add(c.ends[0], c.a); add(c.ends[1], c.b); } else add(c.key, c.p); }
      return [...want.values()];
    }
    function drawLabels() {
      const T = task(), pts = labelSet(T), key = pts.map((q) => q.name).join(',');
      if (key !== labKey) {
        labKey = key; gLab.textContent = '';
        for (const q of layoutLabels(pts)) {
          const xe = q.side * 1.3, xt = q.side * 1.47, g = el('g', { class: 'chp-lab', 'data-l': q.name }, gLab);
          el('path', { d: 'M ' + q.x.toFixed(3) + ' ' + q.y.toFixed(3) + ' L ' + xe + ' ' + q.ly.toFixed(3) + ' L ' + (q.side * 1.42) + ' ' + q.ly.toFixed(3), class: 'chp-leader' }, g);
          const t = el('text', { x: xt, y: q.ly.toFixed(3), class: 'chp-name', 'text-anchor': q.side < 0 ? 'end' : 'start', 'dominant-baseline': 'central' }, g); t.textContent = M.capName(q.name);
        }
      }
      const I = info(T), hotNames = new Set();
      for (const c of I.list) if (hot(T, c.key)) (c.bipolar ? c.ends : [c.key]).forEach((e) => hotNames.add(e));
      gLab.querySelectorAll('.chp-lab').forEach((g) => g.classList.toggle('is-hot', hotNames.has(g.dataset.l)));
    }
    function legend(T) {
      const I = info(T), items = [];
      if (T === 'chb') for (const k of Object.keys(M.CHAIN_NAME)) items.push([M.CHAIN_COLOR[k], M.CHAIN_NAME[k]]);
      else if (isCap(T)) items.push([M.REGION_COLOR.L, 'Left'], [M.REGION_COLOR.Z, 'Midline'], [M.REGION_COLOR.R, 'Right']);
      else for (const c of I.list) items.push([c.color, c.label]);
      host.querySelector('.chp-legend').innerHTML = items.map((x) => '<li><i style="background:' + x[0] + '"></i>' + esc(x[1]) + '</li>').join('') +
        (I.n > I.nRecorded ? '<li class="lg-empty"><i></i>∅ empty slot</li>' : '') + (shown(T).length < I.n ? '<li class="lg-off"><i></i>not shown</li>' : '');
    }
    function build() {
      const T = task(), I = info(T); if (!I) return;
      const s = st(T), vis = new Set(shown(T));
      built = T + '|' + sig(T) + '|' + query; labKey = '';
      svg.textContent = '';
      el('circle', { cx: 0, cy: 0, r: 1, class: 'chp-head' }, svg);
      el('path', { d: 'M -0.12 -0.99 L 0 -1.13 L 0.12 -0.99', class: 'chp-head' }, svg);
      el('path', { d: 'M -1 -0.15 Q -1.11 0 -1 0.15 M 1 -0.15 Q 1.11 0 1 0.15', class: 'chp-head' }, svg);
      gLab = el('g', { class: 'chp-labels', 'aria-hidden': 'true' }, svg);
      if (I.bipolar) {
        for (const c of I.list) {
          if (!c.a || !c.b) continue;
          const on = vis.has(c.key), g = el('g', { class: 'chp-lead' + (on ? ' on' : '') + (c.recorded ? '' : ' empty'), 'data-k': c.key, tabindex: 0, role: 'button', 'aria-label': 'Lead ' + c.label + (c.recorded ? '' : ', empty input slot') + (on ? ', shown' : ', not shown') }, svg);
          el('line', { x1: c.a[0], y1: c.a[1], x2: c.b[0], y2: c.b[1], class: 'chp-hit' }, g);
          el('line', { x1: c.a[0], y1: c.a[1], x2: c.b[0], y2: c.b[1], class: 'chp-line', style: 'stroke:' + c.color }, g);
          bindHot(g, c.key, null, '');
          press(g, () => select(T, c.key));
        }
        for (const [name, p] of I.electrodes) {
          if (!p) continue;
          const leads = I.list.filter((c) => c.ends.includes(name)), on = leads.some((c) => vis.has(c.key)), keys = leads.map((c) => c.key);
          const node = el('circle', { cx: p[0], cy: p[1], r: on ? 0.062 : 0.04, class: 'chp-el' + (on ? ' on' : ''), 'data-e': name, tabindex: 0, role: 'button', 'aria-label': 'Electrode ' + M.capName(name) + ', in ' + leads.map((c) => c.label).join(', ') }, svg);
          bindHot(node, null, keys, 'Electrode ' + M.capName(name) + ' is part of ' + leads.map((c) => c.label).join(', ') + (leads.length > 1 ? ' · click to step through them' : ''));
          press(node, () => { const cur = st(T).sel, k = keys.indexOf(cur); select(T, keys[(k + 1) % keys.length], { keep: true }); });
        }
      } else {
        for (const c of I.list) {
          if (!c.p) continue;
          const on = vis.has(c.key);
          const node = el('circle', { cx: c.p[0], cy: c.p[1], r: on ? 0.07 : 0.036, class: 'chp-el' + (on ? ' on' : ''), 'data-k': c.key, tabindex: 0, role: 'button', style: on ? 'fill:' + c.color : '', 'aria-label': 'Channel ' + c.label + (on ? ', shown' : ', not shown') }, svg);
          bindHot(node, c.key, null, on ? '' : 'not shown · click to add and pin');
          press(node, () => select(T, c.key));
        }
      }
      legend(T);
      host.querySelector('.chp-count').innerHTML = '<b>' + vis.size + '</b> of <b>' + I.n + '</b> input channels shown <span>· the model reads all ' + I.n + '</span>';
      host.querySelectorAll('.chp-modes button').forEach((b) => { const on = b.dataset.m === s.mode; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      host.querySelector('.chp-custom').hidden = s.mode !== 'custom';
      const q = query.trim().toUpperCase();
      const rows = s.mode === 'custom' ? I.list.filter((c) => !q || c.key.includes(q)) : I.list.filter((c) => vis.has(c.key));
      list.classList.toggle('is-pick', s.mode === 'custom'); list.classList.toggle('is-long', rows.length > 20);
      list.innerHTML = rows.map((c) => '<li data-k="' + c.key + '"' + (c.recorded ? '' : ' class="empty"') + '>' +
        (s.mode === 'custom' ? '<input type="checkbox" aria-label="Show ' + esc(c.label) + '"' + (s.custom.has(c.key) ? ' checked' : '') + '>' : '') +
        '<button type="button" class="chp-ch" style="--c:' + c.color + '">' + esc(c.label) + (c.recorded ? (c.hasPos ? '' : '<small>no pos.</small>') : '<small>∅</small>') + '</button></li>').join('') || '<li class="none">No channel matches “' + esc(query) + '”.</li>';
      list.querySelectorAll('li[data-k]').forEach((li) => {
        const k = li.dataset.k, b = li.querySelector('.chp-ch');
        bindHot(b, k, null, '');
        b.addEventListener('click', () => select(T, k));
        const cb = li.querySelector('input'); if (cb) cb.addEventListener('change', () => toggle(T, k, cb.checked));
      });
      paintHot();
    }
    // The line under the list: the channel under the pointer or focus, else the pinned one, with what it is and where.
    function paintSel() {
      const T = task(), s = st(T), I = info(T), k = s.sel || s.hover, c = k && I.by.get(k), tr = s.sel && s.hover && s.hover !== s.sel ? I.by.get(s.hover) : null;
      if (!c) { selBox.className = 'chp-sel'; selBox.textContent = tipText || 'Point at an electrode, a name or a waveform row to trace it; click or tap to pin.'; return; }
      const pinned = s.sel === k, extra = opts.detail ? opts.detail(k) : '';
      selBox.className = 'chp-sel has-ch' + (pinned ? ' is-pinned' : '');
      selBox.innerHTML = '<b class="mono" style="color:' + c.color + '">' + esc(c.label) + '</b>' + (pinned ? '<span class="chp-pin mono">pinned</span>' : '') +
        '<span class="chp-desc">' + esc(describe(T, k).replace(c.label + ' · ', '')) + (tipText ? ' · ' + esc(tipText) : '') + (extra ? ' · ' + esc(extra) : '') + '</span>' +
        (tr ? '<span class="chp-trace">Tracing <b class="mono" style="color:' + tr.color + '">' + esc(tr.label) + '</b> · ' + esc(describe(T, tr.key).replace(tr.label + ' · ', '')) + '</span>' : '') +
        (pinned ? '<span class="chp-acts">' + (opts.action && c.recorded ? '<button type="button" class="chp-act">' + esc(opts.action.label) + '</button>' : '') + '<button type="button" class="chp-clear">Clear</button></span>' : '');
      const cl = selBox.querySelector('.chp-clear'); if (cl) cl.onclick = () => select(T, null);
      const a = selBox.querySelector('.chp-act'); if (a) a.onclick = () => opts.action.run(c.key);
    }
    function paintHot() {
      const T = task(), any = anyHot(T);
      host.classList.toggle('has-hot', any);
      svg.querySelectorAll('[data-k]').forEach((n) => { const h = hot(T, n.dataset.k); n.classList.toggle('is-hot', !!h); n.classList.toggle('is-sel', h === 'sel'); });
      const I = info(T), hotEl = new Set();
      for (const c of I.list) if (hot(T, c.key)) c.ends.forEach((e) => hotEl.add(e));
      svg.querySelectorAll('[data-e]').forEach((n) => n.classList.toggle('is-hot', hotEl.has(n.dataset.e)));
      list.querySelectorAll('li[data-k]').forEach((li) => { const h = hot(T, li.dataset.k); li.classList.toggle('is-hot', !!h); li.classList.toggle('is-sel', h === 'sel'); li.querySelector('.chp-ch').setAttribute('aria-pressed', String(h === 'sel')); });
      drawLabels(); paintSel();
    }
    host.querySelector('.chp-modes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { setMode(task(), b.dataset.m); host.querySelector('.chp-modes [aria-checked=true]').focus(); } });
    host.querySelector('.chp-modes').addEventListener('keydown', (e) => {
      const order = ['default', 'all', 'custom'], k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
      e.preventDefault(); e.stopPropagation(); setMode(task(), order[(order.indexOf(st(task()).mode) + k + 3) % 3]); host.querySelector('.chp-modes [aria-checked=true]').focus();
    });
    host.querySelector('.chp-reset').addEventListener('click', () => { query = ''; search.value = ''; reset(task()); });
    search.addEventListener('input', () => { query = search.value; build(); });
    const onChange = (e) => { if (e.task !== task()) return; if (e.type === 'shown' || built !== task() + '|' + sig(task()) + '|' + query) build(); else paintHot(); };
    listeners.add(onChange);
    return { render: () => { if (built !== task() + '|' + sig(task()) + '|' + query) build(); else paintHot(); }, rebuild: build, refresh: paintSel };
  }

  root.EEGJevChannels = Object.freeze({ info, state: st, shown, sig, setMode, toggle, reset, select, hover, hot, anyHot, countText, describe, mount, keyOf, on: (f) => { listeners.add(f); return () => listeners.delete(f); } });
  root.EEGJevChannelsQA = (task) => { const I = info(task), s = st(task); return I ? { task, mode: s.mode, input: I.n, recorded: I.nRecorded, defaults: I.defaults.length, shown: shown(task), sel: s.sel, hover: s.hover, group: s.group, withPosition: I.list.filter((c) => c.hasPos).length, order: I.list.map((c) => c.key) } : null; };
})(window);
