# pi-deck-kit

Deck quality gates for [pi](https://pi.dev): lint, substitution-test and photo
sourcing for `.pptx` decks, bundled with the `next-level-decks` skill.

The point of this package is one specific failure.

A deck that looks correct on the machine that built it is not verified. Most
office fonts do not travel: Calibri and Cambria ship with **desktop Office only**,
so Google Slides, mobile viewers and most web tools substitute something wider.
A substitute 18% wider makes a paragraph wrap one extra line, and anything
positioned from a line-count estimate then moves into whatever sits below it.

Three decks were built and shipped with that defect. The substitution test that
catches it existed the whole time; it ran only when the author remembered. Two of
those decks failed on **7 of 13** and **20 of 28** slides.

A gate that depends on memory is not a gate. So this package turns it into a tool
with a hard verdict.

## Install

```bash
pi install git:github.com/<you>/pi-deck-kit
```

Or try it without installing:

```bash
pi -e git:github.com/<you>/pi-deck-kit
```

Or from a local checkout:

```bash
pi install /path/to/pi-deck-kit
```

## What you get

| Tool | What it does |
|---|---|
| `deck_lint` | Linter + spacing audit + checker self-test, one call, hard pass/fail |
| `deck_verify` | Renders with **substituted fonts** and reports pages that break |
| `deck_photo` | Searches Wikimedia Commons, downloads candidates, returns a contact sheet |
| `deck_new` | Scaffolds a deck from a template that already passes every gate |

| Command | What it does |
|---|---|
| `/deck` | Every deck in the project, with size and verification status |
| `/deck-lint <file>` | How to lint one deck |
| `/deck-verify <file>` | How to substitution-test one deck |

Plus a hook: after any `node build.js` that produces a `.pptx`, the deck is
marked unverified until `deck_verify` runs on it, and you get told once.

## The two gates that matter

**`deck_lint` answers "is anything broken or irregular".** It wraps three scripts
that answer different questions, because a deck can pass one and fail another:

- `lint_deck.py` — overlap, overflow, off-scale type, stray colours, wrapped
  titles, tokens wider than their own box
- `spacing_audit.py` — uneven padding, gaps with too many distinct values, copy
  whose line count is fragile
- `selftest.sh` — whether the checker itself is still working

**`deck_verify` answers "does it survive someone else's machine".** This is the
one that travels. It builds the deck a second time with all text suppressed,
renders both versions with the design fonts replaced by DejaVu (1.14x Arial,
1.19x Arial Bold), and reports any page whose content reaches further down the
slide under substitution.

`deck_verify` needs two things from your deck:

1. A `build.js` next to the `.pptx` that accepts the output path conventionally.
2. That build must honour `BGONLY=1` by suppressing every text call. The template
   does this; see the `if (BGONLY)` lines near the top.

## Requirements

- Python 3 with `Pillow` and `numpy` (used by the audit and the render compare)
- Node with `pptxgenjs` available to the deck's own build
- `firefox`-based rendering is not used; the package expects `officecli` for
  screenshots. Without it, `deck_verify` cannot render.

Fontconfig is used to force the substitution. On a machine without the
metric-compatible clones installed, both passes render identically and
`deck_verify` will under-report. If it ever reports zero shifts on a deck you
believe is at risk, verify that substitution is actually happening:

```bash
FONTCONFIG_FILE=/tmp/fonts.conf fc-match Arial    # must NOT say Arial
```

## The skill

`skills/next-level-decks/` carries the method: the design direction, the
substitution rules, the measured font-metric tables, the spacing ladder, the
antipattern catalogue, and the fixtures that prove the checker can fail.

Load it whenever a deck is involved. The extension enforces; the skill explains.

## Why the Python is not rewritten

The linter, the audit and the self-test are Python and they are tested. The
extension wraps them rather than reimplementing them, because two
implementations of the same measurement drift apart and the drift is invisible
until a deck is wrong on someone else's machine. That mistake has already been
made once in this project, with a font-metric table duplicated between a build
script and its checker.

## Honest limitations

- **`deck_verify` reports shifts, not collisions.** A page whose last paragraph
  wraps one line longer shifts by a line while nothing overlaps. Every reported
  page needs a look before it is called a defect.
- **The linter's `FIT` and `TITLE` checks are estimates.** They use
  character-advance arithmetic. They find candidates; the render decides.
- **`deck_photo` returns candidates, not answers.** A Commons search for "Sea of
  Galilee landscape" returns a map with Hebrew labels. Four of thirteen
  downloaded candidates in one session were unusable, and every one had a good
  title. Look at the contact sheet.
- **The gate cannot judge taste.** It catches a broken layout, not a boring one.

## Licence

MIT
