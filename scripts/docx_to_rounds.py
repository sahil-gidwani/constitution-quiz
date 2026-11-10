#!/usr/bin/env python3
"""Convert the question docx into src/data/rounds.json.

usage: python3 scripts/docx_to_rounds.py path/to/Agri_Questions.docx [out.json]

Docx layout expected:
  📚 Topic title
  Q1: question text
  option / option / option / option   (one paragraph each)
  Correct Answer: option text
Topics are grouped into rounds by scripts/rounds.config.json (edit it to regroup).
"""
import json, re, sys, datetime, pathlib
import docx  # python-docx

here = pathlib.Path(__file__).resolve().parent
cfg = json.loads((here / "rounds.config.json").read_text(encoding="utf-8"))
src = sys.argv[1]
out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else here.parent / "src/data/rounds.json"

lines = [p.text.replace("\xa0", " ").strip() for p in docx.Document(src).paragraphs]
topics, cur, q = {}, None, None
for l in lines:
    if not l:
        continue
    if l.startswith("📚"):
        cur = l.lstrip("📚").strip(); topics[cur] = []; q = None; continue
    m = re.match(r"^Q(\d+)\s*[:.]\s*(.*)$", l)
    if m:
        q = {"question": m.group(2).strip(), "options": [], "answer": None}; topics[cur].append(q); continue
    m = re.match(r"^Correct Answer\s*:\s*(.*)$", l, re.I)
    if m:
        q["answer"] = m.group(1).strip(); continue
    if q is not None and q["answer"] is None:
        q["options"].append(l)

# apply documented fixes
for fx in cfg["fixes"]:
    item = topics[fx["topic"]][fx["q"] - 1]
    if "question" in fx: item["question"] = fx["question"]
    if "options" in fx: item["options"] = fx["options"]
    if "answer" in fx: item["answer"] = fx["answer"]
    if "replaceOption" in fx:
        r = fx["replaceOption"]; item["options"] = [r["to"] if o == r["from"] else o for o in item["options"]]
        item["answer"] = r["to"]

ladder = cfg["pointLadder"]
used, rounds, problems = set(), [], []
for r in cfg["rounds"]:
    cats = []
    for ci, t in enumerate(r["topics"]):
        if t not in topics: problems.append(f"missing topic: {t}"); continue
        used.add(t)
        qs = []
        for i, item in enumerate(topics[t]):
            if item["answer"] not in item["options"]: problems.append(f"{t} Q{i+1}: answer not in options")
            if len(set(item["options"])) != len(item["options"]): problems.append(f"{t} Q{i+1}: duplicate options")
            qs.append({"id": f'{r["id"]}-c{ci+1}-q{i+1}', "points": ladder[min(i, len(ladder)-1)], "type": "multiple-choice",
                       "question": item["question"], "options": item["options"], "answer": item["answer"], "image": None})
        cats.append({"id": f'{r["id"]}-c{ci+1}', "name": t, "short": cfg["shortNames"].get(t, t), "questions": qs})
    rounds.append({"id": r["id"], "title": r["title"], "tagline": r["tagline"], "icon": r["icon"], "categories": cats})
for t in topics:
    if t not in used: problems.append(f"topic not assigned to a round: {t}")
if problems:
    print("PROBLEMS:\n  " + "\n  ".join(problems)); sys.exit(1)

total = sum(len(c["questions"]) for r in rounds for c in r["categories"])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({"title": cfg["title"], "source": pathlib.Path(src).name, "rounds": rounds}, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"wrote {out}: {len(rounds)} rounds, {sum(len(r['categories']) for r in rounds)} categories, {total} questions")
