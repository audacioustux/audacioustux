import type { Mode } from "../cli/args.ts";

const REVIEW_RULES = [
  "Use any resumed session/conversation history only as optional background; ignore it if it is unrelated.",
  "Do not edit files. Do not implement fixes. Do not run destructive commands.",
  "Be direct, skeptical, and specific. Prefer concrete risks and actionable changes over generic advice.",
].join("\n");

function targetBlock(subject: string, subjectText: string): string {
  if (!subjectText) return subject;
  return `${subject}\n\nTarget file contents (bounded):\n\`\`\`text\n${subjectText}\n\`\`\``;
}

export function buildPrompt({
  mode,
  subject = "",
  subjectText = "",
  extra = "",
  base = "HEAD~1",
  head = "HEAD",
  diff = "",
  identity = "You are an independent reviewer acting as a second brain.",
}: {
  mode: Exclude<Mode, "sessions">;
  subject?: string;
  subjectText?: string;
  extra?: string;
  base?: string;
  head?: string;
  diff?: string;
  identity?: string;
}): string {
  const target = targetBlock(subject, subjectText);
  const suffix = extra ? `\n\nAdditional instructions:\n${extra}` : "";

  switch (mode) {
    case "ask":
      return `${identity}\n\n${REVIEW_RULES}\n\nQuestion or task:\n${target}${suffix}`;
    case "plan":
      return `${identity}\n\n${REVIEW_RULES}\n\nReview this plan for correctness, missing steps, unclear assumptions, sequencing risk, test coverage, and overengineering:\n${target}${suffix}`;
    case "adversarial":
      return `${identity}\n\n${REVIEW_RULES}\n\nPerform an adversarial review of this target. Attack assumptions, hidden coupling, failure modes, security/operability risks, and weak tests. Return the strongest objections first, then suggested changes:\n${target}${suffix}`;
    case "review":
      return `${identity}\n\n${REVIEW_RULES}\n\nPerform a read-only adversarial code review for ${base}..${head}. Return findings by severity with evidence and a merge verdict.\n\nDiff:\n${diff}${suffix}`;
  }
}

function basenameLike(input: string): string {
  return input.split(/[\\/]+/).filter(Boolean).at(-1) ?? input;
}

function normalizeSubjectForSearch(subject: string): string {
  return String(subject ?? "")
    .split(/\s+/)
    .map((token) => {
      const cleaned = token.replace(/^[([<]+|[\])>,.;:]+$/g, "");
      if (!cleaned.includes("/") && !cleaned.includes("\\")) return token;

      const parts = cleaned.split(/[\\/]+/).filter(Boolean);
      const anchor = parts.findIndex((part) =>
        [".agents", "docs", "rust", "typescript", "src", "tests", "test", "examples", "deploy"]
          .includes(part)
      );
      if (anchor >= 0) return parts.slice(anchor).join("/");
      return basenameLike(cleaned);
    })
    .join(" ");
}

export function buildSearchQuery({
  mode,
  subject = "",
  subjectText = "",
  extra = "",
  diffStat = "",
}: {
  mode: Mode;
  subject?: string;
  subjectText?: string;
  extra?: string;
  diffStat?: string;
}): string {
  return [mode, normalizeSubjectForSearch(subject), extra, diffStat, subjectText.slice(0, 8_000)]
    .filter(Boolean)
    .join("\n");
}
