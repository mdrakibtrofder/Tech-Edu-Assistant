/* ==========================================================================
   DOM helpers + the SVG icon sprite.
   Plain script (no ES modules) so the site works from file:// as well as http.
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /**
   * el('div.card', { href: '#', 'data-x': 1 }, [child, 'text'])
   * Tag string supports .class and #id shorthand.
   */
  function el(tag, attrs, children) {
    var m = /^([a-z0-9]+)?(#[\w-]+)?((?:\.[\w-]+)*)$/i.exec(tag) || [];
    var node = document.createElement(m[1] || 'div');
    if (m[2]) node.id = m[2].slice(1);
    if (m[3]) node.className = m[3].slice(1).split('.').join(' ');

    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var val = attrs[key];
      if (val === null || val === undefined || val === false) return;
      if (key === 'class') { node.className += (node.className ? ' ' : '') + val; }
      else if (key === 'html') { node.innerHTML = val; }
      else if (key === 'text') { node.textContent = val; }
      else if (key.slice(0, 2) === 'on' && typeof val === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === 'dataset') {
        Object.keys(val).forEach(function (d) { node.dataset[d] = val[d]; });
      } else {
        node.setAttribute(key, val === true ? '' : val);
      }
    });

    append(node, children);
    return node;
  }

  function append(node, children) {
    if (children === null || children === undefined || children === false) return node;
    if (Array.isArray(children)) {
      children.forEach(function (c) { append(node, c); });
      return node;
    }
    node.appendChild(children.nodeType ? children : document.createTextNode(String(children)));
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  function on(target, type, sel, handler) {
    if (typeof sel === 'function') { target.addEventListener(type, sel); return; }
    target.addEventListener(type, function (e) {
      var hit = e.target.closest(sel);
      if (hit && target.contains(hit)) handler.call(hit, e, hit);
    });
  }

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 160);
    };
  }

  /* ---- Icons ------------------------------------------------------------
     Stroke-based 24x24 paths. icon('book') returns an <svg> element.
     Unknown names fall back to 'book' so a missing icon never breaks a page.
  ------------------------------------------------------------------------ */

  var PATHS = {
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    'book-open': 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    terminal: 'M4 17l6-6-6-6M12 19h8',
    cpu: 'M4 4h16v16H4zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3',
    monitor: 'M2 3h20v14H2zM8 21h8M12 17v4',
    database: 'M12 2c4.4 0 8 1.3 8 3v14c0 1.7-3.6 3-8 3s-8-1.3-8-3V5c0-1.7 3.6-3 8-3zM4 5c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    server: 'M2 3h20v7H2zM2 14h20v7H2zM6 6.5h.01M6 17.5h.01',
    network: 'M9 5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM3 19a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM15 19a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM12 8v4M12 12l-6 4M12 12l6 4',
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c2.5 2.7 3.9 6.3 4 10-.1 3.7-1.5 7.3-4 10-2.5-2.7-3.9-6.3-4-10 .1-3.7 1.5-7.3 4-10z',
    shield: 'M12 2l8 4v6c0 5-3.4 9.3-8 10-4.6-.7-8-5-8-10V6z',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4',
    layers: 'M12 2l9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
    cube: 'M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
    puzzle: 'M10 3h4v2.5a1.5 1.5 0 1 0 3 0V3h4v4h-2.5a1.5 1.5 0 1 0 0 3H21v4h-2.5a1.5 1.5 0 1 0 0 3H21v4h-4v-2.5a1.5 1.5 0 1 0-3 0V21h-4v-4H5.5a1.5 1.5 0 1 1 0-3H7v-4H5.5a1.5 1.5 0 1 1 0-3H7V3z',
    wrench: 'M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.8 2.8 0 1 1-4-4z',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a1.7 1.7 0 0 0-1.6-1H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3 8.6a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 3a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 9h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z',
    sigma: 'M18 4H6l6 8-6 8h12',
    calculator: 'M4 2h16v20H4zM8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8',
    function: 'M9 21s0-13 2-16c1-1.5 3-1.5 4 0M7 10h8',
    chart: 'M3 3v18h18M7 15l4-5 3 3 5-7',
    'bar-chart': 'M12 20V10M18 20V4M6 20v-4',
    tree: 'M12 3v6M12 15v6M9 12H4M20 12h-5M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 9v6M20 9v6',
    route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h6',
    automata: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    brain: 'M9.5 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 6 17a3 3 0 0 0 3.5 3V3zM14.5 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 18 17a3 3 0 0 1-3.5 3V3z',
    sparkles: 'M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z',
    image: 'M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    briefcase: 'M2 7h20v14H2zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    scale: 'M12 3v18M7 21h10M6 7l-3 7h6zM18 7l-3 7h6zM3 7h18',
    flag: 'M4 22V4h9l1 2h6v9h-7l-1-2H4',
    flask: 'M9 2h6M10 2v6l-6 11a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-11V2M7.5 14h9',
    clipboard: 'M9 3h6v3H9zM8 4.5H6a1 1 0 0 0-1 1V21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2M9 12h6M9 16h4',
    ruler: 'M3 15l6-12 12 6-6 12zM8 5l2 1M6 9l2 1M11 17l2 1M14 12l2 1',
    kanban: 'M3 3h18v18H3zM9 3v12M15 3v7',
    'check-circle': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 12l3 3 5-6',
    badge: 'M12 2l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 8.2l5.9-.9z',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
    'file-text': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
    note: 'M4 3h16v13l-5 5H4zM15 21v-5h5',
    slides: 'M2 3h20v12H2zM12 15v4M8 21h8',
    play: 'M6 3l14 9-14 9z',
    video: 'M2 5h13v14H2zM15 10l7-4v12l-7-4',
    link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    menu: 'M3 6h18M3 12h18M3 18h18',
    close: 'M18 6L6 18M6 6l12 12',
    chevron: 'M9 18l6-6-6-6',
    'arrow-up': 'M12 19V5M5 12l7-7 7 7',
    'arrow-right': 'M5 12h14M12 5l7 7-7 7',
    dots: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 20 5.1a4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.6 12.6 0 0 0-6.6 0C7 1.2 5.9 1.5 5.9 1.5A4.9 4.9 0 0 0 5.8 5 5.2 5.2 0 0 0 4.4 8.8c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.4 5.1L2 12v6h20v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z',
    alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    check: 'M20 6L9 17l-5-5',
    graduation: 'M22 10L12 5 2 10l10 5zM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
    home: 'M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    filter: 'M22 3H2l8 9.5V19l4 2v-8.5z'
  };

  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (size) { svg.setAttribute('width', size); svg.setAttribute('height', size); }
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', PATHS[name] || PATHS.book);
    svg.appendChild(path);
    return svg;
  }

  TEA.dom = {
    qs: qs, qsa: qsa, el: el, append: append, clear: clear, on: on,
    icon: icon, icons: PATHS, escapeHtml: escapeHtml, debounce: debounce
  };
})(window);
