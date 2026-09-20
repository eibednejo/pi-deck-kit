/* Fixture decks for self-testing lint_deck.py.
 *
 * A checker nobody tests is a checker nobody should trust. Each fixture below
 * exists to prove one specific behaviour, and the expectations live in
 * scripts/selftest.sh next to the reason for them.
 *
 *   NODE_PATH=$(npm root -g) node fixtures/build_fixtures.js
 *
 * Writes clean.pptx, broken.pptx, tight.pptx, knife.pptx, overflow.pptx.
 */
const P = require('pptxgenjs');
const F = 'Calibri', SERIF = 'Cambria';
const INK = '1E293B', MUTED = '64748B', LINE = 'E2E8F0', PANEL = 'F8FAFC', PAPER = 'FFFFFF';

// tokens shared by every fixture, so the only thing varying is the defect
const SP = { m: 0.85, top: 0.72, titleY: 1.28, bodyY: 2.30, end: 6.45, footY: 6.85 };
const T  = { t: 44, l: 28, b: 20, s: 20 };

const card = (p, s, x, y, w, h, fill) => s.addShape(p.ShapeType.roundRect, {
  x, y, w, h, rectRadius: 0.10,
  fill: { color: fill || PANEL }, line: { color: LINE, width: 1 } });
const txt = (s, t, o) => s.addText(t, Object.assign({ fontFace: F, margin: 0 }, o));

// A well-formed content slide: label at top, one-line title, body, footer.
function content(p, lab, title, body, opt) {
  opt = opt || {};
  const s = p.addSlide(); s.background = { color: PAPER };
  s.addText(lab, { x: SP.m, y: SP.top, w: 9, h: 0.44, fontFace: F, fontSize: T.s,
    bold: true, color: '1D4ED8', charSpacing: 2.6, margin: 0 });
  s.addText(title, { x: SP.m, y: SP.titleY, w: 11.63, h: 0.9, fontFace: SERIF,
    fontSize: T.t, bold: true, color: '1E3A8A', margin: 0 });
  if (body !== null) s.addText(body, { x: SP.m + 0.02, y: SP.bodyY, w: opt.w || 7.4,
    h: 1.6, fontFace: F, fontSize: opt.pt || T.b, color: opt.color || MUTED,
    lineSpacingMultiple: opt.lsm || 1.18, margin: 0 });
  if (opt.foot !== false) {
    s.addText(lab, { x: SP.m, y: SP.footY, w: 8, h: 0.42, fontFace: F,
      fontSize: T.s, color: MUTED, charSpacing: 2.6, margin: 0 });
    s.addText(opt.folio || '01', { x: 11.5, y: SP.footY, w: 1, h: 0.42, fontFace: F,
      fontSize: T.s, color: MUTED, align: 'right', margin: 0 });
  }
  return s;
}

// ── clean.pptx: must report ZERO. Any finding here is a false positive. ──
function buildClean(p) {
  p.addSlide(); // cover carries no label/footer, so it is not audited as content
  content(p, '01  ABOUT', 'A firm that ships', 'A body paragraph on scale with normal spacing.', { folio: '02' });
  let s = content(p, '02  APPROACH', 'How we work', null, { folio: '03' });
  card(p, s, SP.m, SP.bodyY, 3.66, 2.4);
  txt(s, 'Scope', { x: SP.m + 0.24, y: SP.bodyY + 0.24, w: 3.18, h: 0.4,
    fontSize: T.b, bold: true, color: '1E3A8A' });
  txt(s, 'Agree the problem and what done means.', { x: SP.m + 0.24, y: SP.bodyY + 0.80,
    w: 3.18, h: 1.2, fontSize: T.b, color: MUTED, lineSpacingMultiple: 1.18 });
}

// ── broken.pptx: eight planted defects. The checker MUST fail loudly. ──
function buildBroken(p) {
  // 1 off-scale size + a colour outside any palette
  let s = content(p, 'BROKEN', 'Off-scale type', null, { folio: '01' });
  txt(s, 'A body line at 27pt, which is not on the scale.', { x: SP.m + 0.02, y: SP.bodyY,
    w: 7.4, h: 0.9, fontSize: 27, color: 'B0007A' });
  s = content(p, 'BROKEN', 'Text on text', null, { folio: '02' });
  txt(s, 'This paragraph sits exactly where the next one does.', { x: SP.m + 0.02, y: SP.bodyY,
    w: 6, h: 1.0, fontSize: T.b, color: MUTED });
  txt(s, 'And here is the second paragraph, in the same space.', { x: SP.m + 0.02, y: SP.bodyY + 0.10,
    w: 6, h: 1.0, fontSize: T.b, color: MUTED });
  // 3 a meter bar drawn through the words
  s = content(p, 'BROKEN', 'Bar through text', null, { folio: '03' });
  txt(s, 'Share of ASEAN people', { x: SP.m + 0.02, y: 3.00, w: 4.3, h: 0.5,
    fontSize: T.b, color: INK });
  card(p, s, SP.m, 3.18, 5.4, 0.20, 'E5E0D8');
  s.addShape(p.ShapeType.roundRect, { x: SP.m, y: 3.18, w: 2.3, h: 0.20,
    fill: { color: 'C4552A' }, rectRadius: 0.10, line: { color: 'C4552A' } });
  // 4 footer at the wrong height, 5 title at the wrong height
  s = content(p, 'BROKEN', 'Misaligned furniture', null, { folio: '04' });
  s.addText('BROKEN', { x: SP.m, y: 6.60, w: 8, h: 0.42, fontFace: F, fontSize: T.s,
    color: MUTED, charSpacing: 2.6, margin: 0 });
  // 6 text spilling out of its card
  s = content(p, 'BROKEN', 'Spilling card', null, { folio: '05' });
  card(p, s, SP.m, SP.bodyY, 3.66, 0.90);
  txt(s, 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen.',
    { x: SP.m + 0.24, y: SP.bodyY + 0.24, w: 3.18, h: 0.6, fontSize: T.b, color: MUTED,
      lineSpacingMultiple: 1.18 });
  // 7 text past the content edge, 8 something inside the margin
  s = content(p, 'BROKEN', 'Past the edge', null, { folio: '06' });
  txt(s, 'This block runs well past the content edge and off the bottom of the slide.',
    { x: SP.m + 0.02, y: 5.90, w: 5.0, h: 1.2, fontSize: T.b, color: MUTED,
      lineSpacingMultiple: 1.18 });
  txt(s, 'Inside the margin', { x: 0.20, y: 3.40, w: 4, h: 0.5, fontSize: T.b, color: INK });
}

// ── tight.pptx: a rule 0.09in under a line of text. No overlap, still wrong. ──
function buildTight(p) {
  const s = p.addSlide(); s.background = { color: PAPER };
  s.addText('02  APPROACH', { x: SP.m, y: SP.top, w: 9, h: 0.44, fontFace: F, fontSize: T.s,
    bold: true, color: '1D4ED8', charSpacing: 2.6, margin: 0 });
  s.addText('Rules we stick to', { x: SP.m, y: SP.titleY, w: 11.63, h: 0.9, fontFace: SERIF,
    fontSize: T.t, bold: true, color: '1E3A8A', margin: 0 });
  s.addText('Stability beats novelty in production.', { x: SP.m + 0.02, y: 2.83, w: 6.6,
    h: 0.5, fontFace: F, fontSize: 24, color: MUTED, margin: 0 });
  // 0.09in below the text baseline region: reads as a line through the words
  s.addShape(p.ShapeType.rect, { x: SP.m, y: 3.29, w: 6.6, h: 0.01,
    fill: { color: LINE }, line: { color: LINE } });
  s.addText('02  APPROACH', { x: SP.m, y: SP.footY, w: 8, h: 0.42, fontFace: F,
    fontSize: T.s, color: MUTED, charSpacing: 2.6, margin: 0 });
}

// ── knife.pptx: text blocks closer than a line-box model predicts, because the
//    paragraph sits right on a character boundary. Must stay SILENT: flagging
//    this teaches the operator to ignore the checker.
function buildKnife(p) {
  const s = p.addSlide(); s.background = { color: PAPER };
  s.addText('01  ABOUT', { x: SP.m, y: SP.top, w: 9, h: 0.44, fontFace: F, fontSize: T.s,
    bold: true, color: '1D4ED8', charSpacing: 2.6, margin: 0 });
  s.addText('Where engagements land', { x: SP.m, y: SP.titleY, w: 11.63, h: 0.9,
    fontFace: SERIF, fontSize: T.t, bold: true, color: '1E3A8A', margin: 0 });
  s.addText('Self-hosted or cloud, your choice. Documentation, access and runbooks at handover, so your team can run it without us.',
    { x: SP.m + 0.02, y: 2.60, w: 7.0, h: 1.6, fontFace: F, fontSize: 28, color: 'DBEAFE',
      lineSpacingMultiple: 1.18, margin: 0 });
  // 0.11in above where the block above is modelled to end
  s.addText('If only we can run it, we failed.', { x: SP.m + 0.02, y: 4.73, w: 7.0, h: 0.5,
    fontFace: SERIF, fontSize: 28, bold: true, color: '1E293B', margin: 0 });
  s.addText('01  ABOUT', { x: SP.m, y: SP.footY, w: 8, h: 0.42, fontFace: F,
    fontSize: T.s, color: MUTED, charSpacing: 2.6, margin: 0 });
}

// ── overflow.pptx: a spaced paragraph spilling out of its card. This is the
//    failure that line-spacing blindness hides, so it gets its own fixture.
function buildOverflow(p) {
  const s = content(p, '03  PRODUCTS', 'Products we ship', null, { folio: '01' });
  // Card sized so the paragraph FITS if you ignore line spacing (3 lines at
  // 1.0x = 1.02in) and SPILLS once you account for it (3 lines at 1.35x =
  // 1.37in). A card that overflows either way would not test the spacing rule.
  card(p, s, SP.m, SP.bodyY, 5.0, 1.35);
  txt(s, 'A paragraph set at 1.35x spacing, sized as though it were 1.0, so it leaves the box.',
    { x: SP.m + 0.24, y: SP.bodyY + 0.24, w: 4.5, h: 0.5, fontSize: T.b, color: MUTED,
      lineSpacingMultiple: 1.35 });
}

// ── wrappedtitle.pptx: a title that runs to two lines. SKILL.md calls
//    one-line titles a hard rule, and a wrapped title also collides with
//    whatever sits under it, so the checker should say so by name.
function buildWrappedTitle(p) {
  const s = p.addSlide(); s.background = { color: PAPER };
  s.addText('01  ABOUT', { x: SP.m, y: SP.top, w: 9, h: 0.44, fontFace: F, fontSize: T.s,
    bold: true, color: '1D4ED8', charSpacing: 2.6, margin: 0, valign: 'top' });
  s.addText('A title long enough that it cannot possibly stay on a single line',
    { x: SP.m, y: SP.titleY, w: 11.63, h: 1.6, fontFace: SERIF, fontSize: T.t,
      bold: true, color: '1E3A8A', margin: 0, valign: 'top' });
  s.addText('Body text sitting where the wrapped title runs into it.',
    { x: SP.m + 0.02, y: SP.bodyY, w: 7.4, h: 1.0, fontFace: F, fontSize: T.b,
      color: MUTED, lineSpacingMultiple: 1.18, margin: 0, valign: 'top' });
  s.addText('01  ABOUT', { x: SP.m, y: SP.footY, w: 8, h: 0.42, fontFace: F,
    fontSize: T.s, color: MUTED, charSpacing: 2.6, margin: 0, valign: 'top' });
}

// ── toowide.pptx: a single unbreakable token wider than its own box. A number
//    cannot wrap at all, so the renderer breaks it in half: a data error on
//    screen, not merely a layout one. The checker must name it.
function buildTooWide(p) {
  const s = content(p, '04  DATA', 'A number wider than its box', null, { folio: '01' });
  // "$12,345" needs about 2.7in at 44pt; this box is 1.6in
  txt(s, '$12,345', { x: SP.m + 0.02, y: SP.bodyY, w: 1.6, h: 0.9,
    fontSize: 44, bold: true, color: '1E3A8A' });
  txt(s, 'Identity cards issued, cumulative.', { x: SP.m + 0.02, y: SP.bodyY + 0.9,
    w: 7.4, h: 0.5, fontSize: T.b, color: MUTED });
}

const BUILDS = [['clean', buildClean], ['broken', buildBroken], ['tight', buildTight],
                ['knife', buildKnife], ['overflow', buildOverflow],
                ['wrappedtitle', buildWrappedTitle], ['toowide', buildTooWide]];
const only = process.argv[2];

(async () => {
  for (const [name, fn] of BUILDS) {
    if (only && only !== name) continue;
    const p = new P(); p.layout = 'LAYOUT_WIDE';
    fn(p);
    await p.writeFile({ fileName: `${__dirname}/${name}.pptx` });
    console.log(`  built ${name}.pptx`);
  }
})();
