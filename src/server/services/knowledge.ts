import { canReadDecision, canReadItem, can } from "@/domain/permissions";
import type {
  Category,
  Classification,
  Decision,
  KnowledgeItem,
  KnowledgeRelationship,
  KnowledgeStatus,
  KnowledgeType,
  Profile,
} from "@/domain/types";
import { getStore } from "@/server/store/memory-store";
import { recordAudit } from "./audit";
import { rank } from "./search";

const SENSITIVE: readonly Classification[] = ["confidential", "highly_confidential"];

export function itemText(item: KnowledgeItem): string {
  return [item.summary, ...item.sections.map((s) => s.value)].join("\n");
}

/** All items this user may read. Every listing in the app starts here. */
export function readableItems(user: Profile): KnowledgeItem[] {
  const { items, grants } = getStore();
  return items.filter((i) => canReadItem(user, i, grants));
}

export interface LibraryFilters {
  q?: string;
  category?: Category;
  type?: KnowledgeType;
  status?: KnowledgeStatus;
}

const LIBRARY_STATUSES: readonly KnowledgeStatus[] = ["pending_review", "verified", "approved_official", "superseded"];

export function searchLibrary(user: Profile, filters: LibraryFilters): KnowledgeItem[] {
  let items = readableItems(user).filter((i) => LIBRARY_STATUSES.includes(i.status) || i.contributorId === user.id);
  if (filters.category) items = items.filter((i) => i.category === filters.category);
  if (filters.type) items = items.filter((i) => i.type === filters.type);
  if (filters.status) items = items.filter((i) => i.status === filters.status);
  if (filters.q && filters.q.trim()) {
    return rank(filters.q, items, (i) => ({ title: i.title, tags: i.tags, body: itemText(i) }), 50).map((r) => r.value);
  }
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Fetch one item by id for a user. Returns null both when the item does not
 * exist and when access is denied, so ids cannot be probed (IDOR).
 */
export function getItemForUser(user: Profile, id: string): KnowledgeItem | null {
  const { items, grants } = getStore();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  if (!canReadItem(user, item, grants)) {
    recordAudit({ actorId: user.id, action: "knowledge.read", targetType: "knowledge_item", targetId: id, outcome: "denied" });
    return null;
  }
  if (SENSITIVE.includes(item.classification)) {
    recordAudit({
      actorId: user.id,
      action: "knowledge.read",
      targetType: "knowledge_item",
      targetId: id,
      outcome: "allowed",
      meta: { classification: item.classification },
    });
  }
  return item;
}

export interface RelatedItem {
  relationship: KnowledgeRelationship;
  direction: "outgoing" | "incoming";
  other: Pick<KnowledgeItem, "id" | "title" | "status" | "type">;
}

/** Relationships to items the user can also read. Hidden items are omitted, not redacted. */
export function relatedItems(user: Profile, itemId: string): RelatedItem[] {
  const { relationships, items, grants } = getStore();
  const result: RelatedItem[] = [];
  for (const rel of relationships) {
    if (rel.fromId !== itemId && rel.toId !== itemId) continue;
    const otherId = rel.fromId === itemId ? rel.toId : rel.fromId;
    const other = items.find((i) => i.id === otherId);
    if (!other || !canReadItem(user, other, grants)) continue;
    result.push({
      relationship: rel,
      direction: rel.fromId === itemId ? "outgoing" : "incoming",
      other: { id: other.id, title: other.title, status: other.status, type: other.type },
    });
  }
  return result;
}

export function conflictsFor(user: Profile, itemId: string): RelatedItem[] {
  return relatedItems(user, itemId).filter((r) => r.relationship.type === "conflicts_with");
}

export function sourcesFor(item: KnowledgeItem) {
  const { sources } = getStore();
  return sources.filter((s) => item.sourceIds.includes(s.id));
}

export function approvalsFor(itemId: string) {
  return getStore()
    .approvals.filter((a) => a.itemId === itemId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function profileName(id: string | null): string | null {
  if (!id) return null;
  return getStore().profiles.find((p) => p.id === id)?.name ?? null;
}

export function readableDecisions(user: Profile): Decision[] {
  return getStore()
    .decisions.filter((d) => canReadDecision(user, d))
    .sort((a, b) => b.decidedOn.localeCompare(a.decidedOn));
}

export function getDecisionForUser(user: Profile, id: string): Decision | null {
  const decision = getStore().decisions.find((d) => d.id === id);
  if (!decision) return null;
  if (!canReadDecision(user, decision)) {
    recordAudit({ actorId: user.id, action: "decision.read", targetType: "decision", targetId: id, outcome: "denied" });
    return null;
  }
  return decision;
}

export interface HomeMetrics {
  pendingReviews: number | null;
  criticalGaps: number | null;
  upcomingReviews: KnowledgeItem[];
  recent: KnowledgeItem[];
}

export function homeMetrics(user: Profile, today = new Date()): HomeMetrics {
  const items = readableItems(user);
  const horizon = new Date(today.getTime() + 60 * 86_400_000).toISOString().slice(0, 10);
  const live = items.filter((i) => i.status === "verified" || i.status === "approved_official");
  return {
    pendingReviews: can(user, "review") ? items.filter((i) => i.status === "pending_review" && i.contributorId !== user.id).length : null,
    criticalGaps: can(user, "knowledge_gaps") ? live.filter((i) => i.ownerId === null || i.missingInfo.length > 0).length : null,
    upcomingReviews: live
      .filter((i) => i.reviewDueAt !== null && i.reviewDueAt <= horizon)
      .sort((a, b) => (a.reviewDueAt ?? "").localeCompare(b.reviewDueAt ?? ""))
      .slice(0, 5),
    recent: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  };
}

export interface GapReport {
  noOwner: KnowledgeItem[];
  missingInfo: KnowledgeItem[];
  overdueReview: KnowledgeItem[];
  singleContributorCategories: { category: Category; contributorId: string; count: number }[];
}

/** Knowledge gaps visible to authorized management only (PRD 2.10). Returns null otherwise. */
export function gapReport(user: Profile, today = new Date()): GapReport | null {
  if (!can(user, "knowledge_gaps")) return null;
  const todayIso = today.toISOString().slice(0, 10);
  const live = readableItems(user).filter((i) => i.status === "verified" || i.status === "approved_official");
  const byCategory = new Map<Category, Set<string>>();
  const counts = new Map<Category, number>();
  for (const i of live) {
    byCategory.set(i.category, (byCategory.get(i.category) ?? new Set()).add(i.contributorId));
    counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  }
  const single = [...byCategory.entries()]
    .filter(([, contributors]) => contributors.size === 1)
    .map(([category, contributors]) => ({ category, contributorId: [...contributors][0]!, count: counts.get(category) ?? 0 }));
  return {
    noOwner: live.filter((i) => i.ownerId === null),
    missingInfo: live.filter((i) => i.missingInfo.length > 0),
    overdueReview: live.filter((i) => i.reviewDueAt !== null && i.reviewDueAt < todayIso),
    singleContributorCategories: single,
  };
}
