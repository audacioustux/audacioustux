import { assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
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

Deno.test("readJsonLines reports oversized lines without parsing them", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const file = join(dir, "x.jsonl");
    await Deno.writeTextFile(file, '{"big":"abcdef"}\n{"ok":true}\n');
    const out = [];
    for await (const entry of readJsonLines(file, { maxLineBytes: 8 })) out.push(entry);
    assertEquals(out, [
      { line: 1, error: "Line exceeds 8 bytes" },
      { line: 2, error: "Line exceeds 8 bytes" },
    ]);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
