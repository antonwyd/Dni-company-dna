/**
 * Core domain model for DNI.
 *
 * These types mirror the planned Supabase schema (see docs/DATA_MODEL.md) so the
 * in-memory prototype store can be replaced by a database repository later
 * without changing the services or UI.
 */

export const ROLES = [
  "president_director",
  "general_manager",
  "department_head",
  "reviewer",
  "contributor",
  "technical_staff",
  "admin",
] as const;
export type Role = (typeof ROLES)[number];

export const DEPARTMENTS = [
  "corporate",
  "sales",
  "finance",
  "production",
  "quality",
  "engineering",
  "maintenance",
  "purchasing",
  "ppic",
  "warehouse",
  "exim",
  "hr",
  "legal",
  "hse",
  "it",
] as const;
export type DepartmentId = (typeof DEPARTMENTS)[number];

export const CATEGORIES = [
  "corporate_strategy",
  "management",
  "sales_customers",
  "japan_negotiation",
  "finance_costing",
  "production",
  "quality",
  "engineering_machinery",
  "maintenance",
  "purchasing_suppliers",
  "ppic",
  "warehouse",
  "exim",
  "hr",
  "legal_compliance",
  "hse",
  "it_cybersecurity",
  "business_continuity",
  "decisions",
  "lessons_learned",
] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * What kind of knowledge an item is. Kept deliberately separate so that a
 * personal experience is never presented as an approved policy.
 * AI recommendations are never stored as knowledge items; they only appear as
 * clearly labelled sections of AI output (see EvidenceLabel).
 */
export const KNOWLEDGE_TYPES = [
  "personal_experience",
  "management_directive",
  "approved_policy",
  "technical_standard",
  "historical_record",
  "lesson_learned",
  "general_knowledge",
] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

export const KNOWLEDGE_STATUSES = [
  "captured",
  "ai_draft",
  "pending_review",
  "verified",
  "approved_official",
  "superseded",
  "archived",
] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const CLASSIFICATIONS = ["general_internal", "department_restricted", "confidential", "highly_confidential"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const LANGUAGES = ["id", "en", "ja"] as const;
export type ContentLanguage = (typeof LANGUAGES)[number];

export interface Profile {
  id: string;
  name: string;
  title: string;
  departmentId: DepartmentId;
  roles: Role[];
  active: boolean;
}

/** One section of structured knowledge. `value` is always the contributor's own words. */
export interface KnowledgeSection {
  key: GapKind | "statement";
  value: string;
  /** Message the value was taken from, so the reviewer can trace it. */
  sourceMessageId?: string;
}

export interface KnowledgeVersion {
  version: number;
  title: string;
  summary: string;
  sections: KnowledgeSection[];
  editedBy: string;
  editedAt: string;
  changeNote: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  sections: KnowledgeSection[];
  /** Information the contributor could not or did not provide. */
  missingInfo: string[];
  category: Category;
  tags: string[];
  type: KnowledgeType;
  classification: Classification;
  departmentId: DepartmentId;
  status: KnowledgeStatus;
  language: ContentLanguage;
  contributorId: string;
  ownerId: string | null;
  reviewerId: string | null;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
  versions: KnowledgeVersion[];
  reviewDueAt: string | null;
  supersededById: string | null;
  /** True for development seed data. Real data must never be mixed with this. */
  synthetic: boolean;
}

export const SOURCE_KINDS = ["capture_conversation", "document", "decision_record", "manual_entry"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface KnowledgeSource {
  id: string;
  kind: SourceKind;
  title: string;
  /** Original, unedited content as provided by the contributor. */
  originalText: string;
  conversationId: string | null;
  createdBy: string;
  createdAt: string;
}

export const RELATIONSHIP_TYPES = ["related_to", "part_of", "causes", "corrects", "requires", "conflicts_with", "supersedes"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface KnowledgeRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  /** Relationships proposed by AI stay unverified until a human confirms them. */
  verified: boolean;
  createdBy: string;
  createdAt: string;
}

/** Knowledge gap kinds from PRD 2.2. */
export const GAP_KINDS = [
  "terminology",
  "context",
  "causal",
  "criteria",
  "responsibility",
  "approval_authority",
  "conflict",
  "outdated",
] as const;
export type GapKind = (typeof GAP_KINDS)[number];

export type QuestionState = "asked" | "answered" | "skipped";

export interface ClarificationQuestion {
  id: string;
  gap: GapKind;
  text: string;
  state: QuestionState;
  askedAt: string;
  answerMessageId: string | null;
}

export type MessageRole = "contributor" | "assistant";

export interface CaptureMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  questionId: string | null;
}

export type CaptureStatus = "in_progress" | "ready_for_confirmation" | "submitted";

export interface CaptureSession {
  id: string;
  contributorId: string;
  status: CaptureStatus;
  category: Category | null;
  type: KnowledgeType;
  classification: Classification;
  departmentId: DepartmentId;
  messages: CaptureMessage[];
  questions: ClarificationQuestion[];
  knowledgeItemId: string | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const APPROVAL_ACTIONS = ["submit_for_review", "verify", "approve_official", "request_revision", "supersede", "archive"] as const;
export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

export interface ApprovalEvent {
  id: string;
  itemId: string;
  actorId: string;
  action: ApprovalAction;
  fromStatus: KnowledgeStatus;
  toStatus: KnowledgeStatus;
  note: string;
  at: string;
}

export interface Decision {
  id: string;
  title: string;
  decidedOn: string;
  decisionMakerId: string | null;
  decisionMakerLabel: string;
  context: string;
  problem: string;
  availableInformation: string;
  alternatives: string[];
  decision: string;
  rationale: string;
  risks: string;
  approvalStatus: "recorded" | "confirmed";
  expectedOutcome: string;
  actualOutcome: string | null;
  lessonsLearned: string | null;
  referenceIds: string[];
  classification: Classification;
  departmentId: DepartmentId;
  missingInfo: string[];
  synthetic: boolean;
}

export interface AccessGrant {
  id: string;
  itemId: string;
  userId: string;
  grantedBy: string;
  reason: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  targetType: "knowledge_item" | "decision" | "capture_session" | "session" | "evaluation" | "ask";
  targetId: string | null;
  outcome: "allowed" | "denied" | "info";
  at: string;
  /** Never contains knowledge content, only identifiers and short codes. */
  meta: Record<string, string | number | boolean>;
}

export type EvaluationExpectation =
  "answer_with_citation" | "insufficient_evidence" | "deny_access" | "no_restricted_leak" | "flag_conflict";

export interface EvaluationCase {
  id: string;
  title: string;
  category:
    | "known_answer"
    | "missing_evidence"
    | "conflicting_sources"
    | "outdated_instruction"
    | "unauthorized_access"
    | "prompt_injection"
    | "incorrect_terminology"
    | "cross_department";
  actorId: string;
  question: string | null;
  targetItemId: string | null;
  expected: EvaluationExpectation;
  expectedBehavior: string;
}

export interface EvaluationRun {
  id: string;
  caseId: string;
  evaluatorId: string;
  ranAt: string;
  actualSummary: string;
  evidenceQuality: "valid_citations" | "no_citations" | "not_applicable";
  passed: boolean;
}
