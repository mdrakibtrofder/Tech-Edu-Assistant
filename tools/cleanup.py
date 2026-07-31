#!/usr/bin/env python3
"""
Remove the legacy site.

Everything listed below has been migrated into data/*.js (content) or
library/ (PDFs). This script moves it to .trash/ first so the migration can
be inspected or reversed; run with --purge once tools/linkcheck.py passes.

Usage:
    python3 tools/cleanup.py --dry-run   # report only
    python3 tools/cleanup.py             # move to .trash/
    python3 tools/cleanup.py --purge     # delete .trash/ for good
"""

import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRASH = os.path.join(ROOT, ".trash")

DRY = "--dry-run" in sys.argv
PURGE = "--purge" in sys.argv

# path -> why it goes
TARGETS = [
    # --- unused stylesheets (referenced by nothing, even before the rebuild)
    ("css/main.css", "unreferenced"),
    ("css/normalize.css", "unreferenced; replaced by assets/css/base.css"),
    ("css/BookSelfStyle.css", "unreferenced"),
    ("css/LinkStyle.css", "unreferenced"),
    ("css/LanguageStyle.css", "unreferenced; Languages feature never existed"),
    # --- superseded stylesheets
    ("css/Style.css", "superseded by assets/css/*"),
    ("css/LandingPage.css", "superseded by assets/css/*"),
    ("css/SubjectStyle.css", "superseded by assets/css/*"),
    # --- misplaced image assets
    ("css/study.jpg", "hero is now a gradient; image was inside css/"),
    ("css/study-focus.jpg", "unused"),
    # --- duplicated favicons and logo
    ("Images", "contained only a 21st copy of t.png"),
    ("t.png", "replaced by assets/img/favicon.svg"),
    ("logo.png", "only used by the deleted HomePage.html"),
    # --- the old 9-line script, replaced by assets/js/*
    ("js/main.js", "superseded by assets/js/*"),
    # --- the legacy page trees, all migrated into data/*.js
    ("doc/html", "migrated: Books, Github, Semesters, Subjects, HomePage"),
    ("doc/SemestersGroup", "migrated into data/curriculum.js"),
    ("doc/SubjectsGroup", "migrated into data/curriculum.js"),
    ("doc/SubType1", "migrated into data/courses.js (topics)"),
    ("doc/SubType2", "migrated into data/courses.js (topics)"),
    ("doc/SubType3", "migrated into data/courses.js (topics)"),
    ("doc/SubType4", "migrated into data/courses.js (topics)"),
    ("doc/Link1", "migrated into data/courses.js (links)"),
    ("doc/Link2", "migrated into data/courses.js (links)"),
    ("doc/Link3", "migrated into data/courses.js (links)"),
    ("doc/Link4", "migrated into data/courses.js (links)"),
    ("doc/VideoLink1", "migrated into data/courses.js (videos)"),
    ("doc/VideoLink2", "migrated into data/courses.js (videos)"),
    ("doc/VideoLink3", "migrated into data/courses.js (videos)"),
    ("doc/VideoLink4", "migrated into data/courses.js (videos)"),
    ("doc/Pdf1", "PDFs moved to library/; pages migrated into data/courses.js"),
    ("doc/Pdf2", "PDFs moved to library/; pages migrated into data/courses.js"),
    ("doc/Pdf3", "PDFs moved to library/; pages migrated into data/courses.js"),
    ("doc/Pdf4", "PDFs moved to library/; pages migrated into data/courses.js"),
]


def guard():
    """Refuse to run if any PDF is still sitting inside doc/."""
    stragglers = []
    for root, _dirs, files in os.walk(os.path.join(ROOT, "doc")):
        for f in files:
            if f.lower().endswith(".pdf"):
                stragglers.append(os.path.relpath(os.path.join(root, f), ROOT))
    if stragglers:
        print("REFUSING TO RUN - PDFs are still under doc/:")
        for s in stragglers[:20]:
            print("  ", s)
        print("Run tools/normalize_pdfs.py first.")
        return False
    return True


def main():
    if PURGE:
        if not os.path.exists(TRASH):
            print("nothing to purge")
            return 0
        n = sum(len(f) for _r, _d, f in os.walk(TRASH))
        if DRY:
            print(f"would delete .trash/ ({n} files)")
            return 0
        shutil.rmtree(TRASH)
        print(f"purged .trash/ ({n} files)")
        return 0

    if not guard():
        return 1

    moved, missing = 0, 0
    for rel, reason in TARGETS:
        src = os.path.join(ROOT, rel)
        if not os.path.exists(src):
            missing += 1
            continue
        print(f"  {rel:34s}  {reason}")
        if DRY:
            moved += 1
            continue
        dst = os.path.join(TRASH, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.exists(dst):
            shutil.rmtree(dst) if os.path.isdir(dst) else os.remove(dst)
        shutil.move(src, dst)
        moved += 1

    # drop now-empty parents (moved rather than rmdir'd - some mounted
    # filesystems refuse rmdir but allow rename)
    if not DRY:
        for rel in ("doc", "css", "js"):
            p = os.path.join(ROOT, rel)
            if os.path.isdir(p) and not os.listdir(p):
                shutil.move(p, os.path.join(TRASH, rel + "-empty"))
                print(f"  {rel:34s}  removed (now empty)")

    verb = "would move" if DRY else "moved"
    print(f"\n{verb} {moved} paths to .trash/ ({missing} already gone)")
    if not DRY:
        print("Run tools/linkcheck.py, then tools/cleanup.py --purge to delete for good.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
