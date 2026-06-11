import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { parseCliArgs } from "./args.ts";

Deno.test("parseCliArgs returns help for no args", () => {
  assertEquals(parseCliArgs([]), { kind: "help", error: undefined });
});

Deno.test("parseCliArgs accepts pi with model override", () => {
  const parsed = parseCliArgs([
    "pi",
    "ask",
    "challenge this",
    "--model",
    "zai/glm-5.1:xhigh",
    "--fresh",
    "--dry-run",
  ]);
  assertEquals(parsed.kind, "run");
  if (parsed.kind !== "run") throw new Error("expected run args");
  assertEquals(parsed.agent, "pi");
  assertEquals(parsed.mode, "ask");
  assertEquals(parsed.positional, ["challenge this"]);
  assertEquals(parsed.model, "zai/glm-5.1:xhigh");
  assertEquals(parsed.fresh, true);
  assertEquals(parsed.dryRun, true);
});

Deno.test("parseCliArgs rejects --continue and -c to enforce resume safety", () => {
  assertThrows(
    () => parseCliArgs(["claude", "ask", "q", "--continue"]),
    Error,
    "--continue/-c is not allowed",
  );
  assertThrows(
    () => parseCliArgs(["agy", "ask", "q", "-c"]),
    Error,
    "--continue/-c is not allowed",
  );
  assertThrows(
    () => parseCliArgs(["pi", "ask", "q", "-c", "extra"]),
    Error,
    "--continue/-c is not allowed",
  );
});

Deno.test("parseCliArgs allows --continue after -- (treated as positional question)", () => {
  // After --, everything is positional text. The agent might ask
  // "should I use --continue?" and that should work.
  const parsed = parseCliArgs(["pi", "ask", "--", "should I use --continue?"]);
  assertEquals(parsed.kind, "run");
  if (parsed.kind !== "run") throw new Error("expected run args");
  assertEquals(parsed.positional, ["should I use --continue?"]);
});

Deno.test("parseCliArgs rejects resume and fresh together", () => {
  assertThrows(
    () => parseCliArgs(["claude", "ask", "q", "--resume", "abc", "--fresh"]),
    Error,
    "--resume and --fresh are mutually exclusive",
  );
});

Deno.test("parseCliArgs rejects git refs that look like options", () => {
  assertThrows(
    () => parseCliArgs(["claude", "review", "--base=--output=/tmp/pwn", "--head", "HEAD"]),
    Error,
    "--base must be a git ref, not an option",
  );
});

Deno.test("parseCliArgs parses review refs and cwd", () => {
  const parsed = parseCliArgs([
    "claude",
    "review",
    "--base",
    "main",
    "--head",
    "HEAD",
    "--cwd",
    "/tmp/repo",
  ]);
  assertEquals(parsed.kind, "run");
  if (parsed.kind !== "run") throw new Error("expected run args");
  assertEquals(parsed.base, "main");
  assertEquals(parsed.head, "HEAD");
  assertEquals(parsed.cwd, "/tmp/repo");
});
