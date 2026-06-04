import { dirname, join, normalize, resolve, SEPARATOR } from "@std/path";

export function homeDir(
  env: Record<string, string | undefined> = {
    HOME: Deno.env.get("HOME"),
    USERPROFILE: Deno.env.get("USERPROFILE"),
  },
): string {
  const home = env.HOME ?? env.USERPROFILE;
  if (!home) throw new Error("Cannot determine home directory from HOME/USERPROFILE");
  return home;
}

export function expandHome(input: string, home = homeDir()): string {
  if (input === "~") return home;
  if (input.startsWith(`~${SEPARATOR}`) || input.startsWith("~/")) {
    return join(home, input.slice(2));
  }
  return input;
}

export function encodeClaudeProjectPath(repoRoot: string): string {
  return resolve(repoRoot).replace(/[\\/]+/g, "-");
}

export function encodePiProjectPath(repoRoot: string): string {
  const resolved = resolve(repoRoot);
  return `--${resolved.replace(/^[\\/]/, "").replace(/[\\/:]/g, "-")}--`;
}

async function gitTopLevel(cwd: string): Promise<string | undefined> {
  try {
    const result = await new Deno.Command("git", {
      args: ["rev-parse", "--show-toplevel"],
      cwd,
      stdout: "piped",
      stderr: "null",
    }).output();
    if (!result.success) return undefined;
    const text = new TextDecoder().decode(result.stdout).trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function findRepoRoot(startCwd: string): Promise<string> {
  const resolvedStart = resolve(startCwd);
  const fromGit = await gitTopLevel(resolvedStart);
  if (fromGit) return normalize(fromGit);

  let current = resolvedStart;
  while (true) {
    if (await exists(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolvedStart;
    current = parent;
  }
}
