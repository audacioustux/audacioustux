export type GitOutput = {
  stdout: string;
  stderr: string;
  truncated: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  status: number;
};

async function readStreamBounded(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
  onTruncate?: () => void,
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
        if (value.byteLength > remaining) {
          truncated = true;
          onTruncate?.();
          await reader.cancel().catch(() => undefined);
          break;
        }
      } else if (value.byteLength > 0) {
        truncated = true;
        onTruncate?.();
        await reader.cancel().catch(() => undefined);
        break;
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
  let killedForTruncation = false;
  const killForTruncation = () => {
    if (killedForTruncation) return;
    killedForTruncation = true;
    try {
      child.kill("SIGTERM");
    } catch {
      // Process may already have exited.
    }
  };

  const [stdout, stderr, status] = await Promise.all([
    readStreamBounded(child.stdout, maxBytes, killForTruncation),
    readStreamBounded(child.stderr, 64_000, killForTruncation),
    child.status,
  ]);

  return {
    stdout: stdout.text,
    stderr: stderr.text,
    status: status.code,
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
    truncated: stdout.truncated || stderr.truncated,
  };
}
