import type {
  CaptureMessage,
  ClarificationQuestion,
  ContentLanguage,
  GapKind,
  KnowledgeSection,
  KnowledgeStatus,
  KnowledgeType,
  Category,
} from "@/domain/types";
import type { AnswerOutput, ClarificationOutput, DraftOutput } from "./schemas";

export interface ClarificationInput {
  messages: readonly CaptureMessage[];
  questions: readonly ClarificationQuestion[];
  type: KnowledgeType;
  category: Category | null;
  language: ContentLanguage;
  contributorRequestedStop: boolean;
}

export interface DraftInput {
  messages: readonly CaptureMessage[];
  questions: readonly ClarificationQuestion[];
  language: ContentLanguage;
}

/**
 * A source that has ALREADY passed permission filtering. Providers only ever
 * see these; they have no access to the store.
 */
export interface AuthorizedSource {
  ref: string;
  kind: "knowledge" | "decision";
  id: string;
  title: string;
  type: KnowledgeType | "decision";
  status: KnowledgeStatus | "historical_decision";
  departmentId: string;
  summary: string;
  sections: readonly KnowledgeSection[];
  missingInfo: readonly string[];
  risks: string | null;
}

export interface AnswerInput {
  question: string;
  sources: readonly AuthorizedSource[];
  language: ContentLanguage;
}

export interface AIProvider {
  readonly name: string;
  /** True when the provider sends data outside this server. */
  readonly external: boolean;
  nextClarification(input: ClarificationInput): Promise<ClarificationOutput>;
  structureDraft(input: DraftInput): Promise<DraftOutput>;
  answer(input: AnswerInput): Promise<AnswerOutput>;
}

export type { GapKind };
