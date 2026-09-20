/**
 * deck_lint — run the linter, the spacing audit and the self-test in one call.
 *
 * Why one tool instead of three shell commands: the gates are only useful if
 * they are ALWAYS run, and a command the model has to remember gets skipped.
 * The three answer different questions and a deck can pass one while failing
 * another, so they belong together.
 *
 *   lint_deck.py      is anything BROKEN
 *   spacing_audit.py  is anything IRREGULAR
 *   selftest.sh       is the checker itself still working
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { deckPath, pythonBin, run, scriptPath, skillDir } from "./tools.js";

/** Findings are lines like "  slide  7  text on text ..." under a CLASS header. */
function summarise(output: string): string[] {
  const lines = output.split("\n");
  const findings: string[] = [];
  let currentClass = "";
  for (const line of lines) {
    const header = line.match(/^ {2}([A-Z][A-Z ]+)$/);
    if (header) { currentClass = header[1].trim(); continue; }
    if (/^ {4}\S/.test(line) && currentClass) findings.push(`${currentClass}: ${line.trim()}`);
  }
  return findings;
}

function countLine(output: string): string {
  const m = output.match(/^\s*(\d+) issue\(s\) across (\d+) slides?$/m);
  return m ? `${m[1]} issue(s) across ${m[2]} slides` : "(no summary line)";
}

/** A tokens.json next to the deck turns outlier mode into a declared contract. */
function findTokens(deck: string): string | null {
  if (process.env.PI_DECK_TOKENS && existsSync(process.env.PI_DECK_TOKENS)) {
    return process.env.PI_DECK_TOKENS;
  }
  const dir = join(deck, "..");
  for (const name of ["tokens.json", "deck-tokens.json"]) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export function registerLint(pi: ExtensionAPI) {
  pi.registerTool({
    name: "deck_lint",
    label: "Deck lint",
    description:
      "Check a .pptx deck for defects and irregularities. Runs the linter (broken things: " +
      "overlap, overflow, off-scale type, stray colours), the spacing audit (irregular " +
      "things: uneven padding, gaps with too many distinct values, copy whose line count is " +
      "fragile) and the checker's own self-test. Returns findings and a non-zero status when " +
      "anything fails. Run this after every rebuild, and before telling anyone a deck is done.",
    promptSnippet: "Check a .pptx deck for layout defects and spacing irregularities",
    promptGuidelines: [
      "Use deck_lint after every deck build or edit; never report a deck as finished without it.",
      "Use deck_lint --selftest false when the checker itself has already been verified this session.",
      "If deck_lint reports a TITLE or FIT finding, fix the copy or the box; do not suppress the check.",
    ],
    parameters: Type.Object({
      deck: Type.String({ description: "Path to the .pptx file" }),
      floor: Type.Optional(Type.Number({ description: "Minimum body type in points (default 20)" })),
      tokens: Type.Optional(Type.String({ description: "Explicit tokens.json path; auto-detected when omitted" })),
      selftest: Type.Optional(Type.Boolean({ description: "Also verify the checker (default true)" })),
    }),

    async execute(_id, params, signal, onUpdate, ctx) {
      const deck = deckPath(params.deck, ctx.cwd);
      if (!existsSync(deck)) {
        throw new Error(`No such deck: ${deck}`);
      }
      if (!deck.endsWith(".pptx")) {
        throw new Error(`Not a .pptx file: ${deck}`);
      }

      const floor = params.floor ?? 20;
      const tokens = params.tokens ? deckPath(params.tokens, ctx.cwd) : findTokens(deck);
      const wantSelftest = params.selftest !== false;

      onUpdate?.({ content: [{ type: "text", text: `Linting ${deck}...` }], details: {} });

      // ---- linter -------------------------------------------------------
      const lintArgs = [scriptPath("lint_deck.py"), deck, "--floor", String(floor)];
      if (tokens) lintArgs.push("--tokens", tokens);
      const lint = await run(pythonBin(), lintArgs, {
        timeoutMs: 90_000,
        signal,
        env: { NODE_PATH: process.env.NODE_PATH ?? "", PATH: process.env.PATH ?? "" },
      });

      // ---- spacing audit -------------------------------------------------
      const audit = await run(pythonBin(), [scriptPath("spacing_audit.py"), deck], {
        timeoutMs: 90_000,
        signal,
      });

      // ---- self-test (optional) -----------------------------------------
      let selftest: Awaited<ReturnType<typeof run>> | null = null;
      if (wantSelftest) {
        onUpdate?.({ content: [{ type: "text", text: "Verifying the checker..." }], details: {} });
        selftest = await run("bash", [scriptPath("selftest.sh")], {
          cwd: skillDir(),
          timeoutMs: 180_000,
          signal,
          env: { NODE_PATH: process.env.NODE_PATH ?? "" },
        });
      }

      const findings = summarise(lint.stdout);
      const auditSpreads: string[] = [];
      for (const line of audit.stdout.split("\n")) {
        if (/\bSPREAD\b/.test(line)) auditSpreads.push(line.trim());
        if (/not the card padding/.test(line)) auditSpreads.push(line.trim());
      }

      const cases: Array<[string, boolean]> = [
        ["linter", lint.code === 0],
        ["spacing audit", audit.code === 0],
      ];
      if (selftest) cases.push(["checker self-test", selftest.code === 0]);

      const failed = cases.filter(([, ok]) => !ok).map(([n]) => n);
      // A linter that reports findings for a file which does not exist is worse
      // than useless: it invents a verdict. The Python exits 1 with a
      // FileNotFoundError, which read as "findings found" and produced a
      // convincing FAILED report for a deck that had never been built.
      const missing = /No such file|FileNotFoundError/.test(lint.stdout + lint.stderr);
      if (missing) {
        throw new Error(
          `deck_lint could not read ${deck}. It does not exist, or the deck folder ` +
          `has been scaffolded but not built. Run the deck's build first (node build.js).`,
        );
      }

      const lines: string[] = [];
      lines.push(`Deck: ${deck}`);
      lines.push(`Linter:        ${countLine(lint.stdout)}${tokens ? `  (tokens: ${tokens})` : "  (outlier mode)"}`);
      lines.push(`Spacing audit: ${auditSpreads.length ? `${auditSpreads.length} spread(s) to review` : "consistent"}`);
      if (selftest) {
        const st = selftest.stdout.match(/(\d+) passed, (\d+) failed/);
        lines.push(`Self-test:     ${st ? `${st[1]} passed, ${st[2]} failed` : "(no summary)"}`);
      }
      if (findings.length) {
        lines.push("");
        lines.push(`Findings (${findings.length}):`);
        for (const f of findings.slice(0, 40)) lines.push(`  ${f}`);
        if (findings.length > 40) lines.push(`  ... and ${findings.length - 40} more`);
      }
      if (auditSpreads.length) {
        lines.push("");
        lines.push("Spacing to look at:");
        for (const s of auditSpreads.slice(0, 12)) lines.push(`  ${s}`);
      }
      if (failed.length) {
        lines.push("");
        lines.push(`FAILED: ${failed.join(", ")}`);
      } else {
        lines.push("");
        lines.push("All gates passed.");
      }

      const ok = failed.length === 0;
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          deck,
          tokens,
          findings,
          auditSpreads,
          lintExit: lint.code,
          auditExit: audit.code,
          selftestExit: selftest?.code ?? null,
          passed: ok,
        },
        isError: !ok,
      };
    },
  });
}
