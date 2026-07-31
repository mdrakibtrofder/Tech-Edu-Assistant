/**
 * Render every page in a real DOM (jsdom) and assert that it actually built.
 *
 * Catches what a static link checker cannot: JavaScript errors, components
 * that fail to mount, empty grids, missing navigation, broken tab wiring, and
 * modals or menus that throw when opened.
 *
 *   npm install jsdom     (or run from a directory where it is available)
 *   node tools/rendercheck.js
 */

const fs = require('fs');
const path = require('path');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (e) {
  try {
    ({ JSDOM } = require(path.join(process.env.HOME || '/tmp', '../tmp/node_modules/jsdom')));
  } catch (e2) {
    ({ JSDOM } = require('/tmp/node_modules/jsdom'));
  }
}

const ROOT = path.dirname(__dirname);

const CASES = [
  { file: 'index.html',     query: '',                       expect: ['#stats .stat', '#quick-access .card', '#rich-courses .card'] },
  { file: 'semesters.html', query: '',                       expect: ['#grid .card', '.toolbar'] },
  { file: 'semester.html',  query: '?s=3',                   expect: ['#grid .card', '.breadcrumb', '.page-head__meta .badge'] },
  { file: 'subjects.html',  query: '',                       expect: ['#grid .card', '.toolbar'] },
  { file: 'subject.html',   query: '?g=software-engineering', expect: ['#grid .card', '.breadcrumb'] },
  { file: 'course.html',    query: '?c=structured-programming', expect: ['.tabs .tab', '.outline-box', '.topics .topic'] },
  { file: 'course.html',    query: '?c=operating-system',    expect: ['.tabs .tab', '.state'] },
  { file: 'course.html',    query: '?c=internship',          expect: ['.tabs .tab'] },
  { file: 'books.html',     query: '',                       expect: ['#grid .card', '.toolbar .chip'] },
  { file: 'github.html',    query: '',                       expect: ['#grid .card.person', '.toolbar'] },
  { file: 'syllabus.html',  query: '',                       expect: ['.viewer iframe'] },
  { file: '404.html',       query: '',                       expect: ['.state'] }
];

const ALWAYS = ['.site-header', '.site-nav__link', '.site-footer', '.footer-stats li', '.scroll-progress', '.to-top'];

let failures = 0;
let checks = 0;

function fail(label, msg) {
  failures++;
  console.log(`  FAIL  ${label}: ${msg}`);
}

function ok(label) {
  checks++;
  console.log(`  ok    ${label}`);
}

async function run(spec) {
  const label = spec.file + spec.query;
  const html = fs.readFileSync(path.join(ROOT, spec.file), 'utf8');
  const errors = [];

  const dom = new JSDOM(html, {
    url: 'file://' + path.join(ROOT, spec.file) + spec.query,
    runScripts: 'dangerously',
    // No `resources` loader on purpose: jsdom must NOT fetch the <script src>
    // tags, because we evaluate them ourselves below. Letting it do both runs
    // every script twice.
    pretendToBeVisual: true,
    beforeParse(win) {
      win.matchMedia = win.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
      win.scrollTo = () => {};
      win.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
      win.addEventListener('error', (e) => errors.push(String(e.error || e.message)));
      const origError = win.console.error;
      win.console.error = (...args) => { errors.push(args.join(' ')); origError.apply(win.console, args); };
    }
  });

  // load the scripts ourselves - jsdom's file:// resource loader is unreliable
  const win = dom.window;
  const doc = win.document;
  const scripts = Array.from(doc.querySelectorAll('script[src]'));
  for (const s of scripts) {
    const src = path.join(ROOT, s.getAttribute('src'));
    if (!fs.existsSync(src)) { fail(label, 'missing script ' + s.getAttribute('src')); continue; }
    try {
      win.eval(fs.readFileSync(src, 'utf8'));
    } catch (e) {
      errors.push(`${s.getAttribute('src')}: ${e.message}`);
    }
  }

  // pages.js self-boots: immediately if the document is already parsed, or on
  // DOMContentLoaded otherwise. Give that a chance to happen before deciding
  // to boot manually, or the page renders twice.
  await new Promise((r) => setTimeout(r, 120));

  if (doc.querySelector('#app-header') && win.TEA && win.TEA.shell) {
    try {
      win.TEA.shell.init();
      const page = doc.body.getAttribute('data-page');
      if (page && win.TEA.pages && win.TEA.pages[page]) win.TEA.pages[page]();
    } catch (e) {
      errors.push('boot: ' + e.message);
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`\n${label}`);

  if (errors.length) {
    errors.forEach((e) => fail(label, 'JS error: ' + e));
  } else {
    ok('no JavaScript errors');
  }

  for (const sel of ALWAYS.concat(spec.expect)) {
    const n = doc.querySelectorAll(sel).length;
    if (n === 0) fail(label, `expected element not rendered: ${sel}`);
    else ok(`${sel} (${n})`);
  }

  // accessibility spot-checks
  const noAlt = Array.from(doc.querySelectorAll('img')).filter((i) => !i.hasAttribute('alt'));
  if (noAlt.length) fail(label, `${noAlt.length} <img> without alt`); else ok('all images have alt');

  const emptyHref = doc.querySelectorAll('a[href=""]').length;
  if (emptyHref) fail(label, `${emptyHref} empty href`); else ok('no empty href');

  const tablist = doc.querySelector('[role="tablist"]');
  if (tablist) {
    const selected = doc.querySelectorAll('[role="tab"][aria-selected="true"]').length;
    if (selected !== 1) fail(label, `expected exactly 1 selected tab, found ${selected}`);
    else ok('exactly one tab selected');
    const visiblePanels = Array.from(doc.querySelectorAll('[role="tabpanel"]')).filter((p) => !p.hidden).length;
    if (visiblePanels !== 1) fail(label, `expected 1 visible tabpanel, found ${visiblePanels}`);
    else ok('exactly one tabpanel visible');
  }

  // exercise the overlays
  try {
    const m = win.TEA.Modal.open({ title: 'Smoke test', body: 'hello' });
    if (!doc.querySelector('.modal-backdrop [role="dialog"]')) fail(label, 'modal did not mount');
    else ok('modal opens');
    m.close();
  } catch (e) { fail(label, 'modal threw: ' + e.message); }

  try {
    const menu = win.TEA.Menu.build([{ label: 'One', icon: 'eye' }, '---', { label: 'Two' }]);
    if (!menu.querySelector('.menu__item')) fail(label, 'menu did not build');
    else ok('options menu builds');
  } catch (e) { fail(label, 'menu threw: ' + e.message); }

  // every tooltip target must have text
  const badTip = Array.from(doc.querySelectorAll('[data-tip]')).filter((n) => !n.getAttribute('data-tip').trim());
  if (badTip.length) fail(label, `${badTip.length} empty data-tip`);
  else ok(`tooltips wired (${doc.querySelectorAll('[data-tip]').length})`);

  // search must return something sensible
  if (win.TEA.store) {
    const hits = win.TEA.store.search('software');
    if (!hits.length) fail(label, 'search returned nothing for "software"');
    else ok(`search works (${hits.length} hits for "software")`);
  }

  dom.window.close();
}

(async () => {
  for (const spec of CASES) await run(spec);
  console.log(`\n${checks} checks passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
