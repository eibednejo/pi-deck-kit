#!/usr/bin/env python3
"""Design linter for .pptx decks.

Catches the two families of defect that are invisible in the generating code
and obvious to a human looking at the slide:

  CONSISTENCY  values that drift from the design system
               (off-scale type, stray colours, uneven margins, rogue radii,
                footers/titles that do not line up, one-off spacing)
  OVERLAP      elements that collide
               (text on text, text on a photo, a rule or bar drawn through
                words, cards that overflow their container)

Usage:
    lint_deck.py deck.pptx [--floor 20] [--tokens tokens.json] [--strict]

Exit code 1 if anything is found, so it can gate a build.
"""
import argparse, json, math, re, sys, zipfile
from collections import Counter, defaultdict

EMU = 914400.0
DEBUG = False          # --debug prints the geometry behind each collision

# ─────────────────────────── parsing ───────────────────────────
def _num(x): return int(x) / EMU

# OOXML escapes &, <, > and quotes in <a:t>. Measuring the escaped form
# inflates every line-length estimate, so unescape before counting characters.
_ENT = [('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&apos;', "'"), ('&amp;', '&')]

def _txt(s):
    for a, b in _ENT:
        s = s.replace(a, b)
    return s

def parse_slide(xml):
    """Return text items and shape items with geometry, fill, radius."""
    texts, shapes = [], []

    for sp in re.findall(r'<p:sp>.*?</p:sp>', xml, re.S):
        m = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/><a:ext cx="(\d+)" cy="(\d+)"', sp)
        if not m:
            continue
        x, y, w, h = (_num(v) for v in m.groups())

        # geometry + radius
        geom = re.search(r'<a:prstGeom prst="(\w+)"', sp)
        geom = geom.group(1) if geom else 'rect'
        adj = re.search(r'<a:gd name="adj" fmla="val (\d+)"', sp)
        # adj is a fraction of min(w,h); convert to inches so that shapes of
        # different sizes can be compared against one another
        radius = (int(adj.group(1)) / 100000.0) * min(w, h) if (adj and geom == 'roundRect') else None

        # fill, scoped to spPr so run colours are not mistaken for it
        spPr = re.search(r'<p:spPr>.*?</p:spPr>', sp, re.S)
        fill = None
        if spPr:
            block = spPr.group(0)
            if '<a:noFill/>' not in block:
                fm = re.search(r'<a:solidFill>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"', block)
                if fm:
                    fill = fm.group(1).upper()

        runs, sizes, colors, bold = [], [], [], False
        faces = []
        for r in re.findall(r'<a:r>.*?</a:r>', sp, re.S):
            t = _txt(''.join(re.findall(r'<a:t>(.*?)</a:t>', r, re.S)))
            if not t:
                continue
            runs.append(t)
            sz = re.search(r'sz="(\d+)"', r)
            if sz: sizes.append(int(sz.group(1)) / 100.0)
            cm = re.search(r'<a:solidFill>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"', r)
            if cm: colors.append(cm.group(1).upper())
            tf = re.search(r'typeface="([^"]+)"', r)
            if tf: faces.append(tf.group(1))
            if 'b="1"' in r: bold = True

        if runs:
            paras = re.findall(r'<a:p>.*?</a:p>', sp, re.S)
            # Paragraph breaks are genuine line breaks. Collapsing them into one
            # long string under-counts lines and hides exactly the overflow we
            # are looking for.
            ptxt = [_txt(''.join(re.findall(r'<a:t>(.*?)</a:t>', q, re.S)))
                    for q in paras]
            body = '\n'.join(q for q in ptxt if q) or ' '.join(runs)
            # Honour line spacing. A paragraph set at 1.3x is 30% taller than a
            # generator that sized the frame from the font size alone believes,
            # and the text spills out of the bottom of its own box.
            lsm = 1.0
            for q in paras:
                m2 = re.search(r'<a:lnSpc>\s*<a:spcPct val="(\d+)"', q)
                if m2:
                    lsm = max(lsm, int(m2.group(1)) / 100000.0)
            texts.append(dict(x=x, y=y, w=w, h=h, text=body, sizes=sizes, lsm=lsm,
                              colors=colors, bold=bold, fill=fill,
                              font=max(set(faces), key=faces.count) if faces else None,
                              nbreaks=sum(p.count('<a:br/>') for p in paras)))
        else:
            shapes.append(dict(x=x, y=y, w=w, h=h, fill=fill, geom=geom, radius=radius))

    for pic in re.findall(r'<p:pic>.*?</p:pic>', xml, re.S):
        m = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/><a:ext cx="(\d+)" cy="(\d+)"', pic)
        if m:
            x, y, w, h = (_num(v) for v in m.groups())
            shapes.append(dict(x=x, y=y, w=w, h=h, fill=None, geom='image', image=True))
    for gf in re.findall(r'<p:graphicFrame>.*?</p:graphicFrame>', xml, re.S):
        m = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/><a:ext cx="(\d+)" cy="(\d+)"', gf)
        if m:
            x, y, w, h = (_num(v) for v in m.groups())
            shapes.append(dict(x=x, y=y, w=w, h=h, fill=None, geom='chart', image=True))
    return texts, shapes

def load(path):
    z = zipfile.ZipFile(path)
    names = sorted((n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)),
                   key=lambda s: int(re.search(r'(\d+)', s.split('/')[-1]).group(1)))
    return [parse_slide(z.read(n).decode('utf-8', 'ignore')) for n in names]

# ─────────────────────────── geometry helpers ───────────────────────────
# Average character advance, in em, as regular/bold. Measured from the real
# fonts (or their metric-compatible clones) rather than guessed, because
# guessing wide makes the linter flag layouts that are actually fine, and
# guessing narrow makes it miss the overflow it exists to catch.
FONT_WIDTH = {
    'calibri': (0.440, 0.460), 'carlito': (0.440, 0.460),
    'cambria': (0.449, 0.489), 'caladea': (0.449, 0.489),
    'arial': (0.490, 0.530), 'liberation sans': (0.490, 0.530),
    'helvetica': (0.490, 0.530),
    'times new roman': (0.450, 0.480), 'liberation serif': (0.450, 0.480),
    'georgia': (0.490, 0.570), 'gelasio': (0.490, 0.570),
    'trebuchet ms': (0.480, 0.510),
    'verdana': (0.550, 0.580),
    'tahoma': (0.520, 0.550),
}
DEFAULT_WIDTH = (0.520, 0.555)   # deliberately wide: errs toward flagging


def wrap_lines(para, cpl):
    """Count lines the way a layout engine does, breaking at word boundaries.

    Dividing the character count by the capacity under-counts any paragraph
    built from long words, because the engine cannot split a word to fill the
    gap. That error is what let a five-line card body be modelled as four."""
    lines, cur = 1, 0
    for word in para.split():
        # A hyphen is a break opportunity, so "berkat-Nya" can split after it.
        # Indonesian is full of these (kepada-Nya, firman-Nya) and a plain word
        # wrap misses every one, which over-predicts the line count.
        parts = re.findall(r'[^-]*-|[^-]+$', word) or [word]
        for i, part in enumerate(parts):
            n = len(part)
            cost = 0 if cur == 0 else (1 if i == 0 else 0)
            if cur == 0:
                cur = n
            elif cur + cost + n <= cpl:
                cur += cost + n
            else:
                lines += 1
                cur = n
    return lines


def est_lines(t, w, pt, bold, font=None):
    k = FONT_WIDTH.get((font or '').strip().lower(), DEFAULT_WIDTH)[1 if bold else 0]
    cpl = max(1, int(w / (k * pt / 72.0)))
    return sum(wrap_lines(p, cpl) for p in t.split('\n'))

def vis_h(it):
    """Height the text actually occupies, derived from its own content.

    Deliberately ignores the author's frame: generators pad frames by a
    few points, and a padded frame is not a visual collision."""
    if 'sizes' not in it:
        return it['h']
    pt = max(it['sizes']) if it['sizes'] else 20
    L = est_lines(it['text'], it['w'], pt, it['bold'], it.get('font'))
    return L * pt * (1.10 if L == 1 else 1.22) * it.get('lsm', 1.0) / 72.0

MIN_CLEARANCE = 0.04   # inches, text next to text. Tight leading is often a choice.
RULE_CLEARANCE = 0.10  # inches, a rule or bar next to text. A hairline near a
                       # baseline reads as a line drawn through the words, so it
                       # needs visibly more room.

def line_h(it):
    """Height of a single line, the natural unit for judging whether two text
    blocks merely graze each other or genuinely collide."""
    pt = max(it['sizes']) if it.get('sizes') else 20
    return pt * 1.22 * it.get('lsm', 1.0) / 72.0


def gap_v(a, b):
    """Vertical gap between two boxes: negative when they overlap."""
    _, ay0, _, ay1 = bbox(a)
    _, by0, _, by1 = bbox(b)
    return max(ay0, by0) - min(ay1, by1)

def overlap_x(a, b):
    ax0, _, ax1, _ = bbox(a)
    bx0, _, bx1, _ = bbox(b)
    return max(0.0, min(ax1, bx1) - max(ax0, bx0))

def bbox(it):
    """Vertical extent: text may render taller than its frame, shapes do not."""
    h = vis_h(it) if 'sizes' in it else it['h']
    return it['x'], it['y'], it['x'] + it['w'], it['y'] + h

def inter(a, b):
    ax0, ay0, ax1, ay1 = bbox(a)
    bx0, by0, bx1, by1 = bbox(b)
    x = max(0.0, min(ax1, bx1) - max(ax0, bx0))
    y = max(0.0, min(ay1, by1) - max(ay0, by0))
    return x * y

def is_container(S, A):
    """A panel is a background, not a collision. Bars and rules never are."""
    if S['h'] < 0.40 or S['w'] < 0.40:
        return False
    if S['h'] < 0.85 * vis_h(A):
        return False
    return contains(S, A)

def contains(outer, inner, tol=0.06):
    inner_h = vis_h(inner) if 'sizes' in inner else inner['h']
    return (outer['x'] - tol <= inner['x'] and outer['y'] - tol <= inner['y']
            and outer['x'] + outer['w'] + tol >= inner['x'] + inner['w']
            and outer['y'] + outer['h'] + tol >= inner['y'] + inner_h)

# ─────────────────────────── checks ───────────────────────────
def run(path, floor=20, tokens=None, cw=13.333, ch=7.5, strict=False):
    slides = load(path)
    issues = defaultdict(list)

    # ---- collect the deck's own vocabulary first, for outlier detection ----
    size_count, color_count, radius_count = Counter(), Counter(), Counter()
    x_count, footer_y, title_y = Counter(), Counter(), Counter()
    fonts = Counter()
    for texts, shapes in slides:
        for t in texts:
            for s in t['sizes']: size_count[s] += 1
            for c in t['colors']: color_count[c] += 1
            x_count[round(t['x'], 2)] += 1
        for s in shapes:
            if s.get('radius') is not None: radius_count[round(s['radius'], 4)] += 1
    z = zipfile.ZipFile(path)
    for n in z.namelist():
        if n.startswith('ppt/slides/slide'):
            for f in re.findall(r'typeface="([^"]+)"', z.read(n).decode('utf-8', 'ignore')):
                fonts[f] += 1

    allowed_sizes = set(tokens['type_scale']) if tokens and 'type_scale' in tokens else None
    # Minimum size for CONTENT. Page numbers and footers are interface, not
    # content, and are exempt: they are read at arm's length from a printed
    # page or a screen, never from the back of a room. Everything else, including
    # table cells, axis labels and captions, is content and must clear the floor.
    content_floor = tokens.get('content_min_pt', floor) if tokens else floor
    foot_band = tokens.get('footer_band_in', 0.75) if tokens else 0.75
    allowed_colors = set(c.upper().lstrip('#') for c in tokens['palette']) if tokens and 'palette' in tokens else None
    margin = tokens.get('margin', 0.85) if tokens else 0.85
    gap = tokens.get('gap', 0.28) if tokens else 0.28
    foot_y = tokens.get('footer_y') if tokens else None
    body_end = tokens.get('content_end') if tokens else None

    for i, (texts, shapes) in enumerate(slides, 1):
        rep = lambda kind, msg: issues[kind].append(f"slide {i:>2}  {msg}")
        # A content slide carries BOTH a small label above its title and a footer.
        # Covers and closers deliberately sit outside the content grid, so they
        # must not be counted when comparing alignments.
        #
        # The label is matched with a tolerance rather than against the floor
        # exactly: a deck whose smallest type sits just above its declared floor
        # is doing the right thing, and requiring equality silently switched off
        # every alignment check for such a deck.
        has_label = any(t['sizes'] and min(t['sizes']) <= floor + 2 and t['y'] < 0.85
                        for t in texts)
        has_footer = any(t['y'] >= ch - 0.75 for t in texts)
        is_content = has_label and has_footer

        # ---------- CONSISTENCY ----------
        for t in texts:
            label = t['text'][:38].replace('\n', ' ')
            for s in t['sizes']:
                if allowed_sizes and s not in allowed_sizes:
                    rep('TYPE', f"{s:g}pt is off the scale  \"{label}\"")
                elif not allowed_sizes and size_count[s] == 1 and s < 56 and not strict:
                    rep('TYPE', f"{s:g}pt used exactly once  \"{label}\"")
            for c in t['colors']:
                if allowed_colors and c not in allowed_colors:
                    rep('COLOUR', f"#{c} is not in the palette  \"{label}\"")
                elif not allowed_colors and color_count[c] == 1 and not strict:
                    rep('COLOUR', f"#{c} used exactly once  \"{label}\"")
            if t['x'] < margin - 0.03:
                rep('MARGIN', f"left edge {t['x']:.2f}in is inside the {margin}in margin  \"{label}\"")
            if body_end and t['y'] < body_end and t['y'] + vis_h(t) > body_end + 0.02:
                rep('MARGIN', f"ends {t['y']+vis_h(t):.2f}in, past the {body_end}in content edge  \"{label}\"")
        for s in shapes:
            if s.get('radius') is None or not radius_count:
                continue
            dom = radius_count.most_common(1)[0][0]
            if abs(s['radius'] - dom) > 0.025 and radius_count[round(s['radius'], 4)] < 3:
                rep('RADIUS', f"corner radius {s['radius']:.2f}in where the deck uses {dom:.2f}in")

        # ---------- OVERLAP ----------
        for a in range(len(texts)):
            for b in range(a + 1, len(texts)):
                A, B = texts[a], texts[b]
                ov = inter(A, B)
                # A line-count estimate is exact only when the text misses a
                # character boundary, so a small overlap must not read as a
                # collision. The guard used to demand half a line of overlap,
                # which hid six real collisions in one specimen column: text
                # 0.007in into its neighbour is still text on text. The estimate
                # error is bounded by a line, but the OBSERVED overlap is not an
                # estimate, so a fifth of a line is enough to report.
                depth = -gap_v(A, B)
                if (ov > 0.10 * min(A['w'] * vis_h(A), B['w'] * vis_h(B))
                        and depth > 0.2 * min(line_h(A), line_h(B))):
                    rep('COLLIDE', f"text on text ({ov:.2f}in²)  \"{A['text'][:24]}\" ✕ \"{B['text'][:24]}\"")
                elif (max(A['sizes'] or [0]) < 56 and max(B['sizes'] or [0]) < 56
                      and 0 <= gap_v(A, B) < MIN_CLEARANCE
                      and overlap_x(A, B) > 0.3 * min(A['w'], B['w'])):
                    rep('TOO CLOSE', f"{gap_v(A,B):.2f}in between text blocks  "
                        f"\"{A['text'][:24]}\" / \"{B['text'][:24]}\"")
        for A in texts:
            for S in shapes:
                ov = inter(A, S)
                label = A['text'][:34].replace('\n', ' ')
                if S.get('image'):
                    # images only matter when text actually sits on them
                    if ov > 0.20 * (A['w'] * vis_h(A)):
                        rep('COLLIDE', f"text over image/chart ({ov:.2f}in²)  \"{label}\"")
                    continue
                if is_container(S, A):
                    continue                              # a panel legitimately sits behind its text
                if S['w'] < 0.26 and S['h'] < 0.26:
                    continue          # pin dot / bullet / marker, never a rule
                thin = S['h'] < 0.40 or S['w'] < 0.40
                if ov <= 0 and not thin:
                    continue          # a distant solid shape is just a neighbour
                # Display numerals have glyphs far shorter than their line box,
                # and a caption tucked under a big number is a deliberate pattern.
                if max(A['sizes'] or [0]) >= 56:
                    continue
                geo = (f"   [shape {S['x']:.2f},{S['y']:.2f} {S['w']:.2f}x{S['h']:.2f}"
                       f" | text {A['x']:.2f},{A['y']:.2f} {A['w']:.2f}x{vis_h(A):.2f}]")
                if ov > 0:
                    if ov > 0.03 * (A['w'] * vis_h(A)):
                        what = "a rule or bar" if thin else "a shape"
                        rep('COLLIDE', f"text over {what} ({ov:.2f}in²)  \"{label}\"" + (geo if DEBUG else ""))
                    elif thin:
                        rep('COLLIDE', f"rule/bar touches text  \"{label}\"" + (geo if DEBUG else ""))
                elif thin and overlap_x(A, S) > 0.2 and 0 <= gap_v(A, S) < RULE_CLEARANCE:
                    # The rule must actually pass under the text. Without the
                    # horizontal test a rule in the next column gets flagged
                    # purely for sitting at a similar height.
                    repair = f"{gap_v(A,S):.2f}in between a rule/bar and text  \"{label}\""
                    rep('TOO CLOSE', repair + (geo if DEBUG else ""))

        # A single unbreakable token cannot wrap at all, so it must fit its box
        # on one line even with a wider substitute font. A 150pt "$1.54" was
        # 5.21in in Arial and 6.59in in DejaVu, and the renderer broke the number
        # in half rather than overflowing: a data error, not just a layout one.
        for t in texts:
            if not t['sizes']:
                continue
            pt = max(t['sizes'])
            font = (t.get('font') or '').strip().lower()
            k = FONT_WIDTH.get(font, DEFAULT_WIDTH)[1 if t['bold'] else 0] * 1.2
            for tok in t['text'].split():
                if len(tok) < 3:
                    continue
                need = len(tok) * k * pt / 72.0
                if need > t['w']:
                    rep('FIT', f"\"{tok[:24]}\" needs {need:.2f}in at {pt:g}pt but the box "
                               f"is {t['w']:.2f}in, so it will break mid-word")

        # Display type that only fits because the author's own font was measured.
        # A viewer without that font substitutes a wider one, the line wraps, and
        # everything below it moves down into its neighbour.
        #
        # Scoped to TITLES, which is what the class means: a single line of display
        # type sitting directly above body copy, where a wrap does real damage. A
        # large number inside a card, or a cover headline, is not a title and is
        # allowed to wrap without breaking anything, so testing those produced
        # findings that were true and useless.
        # A title announces a section and sits directly above body copy: a wrap
        # there pushes the body down, which is why the check exists. Two cases are
        # excluded because a wrap there costs nothing and a meaningful sentence
        # cannot fit the one-line budget anyway:
        #   - display type above 60pt, which is a cover headline or a statement
        #   - a block with nothing beneath it, where a wrap collides with nothing
        for t in texts:
            if not t['sizes'] or not (36 <= max(t['sizes']) <= 60):
                continue
            pt = max(t['sizes'])
            has_content_below = any(
                u is not t and u['sizes']
                and u['y'] > t['y'] + 0.05
                and overlap_x(t, u) > 0.3 * min(t['w'], u['w'])
                for u in texts)
            if not has_content_below:
                continue
            for para in t['text'].split('\n'):
                if not para.strip():
                    continue
                if est_lines(para, t['w'], pt * 1.2, t['bold'], t.get('font')) > 1:
                    rep('TITLE', f"fits here but wraps with a wider substitute font  "
                                 f"\"{para[:36]}\"")
                    break

        # ---------- CONTENT FLOOR ----------
        # Enforced, not merely documented. Before this existed, --floor was only
        # used to identify labels and footers, so a deck could set 1pt body text
        # and pass cleanly as long as the sizes were consistent with each other.
        for t in texts:
            if not t['sizes']:
                continue
            smallest = min(t['sizes'])
            if smallest >= content_floor:
                continue
            # Below the band where a page number or footer lives, the text is
            # interface rather than content, and is allowed to be small.
            if t['y'] >= ch - foot_band:
                continue
            label = t['text'][:30].replace('\n', ' ')
            rep('FLOOR', f"{smallest:g}pt content is below the {content_floor:g}pt floor  \"{label}\"")

        # footers should share one y
        for t in texts:
            if is_content and t['sizes'] and min(t['sizes']) == floor and t['y'] > ch - 1.0:
                footer_y[round(t['y'], 2)] += 1
            if is_content and t['sizes'] and 44 <= max(t['sizes']) <= 80 and 1.0 < t['y'] < 2.2:
                title_y[round(t['y'], 2)] += 1
                # SKILL.md calls one-line titles a hard rule, so the checker
                # should enforce it rather than leaving it to the eye. A title
                # that wraps also collides with whatever sits under it.
                nlines = est_lines(t['text'], t['w'], max(t['sizes']), t['bold'], t.get('font'))
                if nlines > 1:
                    rep('TITLE', f"title wraps to {nlines} lines  \"{t['text'][:34]}\"")

    # deck-level consistency
    if len(footer_y) > 1 and foot_y is None:
        issues['ALIGN'].append(
            "footers sit at different heights: " + ", ".join(f"{y}in×{c}" for y, c in footer_y.most_common()))
    if len(title_y) > 1:
        issues['ALIGN'].append(
            "titles sit at different heights: " + ", ".join(f"{y}in×{c}" for y, c in title_y.most_common()))
    if len(fonts) > 2:
        issues['FONT'].append("more than two typefaces in use: " + ", ".join(fonts))

    # report
    order = ['TYPE', 'FONT', 'COLOUR', 'RADIUS', 'MARGIN', 'ALIGN', 'FLOOR', 'FIT', 'TITLE',
             'COLLIDE', 'TOO CLOSE']
    # A check whose class is missing from this list collects findings and then
    # prints nothing, which looks exactly like a clean deck. Surface them.
    for kind in issues:
        if kind not in order and issues[kind]:
            order.append(kind)
            print(f"\n  {kind}   (warning: class missing from order and was being dropped)")
    total = 0
    for kind in order:
        if not issues[kind]:
            continue
        print(f"\n  {kind}")
        for m in issues[kind]:
            print(f"    {m}")
        total += len(issues[kind])
    print(f"\n  {total} issue(s) across {len(slides)} slides")
    return total

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('deck')
    ap.add_argument('--floor', type=int, default=20, help='minimum font size')
    ap.add_argument('--tokens', help='JSON design tokens to validate against')
    ap.add_argument('--strict', action='store_true', help='do not report singleton outliers')
    ap.add_argument('--debug', action='store_true', help='show geometry behind each collision')
    a = ap.parse_args()
    tk = json.load(open(a.tokens)) if a.tokens else None
    globals()['DEBUG'] = a.debug
    sys.exit(1 if run(a.deck, floor=a.floor, tokens=tk, strict=a.strict) else 0)
