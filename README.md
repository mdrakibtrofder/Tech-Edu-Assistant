# Tech Edu Assistant

A static resource library for the Computer Science &amp; Software Engineering
curriculum — lecture slides, reference books, video tutorials and curated links,
organised by semester and by subject.

**Live:** https://rakib3004.github.io/Tech-Edu-Assistant/

No build step, no npm, no framework, no runtime dependencies. Open
`index.html` in a browser and it works.

---

## Structure

```
index.html          Landing page
semesters.html      All eight semesters
semester.html?s=3   One semester's courses
subjects.html       Seven thematic subject areas
subject.html?g=…    One subject area
course.html?c=…     One course: Topics / Slides / Videos / Links (tabbed)
books.html          The whole PDF library, searchable
github.html         Student project profiles
syllabus.html       Embedded curriculum PDF
404.html

data/               Generated content — the single source of truth
  curriculum.js       semesters + subject groups
  courses.js          43 courses: outline, topics, slides, videos, links
  books.js            featured book list
  people.js           GitHub profiles

assets/
  css/  tokens · base · layout · components · utilities
  js/
    core/         dom (helpers + icon set), router, store
    components/   shell, ui, modal, tooltip, menu
    pages/        pages.js — one controller per page
  img/  favicon.svg, logo.svg, og-image.svg

library/            All 463 PDFs
  sem1…sem8/<course-slug>/    course materials
  featured/                   books linked from books.html
  syllabus/                   IIT-Syllabus.pdf
  unlinked/                   on disk but not published (see below)

tools/              One-time migration + verification scripts
```

## Adding content

Everything on the site is rendered from `data/`. **You never create an HTML
file to add a course, a book or a document.**

Add a document to an existing course — edit `data/courses.js`:

```js
{
  "title": "Introduction to Algorithms",
  "file": "library/sem2/data-structure-algorithm/Introduction-to-Algorithms.pdf",
  "kind": "book",          // book | slide | note | lecture | syllabus | paper
  "size": "12.4 MB"
}
```

Add a whole course — append one object to `window.TEA.courses` and add its
slug to the right semester in `data/curriculum.js`. That is the entire change.

Add a nav item — `assets/js/components/shell.js`, the `NAV` array. One edit
updates the header, the footer and the search menu on every page.

Change the colours — `assets/css/tokens.css`. Nothing else hard-codes a colour.

## Verifying

```bash
python3 tools/linkcheck.py      # every reference resolves; no orphan PDFs
node    tools/rendercheck.js    # renders every page in jsdom, 186 assertions
```

`rendercheck.js` needs jsdom: `npm install jsdom` (dev-only, never shipped).

Run both after any change to `data/` or `assets/js/`.

## Migration scripts

These converted the original 193-page hand-written site. They are kept for
reference and are **not** part of the running site. Order matters:

| Script | Does |
|---|---|
| `tools/extract.py` | Parsed the legacy HTML into `data/*.js` |
| `tools/normalize_pdfs.py` | Moved PDFs into `library/`, cleaned filenames, rewrote data paths |
| `tools/build_pages.py` | Regenerates the ten HTML shells |
| `tools/cleanup.py` | Moved the legacy tree to `.trash/` |
| `tools/linkcheck.py` | Static verification |
| `tools/rendercheck.js` | Runtime verification |

`tools/extract-report.md` and `tools/pdf-inventory.md` record exactly what was
migrated and where every file went.

## Notes

- **`library/unlinked/`** holds six student SRS submissions from Software
  Project Lab II. They are on disk but not published, pending a decision about
  whether they should be public — they may contain student names. Delete them
  or link them from `data/courses.js`, whichever you prefer.
- **`.trash/`** holds the old site, gitignored. Delete the folder once you are
  happy with the rebuild.
- **Keyboard:** <kbd>/</kbd> or <kbd>⌘K</kbd> search · <kbd>t</kbd> theme ·
  <kbd>g</kbd> then <kbd>h</kbd>/<kbd>s</kbd>/<kbd>b</kbd> navigate ·
  <kbd>?</kbd> full list.
- **Dark mode** follows the OS setting and can be toggled in the header.
- See `planning.md` for the full audit of the original site and the redesign
  rationale.
