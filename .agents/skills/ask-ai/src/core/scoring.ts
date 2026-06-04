import { DEFAULT_MIN_MATCHED_TERMS, DEFAULT_THRESHOLD, SEARCH_TERM_LIMIT } from "./limits.ts";

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "all",
  "and",
  "are",
  "ask",
  "but",
  "can",
  "code",
  "does",
  "for",
  "from",
  "have",
  "how",
  "into",
  "not",
  "our",
  "plan",
  "please",
  "review",
  "the",
  "this",
  "use",
  "using",
  "what",
  "when",
  "with",
  "you",
  "your",
]);

export type ScoreableSession = {
  text: string;
  lastTimestamp: Date | string;
};

export type SessionCandidate = {
  id: string;
  score: number;
  matchedTerms: number;
  lastTimestamp: Date;
  text?: string;
  trusted?: boolean;
  warnings?: string[];
};

export function tokenize(text: string): string[] {
  return [
    ...new Set(
      String(text ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9_./:-]+/g, " ")
        .split(/\s+/)
        .flatMap((token) => token.split(/[./:-]+/).concat(token))
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
    ),
  ]
    .slice(0, SEARCH_TERM_LIMIT);
}

export function scoreSession(
  session: ScoreableSession,
  query: string,
  now = new Date(),
): { score: number; matchedTerms: number } {
  const terms = tokenize(query);
  const haystack = session.text.toLowerCase();
  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    const first = haystack.indexOf(term);
    if (first === -1) continue;
    matchedTerms += 1;
    score += 5;

    let occurrences = 1;
    let next = haystack.indexOf(term, first + term.length);
    while (next !== -1 && occurrences < 5) {
      occurrences += 1;
      next = haystack.indexOf(term, next + term.length);
    }
    score += Math.max(0, occurrences - 1);
  }

  if (matchedTerms === 0) return { score: 0, matchedTerms };

  const lastTime = session.lastTimestamp instanceof Date
    ? session.lastTimestamp
    : new Date(session.lastTimestamp);
  const daysOld = Math.max(0, (now.getTime() - lastTime.getTime()) / 86_400_000);
  const recencyBonus = Math.max(0, 8 - Math.log2(daysOld + 1) * 2);
  score += recencyBonus;

  if (matchedTerms >= 3) score += 6;
  if (matchedTerms >= 6) score += 8;

  return { score: Math.round(score * 10) / 10, matchedTerms };
}

export function selectSession(
  ranked: SessionCandidate[],
  { threshold = DEFAULT_THRESHOLD, minMatchedTerms = DEFAULT_MIN_MATCHED_TERMS }: {
    threshold?: number;
    minMatchedTerms?: number;
  } = {},
): SessionCandidate | undefined {
  const best = ranked[0];
  if (!best || best.score < threshold) return undefined;
  if ((best.matchedTerms ?? 0) < minMatchedTerms) return undefined;
  if (best.trusted === false) return undefined;
  return best;
}

export function serializeCandidate(candidate: SessionCandidate): {
  id: string;
  score: number;
  lastTimestamp: string;
} {
  return {
    id: candidate.id,
    score: candidate.score,
    lastTimestamp: candidate.lastTimestamp.toISOString(),
  };
}
