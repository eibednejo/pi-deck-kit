#!/usr/bin/env python3
"""Spacing and padding audit for a deck.

lint_deck.py answers "is anything broken". This answers a different question:
"is anything *irregular*". A deck can be perfectly clean and still feel subtly
wrong, because the eye reads inconsistent padding as carelessness long before
it can name the measurement.

What it reports:

  1. Left edges that do not sit on the declared margin
  2. Padding inside every card, on all four sides
  3. Bottom padding per component, where the spread is usually the tell
  4. Vertical gaps between stacked blocks

Nothing here is an error on its own. A wide spread is a question, not a verdict:
it means the spacing was hand-tuned per slide rather than derived from a token,
and hand-tuned spacing drifts with every fix.

    python3 scripts/spacing_audit.py deck.pptx [--margin 0.85] [--pad 0.24]
"""
import argparse
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lint_deck as L


def cards_with_text(slide):
    texts, shapes = slide
    out = []
    for c in shapes:
        if c.get('image') or not c.get('fill') or c['w'] < 1.2 or c['h'] < 0.7:
            continue
        kids = [t for t in texts
                if c['x'] <= t['x'] + t['w'] / 2.0 <= c['x'] + c['w']
                and c['y'] <= t['y'] + L.vis_h(t) / 2.0 <= c['y'] + c['h']]
        if kids:
            out.append((c, kids))
    return out


def report_left_edges(slides, margin, tol):
    print("1. LEFT EDGES of text boxes")
    print(f"   declared margin: {margin}in\n")
    counts = collections.Counter()
    for texts, _ in slides:
        for t in texts:
            counts[round(t['x'], 3)] += 1
    hits = []
    for x in sorted(counts):
        if abs(x - margin) <= tol or x < margin - tol:
            continue
        # only page-level edges are interesting; inner column starts are not
        if x > margin + 1.5:
            continue
        hits.append((x, counts[x]))
    if not hits:
        print("   every page-level edge is on the margin\n")
    else:
        for x, n in hits:
            print(f"   x={x:5.2f}in  x{n}   {x - margin:+.2f}in off the margin")
        print()


def report_card_padding(slides, pad, tol):
    print("2. PADDING INSIDE CARDS")
    rows = []
    for si, slide in enumerate(slides):
        for c, kids in cards_with_text(slide):
            rows.append(dict(
                slide=si + 1, w=c['w'], h=c['h'],
                L=min(t['x'] - c['x'] for t in kids),
                T=min(t['y'] - c['y'] for t in kids),
                R=min((c['x'] + c['w']) - (t['x'] + t['w']) for t in kids),
                B=min((c['y'] + c['h']) - (t['y'] + L.vis_h(t)) for t in kids),
                first=kids[0]['text'][:24]))
    if not rows:
        print("   no cards found\n")
        return
    for key, name in (('L', 'left'), ('T', 'top'), ('R', 'right'), ('B', 'bottom')):
        vals = sorted({round(r[key], 3) for r in rows})
        ok = all(abs(v - pad) <= tol for v in vals)
        mark = "consistent" if ok else "SPREAD"
        shown = ", ".join(f"{v:.2f}" for v in vals[:8]) + (" ..." if len(vals) > 8 else "")
        print(f"   {name:<7} {mark:<11} {shown}")
    print()
    print("   bottom padding by card, tightest first:")
    for r in sorted(rows, key=lambda r: r['B']):
        flag = "" if abs(r['B'] - pad) <= tol else "   <-- not the card padding"
        print(f"     slide {r['slide']:>2}  {r['w']:5.2f}x{r['h']:<5.2f}  "
              f"padB={r['B']:5.2f}  {r['first']!r}{flag}")
    print()


def report_gaps(slides, tol):
    print("3. VERTICAL GAPS between stacked blocks")
    gaps = collections.Counter()
    for texts, _ in slides:
        seq = sorted(texts, key=lambda t: t['y'])
        for a, b in zip(seq, seq[1:]):
            if b['y'] <= a['y']:
                continue
            if L.overlap_x(a, b) < 0.3 * min(a['w'], b['w']):
                continue
            g = b['y'] - (a['y'] + L.vis_h(a))
            if 0 <= g < 1.5:
                gaps[round(g, 2)] += 1
    if not gaps:
        print("   no stacked pairs measured\n")
        return
    print("   a handful of distinct values is a system; a long tail is drift\n")
    for g, n in sorted(gaps.items()):
        bar = "#" * min(n, 40)
        print(f"   {g:4.2f}in  x{n:<3} {bar}")
    print()


def report_fragile(slides, font_uncertainty=0.07):
    """Text whose line count changes if the font metrics are slightly different.

    An average-advance model cannot predict wrapping to better than about a
    line, because real advance depends on which glyphs are used. Copy that sits
    on a boundary therefore wraps differently in the render than in the model,
    and since box heights follow the model, the layout gains or loses a line of
    space that nobody asked for. Copy comfortably inside a line count does not."""
    print("4. FRAGILE LINE COUNTS")
    print("   text that changes line count under a 7% metric shift\n")
    hits = []
    for si, (texts, _) in enumerate(slides):
        for t in texts:
            if not t.get('sizes'):
                continue
            pt = max(t['sizes'])
            font = (t.get('font') or '').strip().lower()
            base = L.FONT_WIDTH.get(font, L.DEFAULT_WIDTH)[1 if t['bold'] else 0]
            w, lsm = t['w'], t.get('lsm', 1.0)
            a = L.est_lines(t['text'], w, pt, t['bold'], t.get('font'))
            b = sum(L.wrap_lines(p, max(1, int(w / (base * 0.93 * pt / 72.0))))
                    for p in t['text'].split('\n'))
            if a != b:
                hits.append((si + 1, a, b, t['text'][:44]))
    if not hits:
        print("   none: every block is comfortably inside its line count\n")
        return
    for si, a, b, txt in hits:
        print(f"   slide {si:>2}  {a} lines, or {b} if metrics shift   {txt!r}")
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('deck')
    ap.add_argument('--margin', type=float, default=0.85)
    ap.add_argument('--pad', type=float, default=0.24)
    ap.add_argument('--tol', type=float, default=0.015,
                    help='how far a value may drift before it counts as irregular')
    a = ap.parse_args()

    slides = L.load(a.deck)
    print(f"\n{a.deck}  ({len(slides)} slides)\n")
    report_left_edges(slides, a.margin, a.tol)
    report_card_padding(slides, a.pad, a.tol)
    report_gaps(slides, a.tol)
    report_fragile(slides)
    print("A spread is not automatically wrong. Ask whether the value came from a\n"
          "token or from an eyeball, and whether the same component used it twice.\n")


if __name__ == '__main__':
    main()
