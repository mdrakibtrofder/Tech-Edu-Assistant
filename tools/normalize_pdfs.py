#!/usr/bin/env python3
"""
Normalise the PDF library.

The legacy tree mixed naming conventions (`CalculusAnalyticalGeometry` vs
`Calculus&AnalyticGeometry`, some folders suffixed `Slides`, filenames with
spaces and `&`). This moves every referenced PDF to:

    library/sem<N>/<course-slug>/<Clean-File-Name>.pdf

...and rewrites the paths in data/*.js to match. Files that are on disk but
referenced by nothing go to library/unlinked/ rather than being deleted -
nothing is destroyed by this script.

These are pure renames: git records them as moves, so repository history does
not grow. Run AFTER tools/extract.py, BEFORE tools/cleanup.py.

Usage:
    python3 tools/normalize_pdfs.py --dry-run    # report only
    python3 tools/normalize_pdfs.py              # apply
"""

import json
import os
import re
import shutil
import sys
import unicodedata
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
LIB = os.path.join(ROOT, "library")

DRY = "--dry-run" in sys.argv


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def load(name, key):
    src = read(os.path.join(DATA, name))
    marker = f"window.TEA.{key} = "
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


def clean_filename(name):
    """Teach-Yourself C&C++.pdf -> Teach-Yourself-C-and-Cpp.pdf"""
    stem, ext = os.path.splitext(name)
    stem = unicodedata.normalize("NFKD", stem)
    stem = stem.replace("&", "-and-").replace("+", "p")
    stem = re.sub(r"[^\w\s.-]", "", stem)
    stem = re.sub(r"[\s_]+", "-", stem)
    stem = re.sub(r"-{2,}", "-", stem).strip("-.")
    return (stem or "document") + ext.lower()


def main():
    courses = load("courses.js", "courses")
    books = load("books.js", "books")

    # --- decide a destination for every referenced PDF ---------------------
    plan = {}          # old relative path -> new relative path
    owners = {}        # old path -> owning course slug (first wins)

    for c in courses:
        sem = c.get("semester") or 0
        for s in c.get("slides", []):
            old = s["file"]
            if old in plan:
                continue
            owners[old] = c["slug"]
            plan[old] = "library/sem{}/{}/{}".format(sem, c["slug"], clean_filename(os.path.basename(old)))

    for b in books:
        old = b["file"]
        if old in plan:
            continue
        plan[old] = "library/featured/" + clean_filename(os.path.basename(old))

    syllabus_old = "doc/html/IIT_Syllabus.pdf"
    plan[syllabus_old] = "library/syllabus/IIT-Syllabus.pdf"

    # --- unreferenced files go to library/unlinked/ ------------------------
    referenced = {os.path.normpath(os.path.join(ROOT, p)) for p in plan}
    unlinked = []
    for root, _dirs, files in os.walk(os.path.join(ROOT, "doc")):
        for f in files:
            if not f.lower().endswith(".pdf"):
                continue
            full = os.path.normpath(os.path.join(root, f))
            if full in referenced:
                continue
            rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
            plan[rel] = "library/unlinked/" + clean_filename(f)
            unlinked.append(rel)

    # --- guard against collisions -----------------------------------------
    dest_count = defaultdict(list)
    for old, new in plan.items():
        dest_count[new].append(old)
    for new, olds in dest_count.items():
        if len(olds) > 1:
            for n, old in enumerate(olds[1:], start=2):
                stem, ext = os.path.splitext(new)
                plan[old] = f"{stem}-{n}{ext}"

    print(f"{len(plan)} PDFs to relocate "
          f"({len(unlinked)} unreferenced -> library/unlinked/)")

    renamed = sum(1 for o, n in plan.items()
                  if os.path.basename(o) != os.path.basename(n))
    print(f"{renamed} filenames cleaned (spaces, '&', punctuation)")

    if DRY:
        for old, new in sorted(plan.items())[:25]:
            print(f"  {old}\n    -> {new}")
        print("  ... (dry run, nothing written)")
        return 0

    # --- move --------------------------------------------------------------
    moved = 0
    for old, new in sorted(plan.items()):
        src = os.path.join(ROOT, old)
        dst = os.path.join(ROOT, new)
        if not os.path.exists(src):
            print("  ! missing, skipped:", old)
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)
        moved += 1
    print(f"moved {moved} files")

    # --- rewrite data paths ------------------------------------------------
    for name in ("courses.js", "books.js"):
        path = os.path.join(DATA, name)
        src = read(path)
        for old, new in plan.items():
            src = src.replace('"' + old + '"', '"' + new + '"')
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(src)
    print("rewrote data/courses.js and data/books.js")

    # --- rewrite the syllabus page ----------------------------------------
    syl = os.path.join(ROOT, "syllabus.html")
    if os.path.exists(syl):
        src = read(syl).replace(syllabus_old, plan[syllabus_old])
        with open(syl, "w", encoding="utf-8") as fh:
            fh.write(src)
        print("rewrote syllabus.html")

    # also update the generator so a rebuild keeps the new path
    gen = os.path.join(ROOT, "tools", "build_pages.py")
    if os.path.exists(gen):
        src = read(gen).replace(syllabus_old, plan[syllabus_old])
        with open(gen, "w", encoding="utf-8") as fh:
            fh.write(src)
        print("rewrote tools/build_pages.py")

    # --- write an inventory ------------------------------------------------
    lines = ["# PDF library inventory", "",
             f"{moved} files under `library/`. Generated by `tools/normalize_pdfs.py`.", "",
             "| New path | Was |", "|---|---|"]
    for old, new in sorted(plan.items(), key=lambda kv: kv[1]):
        lines.append(f"| `{new}` | `{old}` |")
    with open(os.path.join(ROOT, "tools", "pdf-inventory.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("wrote tools/pdf-inventory.md")

    return 0


if __name__ == "__main__":
    sys.exit(main())
