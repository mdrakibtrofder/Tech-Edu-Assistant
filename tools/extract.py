#!/usr/bin/env python3
"""
Tech Edu Assistant - one-time content migration.

Parses the 193 legacy HTML pages under doc/ and emits the data files that the
redesigned site runs on:

    data/curriculum.js   semesters + subject groups
    data/courses.js      43 courses: outline, topics, videos, links, slides
    data/books.js        book library
    data/people.js       github profiles

Also writes tools/extract-report.md with per-course counts so the output can be
reconciled against the audit before anything is deleted.

Usage:  python3 tools/extract.py
"""

import json
import os
import re
import sys
import unicodedata
import urllib.parse
from collections import OrderedDict, defaultdict

from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC = os.path.join(ROOT, "doc")
DATA = os.path.join(ROOT, "data")
TOOLS = os.path.join(ROOT, "tools")

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

stats = defaultdict(int)
warnings = []


def warn(msg):
    warnings.append(msg)


def soup_of(path):
    with open(path, encoding="utf-8", errors="ignore") as fh:
        return BeautifulSoup(fh.read(), "html.parser")


def clean(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", text).strip()


def slugify(text):
    text = unicodedata.normalize("NFKD", text)
    text = text.replace("&", " and ")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[\s_]+", "-", text)


def basename_slug(href):
    """doc/Pdf1/Calculus&AnalyticGeometry.html -> calculus-and-analytic-geometry"""
    name = os.path.basename(urllib.parse.unquote(href)).rsplit(".", 1)[0]
    # split CamelCase into words so slugs read well
    name = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name)
    name = re.sub(r"(?<=[A-Za-z])(?=\d)", " ", name)
    return slugify(name)


def domain_of(url):
    try:
        host = urllib.parse.urlparse(url).netloc.lower()
    except ValueError:
        return ""
    return host[4:] if host.startswith("www.") else host


SOURCE_NAMES = {
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "geeksforgeeks.org": "GeeksforGeeks",
    "programiz.com": "Programiz",
    "tutorialspoint.com": "TutorialsPoint",
    "guru99.com": "Guru99",
    "w3schools.com": "W3Schools",
    "javatpoint.com": "JavaTpoint",
    "khanacademy.org": "Khan Academy",
    "wikipedia.org": "Wikipedia",
    "en.wikipedia.org": "Wikipedia",
    "coursera.org": "Coursera",
    "udemy.com": "Udemy",
    "edx.org": "edX",
    "medium.com": "Medium",
    "github.com": "GitHub",
    "stackoverflow.com": "Stack Overflow",
    "ibm.com": "IBM",
    "microsoft.com": "Microsoft",
    "oracle.com": "Oracle",
    "mit.edu": "MIT",
    "stanford.edu": "Stanford",
    "developer.mozilla.org": "MDN",
    "freecodecamp.org": "freeCodeCamp",
    "baeldung.com": "Baeldung",
    "refactoring.guru": "Refactoring Guru",
    "martinfowler.com": "Martin Fowler",
    "atlassian.com": "Atlassian",
    "scrum.org": "Scrum.org",
    "owasp.org": "OWASP",
    "kaggle.com": "Kaggle",
    "towardsdatascience.com": "Towards Data Science",
}


def source_of(url):
    host = domain_of(url)
    if host in SOURCE_NAMES:
        return SOURCE_NAMES[host]
    for key, name in SOURCE_NAMES.items():
        if host.endswith("." + key):
            return name
    parts = host.split(".")
    return parts[-2].capitalize() if len(parts) >= 2 else host


def is_video(url):
    return domain_of(url) in ("youtube.com", "youtu.be", "vimeo.com")


def is_student_profile(url):
    """The four Project Lab / Internship pages duplicate the whole student GitHub
    roster as 'links' and 'videos'. Those belong on github.html, not on a course."""
    if domain_of(url) != "github.com":
        return False
    path = urllib.parse.urlparse(url).path.strip("/")
    return path and "/" not in path  # bare profile, not a repo


# ---------------------------------------------------------------------------
# canonical course identity
# ---------------------------------------------------------------------------
# Legacy filenames differ slightly between the four parallel trees, so map every
# legacy stem onto one canonical slug.

COURSE_TITLES = {
    "structured-programming": "Structured Programming",
    "discrete-mathematics": "Discrete Mathematics",
    "calculus-and-analytic-geometry": "Calculus and Analytic Geometry",
    "statistics-and-probability-1": "Probability and Statistics for Engineers I",
    "sociology": "Sociology",
    "introduction-to-se": "Introduction to Software Engineering",
    "data-structure-algorithm": "Data Structure and Algorithms",
    "object-oriented-concepts-1": "Object Oriented Concepts I",
    "ordinary-differential-equations": "Ordinary Differential Equations",
    "statistics-and-probability-2": "Probability and Statistics for Engineers II",
    "computer-organization": "Computer Organization and Architecture",
    "object-oriented-concepts-2": "Object Oriented Concepts II",
    "numerical-analysis": "Numerical Analysis",
    "theory-of-computing": "Theory of Computing",
    "bangladesh-studies": "Bangladesh Studies",
    "software-project-lab-1": "Software Project Lab I",
    "operating-system": "Operating System",
    "computer-networking": "Computer Networking",
    "combinatorial-optimization": "Combinatorial Optimization",
    "business-psychology": "Business Psychology",
    "database-management-system-1": "Database Management System I",
    "database-management-system-2": "Database Management System II",
    "software-specifications-and-analysis": "Software Requirements Specification & Analysis",
    "design-patterns": "Design Patterns",
    "web-technology": "Web Technology",
    "information-security": "Information Security",
    "professional-ethics": "Professional Ethics",
    "business-studies": "Business Studies",
    "business-communications": "Business Communications",
    "software-project-lab-2": "Software Project Lab II",
    "software-design": "Software Design and Analysis",
    "software-metrics": "Software Metrics",
    "software-testing": "Software Testing & Quality Assurance",
    "software-security": "Software Security",
    "software-maintenance": "Software Maintenance",
    "software-project-management": "Software Project Management",
    "distributed-system": "Distributed Systems",
    "artificial-intelligence": "Artificial Intelligence",
    "machine-learning": "Machine Learning",
    "pattern-recognition-image-processing": "Pattern Recognition & Image Processing",
    "information-system-ethics": "Information System Ethics",
    "software-project-lab-3": "Software Project Lab III",
    "internship": "Internship",
}

COURSE_ICONS = {
    "structured-programming": "code",
    "discrete-mathematics": "sigma",
    "calculus-and-analytic-geometry": "chart",
    "statistics-and-probability-1": "bar-chart",
    "statistics-and-probability-2": "bar-chart",
    "sociology": "users",
    "introduction-to-se": "gear",
    "data-structure-algorithm": "tree",
    "object-oriented-concepts-1": "cube",
    "object-oriented-concepts-2": "cube",
    "ordinary-differential-equations": "function",
    "computer-organization": "cpu",
    "numerical-analysis": "calculator",
    "theory-of-computing": "automata",
    "bangladesh-studies": "flag",
    "software-project-lab-1": "flask",
    "software-project-lab-2": "flask",
    "software-project-lab-3": "flask",
    "operating-system": "terminal",
    "computer-networking": "network",
    "combinatorial-optimization": "route",
    "business-psychology": "brain",
    "database-management-system-1": "database",
    "database-management-system-2": "database",
    "software-specifications-and-analysis": "clipboard",
    "design-patterns": "puzzle",
    "web-technology": "globe",
    "information-security": "shield",
    "professional-ethics": "scale",
    "business-studies": "briefcase",
    "business-communications": "chat",
    "software-design": "layers",
    "software-metrics": "ruler",
    "software-testing": "check-circle",
    "software-security": "lock",
    "software-maintenance": "wrench",
    "software-project-management": "kanban",
    "distributed-system": "server",
    "artificial-intelligence": "sparkles",
    "machine-learning": "brain",
    "pattern-recognition-image-processing": "image",
    "information-system-ethics": "scale",
    "internship": "badge",
}

# legacy stem -> canonical slug (only where they differ from basename_slug)
SLUG_ALIASES = {
    "software-specifications-analysis": "software-specifications-and-analysis",
    "statistics-probability-1": "statistics-and-probability-1",
    "statistics-probability-2": "statistics-and-probability-2",
    "calculus-analytic-geometry": "calculus-and-analytic-geometry",
    "database-management-system-2-html": "database-management-system-2",
}


def course_slug(href_or_name):
    s = basename_slug(href_or_name)
    return SLUG_ALIASES.get(s, s)


# ---------------------------------------------------------------------------
# parsers
# ---------------------------------------------------------------------------


def parse_card_links(soup):
    """Modern 'card-item' pages -> [(title, description, href)]"""
    out = []
    for a in soup.select("a.card-item"):
        href = a.get("href", "").strip()
        h3 = a.find("h3")
        p = a.find("p")
        out.append((clean(h3.get_text() if h3 else ""), clean(p.get_text() if p else ""), href))
    return out


def parse_legacy_links(soup):
    """Legacy SubjectStyle pages -> [(title, href)] from ul.Semester / li.Semester"""
    out = []
    for li in soup.select("li.Semester"):
        a = li.find("a", recursive=False) or li.find("a")
        if not a:
            continue
        out.append((clean(a.get_text()), (a.get("href") or "").strip()))
    return out


def split_topics(outline):
    """Break a run-on course outline into individual topics.

    Outlines use ';' in some courses and ',' in others, and often contain
    parenthesised asides that must not be split on.
    """
    if not outline:
        return []

    def emit(parts):
        out = []
        for chunk in parts:
            chunk = chunk.strip(" .;,")
            chunk = re.sub(r"^(and|etc)\b\s*", "", chunk, flags=re.I).strip()
            if 3 < len(chunk) <= 140:
                out.append(chunk[0].upper() + chunk[1:])
        return out

    def top_level_split(text, sep):
        parts, depth, buf = [], 0, ""
        for ch in text:
            if ch in "([":
                depth += 1
            elif ch in ")]":
                depth = max(0, depth - 1)
            if ch == sep and depth == 0:
                parts.append(buf)
                buf = ""
            else:
                buf += ch
        parts.append(buf)
        return parts

    topics = emit(top_level_split(outline, ";"))
    if len(topics) <= 1:
        topics = emit(top_level_split(outline, ","))
    return topics


def parse_outline(soup):
    """SubType page -> outline sentence + topic list"""
    outline = ""
    for p in soup.find_all("p"):
        txt = clean(p.get_text())
        if "Course Outline" in txt or len(txt) > 60:
            outline = re.sub(r"^Course\s+Outline\s*:?\s*", "", txt, flags=re.I).strip()
            break
    topics = split_topics(outline)
    # explicit list items win over the split sentence
    listed = [t for t, _ in parse_legacy_links(soup) if t]
    if len(listed) > len(topics):
        topics = listed
    return outline, topics


def collect_resources(dirname, filename_slug_map, kind):
    """Walk Link*/VideoLink* trees and return {course_slug: [ {title,url,source} ]}"""
    result = defaultdict(list)
    d = os.path.join(DOC, dirname)
    if not os.path.isdir(d):
        return result
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".html"):
            continue
        slug = filename_slug_map(fn)
        soup = soup_of(os.path.join(d, fn))
        seen = set()
        for a in soup.find_all("a"):
            href = (a.get("href") or "").strip()
            title = clean(a.get_text())
            if not href:
                stats["dropped_empty_href"] += 1
                continue
            if not href.startswith("http"):
                continue
            if href in seen:
                continue
            if is_student_profile(href):
                stats["dropped_student_profile"] += 1
                seen.add(href)
                continue
            seen.add(href)
            if not title:
                title = source_of(href)
            result[slug].append({"title": title, "url": href, "source": source_of(href)})
        stats[f"pages_{kind}"] += 1
    return result


PDF_KIND_HINTS = [
    (r"syllabus|outline|curriculum", "syllabus"),
    (r"lect|lecture|slide|chapter|ch\d|week", "slide"),
    (r"note", "note"),
    (r"paper|ieee|acm", "paper"),
]


def pdf_kind(title, path):
    hay = (title + " " + os.path.basename(path)).lower()
    for pattern, kind in PDF_KIND_HINTS:
        if re.search(pattern, hay):
            return kind
    return "book"


def human_size(nbytes):
    if nbytes is None:
        return None
    if nbytes >= 1_000_000:
        return f"{nbytes / 1_000_000:.1f} MB"
    return f"{max(nbytes // 1000, 1)} KB"


# ---------------------------------------------------------------------------
# main extraction
# ---------------------------------------------------------------------------


def main():
    courses = OrderedDict()

    def course(slug):
        if slug not in courses:
            courses[slug] = {
                "slug": slug,
                "title": COURSE_TITLES.get(slug, slug.replace("-", " ").title()),
                "icon": COURSE_ICONS.get(slug, "book"),
                "semester": None,
                "groups": [],
                "outline": "",
                "topics": [],
                "slides": [],
                "videos": [],
                "links": [],
            }
        return courses[slug]

    # ---- 1. semesters -----------------------------------------------------
    semesters = []
    sem_dir = os.path.join(DOC, "SemestersGroup")
    ordinals = {
        "1st": 1, "2nd": 2, "3rd": 3, "4th": 4,
        "5th": 5, "6th": 6, "7th": 7, "8th": 8,
    }
    for fn in sorted(os.listdir(sem_dir)):
        if not fn.endswith(".html"):
            continue
        num = ordinals[fn[:3]]
        soup = soup_of(os.path.join(sem_dir, fn))
        entries = parse_card_links(soup) or [
            (t, "", h) for t, h in parse_legacy_links(soup)
        ]
        slugs = []
        for title, desc, href in entries:
            if not href or href.endswith(".pdf"):
                continue
            slug = course_slug(href)
            c = course(slug)
            c["semester"] = num
            if title and slug not in COURSE_TITLES:
                c["title"] = title
            if desc and not c.get("description"):
                c["description"] = desc
            slugs.append(slug)
        semesters.append({
            "number": num,
            "label": f"{fn[:3]} Semester",
            "year": (num + 1) // 2,
            "courses": slugs,
        })
        stats["pages_semester"] += 1

    # ---- 2. subject groups ------------------------------------------------
    groups = []
    grp_meta = {}
    subjects_page = os.path.join(DOC, "html", "Subjects.html")
    if os.path.exists(subjects_page):
        for title, desc, href in parse_card_links(soup_of(subjects_page)):
            grp_meta[basename_slug(href)] = {"title": title, "description": desc}

    GROUP_ICONS = {
        "computer-fundamentals": "monitor",
        "computer-engineering": "cpu",
        "computer-programming": "code",
        "mathematics-and-statistics": "sigma",
        "software-engineering": "wrench",
        "information-technology": "globe",
        "general-studies": "book",
    }

    grp_dir = os.path.join(DOC, "SubjectsGroup")
    for fn in sorted(os.listdir(grp_dir)):
        if not fn.endswith(".html"):
            continue
        gslug = basename_slug(fn)
        soup = soup_of(os.path.join(grp_dir, fn))
        meta = grp_meta.get(gslug, {})
        h1 = soup.find("h1")
        seen = []
        for title, href in parse_legacy_links(soup):
            if not href or href.startswith("http"):
                continue
            slug = course_slug(href)
            if slug in seen:
                continue
            seen.append(slug)
            c = course(slug)
            if gslug not in c["groups"]:
                c["groups"].append(gslug)
        groups.append({
            "slug": gslug,
            "title": meta.get("title") or clean(h1.get_text() if h1 else fn),
            "description": meta.get("description", ""),
            "icon": GROUP_ICONS.get(gslug, "book"),
            "courses": seen,
        })
        stats["pages_group"] += 1

    # ---- 3. outlines / topics --------------------------------------------
    for n in (1, 2, 3, 4):
        d = os.path.join(DOC, f"SubType{n}")
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".html"):
                continue
            slug = course_slug(fn)
            c = course(slug)
            outline, topics = parse_outline(soup_of(os.path.join(d, fn)))
            if outline and len(outline) > len(c["outline"]):
                c["outline"] = outline
            for t in topics:
                if t not in c["topics"]:
                    c["topics"].append(t)
            stats["pages_subtype"] += 1

    # ---- 4. links & videos ------------------------------------------------
    for n in (1, 2, 3, 4):
        for tree, bucket in ((f"Link{n}", "links"), (f"VideoLink{n}", "videos")):
            found = collect_resources(tree, course_slug, bucket)
            for slug, items in found.items():
                c = course(slug)
                existing = {i["url"] for i in c[bucket]}
                other = "videos" if bucket == "links" else "links"
                for item in items:
                    # a youtube URL filed under Links still belongs in Videos
                    target = "videos" if is_video(item["url"]) else "links"
                    if bucket == "videos":
                        target = "videos"
                    if item["url"] in {i["url"] for i in c[target]}:
                        continue
                    c[target].append(item)
                    stats[f"kept_{target}"] += 1

    # ---- 5. slides (PDFs) -------------------------------------------------
    for n in (1, 2, 3, 4):
        d = os.path.join(DOC, f"Pdf{n}")
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".html"):
                continue
            slug = course_slug(fn)
            c = course(slug)
            path = os.path.join(d, fn)
            soup = soup_of(path)
            entries = parse_card_links(soup)
            if not entries:
                entries = [(t, "", h) for t, h in parse_legacy_links(soup)]
            for title, desc, href in entries:
                if not href:
                    stats["dropped_empty_href"] += 1
                    continue
                if href.startswith("http"):
                    if is_student_profile(href):
                        stats["dropped_student_profile"] += 1
                        continue
                    target = "videos" if is_video(href) else "links"
                    if href not in {i["url"] for i in c[target]}:
                        c[target].append({
                            "title": title or source_of(href),
                            "url": href,
                            "source": source_of(href),
                        })
                        stats[f"kept_{target}"] += 1
                    continue
                if not href.lower().endswith(".pdf"):
                    continue
                rel = os.path.normpath(os.path.join(f"doc/Pdf{n}", urllib.parse.unquote(href)))
                rel = rel.replace(os.sep, "/")
                abspath = os.path.join(ROOT, rel)
                if not os.path.exists(abspath):
                    fixed = resolve_missing(rel)
                    if fixed:
                        stats["repaired_pdf_link"] += 1
                        rel, abspath = fixed, os.path.join(ROOT, fixed)
                    else:
                        warn(f"missing PDF (dropped): {rel}  <- {path}")
                        stats["dropped_missing_pdf"] += 1
                        continue
                if rel in {s["file"] for s in c["slides"]}:
                    continue
                c["slides"].append({
                    "title": title or os.path.basename(rel).rsplit(".", 1)[0].replace("-", " "),
                    "file": rel,
                    "kind": pdf_kind(title, rel),
                    "size": human_size(os.path.getsize(abspath)),
                })
                stats["kept_slides"] += 1
            stats["pages_pdf"] += 1

    # ---- 6. books ---------------------------------------------------------
    books = []
    books_page = os.path.join(DOC, "html", "Books.html")
    if os.path.exists(books_page):
        for title, desc, href in parse_card_links(soup_of(books_page)):
            if not href or not href.lower().endswith(".pdf"):
                continue
            rel = os.path.normpath(os.path.join("doc/html", urllib.parse.unquote(href)))
            rel = rel.replace(os.sep, "/")
            if not os.path.exists(os.path.join(ROOT, rel)):
                fixed = resolve_missing(rel)
                if not fixed:
                    warn(f"missing book PDF (dropped): {rel}")
                    continue
                rel = fixed
            books.append({
                "title": title,
                "file": rel,
                "size": human_size(os.path.getsize(os.path.join(ROOT, rel))),
            })
        stats["books"] = len(books)

    # ---- 7. people --------------------------------------------------------
    people = []
    gh_page = os.path.join(DOC, "html", "Github.html")
    if os.path.exists(gh_page):
        for title, desc, href in parse_card_links(soup_of(gh_page)):
            if "github.com" not in href:
                continue
            href = re.sub(r"^https?://(www\.)?github\.com", "https://github.com", href)
            user = href.rstrip("/").rsplit("/", 1)[-1]
            m = re.search(r"\(?(BSSE\s*\d+)\)?", title, re.I)
            people.append({
                "name": re.sub(r"\s*\(.*?\)\s*", "", title).strip(),
                "roll": m.group(1).upper().replace("  ", " ") if m else "",
                "user": user,
                "url": href,
            })
        stats["people"] = len(people)

    # ---- 8. attach unreferenced PDFs where the course is obvious ----------
    attach_orphans(courses)

    # ---- 8b. reconcile the two non-course pages ---------------------------
    # doc/Pdf3/SRS_Documentation.html is a document dump for Software Project
    # Lab II, not a course of its own - fold it in and drop the pseudo-course.
    if "srs-documentation" in courses:
        stray = courses.pop("srs-documentation")
        host = course("software-project-lab-2")
        have = {s["file"] for s in host["slides"]}
        for s in stray["slides"]:
            if s["file"] not in have:
                host["slides"].append(s)
                stats["merged_srs_slides"] += 1

    # Information System Ethics exists in every 4th-year tree but the 7th
    # Semester page only ever listed Internship. It is a 7th-semester course.
    if "information-system-ethics" in courses:
        c = courses["information-system-ethics"]
        if c["semester"] is None:
            c["semester"] = 7
            for s in semesters:
                if s["number"] == 7 and c["slug"] not in s["courses"]:
                    s["courses"].append(c["slug"])
            stats["semester_inferred"] += 1

    # The Project Lab / Internship courses pointed at the student roster; send
    # people to the dedicated page instead of inlining 32 profile links.
    for slug in ("software-project-lab-1", "software-project-lab-2",
                 "software-project-lab-3", "internship"):
        if slug in courses:
            courses[slug]["related"] = [
                {"label": "Student GitHub Profiles", "href": "github.html", "icon": "github"}
            ]

    # ---- 9. finalise ------------------------------------------------------
    for c in courses.values():
        c["topics"] = [t for t in c["topics"] if t]
        c["slides"].sort(key=lambda s: (s["kind"] != "syllabus", s["title"].lower()))
        c["links"].sort(key=lambda s: s["source"].lower())
        c["videos"].sort(key=lambda s: s["title"].lower())
        c.setdefault("description", "")
        if not c["description"]:
            c["description"] = (c["outline"][:110] + "...") if len(c["outline"]) > 110 else c["outline"]

    # infer missing semesters from the Pdf tree number
    for slug, c in courses.items():
        if c["semester"] is None:
            warn(f"course has no semester: {slug}")

    ordered = OrderedDict(
        sorted(courses.items(), key=lambda kv: (kv[1]["semester"] or 99, kv[1]["title"]))
    )

    write_js("curriculum.js", {"semesters": semesters, "groups": groups})
    write_js("courses.js", {"courses": list(ordered.values())})
    write_js("books.js", {"books": books})
    write_js("people.js", {"people": people})
    write_report(ordered, semesters, groups, books, people)

    print("Extraction complete.")
    for k in sorted(stats):
        print(f"  {k}: {stats[k]}")
    if warnings:
        print(f"  warnings: {len(warnings)} (see tools/extract-report.md)")


def resolve_missing(rel):
    """Repair a broken PDF path: try hyphen/space swaps, double extensions, sibling dirs."""
    candidates = []
    base = os.path.basename(rel)
    d = os.path.dirname(rel)
    stem = base
    if stem.lower().endswith(".pdf.pdf"):
        candidates.append(os.path.join(d, stem[:-4]))
    candidates.append(os.path.join(d, base.replace(" ", "-")))
    candidates.append(os.path.join(d, base.replace("-", " ")))
    for cand in candidates:
        cand = cand.replace(os.sep, "/")
        if os.path.exists(os.path.join(ROOT, cand)):
            return cand
    # last resort: same filename anywhere under doc/
    target = base.replace(" ", "-").lower()
    for root, _dirs, files in os.walk(DOC):
        for f in files:
            if f.lower().replace(" ", "-") == target:
                return os.path.relpath(os.path.join(root, f), ROOT).replace(os.sep, "/")
    return None


# PDF folder -> course slug, for reconnecting unreferenced files
ORPHAN_FOLDER_MAP = {
    "doc/Pdf1/StructuredProgramming": "structured-programming",
    "doc/Pdf2/BangladeshStudies": "bangladesh-studies",
    "doc/Pdf2/CombinatorialSlides": "combinatorial-optimization",
    "doc/Pdf2/OperatingSystemSlides": "operating-system",
    "doc/Pdf2/ObjectOrientedConcepts2Slides": "object-oriented-concepts-2",
    "doc/Pdf3/BusinessStudiesPsychologySlides": "business-studies",
    "doc/Pdf3/BusinessWebTechSlides": "web-technology",
    "doc/Pdf3/DatabaseManagementSlides": "database-management-system-1",
    "doc/Pdf4/SoftwareDesign": "software-design",
    "doc/Pdf4/SoftwareProjectManagement": "software-project-management",
}

# left on disk deliberately, never linked (student submissions)
ORPHAN_SKIP = re.compile(r"SRS_SPL2_", re.I)


def attach_orphans(courses):
    linked = set()
    for c in courses.values():
        for s in c["slides"]:
            linked.add(s["file"])
    for root, _dirs, files in os.walk(DOC):
        relroot = os.path.relpath(root, ROOT).replace(os.sep, "/")
        for f in sorted(files):
            if not f.lower().endswith(".pdf"):
                continue
            rel = f"{relroot}/{f}"
            if rel in linked:
                continue
            if ORPHAN_SKIP.search(f):
                stats["orphan_left_unlinked"] += 1
                continue
            owner = None
            for folder, slug in ORPHAN_FOLDER_MAP.items():
                if relroot.startswith(folder):
                    owner = slug
                    break
            if not owner or owner not in courses:
                stats["orphan_unassigned"] += 1
                warn(f"unassigned orphan PDF: {rel}")
                continue
            title = f.rsplit(".", 1)[0].replace("-", " ").replace("_", " ")
            courses[owner]["slides"].append({
                "title": clean(title),
                "file": rel,
                "kind": pdf_kind(title, rel),
                "size": human_size(os.path.getsize(os.path.join(ROOT, rel))),
            })
            stats["orphan_reconnected"] += 1


def write_js(name, payload):
    os.makedirs(DATA, exist_ok=True)
    key = list(payload.keys())
    body = "\n".join(
        f"window.TEA.{k} = {json.dumps(v, ensure_ascii=False, indent=2)};" for k, v in payload.items()
    )
    header = (
        "/* AUTO-GENERATED by tools/extract.py - do not edit by hand.\n"
        f"   Exposes: {', '.join('window.TEA.' + k for k in key)} */\n"
        "window.TEA = window.TEA || {};\n\n"
    )
    with open(os.path.join(DATA, name), "w", encoding="utf-8") as fh:
        fh.write(header + body + "\n")


def write_report(courses, semesters, groups, books, people):
    lines = [
        "# Extraction report",
        "",
        "Auto-generated by `tools/extract.py`. Reconcile against `planning.md` §1 before deleting legacy pages.",
        "",
        "## Totals",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Courses | {len(courses)} |",
        f"| Semesters | {len(semesters)} |",
        f"| Subject groups | {len(groups)} |",
        f"| Books | {len(books)} |",
        f"| GitHub profiles | {len(people)} |",
        f"| Slides kept | {stats['kept_slides']} |",
        f"| Links kept | {stats['kept_links']} |",
        f"| Videos kept | {stats['kept_videos']} |",
        f"| Empty href=\"\" dropped | {stats['dropped_empty_href']} |",
        f"| Broken PDF paths repaired | {stats['repaired_pdf_link']} |",
        f"| Orphan PDFs reconnected | {stats['orphan_reconnected']} |",
        f"| Orphans left unlinked (student SRS) | {stats['orphan_left_unlinked']} |",
        "",
        "## Per-course",
        "",
        "| Sem | Course | Topics | Slides | Videos | Links |",
        "|---|---|---|---|---|---|",
    ]
    for c in courses.values():
        lines.append(
            f"| {c['semester'] or '-'} | {c['title']} | {len(c['topics'])} | "
            f"{len(c['slides'])} | {len(c['videos'])} | {len(c['links'])} |"
        )
    if warnings:
        lines += ["", "## Warnings", ""]
        lines += [f"- {w}" for w in warnings]
    with open(os.path.join(TOOLS, "extract-report.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    sys.exit(main())
