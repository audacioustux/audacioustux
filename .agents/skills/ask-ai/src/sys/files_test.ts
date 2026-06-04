import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { readJsonLines, readTextFileBounded } from "./files.ts";

Deno.test("readTextFileBounded returns text and truncation flag", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const file = join(dir, "big.txt");
    await Deno.writeTextFile(file, "abcdef");
    assertEquals(await readTextFileBounded(file, 3), {
      path: file,
      text: "abc",
      bytesRead: 3,
      truncated: true,
    });
    assertEquals(await readTextFileBounded(file, 99), {
      path: file,
      text: "abcdef",
      bytesRead: 6,
      truncated: false,
    });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("readJsonLines streams valid values and reports corrupt lines", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const file = join(dir, "x.jsonl");
    await Deno.writeTextFile(file, '{"a":1}\nnot json\n\n{"b":2}\n');
    const out = [];
    for await (const entry of readJsonLines(file)) out.push(entry);
    assertEquals(out, [
      { line: 1, value: { a: 1 } },
      { line: 2, error: "Invalid JSON" },
      { line: 4, value: { b: 2 } },
    ]);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
