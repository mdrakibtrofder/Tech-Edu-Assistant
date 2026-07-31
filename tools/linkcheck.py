#!/usr/bin/env python3
"""
Verification pass.

  1. Every internal href in the shipped HTML resolves to a file on disk.
  2. Every asset referenced by an HTML page exists.
  3. Every PDF referenced in data/*.js exists on disk.
  4. Every PDF on disk is either referenced or explicitly allow-listed.
  5. No empty href="" survives anywhere.
  6. No page references a deleted legacy stylesheet.

Exits non-zero if anything fails.

Usage:  python3 tools/linkcheck.py
"""

import json
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# PDFs deliberately kept on disk but not linked from the site.
# (Student SRS submissions - retained, but not published pending a decision.)
ALLOW_UNREFERENCED = [
    re.compile(r"^library/unlinked/", re.I),
]

PDF_ROOT = "library"

SHIPPED_HTML = [
    "index.html", "semesters.html", "semester.html", "subjects.html",
    "subject.html", "course.html", "books.html", "github.html",
    "syllabus.html", "404.html",
]

failures = []
notes = []


def fail(msg):
    failures.append(msg)


def read(path):
    with open(path, encoding="utf-8", errors="ignore") as fh:
        return fh.read()


def resolve(base_dir, href):
    href = urllib.parse.unquote(href.split("#")[0].split("?")[0])
    if not href:
        return None
    return os.path.normpath(os.path.join(base_dir, href))


# ---------------------------------------------------------------------------
# 1-2. HTML references
# ---------------------------------------------------------------------------

def check_html():
    for name in SHIPPED_HTML:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            fail(f"missing shipped page: {name}")
            continue
        src = read(path)

        if 'href=""' in src:
            fail(f'{name}: contains an empty href=""')

        for attr in ("href", "src"):
            for ref in re.findall(rf'{attr}="([^"]*)"', src):
                if ref.startswith(("http://", "https://", "#", "mailto:", "data:", "javascript:")):
                    continue
                if not ref:
                    fail(f"{name}: empty {attr}")
                    continue
                target = resolve(ROOT, ref)
                if target and not os.path.exists(target):
                    fail(f"{name}: {attr} -> missing {ref}")

        for dead in ("css/Style.css", "css/LandingPage.css", "css/SubjectStyle.css",
                     "css/main.css", "css/normalize.css", "doc/html/HomePage.html"):
            if dead in src:
                fail(f"{name}: still references removed file {dead}")

        if 'bgcolor' in src:
            fail(f"{name}: uses the deprecated bgcolor attribute")
        if 'name="viewport"' not in src:
            fail(f"{name}: missing viewport meta")
        if 'name="description"' not in src:
            fail(f"{name}: missing description meta")


# ---------------------------------------------------------------------------
# 3-4. Data references
# ---------------------------------------------------------------------------

def load_data(name, key):
    path = os.path.join(ROOT, "data", name)
    if not os.path.exists(path):
        fail(f"missing data file: data/{name}")
        return []
    src = read(path)
    marker = f"window.TEA.{key} = "
    if marker not in src:
        fail(f"data/{name}: no {key} export")
        return []
    chunk = src[src.index(marker) + len(marker):]
    depth, end, instr, esc = 0, None, False, False
    for i, ch in enumerate(chunk):
        if instr:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                instr = False
            continue
        if ch == '"':
            instr = True
        elif ch in "[{":
            depth += 1
        elif ch in "]}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    return json.loads(chunk[:end])


def check_data():
    courses = load_data("courses.js", "courses")
    books = load_data("books.js", "books")
    semesters = load_data("curriculum.js", "semesters")
    groups = load_data("curriculum.js", "groups")
    people = load_data("people.js", "people")

    referenced = set()
    slugs = {c["slug"] for c in courses}

    for c in courses:
        for s in c.get("slides", []):
            p = os.path.join(ROOT, s["file"])
            if not os.path.exists(p):
                fail(f"courses.js: {c['slug']} -> missing PDF {s['file']}")
            referenced.add(os.path.normpath(p))
        for bucket in ("videos", "links"):
            for item in c.get(bucket, []):
                if not item.get("url"):
                    fail(f"courses.js: {c['slug']} has an empty {bucket} url")
        if c.get("semester") is None:
            fail(f"courses.js: {c['slug']} has no semester")

    for b in books:
        p = os.path.join(ROOT, b["file"])
        if not os.path.exists(p):
            fail(f"books.js: missing PDF {b['file']}")
        referenced.add(os.path.normpath(p))

    for s in semesters:
        for slug in s["courses"]:
            if slug not in slugs:
                fail(f"curriculum.js: semester {s['number']} references unknown course {slug}")

    for g in groups:
        for slug in g["courses"]:
            if slug not in slugs:
                fail(f"curriculum.js: group {g['slug']} references unknown course {slug}")

    for p in people:
        if not p.get("url", "").startswith("https://github.com/"):
            fail(f"people.js: bad profile url for {p.get('name')}")

    # syllabus is linked from syllabus.html, not from the data
    referenced.add(os.path.normpath(os.path.join(ROOT, "library/syllabus/IIT-Syllabus.pdf")))

    unreferenced = []
    for root, _dirs, files in os.walk(os.path.join(ROOT, PDF_ROOT)):
        for f in files:
            if not f.lower().endswith(".pdf"):
                continue
            full = os.path.normpath(os.path.join(root, f))
            if full in referenced:
                continue
            rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
            if any(rx.search(rel) for rx in ALLOW_UNREFERENCED):
                notes.append(f"allow-listed unreferenced: {rel}")
                continue
            unreferenced.append(rel)

    for rel in unreferenced:
        fail(f"PDF on disk is referenced by nothing: {rel}")

    notes.append(f"courses={len(courses)} books={len(books)} people={len(people)} "
                 f"referenced_pdfs={len(referenced)}")


# ---------------------------------------------------------------------------
# 5. Legacy leftovers
# ---------------------------------------------------------------------------

def check_leftovers():
    gone = ["css", "doc", "js", "Images", "t.png", "logo.png"]
    for rel in gone:
        if os.path.exists(os.path.join(ROOT, rel)):
            fail(f"legacy path still present: {rel}")

    # no stray HTML anywhere except the ten shipped pages
    for root, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in (".git", ".trash", "node_modules")]
        for f in files:
            if not f.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(root, f), ROOT).replace(os.sep, "/")
            if rel not in SHIPPED_HTML:
                fail(f"unexpected HTML file: {rel}")
            if f == "t.png":
                fail(f"duplicate favicon still present: {rel}")


def main():
    check_html()
    check_data()
    check_leftovers()

    for n in notes:
        print("note:", n)

    if failures:
        print(f"\nFAILED - {len(failures)} problem(s):")
        for f in failures:
            print("  -", f)
        return 1

    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
