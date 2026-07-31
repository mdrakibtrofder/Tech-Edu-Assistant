/* ==========================================================================
   Shell - header, mobile drawer, theme toggle, footer, scroll progress,
   back-to-top and the global search modal. Injected into every page so the
   navigation exists in exactly one place.
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});
  var d = TEA.dom;
  var el = d.el, icon = d.icon;

  var NAV = [
    { href: 'index.html', label: 'Home', icon: 'home', tip: 'Back to the landing page' },
    { href: 'semesters.html', label: 'Semesters', icon: 'calendar', tip: 'Browse by academic semester' },
    { href: 'subjects.html', label: 'Subjects', icon: 'layers', tip: 'Browse by subject area' },
    { href: 'books.html', label: 'Books', icon: 'book', tip: 'The full PDF library' },
    { href: 'github.html', label: 'GitHub', icon: 'github', tip: 'Student project profiles' },
    { href: 'syllabus.html', label: 'Syllabus', icon: 'clipboard', tip: 'The official IIT curriculum' }
  ];

  function currentPage() {
    var file = w.location.pathname.split('/').pop();
    return file === '' ? 'index.html' : file;
  }

  function brandMark() {
    return el('.brand__mark', {}, icon('graduation'));
  }

  /* ---- Header ----------------------------------------------------------- */

  function header() {
    var page = currentPage();

    var navList = el('ul.site-nav__list', {}, NAV.map(function (item) {
      var active = item.href === page ||
        (page === 'semester.html' && item.href === 'semesters.html') ||
        (page === 'subject.html' && item.href === 'subjects.html') ||
        (page === 'course.html' && item.href === 'semesters.html');
      return el('li', {}, el('a.site-nav__link', {
        href: item.href,
        text: item.label,
        'aria-current': active ? 'page' : null,
        'data-tip': item.tip,
        'data-tip-pos': 'bottom'
      }));
    }));

    var nav = el('nav.site-nav', { id: 'site-nav', 'aria-label': 'Main' }, navList);

    var toggle = el('button.icon-btn.nav-toggle', {
      type: 'button',
      'aria-label': 'Open menu',
      'aria-expanded': 'false',
      'aria-controls': 'site-nav'
    }, icon('menu'));

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      d.clear(toggle).appendChild(icon(open ? 'close' : 'menu'));
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.target.closest('.site-nav') || e.target.closest('.nav-toggle')) return;
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      d.clear(toggle).appendChild(icon('menu'));
    });

    var searchBtn = el('button.search-trigger', {
      type: 'button', 'aria-label': 'Search all resources', 'data-tip': 'Search everything', 'data-tip-pos': 'bottom'
    }, [
      icon('search'),
      el('span.search-trigger__label', { text: 'Search' }),
      el('kbd', { text: isMac() ? '⌘K' : 'Ctrl K' })
    ]);
    searchBtn.addEventListener('click', openSearch);

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var themeBtn = el('button.icon-btn', {
      type: 'button',
      'aria-label': 'Toggle dark mode',
      'data-tip': 'Toggle light / dark',
      'data-tip-pos': 'bottom'
    }, icon(isDark ? 'sun' : 'moon'));
    themeBtn.addEventListener('click', function () {
      var mode = TEA.router.toggleTheme();
      d.clear(themeBtn).appendChild(icon(mode === 'dark' ? 'sun' : 'moon'));
    });

    return el('header.site-header', {}, el('.container', {}, el('.site-header__inner', {}, [
      el('a.brand', { href: 'index.html' }, [
        brandMark(),
        el('.brand__text', {}, [
          el('span', { text: 'Tech Edu' }),
          el('small', { text: 'Assistant' })
        ])
      ]),
      nav,
      el('.header-actions', {}, [searchBtn, themeBtn, toggle])
    ])));
  }

  /* ---- Footer ----------------------------------------------------------- */

  function footer() {
    var t = TEA.store.totals();

    return el('footer.site-footer', {}, el('.container', {}, [
      el('.site-footer__grid', {}, [
        el('.site-footer__brand', {}, [
          el('a.brand', { href: 'index.html' }, [
            brandMark(),
            el('.brand__text', {}, [el('span', { text: 'Tech Edu' }), el('small', { text: 'Assistant' })])
          ]),
          el('p', { text: 'A curated resource library for the Computer Science and Software Engineering curriculum - lecture slides, reference books, video tutorials and hand-picked links, organised by semester and subject.' })
        ]),
        el('div', {}, [
          el('h4', { text: 'Browse' }),
          el('ul', {}, NAV.slice(1).map(function (item) {
            return el('li', {}, el('a', { href: item.href, text: item.label }));
          }))
        ]),
        el('div', {}, [
          el('h4', { text: 'Library' }),
          el('ul.footer-stats', {}, [
            el('li', {}, [el('strong', { text: String(t.courses) }), el('span', { text: 'courses' })]),
            el('li', {}, [el('strong', { text: String(t.documents) }), el('span', { text: 'documents' })]),
            el('li', {}, [el('strong', { text: String(t.videos) }), el('span', { text: 'videos' })]),
            el('li', {}, [el('strong', { text: String(t.links) }), el('span', { text: 'links' })])
          ])
        ])
      ]),
      el('.site-footer__bottom', {}, [
        el('span', { text: '© ' + new Date().getFullYear() + ' Tech Edu Assistant' }),
        el('span.text-xs', { text: 'Built as a static site - no tracking, no dependencies.' })
      ])
    ]));
  }

  /* ---- Global search modal ---------------------------------------------- */

  var searchHandle = null;

  function openSearch() {
    if (searchHandle) return;

    var input = el('input', {
      type: 'search',
      placeholder: 'Search courses, topics, documents, books...',
      'aria-label': 'Search all resources',
      autocomplete: 'off',
      spellcheck: 'false'
    });

    var results = el('.search-results', { role: 'listbox', 'aria-label': 'Search results' });
    var activeIndex = -1;
    var hits = [];

    function renderInitial() {
      d.clear(results);
      results.appendChild(el('.search-group__label', { text: 'Jump to' }));
      NAV.slice(1).forEach(function (item) {
        results.appendChild(hitNode({ title: item.label, sub: item.tip, icon: item.icon, href: item.href }));
      });
    }

    function hitNode(hit) {
      var node = el(hit.external ? 'a.search-hit' : 'a.search-hit', {
        href: hit.href,
        target: hit.external ? '_blank' : null,
        rel: hit.external ? 'noopener' : null,
        role: 'option'
      }, [
        el('.search-hit__icon', {}, icon(hit.icon || 'file')),
        el('.search-hit__text', {}, [
          el('span.search-hit__title', { text: hit.title }),
          el('span.search-hit__sub', { text: hit.sub || '' })
        ]),
        hit.type ? TEA.ui.badge({ label: hit.type, tone: 'muted' }) : null
      ]);
      return node;
    }

    function run() {
      var q = input.value.trim();
      if (q.length < 2) { hits = []; activeIndex = -1; renderInitial(); return; }
      hits = TEA.store.search(q, 30);
      d.clear(results);
      if (!hits.length) {
        results.appendChild(TEA.ui.state({
          icon: 'search', title: 'No results',
          message: 'Nothing matched "' + q + '".'
        }));
        return;
      }
      var lastType = null;
      hits.forEach(function (hit) {
        if (hit.type !== lastType) {
          results.appendChild(el('.search-group__label', { text: hit.type + 's' }));
          lastType = hit.type;
        }
        results.appendChild(hitNode(hit));
      });
      activeIndex = -1;
    }

    function move(delta) {
      var nodes = d.qsa('.search-hit', results);
      if (!nodes.length) return;
      if (activeIndex > -1 && nodes[activeIndex]) nodes[activeIndex].classList.remove('is-active');
      activeIndex = (activeIndex + delta + nodes.length) % nodes.length;
      nodes[activeIndex].classList.add('is-active');
      nodes[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', d.debounce(run, 120));
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        var nodes = d.qsa('.search-hit', results);
        if (activeIndex > -1 && nodes[activeIndex]) { e.preventDefault(); nodes[activeIndex].click(); }
      }
    });

    renderInitial();

    searchHandle = TEA.Modal.open({
      title: false,
      size: 'lg',
      flush: true,
      autofocus: 'input',
      body: el('div', {}, [
        el('.search-box', {}, input),
        results,
        el('.search-foot', {}, [
          el('span', {}, [el('kbd', { text: '↑↓' }), ' navigate']),
          el('span', {}, [el('kbd', { text: '↵' }), ' open']),
          el('span', {}, [el('kbd', { text: 'Esc' }), ' close']),
          el('span.ml-auto', { text: TEA.store.totals().resources + ' resources indexed' })
        ])
      ]),
      onClose: function () { searchHandle = null; }
    });
  }

  function isMac() {
    return /Mac|iPhone|iPad/.test(w.navigator.platform || w.navigator.userAgent);
  }

  /* ---- Keyboard shortcuts ----------------------------------------------- */

  function shortcutsModal() {
    var rows = [
      ['⌘ K / Ctrl K', 'Open search'],
      ['/', 'Open search'],
      ['g then h', 'Go home'],
      ['g then s', 'Go to semesters'],
      ['g then b', 'Go to books'],
      ['t', 'Toggle light / dark theme'],
      ['Esc', 'Close any dialog'],
      ['?', 'Show this list']
    ];
    TEA.Modal.open({
      title: 'Keyboard shortcuts',
      body: el('.stack.stack--sm', {}, rows.map(function (r) {
        return el('.flex.items-center.justify-between', {}, [
          el('span.text-sm', { text: r[1] }),
          el('kbd', { text: r[0] })
        ]);
      }))
    });
  }

  function bindShortcuts() {
    var pending = null;
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); openSearch(); return;
      }
      if (typing) return;

      if (e.key === '/') { e.preventDefault(); openSearch(); return; }
      if (e.key === '?') { e.preventDefault(); shortcutsModal(); return; }
      if (e.key === 't') {
        var mode = TEA.router.toggleTheme();
        TEA.ui.toast(mode === 'dark' ? 'Dark theme on' : 'Light theme on');
        return;
      }
      if (e.key === 'g') { pending = setTimeout(function () { pending = null; }, 900); w.__teaGoto = true; return; }
      if (w.__teaGoto) {
        w.__teaGoto = false;
        clearTimeout(pending);
        var map = { h: 'index.html', s: 'semesters.html', b: 'books.html', u: 'subjects.html' };
        if (map[e.key]) w.location.href = map[e.key];
      }
    });
  }

  /* ---- Chrome: scroll progress + back to top ---------------------------- */

  function chrome() {
    var progress = el('.scroll-progress', { role: 'presentation' });
    var toTop = el('button.to-top', { type: 'button', 'aria-label': 'Back to top', 'data-tip': 'Back to top', 'data-tip-pos': 'left' }, icon('arrow-up'));
    toTop.addEventListener('click', function () { w.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(progress);
    document.body.appendChild(toTop);

    var header = d.qs('.site-header');
    var ticking = false;
    function update() {
      var y = w.pageYOffset;
      var max = document.documentElement.scrollHeight - w.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      toTop.classList.toggle('is-visible', y > 400);
      if (header) header.classList.toggle('is-stuck', y > 8);
      ticking = false;
    }
    w.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---- Boot ------------------------------------------------------------- */

  function init() {
    var headerMount = d.qs('#app-header');
    if (headerMount) headerMount.replaceWith(header());

    var footerMount = d.qs('#app-footer');
    if (footerMount) footerMount.replaceWith(footer());

    TEA.Tooltip.init();
    TEA.Menu.init();
    bindShortcuts();
    chrome();

    // smooth in-page anchors
    d.on(document, 'click', 'a[href^="#"]:not([href="#"])', function (e, node) {
      var target = d.qs(node.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  TEA.shell = { init: init, openSearch: openSearch, nav: NAV };
})(window);
