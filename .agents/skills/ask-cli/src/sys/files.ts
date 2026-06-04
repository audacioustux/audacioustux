import { JSON_LINE_BYTE_LIMIT } from "../core/limits.ts";

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
  const chunks: Uint8Array[] = [];
  let stored = 0;
  let truncated = false;
  const buffer = new Uint8Array(64 * 1024);

  try {
    while (true) {
      const n = await file.read(buffer) ?? 0;
      if (n === 0) break;
      if (stored < maxBytes) {
        const remaining = maxBytes - stored;
        const sliceLength = Math.min(n, remaining);
        if (sliceLength > 0) {
          chunks.push(buffer.slice(0, sliceLength));
          stored += sliceLength;
        }
        if (n > remaining) truncated = true;
      } else {
        truncated = true;
      }
      if (truncated) break;
    }
  } finally {
    file.close();
  }

  const out = new Uint8Array(stored);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    path,
    text: new TextDecoder().decode(out),
    bytesRead: stored,
    truncated,
  };
}

export async function* readJsonLines(
  path: string,
  { maxLineBytes = JSON_LINE_BYTE_LIMIT }: { maxLineBytes?: number } = {},
): AsyncGenerator<JsonLine> {
  const file = await Deno.open(path, { read: true });
  const reader = file.readable.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let carry = "";
  let lineNumber = 0;
  let discardingOversizedLine = false;

  const lineTooLarge = (line: string) => encoder.encode(line).byteLength > maxLineBytes;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });

      while (true) {
        const newline = carry.indexOf("\n");
        if (newline === -1) break;
        const line = carry.slice(0, newline);
        carry = carry.slice(newline + 1);
        lineNumber += 1;

        if (discardingOversizedLine || lineTooLarge(line)) {
          discardingOversizedLine = false;
          yield { line: lineNumber, error: `Line exceeds ${maxLineBytes} bytes` };
          continue;
        }

        const parsed = parseJsonLine(line, lineNumber);
        if (parsed) yield parsed;
      }

      if (!discardingOversizedLine && lineTooLarge(carry)) {
        discardingOversizedLine = true;
        carry = "";
      }
    }

    carry += decoder.decode();
    if (discardingOversizedLine || carry.length > 0) {
      lineNumber += 1;
      if (discardingOversizedLine || lineTooLarge(carry)) {
        yield { line: lineNumber, error: `Line exceeds ${maxLineBytes} bytes` };
      } else {
        const parsed = parseJsonLine(carry, lineNumber);
        if (parsed) yield parsed;
      }
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
