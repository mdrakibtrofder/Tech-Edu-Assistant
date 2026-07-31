/* ==========================================================================
   Store - indexes the generated data files and answers every query the
   pages need. Also owns base-path resolution and small persisted prefs.
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});

  var courses = TEA.courses || [];
  var semesters = TEA.semesters || [];
  var groups = TEA.groups || [];
  var books = TEA.books || [];
  var people = TEA.people || [];

  var bySlug = {};
  courses.forEach(function (c) { bySlug[c.slug] = c; });

  var groupBySlug = {};
  groups.forEach(function (g) { groupBySlug[g.slug] = g; });

  /* ---- Base path ---------------------------------------------------------
     Every page sits at the site root, so links and PDF paths are already
     correct relative to the document. Kept as a hook in case the site is
     later served from a sub-directory. */
  function url(path) { return path; }

  /* ---- Queries ---------------------------------------------------------- */

  function getCourse(slug) { return bySlug[slug] || null; }

  function getSemester(num) {
    num = Number(num);
    for (var i = 0; i < semesters.length; i++) {
      if (semesters[i].number === num) return semesters[i];
    }
    return null;
  }

  function getGroup(slug) { return groupBySlug[slug] || null; }

  function coursesOf(list) {
    return (list || []).map(getCourse).filter(Boolean);
  }

  function semesterCourses(num) {
    var s = getSemester(num);
    if (s && s.courses.length) return coursesOf(s.courses);
    return courses.filter(function (c) { return c.semester === Number(num); });
  }

  function groupCourses(slug) {
    var g = getGroup(slug);
    if (g && g.courses.length) return coursesOf(g.courses);
    return courses.filter(function (c) { return (c.groups || []).indexOf(slug) > -1; });
  }

  function resourceCount(c) {
    return (c.slides || []).length + (c.videos || []).length + (c.links || []).length;
  }

  function totals() {
    var slides = 0, videos = 0, links = 0, topics = 0;
    var files = {};
    courses.forEach(function (c) {
      slides += (c.slides || []).length;
      videos += (c.videos || []).length;
      links += (c.links || []).length;
      topics += (c.topics || []).length;
      (c.slides || []).forEach(function (s) { files[s.file] = 1; });
    });
    books.forEach(function (b) { files[b.file] = 1; });
    return {
      courses: courses.length,
      semesters: semesters.length,
      groups: groups.length,
      slides: slides,
      videos: videos,
      links: links,
      topics: topics,
      books: books.length,
      people: people.length,
      documents: Object.keys(files).length,
      resources: slides + videos + links
    };
  }

  /* ---- Search ------------------------------------------------------------
     Small ranked substring search across courses, topics, books and people.
     No dependency, fast enough for a dataset this size. */

  function norm(s) { return String(s || '').toLowerCase(); }

  function search(query, limit) {
    var q = norm(query).trim();
    if (q.length < 2) return [];
    var terms = q.split(/\s+/);
    var hits = [];

    function score(haystack, weight) {
      var h = norm(haystack), total = 0;
      for (var i = 0; i < terms.length; i++) {
        var idx = h.indexOf(terms[i]);
        if (idx < 0) return 0;
        total += weight + (idx === 0 ? 6 : 0) + Math.max(0, 8 - idx / 4);
      }
      return total;
    }

    courses.forEach(function (c) {
      var s = score(c.title, 40) || score(c.outline, 6);
      if (s) {
        hits.push({
          type: 'Course', score: s + resourceCount(c) / 40,
          title: c.title, icon: c.icon,
          sub: 'Semester ' + (c.semester || '-') + ' · ' + resourceCount(c) + ' resources',
          href: 'course.html?c=' + encodeURIComponent(c.slug)
        });
      }
      (c.topics || []).forEach(function (t) {
        var ts = score(t, 18);
        if (ts) {
          hits.push({
            type: 'Topic', score: ts, title: t, icon: 'list',
            sub: c.title, href: 'course.html?c=' + encodeURIComponent(c.slug) + '#topics'
          });
        }
      });
      (c.slides || []).forEach(function (sl) {
        var ss = score(sl.title, 14);
        if (ss) {
          hits.push({
            type: 'Document', score: ss, title: sl.title, icon: 'file-text',
            sub: c.title, href: sl.file, external: true
          });
        }
      });
    });

    books.forEach(function (b) {
      var s = score(b.title, 30);
      if (s) hits.push({ type: 'Book', score: s, title: b.title, icon: 'book', sub: b.size || 'PDF', href: b.file, external: true });
    });

    people.forEach(function (p) {
      var s = score(p.name + ' ' + p.roll, 22);
      if (s) hits.push({ type: 'Person', score: s, title: p.name, icon: 'github', sub: p.roll || p.user, href: p.url, external: true });
    });

    var seen = {};
    return hits
      .sort(function (a, b) { return b.score - a.score; })
      .filter(function (h) {
        var k = h.type + '|' + h.title + '|' + h.href;
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      })
      .slice(0, limit || 24);
  }

  /* ---- Prefs (localStorage, fails silently in private mode) -------------- */

  function pref(key, value) {
    var k = 'tea:' + key;
    try {
      if (arguments.length === 1) return w.localStorage.getItem(k);
      if (value === null) w.localStorage.removeItem(k); else w.localStorage.setItem(k, value);
    } catch (e) { /* storage unavailable - carry on */ }
    return value;
  }

  TEA.store = {
    courses: courses,
    semesters: semesters,
    groups: groups,
    books: books,
    people: people,
    url: url,
    getCourse: getCourse,
    getSemester: getSemester,
    getGroup: getGroup,
    semesterCourses: semesterCourses,
    groupCourses: groupCourses,
    resourceCount: resourceCount,
    totals: totals,
    search: search,
    pref: pref
  };
})(window);
