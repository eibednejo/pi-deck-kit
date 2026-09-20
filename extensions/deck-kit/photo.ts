/**
 * deck_photo — search Wikimedia Commons, download candidates, and LOOK at them.
 *
 * This exists because of a specific failure. A search for "Sea of Galilee
 * landscape" returns a file titled exactly that, which is a MAP WITH HEBREW
 * LABELS. A search for "hands digging" returns a Roman bronze museum piece.
 * Four of thirteen downloaded candidates were unusable, and every one of them
 * had a good title. Relevance is not a property of a filename.
 *
 * So this tool does not return URLs. It downloads, grades into a contact sheet,
 * and hands back an image for the caller to actually examine. The instruction
 * that comes with it is the point of the tool.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pythonBin, run } from "./tools.js";

const COMMONS_PY = String.raw`#!/usr/bin/env python3
"""Search Wikimedia Commons and download candidates, with licence metadata.

Commons rate-limits aggressively: retry with backoff and send a real
User-Agent, or every third download fails with HTTP 429.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "pi-deck-kit/1.0 (deck photo sourcing; contact: user@example.com)"}


def api(params, tries=4):
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            return json.load(urllib.request.urlopen(req, timeout=45))
        except Exception as e:
            if attempt == tries - 1:
                raise
            time.sleep(8 * (attempt + 1))


def search(term, limit):
    d = api({"action": "query", "format": "json", "generator": "search",
             "gsrsearch": "filetype:bitmap " + term, "gsrnamespace": "6",
             "gsrlimit": str(limit), "prop": "imageinfo",
             "iiprop": "url|size|extmetadata", "iiurlwidth": "2400"})
    out = []
    for page in (d.get("query", {}).get("pages", {}) or {}).values():
        ii = (page.get("imageinfo") or [{}])[0]
        url = ii.get("thumburl") or ii.get("url")
        if not url:
            continue
        em = ii.get("extmetadata", {})
        artist = re.sub("<[^>]+>", "", em.get("Artist", {}).get("value", "") or "").strip()
        out.append({
            "title": page["title"],
            "url": url,
            "width": ii.get("thumbwidth") or ii.get("width"),
            "height": ii.get("thumbheight") or ii.get("height"),
            "artist": artist[:80],
            "licence": (em.get("LicenseShortName", {}).get("value", "") or ""),
        })
    return out


def main():
    term = sys.argv[1]
    outdir = sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    mkdir_ok = os.makedirs(outdir, exist_ok=True)
    results = search(term, limit)
    creds = []
    for i, r in enumerate(results, 1):
        name = "cand-%02d.jpg" % i
        dest = os.path.join(outdir, name)
        try:
            time.sleep(2)
            data = urllib.request.urlopen(
                urllib.request.Request(r["url"], headers=UA), timeout=120).read()
            open(dest, "wb").write(data)
            r["file"] = name
            creds.append(r)
            print("OK %s %sx%s %s | %s" % (name, r["width"], r["height"], r["licence"], r["title"][5:70]))
        except Exception as e:
            print("FAIL %s %s" % (name, e))
    json.dump(creds, open(os.path.join(outdir, "credits.json"), "w"), indent=1)
    print("CREDITS %s" % os.path.join(outdir, "credits.json"))


main()
`;

const CONTACT_SHEET_PY = String.raw`#!/usr/bin/env python3
"""Build a labelled contact sheet so every candidate can be looked at at once."""
import glob, os, sys
from PIL import Image, ImageDraw

outdir, sheet_path = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(outdir, "cand-*.jpg")))
if not files:
    print("no candidates")
    sys.exit(1)
cols = 4
cw, ch = 470, 320
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw, rows * (ch + 24)), (24, 22, 20))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    size = "%dx%d" % im.size
    im.thumbnail((cw - 10, ch - 10))
    x, y = (i % cols) * cw, (i // cols) * (ch + 24)
    sheet.paste(im, (x + 5, y + 22))
    d.text((x + 6, y + 6), "%s  %s" % (os.path.basename(f), size), fill=(240, 225, 190))
sheet.save(sheet_path)
print(sheet_path)
`;

export function registerPhoto(pi: ExtensionAPI) {
  pi.registerTool({
    name: "deck_photo",
    label: "Deck photo",
    description:
      "Search Wikimedia Commons for photographs, download candidates with their licence " +
      "metadata, and build a labelled contact sheet image. Returns the sheet so the " +
      "candidates can actually be examined. Use this INSTEAD of drafting image URLs by " +
      "hand: search titles describe what a file is about, not what it looks like, and a " +
      "search for a landscape routinely returns a map.",
    promptSnippet: "Download candidate photographs from Wikimedia Commons and return a contact sheet",
    promptGuidelines: [
      "Use deck_photo for any deck imagery; never place an image you have not looked at.",
      "After deck_photo returns a contact sheet, read the image and reject duds before using anything.",
      "Record the licence from credits.json next to the image. CC BY and CC BY-SA require attribution.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search terms, for example 'Sea of Galilee sunrise'" }),
      outDir: Type.String({ description: "Directory to download candidates into" }),
      limit: Type.Optional(Type.Number({ description: "How many candidates (default 8)" })),
    }),

    async execute(_id, params, signal, onUpdate, ctx) {
      const outDir = resolve(ctx.cwd, params.outDir);
      mkdirSync(outDir, { recursive: true });
      const limit = Math.max(1, Math.min(20, params.limit ?? 8));

      onUpdate?.({ content: [{ type: "text", text: `Searching Commons for "${params.query}"...` }], details: {} });

      const searchPy = join(outDir, ".commons-search.py");
      writeFileSync(searchPy, COMMONS_PY, "utf8");
      const search = await run(pythonBin(), [searchPy, params.query, outDir, String(limit)], {
        timeoutMs: 300_000,
        signal,
      });

      const candidates: string[] = [];
      for (const line of search.stdout.split("\n")) {
        if (line.startsWith("OK ")) candidates.push(line.slice(3));
      }

      if (candidates.length === 0) {
        return {
          content: [{ type: "text", text: `No candidates downloaded.\n${search.stdout}\n${search.stderr}` }],
          details: { outDir, candidates: [], sheet: null },
          isError: true,
        };
      }

      onUpdate?.({ content: [{ type: "text", text: "Building the contact sheet..." }], details: {} });

      const sheet = join(outDir, "contact-sheet.png");
      const sheetPy = join(outDir, ".commons-sheet.py");
      writeFileSync(sheetPy, CONTACT_SHEET_PY, "utf8");
      const built = await run(pythonBin(), [sheetPy, outDir, sheet], { timeoutMs: 120_000, signal });

      const lines = [
        `Found ${candidates.length} candidate(s) for "${params.query}".`,
        `Contact sheet: ${existsSync(sheet) ? sheet : "(failed)"}`,
        `Licences: ${join(outDir, "credits.json")}`,
        "",
        "Read the contact sheet before choosing anything. A title describes the subject,",
        "not the image: searches for landscapes return maps, for hands return museum objects.",
        "",
        ...candidates,
      ];
      if (built.stderr.trim()) lines.push("", built.stderr.trim());

      // Returning the sheet as an image part means it is actually seen rather
      // than described, which is the only thing that stops a dud being placed.
      const content: Array<
        { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
      > = [{ type: "text", text: lines.join("\n") }];
      if (existsSync(sheet)) {
        try {
          const { readFileSync } = await import("node:fs");
          content.push({
            type: "image",
            data: readFileSync(sheet).toString("base64"),
            mimeType: "image/png",
          });
        } catch { /* the path is still reported above */ }
      }

      return {
        content,
        details: { outDir, candidates, sheet: existsSync(sheet) ? sheet : null },
      };
    },
  });
}
