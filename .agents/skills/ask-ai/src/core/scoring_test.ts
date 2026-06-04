import { assert, assertEquals } from "@std/assert";
import { scoreSession, selectSession, serializeCandidate, tokenize } from "./scoring.ts";

Deno.test("tokenize dedupes, drops stop words, and splits path punctuation", () => {
  assertEquals(tokenize("Review src/foo/bar.ts and src/foo/bar.ts"), [
    "src",
    "foo",
    "bar",
    "src/foo/bar.ts",
  ]);
});

Deno.test("scoreSession returns zero when no query terms match", () => {
  assertEquals(
    scoreSession(
      { text: "unrelated", lastTimestamp: new Date("2026-06-04T00:00:00Z") },
      "websocket auth",
      new Date("2026-06-04T00:00:00Z"),
    ),
    { score: 0, matchedTerms: 0 },
  );
});

Deno.test("scoreSession rewards matched terms and recency", () => {
  const score = scoreSession(
    {
      text: "websocket auth token handoff websocket auth",
      lastTimestamp: new Date("2026-06-03T00:00:00Z"),
    },
    "websocket auth token handoff",
    new Date("2026-06-04T00:00:00Z"),
  );
  assertEquals(score.matchedTerms, 4);
  assert(score.score > 25);
});

Deno.test("selectSession enforces threshold and matched terms", () => {
  assertEquals(
    selectSession([{ id: "a", score: 11.9, matchedTerms: 5, lastTimestamp: new Date() }]),
    undefined,
  );
  assertEquals(
    selectSession([{ id: "a", score: 99, matchedTerms: 1, lastTimestamp: new Date() }]),
    undefined,
  );
  assertEquals(
    selectSession([{ id: "a", score: 99, matchedTerms: 2, lastTimestamp: new Date() }])?.id,
    "a",
  );
});

Deno.test("serializeCandidate redacts raw text and serializes Date", () => {
  assertEquals(
    serializeCandidate({
      id: "s1",
      score: 42,
      matchedTerms: 3,
      lastTimestamp: new Date("2026-06-04T00:00:00Z"),
      text: "secret transcript",
    }),
    { id: "s1", score: 42, lastTimestamp: "2026-06-04T00:00:00.000Z" },
  );
});
