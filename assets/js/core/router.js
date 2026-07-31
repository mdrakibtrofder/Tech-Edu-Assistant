/* ==========================================================================
   Router - query-string reading, formatting helpers, theme handling.
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});

  function param(name, fallback) {
    var v = new URLSearchParams(w.location.search).get(name);
    return v === null || v === '' ? (fallback === undefined ? null : fallback) : v;
  }

  function setHash(value) {
    if (w.history && w.history.replaceState) {
      w.history.replaceState(null, '', value ? '#' + value : w.location.pathname + w.location.search);
    } else {
      w.location.hash = value || '';
    }
  }

  function hash() { return (w.location.hash || '').replace(/^#/, ''); }

  var ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  function ordinal(n) { return ORDINALS[n] || n + 'th'; }

  var KIND_LABEL = {
    book: 'Book', slide: 'Slides', note: 'Notes',
    lecture: 'Lecture', syllabus: 'Syllabus', paper: 'Paper'
  };
  var KIND_ICON = {
    book: 'book', slide: 'slides', note: 'note',
    lecture: 'file-text', syllabus: 'clipboard', paper: 'file-text'
  };
  var KIND_TONE = {
    book: 'green', slide: 'blue', note: 'amber',
    lecture: 'blue', syllabus: 'grad', paper: 'muted'
  };

  function kindLabel(k) { return KIND_LABEL[k] || 'Document'; }
  function kindIcon(k) { return KIND_ICON[k] || 'file'; }
  function kindTone(k) { return KIND_TONE[k] || 'muted'; }

  /* ---- Theme ------------------------------------------------------------ */

  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#111827' : '#2563eb');
  }

  function initTheme() {
    var saved = null;
    try { saved = w.localStorage.getItem('tea:theme'); } catch (e) {}
    if (!saved) {
      saved = w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(saved);
    return saved;
  }

  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { w.localStorage.setItem('tea:theme', next); } catch (e) {}
    return next;
  }

  TEA.router = {
    param: param, setHash: setHash, hash: hash, ordinal: ordinal,
    kindLabel: kindLabel, kindIcon: kindIcon, kindTone: kindTone,
    initTheme: initTheme, toggleTheme: toggleTheme, applyTheme: applyTheme
  };

  // apply the theme before first paint to avoid a flash
  initTheme();
})(window);
