export type BoundedRead = {
  text: string;
  bytesRead: number;
  truncated: boolean;
  path: string;
};

export type JsonLine = {
  line: number;
  value?: unknown;
  error?: string;
};

export async function readTextFileBounded(path: string, maxBytes: number): Promise<BoundedRead> {
  if (maxBytes < 0) throw new Error("maxBytes must be non-negative");

  const file = await Deno.open(path, { read: true });
  try {
    const buffer = new Uint8Array(maxBytes + 1);
    const n = await file.read(buffer) ?? 0;
    const truncated = n > maxBytes;
    const slice = buffer.subarray(0, truncated ? maxBytes : n);
    return {
      path,
      text: new TextDecoder().decode(slice),
      bytesRead: slice.byteLength,
      truncated,
    };
  } finally {
    file.close();
  }
}

export async function* readJsonLines(path: string): AsyncGenerator<JsonLine> {
  const file = await Deno.open(path, { read: true });
  const reader = file.readable.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let lineNumber = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      const lines = carry.split("\n");
      carry = lines.pop() ?? "";
      for (const line of lines) {
        lineNumber += 1;
        const parsed = parseJsonLine(line, lineNumber);
        if (parsed) yield parsed;
      }
    }

    carry += decoder.decode();
    if (carry.length > 0) {
      lineNumber += 1;
      const parsed = parseJsonLine(carry, lineNumber);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
    try {
      file.close();
    } catch {
      // FsFile.readable closes the resource after EOF on current Deno.
    }
  }
}

function parseJsonLine(line: string, lineNumber: number): JsonLine | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;
  try {
    return { line: lineNumber, value: JSON.parse(trimmed) };
  } catch {
    return { line: lineNumber, error: "Invalid JSON" };
  }
}
