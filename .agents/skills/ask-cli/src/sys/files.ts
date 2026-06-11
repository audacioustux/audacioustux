export type BoundedRead = {
  text: string;
  bytesRead: number;
  truncated: boolean;
  path: string;
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
      const n = (await file.read(buffer)) ?? 0;
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
