/* ==========================================================================
   Options menu - the "..." affordance attached to every resource.
   Menu.build([{ label, icon, href, download, onClick }, '---', ...]) -> wrapper
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});
  var d = TEA.dom;
  var el = d.el, icon = d.icon;

  var openMenu = null;

  function closeOpen() {
    if (!openMenu) return;
    openMenu.panel.classList.remove('is-open');
    openMenu.trigger.setAttribute('aria-expanded', 'false');
    openMenu = null;
  }

  function build(items, opts) {
    opts = opts || {};
    var wrap = el('.menu-wrap');

    var trigger = el('button.res-btn', {
      type: 'button',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
      'aria-label': opts.label || 'More options',
      'data-tip': opts.tip || 'More options'
    }, icon('dots'));

    var panel = el('.menu', { role: 'menu' });

    items.forEach(function (item) {
      if (item === '---') { panel.appendChild(el('.menu__sep')); return; }
      if (item && item.heading) { panel.appendChild(el('.menu__label', { text: item.heading })); return; }
      if (!item) return;

      var node;
      if (item.href) {
        node = el('a.menu__item', {
          role: 'menuitem',
          href: item.href,
          target: item.download ? null : (item.sameTab ? null : '_blank'),
          rel: 'noopener',
          download: item.download ? '' : null
        }, [icon(item.icon || 'chevron'), el('span', { text: item.label })]);
      } else {
        node = el('button.menu__item', { type: 'button', role: 'menuitem' },
          [icon(item.icon || 'chevron'), el('span', { text: item.label })]);
      }
      node.addEventListener('click', function (e) {
        if (item.onClick) item.onClick(e);
        closeOpen();
      });
      panel.appendChild(node);
    });

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var wasOpen = openMenu && openMenu.panel === panel;
      closeOpen();
      if (wasOpen) return;

      // flip upwards when close to the bottom of the viewport
      var r = trigger.getBoundingClientRect();
      panel.classList.toggle('menu--up', r.bottom + 260 > w.innerHeight);

      panel.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      openMenu = { panel: panel, trigger: trigger };
      var first = d.qs('.menu__item', panel);
      if (first) first.focus();
    });

    panel.addEventListener('keydown', function (e) {
      var items = d.qsa('.menu__item', panel);
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeOpen(); trigger.focus(); }
      else if (e.key === 'Tab') { closeOpen(); }
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    return wrap;
  }

  function init() {
    document.addEventListener('click', function (e) {
      if (openMenu && !e.target.closest('.menu-wrap')) closeOpen();
    });
    w.addEventListener('scroll', closeOpen, true);
  }

  TEA.Menu = { build: build, init: init, close: closeOpen };
})(window);
