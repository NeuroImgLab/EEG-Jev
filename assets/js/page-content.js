/* Paper block and method figure: everything here comes from data/site-config.js.
   An entry without an address is shown as not available yet, never as a dead link. */
(function () {
  'use strict';
  const P = window.EEGJevSite, $ = (s) => document.getElementById(s);
  if (!P || !$('res-btns')) return;
  if (P.title) $('res-title').textContent = P.title;
  const box = $('res-btns'), notes = [];
  const ICON = { doc: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h6.5L15 6v11.5H5z M11.5 2.5V6H15 M7.5 10h5 M7.5 13h5"/></svg>', code: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 6l-4 4 4 4 M13 6l4 4-4 4 M11.3 4.5l-2.6 11"/></svg>' };
  const fill = (e, icon, label, tag) => { e.innerHTML = ICON[icon]; e.append(label); if (tag) { const t = document.createElement('span'); t.className = 'res-tag mono'; t.textContent = tag; e.append(' ', t); } return e; };
  const link = (cls, icon, label, href, tag, id) => { const a = document.createElement('a'); a.className = 'res-btn ' + cls; a.href = href; a.id = id; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } return fill(a, icon, label, tag); };
  const off = (icon, label, tag, id, why) => { const b = fill(document.createElement('span'), icon, label, tag); b.className = 'res-btn is-off'; b.id = id; b.setAttribute('role', 'link'); b.setAttribute('aria-disabled', 'true'); b.title = why || 'Not available yet'; return b; };

  // Paper: the arXiv record once it exists, otherwise the reading copy inside the site, otherwise a plain "in preparation".
  const pp = P.paper || {};
  if (pp.arxiv) box.append(link('res-primary', 'doc', pp.label || 'Paper', pp.arxiv, pp.tag_arxiv || 'arXiv', 'res-paper'));
  else if (pp.pdf) { box.append(link('res-primary', 'doc', pp.label || 'Paper', pp.pdf, pp.tag_pdf || 'PDF', 'res-paper')); if (pp.note_pdf) notes.push(pp.note_pdf); }
  else { box.append(off('doc', pp.label || 'Paper', pp.pending || 'In preparation', 'res-paper', pp.note_pending)); if (pp.note_pending) notes.push(pp.note_pending); }
  // Code: a link only when the repository address is set.
  const cd = P.code || {};
  if (cd.href) box.append(link('', 'code', cd.label || 'GitHub', cd.href, null, 'res-code'));
  else { box.append(off('code', cd.label || 'GitHub', cd.pending || 'Not yet public', 'res-code', cd.note_pending)); if (cd.note_pending) notes.push(cd.note_pending); }
  $('res-note').textContent = notes.join(' ');

  // Abstract of the manuscript.
  const ab = $('res-abs'), paras = (P.abstract_html || []).filter(Boolean);
  if (ab && paras.length) { $('res-abs-body').innerHTML = paras.map((x) => '<p>' + x + '</p>').join(''); ab.hidden = false;  }

  // NeuralBench entry and the scope sentence.
  const B = P.benchmark || {};
  if (B.href) $('res-bench').href = B.href;
  if ($('res-scope-text')) $('res-scope-text').textContent = '21 sources follow NeuralBench protocols; 14 use supplementary protocols.';
  // Scope numbers from the material, when it is there (the text in the page is the fallback).
  const M = window.EEGJevData;
  if (M && M.init) M.init().then((man) => { const o = man && man.overview; if (!o) return; $('res-apps').textContent = o.applications; $('res-srcs').textContent = o.sources; }).catch(() => {});

  // Method figure: shown only when the figure file is named.
  const F = P.figure || {}, fig = $('how-fig');
  if (fig && F.src) {
    const img = fig.querySelector('img');
    fig.querySelectorAll('a').forEach((a) => { a.href = F.full || F.src; });
    img.src = F.src; if (F.alt) img.alt = F.alt; if (F.width) img.width = F.width; if (F.height) img.height = F.height;
    $('fig-label').textContent = 'Model architecture';
    $('fig-caption').textContent = 'A shared EEG–language backbone with Choice, Noul and Score readouts.';
    fig.hidden = false;
  }
})();
