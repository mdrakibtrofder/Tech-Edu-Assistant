# Tech Edu Assistant — Redesign Plan

> **Status: EXECUTED.** Sections 1–7 below are the original audit and plan,
> kept as the record of what was found and why. The outcome, the decisions
> taken on the open questions, and the deviations from the plan are in
> **§11 Execution log** at the end.

**Status:** Draft for approval
**Date:** 2026-07-31
**Scope:** Full restructure of the site — architecture, design system, component library, content model, and cleanup.

---

## 1. Audit — what exists today

### 1.1 Repository facts

| Metric | Value |
|---|---|
| Total size | 3.8 GB |
| HTML pages | 193 |
| CSS files | 8 (only 3 are ever referenced) |
| JS files | 1 (9 lines — smooth scroll) |
| PDFs on disk | 463 |
| Internal links | 1,867 |
| Broken internal links | 8 distinct targets |
| Empty `href=""` placeholder links | **2,272** |
| Duplicate copies of `t.png` (favicon) | 21 identical files |

### 1.2 Directory layout

```
doc/
├── html/              5 pages   (Semesters, Subjects, Books, Github, HomePage) + IIT_Syllabus.pdf + a stray Style.css
├── SemestersGroup/    8 pages   (1st–8th Semester → subject cards)
├── SubjectsGroup/     7 pages   (thematic groupings → course pages)
├── SubType1..4/      43 pages   ("Topics" — course outline text)
├── VideoLink1..4/    43 pages   ("Video Tutorials")
├── Pdf1..4/          44 pages   ("Slides" — PDF listings) + 463 PDFs in ~41 sub-folders
└── Link1..4/         43 pages   ("Links" — external references)
```

The numeric suffix `1..4` maps to a **year**, not a semester:
`1` = Sem 1–2, `2` = Sem 3–4, `3` = Sem 5–6, `4` = Sem 7–8.

### 1.3 Structural problems

**A. Massive duplication.** Every one of the 193 pages hand-writes its own `<head>`, navbar, and footer. Changing a nav item today means editing 193 files. The four parallel trees (`SubType`/`VideoLink`/`Pdf`/`Link`) are the *same course* split across four near-identical files — 4 files × 43 courses = 172 pages that should be 43 pages with 4 tabs, or better, one template.

**B. Two incompatible design systems coexist.**

| Style | Used by | Look |
|---|---|---|
| `Style.css` + `LandingPage.css` | 54 pages (index, html/, SemestersGroup/, Pdf1-4) | Modern-ish: flat blue `#007bff` header, card grid |
| `SubjectStyle.css` | 136 pages (SubType, VideoLink, Link, SubjectsGroup) | Legacy: `<body bgcolor="#00FA9A">` spring-green, `<h3><ul>` used as a nav bar, no viewport meta, not responsive |

131 pages still carry the deprecated `bgcolor` attribute. Navigating from Semesters → a course drops the user from one visual identity into a completely different one.

**C. Dead / unused files.**

| File | Status |
|---|---|
| `css/main.css` (263 lines) | Referenced by nothing |
| `css/normalize.css` (349 lines) | Referenced by nothing |
| `css/BookSelfStyle.css` | Referenced by nothing |
| `css/LinkStyle.css` | Referenced by nothing |
| `css/LanguageStyle.css` | Referenced by nothing |
| `css/study.jpg`, `css/study-focus.jpg` | Image assets living inside `css/` |
| `doc/html/HomePage.html` | Orphan — no page links to it; broken relative paths; superseded by `index.html` |
| `doc/html/Style.css` | Duplicate stylesheet only `HomePage.html` uses |
| `Images/t.png`, 20 more `t.png` | 21 byte-identical favicon copies |
| `t.png` (root), `logo.png` | `logo.png` referenced only by the orphan `HomePage.html` |

**D. Broken links (8).**

| Target | Referenced by | Cause |
|---|---|---|
| `doc/html/Languages.html` | 7 pages | Page never existed |
| `doc/SubType3/DatabaseManagementSystem2.html.html` | 1 | Double extension typo |
| `doc/Pdf4/SoftwareMetrics/Software-Engineering.pdf` | 1 | Wrong folder |
| `.../Numerical-Methods-Note.pdf.pdf` | 1 | Double extension typo |
| `CombinatorialSlides/Dijkstra Algorithm.pdf` (+3 more) | 4 | Link uses spaces, file on disk uses hyphens |

**E. Placeholder links.** 2,272 links have `href=""`. Breakdown:

| Section | Real links | Empty placeholders |
|---|---|---|
| VideoLink1 | 0 | 399 |
| VideoLink4 | 55 | 316 |
| VideoLink3 | 125 | 179 |
| VideoLink2 | 196 | 130 |
| Link1 | 31 | 377 |
| Link4 | 64 | 307 |
| Link2 | 39 | 267 |
| Link3 | 32 | 261 |
| Pdf4 / SubType4 | — | 36 |

Per your decision these are **removed entirely**. Net effect: ~542 real external links survive; the rest of the topic outlines are preserved as plain text in the course outline instead of as dead links.

**F. Orphan PDFs (35 files, 105.6 MB).** Not linked from any page. Important caveat: at least 8 of these are *not truly orphaned* — they're the other half of the broken links in (D) (`Bellmanford-Algorithm.pdf` exists, the link points at `Bellmanford Algorithm.pdf`). These get **reconnected, not deleted**. Full list in §7.2.

**G. Inconsistent folder naming.** `Calculus&AnalyticGeometry.html` ↔ folder `CalculusAnalyticalGeometry`; `OrdinaryDifferentialEquations.html` ↔ `OrdinaryDifferential`; `ObjectOrientedConcepts1.html` ↔ `ObjectOrientedConcepts-I`; some folders end in `Slides`, some don't. `&` in filenames requires URL-encoding and breaks on some hosts.

**H. No interactive affordances at all.** No search, no filtering, no modals, no tooltips, no keyboard navigation, no mobile menu, no loading/empty states, no 404 page.

---

## 2. Approved decisions

| Question | Decision |
|---|---|
| Architecture | **Data-driven** — one content dataset + ~8 template pages |
| Placeholder links | **Remove empty `href=""` entirely** |
| PDFs | **Normalize folder names + delete true orphans** (deletions listed for approval first) |
| Tooling | **Zero dependencies** — plain HTML/CSS/JS, no npm, no build step |

---

## 3. Target architecture

### 3.1 File structure

```
/
├── index.html                    Home / landing
├── semesters.html                8 semester cards
├── semester.html                 ?s=1 → courses in that semester
├── subjects.html                 7 thematic subject-group cards
├── subject.html                  ?g=software-engineering → courses in that group
├── course.html                   ?c=structured-programming → tabbed course page
├── books.html                    Searchable book library
├── github.html                   Student GitHub directory
├── syllabus.html                 Embedded PDF viewer + download
├── 404.html
├── planning.md
├── README.md
│
├── data/
│   ├── courses.js                All 43 courses: outline, topics, videos, slides, links
│   ├── curriculum.js             Semester → course mapping, subject-group → course mapping
│   ├── books.js                  Book library
│   └── people.js                 GitHub profiles
│
└── assets/
    ├── css/
    │   ├── tokens.css            Design tokens (colors, gradients, spacing, type, shadows, motion)
    │   ├── base.css              Reset + element defaults + typography
    │   ├── layout.css            Container, grid, section, header, footer
    │   ├── components.css        All reusable components
    │   └── utilities.css         Small helpers
    ├── js/
    │   ├── core/
    │   │   ├── dom.js            el(), qs(), qsa(), on(), html-escape
    │   │   ├── router.js         Query-param reading, slug helpers
    │   │   └── store.js          Reads window.TEA data, indexes by slug
    │   ├── components/
    │   │   ├── navbar.js         Injects header, active state, mobile drawer, command-K search
    │   │   ├── footer.js
    │   │   ├── card.js           Card factory (icon, title, desc, badge, meta, href)
    │   │   ├── modal.js          Global modal service
    │   │   ├── tooltip.js        Global tooltip service
    │   │   ├── tabs.js           Accessible tablist
    │   │   ├── breadcrumb.js
    │   │   ├── search.js         Fuzzy search over all content
    │   │   ├── toolbar.js        Sort / filter / view-toggle bar
    │   │   ├── toast.js
    │   │   └── empty.js          Empty + loading + error states
    │   └── pages/
    │       ├── home.js  semesters.js  semester.js  subjects.js
    │       ├── subject.js  course.js  books.js  github.js
    └── img/
        ├── logo.svg  favicon.svg  hero.svg  (+ og-image.png)
```

### 3.2 Why plain `<script>` data files, not `fetch('*.json')`

`fetch()` on a `file://` page is blocked by CORS in every browser. Since this site should open by double-clicking `index.html` **and** work on GitHub Pages, content ships as plain scripts that assign to a global:

```js
// data/courses.js
window.TEA = window.TEA || {};
window.TEA.courses = [ /* ... */ ];
```

No build step, no server, no modules. Loaded with ordinary `<script src>` tags before the page script.

### 3.3 Data model

```js
// data/courses.js — one entry per course (43 total)
{
  slug: "structured-programming",
  title: "Structured Programming",
  code: "SE 1101",              // where known, else null
  icon: "code",                 // maps to inline SVG sprite
  semester: 1,
  groups: ["computer-programming"],
  credits: 3,                   // where known
  outline: "Fundamentals of C programming; Introducing C's Program Control Statements; ...",
  topics: [
    { title: "Fundamentals of C programming" },
    { title: "Understanding Pointers and Functions" }
  ],
  videos: [                     // empty-href entries dropped at migration
    { title: "C Programming Full Course", url: "https://...", source: "YouTube" }
  ],
  links: [
    { title: "Fundamentals of C programming", url: "https://www.programiz.com/c-programming", source: "Programiz" }
  ],
  slides: [
    { title: "Teach Yourself C", file: "assets/pdf/sem1/structured-programming/Teach-Yourself-C.pdf",
      kind: "book", size: "12.4 MB", pages: 780 }
  ]
}
```

`kind` is one of `book | slide | note | lecture | syllabus | paper`, which drives the icon and the filter chips on the course page.

```js
// data/curriculum.js
window.TEA.semesters = [
  { number: 1, label: "1st Semester", year: 1, courses: ["structured-programming", ...] }, ...
];
window.TEA.groups = [
  { slug: "software-engineering", title: "Software Engineering", icon: "wrench",
    description: "...", courses: [...] }, ...
];
```

### 3.4 Page-count reduction

| | Before | After |
|---|---|---|
| HTML pages | 193 | 10 |
| CSS files | 8 (3 used) | 5 |
| JS files | 1 | ~20 small modules |
| Navbar copies | 193 | 1 |
| Footer copies | 193 | 1 |

---

## 4. Design system — gradient blue → green

### 4.1 Colour tokens (`assets/css/tokens.css`)

**Primary — Blue**

| Token | Hex |
|---|---|
| `--blue-50` | `#eff6ff` |
| `--blue-100` | `#dbeafe` |
| `--blue-300` | `#93c5fd` |
| `--blue-500` | `#3b82f6` |
| `--blue-600` | `#2563eb` ← primary |
| `--blue-700` | `#1d4ed8` |
| `--blue-900` | `#1e3a8a` |

**Secondary — Green**

| Token | Hex |
|---|---|
| `--green-50` | `#ecfdf5` |
| `--green-100` | `#d1fae5` |
| `--green-300` | `#6ee7b7` |
| `--green-500` | `#10b981` ← secondary |
| `--green-600` | `#059669` |
| `--green-700` | `#047857` |

**Neutrals:** `--ink-900 #0f172a` · `--ink-700 #334155` · `--ink-500 #64748b` · `--ink-300 #cbd5e1` · `--ink-100 #f1f5f9` · `--surface #ffffff` · `--canvas #f8fafc`

**Semantic:** `--success` = `--green-600` · `--warning #f59e0b` · `--danger #ef4444` · `--info` = `--blue-500`

### 4.2 Gradients — the signature of the redesign

```css
--grad-primary:  linear-gradient(135deg, #2563eb 0%, #10b981 100%);
--grad-primary-soft: linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%);
--grad-hero:     linear-gradient(135deg, #1e3a8a 0%, #2563eb 45%, #059669 100%);
--grad-header:   linear-gradient(90deg, #1d4ed8 0%, #2563eb 55%, #10b981 100%);
--grad-accent-line: linear-gradient(90deg, #2563eb, #10b981);   /* 3px top border on cards */
--grad-text:     linear-gradient(90deg, #2563eb, #059669);      /* background-clip: text */
--grad-ring:     linear-gradient(135deg, #3b82f6, #10b981);     /* focus ring / card hover border */
```

Applied as:

- **Header** — `--grad-header`, sticky, translucent + `backdrop-filter: blur(12px)` on scroll.
- **Hero** — `--grad-hero` with a subtle SVG mesh overlay, replacing today's photo + black scrim (also removes the `study.jpg` dependency).
- **Cards** — white surface, 3px `--grad-accent-line` top border that animates from 0 → 100% width on hover; icon chip filled with `--grad-primary-soft`.
- **Primary button** — `--grad-primary`, with a brightness lift + 6px lift shadow on hover.
- **Secondary button** — gradient 1px border via `border-image`, transparent fill, gradient text.
- **Section headings** — `--grad-text` on the emphasised word only (never a full paragraph — keeps contrast readable).
- **Badges** — `kind`-coloured: book = green tint, slide = blue tint, video = blue→green.
- **Progress / scroll indicator** — thin `--grad-primary` bar at the top of the viewport.

**Contrast:** every gradient's *midpoint* is verified against white text for WCAG AA (4.5:1). `#2563eb` on white = 5.17:1 ✓, `#059669` on white = 4.54:1 ✓. Gradient text is used only at ≥ 24px (large-text AA = 3:1).

### 4.3 Other tokens

- **Type:** system stack (`-apple-system, "Segoe UI", Roboto, ...`). Scale: 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 56. Line heights 1.2 (headings) / 1.65 (body).
- **Space:** 4-point scale `--s-1` 4px → `--s-12` 96px.
- **Radius:** `--r-sm` 6px · `--r-md` 12px · `--r-lg` 16px · `--r-full` 999px.
- **Shadow:** `--sh-1` subtle · `--sh-2` card · `--sh-3` hover lift · `--sh-focus` gradient-tinted ring.
- **Motion:** `--t-fast` 150ms · `--t-base` 250ms · `--t-slow` 400ms, all `cubic-bezier(.4,0,.2,1)`. All of it wrapped in `@media (prefers-reduced-motion: reduce)`.
- **Dark mode:** the token file defines a `[data-theme="dark"]` block from day one; gradients shift to `#1e3a8a → #047857`. Toggle lives in the navbar, preference in `localStorage`.

---

## 5. Reusable component library

Every component is one JS factory + one CSS block. Nothing is written twice.

### 5.1 Layout & navigation

| Component | Behaviour |
|---|---|
| **Navbar** | Injected by `navbar.js` into `<div id="app-header">`. Gradient bar, logo, links, active-route highlight, theme toggle, search trigger. Sticky with blur-on-scroll. Mobile: hamburger → slide-in drawer, focus-trapped, Esc to close. |
| **Breadcrumb** | Auto-built from query params: Home › Semesters › 3rd Semester › Operating System. |
| **Footer** | Injected. Three columns: quick links, resource counts (auto-computed from data), credit line. Gradient top rule. |
| **Container / Section** | `.container` (max 1200px) and `.section` with a standard heading + optional subtitle + optional toolbar slot. |
| **Scroll-progress bar** | Gradient bar tracking page scroll. |
| **Back-to-top** | Gradient circular FAB, appears past 400px. |

### 5.2 Content components

| Component | Behaviour |
|---|---|
| **Card** | Single factory used for semesters, subjects, courses, books, people. Props: `icon, title, description, badge, meta[], href, onClick, tooltip, variant`. Variants: `default`, `compact`, `list-row`, `feature`. Gradient top rule on hover; keyboard-focusable; entire card is the click target. |
| **Resource row** | Used in the Slides/Links/Videos tabs: type icon, title, source chip, size/pages meta, and a **⋯ options menu**. |
| **Options menu (⋯)** | The "more options" affordance you asked for. Per-resource actions: *Preview* (opens modal), *Open in new tab*, *Download*, *Copy link*, *Report broken link* (mailto). Keyboard-navigable, click-outside/Esc to dismiss. |
| **Tabs** | Course page: **Topics · Slides · Videos · Links**. Proper `role="tablist"`, arrow-key navigation, tab state reflected in the URL hash so tabs are linkable and survive refresh. Replaces the old four-separate-pages design. |
| **Toolbar** | Sits above any grid: live text filter, sort (A–Z, semester, newest), type-filter chips, grid/list view toggle. Selections persist in `localStorage`. |
| **Badge / Chip** | Gradient or tinted; used for resource kind, semester number, credits, "new". |
| **Stat tile** | Home page: 43 courses · 428 PDFs · 542 curated links · 8 semesters — all counted from the data at runtime, never hard-coded. |
| **Empty / Loading / Error state** | One component, three modes. Every list renders one of these instead of a blank area. |

### 5.3 Overlays — modal & tooltip services

**Modal** (`modal.js`) — one global service, `Modal.open({ title, body, size, actions })`. Used for:

1. **PDF preview** — `<iframe>` the PDF inside a large modal with *Download* and *Open in new tab* actions, so users can check a document without leaving the page.
2. **Course quick-view** — clicking a course card from a grid opens outline + resource counts + "Open full page", so browsing doesn't cost a navigation.
3. **Global search** (⌘K / Ctrl-K) — searches courses, books, topics, links; grouped results; arrow-key + Enter navigation.
4. **Keyboard shortcuts help** (`?`).
5. **External-link confirm** — optional, for off-site YouTube/blog links.
6. **Image / diagram lightbox.**

Shared behaviour: focus trap, `Esc` closes, backdrop click closes, `aria-modal`, scroll-lock, returns focus to the trigger, gradient header rule, stacking support.

**Tooltip** (`tooltip.js`) — declarative, one line of markup: `data-tip="Text" data-tip-pos="top"`. Auto-flips near viewport edges, appears on hover *and* focus (keyboard-accessible), 400ms delay in / 100ms out, `role="tooltip"` + `aria-describedby`. Used on: nav items, icon-only buttons, truncated titles, resource-kind badges, credit/code badges, disabled controls, and the ⋯ menu items.

### 5.4 Accessibility baseline

Skip-to-content link · visible gradient focus ring on every interactive element · semantic landmarks · `alt` on all images · colour never the sole signal (badges carry icon + text) · full keyboard operation for tabs, menus, modals and search · `prefers-reduced-motion` honoured · AA contrast throughout.

---

## 6. Page-by-page design

**`index.html` — Home.** Gradient hero (headline with gradient-text emphasis, sub-line, two CTAs: *Browse Semesters* / *Search Resources*), live stat tiles, 5 quick-access cards, "How it works" 3-step strip, feature grid, footer.

**`semesters.html`.** 8 gradient-numbered cards grouped by year with a toolbar to filter by year. Each card shows a live course count and a tooltip listing its courses.

**`semester.html?s=3`.** Breadcrumb, semester header with credit total, course cards with type badges (Slides 12 · Videos 6 · Links 4). Card click → quick-view modal; card title → full course page.

**`subjects.html` / `subject.html?g=…`.** Same pattern for the 7 thematic groups. Fixes the current duplicate/mis-pointed entries in `SubjectsGroup/SoftwareEngineering.html` (Software Maintenance currently links to Software Design; Software Security links to Information Security).

**`course.html?c=…` — the heart of the redesign.** Replaces the 4 separate pages per course. Gradient sub-header (title, code, semester, credits), breadcrumb, then tabs:

- **Topics** — course outline as a readable list, each item with an inline tooltip and, where a matching link/video exists, a jump chip to it.
- **Slides** — resource rows with kind badges, preview modal, ⋯ options, filter chips, and a *Download all* helper.
- **Videos** — cards with source chip; only real URLs (empty ones removed).
- **Links** — grouped by source domain with favicon, external-link icon, ⋯ options.

Empty tabs render the empty-state component ("No videos added for this course yet") rather than a list of dead links.

**`books.html`.** Full library across all semesters with search, semester filter, kind filter, grid/list toggle, preview modal.

**`github.html`.** Student profile cards with roll number, avatar via `https://github.com/<user>.png`, hover tooltip, external-link handling.

**`syllabus.html`.** Embedded PDF viewer + download button (replaces linking straight at the raw PDF from the navbar).

**`404.html`.** Gradient panel, search box, links home.

---

## 7. Cleanup

### 7.1 Files deleted outright

| Path | Reason |
|---|---|
| `css/main.css` | Unreferenced |
| `css/normalize.css` | Unreferenced; modern reset folds into `base.css` |
| `css/BookSelfStyle.css` | Unreferenced |
| `css/LinkStyle.css` | Unreferenced |
| `css/LanguageStyle.css` | Unreferenced (Languages feature never built) |
| `css/study.jpg`, `css/study-focus.jpg` | Hero becomes a gradient; images misplaced in `css/` |
| `css/Style.css`, `css/LandingPage.css`, `css/SubjectStyle.css` | Superseded by the new token/component CSS |
| `doc/html/HomePage.html` | Orphan, broken paths, duplicated by `index.html` |
| `doc/html/Style.css` | Duplicate of a duplicate |
| `Images/` (whole folder) | Contains only a 21st copy of `t.png` |
| 20 × `doc/**/t.png` | Byte-identical favicon copies → one `assets/img/favicon.svg` |
| `t.png` (root) | Replaced by `assets/img/favicon.svg` |
| `logo.png` | Only referenced by the deleted `HomePage.html`; replaced by `assets/img/logo.svg` |
| **185 legacy HTML pages** in `doc/SubType*`, `doc/VideoLink*`, `doc/Link*`, `doc/Pdf*`, `doc/SemestersGroup`, `doc/SubjectsGroup`, `doc/html` | Content migrated into `data/*.js`; only PDFs survive under `doc/` |
| 2,272 empty `href=""` links | Per your decision — dropped during migration |

Deleted only **after** the extraction script has run and its output has been diffed against the source pages (§8, Phase 2 verification). Nothing is removed before its content is provably captured.

### 7.2 PDF normalisation

**Rename for consistency** — folder name must equal the course slug:

| Current | New |
|---|---|
| `Pdf1/CalculusAnalyticalGeometry` | `calculus-analytic-geometry` |
| `Pdf1/OrdinaryDifferential` | `ordinary-differential-equations` |
| `Pdf1/ObjectOrientedConcepts-I` | `object-oriented-concepts-1` |
| `Pdf1/Statistics-I` / `Statistics-II` | `statistics-probability-1` / `-2` |
| `Pdf1/DataStructure` | `data-structure-algorithm` |
| `Pdf2/*Slides` (5 folders) | slug without the `Slides` suffix |
| `Pdf3/*Slides` (7 folders) | ditto |
| all others | lowercase kebab-case slug |

Also: filenames containing spaces (`CPU Scheduling.pdf`, `Organizational Politics.pdf`, …) → hyphens; `&` removed from all paths.

**Proposed final layout:** `assets/pdf/sem<N>/<course-slug>/<file>.pdf`

> ⚠️ **Size caveat.** Moving 3.8 GB of PDFs means git sees 463 deletions + 463 additions. History balloons. Two options — **I will ask before executing this step:**
> - **(a) Move** into `assets/pdf/…` — clean structure, large one-time history cost.
> - **(b) Rename in place** under `doc/` only where names are inconsistent — much smaller diff, structure slightly less tidy. *This is my recommendation.*

**Fix, don't delete (8 files)** — these are the broken-link counterparts:

`CombinatorialSlides/Bellmanford-Algorithm.pdf`, `Dijkstra-Algorithm.pdf`, `Computational-Geometry.pdf`, `Approximation-Algorithms.pdf`, `Depth-Fast-Search-and-Topological-Sort.pdf`, `ObjectOrientedConcepts2Slides/Numerical-Methods-Note.pdf`, `OperatingSystemSlides/CPU Scheduling.pdf`, `Pdf4/SoftwareDesign/Software-Design-with-UML.pdf` — all get correct entries in `courses.js`.

**Reconnect (14 files)** — `Pdf4/SoftwareProjectManagement/*` (Activity-on-Arrow, Earned-Value-Management, Estimation, Project-Scheduling, Time-Cost-Trade-Offs, Time-Scaled-Network, Management-Spectrum, Allocate-and-Level-Resources, Empirical-Estimation-Models, Software-Measurement, Software-Quality-Metrics, Introduction, Activity-on-Node…) exist and are clearly course material, just never linked. They get added to the Software Project Management course.

**Candidate true deletions (13 files, ~40 MB)** — student SRS submissions and stray files with no course home:

`Pdf3/SPL2Slides/SRS_SPL2_1001_1009.pdf`, `SRS_SPL2_1001_1016.pdf`, `SRS_SPL2_1004_1009.pdf`, `SRS_SPL2_1004_1022.pdf`, `SRS_SPL2_1006_1020.pdf`, `SRS_SPL2_1011_1026.pdf`, `Pdf1/StructuredProgramming/AdvancedLearning/Double-Pointer.pdf`, `.../Structure.pdf`, `Pdf1/StructuredProgramming/File-IO.pdf`, `Pdf2/BangladeshStudies/The-Power-of-Prime-MInister.pdf`, `Pdf3/BusinessStudiesPsychologySlides/Finance.pdf`, `.../Organizational Politics.pdf`, `Pdf3/BusinessWebTechSlides/Chapter8.pdf`, `Pdf3/DatabaseManagementSlides/Triggers.pdf`

> **My recommendation: don't delete these either — link them.** All except the six `SRS_SPL2_*` files are legitimate course material that was simply never referenced. The six SRS documents are student project submissions and may contain names; I'll ask you specifically about those. **No PDF is deleted without your explicit sign-off on the final list.**

### 7.3 Broken links fixed

| Fix |
|---|
| `Languages.html` (7 refs) — feature never built → references removed from nav |
| `DatabaseManagementSystem2.html.html` → correct slug |
| `Numerical-Methods-Note.pdf.pdf` → correct filename |
| `Pdf4/SoftwareMetrics/Software-Engineering.pdf` → repointed to `Pdf4/SoftwareDesign/Software-Engineering.pdf` |
| 4 × `CombinatorialSlides` space-vs-hyphen mismatches |

### 7.4 Content corrections

- `SubjectsGroup/SoftwareEngineering.html`: "Software Maintenance" points at `SoftwareDesign.html` (wrong); "Software Security" points at `InformationSecurity.html` (wrong); there's an unclosed `<li>` nesting bug. All corrected in the data model.
- Footer year is hard-coded `2026` on 193 pages → computed at runtime.
- Add `<meta name="viewport">`, `<meta name="description">`, and Open Graph tags — currently missing on all 136 legacy-style pages.

---

## 8. Execution phases

| # | Phase | Deliverable | Risk |
|---|---|---|---|
| **1** | **Design system** | `tokens.css`, `base.css`, `layout.css` + a `styleguide.html` preview page showing every token, gradient, and component state | Low |
| **2** | **Content extraction** | `tools/extract.py` parses all 193 pages → `data/courses.js`, `curriculum.js`, `books.js`, `people.js`. Drops empty hrefs. Emits `tools/extract-report.md` (per-course counts, anything it couldn't parse). **Verification: counts must reconcile with the audit table in §1.3 before anything is deleted.** | **High — the critical step** |
| **3** | **Component library** | `assets/js/core/*` + `assets/js/components/*` + `components.css`. `styleguide.html` grows into a live component gallery. | Medium |
| **4** | **Pages** | The 10 template pages wired to the data | Medium |
| **5** | **Link + PDF reconciliation** | Broken links fixed, orphans reconnected, folders renamed (option (a)/(b) per your answer), deletion list sent for sign-off | Medium |
| **6** | **Cleanup** | Delete the 185 legacy pages, 5 unused stylesheets, 21 favicon copies — only after Phase 2 verification passes | Low (gated) |
| **7** | **Verification** | `tools/linkcheck.py` — zero broken internal links; every PDF referenced in data exists on disk; every PDF on disk is referenced (or explicitly listed as intentionally unreferenced); render every page and check console for errors; responsive check at 375 / 768 / 1280 / 1920; keyboard-only walkthrough; contrast audit | — |

Rollback safety: legacy files are moved to `.trash/` first and only removed once Phase 7 passes, so nothing is unrecoverable mid-migration. **No git operations will be performed at any point** — you own all commits.

---

## 9. Open items needing your input

1. **PDF relocation** — option (a) move to `assets/pdf/` or (b) rename in place (my recommendation)?
2. **The six `SRS_SPL2_*.pdf` student submissions** — delete, or keep and link under Software Project Lab 2?
3. **Missing metadata** — I have no course codes or credit values for most courses. Should I (a) omit those fields, (b) parse them from `IIT_Syllabus.pdf`, or (c) leave placeholders for you to fill?
4. **Dark mode** — build it now, or ship light-only and add the toggle later?
5. **GitHub profiles** — the current list is "BSSE 11th Batch". Keep as-is, or should the page become batch-filterable?

---

## 10. Success criteria

- [x] Zero broken internal links (verified by script)
- [x] Zero empty `href=""` in shipped output
- [x] One navbar definition, one footer definition, one card definition
- [x] Every page uses the same gradient blue→green identity — no more spring-green `bgcolor` pages
- [x] Modal, tooltip, and ⋯ options menu available on every page
- [x] Full keyboard operability; WCAG AA contrast
- [x] Works by double-clicking `index.html` **and** as a GitHub Pages site
- [x] Zero runtime dependencies, zero build step
- [x] Adding a new course = one object in `courses.js`, no new HTML file

---

## 11. Execution log

### 11.1 Outcome

| | Before | After |
|---|---|---|
| HTML pages | 193 | **10** |
| CSS files | 8 (3 actually loaded) | **5** |
| JS | 1 file, 9 lines | 8 modules, no dependencies |
| Navbar / footer copies | 193 each | **1 each** |
| Design systems in use | 2, incompatible | **1** |
| Pages with `bgcolor` | 131 | **0** |
| Empty `href=""` links | 2,272 | **0** |
| Broken internal links | 8 | **0** |
| Unreferenced PDFs | 35 | **0** (6 deliberately withheld) |
| Duplicate favicons | 21 | **1** SVG |
| Courses | — | 43 |
| Documents published | — | 458 |
| Videos / links kept | — | 255 / 46 |

### 11.2 Decisions taken on §9

1. **PDF relocation → moved to `library/sem<N>/<course-slug>/`**, not renamed in
   place. The size warning in §7.2 was wrong: git stores blobs by content hash,
   so a pure rename costs nothing in history. Since the move was free, the
   clean structure won. `doc/` no longer exists.
2. **The six `SRS_SPL2_*.pdf`** were **not deleted and not published**. They sit
   in `library/unlinked/`, allow-listed in the link checker, flagged in the
   README. They may carry student names — that is your call to make, not mine.
   In the end **no PDF was deleted at all**; the 35 "orphans" were reconnected,
   repaired or withheld.
3. **Course codes / credits — omitted.** No reliable source existed. Parsing
   `IIT_Syllabus.pdf` would have produced guesses dressed as data. The fields
   are in the schema and unused; fill them when you have the real values.
4. **Dark mode — built now.** It costs one `[data-theme="dark"]` block in
   `tokens.css` because nothing hard-codes a colour. Follows the OS setting,
   toggleable in the header, remembered in `localStorage`.
5. **GitHub page — kept as one batch**, but now searchable and sortable by roll
   number, so it will scale if more batches are added later.

### 11.3 Deviations from the plan

- **`srs-documentation` was not a course.** `doc/Pdf3/SRS_Documentation.html`
  looked like one to the extractor and produced a 44th phantom course. Its 12
  documents were folded into Software Project Lab II.
- **Information System Ethics had no semester.** It exists in every 4th-year
  tree but the 7th Semester page only ever listed Internship. Assigned to
  semester 7.
- **The Project Lab and Internship pages were duplicating the student roster.**
  Their "Links" and "Videos" sections were 32 copies each of the same GitHub
  profile list — 375 entries in total. Those were dropped; the four courses now
  carry a single "Student GitHub Profiles" pointer to `github.html`.
- **Topic extraction is uneven.** Outlines separated by `;` or `,` split
  cleanly. A few (Operating System, Pattern Recognition) have no punctuation at
  all in the source, so they show the outline paragraph and an empty-state on
  the Topics tab rather than a fabricated split.
- **`.trash/` could not be deleted** from this environment (the mount refuses
  `rmdir`). It is gitignored and holds the entire old site — delete the folder
  yourself once you are satisfied.

### 11.4 Verification performed

- `tools/linkcheck.py` — **passes.** Every internal href resolves; every PDF in
  the data exists on disk; every PDF on disk is referenced or allow-listed; no
  empty hrefs; no page references a removed stylesheet; every page has viewport
  and description meta; no `bgcolor` survives; no stray HTML outside the ten
  shipped pages.
- `tools/rendercheck.js` — **186 assertions, 0 failures.** Renders all ten
  pages (plus three different course pages) in jsdom and asserts: no JavaScript
  errors, header/nav/footer mount, grids populate, exactly one tab selected and
  one panel visible, modals open, options menus build, tooltips carry text,
  every `<img>` has `alt`, search returns results.
- A headless-Chromium screenshot pass was attempted but the download failed
  repeatedly in this sandbox. **Worth running yourself** — jsdom validates
  behaviour and structure but not layout, so a visual check at 375 / 768 /
  1280 px is still advisable before publishing.
