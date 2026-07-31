#!/usr/bin/env python3
"""
Generate the site's HTML shells.

Every page shares one <head>, one header mount and one footer mount, so the
boilerplate is defined here once instead of being copy-pasted into 10 files
(the legacy site copied it into 193).

Usage:  python3 tools/build_pages.py
"""

import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SCRIPTS = [
    "data/curriculum.js",
    "data/courses.js",
    "data/books.js",
    "data/people.js",
    "assets/js/core/dom.js",
    "assets/js/core/router.js",
    "assets/js/core/store.js",
    "assets/js/components/modal.js",
    "assets/js/components/tooltip.js",
    "assets/js/components/menu.js",
    "assets/js/components/ui.js",
    "assets/js/components/shell.js",
    "assets/js/pages/pages.js",
]

STYLES = [
    "assets/css/tokens.css",
    "assets/css/base.css",
    "assets/css/layout.css",
    "assets/css/components.css",
    "assets/css/utilities.css",
]

SHELL = """<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#2563eb">
  <meta name="description" content="{description}">
  <meta name="color-scheme" content="light dark">

  <title>{title}</title>

  <meta property="og:type" content="website">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="assets/img/og-image.svg">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
{styles}
</head>

<body class="page" data-page="{page}">
  <a class="skip-link" href="#main">Skip to content</a>

  <div id="app-header"></div>

  <main id="main">
{body}
  </main>

  <div id="app-footer"></div>

{scripts}
</body>

</html>
"""


def render(page, title, description, body):
    styles = "\n".join(f'  <link rel="stylesheet" href="{s}">' for s in STYLES)
    scripts = "\n".join(f'  <script src="{s}"></script>' for s in SCRIPTS)
    return SHELL.format(
        page=page, title=title, description=description,
        body=body, styles=styles, scripts=scripts,
    )


# ---------------------------------------------------------------------------
# page bodies
# ---------------------------------------------------------------------------

HOME = """    <section class="hero">
      <div class="container">
        <div class="hero__inner">
          <span class="hero__badge"><span>CSE &amp; SE</span> Resource Library</span>
          <h1>Everything you need for the <em>Software Engineering</em> curriculum.</h1>
          <p>Lecture slides, reference books, video tutorials and hand-picked links - organised
            by semester and by subject, in one place, with nothing to install.</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="semesters.html">Browse semesters</a>
            <button class="btn btn--on-dark" type="button" data-action="search">Search resources</button>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--tight">
      <div class="container">
        <div class="stats" id="stats"></div>
      </div>
    </section>

    <section class="section" id="explore">
      <div class="container">
        <div class="section-head">
          <div class="section-head__text">
            <span class="eyebrow">Start here</span>
            <h2>Quick <span class="grad-text">access</span></h2>
            <p>Five ways into the library. Pick whichever matches how you think about your coursework.</p>
          </div>
        </div>
        <div class="grid" id="quick-access"></div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <div class="section-head">
          <div class="section-head__text">
            <span class="eyebrow">How it works</span>
            <h2>Three steps to the file you need</h2>
          </div>
        </div>
        <div class="steps">
          <div class="step">
            <h3>Pick a semester or subject</h3>
            <p>Every course is filed under both, so use whichever route you have in mind.</p>
          </div>
          <div class="step">
            <h3>Open the course</h3>
            <p>Outline, topics, slides, videos and links sit behind four tabs on a single page.</p>
          </div>
          <div class="step">
            <h3>Preview, then download</h3>
            <p>Check a PDF in the preview window before committing to the download.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div class="section-head__text">
            <span class="eyebrow">Best stocked</span>
            <h2>Courses with the most <span class="grad-text">material</span></h2>
            <p>These courses have the deepest collections of slides, videos and references.</p>
          </div>
          <a class="btn btn--outline" href="semesters.html">All courses</a>
        </div>
        <div class="grid" id="rich-courses"></div>
      </div>
    </section>
"""

LISTING = """    <section class="page-head">
      <div class="container" id="page-head">
{head}
      </div>
    </section>

    <section class="section">
      <div class="container" id="listing">
        <div class="grid" id="grid"></div>
      </div>
    </section>
"""


def listing(head):
    return LISTING.format(head=head)


STATIC_HEAD = """        <h1>{h1}</h1>
        <p>{lead}</p>"""

PAGES = [
    dict(
        file="index.html", page="home",
        title="Tech Edu Assistant - CSE &amp; SE Resource Library",
        description="A curated library of lecture slides, books, video tutorials and reference links for the Computer Science and Software Engineering curriculum.",
        body=HOME,
    ),
    dict(
        file="semesters.html", page="semesters",
        title="Semesters - Tech Edu Assistant",
        description="Browse course materials semester by semester across the full four-year programme.",
        body=listing(STATIC_HEAD.format(
            h1="Semester-wise learning",
            lead="Eight semesters across four years. Open any semester to see its courses, "
                 "lecture slides, video tutorials and reference links.")),
    ),
    dict(
        file="semester.html", page="semester",
        title="Semester - Tech Edu Assistant",
        description="Courses and materials for a single semester.",
        body=listing(""),
    ),
    dict(
        file="subjects.html", page="subjects",
        title="Subjects - Tech Edu Assistant",
        description="Browse the same courses regrouped by subject area - programming, mathematics, software engineering and more.",
        body=listing(STATIC_HEAD.format(
            h1="Subject-wise learning",
            lead="The same courses, regrouped by theme. Useful when you know the topic "
                 "but not which semester it belongs to.")),
    ),
    dict(
        file="subject.html", page="subject",
        title="Subject - Tech Edu Assistant",
        description="Courses grouped under a single subject area.",
        body=listing(""),
    ),
    dict(
        file="books.html", page="books",
        title="Books &amp; Documents - Tech Edu Assistant",
        description="The complete PDF library: textbooks, lecture slides and notes from every course, searchable in one place.",
        body=listing(STATIC_HEAD.format(
            h1="Books &amp; documents",
            lead="Every PDF in the library - textbooks, lecture slides and notes - "
                 "searchable and filterable in one place. Click any card to preview it.")),
    ),
    dict(
        file="github.html", page="github",
        title="Student GitHub Profiles - Tech Edu Assistant",
        description="GitHub profiles of the BSSE batch - project lab and internship repositories.",
        body=listing(STATIC_HEAD.format(
            h1="Student GitHub profiles",
            lead="Project Lab and Internship repositories from the BSSE 11th batch. "
                 "Useful for seeing how others structured the same assignments.")),
    ),
]

COURSE = """    <section class="page-head">
      <div class="container" id="page-head"></div>
    </section>

    <section class="section">
      <div class="container" id="course-body"></div>
    </section>
"""

SYLLABUS = """    <section class="page-head">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="index.html">Home</a></li>
            <li><span aria-current="page">Syllabus</span></li>
          </ol>
        </nav>
        <h1>Course curriculum</h1>
        <p>The official IIT syllabus covering every course in the programme, its credit weighting
          and its prerequisites. Read it below or download a copy.</p>
        <div class="page-head__meta">
          <a class="btn btn--on-dark btn--sm" href="library/syllabus/IIT-Syllabus.pdf" target="_blank" rel="noopener"
             data-tip="Opens the PDF in a new tab">Open in new tab</a>
          <a class="btn btn--on-dark btn--sm" href="library/syllabus/IIT-Syllabus.pdf" download
             data-tip="Save the PDF to your device">Download PDF</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="viewer">
          <iframe src="library/syllabus/IIT-Syllabus.pdf" title="IIT Syllabus" loading="lazy"></iframe>
        </div>
        <p class="text-sm text-muted mt-4">If the document does not display, your browser may block
          embedded PDFs - use <strong>Open in new tab</strong> above.</p>
      </div>
    </section>
"""

NOTFOUND = """    <section class="page-head">
      <div class="container">
        <h1>Page not found</h1>
        <p>That address does not match anything in the library. It may have moved when the site was rebuilt.</p>
      </div>
    </section>

    <section class="section">
      <div class="container container--narrow">
        <div class="state">
          <div class="state__icon" aria-hidden="true"></div>
          <h3>Try one of these instead</h3>
          <p>Or press <kbd>/</kbd> anywhere on the site to search everything.</p>
          <div class="flex flex-wrap gap-3 mt-4" style="justify-content:center">
            <a class="btn btn--primary" href="index.html">Home</a>
            <a class="btn btn--ghost" href="semesters.html">Semesters</a>
            <a class="btn btn--ghost" href="subjects.html">Subjects</a>
            <a class="btn btn--ghost" href="books.html">Books</a>
          </div>
        </div>
      </div>
    </section>
"""

PAGES += [
    dict(file="course.html", page="course",
         title="Course - Tech Edu Assistant",
         description="Course outline, lecture slides, video tutorials and reference links.",
         body=COURSE),
    dict(file="syllabus.html", page="syllabus",
         title="Syllabus - Tech Edu Assistant",
         description="The official IIT curriculum document for the Software Engineering programme.",
         body=SYLLABUS),
    dict(file="404.html", page="notfound",
         title="Page not found - Tech Edu Assistant",
         description="The requested page could not be found.",
         body=NOTFOUND),
]


def main():
    for spec in PAGES:
        html = render(spec["page"], spec["title"], spec["description"], spec["body"])
        path = os.path.join(ROOT, spec["file"])
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(html)
        print("wrote", spec["file"])


if __name__ == "__main__":
    main()
