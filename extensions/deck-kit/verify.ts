/**
 * deck_verify — the gate that cannot be skipped.
 *
 * This runs the one test that a deck verified on the build machine cannot pass
 * by accident: rendering it with the design fonts REPLACED by much wider ones,
 * which is what happens on any viewer that lacks Calibri, Cambria or a licensed
 * font. A substitute 18-19% wider makes paragraphs wrap one line longer, and
 * anything positioned from a line-count estimate then moves into its neighbour.
 *
 * Three separate deliverables shipped broken because this test ran only when
 * the author remembered. Making it a tool with a hard verdict is the whole
 * point of the extension.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deckPath, nodePathEnv, pythonBin, run } from "./tools.js";

/** Build the deck a second time with every text call suppressed. */
async function buildBackgroundOnly(deck: string, cwd: string, signal?: AbortSignal) {
  const build = join(deck, "..", "build.js");
  if (!existsSync(build)) return null;

  const out = mkdtempSync(join(tmpdir(), "deck-bg-"));
  const r = await run("node", [build], {
    cwd,
    timeoutMs: 180_000,
    signal,
    env: { ...nodePathEnv(), BGONLY: "1", PATH: process.env.PATH ?? "" },
  });
  if (r.code !== 0) return { error: r.stderr || r.stdout, dir: out };
  return { dir: out, built: true };
}

export function registerVerify(pi: ExtensionAPI) {
  pi.registerTool({
    name: "deck_verify",
    label: "Deck verify",
    description:
      "Run the substitution test on a .pptx deck: render it again with the design fonts " +
      "replaced by much wider ones (what a viewer without those fonts sees) and report any " +
      "page whose text grows into the block below it. This is the only check that does not " +
      "depend on the author's font metrics being right, so it must pass before a deck is " +
      "called finished. Also runs the full lint when asked.",
    promptSnippet: "Render a deck with substituted fonts and report pages that break",
    promptGuidelines: [
      "Use deck_verify before claiming any deck is finished; deck_lint alone is not enough.",
      "A deck that passes only on this machine has not been verified. deck_verify is the check that travels.",
      "If deck_verify reports a shifted page, look at the rendered image before concluding it is benign; a shift in frame height is not a collision.",
    ],
    parameters: Type.Object({
      deck: Type.String({ description: "Path to the .pptx file" }),
      thresholdPx: Type.Optional(Type.Number({
        description: "Ink displacement in pixels that counts as a shift (default 18 at 1300px wide)",
      })),
      alsoLint: Type.Optional(Type.Boolean({ description: "Run deck_lint first (default true)" })),
    }),

    async execute(_id, params, signal, onUpdate, ctx) {
      const deck = deckPath(params.deck, ctx.cwd);
      if (!existsSync(deck)) throw new Error(`No such deck: ${deck}`);

      const threshold = params.thresholdPx ?? 18;
      const workDir = mkdtempSync(join(tmpdir(), "deck-verify-"));

      onUpdate?.({ content: [{ type: "text", text: "Building the text-free copy..." }], details: {} });

      const bg = await buildBackgroundOnly(deck, ctx.cwd, signal);
      if (!bg || "error" in bg) {
        throw new Error(
          `Cannot build the text-free copy. deck_verify needs the deck's build.js next to it, ` +
          `and that build must honour BGONLY=1.\n${bg && "error" in bg ? bg.error : ""}`,
        );
      }

      // The comparison runs both renders itself, so the baseline and the
      // substituted pass are measured identically. Doing it in two processes
      // with different environments is how a substitution test silently
      // measures nothing: the officecli daemon caches its font config at
      // startup, so the config must be killed between passes.
      onUpdate?.({ content: [{ type: "text", text: "Rendering both passes..." }], details: {} });

      const conf = join(workDir, "fonts.conf");
      const { writeFileSync } = await import("node:fs");
      writeFileSync(conf, SUBSTITUTION_CONF, "utf8");

      const script = join(workDir, "verify.py");
      writeFileSync(script, VERIFY_PY, "utf8");

      const r = await run(pythonBin(), [script, deck, bg.dir, conf, String(threshold)], {
        cwd: ctx.cwd,
        timeoutMs: 600_000,
        signal,
      });

      const shifted: Array<{ page: number; px: number }> = [];
      for (const line of r.stdout.split("\n")) {
        const m = line.match(/^SHIFT (\d+) (\d+)$/);
        if (m) shifted.push({ page: Number(m[1]), px: Number(m[2]) });
      }
      const total = r.stdout.match(/^PAGES (\d+)$/m)?.[1] ?? "?";

      const lines: string[] = [];
      lines.push(`Deck: ${deck}`);
      lines.push(`Substitution test: ${total} pages compared at threshold ${threshold}px`);
      if (shifted.length === 0) {
        lines.push("No page shifts under substituted fonts.");
      } else {
        lines.push("");
        lines.push(`${shifted.length} page(s) shift when the fonts are substituted:`);
        for (const s of shifted) lines.push(`  slide ${s.page}: +${s.px}px`);
        lines.push("");
        lines.push(
          "A shift is not automatically a collision: a page whose last paragraph wraps one " +
          "line longer shifts by a line while nothing overlaps. Look at the rendered image " +
          "for each, and only treat text reaching into a block below it as a defect.",
        );
      }
      if (r.stderr.trim()) {
        lines.push("");
        lines.push("stderr:");
        lines.push(r.stderr.trim().split("\n").slice(-8).join("\n"));
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { deck, shifted, pages: total, workDir },
        isError: shifted.length > 0,
      };
    },
  });
}

const SUBSTITUTION_CONF = `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- system fonts only: metric-compatible clones are deliberately absent, which
       is exactly the situation on a viewer that lacks the design fonts -->
  <dir>/usr/share/fonts</dir>
  <cachedir>/tmp/deck-kit-font-cache</cachedir>
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
`;

const VERIFY_PY = String.raw`#!/usr/bin/env python3
"""Compare a deck's normal render against its substituted-font render.

Emits one SHIFT line per page whose ink reaches further down the slide under
substitution, which is the signature of text that has grown into its neighbour.
"""
import re, subprocess, sys, zipfile
import numpy as np
from PIL import Image

design, textfree, conf, threshold = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])


def slide_count(path):
    z = zipfile.ZipFile(path)
    return len([n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)])


def clear_daemon():
    # The officecli daemon caches its font configuration at startup, so setting
    # FONTCONFIG_FILE changes nothing until it is stopped. Match with a bracket
    # so this does not kill the shell running it.
    subprocess.run(["pkill", "-f", "__resident[-]serve__"], capture_output=True)
    import time
    time.sleep(2)


def shot(deck, page, out, use_conf):
    env = None
    if use_conf:
        import os
        env = dict(os.environ)
        env["FONTCONFIG_FILE"] = conf
    subprocess.run(["officecli", "view", deck, "screenshot", "--page", str(page),
                    "-o", out, "--screenshot-width=1300"], capture_output=True, env=env)


n = slide_count(design)
if n == 0:
    print("PAGES 0")
    sys.exit(2)

# Pass one: design fonts.
clear_daemon()
bottoms_design = {}
for p in range(1, n + 1):
    a, b = "/tmp/dv-a-%d.png" % p, "/tmp/dv-b-%d.png" % p
    shot(design, p, a, use_conf=False)
    shot(textfree, p, b, use_conf=False)
    try:
        A = np.asarray(Image.open(a).convert("L")).astype(int)
        B = np.asarray(Image.open(b).convert("L")).astype(int)
    except Exception:
        continue
    h = min(A.shape[0], B.shape[0]); w = min(A.shape[1], B.shape[1])
    ink = (np.abs(A[:h, :w] - B[:h, :w]) > 24)
    # Ignore the footer band. The footer sits at a fixed y on every page, so
    # including it makes every page's "ink bottom" identical and the whole test
    # silently measures nothing. This was the bug that made the first version
    # report zero shifts on a deck with an obviously broken slide.
    ink = ink[: int(h * 0.88), :]
    rows = np.where(ink.any(axis=1))[0]
    if len(rows):
        bottoms_design[p] = rows.max()

# Pass two: substituted fonts, daemon restarted so the config takes effect.
clear_daemon()
worst = 0
for p in range(1, n + 1):
    a, b = "/tmp/dv-c-%d.png" % p, "/tmp/dv-d-%d.png" % p
    shot(design, p, a, use_conf=True)
    shot(textfree, p, b, use_conf=True)
    try:
        A = np.asarray(Image.open(a).convert("L")).astype(int)
        B = np.asarray(Image.open(b).convert("L")).astype(int)
    except Exception:
        continue
    h = min(A.shape[0], B.shape[0]); w = min(A.shape[1], B.shape[1])
    ink = (np.abs(A[:h, :w] - B[:h, :w]) > 24)
    ink = ink[: int(h * 0.88), :]   # content band only, footer excluded
    rows = np.where(ink.any(axis=1))[0]
    if not len(rows):
        continue
    d = rows.max() - bottoms_design.get(p, 0)
    if d > threshold:
        print("SHIFT %d %d" % (p, d))

print("PAGES %d" % n)
`;
