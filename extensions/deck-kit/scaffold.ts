/**
 * deck_new — scaffold a deck from a template that already passes every gate.
 *
 * Starting from a blank pptxgenjs script means re-deriving the token block, the
 * spacing ladder, the text-metrics helper and the substitution reserve from
 * scratch. All of that is where the defects came from in the first place. The
 * template carries them already, with the reasoning in comments.
 *
 * Deliberately conservative: it will not overwrite a directory that exists.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { skillDir } from "./tools.js";

export function registerNew(pi: ExtensionAPI) {
  pi.registerTool({
    name: "deck_new",
    label: "New deck",
    description:
      "Scaffold a new deck folder from the bundled template: build.js with the design tokens, " +
      "text metrics, spacing ladder and substitution reserve already in place, plus photos/ and " +
      "assets/ directories and a tokens.json declaring the type scale and palette. Refuses to " +
      "overwrite an existing directory.",
    promptSnippet: "Create a new deck project from the template",
    promptGuidelines: [
      "Use deck_new before writing any deck rather than starting from a blank pptxgenjs script; the template carries the fixes for the defects that cost the most time.",
      "After deck_new, edit build.js and run deck_lint, then deck_verify before showing the deck to anyone.",
    ],
    parameters: Type.Object({
      name: Type.String({ description: "Folder name for the deck, for example 'acme-profile'" }),
      dir: Type.Optional(Type.String({ description: "Parent directory (default: current directory)" })),
      title: Type.Optional(Type.String({ description: "Deck title, written into the template" })),
    }),

    async execute(_id, params) {
      const parent = resolve(params.dir ?? ".");
      const target = join(parent, params.name);
      if (existsSync(target)) {
        throw new Error(`Refusing to overwrite: ${target} already exists.`);
      }

      const template = join(skillDir(), "template");
      if (!existsSync(template)) {
        throw new Error(`No template found at ${template}. The skill bundle is incomplete.`);
      }

      mkdirSync(target, { recursive: true });
      cpSync(template, target, { recursive: true });
      mkdirSync(join(target, "photos"), { recursive: true });
      mkdirSync(join(target, "assets"), { recursive: true });

      // Name the deck in the template so the first build is not a placeholder.
      const buildFile = join(target, "build.js");
      if (existsSync(buildFile) && params.title) {
        const text = readFileSync(buildFile, "utf8")
          .replace(/__DECK_TITLE__/g, params.title)
          .replace(/__OUT_FILE__/g, `${params.name}.pptx`);
        writeFileSync(buildFile, text, "utf8");
      }

      const made = readdirSync(target).sort();
      return {
        content: [{
          type: "text",
          text: [
            `Created ${target}`,
            `Contents: ${made.join(", ")}`,
            "",
            "Next:",
            "  1. edit build.js (tokens at the top, slides below)",
            "  2. node build.js",
            "  3. deck_lint, then deck_verify",
            "",
            "The template's spacing ladder and substitution reserve are load-bearing:",
            "the numbers come from measured font metrics, so change them only with a measurement.",
          ].join("\n"),
        }],
        details: { target, name: basename(target), files: made },
      };
    },
  });
}
