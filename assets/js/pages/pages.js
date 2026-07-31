/* ==========================================================================
   Page controllers. Each page includes this file and calls TEA.pages.<name>().
   All markup comes from the shared factories in ui.js - no page writes its
   own card, badge, tab or modal.
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});
  var d = TEA.dom, ui = TEA.ui, st = TEA.store, R = TEA.router;
  var el = d.el, icon = d.icon;

  function mount(id) { return d.qs('#' + id); }

  function courseHref(slug) { return 'course.html?c=' + encodeURIComponent(slug); }

  /* ---- Shared: a course card -------------------------------------------- */

  function courseCard(c) {
    var meta = [];
    if (c.slides.length) meta.push({ label: c.slides.length + ' slides', tone: 'blue', icon: 'slides' });
    if (c.videos.length) meta.push({ label: c.videos.length + ' videos', tone: 'grad', icon: 'play' });
    if (c.links.length) meta.push({ label: c.links.length + ' links', tone: 'green', icon: 'link' });
    if (!meta.length) meta.push({ label: 'Outline only', tone: 'muted' });

    return ui.card({
      href: courseHref(c.slug),
      icon: c.icon,
      title: c.title,
      description: c.description || c.outline || 'Course materials and references.',
      meta: meta,
      tip: c.outline ? c.outline.slice(0, 150) + (c.outline.length > 150 ? '...' : '') : null,
      corner: c.semester ? ui.badge({ label: 'Sem ' + c.semester, tone: 'muted' }) : null
    });
  }

  /* ======================================================================
     Home
     ====================================================================== */

  function home() {
    var t = st.totals();

    var stats = mount('stats');
    if (stats) {
      [
        { value: t.courses, label: 'Courses', tip: 'Across all eight semesters' },
        { value: t.documents, label: 'Documents', tip: 'Lecture slides, books and notes as PDF' },
        { value: t.videos, label: 'Video tutorials', tip: 'Curated external video lectures' },
        { value: t.links, label: 'Reference links', tip: 'Hand-picked articles and tutorials' }
      ].forEach(function (s) {
        stats.appendChild(el('.stat', { 'data-tip': s.tip }, [
          el('span.stat__value', { text: String(s.value) }),
          el('span.stat__label', { text: s.label })
        ]));
      });
    }

    var quick = mount('quick-access');
    if (quick) {
      [
        { href: 'semesters.html', icon: 'calendar', title: 'Semesters', desc: 'Eight semesters, each with its full course list and materials.', tip: t.semesters + ' semesters' },
        { href: 'subjects.html', icon: 'layers', title: 'Subjects', desc: 'The same courses regrouped by theme - programming, maths, SE and more.', tip: t.groups + ' subject areas' },
        { href: 'books.html', icon: 'book', title: 'Books', desc: 'The complete PDF library in one searchable place.', tip: t.books + ' curated books' },
        { href: 'github.html', icon: 'github', title: 'GitHub', desc: 'Student project repositories from the BSSE batch.', tip: t.people + ' profiles' },
        { href: 'syllabus.html', icon: 'clipboard', title: 'Syllabus', desc: 'The official IIT curriculum document.', tip: 'Read or download the PDF' }
      ].forEach(function (c) {
        quick.appendChild(ui.card({
          href: c.href, icon: c.icon, title: c.title, description: c.desc, tip: c.tip
        }));
      });
    }

    var recent = mount('rich-courses');
    if (recent) {
      st.courses.slice()
        .sort(function (a, b) { return st.resourceCount(b) - st.resourceCount(a); })
        .slice(0, 6)
        .forEach(function (c) { recent.appendChild(courseCard(c)); });
    }

    var searchCta = d.qs('[data-action="search"]');
    if (searchCta) searchCta.addEventListener('click', function (e) { e.preventDefault(); TEA.shell.openSearch(); });
  }

  /* ======================================================================
     Semesters index
     ====================================================================== */

  function semesters() {
    var grid = mount('grid');
    if (!grid) return;

    var items = st.semesters.map(function (s) {
      var list = st.semesterCourses(s.number);
      return {
        number: s.number,
        year: s.year,
        title: R.ordinal(s.number) + ' Semester',
        courses: list,
        docs: list.reduce(function (n, c) { return n + c.slides.length; }, 0)
      };
    });

    ui.toolbar({
      mount: grid.parentNode,
      grid: grid,
      items: items,
      storageKey: 'semesters',
      placeholder: 'Filter semesters or course names...',
      searchText: function (s) {
        return s.title + ' ' + s.courses.map(function (c) { return c.title; }).join(' ');
      },
      filters: [
        { key: '1', label: 'Year 1' }, { key: '2', label: 'Year 2' },
        { key: '3', label: 'Year 3' }, { key: '4', label: 'Year 4' }
      ],
      filterFn: function (s, key) { return String(s.year) === key; },
      sorts: [
        { key: 'order', label: 'Semester order', fn: function (a, b) { return a.number - b.number; } },
        { key: 'most', label: 'Most materials', fn: function (a, b) { return b.docs - a.docs; } }
      ],
      render: function (s) {
        return ui.card({
          href: 'semester.html?s=' + s.number,
          number: s.number,
          variant: 'numbered',
          title: s.title,
          description: s.courses.length
            ? s.courses.map(function (c) { return c.title; }).join(' · ')
            : 'Course list coming soon.',
          meta: [
            { label: s.courses.length + ' courses', tone: 'blue', icon: 'book' },
            { label: s.docs + ' documents', tone: 'green', icon: 'file-text' }
          ],
          tip: 'Year ' + s.year + ' · ' + s.courses.length + ' courses'
        });
      }
    });
  }

  /* ======================================================================
     One semester
     ====================================================================== */

  function semester() {
    var num = Number(R.param('s', 1));
    var s = st.getSemester(num);
    var list = st.semesterCourses(num);
    var head = mount('page-head'), grid = mount('grid');

    if (!s && !list.length) return notFound(head, grid, 'Semester ' + num + ' was not found.');

    document.title = R.ordinal(num) + ' Semester · Tech Edu Assistant';

    var docs = list.reduce(function (n, c) { return n + c.slides.length; }, 0);
    var vids = list.reduce(function (n, c) { return n + c.videos.length; }, 0);

    d.append(head, [
      ui.breadcrumb([
        { label: 'Home', href: 'index.html' },
        { label: 'Semesters', href: 'semesters.html' },
        { label: R.ordinal(num) + ' Semester' }
      ]),
      el('h1', { text: R.ordinal(num) + ' Semester' }),
      el('p', { text: 'Year ' + Math.ceil(num / 2) + ' of the programme. Every course below carries its outline, lecture slides, video tutorials and reference links.' }),
      el('.page-head__meta', {}, [
        ui.badge({ label: list.length + ' courses', tone: 'grad', icon: 'book' }),
        ui.badge({ label: docs + ' documents', tone: 'grad', icon: 'file-text' }),
        ui.badge({ label: vids + ' videos', tone: 'grad', icon: 'play' })
      ])
    ]);

    if (!list.length) {
      grid.appendChild(ui.state({ title: 'No courses recorded', message: 'This semester has no course entries yet.' }));
      return;
    }

    ui.toolbar({
      mount: grid.parentNode,
      grid: grid,
      items: list,
      storageKey: 'semester',
      placeholder: 'Filter courses in this semester...',
      searchText: function (c) { return c.title + ' ' + (c.outline || ''); },
      filters: [
        { key: 'slides', label: 'Has slides' },
        { key: 'videos', label: 'Has videos' },
        { key: 'links', label: 'Has links' }
      ],
      filterFn: function (c, key) { return (c[key] || []).length > 0; },
      sorts: [
        { key: 'az', label: 'A - Z', fn: function (a, b) { return a.title.localeCompare(b.title); } },
        { key: 'most', label: 'Most materials', fn: function (a, b) { return st.resourceCount(b) - st.resourceCount(a); } }
      ],
      render: courseCard
    });
  }

  /* ======================================================================
     Subjects index
     ====================================================================== */

  function subjects() {
    var grid = mount('grid');
    if (!grid) return;

    var items = st.groups.map(function (g) {
      var list = st.groupCourses(g.slug);
      return { group: g, courses: list, docs: list.reduce(function (n, c) { return n + c.slides.length; }, 0) };
    });

    ui.toolbar({
      mount: grid.parentNode,
      grid: grid,
      items: items,
      storageKey: 'subjects',
      viewToggle: true,
      placeholder: 'Filter subject areas...',
      searchText: function (i) {
        return i.group.title + ' ' + i.group.description + ' ' + i.courses.map(function (c) { return c.title; }).join(' ');
      },
      sorts: [
        { key: 'az', label: 'A - Z', fn: function (a, b) { return a.group.title.localeCompare(b.group.title); } },
        { key: 'most', label: 'Most courses', fn: function (a, b) { return b.courses.length - a.courses.length; } }
      ],
      render: function (i) {
        return ui.card({
          href: 'subject.html?g=' + encodeURIComponent(i.group.slug),
          icon: i.group.icon,
          title: i.group.title,
          description: i.group.description || i.courses.map(function (c) { return c.title; }).join(' · '),
          meta: [
            { label: i.courses.length + ' courses', tone: 'blue', icon: 'book' },
            { label: i.docs + ' documents', tone: 'green', icon: 'file-text' }
          ],
          tip: i.courses.map(function (c) { return c.title; }).join(', ')
        });
      }
    });
  }

  /* ======================================================================
     One subject group
     ====================================================================== */

  function subject() {
    var slug = R.param('g', '');
    var g = st.getGroup(slug);
    var head = mount('page-head'), grid = mount('grid');

    if (!g) return notFound(head, grid, 'That subject area was not found.');

    document.title = g.title + ' · Tech Edu Assistant';
    var list = st.groupCourses(slug);
    var docs = list.reduce(function (n, c) { return n + c.slides.length; }, 0);

    d.append(head, [
      ui.breadcrumb([
        { label: 'Home', href: 'index.html' },
        { label: 'Subjects', href: 'subjects.html' },
        { label: g.title }
      ]),
      el('h1', { text: g.title }),
      el('p', { text: g.description || 'Courses grouped under this subject area.' }),
      el('.page-head__meta', {}, [
        ui.badge({ label: list.length + ' courses', tone: 'grad', icon: 'book' }),
        ui.badge({ label: docs + ' documents', tone: 'grad', icon: 'file-text' })
      ])
    ]);

    if (!list.length) {
      grid.appendChild(ui.state({ title: 'No courses in this area yet' }));
      return;
    }

    ui.toolbar({
      mount: grid.parentNode,
      grid: grid,
      items: list,
      storageKey: 'subject',
      placeholder: 'Filter courses...',
      searchText: function (c) { return c.title + ' ' + (c.outline || ''); },
      sorts: [
        { key: 'sem', label: 'By semester', fn: function (a, b) { return (a.semester || 99) - (b.semester || 99); } },
        { key: 'az', label: 'A - Z', fn: function (a, b) { return a.title.localeCompare(b.title); } }
      ],
      render: courseCard
    });
  }

  /* ======================================================================
     Course - the tabbed detail page
     ====================================================================== */

  function course() {
    var slug = R.param('c', '');
    var c = st.getCourse(slug);
    var head = mount('page-head'), body = mount('course-body');

    if (!c) return notFound(head, body, 'That course was not found.');

    document.title = c.title + ' · Tech Edu Assistant';

    var trail = [{ label: 'Home', href: 'index.html' }];
    if (c.semester) {
      trail.push({ label: 'Semesters', href: 'semesters.html' });
      trail.push({ label: R.ordinal(c.semester) + ' Semester', href: 'semester.html?s=' + c.semester });
    }
    trail.push({ label: c.title });

    var meta = [];
    if (c.semester) meta.push(ui.badge({ label: R.ordinal(c.semester) + ' Semester', tone: 'grad', icon: 'calendar' }));
    (c.groups || []).forEach(function (gslug) {
      var g = st.getGroup(gslug);
      if (g) meta.push(ui.badge({ label: g.title, tone: 'grad', icon: g.icon, tip: 'Subject area' }));
    });

    d.append(head, [
      ui.breadcrumb(trail),
      el('h1', { text: c.title }),
      c.outline ? el('p', { text: truncate(c.outline, 210) }) : null,
      meta.length ? el('.page-head__meta', {}, meta) : null
    ]);

    if (c.outline) {
      body.appendChild(el('.outline-box', {}, [
        el('h3', { text: 'Course outline' }),
        el('p', { text: c.outline })
      ]));
    }

    var defs = [
      {
        id: 'topics', label: 'Topics', icon: 'list', count: c.topics.length,
        tip: 'What this course covers',
        render: function () {
          if (!c.topics.length) {
            return ui.state({
              icon: 'list', title: 'No topic breakdown yet',
              message: c.outline
                ? 'This course has an outline but it has not been split into individual topics.'
                : 'No outline has been recorded for this course.'
            });
          }
          return el('ul.topics', {}, c.topics.map(function (t) {
            return el('li', {}, el('span.topic', {
              text: t, 'data-tip': t.length > 60 ? t : null
            }));
          }));
        }
      },
      {
        id: 'slides', label: 'Slides & Books', icon: 'file-text', count: c.slides.length,
        tip: 'Downloadable PDFs',
        render: function () { return resourceSection(c.slides, c.title, 'slides'); }
      },
      {
        id: 'videos', label: 'Videos', icon: 'play', count: c.videos.length,
        tip: 'External video tutorials',
        render: function () {
          return resourceSection(c.videos.map(function (v) {
            var copy = {}; for (var k in v) copy[k] = v[k];
            copy.isVideo = true;
            return copy;
          }), c.title, 'videos');
        }
      },
      {
        id: 'links', label: 'Links', icon: 'link', count: c.links.length,
        tip: 'Articles and reference sites',
        render: function () { return resourceSection(c.links, c.title, 'links'); }
      }
    ];

    var tabHost = el('div');
    body.appendChild(tabHost);
    ui.tabs(tabHost, defs);

    if (c.related && c.related.length) {
      body.appendChild(el('.divider'));
      body.appendChild(el('h2', { text: 'Related', style: 'font-size:var(--fs-lg)' }));
      body.appendChild(el('.grid', {}, c.related.map(function (r) {
        return ui.card({ href: r.href, icon: r.icon || 'external', title: r.label, description: 'Open the related page.' });
      })));
    }

    // sibling courses in the same semester
    if (c.semester) {
      var siblings = st.semesterCourses(c.semester).filter(function (x) { return x.slug !== c.slug; });
      if (siblings.length) {
        body.appendChild(el('.divider'));
        body.appendChild(el('h2', { text: 'Also in ' + R.ordinal(c.semester) + ' Semester', style: 'font-size:var(--fs-lg)' }));
        body.appendChild(el('.grid', {}, siblings.slice(0, 6).map(courseCard)));
      }
    }
  }

  function resourceSection(items, contextTitle, kind) {
    if (!items.length) {
      var messages = {
        slides: 'No lecture slides or books have been added for this course yet.',
        videos: 'No video tutorials have been added for this course yet.',
        links: 'No reference links have been added for this course yet.'
      };
      return ui.state({
        icon: kind === 'videos' ? 'play' : (kind === 'links' ? 'link' : 'file-text'),
        title: 'Nothing here yet',
        message: messages[kind]
      });
    }

    var wrap = el('div');
    var list = el('.res-list');

    if (items.length > 6) {
      var filters = kind === 'slides'
        ? uniqueBy(items, function (i) { return i.kind; }).map(function (k) {
            return { key: k, label: R.kindLabel(k) };
          })
        : uniqueBy(items, function (i) { return i.source; }).slice(0, 6).map(function (s) {
            return { key: s, label: s };
          });

      ui.toolbar({
        mount: wrap,
        grid: list,
        items: items,
        viewToggle: false,
        storageKey: 'res-' + kind,
        placeholder: 'Filter ' + kind + '...',
        searchText: function (i) { return i.title + ' ' + (i.source || '') + ' ' + (i.kind || ''); },
        filters: filters.length > 1 ? filters : null,
        filterFn: function (i, key) { return (kind === 'slides' ? i.kind : i.source) === key; },
        sorts: [
          { key: 'az', label: 'A - Z', fn: function (a, b) { return a.title.localeCompare(b.title); } },
          { key: 'type', label: 'By type', fn: function (a, b) {
              return String(a.kind || a.source).localeCompare(String(b.kind || b.source)); } }
        ],
        render: function (i) { return ui.resourceRow(i, contextTitle); }
      });
      wrap.appendChild(list);

      if (kind === 'slides') {
        var dl = el('button.btn.btn--outline.btn--sm.mt-4', {
          type: 'button', 'data-tip': 'Opens each PDF in a new tab'
        }, [icon('download'), 'Open all ' + items.length + ' documents']);
        dl.addEventListener('click', function () { openAll(items); });
        wrap.appendChild(dl);
      }
    } else {
      items.forEach(function (i) { list.appendChild(ui.resourceRow(i, contextTitle)); });
      wrap.appendChild(list);
    }

    return wrap;
  }

  function openAll(items) {
    TEA.Modal.open({
      title: 'Open all documents',
      body: el('div', {}, [
        el('p.text-sm', { text: 'This opens ' + items.length + ' PDFs in separate tabs. Your browser may ask permission to allow multiple pop-ups.' })
      ]),
      actions: [
        { label: 'Cancel' },
        { label: 'Open ' + items.length + ' tabs', variant: 'primary', icon: 'external', onClick: function () {
            items.forEach(function (i, n) {
              setTimeout(function () { w.open(i.file, '_blank', 'noopener'); }, n * 90);
            });
          } }
      ]
    });
  }

  /* ======================================================================
     Books
     ====================================================================== */

  function books() {
    var grid = mount('grid');
    if (!grid) return;

    // The curated Books page plus every book-kind PDF across all courses.
    var seen = {};
    var items = [];

    st.books.forEach(function (b) {
      if (seen[b.file]) return;
      seen[b.file] = 1;
      items.push({ title: b.title, file: b.file, size: b.size, kind: 'book', course: null, curated: true });
    });

    st.courses.forEach(function (c) {
      c.slides.forEach(function (s) {
        if (seen[s.file]) return;
        seen[s.file] = 1;
        items.push({
          title: s.title, file: s.file, size: s.size, kind: s.kind,
          course: c, semester: c.semester
        });
      });
    });

    var semFilters = st.semesters.map(function (s) {
      return { key: String(s.number), label: R.ordinal(s.number) + ' Sem' };
    });

    ui.toolbar({
      mount: grid.parentNode,
      grid: grid,
      items: items,
      storageKey: 'books',
      placeholder: 'Search ' + items.length + ' documents by title or course...',
      searchText: function (i) { return i.title + ' ' + (i.course ? i.course.title : '') + ' ' + R.kindLabel(i.kind); },
      filters: [{ key: 'curated', label: 'Featured' }, { key: 'book', label: 'Books' },
                { key: 'slide', label: 'Slides' }, { key: 'note', label: 'Notes' }].concat(semFilters),
      filterFn: function (i, key) {
        if (key === 'curated') return !!i.curated;
        if (/^\d$/.test(key)) return String(i.semester) === key;
        return i.kind === key;
      },
      sorts: [
        { key: 'az', label: 'A - Z', fn: function (a, b) { return a.title.localeCompare(b.title); } },
        { key: 'sem', label: 'By semester', fn: function (a, b) { return (a.semester || 99) - (b.semester || 99); } },
        { key: 'type', label: 'By type', fn: function (a, b) { return String(a.kind).localeCompare(String(b.kind)); } }
      ],
      render: function (i) {
        var card = ui.card({
          icon: R.kindIcon(i.kind),
          title: i.title,
          description: i.course ? i.course.title : 'Featured in the library',
          meta: [
            { label: R.kindLabel(i.kind), tone: R.kindTone(i.kind) },
            i.size ? { label: i.size, tone: 'muted' } : null,
            i.semester ? { label: 'Sem ' + i.semester, tone: 'muted' } : null
          ].filter(Boolean),
          onClick: function () {
            TEA.Modal.preview({
              title: i.title, file: i.file, size: i.size,
              kindLabel: R.kindLabel(i.kind), context: i.course ? i.course.title : null
            });
          },
          tip: 'Preview "' + i.title + '"'
        });
        card.appendChild(el('.card__corner', {}, TEA.Menu.build([
          { heading: 'Document' },
          { label: 'Quick preview', icon: 'eye', onClick: function () {
              TEA.Modal.preview({ title: i.title, file: i.file, size: i.size, kindLabel: R.kindLabel(i.kind) });
            } },
          { label: 'Open in new tab', icon: 'external', href: i.file },
          { label: 'Download PDF', icon: 'download', href: i.file, download: true },
          i.course ? '---' : null,
          i.course ? { label: 'Go to ' + i.course.title, icon: 'arrow-right', href: courseHref(i.course.slug), sameTab: true } : null,
          '---',
          { label: 'Copy link', icon: 'copy', onClick: function () { ui.copyLink(i.file); } }
        ].filter(Boolean))));
        return card;
      }
    });
  }

  /* ======================================================================
     GitHub profiles
     ====================================================================== */

  function github() {
    var grid = mount('grid');
    if (!grid) return;

    ui.toolbar({
      mount: grid.parentNode,
      grid: grid,
      items: st.people,
      storageKey: 'people',
      placeholder: 'Search by name, roll number or username...',
      searchText: function (p) { return p.name + ' ' + p.roll + ' ' + p.user; },
      sorts: [
        { key: 'roll', label: 'By roll number', fn: function (a, b) { return String(a.roll).localeCompare(String(b.roll)); } },
        { key: 'az', label: 'A - Z', fn: function (a, b) { return a.name.localeCompare(b.name); } }
      ],
      render: function (p) {
        return ui.card({
          className: 'person',
          href: p.url,
          external: true,
          avatar: 'https://github.com/' + encodeURIComponent(p.user) + '.png?size=144',
          title: p.name,
          description: '@' + p.user,
          meta: p.roll ? [{ label: p.roll, tone: 'grad', icon: 'badge' }] : [],
          tip: 'Open github.com/' + p.user
        });
      }
    });
  }

  /* ======================================================================
     Helpers
     ====================================================================== */

  function notFound(head, body, message) {
    if (head) d.append(head, [el('h1', { text: 'Not found' }), el('p', { text: message })]);
    if (body) {
      d.clear(body);
      body.appendChild(ui.state({
        variant: 'error', icon: 'alert', title: 'Nothing to show', message: message,
        action: el('a.btn.btn--primary.mt-4', { href: 'index.html' }, [icon('home'), 'Back to home'])
      }));
    }
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '...' : s; }

  function uniqueBy(list, fn) {
    var seen = {}, out = [];
    list.forEach(function (i) {
      var k = fn(i);
      if (k && !seen[k]) { seen[k] = 1; out.push(k); }
    });
    return out;
  }

  TEA.pages = {
    home: home, semesters: semesters, semester: semester,
    subjects: subjects, subject: subject, course: course,
    books: books, github: github
  };

  /* ---- Boot: shell first, then the page named in <body data-page> ------- */

  function boot() {
    TEA.shell.init();
    var page = document.body.getAttribute('data-page');
    if (page && TEA.pages[page]) {
      try {
        TEA.pages[page]();
      } catch (err) {
        if (w.console) w.console.error('[TEA] page "' + page + '" failed:', err);
        var main = d.qs('main .container') || d.qs('main');
        if (main) main.appendChild(ui.state({
          variant: 'error', icon: 'alert', title: 'Something went wrong',
          message: 'This page could not be rendered. Reload to try again.'
        }));
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
