export type GitOutput = {
  stdout: string;
  stderr: string;
  truncated: boolean;
  status: number;
};

async function readStreamBounded(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let stored = 0;
  let truncated = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (stored < maxBytes) {
        const remaining = maxBytes - stored;
        const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
        chunks.push(slice);
        stored += slice.byteLength;
        if (value.byteLength > remaining) truncated = true;
      } else if (value.byteLength > 0) {
        truncated = true;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(stored);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { text: new TextDecoder().decode(out), truncated };
}

export async function gitOutput(args: string[], cwd: string, maxBytes: number): Promise<GitOutput> {
  const child = new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const [stdout, stderr, status] = await Promise.all([
    readStreamBounded(child.stdout, maxBytes),
    readStreamBounded(child.stderr, 64_000),
    child.status,
  ]);

  return {
    stdout: stdout.text,
    stderr: stderr.text,
    truncated: stdout.truncated || stderr.truncated,
    status: status.code,
  };
}
