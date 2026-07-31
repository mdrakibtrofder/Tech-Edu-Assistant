/* ==========================================================================
   Tooltip service - declarative and global.

       <button data-tip="Download the PDF" data-tip-pos="top">

   Works on hover AND keyboard focus, auto-flips near viewport edges, and
   wires aria-describedby so screen readers announce it.
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});
  var d = TEA.dom;

  var node = null;
  var current = null;
  var showTimer = null;
  var hideTimer = null;
  var SHOW_DELAY = 380;
  var idSeed = 0;

  function ensure() {
    if (node) return node;
    node = d.el('.tooltip', { role: 'tooltip', id: 'tea-tooltip' });
    document.body.appendChild(node);
    return node;
  }

  function place(target, preferred) {
    var tip = ensure();
    var r = target.getBoundingClientRect();
    var t = tip.getBoundingClientRect();
    var gap = 9;
    var pos = preferred || 'top';
    var vw = w.innerWidth, vh = w.innerHeight;

    // flip if there is not enough room
    if (pos === 'top' && r.top - t.height - gap < 4) pos = 'bottom';
    else if (pos === 'bottom' && r.bottom + t.height + gap > vh - 4) pos = 'top';
    else if (pos === 'left' && r.left - t.width - gap < 4) pos = 'right';
    else if (pos === 'right' && r.right + t.width + gap > vw - 4) pos = 'left';

    var top, left;
    if (pos === 'top') { top = r.top - t.height - gap; left = r.left + r.width / 2 - t.width / 2; }
    else if (pos === 'bottom') { top = r.bottom + gap; left = r.left + r.width / 2 - t.width / 2; }
    else if (pos === 'left') { top = r.top + r.height / 2 - t.height / 2; left = r.left - t.width - gap; }
    else { top = r.top + r.height / 2 - t.height / 2; left = r.right + gap; }

    var clampedLeft = Math.max(6, Math.min(left, vw - t.width - 6));
    if (pos === 'top' || pos === 'bottom') {
      var centre = r.left + r.width / 2 - clampedLeft;
      tip.style.setProperty('--arrow-x', Math.max(10, Math.min(centre, t.width - 10)) + 'px');
    } else {
      tip.style.removeProperty('--arrow-x');
    }

    tip.dataset.pos = pos;
    tip.style.top = Math.max(6, Math.min(top, vh - t.height - 6)) + 'px';
    tip.style.left = clampedLeft + 'px';
  }

  function show(target) {
    var text = target.getAttribute('data-tip');
    if (!text) return;
    var tip = ensure();
    tip.textContent = text;
    tip.style.visibility = 'hidden';
    tip.classList.add('is-visible');
    // measure, then position
    requestAnimationFrame(function () {
      place(target, target.getAttribute('data-tip-pos'));
      tip.style.visibility = '';
    });

    if (!target.id) target.id = 'tea-tip-' + (++idSeed);
    target.setAttribute('aria-describedby', 'tea-tooltip');
    current = target;
  }

  function hide() {
    if (node) node.classList.remove('is-visible');
    if (current) current.removeAttribute('aria-describedby');
    current = null;
  }

  function enter(e) {
    var target = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!target || target === current) return;
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(function () { show(target); }, SHOW_DELAY);
  }

  function leave(e) {
    var target = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!target) return;
    clearTimeout(showTimer);
    hideTimer = setTimeout(hide, 90);
  }

  function init() {
    document.addEventListener('mouseover', enter);
    document.addEventListener('mouseout', leave);
    document.addEventListener('focusin', function (e) {
      var target = e.target.closest ? e.target.closest('[data-tip]') : null;
      if (target) { clearTimeout(showTimer); show(target); }
    });
    document.addEventListener('focusout', function () { clearTimeout(showTimer); hide(); });
    w.addEventListener('scroll', hide, true);
    w.addEventListener('resize', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  }

  TEA.Tooltip = { init: init, hide: hide };
})(window);
