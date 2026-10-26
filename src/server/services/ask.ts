import type { ContentLanguage, KnowledgeItem, Profile } from "@/domain/types";
import { getAIProvider } from "@/server/ai";
import type { AIProvider, AuthorizedSource } from "@/server/ai/provider";
import { answerOutputSchema, type AnswerOutput, type CitedText } from "@/server/ai/schemas";
import { recordAudit } from "./audit";
import { itemText, readableDecisions, readableItems } from "./knowledge";
import { rank } from "./search";

export interface AskSource {
  ref: string;
  id: string;
  kind: AuthorizedSource["kind"];
  title: string;
  type: AuthorizedSource["type"];
  status: AuthorizedSource["status"];
}

export interface AskResult {
  question: string;
  answer: AnswerOutput;
  sources: AskSource[];
  /** Citations returned by the model that did not match a provided source (removed). */
  invalidCitations: number;
  provider: string;
}

/** Only reviewed knowledge is used to answer. Drafts are never treated as company knowledge. */
const ANSWERABLE = new Set<KnowledgeItem["status"]>(["verified", "approved_official"]);

/**
 * Retrieval pipeline (PRD Part 6):
 * 1. user is already authenticated by the caller
 * 2–3. resolve permissions and keep ONLY readable records
 * 4. relevance filtering
 * 5. generate with permitted sources only
 * 6. validate citations
 * 7. return answer + references
 */
export async function ask(
  user: Profile,
  rawQuestion: string,
  language: ContentLanguage,
  ai: AIProvider = getAIProvider(),
): Promise<AskResult> {
  const question = rawQuestion
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 1000);

  const items = readableItems(user).filter((i) => ANSWERABLE.has(i.status));
  const decisions = readableDecisions(user);

  const rankedItems = rank(question, items, (i) => ({ title: i.title, tags: i.tags, body: itemText(i) }), 4);
  const rankedDecisions = rank(
    question,
    decisions,
    (d) => ({ title: d.title, body: [d.context, d.problem, d.decision, d.rationale].join("\n") }),
    2,
  );

  const sources: AuthorizedSource[] = [
    ...rankedItems.map(({ value: i }) => ({
      ref: "",
      kind: "knowledge" as const,
      id: i.id,
      title: i.title,
      type: i.type,
      status: i.status,
      departmentId: i.departmentId,
      summary: i.summary,
      sections: i.sections,
      missingInfo: i.missingInfo,
      risks: null,
    })),
    ...rankedDecisions.map(({ value: d }) => ({
      ref: "",
      kind: "decision" as const,
      id: d.id,
      title: d.title,
      type: "decision" as const,
      status: "historical_decision" as const,
      departmentId: d.departmentId,
      summary: `${d.decision} ${d.rationale}`,
      sections: [{ key: "statement" as const, value: d.decision }],
      missingInfo: d.missingInfo,
      risks: d.risks,
    })),
  ].map((s, index) => ({ ...s, ref: `S${index + 1}` }));

  const raw = await ai.answer({ question, sources, language });
  const answer = answerOutputSchema.parse(raw);

  // Citation validation: keep only references to sources that were actually provided.
  const validRefs = new Set(sources.map((s) => s.ref));
  let invalidCitations = 0;
  const clean = (list: CitedText[]) =>
    list.map((c) => {
      const kept = c.citations.filter((r) => validRefs.has(r));
      invalidCitations += c.citations.length - kept.length;
      return { ...c, citations: kept };
    });
  const validated: AnswerOutput = {
    ...answer,
    steps: clean(answer.steps),
    risks: clean(answer.risks),
    approvalBoundaries: clean(answer.approvalBoundaries),
    recommendations: clean(answer.recommendations),
  };

  recordAudit({
    actorId: user.id,
    action: "assistant.ask",
    targetType: "ask",
    targetId: null,
    outcome: "info",
    meta: { sources: sources.map((s) => s.id).join(","), invalidCitations, insufficient: validated.insufficientEvidence },
  });

  return {
    question,
    answer: validated,
    sources: sources.map(({ ref, id, kind, title, type, status }) => ({ ref, id, kind, title, type, status })),
    invalidCitations,
    provider: ai.name,
  };
}
