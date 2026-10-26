import { checkApprovalAction, can } from "@/domain/permissions";
import type {
  CaptureMessage,
  CaptureSession,
  Category,
  Classification,
  ContentLanguage,
  DepartmentId,
  KnowledgeItem,
  KnowledgeType,
  Profile,
} from "@/domain/types";
import { getAIProvider } from "@/server/ai";
import type { AIProvider } from "@/server/ai/provider";
import { clarificationOutputSchema, draftOutputSchema } from "@/server/ai/schemas";
import { getStore, nextId, nowIso } from "@/server/store/memory-store";
import { recordAudit } from "./audit";
import { itemText } from "./knowledge";
import { tokenize } from "./search";

export class CaptureError extends Error {
  constructor(public readonly code: "not_found" | "forbidden" | "invalid_state" | "invalid_input") {
    super(code);
  }
}

export interface StartCaptureInput {
  statement: string;
  type: KnowledgeType;
  category: Category | null;
  classification: Classification;
  language: ContentLanguage;
}

const MAX_TEXT = 4000;

function cleanText(text: string): string {
  const value = text.replace(/\u0000/g, "").trim();
  if (!value || value.length > MAX_TEXT) throw new CaptureError("invalid_input");
  return value;
}

function ownSession(user: Profile, sessionId: string): CaptureSession {
  const session = getStore().sessions.find((s) => s.id === sessionId);
  // Same error for missing and foreign sessions so ids cannot be probed.
  if (!session || session.contributorId !== user.id) throw new CaptureError("not_found");
  return session;
}

function itemOf(session: CaptureSession): KnowledgeItem {
  const item = getStore().items.find((i) => i.id === session.knowledgeItemId);
  if (!item) throw new CaptureError("not_found");
  return item;
}

function addMessage(session: CaptureSession, role: CaptureMessage["role"], text: string, questionId: string | null) {
  const message: CaptureMessage = { id: nextId(getStore(), "M", 6), role, text, createdAt: nowIso(), questionId };
  session.messages.push(message);
  return message;
}

/** Re-structure the draft from the full conversation. Contributor text is never lost (TEST 3). */
async function refreshDraft(session: CaptureSession, ai: AIProvider, language: ContentLanguage) {
  const draft = draftOutputSchema.parse(await ai.structureDraft({ messages: session.messages, questions: session.questions, language }));
  const item = itemOf(session);
  const open = session.questions.filter((q) => q.state === "asked").map((q) => q.gap);
  item.title = draft.title;
  item.summary = draft.summary;
  item.sections = draft.sections;
  item.missingInfo = draft.missingInfo;
  item.updatedAt = nowIso();
  item.versions[item.versions.length - 1] = {
    version: item.version,
    title: draft.title,
    summary: draft.summary,
    sections: draft.sections,
    editedBy: session.contributorId,
    editedAt: item.updatedAt,
    changeNote: open.length ? "Draf AI (sedang diklarifikasi)" : "Draf AI",
  };
}

async function askNext(session: CaptureSession, ai: AIProvider, language: ContentLanguage, stop = false) {
  const result = clarificationOutputSchema.parse(
    await ai.nextClarification({
      messages: session.messages,
      questions: session.questions,
      type: session.type,
      category: session.category,
      language,
      contributorRequestedStop: stop,
    }),
  );
  if (result.action === "ask") {
    const question = {
      id: nextId(getStore(), "Q", 6),
      gap: result.gap,
      text: result.question,
      state: "asked" as const,
      askedAt: nowIso(),
      answerMessageId: null,
    };
    session.questions.push(question);
    addMessage(session, "assistant", result.question, question.id);
    session.status = "in_progress";
  } else {
    session.status = "ready_for_confirmation";
  }
  session.updatedAt = nowIso();
}

export function openQuestion(session: CaptureSession) {
  return session.questions.find((q) => q.state === "asked") ?? null;
}

export async function startCapture(user: Profile, input: StartCaptureInput, ai: AIProvider = getAIProvider()) {
  if (!can(user, "capture")) throw new CaptureError("forbidden");
  const statement = cleanText(input.statement);
  const store = getStore();
  const now = nowIso();
  const session: CaptureSession = {
    id: nextId(store, "C"),
    contributorId: user.id,
    status: "in_progress",
    category: input.category,
    type: input.type,
    classification: input.classification,
    departmentId: user.departmentId as DepartmentId,
    messages: [],
    questions: [],
    knowledgeItemId: null,
    sourceId: null,
    createdAt: now,
    updatedAt: now,
  };
  const first = addMessage(session, "contributor", statement, null);

  // TEST 1: the original statement is saved as a source before any AI processing.
  const source = {
    id: nextId(store, "S"),
    kind: "capture_conversation" as const,
    title: statement.slice(0, 80),
    originalText: first.text,
    conversationId: session.id,
    createdBy: user.id,
    createdAt: now,
  };
  store.sources.push(source);

  const item: KnowledgeItem = {
    id: nextId(store, "K"),
    title: statement.slice(0, 90),
    summary: statement,
    sections: [{ key: "statement", value: statement, sourceMessageId: first.id }],
    missingInfo: [],
    category: input.category ?? "lessons_learned",
    tags: [],
    type: input.type,
    classification: input.classification,
    departmentId: user.departmentId,
    status: "captured",
    language: input.language,
    contributorId: user.id,
    ownerId: null,
    reviewerId: null,
    sourceIds: [source.id],
    createdAt: now,
    updatedAt: now,
    version: 1,
    versions: [
      {
        version: 1,
        title: statement.slice(0, 90),
        summary: statement,
        sections: [],
        editedBy: user.id,
        editedAt: now,
        changeNote: "Ditangkap",
      },
    ],
    reviewDueAt: null,
    supersededById: null,
    synthetic: false,
  };
  store.items.push(item);
  session.knowledgeItemId = item.id;
  session.sourceId = source.id;
  store.sessions.push(session);

  await refreshDraft(session, ai, input.language);
  item.status = "ai_draft";
  await askNext(session, ai, input.language);
  recordAudit({
    actorId: user.id,
    action: "capture.start",
    targetType: "capture_session",
    targetId: session.id,
    outcome: "info",
    meta: { itemId: item.id },
  });
  return session;
}

export async function answerQuestion(user: Profile, sessionId: string, text: string, ai: AIProvider = getAIProvider()) {
  const session = ownSession(user, sessionId);
  if (session.status === "submitted") throw new CaptureError("invalid_state");
  const value = cleanText(text);
  const question = openQuestion(session);
  const message = addMessage(session, "contributor", value, question?.id ?? null);
  if (question) {
    question.state = "answered";
    question.answerMessageId = message.id;
  }
  const language = itemOf(session).language;
  await refreshDraft(session, ai, language);
  await askNext(session, ai, language);
  return session;
}

export async function skipQuestion(user: Profile, sessionId: string, ai: AIProvider = getAIProvider()) {
  const session = ownSession(user, sessionId);
  if (session.status === "submitted") throw new CaptureError("invalid_state");
  const question = openQuestion(session);
  if (question) question.state = "skipped";
  const language = itemOf(session).language;
  await refreshDraft(session, ai, language);
  await askNext(session, ai, language);
  return session;
}

/** Contributor says "enough": open question is skipped and no more questions are asked. */
export async function finishQuestions(user: Profile, sessionId: string, ai: AIProvider = getAIProvider()) {
  const session = ownSession(user, sessionId);
  if (session.status === "submitted") throw new CaptureError("invalid_state");
  const question = openQuestion(session);
  if (question) question.state = "skipped";
  const language = itemOf(session).language;
  await refreshDraft(session, ai, language);
  await askNext(session, ai, language, true);
  return session;
}

/** Possible conflict: same category, overlapping words, and different numbers. Flagged, never auto-resolved. */
function detectConflicts(item: KnowledgeItem) {
  const store = getStore();
  const mine = new Set(tokenize(itemText(item)));
  const myNumbers = new Set(itemText(item).match(/\d+(?:[.,]\d+)?/g) ?? []);
  if (myNumbers.size === 0) return;
  for (const other of store.items) {
    if (other.id === item.id || other.category !== item.category) continue;
    if (other.status !== "verified" && other.status !== "approved_official") continue;
    const theirs = new Set(tokenize(itemText(other)));
    const shared = [...theirs].filter((t) => mine.has(t)).length;
    // Most of the shorter text must be about the same thing; a few common words are not enough.
    const overlap = shared / Math.max(1, Math.min(mine.size, theirs.size));
    const otherNumbers = itemText(other).match(/\d+(?:[.,]\d+)?/g) ?? [];
    const differs = otherNumbers.length > 0 && otherNumbers.some((n) => !myNumbers.has(n));
    if (shared >= 3 && overlap >= 0.4 && differs) {
      store.relationships.push({
        id: nextId(store, "R"),
        fromId: item.id,
        toId: other.id,
        type: "conflicts_with",
        verified: false,
        createdBy: "system",
        createdAt: nowIso(),
      });
    }
  }
}

/** Contributor confirms the draft and sends it to review. */
export function submitForReview(user: Profile, sessionId: string) {
  const session = ownSession(user, sessionId);
  if (session.status === "submitted") throw new CaptureError("invalid_state");
  const item = itemOf(session);
  const store = getStore();
  const check = checkApprovalAction({ kind: "human", user }, "submit_for_review", item, store.grants);
  if (!check.ok) throw new CaptureError("forbidden");
  const from = item.status;
  item.status = "pending_review";
  item.updatedAt = nowIso();
  session.status = "submitted";
  session.updatedAt = item.updatedAt;
  store.approvals.push({
    id: nextId(store, "A"),
    itemId: item.id,
    actorId: user.id,
    action: "submit_for_review",
    fromStatus: from,
    toStatus: "pending_review",
    note: "",
    at: item.updatedAt,
  });
  detectConflicts(item);
  recordAudit({ actorId: user.id, action: "knowledge.submit", targetType: "knowledge_item", targetId: item.id, outcome: "allowed" });
  return item;
}

export function getOwnSession(user: Profile, sessionId: string): CaptureSession | null {
  try {
    return ownSession(user, sessionId);
  } catch {
    return null;
  }
}

export function listOwnSessions(user: Profile): CaptureSession[] {
  return getStore()
    .sessions.filter((s) => s.contributorId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function draftItemFor(session: CaptureSession): KnowledgeItem | null {
  return getStore().items.find((i) => i.id === session.knowledgeItemId) ?? null;
}
