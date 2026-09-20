---
name: next-level-decks
description: "Design and build presentation decks that do not look AI-generated: art direction, narrative structure, layout systems, real photography, and mechanical QA. Use whenever the user asks for slides, a deck, a presentation, a pitch, a company profile, a report-out, or wants an existing deck to look better. Also use to review or audit a .pptx for design inconsistencies: off-scale type, stray colours, misaligned titles and footers, and elements that overlap. Complements the pptx skill, which handles file mechanics; this skill owns the visual and editorial decisions."
---

# Next-level decks

The `pptx` skill knows how to build a valid file. This skill knows how to make
it worth presenting. Load `pptx` for mechanics, this one for direction.

## The two failures to avoid

**1. Default output.** Left alone, a model produces a title, three bullets, a
rounded card grid, and an accent bar under every heading. It is not wrong; it
is just unmistakably generated, because nothing in it was *decided*.

**2. Illegible type.** The model optimises for the screen it renders on, which
is a laptop at arm's length. 14pt looks fine there and is invisible from the
back of a room. This is the single most common real-world failure.

Everything below exists to prevent those two.

## Start from the decision

Every deck is an argument for a decision. Before style, before layout, answer
three questions in writing:

1. **Who decides?** Not the audience. The person who signs, funds, approves or
   joins.
2. **What must they believe to say yes?** One sentence. That sentence is the deck.
3. **What proof would they accept?** Numbers, names, a working demo, a reference,
   a method, a price. Not adjectives.

If you cannot write all three, you are not ready to open a slide tool. A deck
with no decision to drive becomes a document, and a document is better served by
prose than by slides.

The craft is the same everywhere. What changes is the proof and the register.

| Purpose | Who decides | What they must believe | Proof that moves them |
|---|---|---|---|
| Company profile | A prospective client | You can do this specific work | Named past work, specifics, a small first step |
| Deal proposal | The buyer | The risk of hiring you is low | Their problem restated, scope, price, timeline, who does what |
| Fundraise | An investor | This can be large, and this team can get there | Market, traction, unit economics, the ask |
| Product launch | The market | This solves something I already feel | One demonstration, one benefit, one price |
| Recruiting | A candidate | This is worth the risk of moving | Real people, real problems, what the work is actually like |
| Internal report-out | Leadership | The situation is understood and controlled | What changed, what it means, what you need |
| Architecture review | Engineers | The design holds under load and failure | Constraints, tradeoffs, failure modes, options you rejected |
| Postmortem | Peers | Nothing is being hidden | Timeline, causes, what is already fixed |
| Keynote | A room | One idea is worth remembering | Story, one vivid example, repetition |
| Training | Learners | Nothing. They need to be able to *do* it | Demonstration, practice, retrieval |

Two rows there are not persuasion at all. A training deck that convinces without
enabling has failed, and so has a postmortem that sells.

## Turn the advocacy down where polish reads as spin

Craft is always welcome. Persuasion is not always welcome, and applying it in the
wrong room costs more than it earns.

- **Postmortems and incident reviews.** A polished deck implies a managed
  narrative. Plain slides, a timeline, and no adjectives read as honesty. The
  reader already knows the author, so credibility is not what is at stake;
  candour is.
- **Scientific and academic work.** Decorated slides invite the suspicion that the
  evidence is thin. Let the method and the uncertainty carry it. Over-design is
  itself a claim, and here it is the wrong one to make.
- **Internal status and bad news.** Overselling a problem destroys the trust you
  need in order to fix it. State the gap, state the plan, stop.
- **Any room where you are the least expert person present.** Your job is to let
  the specialists disagree with you precisely.

The tell that you have crossed the line is adjectives doing work that evidence
should be doing.

## Workflow

Run these in order. Do not skip to building.

1. **Read the brief, then name the decision.** Audience, venue, and how the deck
   will be consumed. Write one line: *who decides, and what they must believe.*
   See "Start from the decision" above.
2. **Decide the mode** (see type floors) — this is an input, not an afterthought.
3. **Write the argument, not the slides.** Give every slide an *action title*:
   a claim, not a category. "Half the country lives on one island" beats "Distribution".
   Read the titles alone: they should form a coherent summary.
4. **Pick one concept.** A governing idea that could not belong to another deck.
   A device, a metaphor, a generated graphic — not just a palette.
5. **Declare tokens.** Margin, gap, card padding, radius, type scale, palette.
   Put them in one object at the top of the build script.
6. **Build with the grid**, deriving positions from the tokens.
7. **Lint** (mechanical), then **render and look** (visual). Both. Always.
8. **Fix and repeat** until the linter is silent and your eyes agree.

## Type floors — decide the mode first

Sizes are points on a 13.333 x 7.5 in canvas. The floor depends entirely on how
far away the reader is.

| Mode | Body min | Hard floor | Title | As % of slide height |
|---|---|---|---|---|
| Stage / projected | 24pt | 20pt | 40-56pt | 4.4% |
| Screen share / laptop | 18pt | 16pt | 32-44pt | 3.3% |
| Sent as a leave-behind | 12pt | 10pt | 24-34pt | 2.2% |

**Compute the floor for the room, do not guess it.** For a projector:

```
required_body_pt = distance_to_back_row_ft x (slide_width_in / screen_width_in) x 72 x 0.10
```

On a 10 ft screen this collapses to a memorable rule: **body points ~ feet to the
back row.** A 50 ft throw needs ~50pt body text. A 14pt deck in that room is not
a style choice, it is a failed projection.

**Scaling type up forces layout change.** Bigger type means fewer words and fewer
columns, not the same layout with larger numbers. Four columns work at 12pt, two
at 24pt. If text will not fit, cut words; never shrink below the floor.

## Fonts that travel

A deck is not finished when it looks right on your machine. It is finished when
it looks right on the reader's, and that depends on the font being there.

- **Prefer fonts that ship with Office on both Windows and macOS**: Calibri,
  Cambria, Arial, Georgia, Trebuchet MS, Verdana, Tahoma, Times New Roman.
- **Avoid single-platform fonts.** Segoe UI exists on Windows, Helvetica Neue on
  macOS, and neither travels. A missing font substitutes *silently* and reflows
  every paragraph. This is the usual reason a deck that was clean on your laptop
  overlaps on someone else's.
- **Camouflage matters as much as beauty.** Times New Roman at 72pt reads as a
  legal brief. Cambria and Calibri are a designed pair, ship with Office on both
  platforms, and have lining figures, which matters in a deck full of numerals.
  Check display figures before committing: Georgia defaults to old-style figures,
  which look deliberate in an editorial deck and broken in a KPI tile.

**Verify with metric-compatible clones, never by eye.** These exist precisely so
you can preview a proprietary font accurately:

| Real font | Metric-compatible clone |
|---|---|
| Calibri | Carlito |
| Cambria | Caladea |
| Georgia | Gelasio |
| Arial | Liberation Sans |
| Times New Roman | Liberation Serif |

Install the clone and alias the real name to it, so a render is a truthful
preview of what the reader will see:

```xml
<!-- ~/.config/fontconfig/fonts.conf -->
<match target="pattern"><test name="family"><string>Calibri</string></test>
  <edit name="family" mode="prepend" binding="strong">
    <string>Carlito</string></edit></match>
```

Without the alias and the clone, Calibri and Cambria fall back to DejaVu with
different widths, and every line count you compute from that preview is fiction.
A silently wrong preview is worse than no preview.

## Measure text, do not assume its height

**Nothing in a deck may depend on these estimates being correct.** Everything
below is an approximation built from character advances. It is fine to use it to
choose a layout. It is not fine to make correctness depend on it. Wherever being
one line out would cause a collision, reserve the line; wherever display type
must stay on one line, keep it short enough that a wider font cannot break it.

The two mistakes below account for almost every "the text is overlapping" report.

**Line spacing multiplies the line box.** A paragraph set at
`lineSpacingMultiple: 1.3` is 30% taller than the same paragraph at 1.0. A
generator that computes the frame height from the font size alone sizes that
frame 30% too short, and the text spills out of the bottom of its own box into
whatever sits below. It will look correct in any tool that draws overflowing
text anyway, which is why this survives so long.

```
line_height  = pt * 1.22 * lineSpacingMultiple / 72     (inches)
block_height = lines * line_height
```

**Count lines the way a layout engine does, at word boundaries.** Dividing the
paragraph length by the characters that fit gives a number that is wrong in both
directions, because a wrap is a break between words and an engine cannot split a
word to fill the gap:

```
"Web applications, APIs and admin panels for daily work."   54 characters
  by division   54 / 14 = 4 lines
  by word wrap  "Web" / "applications," / "APIs and admin" / "panels for daily" / "work." = 5
```

That single missing line is what makes a card one line taller than its contents,
or one line too short and overflowing. Model the wrap.

If your layout code and your checker disagree about this, they will disagree
about every spaced paragraph in the deck, and the checker will report cleanliness
while the slides fall apart.

**Character width is a property of the font, not a constant.** Measured average
advance, as a fraction of font size:

| Font | regular | bold |
|---|---|---|
| Calibri / Carlito | 0.452 | 0.459 |
| Cambria / Caladea | 0.449 | 0.489 |
| Arial / Liberation Sans | 0.490 | 0.530 |
| Times New Roman / Liberation Serif | 0.450 | 0.480 |
| Georgia | 0.490 | 0.490 |
| Verdana | 0.550 | 0.580 |

Guessing wide flags layouts that are fine. Guessing narrow hides the overflow
the check exists to catch. `lint_deck.py` carries this table and reads the font
out of the file itself. To add a font, measure it rather than assume:

**Check the numbers you already wrote down.** The Indonesia deck was laying out
against `0.555em` per character for bold Arial. The measured value is `0.49em`, a
13% overestimate, so every bold block in that deck had been positioned against a
model that was never correct. A wrong constant in the metric table is invisible:
it produces plausible spacing and occasional collisions, and it looks like a
layout bug rather than an arithmetic one. Re-measure before trusting a table
someone inherited.

```python
ImageFont.truetype(path, 1000).getlength(sample) / len(sample) / 1000
```

**A hyphen is a break opportunity too.** Indonesian, German and Dutch compound
heavily with hyphens (`berkat-Nya`, `kepada-Nya`, `firman-Nya`), and a renderer
will happily break after one. A word-wrap model that treats the whole token as
unbreakable over-predicts the line count on almost every such paragraph, which
leaves cards with visible slack while their neighbours look full. Split on
hyphens as well as spaces, and remember an intra-word break costs no space.

A line-count estimate is exact only when the text misses a character boundary.
Being one line out is normal, so a collision test must demand a real overlap,
roughly half a line, and not a hair. Otherwise it cries wolf on every borderline
paragraph and you learn to ignore it.

## Test under substituted fonts, not just your own

A deck verified on the machine that built it proves nothing about the machine
that opens it. This is the failure that matters most in practice, and the one
that automated checks miss entirely.

**Some fonts do not travel, and the ones that look safest are often the worst.**
Calibri and Cambria ship with *desktop Office*. They are absent from Google
Slides, from mobile viewers, and from most web-based tools. Hand a deck set in
Calibri to someone opening it in a browser and it silently substitutes, every
paragraph reflows, and anything positioned from a line-count estimate moves into
its neighbour.

Prefer the families that are actually everywhere, in this order:

| Present in | Families |
|---|---|
| PowerPoint (both platforms), Google Slides, macOS, and metric-cloned on Linux | Arial, Times New Roman, Georgia, Trebuchet MS, Verdana |
| Desktop Office only, absent from web viewers | Calibri, Cambria |

**Know the ratio, do not guess it.** Measured on this machine by comparing
average advance over a long sample paragraph:

| Design font | Substitute | Ratio |
|---|---|---|
| Arial regular | DejaVu Sans | 1.14x |
| Arial bold | DejaVu Sans Bold | **1.19x** |
| Georgia regular | DejaVu Serif | 1.16x |
| Georgia bold | DejaVu Serif Bold | 1.10x |

Bold is the worst case, and bold is what headings and display type use. Design
for **1.18x** and every one of those is covered.

**Run the test.** `scripts/substitution_test.sh` renders the whole deck with the
design fonts replaced by much wider ones. Then look at the slides. Anything that
has grown into the block below it is a real defect on a reader's device, whether
or not it is a defect on yours.

```bash
bash scripts/substitution_test.sh deck.pptx /tmp/subcheck
```

**Design so that one extra line cannot collide.** Reserving room is better than
shortening copy:

- Position a block that sits under text using `lines + 1`, not `lines`.
- Keep every authored display line short enough to survive a 20% wider font. The
  linter's `TITLE` check tests exactly this, since display type is where a wrap
  does the most damage.
- Put a trailing line of text last on the slide where nothing sits beneath it.
  That is what makes it safe: it can wrap freely without pushing anything.

**A reusable pattern: declare the ratio, then two heights.**

```js
const SUBST = 1.18;                    // measured ratio, declared as a token

function nlS(t,w,pt,b,se){ return nl(t, w/SUBST, pt, b, se); }
function th (t,w,pt,b,se,lsm){ ... }   // height at the design metrics
function thS(t,w,pt,b,se,lsm){ ... }   // height at the worst-case metrics

// T_  draws the text and returns the design-metric bottom
// T_S draws the same text and returns the WORST-CASE bottom
function T_S(s,t,o){ T_(s,t,o); return o.y + thS(t,o.w,o.pt,o.bold,o.serif,o.lsm); }
```

The rule that makes it work:

- Use **`T_S`** wherever the returned value positions the next block. A viewer
  whose font is wider then pushes the next block by the same amount the text
  grows, so the gap is preserved.
- Use **`T_`** for the *last* element in a column. Nothing sits below it, so it
  needs no reserve, and reserving anyway costs vertical space you do not have.
- Inside a card, size the card from `thS` and give it **one** spare line, placed
  as bottom padding rather than spread through the gaps.

Reserving everywhere accumulates. Applying it to a four-item list added a line
per item and pushed the column through the footer; the fix was `thS` on the
chained positions and `T_` on the last. If a reserve causes an overflow, that is
the signal you have over-applied it, not that the reserve is wrong.

When you find this class of bug, fix the cause. Shortening the copy helps, but
the standing rule is that nothing may depend on your font model being right.

**When you find one, sweep for the rest.** This bug arrives one slide at a time
and every instance looks like an isolated mistake. It is not: *every* box sized
from a line-count estimate has it, and only the ones whose neighbour happens to
sit close enough will show it. Fixing the slide a reader reported leaves the
others waiting for the next reader. Three separate instances of this one bug
reached a reviewer in a row, each found by them and not by me, because I checked
the slides I already suspected instead of all of them.

So after any fix in this family: re-run the substitution test over the **whole**
deck, and look at **every** slide. The linter narrows it to display type that will
wrap; it cannot see a paragraph body pushing out of a card. Only the eyes do that.

## Ground truth: diff the render against a text-free build

Every estimate above can be wrong in both directions. When it matters, settle it
with pixels. Build the deck a second time with all text suppressed by
monkey-patching the text call, then diff the two renders:

```js
if (NO_TEXT) {
  const real = p.addSlide.bind(p);
  p.addSlide = (...a) => { const s = real(...a); s.addText = () => s; return s; };
}
```

Where the two images differ is exactly where glyphs were drawn. For each pair of
vertically stacked text boxes, measure the longest run of ink-free rows in the
column they share. A run of zero means they touch.

This is the only check that does not depend on your font model, your line-spacing
model, or your guess about how many lines a paragraph became. It also works over
photographs, where a brightness or variance test cannot tell text from sky.

Suppress **every** text call, including bespoke ones on covers. A single
unsuppressed block produces a false "no ink here" and hides a real collision.

## Trusting the checker

This is the hard lesson, and it costs the most when it is missed.

**A checker that derives its numbers the way the generator does cannot catch the
generator's mistakes.** Both compute text height from a font size and call it a
day. The checker reports zero, the slides overlap, and you tell the user it is
verified. Green lights over broken output is the worst state to be in, because it
spends your credibility as well as your time.

What follows from that:

1. **Measure the artifact, not a model of it, wherever you can.** Line counts come
   from a character-advance estimate; whether two blocks actually touch comes from
   the rendered pixels. When the two disagree, the pixels are right. See the
   render-diff technique above; it is the only check with no model in it.
2. **Prove the checker can fail.** Keep a fixture you know is broken and run it
   every time. A checker that has never failed has never been tested, and its
   silence on your real deck means nothing.
3. **Guard false positives as hard as false negatives.** A checker that cries wolf
   gets ignored, and once it is ignored it may as well be silent. Keep a fixture
   whose only purpose is to be clean, and another that sits exactly on a rounding
   boundary and must stay quiet.
4. **Prefer pixels to geometry, geometry to estimates.** Declared box coordinates
   are better than a guess about line count, and a rendered gap is better than
   either. Every rung down is a place for a false conclusion to hide.

`scripts/selftest.sh` runs these fixtures and asserts the intent, not an
observed count:

```bash
bash scripts/selftest.sh
```

| Fixture | Must do | Because |
|---|---|---|
| `clean.pptx` | report nothing | a false positive destroys authority |
| `broken.pptx` | fail across TYPE, COLOUR, MARGIN, COLLIDE | silence on a bad deck is useless |
| `tight.pptx` | fire `TOO CLOSE` | a hairline under text is wrong though it does not overlap |
| `knife.pptx` | stay silent | a 0.11in graze is a rounding artefact, not a collision |
| `overflow.pptx` | fire `COLLIDE` | the card fits at 1.0x spacing and spills at 1.35x |

Run it after **every** change to the checker. Verify it by breaking the checker
on purpose: remove the line-spacing term and `overflow.pptx` must start failing.
If it does not, the harness is decoration.

## Spacing: derive it, do not nudge it

Inconsistent spacing is rarely one bad value. It is a dozen values that were
each reasonable when chosen and never agreed with each other. A deck can be
lint-clean and still feel wrong, because the eye reads irregular padding as
carelessness long before it can name a measurement.

**Never nudge an element to make it look right.** A `+0.02in` optical offset
applied here and forgotten there is how a deck acquires a half-visible tilt. If
a value is needed repeatedly, promote it to a token and apply it everywhere.

**Reserve one line inside a card, and put it below the text.** A card sized to
exactly fit its contents spills them out of the bottom the moment a viewer
substitutes a wider font. Add one spare line, sized from the card's longest
block, and add it as bottom padding rather than spreading it through the gaps:
that is where a wrapped line would actually land. Do not reserve a line per
block, which overshoots and pushes the card over whatever sits beneath it.

**Size a card from its content, not from the row.** A card drawn behind its own
text needs its height before anything is drawn. Derive that height from the
blocks going into it, plus padding on both sides, and the padding is symmetric by
construction. Fix the height to a grid value instead and the leftover lands
wherever it falls, which is how one card ends up with 0.01in below its text and
its neighbour 1.45in.

```
h = pad + sum(block_heights) + sum(gaps) + pad
```

If a row of cards must fill a grid cell, share the slack across the gaps rather
than dumping it in the bottom padding — but only once every card in the row has
the same content height.

**Balance the copy across a row.** Four cards with three, three, two and three
lines of body cannot have equal padding and equal heights at the same time. One
of the two has to give. Choose equal heights, then write the copy to match.

**Anchor text to the top of its box.** This is the difference between a metric
error being invisible and being a visible misalignment. Centred text in a box
whose height came from a line-count estimate moves vertically by half the error,
so two columns sharing a `y` render at different heights. Top-anchored text can
only ever end in the wrong place, which is far less noticeable and never breaks
alignment between siblings. In pptxgenjs this is `valign:'top'`; the default is
to centre.

**Beware copy that sits on a line-count boundary.** An average-advance model
cannot predict wrapping to better than about a line, because real advance depends
on which glyphs appear. Text sized to end 1% short of a line fits in the model and
wraps in the render, so the box gains a line of space nobody asked for. Write
copy comfortably inside its line count, and let `spacing_audit.py` find the rest.

## Consistency: tokens, not eyeballing

Every deck declares its system once and derives everything from it. The
Indonesia reference build in `scripts/` uses exactly this shape:

```js
const SP = { m:0.85, gap:0.28, pad:0.24, r:0.10,
             top:0.72, titleY:1.28, bodyY:2.30, end:6.45, footY:6.85 };
const T  = { d:96, h:64, t:48, l:32, b:24, s:20 };   // display hero title lead body small
const SEC = { geo:navy, people:terracotta, econ:jade, out:gold };
const colx = (n,i,g=SP.gap) => { const w=(CW-(n-1)*g)/n; return {x:SP.m+i*(w+g), w}; };
```

Why it matters:

- **One skeleton for every slide** — label at `top`, title at `titleY`, content
  from `bodyY` to `end`, footer at `footY`. A reader's eye learns it in two slides.
- **`colx()` gives every multi-column layout the same gutters.** Two, three or
  four columns all tile the same content width.
- **Colour carries meaning.** If People is always terracotta, the reader stops
  needing the label. Reusing a colour for a different meaning breaks the system.

Title must fit **one line**. At 48pt bold in an 11.6in column that is about 31
characters. If your title needs two lines, it is a sentence, not a title.

## Layout patterns — vary them

A deck fails when every slide is the same shape. Reach for a different family
each time; never repeat one back to back.

**Structure** — contents · section divider · thesis slide · bento grid ·
card row · timeline · roadmap · process chevrons · 2x2 matrix · table exhibit

**Data** — big-number-plus-line · KPI tile grid · annotated chart · comparison
chart · progress meters · stacked composition · waterfall · donut · small
multiples · sparklines · heatmap · pinned map

**Visual** — full-bleed photo · half-bleed · photo grid · image card · scrim
overlay · single huge numeral · deliberate empty space

Cards are containment, not decoration: one idea per card, and only when the
content genuinely groups. Three identical cards across nine slides is a tell.

## Imagery

Real photographs beat generated filler, but the image must *fit the slide's claim*.

- Source free imagery from Wikimedia Commons (licence metadata is in the API
  response) or equivalent, and **attribute the photographers** on a credits slide.
- **Reject duds aggressively.** Check what you downloaded before placing it: a
  "market" search returns a crosswalk, a "landscape" returns a museum specimen.
- **No image twice** in a deck unless it is a deliberate bookend.
- Text over a photo needs a **gradient scrim**, not a flat overlay. A flat
  overlay dark enough to guarantee contrast destroys the photograph. Generate an
  RGBA PNG that is near-opaque under the words and fades to transparent.
- Then **measure** the result: render the deck twice, once with text and once
  backgrounds-only, and compute contrast from the pixels under the glyphs.
  Target 7:1. Mid-grey body text fails; near-black on white or white on
  near-black passes.

## QA — two passes, because they catch different things

**Mechanical.** `scripts/lint_deck.py` answers "is anything broken".
`scripts/spacing_audit.py` answers "is anything irregular". A deck can pass the
first and fail the second.

```bash
python3 scripts/lint_deck.py deck.pptx --floor 20                    # outlier mode
python3 scripts/lint_deck.py deck.pptx --tokens tokens.json --floor 20
python3 scripts/lint_deck.py deck.pptx --debug                       # show geometry
python3 scripts/spacing_audit.py deck.pptx --margin 0.85 --pad 0.24  # padding and gaps
bash scripts/selftest.sh                 # trust the checker before trusting its verdict
```

It checks:

| Class | What |
|---|---|
| `TYPE` | sizes off the declared scale, or used exactly once |
| `FONT` | more than two typefaces |
| `COLOUR` | colours outside the palette, or used once |
| `RADIUS` | a corner radius that differs from the deck's |
| `MARGIN` | elements inside the margin, or past the content edge |
| `ALIGN` | footers or titles at different heights |
| `TITLE` | a title that wraps to more than one line, including when a wider substitute font would wrap it |
| `FIT` | a single unbreakable token that is wider than its own box, so it will break mid-word |
| `COLLIDE` | text on text, text over a photo, **a rule or bar drawn through words**, text spilling out of its card |
| `TOO CLOSE` | elements that do not overlap but sit closer than they should |

Exit code is non-zero when it finds something, so it can gate a build.

The spacing audit reports four things the linter cannot: left edges off the
margin, padding inside every card on all four sides, the distribution of vertical
gaps, and text whose line count is fragile. None of them is an error on its own.
A spread is a question: did that value come from a token, or from an eyeball, and
did the same component use it twice?

`TOO CLOSE` exists because overlap is not the only failure. A hairline 0.09in under
a line of text does not overlap it, yet reads as a line drawn through the words.
The thresholds are calibrated deliberately:

| Pair | Minimum clearance |
|---|---|
| text next to text | 0.04in |
| a rule or bar next to text | 0.10in |

Text at 56pt or larger is exempt, because a display numeral's glyphs are far
shorter than its line box and a caption tucked under a big number is a
deliberate pattern, not a defect. All measurements are estimates from a
character-advance model, so treat a finding as "look here", not as proof.

**Visual.** Render and actually look at every slide, at full size, one slide at a
time. A contact sheet of thumbnails shrinks everything and makes type look
smaller than it is — never judge size from a grid.

The two passes are not redundant. The linter cannot see a chart's axis, a
photograph's subject, or whether a colour is *ugly*. Your eyes cannot reliably
see a 0.03in collision or a font size one step off the scale. Keep both.

**Neither pass is worth anything until you have watched it fail.** Before you
report a deck as clean, confirm the checker still fails on `fixtures/broken.pptx`
and that your own eyes have found something in a previous pass. A clean report
from an untested checker is a guess wearing a lab coat.

## Hard rules

- Nothing below the mode's hard floor. Ever. Not for citations, not for footers.
- No em dashes in slide copy. Use a comma, a colon, or rewrite.
- One-line titles. If it wraps, shorten it.
- **Top-anchor every text box.** Never let a height estimate move text vertically.
- **Reserve a line wherever text sits above something else.** Sized type is an
  estimate; the reserve is what makes the layout survive a viewer whose font is
  wider than yours. Cards, quotes, chained headings: one spare line each.
- **Run the substitution test before shipping, and look at every slide.** A deck
  checked only in the environment that built it has not been checked.
- **No nudged values.** If a gap is needed twice, it is a token.
- **Know what a build writes before running it.** Each build script prints its
  output filename, and you read that line. Running the wrong script in a
directory overwrote a finished deliverable once, silently.
- **Build scripts and checkers must read one source of truth for text metrics.**
  Two implementations of the same formula will drift, and the drift is invisible
  until the slides are wrong.
- Cards compute their own internal space: `photo_height = card_height - text_height`.
  A caption that grows must shrink the photo, not overflow the card.
- Every image gets `altText`.
- Check the file validates and renders before declaring it done.

## Known environment behaviour

- **Never assume a render's scale. Compute it from the image.** `officecli`
  silently clamps `--screenshot-width`, so requesting 1600 can yield 1280 and
  requesting 2000 can yield 1920. Assuming 150 ppi when the file came back at
  144 shifted every pixel sample about 4%, which put a contrast patch a quarter
  of an inch from where it was meant to land and made a measured figure wrong.
  Always `ppi = image.width / slide_width_inches`.
- **The officecli daemon caches the font configuration at startup.** Setting
  `FONTCONFIG_FILE` changes nothing until the resident process is stopped, so a
  substitution test can appear to pass when it never ran. Stop it first:
  `pkill -f "__resident[-]serve__"`. Use the bracket in the pattern, or the kill
  matches the shell running it and swallows your output.
- **A collision test that looks for a clear band will miss an interleave.** "Is
  there clear space somewhere between these two boxes" is always true when two
  blocks' lines alternate, because there is a clear band between any two lines
  of the same paragraph. That test reported a deck clean while the render showed
  text sitting on top of text. Ask instead whether the upper text has reached
  the lower block's start, or whether the rendered line count exceeds what the
  box was sized for.
- `officecli` keeps a **resident process** that caches files. If an external tool
  (node, python) rewrites a file, run `officecli close <file>` before rendering
  or you will QA a stale copy. This has caused a confidently wrong conclusion
  three separate times, including once where a fix appeared not to work when it
  had. Close first, then render, then measure.
- Metric-compatible clones are installed and aliased for **Calibri (Carlito)**,
  **Cambria (Caladea)** and **Georgia (Gelasio)**, plus Liberation for Arial and
  Times New Roman. Previews for those families are truthful. Any *other* family
  falls back to DejaVu, whose widths differ, so a text-fit preview for it is
  fiction rather than a rough guide. Install the clone or do not trust the look.
- **Bold is wider than regular, by a different amount in every family**: 0.489 vs
  0.449em in Cambria, 0.530 vs 0.490em in Arial. Use per-family factors from the
  metrics table, or a title predicted as one line renders as two and collides.
- `pptxgenjs` emits a phantom third `<c:axId>` on every bar chart and writes
  `<c:dPt>` after `<c:dLbls>`. PowerPoint tolerates both; strict XSD validators
  do not. See the `pptx` skill for the fix.

See [references/antipatterns.md](references/antipatterns.md) for the generated-look
catalogue.
