import { assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { readTextFileBounded } from "./files.ts";

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
