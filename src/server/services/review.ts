import { checkApprovalAction, reviewIntervalDays, TRANSITIONS, type ActionDenial, type Actor } from "@/domain/permissions";
import type { ApprovalAction, KnowledgeItem, Profile } from "@/domain/types";
import { getStore, nextId, nowIso } from "@/server/store/memory-store";
import { recordAudit } from "./audit";
import { readableItems } from "./knowledge";

export type ReviewResult = { ok: true; item: KnowledgeItem } | { ok: false; reason: ActionDenial | "not_found" };

/** Items waiting for this reviewer. The contributor never sees their own item here. */
export function pendingReviews(user: Profile): KnowledgeItem[] {
  const { grants } = getStore();
  return readableItems(user)
    .filter((i) => i.status === "pending_review")
    .filter((i) => checkApprovalAction({ kind: "human", user }, "verify", i, grants).ok)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

/** Items that this user may promote to Approved Official. */
export function awaitingOfficialApproval(user: Profile): KnowledgeItem[] {
  const { grants } = getStore();
  return readableItems(user).filter(
    (i) => i.status === "verified" && checkApprovalAction({ kind: "human", user }, "approve_official", i, grants).ok,
  );
}

export function allowedActions(user: Profile, item: KnowledgeItem): ApprovalAction[] {
  const { grants } = getStore();
  const actions: ApprovalAction[] = ["verify", "approve_official", "request_revision", "supersede", "archive"];
  return actions.filter((a) => checkApprovalAction({ kind: "human", user }, a, item, grants).ok);
}

/**
 * Apply a review action. The actor is checked on every call; an AI or system
 * actor is always refused, so model output can never elevate knowledge.
 */
export function applyReviewAction(actor: Actor, itemId: string, action: ApprovalAction, note: string): ReviewResult {
  const store = getStore();
  const item = store.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "not_found" };
  const check = checkApprovalAction(actor, action, item, store.grants);
  if (!check.ok) {
    recordAudit({
      actorId: actor.user?.id ?? null,
      action: `knowledge.${action}`,
      targetType: "knowledge_item",
      targetId: itemId,
      outcome: "denied",
      meta: { reason: check.reason, actorKind: actor.kind },
    });
    // Do not reveal existence of items the actor cannot read.
    return { ok: false, reason: check.reason === "cannot_read" ? "not_found" : check.reason };
  }
  const user = actor.user!;
  const from = item.status;
  const to = TRANSITIONS[action].to;
  const now = nowIso();
  item.status = to;
  item.updatedAt = now;
  if (action === "verify" || action === "approve_official") {
    item.reviewerId = user.id;
    item.ownerId ??= item.contributorId;
    const days = reviewIntervalDays(item.type);
    item.reviewDueAt = days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  }
  store.approvals.push({
    id: nextId(store, "A"),
    itemId,
    actorId: user.id,
    action,
    fromStatus: from,
    toStatus: to,
    note: note.trim().slice(0, 1000),
    at: now,
  });
  recordAudit({ actorId: user.id, action: `knowledge.${action}`, targetType: "knowledge_item", targetId: itemId, outcome: "allowed" });
  return { ok: true, item };
}
