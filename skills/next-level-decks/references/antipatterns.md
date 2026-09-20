# Antipatterns: what makes a deck look generated

Each entry: the tell, why it reads as machine-made, and what to do instead.

## Layout

**Three equal cards, repeated.** The single most common generated layout. It
says "I had three things and no idea which mattered." Cards must differ in size
or not be cards at all. Use a bento grid with unequal tiles, or a ranked list.

**Accent bar under every title.** Also: full-width header bars, coloured stripes
down a slide edge, a single-side border on a card. These are the visual equivalent
of throat-clearing. Use whitespace or a background tint instead.

**Every slide the same density.** A deck needs a pulse: a loud full-bleed
statement, then a dense evidence slide, then one quiet line. Uniform volume is
what makes a deck feel endless.

**Centred body text.** Centre titles if you like. Centre a paragraph and it
becomes a wall. Left-align anything longer than a line.

**Icon in a coloured circle.** Borrowed from feature grids and now meaningless.
If an icon carries no information, drop it.

**Tiny decorative labels.** "01 / 02 / 03" chips, "SECTION" tags, small pills,
system markers, fake interface jargon. If removing it loses nothing, it was noise.

## Colour

**Equal-weight palettes.** Four colours each used 25% of the time looks like a
swatch library. One colour should dominate (60-70%), with one accent that earns
attention by being rare.

**Default blue.** Or purple gradients, or the pastel-blue template background.
Pick colours that belong to *this* subject.

**Cream and beige as a default.** Not banned as an art direction; banned as a
fallback when no decision was made.

**Low-contrast grey body text.** `#6B7280` on white is about 4.2:1 on a monitor
and far worse through a projector. Use near-black. Test the actual rendered
pixels, not the hex codes.

## Type

**Everything between 12 and 16pt.** A presentation, not a document. See the
type floors in SKILL.md.

**Weak hierarchy.** A 22pt header above 18pt body is a difference nobody sees.
The title should be roughly twice the body.

**Two-line titles.** If a title wraps, it is a sentence. Shorten it or move the
excess into a subtitle.

**Every word at the same weight.** Weight, not just size, creates hierarchy.
Bold the claim, regular the support.

**A serif chosen by default.** Times New Roman at display size is the tell that
nobody chose, and it reads as a legal brief rather than a designed page. If you
want a serif, pick one deliberately and check its display figures: Georgia
renders old-style figures by default, which looks intentional in an editorial
deck and wrong in a row of statistics.

## Content

**Selling in a room that wants evidence.** Company profiles, pitches and
launches reward persuasion. Postmortems, architecture reviews, academic work and
internal bad news do not: there, polish reads as spin and adjectives read as a
cover story. Same craft, different register. See "Turn the advocacy down" in
SKILL.md.

**A deck with no decision to drive.** If nobody has to decide, approve or act
after reading it, the deck is a document, and prose serves a document better.

**Labels instead of claims.** "Distribution" is a category; "Half the country
lives on one island" is a point. A deck of categories makes the reader do the work.

**Bullet lists where a chart belongs.** Three numbers in a sentence is fine;
six is a bar chart.

**Charts that say nothing.** Four identical bars, a pie with one dominant slice,
a trend with no annotation. If the chart cannot be summarised in one sentence,
it is decoration. Annotate the interesting point directly on the plot.

**Stock photography of the idea rather than the thing.** Handshakes, people
pointing at laptops, glowing network spheres. Use a photograph of something real.

## Process

**Trusting the first render.** It always has defects. The commonest are text
overflowing its box, an element clipping the slide edge, and a low-contrast
overlay.

**Reading the generating code instead of the output.** You will see what you
meant to write. Look at the image.

**Editing a deck by hand when a generator exists.** Fix the script and rebuild,
or the next build loses the fix.

**Reporting a clean lint as verification.** The worst entry here, because it
spends the reader's trust as well as their time. A checker built from the same
assumptions as the generator will always agree with it, including when both are
wrong. Say what you actually did: "the linter is clean and I have not looked at
the slides" is honest, useful, and takes ten seconds.

**Judging from a contact sheet.** A grid of thumbnails shrinks everything, so a
48pt title looks like a 28pt one and a collision disappears. Type size and
spacing can only be judged one slide at a time, at full size.

**Running a build without knowing what it writes.** Scripts named `build.js`
sit in directories `build2` through `build4` came from. Running the wrong one
overwrites a finished deliverable, silently, and you find out later.

**Previewing a font you do not have.** The renderer substitutes and reflows, and
you review a layout that will never exist on the reader's machine. Install the
metric-compatible clone so the preview is true, or do not draw a conclusion from
it.
