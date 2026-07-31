/* ==========================================================================
   Shared UI factories: card, badge, breadcrumb, tabs, states, toast,
   resource row, toolbar. Every page builds its markup from these.
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});
  var d = TEA.dom;
  var el = d.el, icon = d.icon;
  var R = TEA.router;

  /* ---- Badge ------------------------------------------------------------ */

  function badge(opts) {
    if (typeof opts === 'string') opts = { label: opts };
    return el('span.badge' + (opts.tone ? '.badge--' + opts.tone : ''), {
      'data-tip': opts.tip || null
    }, [opts.icon ? icon(opts.icon) : null, el('span', { text: opts.label })]);
  }

  /* ---- Card ------------------------------------------------------------- */

  function card(opts) {
    var tag = opts.href ? 'a.card' : (opts.onClick ? 'button.card' : 'div.card');
    if (opts.variant) tag += '.card--' + opts.variant;
    if (opts.className) tag += '.' + opts.className.split(' ').join('.');

    var attrs = { 'data-tip': opts.tip || null, 'data-tip-pos': opts.tip ? 'top' : null };
    if (opts.href) { attrs.href = opts.href; if (opts.external) { attrs.target = '_blank'; attrs.rel = 'noopener'; } }
    if (opts.onClick) { attrs.type = 'button'; attrs.onclick = opts.onClick; }

    var iconNode = null;
    if (opts.number !== undefined && opts.number !== null) {
      iconNode = el('.card__icon', {}, String(opts.number));
    } else if (opts.avatar) {
      iconNode = el('img.person__avatar', { src: opts.avatar, alt: '', loading: 'lazy' });
    } else if (opts.icon) {
      iconNode = el('.card__icon', {}, icon(opts.icon));
    }

    var meta = null;
    if (opts.meta && opts.meta.length) {
      meta = el('.card__meta', {}, opts.meta.filter(Boolean).map(function (m) {
        return m.nodeType ? m : badge(m);
      }));
    }

    return el(tag, attrs, [
      iconNode,
      el('.card__body', {}, [
        el('h3.card__title', { text: opts.title }),
        opts.description ? el('p.card__desc', { text: opts.description }) : null
      ]),
      meta,
      opts.corner ? el('.card__corner', {}, opts.corner) : null
    ]);
  }

  /* ---- Breadcrumb ------------------------------------------------------- */

  function breadcrumb(trail, onLight) {
    return el('nav.breadcrumb' + (onLight ? '.breadcrumb--on-light' : ''), {
      'aria-label': 'Breadcrumb'
    }, el('ol', {}, trail.map(function (item, i) {
      var last = i === trail.length - 1;
      return el('li', {}, last || !item.href
        ? el('span', { 'aria-current': last ? 'page' : null, text: item.label })
        : el('a', { href: item.href, text: item.label }));
    })));
  }

  /* ---- States ----------------------------------------------------------- */

  function state(opts) {
    return el('.state' + (opts.variant ? '.state--' + opts.variant : ''), { role: 'status' }, [
      el('.state__icon', {}, icon(opts.icon || 'inbox')),
      el('h3', { text: opts.title || 'Nothing here yet' }),
      opts.message ? el('p', { text: opts.message }) : null,
      opts.action || null
    ]);
  }

  function skeletonGrid(count) {
    return el('.grid', {}, Array.apply(null, Array(count || 6)).map(function () {
      return el('.skeleton', { style: 'height:168px' });
    }));
  }

  /* ---- Tabs ------------------------------------------------------------- */

  /**
   * tabs(container, [{ id, label, icon, count, render() }])
   * Selected tab is mirrored into the URL hash so it is linkable.
   */
  function tabs(mount, defs) {
    var list = el('.tabs', { role: 'tablist' });
    var panels = el('div');
    var buttons = [];

    defs.forEach(function (def, i) {
      var btn = el('button.tab', {
        type: 'button',
        role: 'tab',
        id: 'tab-' + def.id,
        'aria-controls': 'panel-' + def.id,
        'aria-selected': 'false',
        tabindex: '-1',
        'data-tip': def.tip || null
      }, [
        def.icon ? icon(def.icon) : null,
        el('span', { text: def.label }),
        def.count !== undefined ? el('span.tab__count', { text: String(def.count) }) : null
      ]);

      var panel = el('.tabpanel', {
        role: 'tabpanel',
        id: 'panel-' + def.id,
        'aria-labelledby': 'tab-' + def.id,
        tabindex: '0',
        hidden: true
      });

      btn.addEventListener('click', function () { select(i, true); });
      buttons.push({ btn: btn, panel: panel, def: def, rendered: false });
      list.appendChild(btn);
      panels.appendChild(panel);
    });

    function select(index, focus) {
      buttons.forEach(function (b, i) {
        var active = i === index;
        b.btn.setAttribute('aria-selected', active ? 'true' : 'false');
        b.btn.tabIndex = active ? 0 : -1;
        b.panel.hidden = !active;
        if (active && !b.rendered) {
          b.rendered = true;
          var content = b.def.render();
          if (content) d.append(b.panel, content);
        }
      });
      if (focus) {
        buttons[index].btn.focus();
        R.setHash(defs[index].id);
      }
    }

    list.addEventListener('keydown', function (e) {
      var i = buttons.findIndex(function (b) { return b.btn === document.activeElement; });
      if (i < 0) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % buttons.length, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + buttons.length) % buttons.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      else if (e.key === 'End') { e.preventDefault(); select(buttons.length - 1, true); }
    });

    mount.appendChild(list);
    mount.appendChild(panels);

    var wanted = defs.findIndex(function (def) { return def.id === R.hash(); });
    select(wanted > -1 ? wanted : 0, false);

    return { select: select };
  }

  /* ---- Resource row ----------------------------------------------------- */

  /**
   * A slide/book (local PDF) or a link/video (external URL), rendered
   * identically with a preview action and an options menu.
   */
  function resourceRow(res, context) {
    var isFile = !!res.file;
    var href = res.file || res.url;
    var kind = res.kind || (res.source ? 'link' : 'file');

    var iconName = isFile ? R.kindIcon(res.kind)
      : (res.isVideo ? 'play' : 'link');

    var meta = [];
    if (isFile) {
      meta.push(badge({ label: R.kindLabel(res.kind), tone: R.kindTone(res.kind) }));
      if (res.size) meta.push(el('span', { text: res.size }));
    } else {
      meta.push(badge({ label: res.source || 'Web', tone: res.isVideo ? 'grad' : 'blue', icon: res.isVideo ? 'play' : 'external' }));
      try { meta.push(el('span.truncate', { text: new URL(res.url).hostname.replace(/^www\./, '') })); } catch (e) {}
    }

    var actions = el('.res__actions');

    if (isFile) {
      var previewBtn = el('button.res-btn', {
        type: 'button', 'aria-label': 'Preview ' + res.title, 'data-tip': 'Quick preview'
      }, icon('eye'));
      previewBtn.addEventListener('click', function () {
        TEA.Modal.preview({
          title: res.title, file: res.file, size: res.size,
          kindLabel: R.kindLabel(res.kind), context: context
        });
      });
      actions.appendChild(previewBtn);
    }

    var menuItems = isFile ? [
      { heading: 'Document' },
      { label: 'Quick preview', icon: 'eye', onClick: function () {
          TEA.Modal.preview({ title: res.title, file: res.file, size: res.size, kindLabel: R.kindLabel(res.kind), context: context });
        } },
      { label: 'Open in new tab', icon: 'external', href: href },
      { label: 'Download PDF', icon: 'download', href: href, download: true },
      '---',
      { label: 'Copy link', icon: 'copy', onClick: function () { copyLink(href); } },
      { label: 'Report a problem', icon: 'alert', onClick: function () { report(res, context); } }
    ] : [
      { heading: res.isVideo ? 'Video' : 'Link' },
      { label: 'Open in new tab', icon: 'external', href: href },
      { label: 'Copy link', icon: 'copy', onClick: function () { copyLink(href); } },
      '---',
      { label: 'Report a problem', icon: 'alert', onClick: function () { report(res, context); } }
    ];

    actions.appendChild(TEA.Menu.build(menuItems, { label: 'Options for ' + res.title }));

    return el('.res', {}, [
      el('.res__icon', {}, icon(iconName)),
      el('.res__body', {}, [
        el('a.res__title', {
          href: href,
          target: '_blank',
          rel: 'noopener',
          text: res.title,
          'data-tip': res.title.length > 46 ? res.title : null
        }),
        el('.res__meta', {}, meta)
      ]),
      actions
    ]);
  }

  function copyLink(href) {
    var absolute = href;
    try { absolute = new URL(href, w.location.href).href; } catch (e) {}
    if (w.navigator.clipboard && w.navigator.clipboard.writeText) {
      w.navigator.clipboard.writeText(absolute).then(function () { toast('Link copied to clipboard'); },
        function () { toast('Could not copy link'); });
    } else {
      var ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = absolute;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('Link copied to clipboard'); } catch (e) { toast('Could not copy link'); }
      document.body.removeChild(ta);
    }
  }

  function report(res, context) {
    TEA.Modal.open({
      title: 'Report a problem',
      subtitle: res.title,
      body: el('div.stack', {}, [
        el('p.text-sm', { text: 'Found a broken link, a missing file, or something filed in the wrong place? Let the maintainer know which resource it was.' }),
        el('div.outline-box', {}, [
          el('h3', { text: 'Resource' }),
          el('p', { text: res.title }),
          el('p.text-xs.text-muted', { text: (context ? context + ' · ' : '') + (res.file || res.url) })
        ])
      ]),
      actions: [
        { label: 'Close' },
        { label: 'Copy details', icon: 'copy', variant: 'primary', closes: false, onClick: function () {
            copyLink(res.file || res.url);
          } }
      ]
    });
  }

  /* ---- Toast ------------------------------------------------------------ */

  var toastStack = null;
  function toast(message) {
    if (!toastStack) {
      toastStack = el('.toast-stack', { 'aria-live': 'polite' });
      document.body.appendChild(toastStack);
    }
    var node = el('.toast', {}, [icon('check'), el('span', { text: message })]);
    toastStack.appendChild(node);
    requestAnimationFrame(function () { node.classList.add('is-visible'); });
    setTimeout(function () {
      node.classList.remove('is-visible');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 300);
    }, 2400);
  }

  /* ---- Toolbar ----------------------------------------------------------
     toolbar({ mount, items, render, searchKeys, sorts, filters, storageKey })
     Owns text filtering, sorting, chip filters, view toggle and the result
     count. Every listing page on the site uses it.
  ------------------------------------------------------------------------ */

  function toolbar(cfg) {
    var grid = cfg.grid;
    var storageKey = cfg.storageKey || 'toolbar';
    var st = TEA.store;

    var query = '';
    var sortKey = st.pref(storageKey + ':sort') || (cfg.sorts && cfg.sorts[0].key) || '';
    var view = st.pref(storageKey + ':view') || 'grid';
    var activeFilter = 'all';

    var bar = el('.toolbar', { role: 'search' });

    var input = el('input', {
      type: 'search',
      placeholder: cfg.placeholder || 'Filter...',
      'aria-label': cfg.placeholder || 'Filter results'
    });
    input.addEventListener('input', d.debounce(function () { query = input.value; apply(); }, 140));
    bar.appendChild(el('.field', {}, [icon('search'), input]));

    if (cfg.sorts && cfg.sorts.length) {
      var select = el('select', { 'aria-label': 'Sort by' }, cfg.sorts.map(function (s) {
        return el('option', { value: s.key, text: s.label, selected: s.key === sortKey ? '' : null });
      }));
      select.value = sortKey;
      select.addEventListener('change', function () {
        sortKey = select.value; st.pref(storageKey + ':sort', sortKey); apply();
      });
      bar.appendChild(el('.field.field--select', {}, [icon('filter'), select]));
    }

    var chipNodes = [];
    if (cfg.filters && cfg.filters.length) {
      var chips = el('.chips', { role: 'group', 'aria-label': 'Filter by type' });
      [{ key: 'all', label: 'All' }].concat(cfg.filters).forEach(function (f) {
        var chip = el('button.chip', {
          type: 'button',
          'aria-pressed': f.key === 'all' ? 'true' : 'false',
          'data-key': f.key,
          'data-tip': f.tip || null
        }, [el('span', { text: f.label }), f.count !== undefined ? el('span.chip__count', { text: String(f.count) }) : null]);
        chip.addEventListener('click', function () {
          activeFilter = f.key;
          chipNodes.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.key === f.key ? 'true' : 'false'); });
          apply();
        });
        chipNodes.push(chip);
        chips.appendChild(chip);
      });
      bar.appendChild(chips);
    }

    if (cfg.viewToggle !== false) {
      var gridBtn = el('button', { type: 'button', 'aria-label': 'Grid view', 'aria-pressed': 'false', 'data-tip': 'Grid view' }, icon('grid'));
      var listBtn = el('button', { type: 'button', 'aria-label': 'List view', 'aria-pressed': 'false', 'data-tip': 'List view' }, icon('list'));
      gridBtn.addEventListener('click', function () { setView('grid'); });
      listBtn.addEventListener('click', function () { setView('list'); });
      bar.appendChild(el('.view-toggle', { role: 'group', 'aria-label': 'View mode' }, [gridBtn, listBtn]));

      var setView = function (v) {
        view = v;
        st.pref(storageKey + ':view', v);
        grid.classList.toggle('is-list', v === 'list');
        gridBtn.setAttribute('aria-pressed', v === 'grid' ? 'true' : 'false');
        listBtn.setAttribute('aria-pressed', v === 'list' ? 'true' : 'false');
      };
      setView(view);
    }

    var count = el('span.result-count', { 'aria-live': 'polite' });
    bar.appendChild(count);

    function matches(item) {
      if (activeFilter !== 'all' && cfg.filterFn && !cfg.filterFn(item, activeFilter)) return false;
      if (!query.trim()) return true;
      var hay = (cfg.searchText ? cfg.searchText(item) : item.title || '').toLowerCase();
      return query.toLowerCase().split(/\s+/).every(function (t) { return hay.indexOf(t) > -1; });
    }

    function apply() {
      var list = cfg.items.filter(matches);
      if (sortKey && cfg.sorts) {
        var sorter = cfg.sorts.filter(function (s) { return s.key === sortKey; })[0];
        if (sorter && sorter.fn) list = list.slice().sort(sorter.fn);
      }
      d.clear(grid);
      if (!list.length) {
        grid.appendChild(state({
          icon: 'search',
          title: 'No matches',
          message: 'Nothing matched "' + input.value + '". Try a shorter or different term.'
        }));
      } else {
        list.forEach(function (item) { grid.appendChild(cfg.render(item)); });
      }
      count.textContent = list.length + ' of ' + cfg.items.length;
    }

    cfg.mount.insertBefore(bar, grid);
    apply();
    return { apply: apply, bar: bar };
  }

  TEA.ui = {
    badge: badge, card: card, breadcrumb: breadcrumb, state: state,
    skeletonGrid: skeletonGrid, tabs: tabs, resourceRow: resourceRow,
    toast: toast, toolbar: toolbar, copyLink: copyLink
  };
})(window);
