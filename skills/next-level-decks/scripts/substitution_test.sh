#!/usr/bin/env bash
# Render a deck with the fonts deliberately substituted by much wider ones.
#
# Why this exists: a deck verified on the machine that built it proves nothing
# about the machine that opens it. Calibri and Cambria ship with desktop Office
# ONLY, so Google Slides, mobile viewers and most web tools silently substitute
# them. A substitute 20-25% wider makes paragraphs wrap one line longer, and if
# anything was positioned from a model of how many lines the text would take,
# the blocks below it move down into it. The deck looks perfect in the build
# environment and collides on the reader's device.
#
# Measured on this machine, substituting for a design font is not subtle:
#   DejaVu Sans  is about 1.25x the width of Arial
#   DejaVu Serif is about 1.15x the width of Georgia
# so this is a genuine stress test, not a theoretical one.
#
#   bash scripts/substitution_test.sh deck.pptx [outdir]
#
# Then LOOK at the output. The linter's widened-font check catches display type
# that will wrap; only your eye catches everything else.
set -eu
DECK="${1:?usage: substitution_test.sh deck.pptx [outdir]}"
OUT="${2:-/tmp/substitution-test}"
mkdir -p "$OUT"

CONF="$OUT/fonts.conf"
cat > "$CONF" <<'XML'
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- system fonts only: the metric-compatible clones are deliberately absent,
       which is exactly the situation on a viewer that lacks the design fonts -->
  <dir>/usr/share/fonts</dir>
  <cachedir>/tmp/substitution-cache</cachedir>
  <match target="pattern"><test name="family"><string>Arial</string></test>
    <edit name="family" mode="assign" binding="strong"><string>DejaVu Sans</string></edit></match>
  <match target="pattern"><test name="family"><string>Calibri</string></test>
    <edit name="family" mode="assign" binding="strong"><string>DejaVu Sans</string></edit></match>
  <match target="pattern"><test name="family"><string>Helvetica</string></test>
    <edit name="family" mode="assign" binding="strong"><string>DejaVu Sans</string></edit></match>
  <match target="pattern"><test name="family"><string>Verdana</string></test>
    <edit name="family" mode="assign" binding="strong"><string>DejaVu Sans</string></edit></match>
  <match target="pattern"><test name="family"><string>Georgia</string></test>
    <edit name="family" mode="assign" binding="strong"><string>DejaVu Serif</string></edit></match>
  <match target="pattern"><test name="family"><string>Cambria</string></test>
    <edit name="family" mode="assign" binding="strong"><string>DejaVu Serif</string></edit></match>
  <match target="pattern"><test name="family"><string>Times New Roman</string></test>
    <edit name="family" mode="assign" binding="strong"><string>DejaVu Serif</string></edit></match>
</fontconfig>
XML

# The officecli daemon caches its font configuration at startup, so it has to be
# stopped or the substitution never reaches the render. Match the pattern with a
# bracket so this script does not kill its own shell.
pkill -f "__resident[-]serve__" 2>/dev/null || true
sleep 2

echo "substituting:"
for f in Arial Calibri Georgia Cambria "Times New Roman"; do
  printf '  %-16s -> %s\n' "$f" "$(FONTCONFIG_FILE="$CONF" fc-match -f '%{family}' "$f")"
done

N=$(python3 - "$DECK" <<'PY'
import re, sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
print(len([n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)]))
PY
)

echo "rendering $N slides to $OUT ..."
for i in $(seq 1 "$N"); do
  FONTCONFIG_FILE="$CONF" officecli view "$DECK" screenshot \
    --page "$i" -o "$OUT/slide-$(printf '%02d' "$i").png" --screenshot-width 1300 >/dev/null 2>&1 || true
done

echo "done. Look at every slide in $OUT."
echo "Compare against the normal render. Any text that has grown into the block"
echo "below it, or into a card edge, is a real defect on a reader's device."
