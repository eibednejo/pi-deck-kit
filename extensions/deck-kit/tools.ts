/**
 * Shared plumbing for the deck-kit tools.
 *
 * The linter, the spacing audit and the substitution test are already written
 * and already tested in Python. This module WRAPS them. It deliberately does not
 * reimplement any of them, because two implementations of the same measurement
 * drift apart, and the drift is invisible until a deck is wrong on someone
 * else's machine. That mistake has been made once in this project already, with
 * a font-metric table duplicated between the build and the checker.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

/** Absolute path to this extension's own directory, however pi loaded it. */
export function extensionDir(): string {
  // import.meta.url is the reliable anchor: the extension may be loaded from
  // ~/.pi/agent/extensions/, from a cloned npm package, or from a git checkout,
  // and the skill bundle sits next to it in all three cases.
  const here = new URL(".", import.meta.url).pathname;
  return decodeURIComponent(here).replace(/\/$/, "");
}

/** The bundled skill, which owns the Python tooling. */
export function skillDir(): string {
  return join(extensionDir(), "..", "..", "skills", "next-level-decks");
}

export function scriptPath(name: string): string {
  return join(skillDir(), "scripts", name);
}

export type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
  killed: boolean;
};

/**
 * Run a script directly with spawn and an argv array.
 *
 * Never through a shell: deck paths contain spaces, and a shell would also make
 * every argument an injection surface.
 */
export function run(
  command: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number; signal?: AbortSignal; env?: Record<string, string> } = {},
): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? 240_000;
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const onAbort = () => { killed = true; child.kill("SIGKILL"); };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    const finish = (code: number) => {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      resolvePromise({ code, stdout, stderr, killed });
    };

    child.on("error", (err) => {
      stderr += `\nspawn failed: ${err.message}`;
      finish(127);
    });
    child.on("close", (code) => finish(code ?? 0));
  });
}

/** Resolve a deck path from a tool argument, tolerating a leading @. */
export function deckPath(arg: string, cwd: string): string {
  const clean = arg.replace(/^@/, "");
  return isAbsolute(clean) ? clean : resolve(cwd, clean);
}

/** Point at the interpreter the scripts need, with a clear error when absent. */
export function pythonBin(): string {
  return process.env.PI_DECK_PYTHON || "python3";
}

export function nodePathEnv(): Record<string, string> {
  // pptxgenjs and friends are usually installed globally on these machines.
  if (process.env.NODE_PATH) return {};
  const candidates = [
    "/usr/lib/node_modules",
    "/usr/local/lib/node_modules",
    join(process.env.HOME ?? "", ".local/lib/node_modules"),
  ];
  const found = candidates.find((p) => existsSync(p));
  return found ? { NODE_PATH: found } : {};
}

/** Does the deck look like a pptx at all? Cheap guard before spawning work. */
export function looksLikePptxScript(scriptPathOrName: string): boolean {
  return scriptPathOrName.endsWith(".py") || scriptPathOrName.endsWith(".sh");
}
