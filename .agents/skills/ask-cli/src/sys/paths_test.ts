import { assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { encodeClaudeProjectPath, encodePiProjectPath, expandHome, findRepoRoot } from "./paths.ts";

Deno.test("encodePiProjectPath mirrors Pi SessionManager", () => {
  assertEquals(encodePiProjectPath("/workspaces/TheGrid"), "--workspaces-TheGrid--");
  assertEquals(encodePiProjectPath("/tmp/a:b"), "--tmp-a-b--");
});

Deno.test("encodeClaudeProjectPath mirrors Claude project path", () => {
  assertEquals(encodeClaudeProjectPath("/workspaces/TheGrid"), "-workspaces-TheGrid");
});

Deno.test("expandHome expands a leading tilde only", () => {
  assertEquals(expandHome("~/x", "/home/me"), "/home/me/x");
  assertEquals(expandHome("/tmp/~/x", "/home/me"), "/tmp/~/x");
});

Deno.test("findRepoRoot uses git rev-parse from nested directories", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await new Deno.Command("git", { args: ["init"], cwd: dir }).output();
    const nested = join(dir, "a", "b");
    await Deno.mkdir(nested, { recursive: true });
    assertEquals(await findRepoRoot(nested), dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
