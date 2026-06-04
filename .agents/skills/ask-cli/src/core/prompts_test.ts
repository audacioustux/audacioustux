import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { buildPrompt, buildSearchQuery } from "./prompts.ts";

Deno.test("buildPrompt produces ask prompt with identity, rules, subject, and extra", () => {
  const prompt = buildPrompt({
    mode: "ask",
    subject: "is this safe?",
    extra: "focus on auth",
    identity: "You are opus acting as an independent second brain.",
  });
  assertMatch(prompt, /^You are opus acting as an independent second brain\./);
  assertMatch(prompt, /Do not edit files/);
  assertMatch(prompt, /Question or task:\nis this safe\?/);
  assertMatch(prompt, /Additional instructions:\nfocus on auth/);
});

Deno.test("buildPrompt embeds bounded target file contents", () => {
  const prompt = buildPrompt({
    mode: "plan",
    subject: "docs/plan.md",
    subjectText: "step one",
    identity: "Reviewer.",
  });
  assertMatch(prompt, /Review this plan/);
  assertMatch(prompt, /docs\/plan\.md\n\nTarget file contents \(bounded\):/);
  assertMatch(prompt, /```text\nstep one\n```/);
});

Deno.test("buildPrompt creates review prompt with range and diff", () => {
  const prompt = buildPrompt({
    mode: "review",
    base: "main",
    head: "HEAD",
    diff: "diff --git a/x b/x",
    identity: "Reviewer.",
  });
  assertMatch(prompt, /main\.\.HEAD/);
  assertMatch(prompt, /Diff:\ndiff --git/);
});

Deno.test("buildSearchQuery normalizes file-like subjects and joins non-empty parts", () => {
  assertEquals(
    buildSearchQuery({
      mode: "plan",
      subject: "please inspect /tmp/repo/docs/foo/bar.md",
      extra: "security",
      subjectText: "long subject text",
    }),
    "plan\nplease inspect docs/foo/bar.md\nsecurity\nlong subject text",
  );
});
