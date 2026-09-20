/**
 * deck-kit — make the deck gates impossible to skip.
 *
 * The skill (next-level-decks) owns the method and the Python tooling. This
 * extension owns ENFORCEMENT. The difference matters: a skill is advice the
 * model may forget, an extension runs whether or not the model remembers.
 *
 * Three deliverables shipped broken on a reader's device because the
 * substitution test ran only when its author happened to remember it. Two of
 * those decks failed on 7 and 20 slides respectively. A gate that depends on
 * memory is not a gate.
 *
 * What this registers:
 *   tools     deck_lint, deck_verify, deck_photo, deck_new
 *   commands  /deck          status of every deck in the project
 *             /deck-lint     lint one deck
 *             /deck-verify   run the substitution test on one deck
 *   hooks     a build command that produces a .pptx and does NOT verify it is
 *             flagged, once per session, so the omission is visible
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerLint } from "./lint.js";
import { registerVerify } from "./verify.js";
import { registerPhoto } from "./photo.js";
import { registerNew } from "./scaffold.js";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Decks that a build command touched but that were never verified. */
const unverified = new Set<string>();
/** Files already warned about, so the hook speaks once per deck. */
const warned = new Set<string>();

function findDecks(root: string, depth = 3): string[] {
  const out: string[] = [];
  const walk = (dir: string, d: number) => {
    if (d < 0) return;
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = join(dir, name);
      let st; try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) walk(full, d - 1);
      else if (name.endsWith(".pptx") && !name.startsWith("~$")) out.push(full);
    }
  };
  walk(root, depth);
  return out;
}

/** Does this bash command look like it builds a deck? */
function buildsPptx(command: string): string | null {
  if (!/\bnode\b/.test(command)) return null;
  if (!/(build[\w-]*\.js|build\.js)/.test(command)) return null;
  if (/--version|--help/.test(command)) return null;
  const m = command.match(/([\w./~-]*build[\w-]*\.js)/);
  return m ? m[1] : "build.js";
}

export default function (pi: ExtensionAPI) {
  registerLint(pi);
  registerVerify(pi);
  registerPhoto(pi);
  registerNew(pi);

  // ── after a build, remember that this deck has not been verified ──────────
  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    const command = String((event.input as { command?: string } | undefined)?.command ?? "");
    const build = buildsPptx(command);
    if (!build) return;
    if (event.isError) return;

    // The build script usually names its own output; pick up any .pptx that the
    // command's directory now contains and mark those as pending verification.
    const dir = build.includes("/") ? join(ctx.cwd, build, "..") : ctx.cwd;
    const built = findDecks(dir, 1);
    for (const deck of built) {
      unverified.add(deck);
      warned.delete(deck);
    }
    return;
  });

  // ── if a verification runs, clear the flag ───────────────────────────────
  pi.on("tool_result", async (event) => {
    if (event.toolName !== "deck_verify") return;
    const deck = (event.details as { deck?: string } | undefined)?.deck;
    if (deck) unverified.delete(deck);
  });

  // ── warn, once, at the end of a turn that left a deck unverified ─────────
  pi.on("turn_end", async (_event, ctx) => {
    const pending = [...unverified].filter((d) => !warned.has(d));
    if (pending.length === 0) return;
    for (const d of pending) warned.add(d);
    const list = pending.map((d) => relative(ctx.cwd, d) || d).join(", ");
    ctx.ui.notify(
      `Built but not verified with the substitution test: ${list}. ` +
      `deck_verify renders with substituted fonts, which is the only check that ` +
      `catches text that breaks on a viewer without your fonts.`,
      "warning",
    );
  });

  pi.on("session_start", async (_event, ctx) => {
    const decks = findDecks(ctx.cwd, 3);
    if (decks.length) {
      ctx.ui.notify(`deck-kit ready. ${decks.length} deck(s) found. /deck for status.`, "info");
    }
  });

  // ── commands ────────────────────────────────────────────────────────────
  pi.registerCommand("deck", {
    description: "List decks in this project with size and modification time",
    handler: async (_args, ctx) => {
      const decks = findDecks(ctx.cwd, 3);
      if (!decks.length) {
        ctx.ui.notify("No .pptx files found under this project.", "info");
        return;
      }
      const lines = decks.map((d) => {
        const st = statSync(d);
        const mb = (st.size / 1048576).toFixed(1);
        const when = st.mtime.toISOString().slice(0, 16).replace("T", " ");
        const flag = unverified.has(d) ? "  [not verified]" : "";
        return `${relative(ctx.cwd, d)}  ${mb} MB  ${when}${flag}`;
      });
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("deck-lint", {
    description: "Lint one deck: /deck-lint path/to/deck.pptx",
    handler: async (args, ctx) => {
      const target = args?.trim();
      if (!target) {
        ctx.ui.notify("Usage: /deck-lint path/to/deck.pptx", "warning");
        return;
      }
      const full = target.startsWith("/") ? target : join(ctx.cwd, target);
      if (!existsSync(full)) {
        ctx.ui.notify(`No such file: ${full}`, "error");
        return;
      }
      ctx.ui.notify(`Linting ${target}...`, "info");
      const tools = pi.getAllTools().filter((t) => t.name === "deck_lint");
      if (!tools.length) {
        ctx.ui.notify("deck_lint tool is not active. Run pi.setActiveTools to enable it.", "error");
        return;
      }
      ctx.ui.notify(
        `Ask the model to run deck_lint on ${target}, or run the script directly:\n` +
        `  python3 <skill>/scripts/lint_deck.py ${target} --floor 20`,
        "info",
      );
    },
  });

  pi.registerCommand("deck-verify", {
    description: "Substitution test on one deck: /deck-verify path/to/deck.pptx",
    handler: async (args, ctx) => {
      const target = args?.trim();
      if (!target) {
        ctx.ui.notify("Usage: /deck-verify path/to/deck.pptx", "warning");
        return;
      }
      ctx.ui.notify(
        `Ask the model to run deck_verify on ${target}. It needs the deck's build.js next ` +
        `to it, and that build must honour BGONLY=1.`,
        "info",
      );
    },
  });
}
