import { assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { gitOutput } from "./git.ts";

Deno.test("gitOutput returns stdout and status", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await new Deno.Command("git", { args: ["init"], cwd: dir }).output();
    const out = await gitOutput(["rev-parse", "--show-toplevel"], dir, 10_000);
    assertEquals(out.status, 0);
    assertEquals(out.stdout.trim(), dir);
    assertEquals(out.truncated, false);
    assertEquals(out.stdoutTruncated, false);
    assertEquals(out.stderrTruncated, false);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("gitOutput bounds stdout", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await new Deno.Command("git", { args: ["init"], cwd: dir }).output();
    await Deno.writeTextFile(join(dir, "abcdef.txt"), "x");
    const out = await gitOutput(["status", "--short"], dir, 4);
    // Truncation may kill git before it exits naturally, so status is platform/timing dependent.
    assertEquals([0, 143].includes(out.status), true);
    assertEquals(out.stdout.length, 4);
    assertEquals(out.truncated, true);
    assertEquals(out.stdoutTruncated, true);
    assertEquals(out.stderrTruncated, false);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
