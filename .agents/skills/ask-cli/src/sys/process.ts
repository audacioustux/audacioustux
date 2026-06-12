export type ChildCommand = {
  bin: string;
  args: string[];
  stdin?: string;
  cwd: string;
};

export type CommandRunner = (command: ChildCommand) => Promise<number>;

export const runChildInherit: CommandRunner = async (command) => {
  const child = new Deno.Command(command.bin, {
    args: command.args,
    cwd: command.cwd,
    stdin: command.stdin === undefined ? "inherit" : "piped",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  if (command.stdin !== undefined) {
    const writer = child.stdin.getWriter();
    try {
      await writer.write(new TextEncoder().encode(command.stdin));
    } finally {
      try {
        await writer.close();
      } catch {
        // Child may exit early and close stdin; preserve the child exit status.
      }
    }
  }

  const status = await child.status;
  return status.code;
};
