#!/usr/bin/env bash
# Regression harness for lint_deck.py.
#
# Every assertion below encodes an INTENT, not an observed number. If the
# checker starts passing a fixture it should fail, or failing one it should
# pass, that is a regression in the checker and this script says so.
#
#   bash scripts/selftest.sh
#
# Run this after any change to lint_deck.py. A checker whose own behaviour is
# untested is worth nothing, because you will believe it.
set -u
cd "$(dirname "$0")/.."
FIX=fixtures
TOK="--tokens $FIX/tokens.json --floor 20"
pass=0; fail=0

if [ ! -f "$FIX/clean.pptx" ]; then
  echo "building fixtures..."
  NODE_PATH=$(npm root -g) node "$FIX/build_fixtures.js" || exit 1
fi

check() { # name | expectation | condition
  if [ "$3" = "true" ]; then printf '  PASS  %-42s %s\n' "$1" "$2"; pass=$((pass+1))
  else printf '  FAIL  %-42s %s\n' "$1" "$2"; fail=$((fail+1)); fi
}

run() { python3 scripts/lint_deck.py "$1" $TOK 2>&1; }

# 1. A well-formed deck must be clean. Any finding here is a false positive,
#    and false positives are how a checker loses its authority.
out=$(run $FIX/clean.pptx); n=$(echo "$out" | tail -1)
check "clean deck is silent" "expected 0 issues, got: $n" \
      "$(echo "$n" | grep -q '^  0 issue' && echo true || echo false)"

# 2. A deck stuffed with defects must fail loudly, across several classes.
out=$(run $FIX/broken.pptx)
check "broken deck fails loudly" "expected TYPE+COLOUR+MARGIN+COLLIDE" \
      "$(for c in TYPE COLOUR MARGIN COLLIDE; do echo "$out" | grep -q "^  $c\$" || echo no; done | grep -q no && echo false || echo true)"

# 3. A rule 0.09in under a line of text does not overlap it, and is still wrong.
out=$(run $FIX/tight.pptx); n=$(echo "$out" | tail -1)
check "rule under text is TOO CLOSE" "expected 1 issue, got: $n" \
      "$(echo "$out" | grep -q 'TOO CLOSE' && echo "$n" | grep -q '^  1 issue' && echo true || echo false)"

# 4. Two blocks grazing by 0.11in is a rounding artefact, not a collision.
#    Flagging this would teach the operator to ignore the checker.
out=$(run $FIX/knife.pptx); n=$(echo "$out" | tail -1)
check "rounding case stays quiet" "expected 0 issues, got: $n" \
      "$(echo "$n" | grep -q '^  0 issue' && echo true || echo false)"

# 5. Text spilling out of its card must be caught, including when the cause is
#    line spacing rather than the text itself being too long.
out=$(run $FIX/overflow.pptx); n=$(echo "$out" | tail -1)
check "card overflow is caught" "expected 1 issue, got: $n" \
      "$(echo "$out" | grep -q 'COLLIDE' && echo true || echo false)"

# 6. A title that wraps breaks the one-line-title rule and collides with the
#    body under it, so it must be reported by name and not only as a collision.
out=$(run $FIX/wrappedtitle.pptx)
check "wrapped title is reported" "expected a TITLE finding" \
      "$(echo "$out" | grep -q 'TITLE' && echo true || echo false)"

# 7. A number cannot wrap, so a box too narrow for it makes the renderer break
#    the number in half. That is a wrong number on screen, not just a layout
#    flaw, so it must be reported by name.
out=$(run $FIX/toowide.pptx)
check "oversized token is reported" "expected a FIT finding" \
      "$(echo "$out" | grep -q 'FIT' && echo true || echo false)"

# 8. Exit code must be usable as a build gate.
python3 scripts/lint_deck.py $FIX/clean.pptx $TOK >/dev/null 2>&1; ok_clean=$?
python3 scripts/lint_deck.py $FIX/broken.pptx $TOK >/dev/null 2>&1; ok_broken=$?
check "exit code gates a build" "clean=$ok_clean (want 0), broken=$ok_broken (want 1)" \
      "$([ "$ok_clean" = 0 ] && [ "$ok_broken" != 0 ] && echo true || echo false)"

echo
echo "  $pass passed, $fail failed"
[ "$fail" = 0 ]
