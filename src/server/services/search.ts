/**
 * Keyword relevance scoring. Phase 5 adds Postgres full-text search and, when
 * justified, pgvector. Permission filtering always happens BEFORE scoring.
 */
const STOPWORDS = new Set([
  // Indonesian
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "dengan",
  "pada",
  "ini",
  "itu",
  "apa",
  "apakah",
  "bagaimana",
  "siapa",
  "berapa",
  "kapan",
  "mengapa",
  "kenapa",
  "saya",
  "kami",
  "kita",
  "akan",
  "harus",
  "bisa",
  "dapat",
  "atau",
  "juga",
  "sebelum",
  "sesudah",
  "setelah",
  "dalam",
  "oleh",
  "jika",
  "kalau",
  "adalah",
  "ada",
  "tidak",
  "belum",
  "sudah",
  "agar",
  "supaya",
  "para",
  "sebuah",
  "suatu",
  "tersebut",
  "perlu",
  "saja",
  "lebih",
  // English
  "the",
  "and",
  "for",
  "with",
  "what",
  "how",
  "who",
  "when",
  "why",
  "should",
  "before",
  "after",
  "from",
  "this",
  "that",
  "are",
  "is",
  "was",
  "can",
  "into",
  "about",
  "our",
  "your",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export interface Searchable {
  title: string;
  tags?: readonly string[];
  body: string;
}

export function score(queryTokens: readonly string[], doc: Searchable): number {
  if (queryTokens.length === 0) return 0;
  const title = new Set(tokenize(doc.title));
  const tags = new Set((doc.tags ?? []).flatMap((t) => tokenize(t)));
  const body = new Set(tokenize(doc.body));
  let total = 0;
  for (const token of new Set(queryTokens)) {
    if (title.has(token)) total += 2;
    if (tags.has(token)) total += 2;
    if (body.has(token)) total += 1;
  }
  return total;
}

export interface Ranked<T> {
  value: T;
  score: number;
}

/** Keep results that clear an absolute floor and are close to the best match. */
export function rank<T>(query: string, docs: readonly T[], toSearchable: (d: T) => Searchable, limit = 5): Ranked<T>[] {
  const tokens = tokenize(query);
  const scored = docs
    .map((value) => ({ value, score: score(tokens, toSearchable(value)) }))
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  return scored.filter((r) => r.score >= best * 0.5).slice(0, limit);
}
